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
  messages?: Message[];
  inputText?: string;
  setInputText?: (v: string) => void;
  sendMessage?: (text: string) => Promise<void>;
  isLoading?: boolean;
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
  messages: messagesProp,
  inputText: inputTextProp,
  setInputText: setInputTextProp,
  sendMessage: sendMessageProp,
  isLoading: isLoadingProp,
}: ChatSectionProps) => {
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [internalInputText, setInternalInputText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visible, setVisible] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chatMutation = useChat();
  const messages = messagesProp ?? internalMessages;
  const inputText = inputTextProp ?? internalInputText;
  const isLoading = typeof isLoadingProp === "boolean" ? isLoadingProp : chatMutation.isPending;
  const setInputText = (v: string) => {
    if (setInputTextProp) setInputTextProp(v);
    else setInternalInputText(v);
  };
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    setTimeout(() => setVisible((prev) => [...prev, last.id]), 80);
  }, [messages]);
  useEffect(() => {
    if (conversationId && onConversationIdChange) {
      onConversationIdChange(conversationId);
    }
  }, [conversationId, onConversationIdChange]);
  const internalSendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
      conversation_id: conversationId ?? undefined,
    };
    setInternalMessages((prev) => [...prev, userMessage]);
    setInternalInputText("");
    try {
      const response = await chatMutation.mutateAsync({
        message: text.trim(),
        file_id: activeFileId || undefined,
        conversation_id: conversationId || undefined,
      });
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
        if (onConversationIdChange) onConversationIdChange(response.conversation_id);
      }
      const aiMessage: Message = {
        id: response.message_id || (Date.now() + 1).toString(),
        text: response.response || "I received your message.",
        sender: "ai",
        timestamp: new Date(),
        conversation_id: response.conversation_id,
      };
      setInternalMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${error?.message || "Please try again."}`,
        sender: "ai",
        timestamp: new Date(),
      };
      setInternalMessages((prev) => [...prev, errorMessage]);
    }
  };
  const sendMessage = sendMessageProp ?? internalSendMessage;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };
  const handleSuggested = (q: string) => sendMessage(q);
  const titleDisplay = activeDocument ? activeDocument.replace(/\.pdf$/i, "") : "Document Analysis";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "linear-gradient(180deg,#000,#050506)", minHeight: 0 }}>
      <style>{`
        .header { padding: 12px 16px; border-radius: 0; display:flex; align-items:center; justify-content:space-between; background: linear-gradient(180deg,#061022,#091526); border-bottom:1px solid rgba(255,255,255,0.06); }
        .header-left { display:flex; gap:12px; align-items:center; }
        .title { color:#f3f4f6; font-weight:600; font-size:18px; }
        .subtitle { color:#9ca3af; font-size:12px; margin-top:4px; }
        .robot-icon { width:56px; height:56px; border-radius:10px; display:grid; place-items:center; background:#0b1626; border:1px solid rgba(255,255,255,0.08); }
        .chat-card { flex:1; display:flex; flex-direction:column; min-height:0; }
        .messages { padding: 20px; overflow-y:auto; flex:1; min-height:0; box-sizing:border-box; }
        .msg-row { display:flex; gap:14px; align-items:flex-start; margin-bottom:12px; }
        .msg-row.user { flex-direction:row-reverse; }
        .avatar { width:36px; height:36px; border-radius:999px; display:grid; place-items:center; background:#0c0c0c; border:1px solid rgba(255,255,255,0.06); }
        .bubble { border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px; background:#0b0b0b; max-width:800px; color:#e6e6e6; font-size:14px; word-break:break-word; }
        .typing-dots { display:flex; gap:6px; align-items:center; }
        .dot { width:6px; height:6px; background:#cfcfcf; border-radius:999px; opacity:0.3; animation: blink 1s infinite; }
        .dot:nth-child(2){ animation-delay:0.15s; }
        .dot:nth-child(3){ animation-delay:0.3s; }
        @keyframes blink { 0%,100%{opacity:0.3; transform:translateY(0);} 50%{opacity:1; transform:translateY(-4px);} }
        .sticky-input { flex-shrink:0; display:flex; justify-content:center; padding: 12px; background:#000; }
        .sticky-input .form-container { width:100%; max-width:920px; display:flex; flex-direction:column; gap:8px; }
        .sticky-input form { width:100%; display:flex; gap:8px; align-items:center; padding:8px 12px; border-radius:999px; background:#111; border:1px solid rgba(255,255,255,0.08); }
        .sticky-input .input { flex:1; background:#111; border:none; color:#e6e6e6; font-size:13px; padding:6px 10px; outline:none; }
        .suggest-row { display:flex; gap:10px; overflow-x:auto; padding:6px 4px 0; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.2) transparent; }
        .suggest-row::-webkit-scrollbar { height:6px; }
        .suggest-row::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:999px; }
        .suggest-pill { flex:0 0 auto; white-space:nowrap; padding:8px 14px; border-radius:999px; background:#111; border:1px solid rgba(255,255,255,0.08); color:#e6e6e6; font-size:13px; cursor:pointer; }
        .desktop-toggles { display:inline-flex; gap:8px; align-items:center; }
        .desktop-toggle-btn { display:flex; gap:8px; align-items:center; padding:8px 10px; border-radius:999px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:#e6e6e6; font-size:13px; cursor:pointer; }
        @media (max-width:900px){ .desktop-toggles{ display:none; } .sticky-input .form-container{ max-width: calc(100% - 48px); } }
      `}</style>

      <div className="header">
        <div className="header-left">
          <div className="robot-icon">
            <BotIcon size={28} color="#e6e6e6" />
          </div>
          <div>
            <div className="title">{titleDisplay}</div>
            {activeDocument && <div className="subtitle">AI-powered legal document analysis</div>}
          </div>
        </div>

        <div className="desktop-toggles">
          <div className="desktop-toggle-btn" onClick={() => setShowSourcesDesktop && setShowSourcesDesktop(!showSourcesDesktop)}>
            <Sidebar size={14}/>
            <span>{showSourcesDesktop ? "Hide Sources" : "Show Sources"}</span>
          </div>
          <div className="desktop-toggle-btn" onClick={() => setShowInsightsDesktop && setShowInsightsDesktop(!showInsightsDesktop)}>
            <Activity size={14}/>
            <span>{showInsightsDesktop ? "Hide Insights" : "Show Insights"}</span>
          </div>
        </div>
      </div>

      <div className="chat-card">
        <div className="messages" ref={containerRef}>
          {!hasDocuments && messages.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
              <div style={{ width:"100%", maxWidth:700, height:340, borderRadius:12, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <Suspense fallback={<div style={{height:"100%",display:"grid",placeItems:"center"}}>Loading 3D…</div>}>
                  <Spline scene="https://prod.spline.design/n1Lad8xaG0iocaRW/scene.splinecode" />
                </Suspense>
              </div>
              <h2 style={{ color:"#e6e6e6" }}>Ask Anything</h2>
              <p style={{ color:"#9ca3af", textAlign:"center", maxWidth:520 }}>Upload your legal documents to begin AI-powered analysis and get instant insights.</p>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div key={m.id} className={`msg-row ${m.sender === "user" ? "user" : ""}`}>
                  <div className="avatar">{m.sender === "ai" ? <BotIcon size={16} color="#9edbff" /> : <User size={16} color="#7efbb5" />}</div>
                  <div className="bubble">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <Badge variant="outline" style={{ fontSize: 11, color: "#ccc", borderColor: "rgba(255,255,255,0.08)" }}>
                        {m.sender === "ai" ? "AI Assistant" : "You"}
                      </Badge>
                      <span style={{ fontSize: 11, color: "#777" }}>{m.timestamp instanceof Date ? m.timestamp.toLocaleTimeString() : new Date(m.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="msg-row">
                  <div className="avatar"><BotIcon size={16} color="#9edbff" /></div>
                  <div className="bubble"><div className="typing-dots"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>
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
                className="input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about your documents..."
                disabled={isLoading}
              />
              <button type="button" style={{ width: 36, height: 36, borderRadius: 8, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Mic size={14} color="#e6e6e6" />
              </button>
              <button type="submit" disabled={!inputText.trim() || isLoading} style={{ width: 36, height: 36, borderRadius: 8, background: inputText.trim() && !isLoading ? "#0f86bf" : "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Send size={14} color="#fff" />
              </button>
            </form>

            <div className="suggest-row" aria-hidden={false}>
              {suggestedQuestions.map((q, i) => (
                <div key={i} className="suggest-pill" onClick={() => handleSuggested(q)}>{q}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
