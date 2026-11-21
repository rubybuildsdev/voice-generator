"""Endpoint transkripsi audio word-level dengan perlindungan path traversal."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException

from server.config import UnsafePathError
from server.schemas import TranscribeRequest, TranscribeResponse
from server.services.gemini_client import GeminiConfigError
from server.services.transcribe_service import transcribe_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Transcribe"])


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
        raise HTTPException(
            status_code=500, detail="Gagal memproses transkripsi audio."
        ) from exc
