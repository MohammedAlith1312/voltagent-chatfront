"use client";

import React, { useState, FormEvent } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function McpChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm connected to your MCP status server. Ask me something, and I'll use the status tool if helpful.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    // Optimistically add user msg
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/mcp-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          `Request failed (${res.status}): ${
            body || res.statusText || "Unknown error"
          }`,
        );
      }

      const data: { reply: string; toolCalls?: any } = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "(no reply text returned)",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("MCP chat error:", err);
      setError(err?.message || "Unknown error calling /api/mcp-status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[100vh] max-h-[700px] max-w-2xl mx-auto border rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-lg">MCP Status Chat</h1>
          <p className="text-xs text-gray-500">
            Backend: /api/mcp-status → MCP stdio server → OpenRouter
          </p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
          MCP connected
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-900 rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-gray-500 animate-pulse">
            Thinking with MCP…
          </div>
        )}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t bg-gray-50 px-3 py-2 flex gap-2 items-center"
      >
        <input
          className="flex-1 text-sm px-3 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ask something… e.g. “status with message hello”"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
