// app/chat/HistorySidebar.tsx
"use client";

import React from "react";
import type { HistoryTurn } from "./page";

type Props = {
  historyTurns: HistoryTurn[];
  historyLoading: boolean;
  historyError: string | null;
  conversationsLoading: boolean;
  selectedTurnId: string | null;
  onRefresh: () => void;
  onSelectTurn: (turn: HistoryTurn) => void;
  makeTopic: (text: string) => string;
};

export default function HistorySidebar({
  historyTurns,
  historyLoading,
  historyError,
  conversationsLoading,
  selectedTurnId,
  onRefresh,
  onSelectTurn,
  makeTopic,
}: Props) {
  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-gray-200 bg-gray-50">
      {/* History header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-gray-900">History</h2>
          <span className="text-[11px] text-gray-500">
            {historyTurns.length} past turns
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="text-[11px] px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100 transition"
        >
          {historyLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Turn-level history list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-sm">
        {historyError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {historyError}
          </div>
        )}

        {(conversationsLoading || historyLoading) &&
          historyTurns.length === 0 && (
            <p className="text-xs text-gray-500">Loading history…</p>
          )}

        {!historyLoading && !historyError && historyTurns.length === 0 && (
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
              onClick={() => onSelectTurn(turn)}
              className={`w-full text-left rounded-xl border px-3 py-2 text-xs shadow-sm transition ${
                isSelected
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-gray-700 line-clamp-1">
                  {turn.conversationTitle ||
                    `Conversation ${turn.conversationId.slice(0, 8)}${
                      turn.conversationId.length > 8 ? "…" : ""
                    }`}
                </span>
                {turn.createdAt && (
                  <span className="text-[10px] text-gray-400">
                    {/* {new Date(turn.createdAt).toLocaleTimeString()} */}
                  </span>
                )}
              </div>

              <div className="mb-1">
                <h1 className="text-md font-semibold text-gray-900 line-clamp-1">
                  {makeTopic(turn.userText)}
                </h1>
              </div>

              {/* <div className="space-y-1">
                <p className="text-[11px] text-gray-700 line-clamp-2 whitespace-pre-wrap">
                  <span className="font-medium text-gray-900">You: </span>
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
              </div> */}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
