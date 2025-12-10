// app/chat/ChatHeaderAndMessages.tsx
"use client";

import React from "react";
import type { Conversation, HistoryTurn } from "./page";
import type { UIMessage } from "ai";

type Props = {
  selectedConversation: Conversation | null;
  selectedTurn: HistoryTurn | undefined;
  messages: UIMessage[];
  error: any;
  status: string;
  makeTopic: (text: string) => string;
  onBackToCurrent: () => void;
};

export default function ChatHeaderAndMessages({
  selectedConversation,
  selectedTurn,
  messages,
  error,
  status,
  makeTopic,
  onBackToCurrent,
}: Props) {


  function formatTimeWithGap(iso?: string) {
  if (!iso) return "";

  const date = new Date(iso); // UTC → local automatically
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

  return (
    <>
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
              onClick={onBackToCurrent}
              className="text-[11px] px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100 transition"
            >
              Back to current chat
            </button>
          )}
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
          <div className="mb-4 p-3 rounded-2xl bg-white border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                {makeTopic(selectedTurn.userText)}
              </span>
              {/* {selectedTurn.createdAt && (
                <span className="text-[10px] text-gray-400">
                 {formatTimeWithGap(selectedTurn.createdAt)}

                </span>
              )} */}
            </div>

            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm bg-blue-600 text-white whitespace-pre-wrap">
                  {selectedTurn.userText || "(no content)"}
                </div>
              </div>

              {selectedTurn.assistantText && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm bg-white text-gray-900 border border-gray-200 whitespace-pre-wrap">
                    {selectedTurn.assistantText}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-[11px] text-gray-500">
              You can edit the text in the input below and send it again, or
              click <span className="font-semibold">“Back to current chat”</span>{" "}
              to continue the live conversation.
            </p>
          </div>
        ) : (
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
                      {(message.parts || []).map((part: any, index: number) => {
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
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
