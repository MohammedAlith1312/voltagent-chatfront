// app/api/conversations/route.ts
export const runtime = "nodejs";

export async function GET(_req: Request) {
  try {
    // Call VoltAgent backend
    const backendUrl = new URL(" https://voltagent-chatbotbackend.onrender.com/api/conversations");

    const res = await fetch(backendUrl.toString(), {
      method: "GET",
    });

    // Just stream through the response
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    console.error("GET /api/conversations error:", err);
    return new Response("Conversations error", { status: 500 });
  }
}
