"""Konfigurasi terpusat dan validasi path aman untuk Mosaic Voice Studio."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Direktori konten & output
CONTENT_DIR = BASE_DIR / "content"
CONTENT_TITLES_DIR = CONTENT_DIR / "titles"
CONTENT_SCRIPTS_DIR = CONTENT_DIR / "scripts"

OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_AUDIO_DIR = OUTPUT_DIR / "audio"
OUTPUT_TRANSCRIPTS_DIR = OUTPUT_DIR / "transcripts"
DOCS_DIR = BASE_DIR / "docs"
UI_DIST_DIR = BASE_DIR / "ui" / "dist"


def ensure_directories() -> None:
    """Memastikan seluruh direktori kerja tersedia saat startup."""
    for directory in (
        CONTENT_TITLES_DIR,
        CONTENT_SCRIPTS_DIR,
        OUTPUT_AUDIO_DIR,
        OUTPUT_TRANSCRIPTS_DIR,
    ):
        directory.mkdir(parents=True, exist_ok=True)


# API Key
GEMINI_API_KEY: str = (
    os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
).strip()

# Konfigurasi Model (satu sumber kebenaran untuk Backend & CLI)
TEXT_MODEL: str = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash").strip()
TEXT_MODEL_FALLBACK: str = os.getenv(
    "GEMINI_TEXT_FALLBACK_MODEL", "gemini-2.5-flash-lite"
).strip()
TTS_MODEL: str = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts").strip()
TRANSCRIBE_MODEL: str = os.getenv(
    "GEMINI_TRANSCRIBE_MODEL", "gemini-2.5-flash"
).strip()

# Server & Keamanan CORS
API_HOST: str = os.getenv("API_HOST", "127.0.0.1").strip()
API_PORT: int = int(os.getenv("API_PORT", "8000"))
UI_PORT: int = int(os.getenv("UI_PORT", "5173"))
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

_raw_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
CORS_ORIGINS: list[str] = [
    origin.strip() for origin in _raw_origins.split(",") if origin.strip()
]

# Audio & Video constants
DEFAULT_VOICE: str = "Kore"
DEFAULT_SAMPLE_RATE: int = 24000
DEFAULT_CHANNELS: int = 1
DEFAULT_SAMPLE_WIDTH: int = 2  # 16-bit PCM
REMOTION_FPS: int = 30

ALLOWED_AUDIO_EXTENSIONS: tuple[str, ...] = (".wav",)
ALLOWED_TRANSCRIPT_EXTENSIONS: tuple[str, ...] = (".json", ".vtt")

# 16 Inline Vocal Tags Resmi Gemini
OFFICIAL_VOCAL_TAGS: list[dict[str, str]] = [
    {"tag": "<short pause>", "category": "Pause", "description": "Jeda singkat 0.3–0.5 detik untuk ritme natural"},
    {"tag": "<long pause>", "category": "Pause", "description": "Jeda dramatis 1–1.5 detik sebelum punchline"},
    {"tag": "<breath>", "category": "Breath", "description": "Tarikan napas ringan di antara kalimat panjang"},
    {"tag": "<heavy breath>", "category": "Breath", "description": "Napas dalam untuk nuansa tegang atau serius"},
    {"tag": "<sigh>", "category": "Emotion", "description": "Helahan napas ekspresif untuk empati atau agitasi"},
    {"tag": "<chuckle>", "category": "Emotion", "description": "Tawa kecil santai agar terdengar manusiawi"},
    {"tag": "<laugh>", "category": "Emotion", "description": "Tawa lepas untuk momen ringan"},
    {"tag": "<gasp>", "category": "Emotion", "description": "Reaksi kaget singkat di bagian hook/twist"},
    {"tag": "<whisper>", "category": "Delivery", "description": "Bisikan intens untuk rahasia atau fakta mengejutkan"},
    {"tag": "<excited>", "category": "Delivery", "description": "Intonasi bersemangat untuk payoff atau CTA"},
    {"tag": "<serious>", "category": "Delivery", "description": "Nada serius dan tegas saat menyajikan data"},
    {"tag": "<curious>", "category": "Delivery", "description": "Nada bertanya untuk memancing rasa penasaran"},
    {"tag": "<slow>", "category": "Pacing", "description": "Memperlambat tempo bicara untuk penekanan"},
    {"tag": "<fast>", "category": "Pacing", "description": "Mempercepat tempo untuk daftar cepat atau energi tinggi"},
    {"tag": "<clear throat>", "category": "Human", "description": "Dehem singkat sebelum masuk poin penting"},
    {"tag": "<emphasis>", "category": "Delivery", "description": "Penekanan vokal pada kata kunci utama"},
]

# 31 Profil Suara Studio Gemini
AVAILABLE_VOICES: list[dict[str, object]] = [
    {"id": "Kore", "name": "Kore", "gender": "Pria", "category": "Populer", "tone": "Tegas & Edukatif", "style": "Authoritative", "description": "Suara tegas, jernih, dan sangat ideal untuk konten edukasi teknologi faceless.", "recommended": True},
    {"id": "Fola", "name": "Fola", "gender": "Wanita", "category": "Populer", "tone": "Jernih & Ramah", "style": "Conversational", "description": "Artikulasi bersih dan hangat untuk explainer modern.", "recommended": True},
    {"id": "Puck", "name": "Puck", "gender": "Pria", "category": "Populer", "tone": "Energik & Dinamis", "style": "Upbeat", "description": "Cepat dan penuh energi, pas untuk hook YouTube Shorts & TikTok.", "recommended": True},
    {"id": "Zephyr", "name": "Zephyr", "gender": "Pria", "category": "Populer", "tone": "Tenang & Sinematik", "style": "Cinematic", "description": "Tenang, dalam, cocok untuk storytelling dan dokumenter mini.", "recommended": True},
    {"id": "Aoede", "name": "Aoede", "gender": "Wanita", "category": "Wanita", "tone": "Ekspresif & Naratif", "style": "Storyteller", "description": "Kaya intonasi untuk narasi yang emosional.", "recommended": False},
    {"id": "Charon", "name": "Charon", "gender": "Pria", "category": "Pria", "tone": "Dalam & Misterius", "style": "Deep", "description": "Warna suara rendah untuk topik misteri, keamanan siber, dan sejarah.", "recommended": False},
    {"id": "Fenrir", "name": "Fenrir", "gender": "Pria", "category": "Pria", "tone": "Berat & Intens", "style": "Dramatic", "description": "Kuat dan intens untuk fakta mengejutkan.", "recommended": False},
    {"id": "Leda", "name": "Leda", "gender": "Wanita", "category": "Wanita", "tone": "Cerah & Optimis", "style": "Bright", "description": "Ringan dan positif untuk tips produktivitas.", "recommended": False},
    {"id": "Orus", "name": "Orus", "gender": "Pria", "category": "Pria", "tone": "Lugas & Berbobot", "style": "Direct", "description": "To the point dan meyakinkan untuk analisis bisnis/tech.", "recommended": False},
    {"id": "Callirrhoe", "name": "Callirrhoe", "gender": "Wanita", "category": "Wanita", "tone": "Santai & Luwes", "style": "Casual", "description": "Natural seperti ngobrol santai dengan penonton.", "recommended": False},
    {"id": "Autonoe", "name": "Autonoe", "gender": "Wanita", "category": "Wanita", "tone": "Cerah & Menarik", "style": "Engaging", "description": "Menarik perhatian sejak detik pertama.", "recommended": False},
    {"id": "Enceladus", "name": "Enceladus", "gender": "Pria", "category": "Pria", "tone": "Breathy & Intimate", "style": "Intimate", "description": "Dekat dan personal untuk refleksi atau cerita pendek.", "recommended": False},
    {"id": "Iapetus", "name": "Iapetus", "gender": "Pria", "category": "Pria", "tone": "Jernih & Artikulatif", "style": "Clear", "description": "Pelafalan presisi untuk istilah teknis.", "recommended": False},
    {"id": "Umbriel", "name": "Umbriel", "gender": "Pria", "category": "Pria", "tone": "Luwes & Netral", "style": "Neutral", "description": "Serbaguna untuk segala genre konten singkat.", "recommended": False},
    {"id": "Algieba", "name": "Algieba", "gender": "Pria", "category": "Pria", "tone": "Halus & Teratur", "style": "Smooth", "description": "Ritme stabil dan enak didengar lama.", "recommended": False},
    {"id": "Despina", "name": "Despina", "gender": "Wanita", "category": "Wanita", "tone": "Lembut & Melodis", "style": "Gentle", "description": "Lembut untuk konten wellness dan edukasi santai.", "recommended": False},
    {"id": "Erinome", "name": "Erinome", "gender": "Wanita", "category": "Wanita", "tone": "Bersih & Lugas", "style": "Crisp", "description": "Profesional dan jelas untuk tutorial.", "recommended": False},
    {"id": "Algenib", "name": "Algenib", "gender": "Pria", "category": "Pria", "tone": "Serak Berbobot", "style": "Gravelly", "description": "Karakter khas yang kuat dan mudah diingat.", "recommended": False},
    {"id": "Rasalgethi", "name": "Rasalgethi", "gender": "Pria", "category": "Pria", "tone": "Informatif & Ilmiah", "style": "Analytical", "description": "Pas untuk penjelasan sains, AI, dan arsitektur.", "recommended": False},
    {"id": "Laomedeia", "name": "Laomedeia", "gender": "Wanita", "category": "Wanita", "tone": "Ceria & Gesit", "style": "Lively", "description": "Tempo lincah untuk listicle cepat.", "recommended": False},
    {"id": "Achernar", "name": "Achernar", "gender": "Pria", "category": "Pria", "tone": "Lembut & Menyejukkan", "style": "Calm", "description": "Tenang dan mudah dicerna.", "recommended": False},
    {"id": "Alnilam", "name": "Alnilam", "gender": "Pria", "category": "Pria", "tone": "Pasti & Berwibawa", "style": "Confident", "description": "Berwibawa untuk opini dan studi kasus.", "recommended": False},
    {"id": "Schedar", "name": "Schedar", "gender": "Pria", "category": "Pria", "tone": "Seimbang & Stabil", "style": "Balanced", "description": "Seimbang antara formal dan santai.", "recommended": False},
    {"id": "Gacrux", "name": "Gacrux", "gender": "Pria", "category": "Pria", "tone": "Matang & Berpengalaman", "style": "Mature", "description": "Kesan mentor senior yang terpercaya.", "recommended": False},
    {"id": "Pulcherrima", "name": "Pulcherrima", "gender": "Wanita", "category": "Wanita", "tone": "Tegas & Berani", "style": "Bold", "description": "Vokal tegas untuk hook kontroversial/fakta tajam.", "recommended": False},
    {"id": "Achird", "name": "Achird", "gender": "Pria", "category": "Pria", "tone": "Bersahabat & Ramah", "style": "Friendly", "description": "Akrab dan mudah diterima audiens muda.", "recommended": False},
    {"id": "Zubenelgenubi", "name": "Zubenelgenubi", "gender": "Pria", "category": "Pria", "tone": "Santai & Natural", "style": "Relaxed", "description": "Gaya kasual seperti podcast pendek.", "recommended": False},
    {"id": "Vindemiatrix", "name": "Vindemiatrix", "gender": "Wanita", "category": "Wanita", "tone": "Lembut & Penuh Perhatian", "style": "Warm", "description": "Empatik dan menenangkan.", "recommended": False},
    {"id": "Sadachbia", "name": "Sadachbia", "gender": "Wanita", "category": "Wanita", "tone": "Bersemangat & Dinamis", "style": "Energetic", "description": "Penuh semangat untuk review produk dan fitur.", "recommended": False},
    {"id": "Sadaltager", "name": "Sadaltager", "gender": "Pria", "category": "Pria", "tone": "Berpengetahuan Luas", "style": "Knowledgeable", "description": "Gaya edukator yang terstruktur.", "recommended": False},
    {"id": "Sulafat", "name": "Sulafat", "gender": "Wanita", "category": "Wanita", "tone": "Hangat & Bersahaja", "style": "Approachable", "description": "Hangat dan natural untuk konten harian.", "recommended": False},
]

VALID_VOICE_IDS: frozenset[str] = frozenset(str(v["id"]) for v in AVAILABLE_VOICES)


class UnsafePathError(ValueError):
    """Dilempar ketika path melanggar batas direktori atau ekstensi yang diizinkan."""


def safe_resolve_under(
    base_dir: Path,
    filename: str,
    allowed_extensions: Iterable[str] | None = None,
) -> Path:
    """Memvalidasi nama file agar tidak keluar dari base_dir (anti path traversal)."""
    if not filename or not filename.strip():
        raise UnsafePathError("Nama file tidak boleh kosong.")

    raw = filename.strip()
    if "\x00" in raw or "/" in raw or "\\" in raw or raw in (".", ".."):
        raise UnsafePathError("Nama file mengandung karakter path yang tidak diizinkan.")

    clean_name = Path(raw).name
    if clean_name != raw:
        raise UnsafePathError("Path traversal terdeteksi pada nama file.")

    base_resolved = base_dir.resolve()
    target = (base_resolved / clean_name).resolve()

    if not target.is_relative_to(base_resolved):
        raise UnsafePathError("Akses file di luar direktori yang diizinkan ditolak.")

    if allowed_extensions is not None:
        exts = tuple(ext.lower() for ext in allowed_extensions)
        if target.suffix.lower() not in exts:
            raise UnsafePathError(
                f"Ekstensi file tidak diizinkan. Gunakan salah satu dari: {', '.join(exts)}."
            )

    return target
