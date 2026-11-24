"""Layanan pemindaian, pembacaan, dan penghapusan aman riwayat aset studio (audio, script, title)."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from server.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    CONTENT_SCRIPTS_DIR,
    CONTENT_TITLES_DIR,
    OUTPUT_AUDIO_DIR,
    OUTPUT_TRANSCRIPTS_DIR,
    UnsafePathError,
    safe_resolve_under,
)
from server.schemas import HistoryItem
from server.services.audio_utils import get_wav_info


def _resolve_asset_path(item_type: str, filename: str) -> Path:
    if item_type == "audio":
        return safe_resolve_under(OUTPUT_AUDIO_DIR, filename, ALLOWED_AUDIO_EXTENSIONS)
    if item_type == "script":
        return safe_resolve_under(CONTENT_SCRIPTS_DIR, filename, (".md", ".txt"))
    if item_type == "title":
        return safe_resolve_under(CONTENT_TITLES_DIR, filename, (".md", ".txt"))
    raise UnsafePathError(f"Tipe aset tidak dikenal: {item_type}")


def get_history_items(limit: int = 60) -> list[HistoryItem]:
    """Mengembalikan daftar aset terbaru (audio WAV, script H-A-M-P, dan title) dari disk."""
    collected: list[tuple[float, HistoryItem]] = []

    if OUTPUT_AUDIO_DIR.exists():
        for wav_path in OUTPUT_AUDIO_DIR.iterdir():
            if not wav_path.is_file() or wav_path.suffix.lower() not in ALLOWED_AUDIO_EXTENSIONS:
                continue
            stat = wav_path.stat()
            stem = wav_path.stem
            vtt_file = OUTPUT_TRANSCRIPTS_DIR / f"{stem}.vtt"
            json_file = OUTPUT_TRANSCRIPTS_DIR / f"{stem}.json"
            info = get_wav_info(wav_path)
            collected.append(
                (
                    stat.st_mtime,
                    HistoryItem(
                        id=f"audio:{stem}",
                        type="audio",
                        name=wav_path.name,
                        title=stem.replace("-", " ").strip().title(),
                        created_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                        file_size_bytes=int(info["file_size_bytes"]),
                        duration_sec=float(info["duration_sec"]),
                        audio_url=f"/api/audio/{wav_path.name}",
                        vtt_url=f"/api/transcripts/{vtt_file.name}" if vtt_file.exists() else None,
                        json_url=f"/api/transcripts/{json_file.name}" if json_file.exists() else None,
                        has_transcript=vtt_file.exists() and json_file.exists(),
                    ),
                )
            )

    if CONTENT_SCRIPTS_DIR.exists():
        for md_path in CONTENT_SCRIPTS_DIR.glob("*.md"):
            stat = md_path.stat()
            stem = md_path.stem
            collected.append(
                (
                    stat.st_mtime,
                    HistoryItem(
                        id=f"script:{stem}",
                        type="script",
                        name=md_path.name,
                        title=stem.replace("-", " ").strip().title(),
                        created_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                        file_size_bytes=stat.st_size,
                        has_transcript=False,
                    ),
                )
            )

    if CONTENT_TITLES_DIR.exists():
        for md_path in CONTENT_TITLES_DIR.glob("*.md"):
            stat = md_path.stat()
            stem = md_path.stem
            collected.append(
                (
                    stat.st_mtime,
                    HistoryItem(
                        id=f"title:{stem}",
                        type="title",
                        name=md_path.name,
                        title=stem.replace("-", " ").strip().title(),
                        created_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                        file_size_bytes=stat.st_size,
                        has_transcript=False,
                    ),
                )
            )

    collected.sort(key=lambda pair: pair[0], reverse=True)
    return [item for _, item in collected[: max(1, limit)]]


def get_asset_content(item_type: str, filename: str) -> dict[str, str]:
    """Membaca isi file markdown script/title secara aman."""
    if item_type not in ("script", "title"):
        raise UnsafePathError("Hanya aset 'script' atau 'title' yang dapat dibaca sebagai teks.")
    target = _resolve_asset_path(item_type, filename)
    if not target.exists() or not target.is_file():
        raise FileNotFoundError(f"Aset '{target.name}' tidak ditemukan.")
    return {
        "type": item_type,
        "name": target.name,
        "content": target.read_text(encoding="utf-8"),
    }


def delete_history_asset(item_type: str, filename: str) -> dict[str, object]:
    """Menghapus aset studio dari disk secara aman (termasuk VTT/JSON terkait untuk audio)."""
    target = _resolve_asset_path(item_type, filename)
    if not target.exists() or not target.is_file():
        raise FileNotFoundError(f"Aset '{target.name}' tidak ditemukan.")

    stem = target.stem
    target.unlink()

    if item_type == "audio" and OUTPUT_TRANSCRIPTS_DIR.exists():
        for ext in (".vtt", ".json"):
            linked = OUTPUT_TRANSCRIPTS_DIR / f"{stem}{ext}"
            if linked.exists() and linked.is_file():
                linked.unlink()

    return {"deleted": True, "type": item_type, "name": target.name}
