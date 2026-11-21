"""Layanan pemindaian riwayat aset audio & transkrip lokal."""

from __future__ import annotations

from datetime import datetime, timezone

from server.config import OUTPUT_AUDIO_DIR, OUTPUT_TRANSCRIPTS_DIR
from server.schemas import HistoryItem
from server.services.audio_utils import get_wav_info


def get_history_items(limit: int = 50) -> list[HistoryItem]:
    """Mengembalikan daftar aset audio terbaru beserta tautan transkrip jika tersedia."""
    if not OUTPUT_AUDIO_DIR.exists():
        return []

    wav_files = sorted(
        OUTPUT_AUDIO_DIR.glob("*.wav"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )[: max(1, limit)]

    items: list[HistoryItem] = []
    for wav_path in wav_files:
        stat = wav_path.stat()
        stem = wav_path.stem
        vtt_file = OUTPUT_TRANSCRIPTS_DIR / f"{stem}.vtt"
        json_file = OUTPUT_TRANSCRIPTS_DIR / f"{stem}.json"
        has_transcript = vtt_file.exists() and json_file.exists()
        info = get_wav_info(wav_path)

        display_title = stem.replace("-", " ").strip().title()
        items.append(
            HistoryItem(
                id=stem,
                type="audio",
                name=wav_path.name,
                title=display_title,
                created_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                file_size_bytes=int(info["file_size_bytes"]),
                duration_sec=float(info["duration_sec"]),
                audio_url=f"/api/audio/{wav_path.name}",
                vtt_url=f"/api/transcripts/{vtt_file.name}" if vtt_file.exists() else None,
                json_url=f"/api/transcripts/{json_file.name}" if json_file.exists() else None,
                has_transcript=has_transcript,
            )
        )
    return items
