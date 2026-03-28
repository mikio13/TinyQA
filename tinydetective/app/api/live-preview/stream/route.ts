import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TINYFISH_STREAM_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

export async function POST(request: NextRequest) {
  if (!process.env.TINYFISH_API_KEY) {
    return NextResponse.json(
      { error: "Missing TINYFISH_API_KEY environment variable." },
      { status: 500 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const upstream = await fetch(TINYFISH_STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.TINYFISH_API_KEY,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text();

    return NextResponse.json(
      {
        error:
          errorText ||
          "TinyFish streaming request failed before a live preview could start.",
      },
      { status: upstream.status || 500 }
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
