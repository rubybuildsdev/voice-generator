export type IntentType = 'auto' | 'title' | 'script' | 'voice_only' | 'full'

export interface VoiceOption {
  id: string
  name: string
  description: string
  gender: 'Pria' | 'Wanita'
  category?: 'Populer' | 'Pria' | 'Wanita'
  badge: string
  recommended?: boolean
}

export interface PipelineRequest {
  intent: IntentType
  prompt: string
  title?: string
  script_text?: string
  voice?: string
  auto_tag?: boolean
  auto_proceed?: boolean
}

export interface VocalTag {
  tag: string
  label: string
  category: 'pause' | 'breath' | 'emotion' | 'reaction'
  hint: string
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
  success: boolean
  topic: string
  recommendations: TitleRecommendation[]
  thumbnail: ThumbnailConcept
  markdown_output: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TitleChatResponse {
  success: boolean
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
  success: boolean
  title: string
  slug: string
  breakdown: ScriptSegment[]
  clean_text: string
  tagged_text: string
  word_count: number
  estimated_duration_sec: number
  saved_path?: string
  markdown_table: string
}

export interface TTSResponse {
  success: boolean
  filename: string
  audio_url: string
  voice: string
  duration_sec: number
  duration_frames: number
  file_size_bytes: number
  sample_rate: number
  primary_path: string
  mirror_path?: string
}

export interface WordTimestamp {
  text: string
  startSec: number
  endSec: number
}

export interface TranscribeResponse {
  success: boolean
  filename: string
  words: WordTimestamp[]
  vtt_content: string
  vtt_url: string
  json_url: string
  word_count: number
  duration_sec: number
}

export interface PipelineResponse {
  success: boolean
  intent: string
  title_data?: TitleResponse
  script_data?: ScriptResponse
  tts_data?: TTSResponse
  transcribe_data?: TranscribeResponse
  execution_time_sec: number
}

export interface HistoryItem {
  id: string
  type: string
  name: string
  title?: string
  created_at: string
  file_size_bytes?: number
  duration_sec?: number
  voice?: string
  audio_url?: string
  json_url?: string
  vtt_url?: string
  has_transcript: boolean
  script_clean?: string
  script_tagged?: string
}

export interface SSELogEvent {
  step: number
  total_steps: number
  stage: string
  message: string
  timestamp: string
  progress: number
  payload?: any
}
