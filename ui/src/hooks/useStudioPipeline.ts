import * as React from "react"
import {
  executePipelineStream,
  fetchHealth,
  fetchHistory,
  saveLocalHistoryItem,
} from "../services/api"
import type {
  ComposerPhase,
  HealthResponse,
  HistoryItem,
  PipelineRequest,
  PipelineResponse,
  SSELogEvent,
} from "../types/studio"

export function useStudioPipeline() {
  const [phase, setPhase] = React.useState<ComposerPhase>("idle")
  const [logs, setLogs] = React.useState<SSELogEvent[]>([])
  const [progress, setProgress] = React.useState(0)
  const [plannedSteps, setPlannedSteps] = React.useState<string[]>([
    "title",
    "script",
    "tts",
    "transcribe",
  ])
  const [completedSteps, setCompletedSteps] = React.useState<string[]>([])
  const [activeStep, setActiveStep] = React.useState<string>("")
  const [result, setResult] = React.useState<PipelineResponse | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [health, setHealth] = React.useState<HealthResponse | null>(null)

  const abortRef = React.useRef<AbortController | null>(null)

  // Muat health & history dengan cleanup abort + catch eksplisit (bebas unhandled promise rejection)
  React.useEffect(() => {
    const controller = new AbortController()
    fetchHistory(controller.signal)
      .then(setHistory)
      .catch(() => {
        // sudah ditangani fallback lokal
      })
    fetchHealth(controller.signal)
      .then(setHealth)
      .catch(() => {
        setHealth(null)
      })
    return () => {
      controller.abort()
    }
  }, [])

  // Pastikan stream SSE aktif selalu di-abort saat komponen unmount
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const stopPipeline = React.useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setPhase("idle")
  }, [])

  const startPipeline = React.useCallback(async (req: PipelineRequest) => {
    // Abort stream sebelumnya sebelum membuat AbortController baru (anti race condition SSE ganda)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError(null)
    setResult(null)
    setLogs([])
    setCompletedSteps([])
    setActiveStep("init")
    setProgress(4)
    setPhase("building")

    try {
      const response = await executePipelineStream(
        req,
        (ev) => {
          setLogs((prev) => [...prev, ev])
          if (ev.steps && ev.steps.length > 0) {
            setPlannedSteps(ev.steps)
          }
          if (ev.progress > 0) {
            setProgress(ev.progress)
          }
          if (ev.event === "step_start") {
            setActiveStep(ev.step)
          } else if (ev.event === "step_complete") {
            setCompletedSteps((prev) =>
              prev.includes(ev.step) ? prev : [...prev, ev.step],
            )
          }
        },
        controller.signal,
      )

      if (controller.signal.aborted) return

      setResult(response)
      setProgress(100)
      setPhase("done")

      if (response.tts_data) {
        const titleLabel =
          response.script_data?.title ||
          response.title_data?.recommendations?.[0]?.title ||
          req.prompt.slice(0, 60)
        const nextHistory = saveLocalHistoryItem({
          id: response.tts_data.filename.replace(/\.wav$/i, ""),
          type: "audio",
          name: response.tts_data.filename,
          title: titleLabel,
          created_at: new Date().toISOString(),
          file_size_bytes: response.tts_data.file_size_bytes,
          duration_sec: response.tts_data.duration_sec,
          voice: response.tts_data.voice,
          audio_url: response.tts_data.audio_url,
          vtt_url: response.transcribe_data?.vtt_url ?? null,
          json_url: response.transcribe_data?.json_url ?? null,
          has_transcript: Boolean(response.transcribe_data),
        })
        setHistory(nextHistory)
      }
    } catch (err) {
      if (controller.signal.aborted) return
      const msg =
        err instanceof Error ? err.message : "Gagal menjalankan pipeline."
      setError(msg)
      setPhase("idle")
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }, [])

  const resetStudio = React.useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setError(null)
    setResult(null)
    setLogs([])
    setProgress(0)
    setCompletedSteps([])
    setActiveStep("")
    setPhase("idle")
  }, [])

  return {
    phase,
    logs,
    progress,
    plannedSteps,
    completedSteps,
    activeStep,
    result,
    error,
    history,
    health,
    startPipeline,
    stopPipeline,
    resetStudio,
    setResult,
    setPhase,
  }
}
