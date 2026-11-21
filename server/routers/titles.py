"""Endpoint riset judul, chat brainstorming, dan simpan judul."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException

from server.schemas import (
    SaveTitleRequest,
    SaveTitleResponse,
    TitleChatRequest,
    TitleChatResponse,
    TitleRequest,
    TitleResponse,
)
from server.services.gemini_client import GeminiConfigError
from server.services.title_service import (
    chat_title_discussion,
    generate_titles,
    save_title,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/titles", tags=["Titles"])


@router.post("/generate", response_model=TitleResponse)
async def api_generate_titles(req: TitleRequest) -> TitleResponse:
    try:
        return await asyncio.to_thread(generate_titles, req.topic, req.count, True)
    except GeminiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gagal menghasilkan rekomendasi judul")
        raise HTTPException(
            status_code=500, detail="Gagal menghasilkan rekomendasi judul."
        ) from exc


@router.post("/chat", response_model=TitleChatResponse)
async def api_chat_titles(req: TitleChatRequest) -> TitleChatResponse:
    try:
        return await asyncio.to_thread(chat_title_discussion, req.messages)
    except GeminiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gagal memproses chat brainstorming judul")
        raise HTTPException(
            status_code=500, detail="Gagal memproses diskusi judul."
        ) from exc


@router.post("/save", response_model=SaveTitleResponse)
async def api_save_title(req: SaveTitleRequest) -> SaveTitleResponse:
    try:
        return await asyncio.to_thread(
            save_title, req.title, req.formula, req.why_it_works
        )
    except Exception as exc:
        logger.exception("Gagal menyimpan judul ke disk")
        raise HTTPException(
            status_code=500, detail="Gagal menyimpan judul terpilih."
        ) from exc
