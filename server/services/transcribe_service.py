"""Layanan transkripsi audio word-level aman (anti path traversal & cleanup Gemini Files)."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from server.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    OUTPUT_AUDIO_DIR,
    OUTPUT_TRANSCRIPTS_DIR,
    TRANSCRIBE_MODEL,
    safe_resolve_under,
)
from server.schemas import TranscribeResponse, WordTimestamp
from server.services.audio_utils import atomic_write_text, generate_vtt, get_wav_info
from server.services.gemini_client import extract_response_text, get_client

logger = logging.getLogger(__name__)


def _parse_words_payload(raw_text: str) -> list[WordTimestamp]:
    cleaned = raw_text.strip()
    fence_match = re.search(r"```(?:json)?\s*([\[\{].*?[\]\}])\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1)

    parsed: Any = json.loads(cleaned)
    items = parsed.get("words", []) if isinstance(parsed, dict) else parsed
    if not isinstance(items, list):
        return []

    words: list[WordTimestamp] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        word_text = str(item.get("text") or item.get("word") or "").strip()
        if not word_text:
            continue
        try:
            start_sec = max(0.0, float(item.get("startSec", item.get("start", 0.0))))
            end_sec = max(start_sec, float(item.get("endSec", item.get("end", start_sec + 0.1))))
        except (TypeError, ValueError):
            continue
        words.append(WordTimestamp(text=word_text, startSec=round(start_sec, 3), endSec=round(end_sec, 3)))
    return words


def transcribe_audio(audio_file: str) -> TranscribeResponse:
    """Mentranskripsi file WAV di OUTPUT_AUDIO_DIR menjadi JSON word-level dan WebVTT.

    - Memvalidasi nama file agar bebas path traversal.
    - Melempar FileNotFoundError jika file tidak ditemukan (tanpa silent fallback).
    - Selalu menghapus file yang diunggah di Gemini Files API melalui blok finally.
    """
    target_path = safe_resolve_under(OUTPUT_AUDIO_DIR, audio_file, ALLOWED_AUDIO_EXTENSIONS)
    if not target_path.exists() or not target_path.is_file():
        raise FileNotFoundError(f"File audio '{target_path.name}' tidak ditemukan.")

    client = get_client()
    uploaded_file = None
    try:
        uploaded_file = client.files.upload(file=str(target_path))
        prompt = (
            "Transkripsikan audio ini secara akurat kata per kata beserta timestamp detik mulai dan selesai.\n"
            "Kembalikan HANYA JSON valid dengan format:\n"
            '{"words": [{"text": "kata", "startSec": 0.0, "endSec": 0.35}]}'
        )
        response = client.models.generate_content(
            model=TRANSCRIBE_MODEL,
            contents=[uploaded_file, prompt],
            config={"response_mime_type": "application/json", "temperature": 0.0},
        )
        raw_text = extract_response_text(response)
        if not raw_text:
            raise RuntimeError("Model transkripsi mengembalikan respons kosong.")
        words = _parse_words_payload(raw_text)
    finally:
        if uploaded_file is not None and getattr(uploaded_file, "name", None):
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception as cleanup_exc:
                logger.warning("Gagal menghapus file sementara di Gemini Files API: %s", cleanup_exc)

    if not words:
        raise RuntimeError("Transkripsi berhasil diproses tetapi tidak ada kata yang terdeteksi.")

    vtt_content = generate_vtt(words)
    OUTPUT_TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    stem = target_path.stem
    vtt_name = f"{stem}.vtt"
    json_name = f"{stem}.json"

    vtt_path = OUTPUT_TRANSCRIPTS_DIR / vtt_name
    json_path = OUTPUT_TRANSCRIPTS_DIR / json_name

    atomic_write_text(vtt_path, vtt_content)
    atomic_write_text(
        json_path,
        json.dumps([w.model_dump() for w in words], ensure_ascii=False, indent=2),
    )

    wav_info = get_wav_info(target_path)
    duration_sec = float(wav_info["duration_sec"]) or words[-1].endSec

    return TranscribeResponse(
        filename=target_path.name,
        words=words,
        vtt_content=vtt_content,
        vtt_url=f"/api/transcripts/{vtt_name}",
        json_url=f"/api/transcripts/{json_name}",
        word_count=len(words),
        duration_sec=round(duration_sec, 3),
    )
