"""Layanan riset judul, brainstorming chat, dan penyimpanan ide judul."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from server.config import CONTENT_TITLES_DIR
from server.schemas import (
    ChatMessage,
    SaveTitleResponse,
    ThumbnailConcept,
    TitleChatResponse,
    TitleRecommendation,
    TitleResponse,
)
from server.services.audio_utils import atomic_write_text, unique_slug_filename
from server.services.gemini_client import generate_text_with_fallback

logger = logging.getLogger(__name__)


def _parse_json_object(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    return json.loads(cleaned)


def generate_titles(topic: str, count: int = 3, save_to_disk: bool = True) -> TitleResponse:
    """Menghasilkan tepat `count` rekomendasi judul viral dan konsep thumbnail."""
    safe_count = max(1, min(10, int(count)))
    prompt = (
        f"Topik video edukasi teknologi pendek (YouTube Shorts/Reels/TikTok): {topic}\n\n"
        f"Hasilkan TEPAT {safe_count} rekomendasi judul berstandar retensi tinggi dalam Bahasa Indonesia "
        "maksimal 60 karakter per judul, ditambah 1 konsep thumbnail.\n"
        "Kembalikan HANYA JSON valid dengan struktur persis berikut:\n"
        "{\n"
        '  "recommendations": [\n'
        '    {"title": "...", "formula": "...", "why_it_works": "..."}\n'
        "  ],\n"
        '  "thumbnail_concept": {"screen_text": "...", "visual_concept": "..."}\n'
        "}"
    )

    raw_text, _ = generate_text_with_fallback(
        prompt,
        system_instruction=(
            "Kamu adalah pakar strategi judul video edukasi teknologi faceless. "
            "Jawab selalu dalam JSON valid tanpa teks tambahan."
        ),
        response_mime_type="application/json",
        temperature=0.75,
    )

    data = _parse_json_object(raw_text)
    raw_recs = data.get("recommendations") or []
    recommendations: list[TitleRecommendation] = []
    for item in raw_recs[:safe_count]:
        title_str = str(item.get("title", "")).strip()
        if not title_str:
            continue
        recommendations.append(
            TitleRecommendation(
                title=title_str,
                char_count=len(title_str),
                formula=str(item.get("formula", "Curiosity Gap")).strip(),
                why_it_works=str(item.get("why_it_works", "")).strip(),
            )
        )

    if not recommendations:
        raise RuntimeError("Model tidak mengembalikan rekomendasi judul yang valid.")

    thumb_raw = data.get("thumbnail_concept") or {}
    thumbnail = ThumbnailConcept(
        screen_text=str(thumb_raw.get("screen_text", recommendations[0].title[:24])).strip(),
        visual_concept=str(
            thumb_raw.get("visual_concept", "Visual kontras tinggi dengan diagram singkat.")
        ).strip(),
    )

    saved_path: str | None = None
    if save_to_disk:
        CONTENT_TITLES_DIR.mkdir(parents=True, exist_ok=True)
        filename = unique_slug_filename(topic, ".md")
        target: Path = CONTENT_TITLES_DIR / filename
        lines = [
            f"# Riset Judul: {topic}",
            f"_Generated: {datetime.now(timezone.utc).isoformat()}_",
            "",
        ]
        for idx, rec in enumerate(recommendations, start=1):
            lines.append(f"## {idx}. {rec.title} ({rec.char_count} chars)")
            lines.append(f"- **Formula:** {rec.formula}")
            lines.append(f"- **Alasan:** {rec.why_it_works}")
            lines.append("")
        lines.append("## Konsep Thumbnail")
        lines.append(f"- **Teks Layar:** {thumbnail.screen_text}")
        lines.append(f"- **Visual:** {thumbnail.visual_concept}")
        atomic_write_text(target, "\n".join(lines))
        saved_path = str(target.relative_to(CONTENT_TITLES_DIR.parent.parent))

    return TitleResponse(
        topic=topic,
        recommendations=recommendations,
        thumbnail_concept=thumbnail,
        saved_path=saved_path,
    )


def chat_title_discussion(messages: list[ChatMessage]) -> TitleChatResponse:
    """Diskusi interaktif brainstorming judul tanpa menulis file ke disk."""
    transcript = "\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}" for m in messages
    )
    prompt = (
        "Berikut percakapan brainstorming judul video pendek:\n"
        f"{transcript}\n\n"
        "Berikan balasan singkat, tajam, dan maksimal 3 opsi judul baru.\n"
        "Kembalikan HANYA JSON valid:\n"
        '{"reply": "...", "suggested_titles": [{"title": "...", "formula": "...", "why_it_works": "..."}]}'
    )

    raw_text, _ = generate_text_with_fallback(
        prompt,
        system_instruction="Kamu adalah partner brainstorming judul video edukasi teknologi berbahasa Indonesia.",
        response_mime_type="application/json",
        temperature=0.8,
    )
    data = _parse_json_object(raw_text)
    suggested: list[TitleRecommendation] = []
    for item in (data.get("suggested_titles") or [])[:5]:
        t = str(item.get("title", "")).strip()
        if t:
            suggested.append(
                TitleRecommendation(
                    title=t,
                    char_count=len(t),
                    formula=str(item.get("formula", "Hook")).strip(),
                    why_it_works=str(item.get("why_it_works", "")).strip(),
                )
            )
    reply = str(data.get("reply", "")).strip() or "Berikut beberapa opsi judul yang bisa dicoba."
    return TitleChatResponse(reply=reply, suggested_titles=suggested)


def save_title(title: str, formula: str = "Custom", why_it_works: str = "") -> SaveTitleResponse:
    """Menyimpan judul final pilihan pengguna ke content/titles/."""
    CONTENT_TITLES_DIR.mkdir(parents=True, exist_ok=True)
    filename = unique_slug_filename(title, ".md")
    target = CONTENT_TITLES_DIR / filename
    content = (
        f"# {title}\n\n"
        f"- **Saved At:** {datetime.now(timezone.utc).isoformat()}\n"
        f"- **Formula:** {formula}\n"
        f"- **Why It Works:** {why_it_works or '-'}\n"
    )
    atomic_write_text(target, content)
    return SaveTitleResponse(
        title=title,
        saved_path=str(target.relative_to(CONTENT_TITLES_DIR.parent.parent)),
    )
