import React, { useState, useRef, useEffect } from 'react'
import {
  WordTimestamp,
  ScriptSegment,
  TitleResponse,
  ScriptResponse,
  TTSResponse,
  TranscribeResponse,
} from '../types/studio'
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  FileText,
  AlignLeft,
  CheckCircle,
  Clock,
  Tv,
  Film,
  Music,
} from 'lucide-react'

interface KaraokePlayerProps {
  audioUrl: string
  words?: WordTimestamp[]
  scriptData?: ScriptResponse
  titleData?: TitleResponse
  ttsData?: TTSResponse
  transcribeData?: TranscribeResponse
}

export function KaraokePlayer({
  audioUrl,
  words = [],
  scriptData,
  titleData,
  ttsData,
  transcribeData,
}: KaraokePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeWordRef = useRef<HTMLSpanElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [activeTab, setActiveTab] = useState<'karaoke' | 'table' | 'tts_script' | 'titles'>('karaoke')

  // Auto-scroll word into view when playing
  useEffect(() => {
    if (isPlaying && activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [currentTime, isPlaying])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => console.warn('Audio play prevented:', err))
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || ttsData?.duration_sec || 0)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const jumpToWord = (startSec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startSec
      setCurrentTime(startSec)
      if (!isPlaying) {
        audioRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    const ms = Math.floor((secs % 1) * 10)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`
  }

  // Active word detection based on currentTime
  const getWordState = (w: WordTimestamp) => {
    if (currentTime >= w.startSec && currentTime <= w.endSec) return 'active'
    if (currentTime > w.endSec) return 'past'
    return 'future'
  }

  const currentFrame = Math.ceil(currentTime * 30)
  const totalFrames = Math.ceil((duration || ttsData?.duration_sec || 0) * 30)

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 bg-[rgba(22,22,26,0.85)] backdrop-blur-2xl border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.6)]">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      {/* Top Banner: Video Title & Remotion Frame Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-white/10">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#5fb2f2] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5fb2f2]" />
            Voice Studio Synchronizer
          </span>
          <h2 className="text-lg sm:text-2xl font-bold text-white mt-0.5 line-clamp-1">
            {scriptData?.title || titleData?.recommendations[0]?.title || 'Voice-Over Preview'}
          </h2>
        </div>

        {/* Remotion 30 FPS Frame Counter Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/80 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#5fb2f2]" />
            <span>Frame:</span>
            <span className="text-[#5fb2f2] font-bold tabular-nums">{currentFrame}</span>
            <span className="text-white/40">/</span>
            <span className="text-white/60 tabular-nums">{totalFrames}</span>
            <span className="text-[10px] text-white/40">(@30fps)</span>
          </span>
        </div>
      </div>

      {/* Modern Audio Player Bar */}
      <div className="rounded-2xl p-4 sm:p-5 bg-[#0b0b0e]/80 border border-white/10 mb-6 shadow-inner">
        {/* Scrubber Timeline */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-mono text-[#5fb2f2] tabular-nums font-semibold w-14 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 rounded-lg bg-white/15 appearance-none cursor-pointer accent-[#5fb2f2]"
          />
          <span className="text-xs font-mono text-white/50 tabular-nums w-14">
            {formatTime(duration)}
          </span>
        </div>

        {/* Player Controls Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Playback controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-r from-[#e8f6ff] via-[#a9dcff] to-[#5fb2f2] text-[#06233a] shadow-[0_4px_18px_rgba(95,178,242,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0
                  setCurrentTime(0)
                }
              }}
              title="Reset ke awal"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 flex items-center justify-center transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Playback rate speed pills */}
            <div className="flex items-center rounded-xl bg-white/5 p-0.5 border border-white/10 ml-2">
              {[1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setPlaybackRate(rate)
                    if (audioRef.current) audioRef.current.playbackRate = rate
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                    playbackRate === rate ? 'bg-[#5fb2f2] text-[#06233a] font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Right: Audio specs & Volume */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/60 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>24 kHz Mono</span>
              <span className="text-white/30">•</span>
              <span>Gemini 3.8 Flash</span>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMuted
                setIsMuted(nextMuted)
                if (audioRef.current) audioRef.current.muted = nextMuted
              }}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 flex items-center justify-center transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation for Outputs */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('karaoke')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'karaoke'
              ? 'bg-[#5fb2f2]/20 text-[#5fb2f2] border border-[#5fb2f2]/40 shadow-[0_0_15px_rgba(95,178,242,0.2)]'
              : 'text-white/60 hover:text-white bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Karaoke Subtitle Sync ({words.length} kata)</span>
        </button>

        {scriptData?.breakdown && (
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'table'
                ? 'bg-[#5fb2f2]/20 text-[#5fb2f2] border border-[#5fb2f2]/40 shadow-[0_0_15px_rgba(95,178,242,0.2)]'
                : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>2-Kolom Visual Receipts</span>
          </button>
        )}

        {scriptData?.tagged_text && (
          <button
            type="button"
            onClick={() => setActiveTab('tts_script')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'tts_script'
                ? 'bg-[#5fb2f2]/20 text-[#5fb2f2] border border-[#5fb2f2]/40 shadow-[0_0_15px_rgba(95,178,242,0.2)]'
                : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Naskah Siap TTS (Vocal Tags)</span>
          </button>
        )}

        {titleData?.recommendations && (
          <button
            type="button"
            onClick={() => setActiveTab('titles')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'titles'
                ? 'bg-[#5fb2f2]/20 text-[#5fb2f2] border border-[#5fb2f2]/40 shadow-[0_0_15px_rgba(95,178,242,0.2)]'
                : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ide Judul 44-54 Karakter</span>
          </button>
        )}
      </div>

      {/* TAB 1: Karaoke Subtitle Sync (Words Highlighted) */}
      {activeTab === 'karaoke' && (
        <div className="rounded-2xl p-6 bg-[#0b0b0e] border border-white/10 min-h-[220px] max-h-[380px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10 text-xs text-white/50">
            <span>✨ Klik kata apa saja untuk melompat audio ke kata tersebut</span>
            <span className="font-mono text-[#5fb2f2]">Gemini 3.5 Transcribe</span>
          </div>

          {words.length === 0 ? (
            <div className="text-center py-12 text-white/40 italic">
              Transkrip kata belum tersedia. Jalankan pipeline atau transkrip untuk melihat sinkronisasi karaoke.
            </div>
          ) : (
            <div ref={containerRef} className="flex flex-wrap gap-2 text-base sm:text-lg leading-loose">
              {words.map((w, idx) => {
                const state = getWordState(w)
                const isActive = state === 'active'
                const isPast = state === 'past'

                return (
                  <span
                    key={idx}
                    ref={isActive ? activeWordRef : null}
                    onClick={() => jumpToWord(w.startSec)}
                    title={`${w.startSec}s - ${w.endSec}s`}
                    className={`cursor-pointer px-2 py-0.5 rounded-lg transition-all duration-150 select-none ${
                      isActive
                        ? 'bg-[#5fb2f2] text-[#06233a] font-bold shadow-[0_0_16px_rgba(95,178,242,0.9)] scale-110 z-10'
                        : isPast
                        ? 'text-white/95 font-medium hover:text-[#5fb2f2] hover:bg-white/5'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {w.text}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 2-Kolom Visual Receipts Table */}
      {activeTab === 'table' && scriptData?.breakdown && (
        <div className="rounded-2xl bg-[#0b0b0e] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-white/60 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 w-28">Segmen</th>
                  <th className="p-3">Narasi Voice-Over (Audio)</th>
                  <th className="p-3 w-48">Arahan Visual & Motion</th>
                  <th className="p-3 w-36">SFX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/80">
                {scriptData.breakdown.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="p-3 align-top font-mono text-xs">
                      <span className="font-semibold text-white block">{row.segment}</span>
                      <span className="text-white/40">{row.time_range}</span>
                    </td>
                    <td className="p-3 align-top leading-relaxed text-white">
                      {row.narration}
                    </td>
                    <td className="p-3 align-top text-xs text-[#a9dcff]">
                      <span className="px-2 py-1 rounded bg-[#5fb2f2]/10 border border-[#5fb2f2]/20 font-mono block">
                        {row.visual_receipt}
                      </span>
                    </td>
                    <td className="p-3 align-top text-xs text-[#f49d70] font-mono italic">
                      {row.sfx}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Ready TTS Script with Vocal Tags */}
      {activeTab === 'tts_script' && scriptData && (
        <div className="rounded-2xl p-5 bg-[#0b0b0e] border border-white/10 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-[#5fb2f2] uppercase tracking-wider mb-1">
              Teks Narasi Siap TTS (Dengan Auto Inline Vocal Tags)
            </h4>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/90 text-sm sm:text-base leading-relaxed font-mono">
              {scriptData.tagged_text}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">
              Teks Bersih Tanpa Tag (Untuk Subtitle & Layar)
            </h4>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-white/70 text-sm leading-relaxed">
              {scriptData.clean_text}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Title Recommendations & Thumbnail */}
      {activeTab === 'titles' && titleData && (
        <div className="rounded-2xl p-5 bg-[#0b0b0e] border border-white/10 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-[#5fb2f2] uppercase tracking-wider mb-3">
              Rekomendasi Judul Tajam (Standar Ketat 44-54 Karakter)
            </h4>
            <div className="space-y-2.5">
              {titleData.recommendations.map((rec, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white text-sm sm:text-base">{rec.title}</p>
                    <p className="text-xs text-white/60 mt-1">{rec.why_it_works}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-[#5fb2f2]/15 text-[#5fb2f2] font-mono text-xs font-bold">
                      {rec.char_count} Karakter
                    </span>
                    <span className="block text-[10px] text-white/40 mt-1">{rec.formula}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {titleData.thumbnail && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <h5 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
                Konsep Thumbnail Sinergis
              </h5>
              <p className="text-sm text-[#f49d70] font-semibold mb-1">
                Teks Layar: "{titleData.thumbnail.screen_text}"
              </p>
              <p className="text-xs text-white/60 leading-relaxed">
                Visual Grafis: {titleData.thumbnail.visual_concept}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
