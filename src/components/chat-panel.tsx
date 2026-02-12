"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coze/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId ?? undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? data?.detail ?? "請求失敗");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `抱歉，發生錯誤：${data?.error ?? res.statusText}。請檢查 Coze API 配置。`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      setConversationId(data.conversationId ?? null);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? "（無回覆內容）",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError("網絡錯誤，請稍後再試");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "無法連接到伺服器，請檢查網絡後重試。",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 md:h-[600px]">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          PureAir AI 智能顧問
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          由 Coze 驅動，可解答產品與選型問題
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500 dark:text-slate-400">
            <p>輸入你的問題，例如：</p>
            <ul className="list-inside text-sm">
              <li>30 平方米臥室該選哪一款？</li>
              <li>有寵物適合用哪個型號？</li>
              <li>Pro 和 Home 的差別？</li>
            </ul>
          </div>
        )}
        <ul className="space-y-4">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </li>
          ))}
        </ul>
        {loading && (
          <li className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 dark:bg-slate-700">
              <span className="text-sm text-slate-500">正在回覆…</span>
            </div>
          </li>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4 dark:border-slate-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="輸入問題…"
            rows={1}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-sky-600 px-5 py-2.5 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            發送
          </button>
        </div>
      </form>
    </div>
  );
}
