import { NextRequest, NextResponse } from "next/server";
import {
  createRun,
  persistTinyFishLifecycleEvent,
  type TinyFishSseEvent,
  updateRun,
} from "@/lib/runs";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

const TINYFISH_STREAM_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

export async function POST(request: NextRequest) {
  if (!process.env.TINYFISH_API_KEY) {
    return NextResponse.json(
      { error: "Missing TINYFISH_API_KEY environment variable." },
      { status: 500 }
    );
  }

  let body:
    | {
        project_id?: string;
        url?: string;
        goal?: string;
        browser_profile?: "lite" | "stealth";
      }
    | undefined;

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body?.project_id || !body.url || !body.goal || !body.browser_profile) {
    return NextResponse.json(
      { error: "project_id, url, goal, and browser_profile are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", body.project_id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "Project not found for this user." },
      { status: 404 }
    );
  }

  const proj = project as Project;
  const run = await createRun({
    project_id: proj.id,
    user_id: proj.user_id,
    source: "manual_live_preview",
    status: "queued",
    repo_full_name: `${proj.repo_owner}/${proj.repo_name}`,
    target_url: body.url,
    goal: body.goal,
    browser_profile: body.browser_profile,
  });

  const upstream = await fetch(TINYFISH_STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.TINYFISH_API_KEY,
    },
    body: JSON.stringify({
      url: body.url,
      goal: body.goal,
      browser_profile: body.browser_profile,
    }),
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text();

    await updateRun(run.id, {
      status: "error",
      failure_reason:
        errorText ||
        "TinyFish streaming request failed before a live preview could start.",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error:
          errorText ||
          "TinyFish streaming request failed before a live preview could start.",
      },
      { status: upstream.status || 500 }
    );
  }

  const admin = createAdminClient();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body?.getReader();

      if (!reader) {
        controller.close();
        return;
      }

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          controller.enqueue(value);
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

            let event: TinyFishSseEvent | undefined;

            try {
              event = JSON.parse(rawPayload) as typeof event;
            } catch {
              continue;
            }

            if (!event?.type) {
              continue;
            }

            await persistTinyFishLifecycleEvent(run.id, event);
          }
        }
      } catch (error) {
        await admin.from("runs").update({
          status: "error",
          failure_reason:
            error instanceof Error ? error.message : "Streaming proxy error.",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", run.id);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "ERROR",
              error:
                error instanceof Error ? error.message : "Streaming proxy error.",
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
