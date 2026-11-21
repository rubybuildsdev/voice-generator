"""Endpoint pipeline streaming SSE (POST-only) dan eksekusi penuh."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from server.schemas import PipelineRequest, PipelineResponse
from server.services.gemini_client import GeminiConfigError
from server.services.pipeline_service import run_pipeline_sync, stream_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


@router.post("/stream")
async def api_pipeline_stream(req: PipelineRequest) -> EventSourceResponse:
    """Menjalankan pipeline produksi via POST SSE (aman untuk naskah panjang)."""
    return EventSourceResponse(stream_pipeline(req))


@router.post("/run", response_model=PipelineResponse)
async def api_pipeline_run(req: PipelineRequest) -> PipelineResponse:
    try:
        return await run_pipeline_sync(req)
    except GeminiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gagal menjalankan pipeline")
        raise HTTPException(
            status_code=500, detail="Gagal menyelesaikan eksekusi pipeline."
        ) from exc
