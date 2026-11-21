from fastapi import APIRouter, HTTPException
from server.schemas import ScriptRequest, ScriptResponse, AutoTagRequest, AutoTagResponse
from server.services import gemini_service

router = APIRouter(prefix="/api/scripts", tags=["Scripts"])

@router.post("/generate", response_model=ScriptResponse)
async def generate_script_endpoint(req: ScriptRequest):
    """
    Generate Naskah H-A-M-P Siap Rekam dengan Auto Inline Vocal Tags
    Merancang naskah percakapan edukatif santai (Hook 0-3s, Agitasi 4-15s, Mekanisme 15-38s, Payoff 38s-selesai)
    lengkap dengan Visual Receipts, SFX, dan inline vocal tags resmi Gemini TTS.
    """
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Judul video tidak boleh kosong.")
    try:
        result = gemini_service.generate_hamp_script(
            title=req.title,
            topic_context=req.topic_context or "",
            voice_style=req.voice_style or "conversational",
            auto_tag=req.auto_tag if req.auto_tag is not None else True
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-tag", response_model=AutoTagResponse)
async def auto_tag_endpoint(req: AutoTagRequest):
    """
    Menyisipkan Inline Vocal Tags resmi Gemini secara otomatis ke naskah eksternal/mentah.
    Tag disisipkan secara natural dan proporsional (3-6 tag per naskah).
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Teks naskah tidak boleh kosong.")
    try:
        result = gemini_service.auto_tag_text(req.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
