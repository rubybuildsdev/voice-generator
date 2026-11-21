import React, { useEffect, useRef } from 'react'
import { SSELogEvent } from '../types/studio'
import { CheckCircle2, Circle, Loader2, Terminal, StopCircle } from 'lucide-react'

interface LiveBuildLogProps {
  events: SSELogEvent[]
  activeStep: number
  progress: number
  onAbort?: () => void
  isFinished?: boolean
}

const STEPS = [
  { id: 1, name: 'Analisis Intent & Riset Topik', desc: 'Validasi input, formula retensi & intent' },
  { id: 2, name: 'Riset Judul 44-54 Karakter', desc: 'Pengecekan formula angka, contrast & curiosity gap' },
  { id: 3, name: 'Penyusunan Naskah H-A-M-P', desc: 'Visual receipts [PHONE CUTAWAY] + auto vocal tags' },
  { id: 4, name: 'Sintesis Gemini 3.8 Flash TTS', desc: 'Audio 24 kHz Mono resmi via Gemini v1beta API' },
  { id: 5, name: 'Sinkronisasi Subtitle Gemini 3.5', desc: 'Ekstraksi timestamp milidetik kata per kata' },
]

export function LiveBuildLog({
  events,
  activeStep,
  progress,
  onAbort,
  isFinished = false,
}: LiveBuildLogProps) {
  const terminalEndRef = useRef<HTMLDivElement | null>(null)

  // Autoscroll terminal to latest log line
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 bg-[rgba(22,22,26,0.85)] backdrop-blur-2xl border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-300">
      {/* Header & Progress */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#5fb2f2] font-semibold flex items-center gap-2">
            {!isFinished && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isFinished ? 'Produksi Selesai' : 'Sedang Memproses Studio Pipeline...'}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">Faceless Studio Engine</h3>
        </div>
        <div className="text-right">
          <span className="text-2xl sm:text-3xl font-mono font-bold text-[#5fb2f2] tabular-nums">
            {Math.min(100, Math.round(progress))}%
          </span>
          <p className="text-[11px] text-white/50">Gemini 3.8 Flash</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-[#5fb2f2] via-[#a9dcff] to-white transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 5-Step Pipeline Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        {STEPS.map((s) => {
          const isDone = activeStep > s.id || isFinished
          const isActive = activeStep === s.id && !isFinished
          return (
            <div
              key={s.id}
              className={`p-3 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-[#5fb2f2]/10 border-[#5fb2f2]/40 shadow-[0_0_15px_rgba(95,178,242,0.15)]'
                  : isDone
                  ? 'bg-white/5 border-white/10 text-white/90'
                  : 'bg-white/[0.02] border-white/5 text-white/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#5fb2f2] shrink-0" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-[#5fb2f2] animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-white/30 shrink-0" />
                )}
                <span className="text-xs font-semibold leading-tight">{s.name}</span>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{s.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Live Terminal Log Stream */}
      <div className="rounded-2xl bg-[#0b0b0e] border border-white/10 p-4 font-mono text-xs overflow-hidden">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 text-white/50">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#5fb2f2]" />
            <span className="text-[11px] font-semibold text-white/70">Live Server-Sent Events (SSE) Stream</span>
          </div>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/60">
            {events.length} logs
          </span>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 select-text">
          {events.length === 0 ? (
            <p className="text-white/40 italic">Menunggu respon pertama dari server...</p>
          ) : (
            events.map((evt, i) => (
              <div key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="text-white/30 text-[10px] shrink-0 tabular-nums">
                  [{evt.timestamp || '00:00:00'}]
                </span>
                <span className="text-[#5fb2f2] font-semibold text-[11px] shrink-0 uppercase">
                  [{evt.stage || 'info'}]
                </span>
                <span className="text-white/80 break-words">{evt.message}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Abort Button */}
      {onAbort && !isFinished && (
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onAbort}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Batalkan Proses</span>
          </button>
        </div>
      )}
    </div>
  )
}
