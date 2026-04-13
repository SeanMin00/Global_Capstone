"use client";

import { FormEvent, useMemo, useState } from "react";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const starterPrompts = [
  "Summarize today's Asia market mood",
  "Which market looks riskier right now?",
  "What should I watch in North America?",
];

function generateMockReply(input: string) {
  const normalized = input.toLowerCase();

  if (normalized.includes("asia")) {
    return "Asia is seeing mixed momentum. China and India headlines look constructive, while Singapore remains softer in the current news flow.";
  }

  if (normalized.includes("risk")) {
    return "Based on the current MVP data, Korea screens as the highest market risk case, while the US remains more moderate on the latest stored snapshot.";
  }

  if (normalized.includes("north america") || normalized.includes("canada") || normalized.includes("us")) {
    return "North America is currently being driven by inflation and trade headlines. The US still dominates market cap, while Canada adds a financials-heavy angle.";
  }

  if (normalized.includes("portfolio") || normalized.includes("pf")) {
    return "The portfolio assistant layer is not wired yet, but we can already use your profile and country risk data as the next step.";
  }

  return "I can help you explore region news, market risk, and country context. Backend chat is not connected yet, so this is a frontend-only copilot preview.";
}

export default function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Ask about regions, market risk, or portfolio context. This chat is frontend-only for now.",
    },
  ]);

  const canSend = input.trim().length > 0;

  const visibleMessages = useMemo(() => messages.slice(-8), [messages]);

  function sendMessage(messageText: string) {
    const trimmed = messageText.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
    };
    const assistantMessage: ChatMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: generateMockReply(trimmed),
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      <div className={`assistant-dock ${open ? "open" : ""}`}>
        {open ? (
          <div className="assistant-panel">
            <div className="assistant-panel-top">
              <div>
                <p className="assistant-panel-eyebrow">AI Assistant</p>
                <strong>Global Pulse Copilot</strong>
              </div>
              <button
                type="button"
                className="assistant-close"
                onClick={() => setOpen(false)}
                aria-label="Close AI assistant"
              >
                ×
              </button>
            </div>

            <div className="assistant-panel-status">
              <span className="assistant-status-dot" />
              Local preview chat
            </div>

            <div className="assistant-chat-feed">
              {visibleMessages.map((message) => (
                <div
                  key={message.id}
                  className={`assistant-message assistant-message-${message.role}`}
                >
                  <span className="assistant-message-role">
                    {message.role === "assistant" ? "Copilot" : "You"}
                  </span>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>

            <div className="assistant-starters">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="assistant-starter"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form className="assistant-input-row" onSubmit={handleSubmit}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about markets, countries, or risk..."
              />
              <button type="submit" className="assistant-send" disabled={!canSend}>
                Send
              </button>
            </form>
          </div>
        ) : null}

        <button
          type="button"
          className="assistant-launcher"
          onClick={() => setOpen((current) => !current)}
          aria-label="Open AI assistant"
        >
          <span className="assistant-launcher-core">
            <span className="assistant-launcher-glyph">AI</span>
          </span>
          <span className="assistant-launcher-label">Assistant</span>
        </button>
      </div>
    </>
  );
}
