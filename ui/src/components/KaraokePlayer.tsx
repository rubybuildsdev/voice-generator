import * as React from "react"
import { Download, Pause, Play, RotateCcw } from "lucide-react"
import type { TTSResponse, TranscribeResponse } from "../types/studio"

function formatTime(sec: number): string {
  const safe = Math.max(0, sec)
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${mins}:${String(secs).padStart(2, "0")}`
}

export function KaraokePlayer({
  tts,
  transcribe,
}: {
  tts: TTSResponse
  transcribe?: TranscribeResponse | null
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(tts.duration_sec || 0)

  React.useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    setDuration(tts.duration_sec || 0)
  }, [tts.audio_url, tts.duration_sec])

  const togglePlay = async () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      try {
        await el.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  const seekTo = (sec: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, sec)
    setCurrentTime(el.currentTime)
  }

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const words = transcribe?.words ?? []

  return (
    <div className="mvs-player mpt-enter">
      <audio
        ref={audioRef}
        src={tts.audio_url}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration)
          }
        }}
        onEnded={() => setPlaying(false)}
      />

      <div className="mvs-player-bar">
        <button
          type="button"
          className="mvs-play-btn"
          onClick={togglePlay}
          aria-label={playing ? "Pause audio" : "Play audio"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className="mvs-scrub-wrap">
          <div className="mvs-meta-row">
            <span>{tts.voice} · 24 kHz WAV</span>
            <span className="mvs-time">
              {formatTime(currentTime)} / {formatTime(duration)} · {tts.duration_frames}f @30fps
            </span>
          </div>
          <input
            type="range"
            className="mvs-range"
            min={0}
            max={Math.max(0.1, duration)}
            step={0.05}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Audio progress"
            style={{ "--pct": `${progressPct}%` } as React.CSSProperties}
          />
        </div>

        <button
          type="button"
          className="mvs-icon-btn"
          onClick={() => seekTo(0)}
          aria-label="Restart audio"
          title="Ulang dari awal"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {words.length > 0 && (
        <div className="mvs-karaoke-box" aria-label="Word-level synchronized transcript">
          {words.map((w, idx) => {
            const isActive = currentTime >= w.startSec && currentTime <= w.endSec
            const isPast = currentTime > w.endSec
            return (
              <button
                key={`${w.text}-${idx}`}
                type="button"
                className="mvs-word"
                data-state={isActive ? "active" : isPast ? "past" : "future"}
                onClick={() => seekTo(w.startSec)}
              >
                {w.text}
              </button>
            )
          })}
        </div>
      )}

      <div className="mvs-downloads">
        <a href={tts.audio_url} download={tts.filename} className="mpt-ghost mvs-dl">
          <Download size={14} /> WAV
        </a>
        {transcribe?.vtt_url && (
          <a href={transcribe.vtt_url} download className="mpt-ghost mvs-dl">
            <Download size={14} /> VTT
          </a>
        )}
        {transcribe?.json_url && (
          <a href={transcribe.json_url} download className="mpt-ghost mvs-dl">
            <Download size={14} /> JSON
          </a>
        )}
      </div>
    </div>
  )
}
