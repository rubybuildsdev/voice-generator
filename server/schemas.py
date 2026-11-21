from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Title Schemas
class TitleRequest(BaseModel):
    topic: str = Field(..., description="Topik kasar, data, ringkasan berita, atau artikel teknologi")
    count: int = Field(3, description="Jumlah rekomendasi judul (default 3)")

class TitleRecommendation(BaseModel):
    title: str = Field(..., description="Judul tajam 44-54 karakter")
    char_count: int = Field(..., description="Jumlah karakter judul")
    formula: str = Field(..., description="Nama formula retensi (contoh: Numerical Specificity)")
    why_it_works: str = Field(..., description="Alasan psikologis mengapa judul ini memikat penonton")

class ThumbnailConcept(BaseModel):
    screen_text: str = Field(..., description="Teks layar 2-4 kata kontras tinggi")
    visual_concept: str = Field(..., description="Deskripsi visual grafis tanpa wajah")

class TitleResponse(BaseModel):
    success: bool = True
    topic: str
    recommendations: List[TitleRecommendation]
    thumbnail: ThumbnailConcept
    markdown_output: str

# Script Schemas
class ScriptSegment(BaseModel):
    segment: str = Field(..., description="Nama babak H-A-M-P (Hook, Agitasi, Mekanisme, Payoff)")
    time_range: str = Field(..., description="Rentang waktu detik (misal 00:00 - 00:04)")
    narration: str = Field(..., description="Teks narasi segmen dengan inline vocal tags")
    visual_receipt: str = Field(..., description="Arahan visual bukti otentik [PHONE CUTAWAY]")
    sfx: str = Field(..., description="Sound effect pendukung")

class ScriptRequest(BaseModel):
    title: str = Field(..., description="Judul video terpilih")
    topic_context: Optional[str] = Field(None, description="Konteks fakta tambahan atau catatan riset")
    voice_style: Optional[str] = Field("conversational", description="Gaya tutur naskah")
    auto_tag: Optional[bool] = Field(True, description="Sisipkan inline vocal tags resmi secara otomatis")
    custom_instructions: Optional[str] = Field(None, description="Instruksi tambahan jika ada")

class ScriptResponse(BaseModel):
    success: bool = True
    title: str
    slug: str
    breakdown: List[ScriptSegment]
    clean_text: str
    tagged_text: str
    word_count: int
    estimated_duration_sec: float
    saved_path: Optional[str] = None
    markdown_table: str

# Auto Tag Schemas
class AutoTagRequest(BaseModel):
    text: str = Field(..., description="Teks naskah mentah tanpa vocal tags")

class AutoTagResponse(BaseModel):
    success: bool = True
    original_text: str
    tagged_text: str
    tag_count: int
    detected_tags: List[str]

# TTS Schemas
class TTSRequest(BaseModel):
    text: str = Field(..., description="Teks naskah lengkap (disarankan dengan inline vocal tags)")
    voice: Optional[str] = Field("Kore", description="Nama profil suara Gemini (Kore, Fola, Puck, dll.)")
    filename: Optional[str] = Field(None, description="Nama file output kustom tanpa .wav")
    style: Optional[str] = Field(None, description="Gaya ekspresi vokal tambahan")

class TTSResponse(BaseModel):
    success: bool = True
    filename: str
    audio_url: str
    voice: str
    duration_sec: float
    duration_frames: int
    file_size_bytes: int
    sample_rate: int
    primary_path: str
    mirror_path: Optional[str] = None

# Transcribe Schemas
class WordTimestamp(BaseModel):
    text: str
    startSec: float
    endSec: float

class TranscribeRequest(BaseModel):
    audio_file: Optional[str] = Field(None, description="Nama file di output/audio atau path lengkap")

class TranscribeResponse(BaseModel):
    success: bool = True
    filename: str
    words: List[WordTimestamp]
    vtt_content: str
    vtt_url: str
    json_url: str
    word_count: int
    duration_sec: float

# Pipeline Schemas
class PipelineRequest(BaseModel):
    intent: Optional[str] = Field("auto", description="auto, title, script, voice_only, atau full")
    prompt: str = Field(..., description="Input teks prompt, topik, data, atau naskah")
    title: Optional[str] = Field(None, description="Judul video jika sudah ditentukan")
    script_text: Optional[str] = Field(None, description="Naskah langsung jika bypass title")
    voice: Optional[str] = Field("Kore", description="Profil suara pilihan")
    auto_tag: Optional[bool] = Field(True, description="Sisipkan inline vocal tags pada naskah")
    auto_proceed: Optional[bool] = Field(True, description="Lanjut otomatis sampai tahap transkripsi")

class PipelineResponse(BaseModel):
    success: bool = True
    intent: str
    title_data: Optional[TitleResponse] = None
    script_data: Optional[ScriptResponse] = None
    tts_data: Optional[TTSResponse] = None
    transcribe_data: Optional[TranscribeResponse] = None
    execution_time_sec: float

# History Schemas
class HistoryItem(BaseModel):
    id: str
    type: str
    name: str
    title: Optional[str] = None
    created_at: str
    file_size_bytes: Optional[int] = None
    duration_sec: Optional[float] = None
    voice: Optional[str] = None
    audio_url: Optional[str] = None
    json_url: Optional[str] = None
    vtt_url: Optional[str] = None
    has_transcript: bool = False
