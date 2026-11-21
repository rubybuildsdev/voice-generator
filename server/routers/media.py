"""Endpoint penyajian file media WAV, VTT, dan JSON yang aman dengan cache terkontrol."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from server.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    ALLOWED_TRANSCRIPT_EXTENSIONS,
    OUTPUT_AUDIO_DIR,
    OUTPUT_TRANSCRIPTS_DIR,
    UnsafePathError,
    safe_resolve_under,
)

router = APIRouter(prefix="/api", tags=["Media"])


@router.get("/audio/{filename}")
async def serve_audio(filename: str) -> FileResponse:
    try:
        target = safe_resolve_under(OUTPUT_AUDIO_DIR, filename, ALLOWED_AUDIO_EXTENSIONS)
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File audio tidak ditemukan.")

    return FileResponse(
        path=target,
        media_type="audio/wav",
        filename=target.name,
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache, must-revalidate",
        },
    )


@router.get("/transcripts/{filename}")
async def serve_transcript(filename: str) -> FileResponse:
    try:
        target = safe_resolve_under(
            OUTPUT_TRANSCRIPTS_DIR, filename, ALLOWED_TRANSCRIPT_EXTENSIONS
        )
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File transkrip tidak ditemukan.")

    media_type = "text/vtt; charset=utf-8" if target.suffix.lower() == ".vtt" else "application/json"
    return FileResponse(
        path=target,
        media_type=media_type,
        filename=target.name,
        headers={"Cache-Control": "no-cache, must-revalidate"},
    )
