// app/api/mm-chat/history-utils.ts
// Adapt this to your actual DB / VoltAgent message storage.

type SaveTurnArgs = {
  conversationId: string | null;
  userText: string;
  assistantText: string;
};

export async function saveTurnToHistory({
  conversationId,
  userText,
  assistantText,
}: SaveTurnArgs) {
  if (!conversationId) {
    console.warn(
      "[saveTurnToHistory] called without conversationId – skipping DB write"
    );
    return;
  }

  // TODO: Replace this with your actual message persistence.
  // Example if you had a "messages" table:
  //
  // await db.query(
  //   `insert into messages (conversation_id, role, content)
  //    values ($1, 'user', $2), ($1, 'assistant', $3)`,
  //   [conversationId, userText, assistantText]
  // );
  //
  // Or, if using VoltAgent Memory directly:
  //
  // await voltMemory.createMessage({ conversationId, role: "user", content: userText });
  // await voltMemory.createMessage({ conversationId, role: "assistant", content: assistantText });

  console.log("[saveTurnToHistory] would store turn", {
    conversationId,
    userTextPreview: userText.slice(0, 80),
    assistantPreview: assistantText.slice(0, 80),
  });
}
