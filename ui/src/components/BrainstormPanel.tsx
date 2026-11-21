import * as React from "react"
import { ArrowLeft, BookmarkCheck, Plus, Send, Sparkles, Square } from "lucide-react"
import { saveSelectedTitle, sendTitleChatMessage } from "../services/api"
import type { ChatSession, TitleRecommendation } from "../types/studio"

export function BrainstormPanel({
  session,
  onUpdateSession,
  onNewSession,
  onBack,
  onUseTitle,
}: {
  session: ChatSession
  onUpdateSession: (updated: ChatSession) => void
  onNewSession: () => void
  onBack: () => void
  onUseTitle: (title: string) => void
}) {
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)
  const feedRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [session.messages, session.suggestions, loading])

  React.useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80)
    return () => {
      abortRef.current?.abort()
    }
  }, [session.id])

  const cancelRequest = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setErrMsg("Permintaan dibatalkan.")
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timer = window.setTimeout(() => controller.abort(), 20000)

    const nextMessages = [...session.messages, { role: "user" as const, content: text }]
    const firstUserMsg = nextMessages.find((m) => m.role === "user")?.content || text
    const nextTitle =
      session.title === "Sesi Brainstorm Baru"
        ? firstUserMsg.slice(0, 42) + (firstUserMsg.length > 42 ? "..." : "")
        : session.title

    const optimistic: ChatSession = {
      ...session,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
      messages: nextMessages,
    }
    onUpdateSession(optimistic)
    setInput("")
    setLoading(true)
    setErrMsg(null)

    try {
      const res = await sendTitleChatMessage(nextMessages, controller.signal)
      onUpdateSession({
        ...optimistic,
        updatedAt: new Date().toISOString(),
        messages: [...nextMessages, { role: "assistant", content: res.reply }],
        suggestions: res.suggested_titles.length ? res.suggested_titles : optimistic.suggestions,
      })
    } catch (err) {
      if (controller.signal.aborted) {
        setErrMsg("Server Gemini timeout (20 detik). Coba kirim ulang atau ganti GEMINI_TEXT_MODEL=gemini-3.5-flash-lite di .env.")
      } else {
        setErrMsg(err instanceof Error ? err.message : "Gagal menghubungi server brainstorming.")
      }
    } finally {
      window.clearTimeout(timer)
      setLoading(false)
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  const handleSaveAndUse = async (rec: TitleRecommendation) => {
    try {
      await saveSelectedTitle(rec.title, rec.formula, rec.why_it_works)
      setSavedNotice(`Tersimpan ke content/titles/: "${rec.title}"`)
      window.setTimeout(() => {
        setSavedNotice(null)
        onUseTitle(rec.title)
      }, 650)
    } catch {
      onUseTitle(rec.title)
    }
  }

  return (
    <div className="mvs-brainstorm-inline mpt-enter">
      <div className="mvs-bs-head">
        <div className="mvs-bs-title-wrap">
          <Sparkles size={15} className="mvs-bs-spark" />
          <div>
            <strong>{session.title}</strong>
            <small>Diskusi formula judul & langsung lempar ke Script</small>
          </div>
        </div>

        <div className="mvs-bs-actions">
          <button type="button" className="mpt-ghost mvs-sm-btn" onClick={onNewSession} title="Mulai sesi chat baru">
            <Plus size={13} /> Chat Baru
          </button>
          <button type="button" className="mpt-ghost mvs-sm-btn" onClick={onBack}>
            <ArrowLeft size={13} /> Kembali
          </button>
        </div>
      </div>

      <div ref={feedRef} className="mvs-bs-feed">
        {session.messages.map((m, idx) => (
          <div key={idx} className="mvs-bubble" data-role={m.role}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mvs-bubble mvs-bubble-loading" data-role="assistant">
            Sedang meracik ide...
          </div>
        )}
        {errMsg && <p className="mvs-error-inline">{errMsg}</p>}
        {savedNotice && (
          <p className="mvs-saved-inline">
            <BookmarkCheck size={14} /> {savedNotice}
          </p>
        )}

        {session.suggestions.length > 0 && (
          <div className="mvs-sugg-list">
            {session.suggestions.map((rec, i) => (
              <button
                key={`${rec.title}-${i}`}
                type="button"
                className="mvs-sugg-card"
                onClick={() => void handleSaveAndUse(rec)}
              >
                <div className="mvs-sugg-top">
                  <span>{rec.formula}</span>
                  <small>{rec.char_count} chars · Klik untuk pakai ke Script</small>
                </div>
                <strong>{rec.title}</strong>
                <p>{rec.why_it_works}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mvs-chat-form">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void sendMessage()
            }
          }}
          placeholder="Tulis topik atau arah sudut pandang judul..."
        />
        {loading ? (
          <button
            type="button"
            className="mpt-ghost mvs-chat-send"
            onClick={cancelRequest}
            aria-label="Batalkan permintaan"
            title="Batalkan permintaan"
          >
            <Square size={13} />
          </button>
        ) : (
          <button
            type="button"
            className="mpt-solid mvs-chat-send"
            disabled={!input.trim()}
            onClick={() => void sendMessage()}
            aria-label="Kirim pesan brainstorm"
          >
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
