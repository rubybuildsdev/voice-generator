"""Layanan transkripsi audio word-level aman (anti path traversal, cleanup Gemini Files, & kalibrasi durasi)."""

from __future__ import annotations

import json
import logging
from pathlib import Path
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

    words: list[WordTimestamp] = []
    try:
        parsed: Any = json.loads(cleaned)
        items = parsed.get("words", []) if isinstance(parsed, dict) else parsed
        if isinstance(items, list):
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
                words.append(
                    WordTimestamp(
                        text=word_text,
                        startSec=round(start_sec, 3),
                        endSec=round(end_sec, 3),
                    )
                )
    except Exception:
        # Fallback parsing jika JSON terpotong di akhir (truncation)
        pass

    if not words:
        # Ekstraksi tangguh berbasis regex untuk setiap objek word timestamp yang lengkap
        pattern = re.compile(
            r'\{\s*"(?:text|word)"\s*:\s*"([^"]+)"\s*,\s*"(?:startSec|start)"\s*:\s*([0-9.]+)\s*,\s*"(?:endSec|end)"\s*:\s*([0-9.]+)\s*\}'
        )
        for match in pattern.finditer(cleaned):
            w_text, s_str, e_str = match.groups()
            try:
                s_val = max(0.0, float(s_str))
                e_val = max(s_val, float(e_str))
                words.append(
                    WordTimestamp(
                        text=w_text.strip(),
                        startSec=round(s_val, 3),
                        endSec=round(e_val, 3),
                    )
                )
            except (TypeError, ValueError):
                continue

    return words


def calibrate_word_timestamps(
    words: list[WordTimestamp],
    actual_duration_sec: float,
) -> list[WordTimestamp]:
    """Menyelaraskan timestamp kata jika model LLM mengalami drift melebihi durasi WAV asli."""
    if not words or actual_duration_sec <= 0:
        return words

    max_end = max(w.endSec for w in words)
    if max_end <= 0:
        return words

    # Jika timestamp melenceng melewati durasi WAV asli (atau jauh lebih pendek), skalakan proporsional
    needs_scale = max_end > actual_duration_sec or max_end < actual_duration_sec * 0.70
    scale = (actual_duration_sec / max_end) if needs_scale else 1.0

    calibrated: list[WordTimestamp] = []
    prev_end = 0.0
    for w in words:
        s = min(actual_duration_sec, max(prev_end, round(w.startSec * scale, 3)))
        e = min(actual_duration_sec, max(s + 0.02, round(w.endSec * scale, 3)))
        if s >= actual_duration_sec:
            s = max(0.0, round(actual_duration_sec - 0.05, 3))
            e = round(actual_duration_sec, 3)
        prev_end = e
        calibrated.append(WordTimestamp(text=w.text, startSec=s, endSec=e))

    return calibrated


def transcribe_audio(audio_file: str) -> TranscribeResponse:
    """Mentranskripsi file WAV di OUTPUT_AUDIO_DIR menjadi JSON word-level dan WebVTT."""
    clean_filename = Path(audio_file).name if audio_file else ""
    target_path = safe_resolve_under(OUTPUT_AUDIO_DIR, clean_filename, ALLOWED_AUDIO_EXTENSIONS)
    if not target_path.exists() or not target_path.is_file():
        raise FileNotFoundError(f"File audio '{target_path.name}' tidak ditemukan.")

    wav_info = get_wav_info(target_path)
    actual_duration_sec = float(wav_info["duration_sec"])

    client = get_client()
    uploaded_file = None
    try:
        uploaded_file = client.files.upload(file=str(target_path))
        duration_hint = (
            f"Durasi total audio ini TEPAT {actual_duration_sec:.3f} detik. "
            f"Seluruh nilai startSec dan endSec WAJIB berada di antara 0.0 dan {actual_duration_sec:.3f} detik.\n"
            if actual_duration_sec > 0
            else ""
        )
        prompt = (
            "Transkripsikan audio ini secara akurat kata per kata beserta timestamp detik mulai dan selesai.\n"
            f"{duration_hint}"
            "Kembalikan HANYA JSON valid dengan format:\n"
            '{"words": [{"text": "kata", "startSec": 0.0, "endSec": 0.35}]}'
        )

        models_to_try = [TRANSCRIBE_MODEL]
        for fallback_m in ("gemini-2.5-flash", "gemini-3.5-flash-lite"):
            if fallback_m not in models_to_try:
                models_to_try.append(fallback_m)

        raw_text = None
        last_exc: Exception | None = None
        for candidate_model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=candidate_model,
                    contents=[uploaded_file, prompt],
                    config={
                        "response_mime_type": "application/json",
                        "temperature": 0.0,
                        "max_output_tokens": 16384,
                    },
                )
                candidate_text = extract_response_text(response)
                if candidate_text:
                    raw_text = candidate_text
                    logger.info("Transkripsi berhasil diproses menggunakan model %s", candidate_model)
                    break
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "Transkripsi dengan model '%s' gagal: %s. Mencoba model alternatif...",
                    candidate_model,
                    exc,
                )

        if not raw_text:
            if last_exc:
                raise last_exc
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

    if actual_duration_sec > 0:
        words = calibrate_word_timestamps(words, actual_duration_sec)

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

    duration_sec = actual_duration_sec or words[-1].endSec

    return TranscribeResponse(
        filename=target_path.name,
        words=words,
        vtt_content=vtt_content,
        vtt_url=f"/api/transcripts/{vtt_name}",
        json_url=f"/api/transcripts/{json_name}",
        word_count=len(words),
        duration_sec=round(duration_sec, 3),
    )
