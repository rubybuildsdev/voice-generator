import React, { useState, useEffect, useRef } from 'react'
import { IntentType, VoiceOption } from '../types/studio'
import { VOICE_OPTIONS } from '../constants/voices'
import { TitleChat } from './TitleChat'
import {
  MessageSquare,
  FileText,
  Mic,
  Zap,
  ChevronDown,
  Check,
  Search as SearchIcon,
  AlertCircle,
  Sparkles,
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
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'orange' | 'green' | 'red'
  activeClasses: string
  hoverClasses: string
  dotClass: string
}

const CHIPS: ChipItem[] = [
  {
    id: 'title',
    label: 'Chat Diskusi Judul',
    subtitle: 'Brainstorming santai',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: 'blue',
    activeClasses: 'bg-[#5fb2f2]/20 text-[#e0f2fe] border-[#5fb2f2]/60 shadow-[0_0_15px_rgba(95,178,242,0.35)]',
    hoverClasses: 'hover:border-[#5fb2f2]/40 hover:text-[#bae6fd]',
    dotClass: 'bg-[#5fb2f2]',
  },
  {
    id: 'script',
    label: 'Buat Naskah',
    subtitle: 'Sudah punya judul',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'orange',
    activeClasses: 'bg-[#f97316]/20 text-[#ffedd5] border-[#f97316]/60 shadow-[0_0_15px_rgba(249,115,22,0.35)]',
    hoverClasses: 'hover:border-[#f97316]/40 hover:text-[#fed7aa]',
    dotClass: 'bg-[#f97316]',
  },
  {
    id: 'voice_only',
    label: 'Voice & Subtitle',
    subtitle: 'Sudah punya naskah',
    icon: <Mic className="w-3.5 h-3.5" />,
    color: 'green',
    activeClasses: 'bg-[#10b981]/20 text-[#d1fae5] border-[#10b981]/60 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
    hoverClasses: 'hover:border-[#10b981]/40 hover:text-[#a7f3d0]',
    dotClass: 'bg-[#10b981]',
  },
  {
    id: 'auto',
    label: 'Auto Pipeline',
    subtitle: 'Full otomatis instan',
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
  const [focused, setFocused] = useState(false)
  const [nudge, setNudge] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const activeVoice = VOICE_OPTIONS.find((v) => v.id === voice) || VOICE_OPTIONS[0]

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
    const trimmed = prompt.trim()
    if (!trimmed) {
      setNudge(true)
      window.setTimeout(() => setNudge(false), 800)
      if (textareaRef.current) textareaRef.current.focus()
      return
    }

    if (trimmed.length < 4) {
      setValidationError("Teks terlalu pendek. Masukkan judul atau teks naskah yang valid.")
      setNudge(true)
      window.setTimeout(() => setNudge(false), 800)
      return
    }

    setValidationError(null)
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

  // Mode descriptions & placeholders
  const getModeConfig = () => {
    switch (intent) {
      case 'script':
        return {
          title: 'Buat Naskah H-A-M-P (Dari Judul yang Sudah Ada)',
          subtitle: 'Masukkan judul video yang sudah kamu miliki untuk langsung dibuatkan naskah 4 babak.',
          placeholder: 'Contoh: Cara Penipu Mengakali Registrasi SIM Pakai AI, atau Bahaya Cas HP 120W Semalaman...',
          buttonLabel: 'Buat Naskah H-A-M-P ➔',
        }
      case 'voice_only':
        return {
          title: 'Sintesis Voice-Over & Karaoke Subtitle (Dari Naskah Jadi)',
          subtitle: 'Tempel naskah narasi siap rekam untuk digenerate menjadi audio 24 kHz WAV dan subtitle kata per kata.',
          placeholder: 'Tempel naskah lengkap di sini (kamu bisa menyisipkan tag vokal seperti <sigh>, <breath>, <short pause>)...',
          buttonLabel: 'Generate Voice-Over ➔',
        }
      case 'auto':
      default:
        return {
          title: 'Auto Pipeline (Eksekusi 4-Tahap Instan)',
          subtitle: 'Mulai dari topik kasar atau rangkuman artikel, sistem langsung memproses judul, naskah, suara, dan subtitle.',
          placeholder: 'Ketik topik atau tempel ringkasan artikel teknologi (contoh: Mengapa baterai silikon karbon makin populer di HP tipis)...',
          buttonLabel: 'Jalankan Full Pipeline ➔',
        }
    }
  }

  const modeConfig = getModeConfig()

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-4">
      {/* Top Mode Navigation Tabs */}
      <div className="w-full flex flex-wrap items-center justify-center sm:justify-start gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
        {CHIPS.map((chip) => {
          const isActive = intent === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setValidationError(null)
                onIntentChange(chip.id)
              }}
              className={`inline-flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide border transition-all duration-200 ${
                isActive
                  ? `${chip.activeClasses}`
                  : `bg-transparent text-white/70 border-transparent ${chip.hoverClasses} hover:bg-white/[0.05]`
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${chip.dotClass} ${isActive ? 'animate-pulse' : 'opacity-60'}`} />
              <span className="opacity-90">{chip.icon}</span>
              <div className="flex flex-col text-left">
                <span className="leading-tight">{chip.label}</span>
                <span className="text-[10px] opacity-60 font-normal hidden sm:inline">{chip.subtitle}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* VIEW 1: IF INTENT IS "TITLE" -> RENDER INTERACTIVE BRAINSTORMING CHATBOT */}
      {intent === 'title' ? (
        <TitleChat
          onSelectTitle={(selectedTitle) => {
            onPromptChange(selectedTitle)
            onIntentChange('script')
          }}
          onSkipToScript={() => onIntentChange('script')}
        />
      ) : (
        /* VIEW 2: IF INTENT IS SCRIPT, VOICE, OR AUTO -> RENDER COMPOSER CARD */
        <div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          className={`relative w-full rounded-3xl p-5 sm:p-7 backdrop-blur-2xl transition-all duration-300 border ${
            focused
              ? 'border-white/30 shadow-[0_0_50px_rgba(95,178,242,0.22)] bg-[#101014]/90'
              : 'border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-[#0d0d11]/80'
          } ${nudge ? 'animate-bounce' : ''}`}
          style={{
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 64px -12px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header Info for Active Mode */}
          <div className="mb-4">
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5fb2f2]" />
              <span>{modeConfig.title}</span>
            </h4>
            <p className="text-xs text-white/50 mt-0.5">{modeConfig.subtitle}</p>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="mb-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-2.5 shadow-lg animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span className="leading-snug">{validationError}</span>
            </div>
          )}

          {/* Text Input Area */}
          <div className="relative min-h-[100px] sm:min-h-[120px] p-3 rounded-2xl bg-black/30 border border-white/8 focus-within:border-[#5fb2f2]/50 transition-colors">
            <textarea
              ref={textareaRef}
              rows={4}
              value={prompt}
              disabled={disabled}
              onChange={(e) => {
                setValidationError(null)
                onPromptChange(e.target.value)
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder={modeConfig.placeholder}
              className="w-full h-full bg-transparent resize-none border-0 outline-none text-[#f5f5f6] text-sm sm:text-base leading-relaxed tracking-wide placeholder-white/35 focus:ring-0 custom-scrollbar"
            />
          </div>

          {/* Bottom Bar Controls & Submit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 mt-3 border-t border-white/10">
            {/* Left Options (Auto-Tag & Auto-Proceed) */}
            <div className="flex items-center gap-3">
              {/* Auto-Tag Vokal Toggle */}
              <label
                className="inline-flex items-center gap-2 cursor-pointer select-none px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
                title="Aktifkan untuk menyisipkan inline vocal tags (<breath>, <short pause>, dll.) otomatis"
              >
                <input
                  type="checkbox"
                  checked={autoTag}
                  onChange={(e) => onAutoTagChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-7 h-3.5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-[#5fb2f2]" />
                <span className="text-xs font-medium text-white/80">
                  Auto-Tag Vokal
                </span>
              </label>

              {/* Auto-Proceed to Voice Toggle (Only on Script mode) */}
              {intent === 'script' && (
                <label
                  className="inline-flex items-center gap-2 cursor-pointer select-none px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
                  title="Setelah naskah selesai, langsung lanjutkan ke pembuatan suara & subtitle otomatis"
                >
                  <input
                    type="checkbox"
                    checked={autoProceed}
                    onChange={(e) => onAutoProceedChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-7 h-3.5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-[#f97316]" />
                  <span className="text-xs font-medium text-white/80">
                    Lanjut ke TTS
                  </span>
                </label>
              )}
            </div>

            {/* Right Controls: Voice Selector & Submit Button */}
            <div className="flex items-center justify-end gap-2.5">
              {/* Voice Selector Dropdown (Muncul di Voice_only dan Auto mode) */}
              {(intent === 'voice_only' || intent === 'auto' || autoProceed) && (
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setVoiceDropdownOpen(!voiceDropdownOpen)}
                    className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-white border border-white/12 transition-all text-xs font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="font-bold">{activeVoice.name}</span>
                    <span className="text-white/50 text-[11px]">({activeVoice.gender})</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/50 ml-0.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {voiceDropdownOpen && (
                    <div className="absolute right-0 bottom-full mb-2 w-72 sm:w-80 rounded-2xl bg-[#14141a] border border-white/15 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="relative mb-2">
                        <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-white/40" />
                        <input
                          type="text"
                          value={voiceSearch}
                          onChange={(e) => setVoiceSearch(e.target.value)}
                          placeholder="Cari suara..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 outline-none"
                        />
                      </div>

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

                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {filteredVoices.map((v) => (
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
                              </div>
                              <p className="text-[11px] text-white/60 mt-0.5 line-clamp-1">{v.description}</p>
                            </div>
                            {voice === v.id && <Check className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                disabled={disabled}
                onClick={handleSubmit}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl font-bold text-xs sm:text-sm text-[#06233a] bg-gradient-to-r from-[#e8f6ff] via-[#a9dcff] to-[#5fb2f2] shadow-[0_4px_18px_rgba(95,178,242,0.4)] hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{modeConfig.buttonLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
