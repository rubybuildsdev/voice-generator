"""Endpoint health-check model aktif dan manajemen riwayat aset studio."""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from server.config import AVAILABLE_VOICES, OFFICIAL_VOCAL_TAGS, UnsafePathError
from server.schemas import HistoryItem
from server.services.gemini_client import detect_active_model, is_configured
from server.services.history_service import (
    delete_history_asset,
    get_asset_content,
    get_history_items,
)

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
async def api_history(limit: int = Query(default=60, ge=1, le=200)) -> list[HistoryItem]:
    return await asyncio.to_thread(get_history_items, limit)


@router.get("/history/{item_type}/{filename}")
async def api_get_history_asset(item_type: str, filename: str) -> dict[str, str]:
    try:
        return await asyncio.to_thread(get_asset_content, item_type, filename)
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/history/{item_type}/{filename}")
async def api_delete_history_asset(item_type: str, filename: str) -> dict[str, object]:
    try:
        return await asyncio.to_thread(delete_history_asset, item_type, filename)
    except UnsafePathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
