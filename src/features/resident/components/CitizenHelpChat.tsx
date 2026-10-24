import { useState } from "react"
import { askAiAssistant } from "@/lib/egov-ai-service"

interface Message {
  id: string
  sender: "user" | "ai"
  text: string
  timestamp: string
  isLiveApi?: boolean
  source?: string
}

type CitizenHelpChatProps = {
  embedded?: boolean
}

export function CitizenHelpChat({ embedded = false }: CitizenHelpChatProps) {
  const [isOpen, setIsOpen] = useState(embedded)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hello! I am your **eGovPH Citizen Assistant**. How can I help you with disaster response procedures, eGov services, or emergency hotlines today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [lastSource, setLastSource] = useState<string | null>(null)

  async function handleSend() {
    if (!input.trim() || isLoading) return
    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const res = await askAiAssistant(userMsg.text, "PH")
      if (res.session_id) setSessionId(res.session_id)
      setLastSource(res.source ?? null)

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: res.data,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isLiveApi: res.is_live_api,
        source: res.source,
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      setLastSource("unavailable")
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: "Sorry, I encountered an issue fetching response from eGov AI services. Please try again or contact your local barangay office.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isLiveApi: false,
        source: "unavailable",
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  function renderFormattedText(text: string, tone: "user" | "ai") {
    // Basic Markdown formatting helper for bold and line breaks
    const lines = text.split("\n")
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g)
      return (
        <p key={lIdx} className={`${lIdx > 0 ? "mt-1.5" : ""} ${tone === "ai" ? "text-white" : "text-inherit"}`}>
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={pIdx} className={tone === "ai" ? "font-bold text-white" : "font-bold text-inherit"}>{part.slice(2, -2)}</strong>
            }
            return part
          })}
        </p>
      )
    })
  }

  const chatPanel = (
    <div className={embedded ? "resident-chat-embedded" : "w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"}>
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">eGovPH AI Assistant</h3>
                    {lastSource !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        lastSource === "egov_live"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : lastSource === "gemini_fallback" || lastSource === "local_fallback"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {lastSource === "egov_live"
                          ? "Live eGov AI"
                          : lastSource === "gemini_fallback" || lastSource === "local_fallback"
                            ? "Fallback Guidance"
                            : "Unavailable"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Citizen Help & Procedures AI</p>
                </div>
              </div>
              {!embedded && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="pill-btn ghost text-xs py-1 px-3"
                >
                  Close
                </button>
              )}
            </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === "user" ? "self-end items-end" : "self-start items-start"
            }`}
          >
            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[var(--blue-primary)] text-white rounded-br-none shadow-xs"
                  : "bg-slate-900 text-white border border-slate-800 rounded-bl-none shadow-xs"
              }`}
            >
              {renderFormattedText(msg.text, msg.sender)}
            </div>
            <div className="flex items-center gap-1 mt-1 px-1">
              <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
              {msg.sender === "ai" && msg.source && (
                <span className="text-[9px] text-slate-400 font-mono">
                  ({msg.source === "egov_live"
                    ? "Live eGov AI"
                    : msg.source === "gemini_fallback" || msg.source === "local_fallback"
                      ? "Fallback Guidance"
                      : "Unavailable"})
                </span>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="self-start flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-2xl text-xs text-slate-500 shadow-xs">
            <div className="w-4 h-4 border-2 border-[var(--blue-primary)] border-t-transparent rounded-full animate-spin" />
            <span>Generating response with eGov AI...</span>
          </div>
        )}
      </div>

      {sessionId && (
        <div className="px-4 py-1.5 bg-slate-100 border-t border-slate-200 text-[10px] text-slate-500 font-mono text-center truncate">
          Session ID: {sessionId}
        </div>
      )}

      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              "What emergency aid can I request?",
              "What should I prepare before evacuation?",
              "Who can I call now?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-[var(--blue-primary)] transition-colors hover:bg-blue-100"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask eGov AI assistant a question..."
              className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)] bg-slate-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-[var(--blue-primary)] hover:bg-[var(--blue-hover)] disabled:opacity-50 text-white px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-xs"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (embedded) return chatPanel

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--blue-primary)] hover:bg-[var(--blue-hover)] active:bg-[var(--blue-deep)] text-white shadow-xl hover:shadow-2xl px-4 py-3 rounded-full font-semibold text-sm transition-all transform hover:scale-105"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>eGov AI Assistant</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
          {chatPanel}
        </div>
      )}
    </>
  )
}
