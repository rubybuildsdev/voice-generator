from fastapi import APIRouter
from server.config import GEMINI_API_KEY, TEXT_MODEL, TTS_MODEL, TRANSCRIBE_MODEL, AVAILABLE_VOICES, OFFICIAL_VOCAL_TAGS
from server.services import gemini_service

router = APIRouter(prefix="/api", tags=["System & History"])

@router.get("/health")
async def health_check():
    """
    Status server, kesiapan kunci API Gemini, dan auto-deteksi model aktif yang bisa dipanggil oleh API Key.
    """
    has_key = bool(GEMINI_API_KEY and len(GEMINI_API_KEY) > 10)
    detected = gemini_service.detect_active_model() if has_key else {
        "model_id": TEXT_MODEL,
        "display_name": "API Key Missing",
        "status": "unconfigured"
    }
    return {
        "status": "online",
        "service": "AI Faceless Video Production Engine",
        "gemini_api_configured": has_key,
        "detected_model": detected,
        "models": {
            "text_model": detected.get("model_id", TEXT_MODEL),
            "display_name": detected.get("display_name", "Gemini 3.8 Flash"),
            "tts_model": TTS_MODEL,
            "transcribe_model": TRANSCRIBE_MODEL
        },
        "voices_count": len(AVAILABLE_VOICES),
        "tags_count": len(OFFICIAL_VOCAL_TAGS)
    }

@router.get("/history")
async def list_history():
    """
    Riwayat file audio dan subtitle yang pernah di-generate sebelumnya di workspace.
    """
    items = gemini_service.get_history_items()
    return {
        "success": True,
        "total": len(items),
        "items": items
    }
