// app/api/chat/route.ts

export const runtime = "nodejs";

const USER_ID = "mohammed-alith";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    
    // If no conversationId provided, generate a new one
    const actualConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const raw = await req.text();
    const parsed = raw ? JSON.parse(raw) : {};
    const input = parsed.input ?? [];
    const options = parsed.options ?? {};

    // Inject userId + conversationId (don't hardcode CONVERSATION_ID!)
    const bodyToVolt = JSON.stringify({
      input,
      options: {
        ...options,
        userId: USER_ID,
        conversationId: actualConversationId, // ✅ Use the dynamic one
      },
      semanticMemory: {
        enabled: true,
        semanticLimit: 10,
        semanticThreshold: 0.6,
      },
    });

    const voltRes = await fetch(
      "http://localhost:3141/agents/sample-app/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: bodyToVolt,
      }
    );

    return new Response(voltRes.body, {
      status: voltRes.status,
      headers: {
        "Content-Type":
          voltRes.headers.get("content-type") ?? "text/event-stream",
      },
    });
  } catch (err) {
    console.error("POST /api/chat error:", err);
    return new Response("Error talking to AI backend", { status: 500 });
  }
}