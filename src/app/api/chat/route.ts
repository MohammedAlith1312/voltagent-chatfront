// app/api/chat/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// This should point to your Voltagent backend (Hono)
const BACKEND_URL ="https://voltagent-chatbotbackend.onrender.com";

export async function POST(req: Request) {
  try {
    // Frontend sends: { text, conversationId }
    const body = await req.json().catch(() => ({} as any));
    const text = String(body.text ?? "");
    const conversationId = body.conversationId ?? null;

    if (!text.trim()) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    // Forward to Voltagent backend /api/chat
    // Backend already:
    //  - runs RAG over documents (pgvector)
    //  - writes Q/A into memory history
    const backendRes = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        conversationId,
      }),
    });

    const data = await backendRes.json();

    // Backend returns: { text, conversationId }
    return NextResponse.json(
      {
        text: data.text ?? "",
        conversationId: data.conversationId ?? conversationId,
      },
      { status: backendRes.status }
    );
  } catch (err) {
    console.error("POST /api/chat error:", err);
    return NextResponse.json(
      { error: "Error talking to AI backend" },
      { status: 500 }
    );
  }
}
