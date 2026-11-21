export type IntentType = "auto" | "full" | "title" | "script" | "voice_only"
export type MosaicAccent = "ice" | "ember" | "lime"
export type ComposerPhase = "idle" | "building" | "done"

export interface VoiceProfile {
  id: string
  name: string
  gender: "Pria" | "Wanita"
  category: "Populer" | "Pria" | "Wanita"
  tone: string
  style: string
  description: string
  recommended: boolean
}

export interface TitleRecommendation {
  title: string
  char_count: number
  formula: string
  why_it_works: string
}

export interface ThumbnailConcept {
  screen_text: string
  visual_concept: string
}

export interface TitleResponse {
  topic: string
  recommendations: TitleRecommendation[]
  thumbnail_concept: ThumbnailConcept
  saved_path?: string | null
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface TitleChatResponse {
  reply: string
  suggested_titles: TitleRecommendation[]
}

export interface ScriptSegment {
  segment: string
  time_range: string
  narration: string
  visual_receipt: string
  sfx: string
}

export interface ScriptResponse {
  title: string
  slug: string
  breakdown: ScriptSegment[]
  clean_text: string
  tagged_text: string
  word_count: number
  estimated_duration_sec: number
  saved_path: string
  markdown_table: string
}

export interface TTSResponse {
  filename: string
  audio_url: string
  voice: string
  duration_sec: number
  duration_frames: number
  file_size_bytes: number
  sample_rate: number
  primary_path: string
}

export interface WordTimestamp {
  text: string
  startSec: number
  endSec: number
}

export interface TranscribeResponse {
  filename: string
  words: WordTimestamp[]
  vtt_content: string
  vtt_url: string
  json_url: string
  word_count: number
  duration_sec: number
}

export interface PipelineRequest {
  intent: IntentType
  prompt: string
  title?: string
  script_text?: string
  voice: string
  auto_tag: boolean
  auto_proceed: boolean
}

export interface PipelineResponse {
  intent: string
  title_data?: TitleResponse | null
  script_data?: ScriptResponse | null
  tts_data?: TTSResponse | null
  transcribe_data?: TranscribeResponse | null
  execution_time_sec: number
}

export interface SSELogEvent {
  event: string
  step: string
  stage: string
  message: string
  progress: number
  timestamp: string
  steps?: string[]
  payload?: unknown
}

export interface HistoryItem {
  id: string
  type: "audio" | "script" | "title"
  name: string
  title: string
  created_at: string
  file_size_bytes: number
  duration_sec?: number | null
  voice?: string | null
  audio_url?: string | null
  json_url?: string | null
  vtt_url?: string | null
  has_transcript: boolean
}

export interface HealthResponse {
  status: string
  version: string
  gemini_api_configured: boolean
  detected_model: {
    status: string
    text_model: string
    tts_model: string
    transcribe_model: string
    display_name: string
  }
  voices_count: number
  tags_count: number
}
