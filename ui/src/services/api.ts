import { DEFAULT_VOICE } from "../constants/voices"
import type {
  ChatMessage,
  ChatSession,
  HealthResponse,
  HistoryItem,
  PipelineRequest,
  PipelineResponse,
  SSELogEvent,
  StudioSettings,
  TitleChatResponse,
  TranscribeResponse,
  WordTimestamp,
} from "../types/studio"

const API_BASE = "/api"
const LOCAL_HISTORY_KEY = "mosaic_voice_studio_history_v3"
const CHAT_SESSIONS_KEY = "mosaic_voice_studio_chats_v1"
const SETTINGS_KEY = "mosaic_voice_studio_settings_v1"

export const DEFAULT_SETTINGS: StudioSettings = {
  accent: "ice",
  defaultVoice: DEFAULT_VOICE,
  defaultAutoTag: true,
  karaokeAutoScroll: true,
}

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

export async function fetchHealth(refresh = false, signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health${refresh ? "?refresh=true" : ""}`, { signal })
  return handleJson<HealthResponse>(res)
}

/* ---------- Settings Persistence ---------- */
export function loadStudioSettings(): StudioSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<StudioSettings>
    return {
      accent: parsed.accent === "ember" || parsed.accent === "lime" ? parsed.accent : "ice",
      defaultVoice: typeof parsed.defaultVoice === "string" && parsed.defaultVoice ? parsed.defaultVoice : DEFAULT_VOICE,
      defaultAutoTag: typeof parsed.defaultAutoTag === "boolean" ? parsed.defaultAutoTag : true,
      karaokeAutoScroll: typeof parsed.karaokeAutoScroll === "boolean" ? parsed.karaokeAutoScroll : true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveStudioSettings(settings: StudioSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore quota errors
  }
}

/* ---------- Chat Sessions Persistence ---------- */
export function loadChatSessions(): ChatSession[] {
  try {
    const raw = window.localStorage.getItem(CHAT_SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ChatSession[]) : []
  } catch {
    return []
  }
}

export function saveChatSession(session: ChatSession): ChatSession[] {
  const existing = loadChatSessions().filter((s) => s.id !== session.id)
  const next = [session, ...existing].slice(0, 30)
  try {
    window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(next))
  } catch {
    // ignore quota errors
  }
  return next
}

export function deleteChatSession(sessionId: string): ChatSession[] {
  const next = loadChatSessions().filter((s) => s.id !== sessionId)
  try {
    window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(next))
  } catch {
    // ignore quota errors
  }
  return next
}

/* ---------- Asset History & Disk API ---------- */
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
  const next = [item, ...existing].slice(0, 40)
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
    return [...remote, ...local.filter((l) => !seen.has(l.id))].slice(0, 60)
  } catch {
    return loadLocalHistory()
  }
}

export async function fetchHistoryAssetContent(
  itemType: "script" | "title",
  filename: string,
  signal?: AbortSignal,
): Promise<{ type: string; name: string; content: string }> {
  const res = await fetch(
    `${API_BASE}/history/${encodeURIComponent(itemType)}/${encodeURIComponent(filename)}`,
    { signal },
  )
  return handleJson<{ type: string; name: string; content: string }>(res)
}

export async function deleteHistoryAsset(
  itemType: "audio" | "script" | "title",
  filename: string,
): Promise<{ deleted: boolean; name: string }> {
  const res = await fetch(
    `${API_BASE}/history/${encodeURIComponent(itemType)}/${encodeURIComponent(filename)}`,
    { method: "DELETE" },
  )
  return handleJson<{ deleted: boolean; name: string }>(res)
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
    let detail = `Gagal memulai proses (HTTP ${res.status})`
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
      streamError = logEvent.message || "Terjadi kesalahan saat eksekusi."
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
    throw new Error("Stream berhenti sebelum selesai.")
  }
  return finalResult
}

export async function uploadAndTranscribe(
  file: File,
  signal?: AbortSignal,
): Promise<TranscribeResponse> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${API_BASE}/transcribe/upload`, {
    method: "POST",
    body: form,
    signal,
  })
  return handleJson<TranscribeResponse>(res)
}
