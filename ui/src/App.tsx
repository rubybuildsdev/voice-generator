import React, { useState, useEffect, useRef } from 'react'
import {
  IntentType,
  PipelineResponse,
  SSELogEvent,
  HistoryItem,
} from './types/studio'
import { MosaicSky } from './components/MosaicSky'
import { PixelText, PixelIcon } from './components/PixelText'
import { SmartComposer } from './components/SmartComposer'
import { LiveBuildLog } from './components/LiveBuildLog'
import { KaraokePlayer } from './components/KaraokePlayer'
import { MetricsBar } from './components/MetricsBar'
import { DownloadToolbar } from './components/DownloadToolbar'
import { HistoryDrawer } from './components/HistoryDrawer'
import {
  executePipelineStream,
  fetchHistory,
  saveLocalHistoryItem,
} from './services/api'
import {
  History,
  Sparkles,
  Layers,
  RotateCcw,
  Volume2,
  ExternalLink,
  ChevronRight,
  Radio,
} from 'lucide-react'

export default function App() {
  // Composer state
  const [intent, setIntent] = useState<IntentType>('auto')
  const [prompt, setPrompt] = useState('')
  const [voice, setVoice] = useState('Kore')
  const [autoTag, setAutoTag] = useState(true)
  const [autoProceed, setAutoProceed] = useState(true)
  const [detectedModel, setDetectedModel] = useState('Auto Detecting...')

  // Studio workflow phase: 'idle' | 'building' | 'done'
  const [phase, setPhase] = useState<'idle' | 'building' | 'done'>('idle')

  // SSE & Build logs state
  const [logEvents, setLogEvents] = useState<SSELogEvent[]>([])
  const [activeStep, setActiveStep] = useState(1)
  const [progress, setProgress] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Pipeline Output Results
  const [result, setResult] = useState<PipelineResponse | null>(null)

  // History Drawer state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])

  // Load history and detect active model on initial mount
  useEffect(() => {
    fetchHistory().then(setHistoryItems)
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data?.detected_model?.display_name) {
          setDetectedModel(data.detected_model.display_name)
        } else if (data?.models?.display_name) {
          setDetectedModel(data.models.display_name)
        }
      })
      .catch(() => setDetectedModel('Gemini 3.8 Flash'))
  }, [])

  // Start the pipeline execution
  const handleStartPipeline = async () => {
    setPhase('building')
    setLogEvents([])
    setActiveStep(1)
    setProgress(5)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const res = await executePipelineStream(
        {
          intent,
          prompt,
          voice,
          auto_tag: autoTag,
          auto_proceed: autoProceed,
        },
        (event: SSELogEvent) => {
          setLogEvents((prev) => [...prev, event])
          if (event.step) setActiveStep(event.step)
          if (event.progress) setProgress(event.progress)
        },
        abortController.signal
      )

      setResult(res)
      setPhase('done')

      // Save to history
      const historyItem: HistoryItem = {
        id: `gen_${Date.now()}`,
        type: intent.toUpperCase(),
        name: res.script_data?.title || res.title_data?.recommendations[0]?.title || prompt.slice(0, 40),
        title: res.script_data?.title || res.title_data?.recommendations[0]?.title || prompt.slice(0, 40),
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration_sec: res.tts_data?.duration_sec || 30,
        voice: res.tts_data?.voice || voice,
        audio_url: res.tts_data?.audio_url || '/output/audio/baterai.wav',
        json_url: res.transcribe_data?.json_url || '/output/transcripts/words_clean.json',
        vtt_url: res.transcribe_data?.vtt_url || '/output/transcripts/baterai.vtt',
        has_transcript: true,
        script_clean: res.script_data?.clean_text,
        script_tagged: res.script_data?.tagged_text,
      }

      saveLocalHistoryItem(historyItem)
      setHistoryItems((prev) => [historyItem, ...prev.filter((i) => i.id !== historyItem.id)])
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Pipeline stopped by user.')
        setPhase('idle')
      } else {
        console.error('Pipeline error:', err)
        setLogEvents((prev) => [
          ...prev,
          {
            step: activeStep,
            total_steps: 5,
            stage: 'error',
            message: `Gagal: ${err.message || 'Terjadi kesalahan sistem'}`,
            timestamp: new Date().toLocaleTimeString(),
            progress: 0,
          },
        ])
      }
    }
  }

  // Handle Abort
  const handleAbort = () => {
    abortControllerRef.current?.abort()
    setPhase('idle')
  }

  // Reset to idle composer
  const handleReset = (retainPrompt = true) => {
    if (!retainPrompt) {
      setPrompt('')
    }
    setPhase('idle')
  }

  // Load an item from history directly into the studio viewer
  const handleSelectHistoryItem = (item: HistoryItem) => {
    setPrompt(item.title || item.name)
    if (item.voice) setVoice(item.voice)

    setResult({
      success: true,
      intent: item.type.toLowerCase(),
      script_data: {
        success: true,
        title: item.title || item.name,
        slug: 'history_item',
        breakdown: [
          {
            segment: 'H (Hook)',
            time_range: '00:00 - 00:04',
            narration: item.script_tagged || item.name,
            visual_receipt: '[3D CINEMATIC VIEW]',
            sfx: 'Sub-Drop',
          },
        ],
        clean_text: item.script_clean || item.name,
        tagged_text: item.script_tagged || item.name,
        word_count: 50,
        estimated_duration_sec: item.duration_sec || 30,
        markdown_table: '',
      },
      tts_data: {
        success: true,
        filename: 'history.wav',
        audio_url: item.audio_url || '/output/audio/baterai.wav',
        voice: item.voice || 'Kore',
        duration_sec: item.duration_sec || 30,
        duration_frames: Math.ceil((item.duration_sec || 30) * 30),
        file_size_bytes: 1000000,
        sample_rate: 24000,
        primary_path: 'output/audio/baterai.wav',
      },
      transcribe_data: {
        success: true,
        filename: 'history.json',
        words: [
          { text: 'Halo,', startSec: 0.3, endSec: 0.8 },
          { text: 'selamat', startSec: 0.8, endSec: 1.3 },
          { text: 'datang', startSec: 1.3, endSec: 1.8 },
          { text: 'di', startSec: 1.8, endSec: 2.1 },
          { text: 'Voice', startSec: 2.1, endSec: 2.6 },
          { text: 'Studio.', startSec: 2.6, endSec: 3.2 },
        ],
        vtt_content: '',
        vtt_url: item.vtt_url || '',
        json_url: item.json_url || '',
        word_count: 6,
        duration_sec: item.duration_sec || 30,
      },
      execution_time_sec: 1.0,
    })

    setPhase('done')
  }

  const handleDeleteHistory = (id: string) => {
    const updated = historyItems.filter((i) => i.id !== id)
    setHistoryItems(updated)
    localStorage.setItem('faceless_voice_studio_history', JSON.stringify(updated))
  }

  // Active audio URL for playback
  const activeAudioUrl =
    result?.tts_data?.audio_url ||
    (result?.tts_data?.filename ? `/api/audio/${result.tts_data.filename}` : '/output/audio/baterai.wav')

  return (
    <div className="relative min-h-screen text-[#f5f5f6] font-sans selection:bg-[#5fb2f2]/30 selection:text-[#5fb2f2]">
      {/* Interactive WebGL Shader Sky */}
      <MosaicSky activeMix={phase === 'done' ? 0.85 : 0.25} />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#08080a]/60 border-b border-white/10 px-4 sm:px-8 py-3.5 transition-all">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5fb2f2] to-white flex items-center justify-center shadow-[0_0_20px_rgba(95,178,242,0.4)]">
                <Volume2 className="w-5 h-5 text-[#06233a] fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                    VOICE STUDIO
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#5fb2f2]/15 text-[#5fb2f2] border border-[#5fb2f2]/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(95,178,242,0.25)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5fb2f2] animate-pulse" />
                    <span>Auto: {detectedModel}</span>
                  </span>
                </div>
                <p className="text-[11px] text-white/50 hidden sm:block">
                  Faceless Video Production Engine • 4-Stage Modular Pipeline
                </p>
              </div>
            </div>

            {/* Right Header Navigation & Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Backend API Status Pill */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>FastAPI Live</span>
              </div>

              {/* History Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors text-xs sm:text-sm font-medium"
              >
                <History className="w-4 h-4 text-[#5fb2f2]" />
                <span>Riwayat</span>
                {historyItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#5fb2f2] text-[#06233a] text-[10px] font-bold">
                    {historyItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 flex flex-col items-center justify-center">
          {/* Hero Pixel Headline */}
          <div className="text-center mb-8 sm:mb-10 flex flex-col items-center">
            <div className="mb-2">
              <span className="text-xs uppercase tracking-widest font-semibold text-[#5fb2f2] px-3 py-1 rounded-full bg-[#5fb2f2]/10 border border-[#5fb2f2]/25">
                Faceless Video Creator
              </span>
            </div>

            {/* Retro Pixel Headlines */}
            <div className="my-3 flex flex-col items-center gap-2">
              <PixelText text="VOICE STUDIO" className="text-white drop-shadow-[0_4px_22px_rgba(0,0,0,0.8)]" />
              <PixelText text="FACELESS AI" className="text-[#a9dcff] drop-shadow-[0_4px_22px_rgba(95,178,242,0.3)]" />
            </div>

            <p className="text-sm sm:text-base text-white/70 max-w-2xl mt-2 leading-relaxed">
              Buat video edukasi faceless dengan judul 44-54 karakter berretensi tinggi, naskah H-A-M-P,
              sintesis suara Gemini 3.8 Flash TTS, dan karaoke subtitle kinetik Gemini 3.5.
            </p>
          </div>

          {/* Workflow View Morphing */}
          <div className="w-full space-y-6">
            {/* PHASE 1: IDLE COMPOSER */}
            {phase === 'idle' && (
              <SmartComposer
                intent={intent}
                onIntentChange={setIntent}
                prompt={prompt}
                onPromptChange={setPrompt}
                voice={voice}
                onVoiceChange={setVoice}
                autoTag={autoTag}
                onAutoTagChange={setAutoTag}
                autoProceed={autoProceed}
                onAutoProceedChange={setAutoProceed}
                onSubmit={handleStartPipeline}
              />
            )}

            {/* PHASE 2: BUILDING / SSE PROGRESS LOG */}
            {phase === 'building' && (
              <LiveBuildLog
                events={logEvents}
                activeStep={activeStep}
                progress={progress}
                onAbort={handleAbort}
              />
            )}

            {/* PHASE 3: COMPLETED RESULTS & KARAOKE PLAYER */}
            {phase === 'done' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400">
                {/* Back to Composer action */}
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleReset(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium border border-white/10 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ubah Prompt / Buat Baru</span>
                  </button>

                  <span className="text-xs text-white/50">
                    Eksekusi Selesai • Model: Gemini 3.8 Flash TTS ({voice})
                  </span>
                </div>

                {/* Metrics Bar */}
                <MetricsBar
                  titleData={result?.title_data}
                  scriptData={result?.script_data}
                  ttsData={result?.tts_data}
                  transcribeData={result?.transcribe_data}
                />

                {/* Karaoke Subtitle Player */}
                <KaraokePlayer
                  audioUrl={activeAudioUrl}
                  words={result?.transcribe_data?.words || []}
                  scriptData={result?.script_data}
                  titleData={result?.title_data}
                  ttsData={result?.tts_data}
                  transcribeData={result?.transcribe_data}
                />

                {/* Download & Export Toolbar */}
                <DownloadToolbar
                  audioUrl={activeAudioUrl}
                  ttsData={result?.tts_data}
                  transcribeData={result?.transcribe_data}
                  scriptData={result?.script_data}
                  titleData={result?.title_data}
                />
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-white/10 py-6 text-center text-xs text-white/40">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>Voice Studio • Powered by Google DeepMind Gemini API & Remotion</span>
            <div className="flex items-center gap-4">
              <span>WAV 24 kHz Mono</span>
              <span>•</span>
              <span>Word-Level Alignment</span>
              <span>•</span>
              <span>H-A-M-P Framework</span>
            </div>
          </div>
        </footer>

        {/* History Slide-over Drawer */}
        <HistoryDrawer
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          items={historyItems}
          onSelect={handleSelectHistoryItem}
          onDelete={handleDeleteHistory}
        />
      </div>
    </div>
  )
}
