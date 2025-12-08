export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    const backendUrl = new URL("http://localhost:3141/api/history");

    // ✅ Forward conversationId if provided
    if (conversationId) {
      backendUrl.searchParams.set(
        "conversationId",
        conversationId
      );
    }

    const res = await fetch(backendUrl.toString(), {
      method: "GET",
    });

    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    console.error("GET /api/history error:", err);
    return new Response("History error", { status: 500 });
  }
}
