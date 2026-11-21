"""Endpoint generasi naskah H-A-M-P dan auto-tagging vokal."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException

from server.schemas import (
    AutoTagRequest,
    AutoTagResponse,
    ScriptRequest,
    ScriptResponse,
)
from server.services.gemini_client import GeminiConfigError
from server.services.script_service import auto_tag_text, generate_script

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scripts", tags=["Scripts"])


@router.post("/generate", response_model=ScriptResponse)
async def api_generate_script(req: ScriptRequest) -> ScriptResponse:
    try:
        return await asyncio.to_thread(
            generate_script,
            req.title,
            req.topic_context,
            req.voice_style,
            req.auto_tag,
            req.custom_instructions,
        )
    except GeminiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gagal menghasilkan naskah H-A-M-P")
        raise HTTPException(
            status_code=500, detail="Gagal menghasilkan naskah video."
        ) from exc


@router.post("/auto-tag", response_model=AutoTagResponse)
async def api_auto_tag(req: AutoTagRequest) -> AutoTagResponse:
    try:
        return await asyncio.to_thread(auto_tag_text, req.text)
    except GeminiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gagal menyisipkan vocal tags")
        raise HTTPException(
            status_code=500, detail="Gagal menyisipkan vocal tags pada naskah."
        ) from exc
