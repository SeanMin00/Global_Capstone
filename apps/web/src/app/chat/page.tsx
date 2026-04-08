"use client";

import { useState } from "react";

import { SectionCard } from "@/components/section-card";
import { postChat } from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask about a region, a market mood, or what a beginner investor should watch today.",
    },
  ]);
  const [input, setInput] = useState("What should a beginner investor watch in Asia Pacific today?");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;

    const nextMessages = [...messages, { role: "user" as const, content: input }];
    setMessages(nextMessages);
    setLoading(true);

    const reply = await postChat(input);
    setMessages([...nextMessages, { role: "assistant", content: reply.answer }]);
    setInput("");
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tide">AI Chat</p>
      <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold text-ink">
        Beginner-friendly market assistant
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,0.6fr]">
        <SectionCard title="Conversation">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "assistant"
                    ? "rounded-2xl bg-mist p-4 text-sm text-ink"
                    : "ml-auto max-w-[80%] rounded-2xl bg-ink p-4 text-sm text-white"
                }
              >
                {message.content}
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-ink/15 p-4 text-sm outline-none ring-0"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Prompt Ideas" title="Best MVP use cases">
          <div className="space-y-3 text-sm text-ink/75">
            <p>What does Europe sentiment mean for beginner investors?</p>
            <p>Which region looks most risk-off right now?</p>
            <p>Summarize the top market signal in North America.</p>
            <p>What should I compare before adding a region to my watchlist?</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

