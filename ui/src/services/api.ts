import type {
  ChatMessage,
  HealthResponse,
  HistoryItem,
  PipelineRequest,
  PipelineResponse,
  SSELogEvent,
  TitleChatResponse,
  WordTimestamp,
} from "../types/studio"

const API_BASE = "/api"
const LOCAL_HISTORY_KEY = "mosaic_voice_studio_history_v3"

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request gagal (HTTP ${res.status})`
    try {
      const err = (await res.json()) as { detail?: string }
      if (err.detail) message = err.detail
    } catch {
      // ignore non-JSON body
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, { signal })
  return handleJson<HealthResponse>(res)
}

export function loadLocalHistory(): HistoryItem[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : []
  } catch {
    return []
  }
}

export function saveLocalHistoryItem(item: HistoryItem): HistoryItem[] {
  const existing = loadLocalHistory().filter((h) => h.id !== item.id)
  const next = [item, ...existing].slice(0, 30)
  try {
    window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // ignore quota errors
  }
  return next
}

export async function fetchHistory(signal?: AbortSignal): Promise<HistoryItem[]> {
  try {
    const res = await fetch(`${API_BASE}/history`, { signal })
    const remote = await handleJson<HistoryItem[]>(res)
    const local = loadLocalHistory()
    const seen = new Set(remote.map((r) => r.id))
    return [...remote, ...local.filter((l) => !seen.has(l.id))].slice(0, 50)
  } catch {
    return loadLocalHistory()
  }
}

export async function fetchTranscriptWords(
  jsonUrl: string,
  signal?: AbortSignal,
): Promise<WordTimestamp[]> {
  const res = await fetch(jsonUrl, { signal })
  return handleJson<WordTimestamp[]>(res)
}

export async function sendTitleChatMessage(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<TitleChatResponse> {
  const res = await fetch(`${API_BASE}/titles/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  })
  return handleJson<TitleChatResponse>(res)
}

export async function saveSelectedTitle(
  title: string,
  formula: string,
  whyItWorks: string,
): Promise<{ title: string; saved_path: string }> {
  const res = await fetch(`${API_BASE}/titles/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, formula, why_it_works: whyItWorks }),
  })
  return handleJson<{ title: string; saved_path: string }>(res)
}

/**
 * Mengalirkan eksekusi pipeline via POST SSE secara aman (mendukung naskah panjang & AbortSignal).
 */
export async function executePipelineStream(
  params: PipelineRequest,
  onEvent: (ev: SSELogEvent) => void,
  signal?: AbortSignal,
): Promise<PipelineResponse> {
  const res = await fetch(`${API_BASE}/pipeline/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(params),
    signal,
  })

  if (!res.ok) {
    let detail = `Gagal memulai pipeline (HTTP ${res.status})`
    try {
      const data = (await res.json()) as { detail?: string }
      if (data.detail) detail = data.detail
    } catch {
      // ignore
    }
    throw new Error(detail)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error("Browser tidak mendukung streaming respons SSE.")
  }

  const decoder = new TextDecoder("utf-8")
  let buffer = ""
  let currentEvent = "message"
  let finalResult: PipelineResponse | null = null
  let streamError: string | null = null

  const dispatchBlock = (block: string) => {
    const lines = block.split(/\r?\n/)
    let evName = currentEvent
    const dataLines: string[] = []
    for (const line of lines) {
      if (line.startsWith("event:")) {
        evName = line.slice(6).trim()
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim())
      }
    }
    if (!dataLines.length) return
    const rawData = dataLines.join("\n")
    let parsed: Partial<SSELogEvent>
    try {
      parsed = JSON.parse(rawData) as Partial<SSELogEvent>
    } catch {
      return
    }

    const logEvent: SSELogEvent = {
      event: evName,
      step: parsed.step || evName,
      stage: parsed.stage || evName,
      message: parsed.message || "",
      progress: typeof parsed.progress === "number" ? parsed.progress : 0,
      timestamp: parsed.timestamp || new Date().toISOString(),
      steps: parsed.steps,
      payload: parsed.payload,
    }
    onEvent(logEvent)

    if (evName === "error") {
      streamError = logEvent.message || "Terjadi kesalahan saat eksekusi pipeline."
    } else if (evName === "pipeline_complete" && parsed.payload) {
      finalResult = parsed.payload as PipelineResponse
    }
    currentEvent = "message"
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() ?? ""
      for (const block of blocks) {
        if (block.trim()) dispatchBlock(block)
      }
    }
    if (buffer.trim()) dispatchBlock(buffer)
  } finally {
    reader.releaseLock()
  }

  if (streamError) {
    throw new Error(streamError)
  }
  if (!finalResult) {
    throw new Error("Stream pipeline berhenti sebelum selesai.")
  }
  return finalResult
}
