// app/chat/page.tsx
"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import type { UIMessage } from "ai";

import HistorySidebar from "./HistorySidebar";
import ChatHeaderAndMessages from "./ChatHeaderAndMessages";
import ChatFooterUploads from "./ChatFooterUploads";

export type HistoryMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content?: string;
  createdAt?: string;
  parts?: { type: string; text?: string }[];
};

export type HistoryTurn = {
  id: string;
  userText: string;
  assistantText: string;
  createdAt?: string;
  conversationId: string;
  conversationTitle?: string | null;
};

export type Conversation = {
  id: string;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ChatStatus = "ready" | "submitted" | "streaming" | "idle";

export default function Chat() {
  const apiUrl = "/api/chat";

  // ---------- STATE ----------
  const [input, setInput] = useState("");
  const [historyMessages, setHistoryMessages] = useState<
    (HistoryMessage & { conversationId: string; conversationTitle?: string | null })[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null
  );

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);

  // Upload state + ref
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // live chat messages (for current page session)
  const [liveMessages, setLiveMessages] = useState<UIMessage[]>([]);

  // Extra messages from /api/mm-chat (file+question)
  const [mmMessages, setMmMessages] = useState<UIMessage[]>([]);

  // simple status + error for UI
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | null>(null);

  // ---------- HELPERS ----------
  const extractText = (m: HistoryMessage) => {
    if (m.content) return m.content;
    if (m.parts && m.parts.length > 0) {
      return m.parts
        .filter((p) => p && p.type === "text" && p.text)
        .map((p) => p.text as string)
        .join("\n");
    }
    return "";
  };

  /**
   * Build turn-level history.
   * CHANGE: also include system messages that look like document ingests.
   */
  const historyTurns: HistoryTurn[] = useMemo(() => {
    const turns: HistoryTurn[] = [];
    if (!historyMessages || historyMessages.length === 0) return turns;

    for (let i = 0; i < historyMessages.length; i++) {
      const msg = historyMessages[i];

      const isUser = msg.role === "user";
      const isDocSystem =
        msg.role === "system" &&
        typeof msg.content === "string" &&
        msg.content.startsWith("[Document ingested into knowledge base]");

      // Only create a turn for:
      //  - normal user message, OR
      //  - system doc-ingest message
      if (!isUser && !isDocSystem) continue;

      const userText = extractText(msg);
      let assistantText = "";

      // try to pair next assistant message (same as before)
      const next = historyMessages[i + 1];
      if (next && next.role === "assistant") {
        assistantText = extractText(next);
      }

      const id = msg.id ?? `${msg.conversationId}-${i}`;
      turns.push({
        id,
        userText,
        assistantText,
        createdAt: msg.createdAt,
        conversationId: msg.conversationId,
        conversationTitle: msg.conversationTitle,
      });
    }

    return turns;
  }, [historyMessages]);

  const historyTurnsDesc = useMemo(() => {
  return [...historyTurns].reverse();
}, [historyTurns]);


  const makeTopic = (text: string) => {
    if (!text) return "Conversation";
    const firstLine = text.split("\n")[0];
    const words = firstLine.split(" ").filter(Boolean);
    if (words.length <= 6) return firstLine;
    return words.slice(0, 6).join(" ") + "…";
  };

  const selectedConversation = useMemo(
    () =>
      conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const selectedTurn = useMemo(
    () => historyTurns.find((t) => t.id === selectedTurnId),
    [historyTurns, selectedTurnId]
  );

  const allMessages: UIMessage[] = useMemo(
    () => [...liveMessages, ...mmMessages],
    [liveMessages, mmMessages]
  );

  // ---------- DATA LOADING (NO useCallback, ONE effect) ----------

  async function loadAllHistory(convsOverride?: Conversation[]) {
    const targetConvs = convsOverride ?? conversations;

    if (!Array.isArray(targetConvs) || targetConvs.length === 0) {
      setHistoryMessages([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const all: (HistoryMessage & {
        conversationId: string;
        conversationTitle?: string | null;
      })[] = [];

      for (const conv of targetConvs) {
        const res = await fetch(
          `/api/history?conversationId=${encodeURIComponent(conv.id)}`
        );
        if (!res.ok) {
          throw new Error(`History error for ${conv.id}: ${res.status}`);
        }
        const data = await res.json();
        const msgs: HistoryMessage[] = data.messages ?? [];

        msgs.forEach((m) => {
          all.push({
            ...m,
            conversationId: conv.id,
            conversationTitle: conv.title,
          });
        });
      }

      all.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setHistoryMessages(all);
    } catch (err: any) {
      console.error("Failed to load all history:", err);
      setHistoryError(err?.message ?? "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadConversations() {
    setConversationsLoading(true);
    setConversationsError(null);

    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) {
        throw new Error(`Conversations error: ${res.status}`);
      }
      const data = await res.json();

      const convs: Conversation[] = data.conversations ?? [];
      setConversations(convs);

      if (!selectedConversationId && convs.length > 0) {
        setSelectedConversationId(convs[0].id);
      }

      await loadAllHistory(convs);
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
      setConversationsError(err?.message ?? "Failed to load conversations");
    } finally {
      setConversationsLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- CHAT: JSON /api/chat ----------

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    const trimmed = input.trim();
    if (!trimmed) return;

    setError(null);
    setStatus("submitted");

    const userMessage: UIMessage = {
      id: `live-user-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: trimmed }],
    };

    setLiveMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmed,
          conversationId: selectedConversationId,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Chat API error");
      }

      const data = await res.json();
      const answer: string = data.text ?? "(no answer)";
      const newConversationId: string =
        data.conversationId ?? selectedConversationId;

      if (!selectedConversationId && newConversationId) {
        setSelectedConversationId(newConversationId);
      }

      const assistantMessage: UIMessage = {
        id: `live-assistant-${Date.now()}`,
        role: "assistant",
        parts: [{ type: "text", text: answer }],
      };

      setLiveMessages((prev) => [...prev, assistantMessage]);
      setInput("");
      setSelectedTurnId(null);

      await loadConversations();
      await loadAllHistory();
    } catch (err: any) {
      console.error("sendMessage failed:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setStatus("ready");
    }
  }

  // ---------- FILE UPLOAD ----------

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    const formData = new FormData();
    formData.append("file", file);

    const questionText = input.trim();
    if (questionText) {
      formData.append("question", questionText);
    }
    if (selectedConversationId) {
      formData.append("conversationId", selectedConversationId);
    }

    setUploading(true);
    setError(null);

    try {
      const res = await fetch("/api/mm-chat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("Upload failed", await res.text());
      } else {
        const data = await res.json();

        const effectiveConversationId: string | null =
          data.conversationId ?? selectedConversationId ?? null;

        if (!selectedConversationId && effectiveConversationId) {
          setSelectedConversationId(effectiveConversationId);
        }

        const userMessage: UIMessage = {
          id: `mm-user-${Date.now()}`,
          role: "user",
          parts: [
            {
              type: "text",
              text: questionText || `Uploaded file: ${file.name}`,
            },
          ],
        };

        const assistantMessage: UIMessage = {
          id: `mm-assistant-${Date.now()}`,
          role: "assistant",
          parts: [
            {
              type: "text",
              text: data.answer ?? "(no answer)",
            },
          ],
        };

        setMmMessages((prev) => [...prev, userMessage, assistantMessage]);

        setInput("");

        await loadConversations();
        await loadAllHistory();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="w-full max-w-full h-screen bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex">
      {/* LEFT: HISTORY */}
      <HistorySidebar
        historyTurns={historyTurnsDesc}
        historyLoading={historyLoading}
        historyError={historyError}
        conversationsLoading={conversationsLoading}
        selectedTurnId={selectedTurnId}
        onRefresh={() => loadAllHistory()}
        onSelectTurn={(turn) => {
          setSelectedTurnId(turn.id);
          setSelectedConversationId(turn.conversationId);
          if (turn.userText) setInput(turn.userText);
        }}
        makeTopic={makeTopic}
      />

      {/* RIGHT: CHAT AREA */}
      <main className="flex-1 flex flex-col">
        <ChatHeaderAndMessages
          selectedConversation={selectedConversation}
          selectedTurn={selectedTurn}
          messages={allMessages}
          error={error as any}
          status={status}
          makeTopic={makeTopic}
          onBackToCurrent={() => setSelectedTurnId(null)}
        />

        <ChatFooterUploads
          status={status}
          stop={undefined}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          uploading={uploading}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          hasSelectedTurn={!!selectedTurn}
          onUploadClick={handleUploadClick}
        />
      </main>
    </div>
  );
}
