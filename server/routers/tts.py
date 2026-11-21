from fastapi import APIRouter, HTTPException
from server.schemas import TTSRequest, TTSResponse
from server.config import AVAILABLE_VOICES, OFFICIAL_VOCAL_TAGS
from server.services import gemini_service

router = APIRouter(prefix="/api/tts", tags=["TTS"])

@router.post("/generate", response_model=TTSResponse)
async def generate_tts_endpoint(req: TTSRequest):
    """
    Sintesis Audio Voice-Over dengan Gemini 3.8 Flash TTS
    Mengonversi naskah bersuara ke format audio WAV mono 24 kHz berkualitas tinggi.
    Otomatis menghitung durasi audio presisi dan total frames untuk Remotion @ 30 FPS.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Teks naskah audio tidak boleh kosong.")
    try:
        result = gemini_service.generate_tts(
            text=req.text,
            voice=req.voice or "Kore",
            filename=req.filename,
            style=req.style
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def get_voices_endpoint():
    """
    Daftar profil suara resmi Gemini TTS beserta karakteristik tone, gender, dan gaya vokal.
    """
    return {
        "success": True,
        "voices": AVAILABLE_VOICES,
        "default_voice": "Kore"
    }

@router.get("/tags")
async def get_tags_endpoint():
    """
    Daftar resmi Google Gemini Inline Vocal Tags yang didukung.
    """
    return {
        "success": True,
        "tags": OFFICIAL_VOCAL_TAGS
    }
