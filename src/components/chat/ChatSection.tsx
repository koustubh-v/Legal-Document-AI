import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, Bot as BotIcon, User, Sidebar, Activity } from "lucide-react";
import { useChat } from "@/hooks/api";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  conversation_id?: string;
}

interface ChatSectionProps {
  activeDocument: string | null;
  hasDocuments: boolean;
  activeFileId?: string | null;
  onConversationIdChange?: (conversationId: string) => void;
  showSourcesDesktop?: boolean;
  setShowSourcesDesktop?: (v: boolean) => void;
  showInsightsDesktop?: boolean;
  setShowInsightsDesktop?: (v: boolean) => void;
}

const suggestedQuestions = [
  "What are the key risks?",
  "Summarize this in simple terms",
  "Any hidden fees?",
  "What are my obligations?",
  "What if I terminate?",
  "Any unusual terms?",
];

export const ChatSection = ({
  activeDocument,
  hasDocuments,
  activeFileId,
  onConversationIdChange,
  showSourcesDesktop = true,
  setShowSourcesDesktop,
  showInsightsDesktop = true,
  setShowInsightsDesktop,
}: ChatSectionProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const chatMutation = useChat();
  const isLoading = chatMutation.isPending;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversationId && onConversationIdChange) {
      onConversationIdChange(conversationId);
    }
  }, [conversationId, onConversationIdChange]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
      conversation_id: conversationId ?? undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    try {
      const response = await chatMutation.mutateAsync({
        message: text.trim(),
        file_id: activeFileId || undefined,
        conversation_id: conversationId || undefined,
      });

      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const aiMessage: Message = {
        id: response.message_id || (Date.now() + 1).toString(),
        text: response.response || "I received your message.",
        sender: "ai",
        timestamp: new Date(),
        conversation_id: response.conversation_id,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: `Error: ${error?.message || "Please try again."}`,
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleSuggested = (q: string) => sendMessage(q);

  const titleDisplay = activeDocument
    ? activeDocument.replace(/\.pdf$/i, "")
    : "Document Analysis";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: "linear-gradient(180deg,#000,#050506)",
        minHeight: 0,
        marginTop: "60px", // navbar margin
      }}
    >
      <style>{`
        .header { padding:12px 16px; display:flex; justify-content:space-between; align-items:center;
          background:linear-gradient(180deg,#061022,#091526); border-bottom:1px solid rgba(255,255,255,0.06);}
        .title { color:#f3f4f6; font-weight:600; font-size:18px;}
        .subtitle { color:#9ca3af; font-size:12px;}
        .robot-icon { width:56px; height:56px; border-radius:10px; display:grid; place-items:center;
          background:#0b1626; border:1px solid rgba(255,255,255,0.08);}
        .chat-card { flex:1; display:flex; flex-direction:column; min-height:0;}
        .messages { flex:1; overflow-y:auto; padding:20px;}
        .msg-row { display:flex; gap:14px; margin-bottom:12px;}
        .msg-row.user { flex-direction:row-reverse;}
        .avatar { width:36px; height:36px; border-radius:50%; display:grid; place-items:center;
          background:#0c0c0c; border:1px solid rgba(255,255,255,0.06);}
        .bubble { border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px;
          background:#0b0b0b; color:#e6e6e6; font-size:14px; max-width:800px;}
        .sticky-input { flex-shrink:0; background:#000; padding:12px; display:flex; justify-content:center;}
        .form-container { width:100%; max-width:920px; display:flex; flex-direction:column; gap:6px;}
        .form-container form { display:flex; gap:8px; padding:8px 12px; border-radius:999px;
          background:#111; border:1px solid rgba(255,255,255,0.08);}
        .form-container input { flex:1; background:#111; border:none; color:#e6e6e6; font-size:13px; outline:none;}
        .suggest-row { display:flex; gap:10px; overflow-x:auto; padding:4px;}
        .suggest-pill { flex:0 0 auto; padding:8px 14px; border-radius:999px; background:#111;
          border:1px solid rgba(255,255,255,0.08); color:#e6e6e6; font-size:13px; cursor:pointer;}
        @media(max-width:900px){ .suggest-row{ display:none; } }
      `}</style>

      <div className="header">
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="robot-icon">
            <BotIcon size={28} color="#e6e6e6" />
          </div>
          <div>
            <div className="title">{titleDisplay}</div>
            {activeDocument && (
              <div className="subtitle">AI-powered legal document analysis</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }} className="desktop-toggles">
          <button
            onClick={() =>
              setShowSourcesDesktop && setShowSourcesDesktop(!showSourcesDesktop)
            }
            className="desktop-toggle-btn"
          >
            <Sidebar size={14} />
            {showSourcesDesktop ? "Hide Sources" : "Show Sources"}
          </button>
          <button
            onClick={() =>
              setShowInsightsDesktop && setShowInsightsDesktop(!showInsightsDesktop)
            }
            className="desktop-toggle-btn"
          >
            <Activity size={14} />
            {showInsightsDesktop ? "Hide Insights" : "Show Insights"}
          </button>
        </div>
      </div>

      <div className="chat-card">
        <div className="messages">
          {!hasDocuments && messages.length === 0 ? (
            <div style={{ textAlign: "center" }}>
              <Suspense fallback={<div>Loading…</div>}>
                <Spline scene="https://prod.spline.design/n1Lad8xaG0iocaRW/scene.splinecode" />
              </Suspense>
              <h2 style={{ color: "#e6e6e6" }}>Ask Anything</h2>
              <p style={{ color: "#9ca3af" }}>
                Upload your legal documents to begin AI-powered analysis.
              </p>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`msg-row ${m.sender === "user" ? "user" : ""}`}
                >
                  <div className="avatar">
                    {m.sender === "ai" ? (
                      <BotIcon size={16} color="#9edbff" />
                    ) : (
                      <User size={16} color="#7efbb5" />
                    )}
                  </div>
                  <div className="bubble">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Badge variant="outline" style={{ fontSize: 11 }}>
                        {m.sender === "ai" ? "AI Assistant" : "You"}
                      </Badge>
                      <span style={{ fontSize: 11, color: "#777" }}>
                        {m.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="msg-row">
                  <div className="avatar">
                    <BotIcon size={16} color="#9edbff" />
                  </div>
                  <div className="bubble">Typing…</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="sticky-input">
          <div className="form-container">
            <form onSubmit={handleSubmit}>
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about your documents..."
                disabled={isLoading}
              />
              <button type="button">
                <Mic size={14} color="#e6e6e6" />
              </button>
              <button type="submit" disabled={!inputText.trim() || isLoading}>
                <Send size={14} color="#fff" />
              </button>
            </form>

            <div className="suggest-row">
              {suggestedQuestions.map((q, i) => (
                <div
                  key={i}
                  className="suggest-pill"
                  onClick={() => handleSuggested(q)}
                >
                  {q}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
