"""Utilitas audio WAV, slug nama file anti-kolisi, dan formatter WebVTT bebas bug."""

from __future__ import annotations

import io
import math
import os
import re
import uuid
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from server.config import (
    DEFAULT_CHANNELS,
    DEFAULT_SAMPLE_RATE,
    DEFAULT_SAMPLE_WIDTH,
    REMOTION_FPS,
)
from server.schemas import WordTimestamp


def slugify(text: str, max_length: int = 48) -> str:
    """Mengubah judul menjadi slug URL/filename aman."""
    normalized = text.lower().strip()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = normalized.strip("-")
    if not normalized:
        return "voice-studio"
    return normalized[:max_length].rstrip("-") or "voice-studio"


def unique_slug_filename(base_title: str, ext: str = ".wav") -> str:
    """Menghasilkan nama file unik (slug + UTC timestamp + 6-char hex) untuk mencegah kolisi."""
    slug = slugify(base_title)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    short_id = uuid.uuid4().hex[:6]
    normalized_ext = ext if ext.startswith(".") else f".{ext}"
    return f"{slug}-{stamp}-{short_id}{normalized_ext}"


def format_vtt_time(seconds: float) -> str:
    """Memformat detik ke HH:MM:SS.mmm secara presisi dengan pembulatan half-up.

    Menghindari bug pembulatan seperti 00:00:60.000 atau .1000.
    """
    safe_sec = max(0.0, float(seconds))
    total_ms = int(math.floor(safe_sec * 1000.0 + 0.5))
    total_secs, ms = divmod(total_ms, 1000)
    minutes, secs = divmod(total_secs, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"


def generate_vtt(
    words: Iterable[WordTimestamp], words_per_cue: int = 4
) -> str:
    """Menyusun file subtitle WebVTT dari daftar WordTimestamp."""
    word_list = list(words)
    lines = ["WEBVTT", ""]
    if not word_list:
        return "\n".join(lines)

    chunk_size = max(1, words_per_cue)
    for idx in range(0, len(word_list), chunk_size):
        chunk = word_list[idx : idx + chunk_size]
        start = format_vtt_time(chunk[0].startSec)
        end = format_vtt_time(max(chunk[-1].endSec, chunk[0].startSec + 0.05))
        cue_text = " ".join(w.text.strip() for w in chunk if w.text.strip())
        if not cue_text:
            continue
        lines.append(f"{start} --> {end}")
        lines.append(cue_text)
        lines.append("")

    return "\n".join(lines)


def pcm_to_wav_bytes(
    pcm_data: bytes,
    *,
    sample_rate: int = DEFAULT_SAMPLE_RATE,
    channels: int = DEFAULT_CHANNELS,
    sample_width: int = DEFAULT_SAMPLE_WIDTH,
) -> bytes:
    """Membungkus raw PCM bytes menjadi WAV bytes yang valid."""
    if pcm_data[:4] == b"RIFF" and pcm_data[8:12] == b"WAVE":
        return pcm_data

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buffer.getvalue()


def atomic_write_bytes(target_path: Path, data: bytes) -> None:
    """Menulis file biner secara atomik melalui temporary file lalu os.replace."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = target_path.with_suffix(f"{target_path.suffix}.{uuid.uuid4().hex[:6]}.tmp")
    try:
        tmp_path.write_bytes(data)
        os.replace(tmp_path, target_path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)


def atomic_write_text(target_path: Path, content: str, encoding: str = "utf-8") -> None:
    """Menulis file teks secara atomik."""
    atomic_write_bytes(target_path, content.encode(encoding))


def get_wav_info(wav_path: Path) -> dict[str, float | int]:
    """Membaca metadata durasi, sample rate, frame Remotion 30 FPS, dan ukuran file secara aman."""
    if not wav_path.exists() or not wav_path.is_file():
        return {
            "duration_sec": 0.0,
            "duration_frames": 0,
            "sample_rate": DEFAULT_SAMPLE_RATE,
            "file_size_bytes": 0,
        }

    file_size = wav_path.stat().st_size
    try:
        with wave.open(str(wav_path), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate() or DEFAULT_SAMPLE_RATE
            duration_sec = round(frames / float(rate), 3)
            duration_frames = int(round(duration_sec * REMOTION_FPS))
            return {
                "duration_sec": duration_sec,
                "duration_frames": duration_frames,
                "sample_rate": rate,
                "file_size_bytes": file_size,
            }
    except (wave.Error, EOFError, OSError):
        return {
            "duration_sec": 0.0,
            "duration_frames": 0,
            "sample_rate": DEFAULT_SAMPLE_RATE,
            "file_size_bytes": file_size,
        }
