import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./FrontdeskChatPanel.css";

const DEMO_CONVERSATIONS = [
  {
    id: "conv-1",
    guestName: "Maria Santos",
    room: "302",
    lastMessage: "Could I get extra towels?",
    time: "9:14 AM",
    unread: 1,
  },
  {
    id: "conv-2",
    guestName: "John Reyes",
    room: "415",
    lastMessage: "What time is checkout tomorrow?",
    time: "Yesterday",
    unread: 0,
  },
  {
    id: "conv-3",
    guestName: "Ana Dela Cruz",
    room: "208",
    lastMessage: "Thank you for the quick response!",
    time: "Mon",
    unread: 0,
  },
];

const DEMO_MESSAGES = {
  "conv-1": [
    {
      id: "m1",
      sender: "guest",
      text: "Hi, could I get extra towels for room 302?",
      time: "9:14 AM",
    },
    {
      id: "m2",
      sender: "desk",
      text: "Of course! We'll send housekeeping right away. Is there anything else you need?",
      time: "9:15 AM",
    },
    {
      id: "m3",
      sender: "guest",
      text: "That's all, thank you!",
      time: "9:16 AM",
    },
  ],
  "conv-2": [
    {
      id: "m4",
      sender: "guest",
      text: "What time is checkout tomorrow?",
      time: "4:22 PM",
    },
    {
      id: "m5",
      sender: "desk",
      text: "Checkout is at 12:00 PM. Late checkout may be arranged upon request.",
      time: "4:25 PM",
    },
  ],
  "conv-3": [
    {
      id: "m6",
      sender: "guest",
      text: "The room service was excellent last night.",
      time: "10:05 AM",
    },
    {
      id: "m7",
      sender: "desk",
      text: "We're glad you enjoyed it! Let us know if you need anything else during your stay.",
      time: "10:08 AM",
    },
    {
      id: "m8",
      sender: "guest",
      text: "Thank you for the quick response!",
      time: "10:10 AM",
    },
  ],
};

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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
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

function guestInitials(name) {
  return String(name || "G")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/**
 * Slide-out guest messaging panel for front desk staff (UI-only demo).
 */
export default function FrontdeskChatPanel({ open, onClose }) {
  const [selectedId, setSelectedId] = useState(DEMO_CONVERSATIONS[0]?.id ?? null);
  const [messagesByConv, setMessagesByConv] = useState(DEMO_MESSAGES);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const selected = DEMO_CONVERSATIONS.find((c) => c.id === selectedId) ?? null;
  const messages = selectedId ? messagesByConv[selectedId] ?? [] : [];

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
    if (open && selectedId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, selectedId, messages]);

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
    if (!text || !selectedId) return;
    setMessagesByConv((prev) => ({
      ...prev,
      [selectedId]: [
        ...(prev[selectedId] ?? []),
        { id: `local-${Date.now()}`, sender: "desk", text, time: formatTime() },
      ],
    }));
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
        className={`fd-chat-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`fd-chat-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Guest Messages"
        aria-hidden={!open}
      >
        <header className="fd-chat-header">
          {selected ? (
            <>
              <button
                type="button"
                className="fd-chat-back fd-chat-back--mobile"
                onClick={() => setSelectedId(null)}
                aria-label="Back to conversations"
              >
                <BackIcon />
              </button>
              <div className="fd-chat-guest-avatar" aria-hidden>
                {guestInitials(selected.guestName)}
              </div>
              <div className="fd-chat-header-info">
                <h2 className="fd-chat-title">{selected.guestName}</h2>
                <div className="fd-chat-subtitle">Room {selected.room}</div>
              </div>
            </>
          ) : (
            <div className="fd-chat-header-info">
              <h2 className="fd-chat-title">Guest Messages</h2>
              <div className="fd-chat-subtitle">Reply to guest inquiries</div>
            </div>
          )}
          <button type="button" className="fd-chat-close" onClick={onClose} aria-label="Close chat">
            <CloseIcon />
          </button>
        </header>

        <div className="fd-chat-body">
          <div className={`fd-chat-list${selected ? " fd-chat-list--hidden-mobile" : ""}`}>
            {DEMO_CONVERSATIONS.map((conv) => (
              <button
                key={conv.id}
                type="button"
                className={`fd-chat-list-item${conv.id === selectedId ? " active" : ""}`}
                onClick={() => setSelectedId(conv.id)}
              >
                <div className="fd-chat-list-avatar" aria-hidden>
                  {guestInitials(conv.guestName)}
                </div>
                <div className="fd-chat-list-content">
                  <div className="fd-chat-list-top">
                    <span className="fd-chat-list-name">{conv.guestName}</span>
                    <span className="fd-chat-list-time">{conv.time}</span>
                  </div>
                  <div className="fd-chat-list-bottom">
                    <span className="fd-chat-list-preview">Room {conv.room} · {conv.lastMessage}</span>
                    {conv.unread > 0 ? (
                      <span className="fd-chat-unread">{conv.unread}</span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className={`fd-chat-thread${selected ? " fd-chat-thread--visible-mobile" : ""}`}>
            {selected ? (
              <>
                <div className="fd-chat-messages">
                  <span className="fd-chat-date-divider">Today</span>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`fd-chat-msg fd-chat-msg--${msg.sender === "guest" ? "guest" : "desk"}`}
                    >
                      <div className="fd-chat-bubble">{msg.text}</div>
                      <span className="fd-chat-time">{msg.time}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="fd-chat-input-wrap">
                  <textarea
                    ref={inputRef}
                    className="fd-chat-input"
                    rows={1}
                    placeholder="Reply to guest…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-label="Message"
                  />
                  <button
                    type="button"
                    className="fd-chat-send"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    aria-label="Send message"
                  >
                    <SendIcon />
                  </button>
                </div>
              </>
            ) : (
              <div className="fd-chat-empty">
                <p>Select a conversation to view messages</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>,
    document.body,
  );
}
