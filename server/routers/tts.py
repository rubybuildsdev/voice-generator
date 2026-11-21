"""Endpoint Text-to-Speech, katalog 31 suara studio, dan daftar vocal tags."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from server.config import (
    AVAILABLE_VOICES,
    DEFAULT_VOICE,
    OFFICIAL_VOCAL_TAGS,
    UnsafePathError,
)
from server.schemas import TTSRequest, TTSResponse
from server.services.gemini_client import GeminiConfigError
from server.services.tts_service import generate_tts

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tts", tags=["TTS"])


@router.post("/generate", response_model=TTSResponse)
async def api_generate_tts(req: TTSRequest) -> TTSResponse:
    try:
        return await asyncio.to_thread(
            generate_tts, req.text, req.voice, req.filename, req.style
        )
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except GeminiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gagal mensintesis audio TTS")
        raise HTTPException(
            status_code=500, detail="Gagal menghasilkan audio voice-over."
        ) from exc


@router.get("/voices")
async def api_list_voices() -> dict[str, Any]:
    return {
        "default_voice": DEFAULT_VOICE,
        "count": len(AVAILABLE_VOICES),
        "voices": AVAILABLE_VOICES,
    }


@router.get("/tags")
async def api_list_tags() -> dict[str, Any]:
    return {
        "count": len(OFFICIAL_VOCAL_TAGS),
        "tags": OFFICIAL_VOCAL_TAGS,
    }
