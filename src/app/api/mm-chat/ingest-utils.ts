// app/api/mm-chat/ingest-utils.ts



export type IngestKind = "pdf" | "image" | "file";

export async function ingestDocumentToVectorStore(opts: {
  conversationId: string | null;
  fileName: string;
  kind: IngestKind;
  text: string;
}) {
  const { conversationId, fileName, kind, text } = opts;

  // TODO: integrate with your Voltagent Memory / PostgreSQLVectorAdapter here.
  //
  // Example pseudo-code (you replace with real implementation):
  //
  // await memory.insertDocuments([
  //   {
  //     id: `doc:${kind}:${conversationId ?? "no-conv"}:${fileName}`,
  //     text,
  //     metadata: {
  //       conversationId,
  //       fileName,
  //       kind,
  //       source: "mm-chat",
  //     },
  //   },
  // ]);
  //
  console.log(
    `[ingestDocumentToVectorStore] storing ~${text.length} chars`,
    { conversationId, fileName, kind, text }
  );
}
