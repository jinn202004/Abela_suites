import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./GuestChatPanel.css";

const DEMO_MESSAGES = [
  {
    id: "demo-1",
    sender: "desk",
    text: "Welcome to Abela Suites! How may we assist you today?",
    time: "9:12 AM",
  },
  {
    id: "demo-2",
    sender: "guest",
    text: "Hi, could I get extra towels for room 302?",
    time: "9:14 AM",
  },
  {
    id: "demo-3",
    sender: "desk",
    text: "Of course! We'll send housekeeping right away. Is there anything else you need?",
    time: "9:15 AM",
  },
  {
    id: "demo-4",
    sender: "guest",
    text: "That's all, thank you!",
    time: "9:16 AM",
  },
];

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

/**
 * Slide-out chat panel for guest ↔ Front Desk (UI-only demo).
 */
export default function GuestChatPanel({ open, onClose }) {
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const t = window.setTimeout(() => inputRef.current?.focus(), 320);
      return () => {
        window.clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, sender: "guest", text, time: formatTime() },
    ]);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className={`guest-chat-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`guest-chat-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Chat with Front Desk"
        aria-hidden={!open}
      >
        <header className="guest-chat-header">
          <img src="/logo.png" alt="" className="guest-chat-avatar" />
          <div className="guest-chat-header-info">
            <h2 className="guest-chat-title">Front Desk</h2>
            <div className="guest-chat-status">
              <span className="guest-chat-status-dot" aria-hidden />
              <span>Online</span>
            </div>
          </div>
          <button type="button" className="guest-chat-close" onClick={onClose} aria-label="Close chat">
            <CloseIcon />
          </button>
        </header>

        <div className="guest-chat-messages">
          <span className="guest-chat-date-divider">Today</span>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`guest-chat-msg guest-chat-msg--${msg.sender === "guest" ? "guest" : "desk"}`}
            >
              <div className="guest-chat-bubble">{msg.text}</div>
              <span className="guest-chat-time">{msg.time}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="guest-chat-input-wrap">
          <textarea
            ref={inputRef}
            className="guest-chat-input"
            rows={1}
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message"
          />
          <button
            type="button"
            className="guest-chat-send"
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
