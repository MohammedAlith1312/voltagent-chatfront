// app/chat/ChatFooterUploads.tsx
"use client";

import React from "react";

type Props = {
  status: string;
  stop?: () => void;
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => void | Promise<void>;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasSelectedTurn: boolean;
  onUploadClick: () => void;
};

export default function ChatFooterUploads({
  status,
  stop,
  input,
  setInput,
  handleSubmit,
  uploading,
  fileInputRef,
  handleFileChange,
  hasSelectedTurn,
  onUploadClick,
}: Props) {
  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-3">
      {(status === "submitted" || status === "streaming") && !uploading && (
        <div className="flex items-center gap-2 mb-2 text-[11px] text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500" />
          <span>Assistant is typing…</span>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 mb-2 text-[11px] text-blue-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
          <span>Uploading file…</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Hidden file input */}
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload button icon */}
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-600 transition disabled:opacity-50"
          title={uploading ? "Uploading..." : "Upload files or images"}
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 6.75L8.25 15a2.25 2.25 0 103.182 3.182L18 11.25"
              />
            </svg>
          )}
        </button>

        <input
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-900 outline-none border border-gray-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400"
          placeholder={
            hasSelectedTurn
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
            disabled={status !== "ready" || uploading}
            className="px-4 py-2 rounded-full text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            Send
          </button>
        )}
      </form>
    </footer>
  );
}
