// app/api/mm-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pdfToText } from "./pdf-utils";

export const runtime = "nodejs";

// Voltagent backend URL (hono/VoltAgent server)
const BACKEND_URL =
  "https://voltagent-chatbotbackend.onrender.com"

// Helper: send text to backend documents ingester
async function ingestToBackend(text: string, conversationId: string | null) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const res = await fetch(`${BACKEND_URL}/api/documents/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: trimmed,
      conversationId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(
      "[mm-chat] /api/documents/ingest failed",
      res.status,
      body
    );
  }
}

// Helper: call backend chat (VoltAgent Agent + RAG)
async function askBackendChat(
  text: string,
  conversationId: string | null
): Promise<{ answer: string; conversationId: string }> {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      conversationId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[mm-chat] /api/chat failed", res.status, body);
    throw new Error(body || "Backend chat failed");
  }

  const data = (await res.json()) as {
    text?: string;
    conversationId?: string;
  };

  return {
    answer: data.text ?? "(no answer)",
    conversationId: data.conversationId ?? conversationId ?? "",
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();

    const question = formData.get("question");
    const file = formData.get("file");
    const conversationIdRaw = formData.get("conversationId");

    const questionStr =
      typeof question === "string" && question.trim().length > 0
        ? question
        : null;

    const conversationId: string | null =
      typeof conversationIdRaw === "string" && conversationIdRaw.length > 0
        ? conversationIdRaw
        : null;

    if (!questionStr && !(file instanceof File && file.size > 0)) {
      return NextResponse.json(
        { error: "Provide text, image, or file." },
        { status: 400 }
      );
    }

    // We'll keep extracted text here so we can send it along with the question
    let docText: string | null = null;

    // 1) If file present, ingest its content/metadata into backend documents
    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const kb = Math.round(file.size / 1024);

      if (file.type === "application/pdf") {
        const text = await pdfToText(buffer);
        docText = text; // <-- keep the real document text

        await ingestToBackend(text, conversationId);
      } else if (file.type.startsWith("image/")) {
        const metaText =
          `Image uploaded: "${file.name}" (${file.type}, ~${kb} KB).` +
          (questionStr ? `\nUser question/context:\n${questionStr}` : "");
        docText = metaText;

        await ingestToBackend(metaText, conversationId);
      } else {
        const metaText =
          `File uploaded: "${file.name}" (type: ${
            file.type || "unknown"
          }, ~${kb} KB).` +
          (questionStr ? `\nUser question/context:\n${questionStr}` : "");
        docText = metaText;

        await ingestToBackend(metaText, conversationId);
      }
    }

    // 2) Build a question that includes the uploaded document content
    let finalQuestion: string;

    if (docText && docText.trim().length > 0) {
      const trimmedDoc = docText.trim();

      if (questionStr) {
        // User provided a specific question → attach doc content as context
        finalQuestion =
          questionStr +
          "\n\nUse ONLY the following uploaded document content as your source of truth:\n\n" +
          trimmedDoc.slice(0, 6000);
      } else {
        // No explicit question → generic summarize/extract prompt with doc
        finalQuestion =
          "I have uploaded a document. Based ONLY on the following content, summarize or extract the most important information:\n\n" +
          trimmedDoc.slice(0, 6000);
      }
    } else {
      // Fallback (no doc text available for some reason)
      finalQuestion =
        questionStr ??
        "I have uploaded a document. Please summarize or extract important info from it.";
    }

    // 3) Ask backend agent (with RAG) the enriched question
    const { answer, conversationId: newConvId } = await askBackendChat(
      finalQuestion,
      conversationId
    );

    return NextResponse.json({
      success: true,
      answer,
      conversationId: newConvId,
    });
  } catch (err: any) {
    console.error("[/api/mm-chat] API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
