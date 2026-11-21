import React, { useState, useEffect, useRef } from 'react'
import { IntentType, VoiceOption } from '../types/studio'
import { VOICE_OPTIONS, DEFAULT_PROMPTS_BY_INTENT } from '../constants/voices'
import {
  MessageSquare,
  FileText,
  Mic,
  Zap,
  ChevronDown,
  Check,
  Search as SearchIcon,
  Filter,
} from 'lucide-react'

interface SmartComposerProps {
  intent: IntentType
  onIntentChange: (intent: IntentType) => void
  prompt: string
  onPromptChange: (text: string) => void
  voice: string
  onVoiceChange: (voice: string) => void
  autoTag: boolean
  onAutoTagChange: (autoTag: boolean) => void
  autoProceed: boolean
  onAutoProceedChange: (auto: boolean) => void
  onSubmit: () => void
  disabled?: boolean
}

interface ChipItem {
  id: IntentType
  label: string
  icon: React.ReactNode
  color: 'blue' | 'orange' | 'green' | 'red'
  activeClasses: string
  hoverClasses: string
  dotClass: string
}

const CHIPS: ChipItem[] = [
  {
    id: 'title',
    label: 'Diskusi Judul',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: 'blue',
    activeClasses: 'bg-[#5fb2f2]/20 text-[#e0f2fe] border-[#5fb2f2]/60 shadow-[0_0_15px_rgba(95,178,242,0.35)]',
    hoverClasses: 'hover:border-[#5fb2f2]/40 hover:text-[#bae6fd]',
    dotClass: 'bg-[#5fb2f2]',
  },
  {
    id: 'script',
    label: 'Buat Naskah',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'orange',
    activeClasses: 'bg-[#f97316]/20 text-[#ffedd5] border-[#f97316]/60 shadow-[0_0_15px_rgba(249,115,22,0.35)]',
    hoverClasses: 'hover:border-[#f97316]/40 hover:text-[#fed7aa]',
    dotClass: 'bg-[#f97316]',
  },
  {
    id: 'voice_only',
    label: 'Voice & Transkrip',
    icon: <Mic className="w-3.5 h-3.5" />,
    color: 'green',
    activeClasses: 'bg-[#10b981]/20 text-[#d1fae5] border-[#10b981]/60 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
    hoverClasses: 'hover:border-[#10b981]/40 hover:text-[#a7f3d0]',
    dotClass: 'bg-[#10b981]',
  },
  {
    id: 'auto',
    label: 'Auto Proceed',
    icon: <Zap className="w-3.5 h-3.5" />,
    color: 'red',
    activeClasses: 'bg-[#ef4444]/20 text-[#fee2e2] border-[#ef4444]/60 shadow-[0_0_15px_rgba(239,68,68,0.35)]',
    hoverClasses: 'hover:border-[#ef4444]/40 hover:text-[#fecaca]',
    dotClass: 'bg-[#ef4444]',
  },
]

export function SmartComposer({
  intent,
  onIntentChange,
  prompt,
  onPromptChange,
  voice,
  onVoiceChange,
  autoTag,
  onAutoTagChange,
  autoProceed,
  onAutoProceedChange,
  onSubmit,
  disabled = false,
}: SmartComposerProps) {
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false)
  const [voiceSearch, setVoiceSearch] = useState('')
  const [voiceCategory, setVoiceCategory] = useState<'Semua' | 'Populer' | 'Pria' | 'Wanita'>('Semua')
  const [typedPlaceholder, setTypedPlaceholder] = useState('')
  const [focused, setFocused] = useState(false)
  const [nudge, setNudge] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const activeVoice = VOICE_OPTIONS.find((v) => v.id === voice) || VOICE_OPTIONS[0]
  const promptsList = DEFAULT_PROMPTS_BY_INTENT[intent === 'full' ? 'auto' : intent] || DEFAULT_PROMPTS_BY_INTENT.auto

  // Typing animated placeholder
  useEffect(() => {
    let promptIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeoutId: number

    const tick = () => {
      const fullText = promptsList[promptIndex % promptsList.length]
      if (!isDeleting) {
        charIndex++
        setTypedPlaceholder(fullText.slice(0, charIndex))
        if (charIndex >= fullText.length) {
          isDeleting = true
          timeoutId = window.setTimeout(tick, 2400)
          return
        }
        timeoutId = window.setTimeout(tick, 30 + Math.random() * 30)
      } else {
        charIndex = Math.max(0, charIndex - 3)
        setTypedPlaceholder(fullText.slice(0, charIndex))
        if (charIndex === 0) {
          isDeleting = false
          promptIndex++
          timeoutId = window.setTimeout(tick, 400)
          return
        }
        timeoutId = window.setTimeout(tick, 16)
      }
    }

    timeoutId = window.setTimeout(tick, 600)
    return () => window.clearTimeout(timeoutId)
  }, [intent, promptsList])

  // Close voice dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setVoiceDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Interactive light sheen on pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  const handleSubmit = () => {
    if (!prompt.trim()) {
      setNudge(true)
      window.setTimeout(() => setNudge(false), 800)
      if (textareaRef.current) textareaRef.current.focus()
      return
    }
    onSubmit()
  }

  // Filter voices based on search query and category
  const filteredVoices = VOICE_OPTIONS.filter((v) => {
    const matchCategory =
      voiceCategory === 'Semua' ? true : voiceCategory === 'Populer' ? v.category === 'Populer' : v.gender === voiceCategory
    const q = voiceSearch.toLowerCase().trim()
    const matchSearch = !q || v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || v.badge.toLowerCase().includes(q)
    return matchCategory && matchSearch
  })

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-3">
      {/* Liquid Glass Composer Card */}
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        className={`relative w-full rounded-3xl p-4 sm:p-6 backdrop-blur-2xl transition-all duration-300 border ${
          focused
            ? 'border-white/30 shadow-[0_0_50px_rgba(95,178,242,0.22)] bg-[#101014]/90'
            : 'border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-[#0d0d11]/80'
        } ${nudge ? 'animate-bounce' : ''}`}
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 64px -12px rgba(0,0,0,0.7)',
        }}
      >
        {/* Pointer sheen light effect */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.06), transparent 55%)',
          }}
        />

        {/* Text Input Area */}
        <div className="relative min-h-[90px] sm:min-h-[110px]">
          <textarea
            ref={textareaRef}
            rows={3}
            value={prompt}
            disabled={disabled}
            onChange={(e) => onPromptChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder=""
            className="w-full h-full bg-transparent resize-none border-0 outline-none text-[#f5f5f6] text-sm sm:text-base leading-relaxed tracking-wide placeholder-transparent focus:ring-0"
          />

          {/* Typing animated placeholder */}
          {!prompt && (
            <div className="absolute inset-0 pointer-events-none text-[#77777f] text-sm sm:text-base leading-relaxed select-none overflow-hidden pr-2">
              <span>{focused ? 'Ketik topik, judul, naskah, atau instruksi faceless kamu...' : typedPlaceholder}</span>
              {!focused && <span className="inline-block w-0.5 h-4 ml-1 bg-[#5fb2f2] animate-pulse align-middle" />}
            </div>
          )}
        </div>

        {/* Bottom Bar: Mode Chips on Left, Voice & Actions on Right */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 mt-2 border-t border-white/10">
          {/* Left: The 4 Chips (Diskusi Judul, Buat Naskah, Voice & Transkrip, Auto Proceed) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {CHIPS.map((chip) => {
              const isActive = intent === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onIntentChange(chip.id)}
                  className={`inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 ${
                    isActive
                      ? `${chip.activeClasses}`
                      : `bg-white/[0.04] text-white/70 border-white/10 ${chip.hoverClasses} hover:bg-white/[0.08]`
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${chip.dotClass} ${isActive ? 'animate-pulse' : 'opacity-60'}`} />
                  <span className="opacity-90">{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              )
            })}
          </div>

          {/* Right: Controls, Voice Selector (Only for Voice & Transkrip), and Submit */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
            {/* Auto-Tag Vokal Toggle */}
            <label
              className="inline-flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 transition-colors"
              title="Aktifkan untuk menyisipkan inline vocal tags (<breath>, <short pause>, dll.) otomatis"
            >
              <input
                type="checkbox"
                checked={autoTag}
                onChange={(e) => onAutoTagChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-7 h-3.5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-[#5fb2f2]" />
              <span className="text-[11px] font-medium text-white/70 hover:text-white transition-colors">
                Auto-Tag Vokal
              </span>
            </label>

            {/* Tombol Profil Suara HANYA muncul di saat "Voice & Transkrip" */}
            {intent === 'voice_only' && (
              <div ref={dropdownRef} className="relative animate-in fade-in zoom-in-95 duration-200">
                <button
                  type="button"
                  onClick={() => setVoiceDropdownOpen(!voiceDropdownOpen)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/40 text-xs sm:text-sm font-semibold text-[#d1fae5] transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                >
                  <Mic className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Suara:</span>
                  <span className="text-white font-bold">{activeVoice.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-[#a7f3d0] border border-[#10b981]/30">
                    {activeVoice.badge}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#10b981] ml-0.5" />
                </button>

                {/* Popover Dropdown with 30 Voices, Search & Category Filters */}
                {voiceDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-80 sm:w-96 p-3 rounded-2xl bg-[#121217]/98 backdrop-blur-2xl border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.85)] z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-[#10b981]" />
                          Katalog 30+ Suara Gemini TTS
                        </p>
                        <p className="text-[10px] text-white/50">24 kHz Mono Studio Quality</p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400/80 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        {filteredVoices.length} Varian
                      </span>
                    </div>

                    {/* Search Input */}
                    <div className="relative mb-2">
                      <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        value={voiceSearch}
                        onChange={(e) => setVoiceSearch(e.target.value)}
                        placeholder="Cari suara, karakter, atau gaya..."
                        className="w-full h-8 pl-8 pr-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#10b981]/50 focus:ring-1 focus:ring-[#10b981]/50"
                      />
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="flex items-center gap-1 mb-2 p-1 rounded-xl bg-white/[0.03] border border-white/8 text-[11px]">
                      {(['Semua', 'Populer', 'Pria', 'Wanita'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setVoiceCategory(cat)}
                          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
                            voiceCategory === cat
                              ? 'bg-[#10b981] text-[#06233a] font-bold shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Scrollable Voice List */}
                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredVoices.length === 0 ? (
                        <p className="text-center py-6 text-xs text-white/40">Tidak ada suara yang cocok</p>
                      ) : (
                        filteredVoices.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              onVoiceChange(v.id)
                              setVoiceDropdownOpen(false)
                            }}
                            className={`w-full text-left p-2 rounded-xl transition-all flex items-start justify-between gap-2 ${
                              voice === v.id
                                ? 'bg-[#10b981]/15 border border-[#10b981]/40 text-white'
                                : 'hover:bg-white/5 text-white/80 border border-transparent'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-white">{v.name}</span>
                                <span className="text-[10px] text-white/50">({v.gender})</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-[#a7f3d0] border border-white/10">
                                  {v.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/60 mt-0.5 line-clamp-1">{v.description}</p>
                            </div>
                            {voice === v.id && <Check className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Send Button */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleSubmit()}
              className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-xl font-bold text-xs sm:text-sm text-[#06233a] bg-gradient-to-r from-[#e8f6ff] via-[#a9dcff] to-[#5fb2f2] shadow-[0_4px_18px_rgba(95,178,242,0.4)] hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Proses Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-hint */}
      <p className="text-xs text-[#a3a3ab] flex items-center gap-1.5 opacity-80">
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/90 border border-white/15 font-mono text-[11px]">Enter</kbd>
        <span>untuk proses</span>
        <span>/</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/90 border border-white/15 font-mono text-[11px]">Shift + Enter</kbd>
        <span>baris baru</span>
      </p>
    </div>
  )
}
