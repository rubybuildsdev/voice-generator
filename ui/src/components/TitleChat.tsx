import React, { useState, useRef, useEffect } from 'react'
import { ChatMessage, TitleRecommendation } from '../types/studio'
import { sendTitleChatMessage, saveSelectedTitle } from '../services/api'
import {
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Loader2,
  CheckCircle,
  Lightbulb,
  Zap,
} from 'lucide-react'

interface TitleChatProps {
  onSelectTitle: (title: string, formula?: string) => void
  onSkipToScript: () => void
}

export function TitleChat({ onSelectTitle, onSkipToScript }: TitleChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Halo! 👋 Mau brainstorming ide konten video apa hari ini? Kamu bisa curhat ide kasar, lempar berita viral, atau niche teknologi yang mau kamu bahas. Nanti kita racik angle hook yang paling nendang bareng-bareng!',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedTitles, setSuggestedTitles] = useState<TitleRecommendation[]>([])
  const [savingTitle, setSavingTitle] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await sendTitleChatMessage(newMessages)
      setMessages([...newMessages, { role: 'assistant', content: res.reply }])
      if (res.suggested_titles && res.suggested_titles.length > 0) {
        setSuggestedTitles(res.suggested_titles)
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `Maaf, ada kendala koneksi ke AI: ${err.message || 'Terjadi kesalahan'}. Coba kirim lagi ya!`,
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handlePickTitle = async (rec: TitleRecommendation) => {
    setSavingTitle(rec.title)
    try {
      await saveSelectedTitle(rec.title, rec.formula, rec.why_it_works)
    } catch (e) {
      console.warn('Title saved locally only:', e)
    }
    setSavingTitle(null)
    onSelectTitle(rec.title, rec.formula)
  }

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-[rgba(18,18,24,0.85)] backdrop-blur-2xl border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5fb2f2]/20 border border-[#5fb2f2]/40 flex items-center justify-center text-[#5fb2f2] shadow-[0_0_15px_rgba(95,178,242,0.3)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">Chat Diskusi & Brainstorming Judul</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5fb2f2]/20 text-[#5fb2f2] border border-[#5fb2f2]/30 font-semibold">
                Creative Partner
              </span>
            </div>
            <p className="text-[11px] text-white/50">Ngobrol santai untuk matangkan ide hook tanpa langsung membuat file</p>
          </div>
        </div>

        {/* Skip button if already have title */}
        <button
          type="button"
          onClick={onSkipToScript}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors text-xs font-medium shrink-0"
        >
          <span>Sudah punya judul?</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#5fb2f2]" />
        </button>
      </div>

      {/* Message History Area */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[380px] sm:max-h-[440px] overflow-y-auto custom-scrollbar">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-[#5fb2f2]/20 text-[#5fb2f2] flex items-center justify-center shrink-0 mt-0.5 border border-[#5fb2f2]/30">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-[#0d3b66] to-[#004e89] text-white border border-[#5fb2f2]/30 shadow-[0_4px_16px_rgba(13,59,102,0.4)]'
                  : 'bg-white/[0.05] text-white/90 border border-white/10'
              }`}
            >
              {m.content}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-white/10 text-white/80 flex items-center justify-center shrink-0 mt-0.5 border border-white/15">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {/* Assistant Loading Skeleton */}
        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#5fb2f2]/20 text-[#5fb2f2] flex items-center justify-center shrink-0 border border-[#5fb2f2]/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="rounded-2xl p-3.5 px-4 bg-white/[0.05] border border-white/10 text-xs text-white/60 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5fb2f2] animate-ping" />
              <span>Partner kreatif sedang mengetik...</span>
            </div>
          </div>
        )}

        {/* Suggested Title Cards (If generated from chat) */}
        {suggestedTitles.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-[#5fb2f2]/10 border border-[#5fb2f2]/30 space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#5fb2f2]">
              <Lightbulb className="w-4 h-4" />
              <span>Rekomendasi Judul Tajam (44-54 Karakter) dari Obrolan:</span>
            </div>

            <div className="grid gap-2.5">
              {suggestedTitles.map((rec, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#5fb2f2]/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-xs sm:text-sm text-white">{rec.title}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/10 text-[#5fb2f2] font-mono">
                        {rec.char_count} char
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#5fb2f2]/20 text-[#bae6fd]">
                        {rec.formula}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60">{rec.why_it_works}</p>
                  </div>

                  <button
                    type="button"
                    disabled={savingTitle === rec.title}
                    onClick={() => handlePickTitle(rec)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs text-[#06233a] bg-gradient-to-r from-[#e8f6ff] to-[#5fb2f2] hover:brightness-110 shadow-sm shrink-0 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{savingTitle === rec.title ? 'Menyimpan...' : 'Gunakan Judul Ini ➔'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3.5 sm:p-4 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ketik salam, ide topik, atau minta saran judul ke partner kreatif..."
            className="flex-1 bg-white/[0.05] border border-white/10 focus:border-[#5fb2f2]/60 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 outline-none transition-colors"
          />

          <button
            type="button"
            disabled={!input.trim() || loading}
            onClick={handleSend}
            className="h-10 px-4 rounded-xl font-bold text-xs sm:text-sm text-[#06233a] bg-gradient-to-r from-[#e8f6ff] to-[#5fb2f2] hover:brightness-110 shadow-sm flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
