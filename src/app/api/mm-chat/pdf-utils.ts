// app/api/mm-chat/pdf-utils.ts
// SERVER ONLY – do not import this in client components.

type PdfParseResult = {
  text?: string;
};

export async function pdfToText(
  buffer: ArrayBuffer | Buffer | Uint8Array,
  maxChars = 20_000
): Promise<string> {
  // Dynamic require to avoid bundling issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod: any = require("pdf-parse");
  const pdfParse =
    typeof mod === "function"
      ? mod
      : typeof mod?.default === "function"
      ? mod.default
      : null;

  if (!pdfParse) {
    throw new Error("pdf-parse did not export a function.");
  }

  const nodeBuffer =
    buffer instanceof Buffer
      ? buffer
      : Buffer.from(buffer as ArrayBuffer );

  const result = (await pdfParse(nodeBuffer)) as PdfParseResult;
  const text = result?.text ?? "";

  if (text.length > maxChars) {
    return text.slice(0, maxChars) + "\n\n[... truncated ...]";
  }

  return text;
}
