import React, { useState } from 'react'
import { ScriptResponse, ScriptSegment } from '../types/studio'
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  Tv,
  AlignLeft,
  Volume2,
  ChevronDown,
  Layers,
  ArrowRight,
  Clock,
  Mic,
  Film,
  Music,
} from 'lucide-react'

interface ScriptViewerProps {
  scriptData: ScriptResponse
  initialVoice?: string
  onProceedToTTS?: (voice: string) => void
  onEditInComposer?: () => void
}

const AVAILABLE_VOICES = [
  { name: 'Fola', gender: 'Wanita', desc: 'Natural, ekspresif, hangat' },
  { name: 'Kore', gender: 'Wanita', desc: 'Jelas, santai, modern' },
  { name: 'Aoede', gender: 'Wanita', desc: 'Formal, berwibawa, jernih' },
  { name: 'Fenrir', gender: 'Pria', desc: 'Berat, berkarakter, sinematik' },
  { name: 'Puck', gender: 'Pria', desc: 'Ceria, dinamis, energik' },
  { name: 'Charon', gender: 'Pria', desc: 'Tenang, mendalam, bercerita' },
]

export function ScriptViewer({
  scriptData,
  initialVoice = 'Fola',
  onProceedToTTS,
  onEditInComposer,
}: ScriptViewerProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'tagged' | 'clean'>('table')
  const [selectedVoice, setSelectedVoice] = useState(initialVoice)
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false)
  const [copiedType, setCopiedType] = useState<string | null>(null)

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
  }

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Highlight inline tags like <short pause>, <sigh>, <gasp>, <throat-clearing>, <exhales>, <pff>
  const renderHighlightedText = (text: string) => {
    const parts = text.split(/(<[^>]+>)/g)
    return (
      <span className="leading-relaxed whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (part.startsWith('<') && part.endsWith('>')) {
            const tag = part.toLowerCase()
            let badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
            if (tag.includes('gasp') || tag.includes('pff')) {
              badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            } else if (tag.includes('sigh') || tag.includes('exhale')) {
              badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40'
            } else if (tag.includes('throat')) {
              badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }
            return (
              <span
                key={i}
                className={`inline-block mx-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${badgeColor}`}
              >
                {part}
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </span>
    )
  }

  const titleLength = scriptData.title.length
  const isTitleValid = titleLength >= 44 && titleLength <= 54
  const vocalTagCount = (scriptData.tagged_text.match(/<[^>]+>/g) || []).length

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 bg-[rgba(18,18,22,0.85)] backdrop-blur-2xl border border-white/12 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-300">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#f97316]/15 text-[#fb923c] border border-[#f97316]/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
              <Sparkles className="w-3 h-3 text-[#f97316]" />
              <span>Naskah H-A-M-P Selesai Dibuat</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                isTitleValid
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {titleLength} Karakter {isTitleValid ? '• Valid (44-54)' : '• Non-standar'}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
            {scriptData.title}
          </h3>

          <p className="text-xs text-white/50 mt-1 flex items-center gap-3">
            <span>{scriptData.word_count} kata</span>
            <span>•</span>
            <span>Estimasi durasi: ~{scriptData.estimated_duration_sec}s</span>
            <span>•</span>
            <span className="text-[#5fb2f2]">{vocalTagCount} Auto Vocal Tags aktif</span>
          </p>
        </div>

        {/* Action button to proceed directly to TTS synthesis */}
        {onProceedToTTS && (
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-2">
              {/* Voice Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVoiceDropdownOpen(!voiceDropdownOpen)}
                  className="h-10 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center gap-2 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Suara: {selectedVoice}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                </button>

                {voiceDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#141418] border border-white/15 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="text-[10px] uppercase font-bold text-white/40 px-3 py-1.5">
                      Pilih Suara Gemini 3.8
                    </div>
                    {AVAILABLE_VOICES.map((v) => (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => {
                          setSelectedVoice(v.name)
                          setVoiceDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          selectedVoice === v.name
                            ? 'bg-[#5fb2f2]/20 text-[#5fb2f2] font-semibold'
                            : 'text-white/80 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-white">{v.name} ({v.gender})</div>
                          <div className="text-[10px] text-white/40">{v.desc}</div>
                        </div>
                        {selectedVoice === v.name && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate TTS Button */}
              <button
                type="button"
                onClick={() => onProceedToTTS(selectedVoice)}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#5fb2f2] to-[#38bdf8] hover:from-[#38bdf8] hover:to-[#0284c7] text-[#06233a] font-bold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(95,178,242,0.4)] transition-all transform active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
                <span>Sintesis ke Suara TTS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-[10px] text-white/40">
              *Anda belum mencentang 'Lanjut ke TTS'. Klik tombol di atas untuk generate audio sekarang.
            </span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'table'
                ? 'bg-[#f97316]/20 text-[#fed7aa] border border-[#f97316]/50 shadow-[0_0_15px_rgba(249,115,22,0.25)]'
                : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Format 2-Kolom Visual Receipts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tagged')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'tagged'
                ? 'bg-[#5fb2f2]/20 text-[#bae6fd] border border-[#5fb2f2]/50 shadow-[0_0_15px_rgba(95,178,242,0.25)]'
                : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Naskah Siap TTS (Inline Tags)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clean')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'clean'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Teks Bersih (Subtitle)</span>
          </button>
        </div>

        {/* Copy & Download Tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const textToCopy =
                activeTab === 'clean'
                  ? scriptData.clean_text
                  : activeTab === 'tagged'
                  ? scriptData.tagged_text
                  : scriptData.markdown_table || scriptData.tagged_text
              copyToClipboard(textToCopy, activeTab)
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              copiedType === activeTab
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
            }`}
          >
            {copiedType === activeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedType === activeTab ? 'Tersalin!' : 'Salin Tab Ini'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const content = `# ${scriptData.title}\n\n## Naskah Siap Rekam (H-A-M-P)\n${scriptData.tagged_text}\n\n## Teks Bersih\n${scriptData.clean_text}\n\n## Estimasi Durasi\n${scriptData.estimated_duration_sec}s (${scriptData.word_count} kata)`
              downloadFile(content, `${scriptData.slug || 'naskah'}.md`, 'text/markdown')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#5fb2f2]" />
            <span>Unduh .md</span>
          </button>
        </div>
      </div>

      {/* Tab 1: 2-Kolom Visual Receipts Table */}
      {activeTab === 'table' && (
        <div className="space-y-3">
          {scriptData.breakdown && scriptData.breakdown.length > 0 ? (
            scriptData.breakdown.map((seg, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-black/40 border border-white/8 hover:border-white/20 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-[#f97316]/15 text-[#fb923c] font-mono text-xs font-bold border border-[#f97316]/30">
                      {seg.segment}
                    </span>
                    <span className="text-xs text-white/40 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/30" />
                      {seg.time_range}
                    </span>
                  </div>

                  {seg.sfx && (
                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 font-mono text-[11px] border border-purple-500/30 flex items-center gap-1">
                      <Music className="w-3 h-3 text-purple-400" />
                      SFX: {seg.sfx}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-sm">
                  {/* Narasi Audio */}
                  <div className="md:col-span-8 text-white/90 leading-relaxed font-sans">
                    {renderHighlightedText(seg.narration)}
                  </div>

                  {/* Arahan Visual & Motion */}
                  <div className="md:col-span-4 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#5fb2f2] tracking-wider block mb-1">
                      Arahan Visual:
                    </span>
                    <span className="text-white/70 font-mono">{seg.visual_receipt}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-5 rounded-2xl bg-black/40 border border-white/8 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
              {scriptData.markdown_table || scriptData.tagged_text}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Naskah Siap TTS (Vocal Tags) */}
      {activeTab === 'tagged' && (
        <div className="rounded-2xl p-5 bg-black/40 border border-white/8 text-sm sm:text-base leading-loose text-white/90 font-sans">
          <div className="text-xs text-white/50 mb-3 pb-2 border-b border-white/5 flex items-center justify-between">
            <span>✨ Tag vokal disisipkan otomatis untuk Gemini 3.8 Flash TTS:</span>
            <span className="font-mono text-[#5fb2f2]">{vocalTagCount} tags terdeteksi</span>
          </div>
          {renderHighlightedText(scriptData.tagged_text)}
        </div>
      )}

      {/* Tab 3: Teks Bersih (Subtitle) */}
      {activeTab === 'clean' && (
        <div className="rounded-2xl p-5 bg-black/40 border border-white/8 text-sm sm:text-base leading-relaxed text-white/80 font-sans">
          <div className="text-xs text-white/50 mb-3 pb-2 border-b border-white/5">
            Teks narasi bersih tanpa tag vokal, siap digunakan untuk subtitle atau teleprompter:
          </div>
          <p className="whitespace-pre-wrap">{scriptData.clean_text}</p>
        </div>
      )}
    </div>
  )
}
