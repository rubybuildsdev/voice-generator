"""Skema Pydantic v2 untuk kontrak API Mosaic Voice Studio."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


# --- Titles ---
class TitleRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=500)
    count: int = Field(default=3, ge=1, le=10)


class TitleRecommendation(BaseModel):
    title: str
    char_count: int
    formula: str
    why_it_works: str


class ThumbnailConcept(BaseModel):
    screen_text: str
    visual_concept: str


class TitleResponse(BaseModel):
    topic: str
    recommendations: list[TitleRecommendation]
    thumbnail_concept: ThumbnailConcept
    saved_path: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class TitleChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=30)


class TitleChatResponse(BaseModel):
    reply: str
    suggested_titles: list[TitleRecommendation] = Field(default_factory=list)


class SaveTitleRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    formula: str = Field(default="Custom", max_length=150)
    why_it_works: str = Field(default="", max_length=1000)


class SaveTitleResponse(BaseModel):
    title: str
    saved_path: str


# --- Scripts ---
class ScriptSegment(BaseModel):
    segment: str
    time_range: str
    narration: str
    visual_receipt: str
    sfx: str


class ScriptRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    topic_context: str = Field(default="", max_length=2000)
    voice_style: str = Field(default="conversational", max_length=80)
    auto_tag: bool = True
    custom_instructions: str = Field(default="", max_length=1000)


class ScriptResponse(BaseModel):
    title: str
    slug: str
    breakdown: list[ScriptSegment]
    clean_text: str
    tagged_text: str
    word_count: int
    estimated_duration_sec: float
    saved_path: str
    markdown_table: str


class AutoTagRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=10000)


class AutoTagResponse(BaseModel):
    original_text: str
    tagged_text: str
    tags_inserted: int


# --- TTS ---
class TTSRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=10000)
    voice: str = Field(default="Kore", max_length=50)
    filename: str | None = Field(default=None, max_length=120)
    style: str = Field(default="", max_length=200)


class TTSResponse(BaseModel):
    filename: str
    audio_url: str
    voice: str
    duration_sec: float
    duration_frames: int
    file_size_bytes: int
    sample_rate: int
    primary_path: str


# --- Transcribe ---
class WordTimestamp(BaseModel):
    text: str
    startSec: float
    endSec: float


class TranscribeRequest(BaseModel):
    audio_file: str = Field(..., min_length=1, max_length=200)


class TranscribeResponse(BaseModel):
    filename: str
    words: list[WordTimestamp]
    vtt_content: str
    vtt_url: str
    json_url: str
    word_count: int
    duration_sec: float


# --- Pipeline & History ---
IntentType = Literal["auto", "title", "script", "voice_only", "full"]


class PipelineRequest(BaseModel):
    intent: IntentType = "auto"
    prompt: str = Field(..., min_length=2, max_length=10000)
    title: str | None = Field(default=None, max_length=300)
    script_text: str | None = Field(default=None, max_length=10000)
    voice: str = Field(default="Kore", max_length=50)
    auto_tag: bool = True
    auto_proceed: bool = True


class PipelineResponse(BaseModel):
    intent: str
    title_data: TitleResponse | None = None
    script_data: ScriptResponse | None = None
    tts_data: TTSResponse | None = None
    transcribe_data: TranscribeResponse | None = None
    execution_time_sec: float


class HistoryItem(BaseModel):
    id: str
    type: Literal["audio", "script", "title"]
    name: str
    title: str
    created_at: str
    file_size_bytes: int
    duration_sec: float | None = None
    voice: str | None = None
    audio_url: str | None = None
    json_url: str | None = None
    vtt_url: str | None = None
    has_transcript: bool = False
