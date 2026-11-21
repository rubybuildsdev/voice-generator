import React, { useState } from 'react'
import {
  ScriptResponse,
  TTSResponse,
  TranscribeResponse,
  TitleResponse,
} from '../types/studio'
import {
  Download,
  Music,
  FileCode,
  FileText,
  Copy,
  Check,
  Subtitles,
} from 'lucide-react'

interface DownloadToolbarProps {
  ttsData?: TTSResponse
  transcribeData?: TranscribeResponse
  scriptData?: ScriptResponse
  titleData?: TitleResponse
  audioUrl?: string
}

export function DownloadToolbar({
  ttsData,
  transcribeData,
  scriptData,
  titleData,
  audioUrl,
}: DownloadToolbarProps) {
  const [copiedRemotion, setCopiedRemotion] = useState(false)

  // Trigger browser download for text/json/vtt blobs
  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Convert words to SRT subtitle format
  const generateSRT = () => {
    if (!transcribeData?.words?.length) return ''
    return transcribeData.words
      .map((w, i) => {
        const start = formatSrtTime(w.startSec)
        const end = formatSrtTime(w.endSec)
        return `${i + 1}\n${start} --> ${end}\n${w.text}\n`
      })
      .join('\n')
  }

  const formatSrtTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    const ms = Math.floor((sec % 1) * 1000)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  const copyRemotionConfig = () => {
    const data = {
      title: scriptData?.title || 'Faceless Video',
      audioDurationSec: ttsData?.duration_sec || 30,
      durationInFrames: ttsData?.duration_frames || Math.ceil((ttsData?.duration_sec || 30) * 30),
      fps: 30,
      audioSrc: audioUrl || ttsData?.audio_url || '',
      words: transcribeData?.words || [],
      segments: scriptData?.breakdown || [],
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopiedRemotion(true)
    setTimeout(() => setCopiedRemotion(false), 2000)
  }

  const baseSlug = scriptData?.slug || 'faceless_voice'

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl p-4 sm:p-5 bg-[rgba(22,22,26,0.72)] backdrop-blur-xl border border-white/10 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-[#5fb2f2]" />
            Ekspor & Download Aset Produksi
          </h4>
          <p className="text-xs text-white/50 mt-0.5">
            Kompatibel penuh dengan Remotion, CapCut, Premiere Pro, & DaVinci Resolve.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Audio WAV */}
          {audioUrl && (
            <a
              href={audioUrl}
              download={`${baseSlug}.wav`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
            >
              <Music className="w-3.5 h-3.5 text-[#5fb2f2]" />
              <span>Audio (.wav)</span>
            </a>
          )}

          {/* Download Subtitle VTT */}
          {transcribeData && (
            <button
              type="button"
              onClick={() => {
                const vtt =
                  transcribeData.vtt_content ||
                  `WEBVTT\n\n${(transcribeData.words || [])
                    .map((w) => `${formatSrtTime(w.startSec).replace(',', '.')} --> ${formatSrtTime(w.endSec).replace(',', '.')}\n${w.text}`)
                    .join('\n\n')}`
                downloadBlob(vtt, `${baseSlug}.vtt`, 'text/vtt')
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
            >
              <Subtitles className="w-3.5 h-3.5 text-[#c4f26a]" />
              <span>Subtitle (.vtt)</span>
            </button>
          )}

          {/* Download Subtitle SRT */}
          {transcribeData?.words?.length && (
            <button
              type="button"
              onClick={() => downloadBlob(generateSRT(), `${baseSlug}.srt`, 'text/plain')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
            >
              <Subtitles className="w-3.5 h-3.5 text-[#f49d70]" />
              <span>Subtitle (.srt)</span>
            </button>
          )}

          {/* Download Words JSON */}
          {transcribeData?.words?.length && (
            <button
              type="button"
              onClick={() =>
                downloadBlob(JSON.stringify(transcribeData.words, null, 2), `${baseSlug}_words.json`, 'application/json')
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-[#a9dcff]" />
              <span>Words (.json)</span>
            </button>
          )}

          {/* Download Script Text */}
          {scriptData && (
            <button
              type="button"
              onClick={() => {
                const content = `# ${scriptData.title}\n\n## Naskah Siap Rekam (H-A-M-P)\n${scriptData.tagged_text}\n\n## Teks Bersih\n${scriptData.clean_text}\n\n## Estimasi Durasi\n${scriptData.estimated_duration_sec}s (${scriptData.word_count} kata)`
                downloadBlob(content, `${baseSlug}_naskah.md`, 'text/markdown')
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-white/70" />
              <span>Naskah (.md)</span>
            </button>
          )}

          {/* Copy Remotion Timeline JSON */}
          <button
            type="button"
            onClick={copyRemotionConfig}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              copiedRemotion
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-[#5fb2f2]/15 text-[#5fb2f2] hover:bg-[#5fb2f2]/25 border border-[#5fb2f2]/30'
            }`}
          >
            {copiedRemotion ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRemotion ? 'Tersalin!' : 'Copy Remotion JSON'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
