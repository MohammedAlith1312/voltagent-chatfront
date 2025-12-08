"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

type HistoryMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content?: string;
  createdAt?: string;
  parts?: { type: string; text?: string }[];
};

type HistoryTurn = {
  id: string;
  userText: string;
  assistantText: string;
  createdAt?: string;
};

const DEFAULT_CONVERSATION_ID = "alith-713"; // 👈 same as backend

export default function Chat() {
  const apiUrl = "/api/chat";

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedConversationId] = useState<string>(
    DEFAULT_CONVERSATION_ID
  );
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(
    null
  );

  // ---------- HISTORY: load from /api/history?conversationId=... ----------
  const loadHistory = useCallback(
    async (convId?: string) => {
      const conversationId = convId ?? selectedConversationId;
      if (!conversationId) return; // safety

      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await fetch(
          `/api/history?conversationId=${encodeURIComponent(
            conversationId
          )}`
        );
        if (!res.ok) {
          throw new Error(`History error: ${res.status}`);
        }
        const data = await res.json();
        setHistory(data.messages ?? []);
      } catch (err: any) {
        console.error("Failed to load history:", err);
        setHistoryError(err?.message ?? "Failed to load history");
      } finally {
        setHistoryLoading(false);
      }
    },
    [selectedConversationId]
  );

  useEffect(() => {
    // initial load for default conversation
    loadHistory(selectedConversationId);
  }, [loadHistory, selectedConversationId]);

  // Helper: extract plain text from a HistoryMessage
  const extractText = (m: HistoryMessage) => {
    if (m.content) return m.content;
    if (m.parts && m.parts.length > 0) {
      return m.parts
        .filter((p) => p && p.type === "text" && p.text)
        .map((p) => p.text)
        .join("\n");
    }
    return "";
  };

  // ---------- GROUP HISTORY INTO TURNS (user + assistant) ----------
  const historyTurns: HistoryTurn[] = useMemo(() => {
    const turns: HistoryTurn[] = [];
    if (!history || history.length === 0) return turns;

    // assume history is in chronological order
    for (let i = 0; i < history.length; i++) {
      const msg = history[i];
      if (msg.role !== "user") continue;

      const userText = extractText(msg);
      let assistantText = "";

      // look ahead for the next assistant message
      const next = history[i + 1];
      if (next && next.role === "assistant") {
        assistantText = extractText(next);
      }

      const id = msg.id ?? `${i}`;
      turns.push({
        id,
        userText,
        assistantText,
        createdAt: msg.createdAt,
      });
    }

    return turns;
  }, [history]);

  // Generate a short "topic" from user text (first few words)
  const makeTopic = (text: string) => {
    if (!text) return "Conversation";
    const firstLine = text.split("\n")[0];
    const words = firstLine.split(" ").filter(Boolean);
    if (words.length <= 6) return firstLine;
    return words.slice(0, 6).join(" ") + "…";
  };

  // ---------- CHAT: useChat + DefaultChatTransport ----------
  const createTransport = useCallback(() => {
    return new DefaultChatTransport({
      api: apiUrl,
      prepareSendMessagesRequest({ messages }) {
        const lastMessage = messages[messages.length - 1];

        return {
          body: {
            input: [lastMessage],
            // options empty – backend injects userId + conversationId
          },
        };
      },
    });
  }, [apiUrl]);

  const { messages = [], sendMessage, status, error, stop } = useChat({
    transport: createTransport(),
  });

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: UIMessage = {
      role: "user",
      parts: [{ type: "text", text: trimmed }],
    } as UIMessage;

    try {
      await sendMessage(userMessage);
      setInput("");
      // if you want to go back to live chat after sending, clear selection:
      setSelectedTurnId(null);
      // optional: reload history if you want it live
      // setTimeout(() => loadHistory(selectedConversationId), 500);
    } catch (err) {
      console.error("sendMessage failed:", err);
    }
  }

  // Find the selected turn (for replacing chat container)
  const selectedTurn = useMemo(
    () => historyTurns.find((t) => t.id === selectedTurnId),
    [historyTurns, selectedTurnId]
  );

  return (
    <div className="w-full max-w-full h-screen bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex">
      {/* LEFT: HISTORY (sidebar) */}
      <aside className="hidden md:flex flex-col w-80 border-r border-gray-200 bg-gray-50">
        {/* History header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              History
            </h2>
           
          </div>
          <button
            onClick={() => loadHistory(selectedConversationId)}
            className="text-[11px] px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100 transition disabled:opacity-50"
            disabled={historyLoading}
          >
            {historyLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* History content */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-sm">
          {historyError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {historyError}
            </div>
          )}

          {historyLoading && (
            <p className="text-xs text-gray-500">Loading history…</p>
          )}

          {!historyLoading &&
            !historyError &&
            historyTurns.length === 0 && (
              <p className="text-xs text-gray-400 italic mt-2">
                No previous chats yet.
              </p>
            )}

          {historyTurns.map((turn) => {
            const isSelected = turn.id === selectedTurnId;
            return (
              <button
                key={turn.id}
                type="button"
                onClick={() => {
                  setSelectedTurnId(turn.id);
                  // put the old user message into the input so you can resend/edit
                  if (turn.userText) setInput(turn.userText);
                }}
                className={`w-full text-left rounded-xl border px-3 py-2 text-xs shadow-sm transition ${
                  isSelected
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                {/* Topic / title */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900">
                    {makeTopic(turn.userText)}
                  </span>
                  {turn.createdAt && (
                    <span className="text-[10px] text-gray-400">
                      {new Date(turn.createdAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* User + Assistant preview */}
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-700 line-clamp-2 whitespace-pre-wrap">
                    <span className="font-medium text-gray-900">
                      You:{" "}
                    </span>
                    {turn.userText || "(no content)"}
                  </p>
                  {turn.assistantText && (
                    <p className="text-[11px] text-gray-600 line-clamp-2 whitespace-pre-wrap">
                      <span className="font-medium text-gray-900">
                        Assistant:{" "}
                      </span>
                      {turn.assistantText}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* RIGHT: CHAT AREA */}
      <main className="flex-1 flex flex-col">
        {/* Chat header */}
        <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              Chat with Assistant
            </h1>
           
          </div>
          <div className="flex items-center gap-2">
            {selectedTurn && (
              <button
                type="button"
                onClick={() => setSelectedTurnId(null)}
                className="text-[11px] px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100 transition"
              >
                Back to current chat
              </button>
            )}
            <button
              onClick={() => loadHistory(selectedConversationId)}
              className="md:hidden text-[11px] px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100 transition disabled:opacity-50"
              disabled={historyLoading}
            >
              {historyLoading ? "Refreshing…" : "Refresh history"}
            </button>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
          {error && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error?.message ?? "An error occurred"}
            </div>
          )}

          {selectedTurn ? (
            /* 👉 When a history item is selected, replace chat with this container */
            <div className="mb-4 p-3 rounded-2xl bg-white border border-blue-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                   {makeTopic(selectedTurn.userText)}
                </span>
                {selectedTurn.createdAt && (
                  <span className="text-[10px] text-gray-400">
                    {new Date(selectedTurn.createdAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm bg-blue-600 text-white whitespace-pre-wrap">
                    {selectedTurn.userText || "(no content)"}
                  </div>
                </div>

                {/* Assistant bubble */}
                {selectedTurn.assistantText && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm bg-white text-gray-900 border border-gray-200 whitespace-pre-wrap">
                      {selectedTurn.assistantText}
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-3 text-[11px] text-gray-500">
                You can edit the text in the input below and send it again,
                or click{" "}
                <span className="font-semibold">“Back to current chat”</span>{" "}
                to continue the live conversation.
              </p>
            </div>
          ) : (
            /* 👉 Normal live chat view when no history item is selected */
            <>
              {messages.length === 0 && !error && (
                <p className="text-xs text-gray-400 italic text-center mt-6">
                  Start a conversation by typing a message below
                </p>
              )}

              <div className="flex flex-col gap-2">
                {messages.map((message, idx) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id ?? idx}
                      className={`flex ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                          isUser
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        {(message.parts || []).map(
                          (part: any, index: number) => {
                            if (!part) return null;
                            if (part.type === "text") {
                              return (
                                <span
                                  key={`${message.id ?? idx}-${index}`}
                                  className="block"
                                >
                                  {part.text}
                                </span>
                              );
                            }
                            return null;
                          }
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer: status + input */}
        <footer className="border-t border-gray-200 bg-white px-4 py-3">
          {(status === "submitted" || status === "streaming") && (
            <div className="flex items-center gap-2 mb-2 text-[11px] text-gray-500">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500" />
              <span>Assistant is typing…</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-900 outline-none border border-gray-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400"
              placeholder={
                selectedTurn
                  ? "Edit and resend this past question..."
                  : "Type your message..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Chat input"
            />

            {status === "submitted" || status === "streaming" ? (
              <button
                type="button"
                onClick={() => stop?.()}
                className="px-4 py-2 rounded-full text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={status !== "ready"}
                className="px-4 py-2 rounded-full text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                Send
              </button>
            )}
          </form>
        </footer>
      </main>
    </div>
  );
}
