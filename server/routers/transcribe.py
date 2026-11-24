"""Endpoint transkripsi audio word-level (dari disk maupun upload lokal) bebas path traversal."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from server.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    OUTPUT_AUDIO_DIR,
    UnsafePathError,
    safe_resolve_under,
)
from server.schemas import TranscribeRequest, TranscribeResponse
from server.services.audio_utils import atomic_write_bytes, unique_slug_filename
from server.services.gemini_client import GeminiConfigError, is_gemini_overload_error
from server.services.transcribe_service import transcribe_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Transcribe"])

_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("/transcribe", response_model=TranscribeResponse)
async def api_transcribe(req: TranscribeRequest) -> TranscribeResponse:
    try:
        return await asyncio.to_thread(transcribe_audio, req.audio_file)
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GeminiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gagal mentranskripsi audio '%s'", req.audio_file)
        if is_gemini_overload_error(exc):
            raise HTTPException(
                status_code=503,
                detail="Server Gemini lagi padat/sibuk (503). Tunggu beberapa detik lalu klik Generate ulang.",
            ) from exc
        raise HTTPException(
            status_code=500, detail="Gagal memproses transkripsi audio."
        ) from exc


@router.post("/transcribe/upload", response_model=TranscribeResponse)
async def api_transcribe_upload(file: UploadFile = File(...)) -> TranscribeResponse:
    raw_name = (file.filename or "audio.wav").strip()
    ext = Path(raw_name).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format audio tidak didukung. Gunakan: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File audio kosong.")
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Ukuran file maksimal 50 MB.")

    safe_name = unique_slug_filename(Path(raw_name).stem, ext)
    try:
        target_path = safe_resolve_under(OUTPUT_AUDIO_DIR, safe_name, ALLOWED_AUDIO_EXTENSIONS)
        await asyncio.to_thread(atomic_write_bytes, target_path, data)
        return await asyncio.to_thread(transcribe_audio, target_path.name)
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except GeminiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gagal memproses upload transkripsi '%s'", raw_name)
        if is_gemini_overload_error(exc):
            raise HTTPException(
                status_code=503,
                detail="Server Gemini lagi padat/sibuk (503). Tunggu beberapa detik lalu klik Generate ulang.",
            ) from exc
        raise HTTPException(
            status_code=500, detail="Gagal memproses upload dan transkripsi audio."
        ) from exc
