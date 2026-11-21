"""Endpoint health-check model aktif dan riwayat aset studio."""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Query

from server.config import AVAILABLE_VOICES, OFFICIAL_VOCAL_TAGS
from server.schemas import HistoryItem
from server.services.gemini_client import detect_active_model, is_configured
from server.services.history_service import get_history_items

router = APIRouter(prefix="/api", tags=["System"])


@router.get("/health")
async def api_health(refresh: bool = Query(default=False)) -> dict[str, Any]:
    detected = await asyncio.to_thread(detect_active_model, refresh)
    return {
        "status": "ok",
        "version": "3.0.0",
        "gemini_api_configured": is_configured(),
        "detected_model": detected,
        "voices_count": len(AVAILABLE_VOICES),
        "tags_count": len(OFFICIAL_VOCAL_TAGS),
    }


@router.get("/history", response_model=list[HistoryItem])
async def api_history(limit: int = Query(default=50, ge=1, le=200)) -> list[HistoryItem]:
    return await asyncio.to_thread(get_history_items, limit)
