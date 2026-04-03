import {
  persistTinyFishLifecycleEvent,
  type TinyFishSseEvent,
} from "@/features/runs/server/runs.server";

const TINYFISH_STREAM_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

export async function runTinyFishSse({
  runId,
  url,
  goal,
  browserProfile,
}: {
  runId: string | null;
  url: string;
  goal: string;
  browserProfile: "lite" | "stealth";
}): Promise<{ observation: string; screenshotUrl: string | null }> {
  console.log("[TinyQA TinyFish] Sending SSE request", {
    runId,
    url,
    browserProfile,
    goalLength: goal.length,
    hasApiKey: Boolean(process.env.TINYFISH_API_KEY),
  });

  const response = await fetch(TINYFISH_STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.TINYFISH_API_KEY!,
    },
    body: JSON.stringify({
      url,
      goal,
      browser_profile: browserProfile,
    }),
    cache: "no-store",
  });

  console.log("[TinyQA TinyFish] SSE initial response", {
    runId,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok || !response.body) {
    const errText = await response.text();
    console.error("[TinyQA TinyFish] SSE request failed", {
      runId,
      status: response.status,
      statusText: response.statusText,
      errorBody: errText,
    });
    throw new Error(
      errText || "TinyFish SSE failed before a live preview could start.",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let observation = "";
  let screenshotUrl: string | null = null;
  let completed = false;

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const dataLine = chunk
        .split("\n")
        .find((line) => line.trim().startsWith("data:"));

      if (!dataLine) {
        continue;
      }

      const rawPayload = dataLine.replace(/^data:\s*/, "").trim();
      if (!rawPayload) {
        continue;
      }

      let event: TinyFishSseEvent;
      try {
        event = JSON.parse(rawPayload) as TinyFishSseEvent;
      } catch {
        console.warn("[TinyQA TinyFish] Failed to parse SSE event payload", {
          runId,
          preview: rawPayload.slice(0, 200),
        });
        continue;
      }

      console.log("[TinyQA TinyFish] SSE event received", {
        runId,
        type: event.type ?? "unknown",
        hasResult: event.result !== undefined,
        hasError: Boolean(event.error),
      });

      if (runId) {
        await persistTinyFishLifecycleEvent(runId, event);
      }

      if (typeof event.result === "string") {
        observation = event.result;
      } else if (event.result) {
        observation = JSON.stringify(event.result);
      }

      if (typeof (event as { screenshot_url?: unknown }).screenshot_url === "string") {
        screenshotUrl = (event as { screenshot_url?: string }).screenshot_url ?? null;
      }

      if (event.type === "COMPLETE") {
        completed = true;
        break;
      }

      if (event.type === "ERROR") {
        throw new Error(event.error ?? "TinyFish reported an error.");
      }
    }

    if (completed) {
      break;
    }
  }

  if (!completed) {
    console.error("[TinyQA TinyFish] SSE stream ended before COMPLETE event", {
      runId,
    });
    throw new Error("TinyFish SSE stream ended before completion.");
  }

  return {
    observation:
      observation || "TinyFish completed the run but returned no observation.",
    screenshotUrl,
  };
}
