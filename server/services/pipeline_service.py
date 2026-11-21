"""Orkestrator studio untuk mode Auto, Title, Script, Voice, dan Transcribe."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any

from server.config import OFFICIAL_VOCAL_TAGS
from server.schemas import (
    PipelineRequest,
    PipelineResponse,
    ScriptResponse,
    TitleResponse,
    TranscribeResponse,
    TTSResponse,
)
from server.services.script_service import auto_tag_text, generate_script
from server.services.title_service import generate_titles
from server.services.transcribe_service import transcribe_audio
from server.services.tts_service import generate_tts

logger = logging.getLogger(__name__)

_VOCAL_TAG_TOKENS = tuple(item["tag"] for item in OFFICIAL_VOCAL_TAGS)


def resolve_intent(req: PipelineRequest) -> str:
    """Menentukan intent efektif secara deterministik."""
    if req.intent != "auto":
        return req.intent

    text = (req.script_text or req.prompt or "").strip()
    if text.lower().endswith(".wav") and " " not in text:
        return "transcribe"

    has_vocal_tag = any(tag in text for tag in _VOCAL_TAG_TOKENS)
    word_count = len(text.split())
    if has_vocal_tag or word_count > 40:
        return "voice_only"
    return "title"


def compute_steps(effective_intent: str, auto_proceed: bool) -> list[str]:
    """Menentukan daftar tahap yang dijalankan sesuai mode."""
    if effective_intent == "title":
        return ["title", "script", "tts", "transcribe"] if auto_proceed else ["title"]
    if effective_intent == "script":
        return ["script", "tts", "transcribe"] if auto_proceed else ["script"]
    if effective_intent == "voice_only":
        return ["tts", "transcribe"]
    if effective_intent == "transcribe":
        return ["transcribe"]
    return ["title"]


def _sse_event(event: str, payload: dict[str, Any]) -> dict[str, str]:
    payload.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    return {"event": event, "data": json.dumps(payload, ensure_ascii=False)}


async def stream_pipeline(req: PipelineRequest) -> AsyncIterator[dict[str, str]]:
    """Menjalankan tahap produksi secara non-blocking dan mengalirkan event SSE."""
    started_at = time.perf_counter()
    effective_intent = resolve_intent(req)
    steps = compute_steps(effective_intent, req.auto_proceed)
    total_steps = len(steps)

    yield _sse_event(
        "log",
        {
            "step": "init",
            "stage": "init",
            "message": f"Memulai mode '{effective_intent}' ({total_steps} tahap)...",
            "progress": 5,
            "steps": steps,
        },
    )

    title_data: TitleResponse | None = None
    script_data: ScriptResponse | None = None
    tts_data: TTSResponse | None = None
    transcribe_data: TranscribeResponse | None = None

    current_title = (req.title or req.prompt[:80]).strip()
    current_script = (req.script_text or "").strip()

    try:
        completed = 0

        if "title" in steps:
            yield _sse_event(
                "step_start",
                {
                    "step": "title",
                    "stage": "title",
                    "message": "Meriset formula judul viral & konsep thumbnail...",
                    "progress": int((completed / total_steps) * 100),
                },
            )
            title_data = await asyncio.to_thread(generate_titles, req.prompt, 3, True)
            if not req.title and title_data.recommendations:
                current_title = title_data.recommendations[0].title
            completed += 1
            yield _sse_event(
                "step_complete",
                {
                    "step": "title",
                    "stage": "title",
                    "message": f"Judul terpilih: {current_title}",
                    "progress": int((completed / total_steps) * 100),
                    "payload": title_data.model_dump(),
                },
            )

        if "script" in steps:
            yield _sse_event(
                "step_start",
                {
                    "step": "script",
                    "stage": "script",
                    "message": "Menyusun naskah H-A-M-P...",
                    "progress": int((completed / total_steps) * 100),
                },
            )
            script_data = await asyncio.to_thread(
                generate_script,
                current_title,
                req.prompt,
                "conversational",
                req.auto_tag,
                current_script if req.intent == "script" and current_script else "",
            )
            current_script = script_data.tagged_text if req.auto_tag else script_data.clean_text
            completed += 1
            yield _sse_event(
                "step_complete",
                {
                    "step": "script",
                    "stage": "script",
                    "message": f"Naskah selesai ({script_data.word_count} kata, ~{script_data.estimated_duration_sec}s).",
                    "progress": int((completed / total_steps) * 100),
                    "payload": script_data.model_dump(),
                },
            )

        if "tts" in steps:
            yield _sse_event(
                "step_start",
                {
                    "step": "tts",
                    "stage": "tts",
                    "message": f"Mensintesis voice-over studio ({req.voice})...",
                    "progress": int((completed / total_steps) * 100),
                },
            )
            tts_source = current_script or req.prompt
            if effective_intent == "voice_only" and req.auto_tag:
                has_tags = any(tag in tts_source for tag in _VOCAL_TAG_TOKENS)
                if not has_tags:
                    tagged_res = await asyncio.to_thread(auto_tag_text, tts_source)
                    tts_source = tagged_res.tagged_text

            tts_data = await asyncio.to_thread(
                generate_tts,
                tts_source,
                req.voice,
                current_title,
            )
            completed += 1
            yield _sse_event(
                "step_complete",
                {
                    "step": "tts",
                    "stage": "tts",
                    "message": f"Audio WAV siap ({tts_data.duration_sec}s / {tts_data.duration_frames} frames).",
                    "progress": int((completed / total_steps) * 100),
                    "payload": tts_data.model_dump(),
                },
            )

        if "transcribe" in steps:
            target_audio = tts_data.filename if tts_data is not None else req.prompt.strip()
            yield _sse_event(
                "step_start",
                {
                    "step": "transcribe",
                    "stage": "transcribe",
                    "message": f"Mengekstrak word-level timestamps ({target_audio})...",
                    "progress": int((completed / total_steps) * 100),
                },
            )
            transcribe_data = await asyncio.to_thread(transcribe_audio, target_audio)
            completed += 1
            yield _sse_event(
                "step_complete",
                {
                    "step": "transcribe",
                    "stage": "transcribe",
                    "message": f"Transkripsi selesai ({transcribe_data.word_count} kata tersinkronisasi).",
                    "progress": 100,
                    "payload": transcribe_data.model_dump(),
                },
            )

        elapsed = round(time.perf_counter() - started_at, 2)
        final_response = PipelineResponse(
            intent=effective_intent,
            title_data=title_data,
            script_data=script_data,
            tts_data=tts_data,
            transcribe_data=transcribe_data,
            execution_time_sec=elapsed,
        )
        yield _sse_event(
            "pipeline_complete",
            {
                "step": "done",
                "stage": "done",
                "message": f"Selesai dalam {elapsed} detik.",
                "progress": 100,
                "payload": final_response.model_dump(),
            },
        )
    except Exception:
        logger.exception("Kesalahan saat menjalankan pipeline SSE")
        yield _sse_event(
            "error",
            {
                "step": "error",
                "stage": "error",
                "message": "Terjadi kesalahan saat memproses permintaan. Periksa input dan log server.",
                "progress": 0,
            },
        )


async def run_pipeline_sync(req: PipelineRequest) -> PipelineResponse:
    """Menjalankan tahap produksi non-streaming."""
    started_at = time.perf_counter()
    effective_intent = resolve_intent(req)
    steps = compute_steps(effective_intent, req.auto_proceed)

    title_data: TitleResponse | None = None
    script_data: ScriptResponse | None = None
    tts_data: TTSResponse | None = None
    transcribe_data: TranscribeResponse | None = None

    current_title = (req.title or req.prompt[:80]).strip()
    current_script = (req.script_text or "").strip()

    if "title" in steps:
        title_data = await asyncio.to_thread(generate_titles, req.prompt, 3, True)
        if not req.title and title_data.recommendations:
            current_title = title_data.recommendations[0].title

    if "script" in steps:
        script_data = await asyncio.to_thread(
            generate_script,
            current_title,
            req.prompt,
            "conversational",
            req.auto_tag,
            current_script if req.intent == "script" and current_script else "",
        )
        current_script = script_data.tagged_text if req.auto_tag else script_data.clean_text

    if "tts" in steps:
        tts_source = current_script or req.prompt
        if effective_intent == "voice_only" and req.auto_tag:
            if not any(tag in tts_source for tag in _VOCAL_TAG_TOKENS):
                tagged_res = await asyncio.to_thread(auto_tag_text, tts_source)
                tts_source = tagged_res.tagged_text
        tts_data = await asyncio.to_thread(generate_tts, tts_source, req.voice, current_title)

    if "transcribe" in steps:
        target_audio = tts_data.filename if tts_data is not None else req.prompt.strip()
        transcribe_data = await asyncio.to_thread(transcribe_audio, target_audio)

    return PipelineResponse(
        intent=effective_intent,
        title_data=title_data,
        script_data=script_data,
        tts_data=tts_data,
        transcribe_data=transcribe_data,
        execution_time_sec=round(time.perf_counter() - started_at, 2),
    )
