import React from 'react'
import {
  TitleResponse,
  ScriptResponse,
  TTSResponse,
  TranscribeResponse,
} from '../types/studio'
import {
  Clock,
  Film,
  Type,
  FileCheck2,
  Mic2,
  Gauge,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

interface MetricsBarProps {
  titleData?: TitleResponse
  scriptData?: ScriptResponse
  ttsData?: TTSResponse
  transcribeData?: TranscribeResponse
}

export function MetricsBar({
  titleData,
  scriptData,
  ttsData,
  transcribeData,
}: MetricsBarProps) {
  const chosenTitle = titleData?.recommendations[0]?.title || scriptData?.title || ''
  const charCount = chosenTitle.length
  const isCharValid = charCount >= 44 && charCount <= 54

  const hasRealAudio = Boolean(ttsData && ttsData.duration_sec)
  const durationSec = ttsData?.duration_sec || scriptData?.estimated_duration_sec || 0
  const durationFrames = ttsData?.duration_frames || Math.ceil(durationSec * 30)
  const wordCount = transcribeData?.word_count || scriptData?.word_count || 0
  const wpm = durationSec > 0 ? Math.round((wordCount / (durationSec / 60))) : 0

  // Count tags in tagged_text
  const vocalTagMatches = (scriptData?.tagged_text || '').match(/<[^>]+>/g) || []
  const vocalTagCount = vocalTagMatches.length

  const visualReceiptsCount = scriptData?.breakdown?.length || 4

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Title Retention Check */}
      <div className="p-4 rounded-2xl bg-[rgba(22,22,26,0.72)] backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-white/50 text-xs mb-1">
          <span className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-[#5fb2f2]" />
            Judul Retensi
          </span>
          {isCharValid ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-semibold text-[10px]">
              <AlertTriangle className="w-3 h-3" /> Non-standar
            </span>
          )}
        </div>
        <div>
          <div className="text-xl font-mono font-bold text-white tabular-nums">
            {charCount} <span className="text-xs text-white/40 font-normal">/ 54 Karakter</span>
          </div>
          <p className="text-[10px] text-white/50 mt-0.5">
            {isCharValid ? 'Target 44-54 Karakter terpenuhi' : 'Panjang optimal: 44-54 karakter'}
          </p>
        </div>
      </div>

      {/* 2. Audio Duration & Remotion Frames (or Estimated Reading Time) */}
      <div className="p-4 rounded-2xl bg-[rgba(22,22,26,0.72)] backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-white/50 text-xs mb-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#5fb2f2]" />
            {hasRealAudio ? 'Durasi Audio' : 'Estimasi Durasi'}
          </span>
          <span className="text-[10px] text-[#5fb2f2] font-mono font-bold">
            {hasRealAudio ? '@30 FPS' : 'Naskah'}
          </span>
        </div>
        <div>
          <div className="text-xl font-mono font-bold text-white tabular-nums">
            {hasRealAudio ? `${durationSec.toFixed(1)}s` : `~${durationSec.toFixed(0)}s`}
          </div>
          <p className="text-[10px] text-white/50 mt-0.5 flex items-center gap-1">
            {hasRealAudio ? (
              <>
                <Film className="w-3 h-3 text-[#5fb2f2]" />
                <span>{durationFrames} frames Remotion</span>
              </>
            ) : (
              <span>Estimasi baca @ 150 WPM</span>
            )}
          </p>
        </div>
      </div>

      {/* 3. Speaking Rate (WPM) */}
      <div className="p-4 rounded-2xl bg-[rgba(22,22,26,0.72)] backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-white/50 text-xs mb-1">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#5fb2f2]" />
            Kecepatan Bicara
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold">Natural</span>
        </div>
        <div>
          <div className="text-xl font-mono font-bold text-white tabular-nums">
            {wpm} <span className="text-xs text-white/40 font-normal">WPM</span>
          </div>
          <p className="text-[10px] text-white/50 mt-0.5">
            {wordCount} kata total naskah
          </p>
        </div>
      </div>

      {/* 4. Vocal Tags & Visual Receipts */}
      <div className="p-4 rounded-2xl bg-[rgba(22,22,26,0.72)] backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-white/50 text-xs mb-1">
          <span className="flex items-center gap-1.5">
            <Mic2 className="w-3.5 h-3.5 text-[#5fb2f2]" />
            Vocal & Visual
          </span>
          <span className="text-[10px] text-[#f49d70] font-mono">H-A-M-P</span>
        </div>
        <div>
          <div className="text-xl font-mono font-bold text-white tabular-nums">
            {vocalTagCount} <span className="text-xs text-white/40 font-normal">Tags</span>
          </div>
          <p className="text-[10px] text-white/50 mt-0.5">
            {visualReceiptsCount} Visual Receipts sinematik
          </p>
        </div>
      </div>
    </div>
  )
}
