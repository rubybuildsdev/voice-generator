from fastapi import APIRouter, HTTPException
from server.schemas import TranscribeRequest, TranscribeResponse
from server.services import gemini_service

router = APIRouter(prefix="/api/transcribe", tags=["Transcribe"])

@router.post("", response_model=TranscribeResponse)
async def transcribe_endpoint(req: TranscribeRequest = TranscribeRequest()):
    """
    Transkripsi Kata per Kata (Word-Level Subtitles) dengan Gemini 3.5 Transcribe
    Mengekstrak offset milidetik startSec dan endSec untuk tiap kata.
    Otomatis menghasilkan JSON kata dan format WebVTT (.vtt) untuk subtitle kinetik Remotion.
    """
    try:
        result = gemini_service.transcribe_audio(req.audio_file)
        return result
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
