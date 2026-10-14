import { useState, useRef, useEffect } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "/api/chat";

const TOPICS = [
  { label: "Academic Support", question: "How do I find academic advising?" },
  { label: "Campus Life", question: "What student organizations can I join?" },
  { label: "Financial Aid", question: "How do I apply for financial aid?" },
  { label: "IT & Technology", question: "How do I contact IT support?" },
  { label: "International Students", question: "Who can help international students?" },
  { label: "Career & Internships", question: "Where can I get help with my resume?" },
  { label: "Housing & Dining", question: "How do I apply for housing?" },
  { label: "Library", question: "What are the library hours?" },
];

// Citation numbers remain in message history for grounding, but not in the UI.
function displayAnswer(message) {
  if (message.role !== "bot") return message.text;
  const sources = message.sources || (message.source ? [message.source] : []);
  const numbers = new Set(sources.map((source, index) => source.number || index + 1));
  return message.text.replace(/[ \t]*\[(\d+)\]/g, (marker, number) =>
    numbers.has(Number(number)) ? "" : marker);
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// The distinct office info card shown under a bot reply (mockup screen 4).
// Only renders fields that actually exist, and skips anything still marked
// as a TODO placeholder in campusData.json rather than showing it to a student.
function OfficeCard({ source }) {
  const isPlaceholder = (val) => !val || val.startsWith("TODO");

  return (
    <div className="office-card">
      <div className="office-card-title">📍 {source.topic}</div>
      {!isPlaceholder(source.office) && <div className="office-card-line">{source.office}</div>}
      {!isPlaceholder(source.phone) && (
        <div className="office-card-line">
          📞 <a href={`tel:${source.phone.replace(/[^\d+]/g, "")}`}>{source.phone}</a>
        </div>
      )}
      {!isPlaceholder(source.email) && (
        <div className="office-card-line">
          ✉️ <a href={`mailto:${source.email}`}>{source.email}</a>
        </div>
      )}
      {!isPlaceholder(source.hours) && <div className="office-card-line">🕒 {source.hours}</div>}
      {source.url && (
        <a href={source.url} target="_blank" rel="noreferrer" className="office-card-link">
          View Official Webster Page →
        </a>
      )}
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! Ask me anything about Webster University — services, offices, hours, and more.",
      source: null,
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSource, setActiveSource] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed, source: null, time: new Date() },
    ]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: messages
          .filter(msg => !msg.failed).slice(1).slice(-10)
          .map(msg => ({ role: msg.role === "bot" ? "assistant" : "user", content: msg.text.slice(0, 4000) })) }),
      });

      if (response.status === 401) {
        throw new Error("Please open the demo at http://localhost:3001 or its shared link, then refresh and sign in with username demo and your class password. The demo does not use port 5173.");
      }
      const isJson = response.headers.get("content-type")?.includes("application/json");
      if (!isJson) throw new Error("The server returned an unexpected response. Refresh the demo page and try again.");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to get an answer. Please try again.");

      if (typeof data.reply !== "string") throw new Error("The server did not return an answer. Please try again.");
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply, source: data.source, sources: data.sources, time: new Date() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: err.message === "Failed to fetch" ? "Unable to reach the chatbot. Please try again shortly." : err.message,
          failed: true,
          source: null,
          time: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleTopicClick(question) {
    setSidebarOpen(false);
    sendMessage(question);
  }

  return (
    <div className="chat-app">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="logo-ask">ASK</span> <span className="logo-webster">WEBSTER</span>
        </div>
        <button className="new-chat-btn" onClick={() => window.location.reload()}>
          + New Chat
        </button>
        <nav className="topic-list">
          {TOPICS.map((topic) => (
            <button
              key={topic.label}
              className="topic-item"
              onClick={() => handleTopicClick(topic.question)}
            >
              {topic.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">Helpful, accurate, and always here for you.</div>
      </aside>

      <div className="chat-main">
        <header className="chat-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen((v) => !v)}>
            ☰
          </button>
          <div>
            <div className="chat-header-title">Ask Webster</div>
            <div className="chat-header-subtitle">Get answers. Find resources. Move forward.</div>
          </div>
        </header>

        <div className="chat-window">
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              {msg.role === "bot" && <div className="avatar bot-avatar">🎓</div>}
              <div className="bubble-col">
                <div className="bubble">
                  <p>{displayAnswer(msg)}</p>
                  {msg.source && <OfficeCard source={msg.source} />}
                  {(msg.sources || (msg.source ? [msg.source] : [])).map((source) => (
                  <button key={source.id || source.url} className="source-link"
                    onClick={() => setActiveSource(source)}>
                    Source: {source.topic} →
                  </button>
                ))}
                </div>
                <div className="message-time">{formatTime(msg.time)}</div>
              </div>
              {msg.role === "user" && <div className="avatar user-avatar">🧑</div>}
            </div>
          ))}
          {loading && (
            <div className="message-row bot">
              <div className="avatar bot-avatar">🎓</div>
              <div className="bubble-col">
                <div className="bubble typing">...</div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="chat-input-row" onSubmit={handleSend}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about Webster..."
            maxLength={2000}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            Send
          </button>
        </form>
      </div>

      {activeSource && (
        <div className="modal-overlay" onClick={() => setActiveSource(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Source</h3>
              <button className="modal-close" onClick={() => setActiveSource(null)}>
                ✕
              </button>
            </div>
            <p className="modal-topic">{activeSource.topic}</p>
            <a href={activeSource.url} target="_blank" rel="noreferrer" className="modal-url">
              {activeSource.url}
            </a>
            {activeSource.lastUpdated && (
              <p className="modal-updated">Last updated: {activeSource.lastUpdated}</p>
            )}
            <a
              href={activeSource.url}
              target="_blank"
              rel="noreferrer"
              className="modal-open-btn"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
