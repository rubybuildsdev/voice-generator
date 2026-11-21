import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from server.config import OUTPUT_AUDIO_DIR, OUTPUT_TRANSCRIPTS_DIR

router = APIRouter(prefix="/api", tags=["Media & Files"])

@router.get("/audio/{filename}")
async def get_audio_file(filename: str):
    """
    Melayani streaming dan download file audio WAV dengan header audio/wav.
    Mendukung seeking audio player browser HTML5.
    """
    # Sanitize filename
    clean_name = Path(filename).name
    candidates = [
        OUTPUT_AUDIO_DIR / clean_name,
        OUTPUT_AUDIO_DIR / f"{clean_name}.wav"
    ]
    for c in candidates:
        if c.is_file():
            return FileResponse(
                path=c,
                media_type="audio/wav",
                filename=c.name,
                headers={
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600"
                }
            )
    raise HTTPException(status_code=404, detail=f"File audio '{clean_name}' tidak ditemukan.")

@router.get("/transcripts/{filename}")
async def get_transcript_file(filename: str):
    """
    Melayani file WebVTT (.vtt) dan JSON data kata kata per kata.
    """
    clean_name = Path(filename).name
    candidates = [
        OUTPUT_TRANSCRIPTS_DIR / clean_name,
        OUTPUT_TRANSCRIPTS_DIR / f"{clean_name}.json",
        OUTPUT_TRANSCRIPTS_DIR / f"{clean_name}.vtt",
    ]
    for c in candidates:
        if c.is_file():
            if c.suffix.lower() == ".vtt":
                return PlainTextResponse(content=c.read_text(encoding="utf-8"), media_type="text/vtt")
            else:
                return FileResponse(path=c, media_type="application/json")

    raise HTTPException(status_code=404, detail=f"File transkrip '{clean_name}' tidak ditemukan.")
