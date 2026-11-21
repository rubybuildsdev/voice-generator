import * as React from "react"
import { BookmarkCheck, Send, Sparkles, X } from "lucide-react"
import { saveSelectedTitle, sendTitleChatMessage } from "../services/api"
import type { ChatMessage, TitleRecommendation } from "../types/studio"

export function TitleChatDrawer({
  open,
  onClose,
  onUseTitle,
}: {
  open: boolean
  onClose: () => void
  onUseTitle: (title: string) => void
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Tulis topik video yang lagi lu incar — gua bantu racik opsi judul ber-CTR tinggi.",
    },
  ])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<TitleRecommendation[]>([])
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)

  if (!open) return null

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)
    setErrMsg(null)
    try {
      const res = await sendTitleChatMessage(nextMessages)
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }])
      if (res.suggested_titles.length) setSuggestions(res.suggested_titles)
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Gagal menghubungi server brainstorming.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndUse = async (rec: TitleRecommendation) => {
    try {
      await saveSelectedTitle(rec.title, rec.formula, rec.why_it_works)
      setSavedNotice(`Tersimpan: "${rec.title}"`)
      onUseTitle(rec.title)
      window.setTimeout(() => setSavedNotice(null), 2200)
    } catch {
      onUseTitle(rec.title)
    }
  }

  return (
    <div className="mvs-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Title Brainstorm">
      <aside className="mvs-drawer mpt-glass" onClick={(e) => e.stopPropagation()}>
        <div className="mvs-drawer-head">
          <div>
            <h3>Title Brainstorm</h3>
            <p>Diskusi formula hook & simpan ke content/titles/</p>
          </div>
          <button type="button" className="mvs-icon-btn" onClick={onClose} aria-label="Tutup chat">
            <X size={18} />
          </button>
        </div>

        <div className="mvs-chat-feed">
          {messages.map((m, idx) => (
            <div key={idx} className="mvs-bubble" data-role={m.role}>
              {m.content}
            </div>
          ))}
          {errMsg && <p className="mvs-error-inline">{errMsg}</p>}
          {savedNotice && (
            <p className="mvs-saved-inline">
              <BookmarkCheck size={14} /> {savedNotice}
            </p>
          )}
          {suggestions.length > 0 && (
            <div className="mvs-sugg-list">
              {suggestions.map((rec, i) => (
                <button
                  key={`${rec.title}-${i}`}
                  type="button"
                  className="mvs-sugg-card"
                  onClick={() => handleSaveAndUse(rec)}
                >
                  <div className="mvs-sugg-top">
                    <Sparkles size={12} />
                    <span>{rec.formula}</span>
                    <small>{rec.char_count} chars</small>
                  </div>
                  <strong>{rec.title}</strong>
                  <p>{rec.why_it_works}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <form className="mvs-chat-form" onSubmit={send}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Misal: sudut pandang lebih kontroversial soal AI..."
            disabled={loading}
          />
          <button type="submit" className="mpt-solid mvs-chat-send" disabled={loading || !input.trim()}>
            <Send size={14} />
          </button>
        </form>
      </aside>
    </div>
  )
}
