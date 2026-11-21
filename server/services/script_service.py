"""Layanan generasi naskah H-A-M-P dan penyisipan inline vocal tags resmi Gemini."""

from __future__ import annotations

import json
import re
from typing import Any

from server.config import CONTENT_SCRIPTS_DIR, OFFICIAL_VOCAL_TAGS
from server.schemas import AutoTagResponse, ScriptResponse, ScriptSegment
from server.services.audio_utils import atomic_write_text, slugify, unique_slug_filename
from server.services.gemini_client import generate_text_with_fallback

_ALLOWED_TAGS_LIST = ", ".join(item["tag"] for item in OFFICIAL_VOCAL_TAGS)
_TAG_PATTERN = re.compile(r"<[a-zA-Z\s]+>")


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


def auto_tag_text(text: str) -> AutoTagResponse:
    """Menyisipkan inline vocal tags resmi Gemini ke teks narasi tanpa mengubah substansi kalimat."""
    clean_input = text.strip()
    prompt = (
        "Sisipkan inline vocal tags resmi Gemini pada teks narasi berikut agar terdengar natural, "
        "berdinamika, dan enak didengar sebagai voice-over video pendek.\n"
        f"HANYA gunakan tag dari daftar ini: {_ALLOWED_TAGS_LIST}.\n"
        "Jangan mengubah isi atau urutan kalimat. Kembalikan HANYA teks hasil tagging tanpa penjelasan.\n\n"
        f"Teks:\n{clean_input}"
    )
    tagged, _ = generate_text_with_fallback(
        prompt,
        system_instruction="Kamu adalah voice director profesional untuk sintesis Gemini TTS.",
        temperature=0.35,
    )
    valid_set = {item["tag"] for item in OFFICIAL_VOCAL_TAGS}
    tags_inserted = sum(1 for m in _TAG_PATTERN.findall(tagged) if m in valid_set)
    return AutoTagResponse(
        original_text=clean_input,
        tagged_text=tagged,
        tags_inserted=tags_inserted,
    )


def generate_script(
    title: str,
    topic_context: str = "",
    voice_style: str = "conversational",
    auto_tag: bool = True,
    custom_instructions: str = "",
) -> ScriptResponse:
    """Menghasilkan naskah 4 segmen H-A-M-P lengkap dengan visual receipt dan SFX."""
    prompt = (
        f"Judul Video: {title}\n"
        f"Konteks Tambahan: {topic_context or '-'}\n"
        f"Gaya Suara: {voice_style}\n"
        f"Instruksi Khusus: {custom_instructions or '-'}\n\n"
        "Tulis naskah video vertikal pendek (~45-55 detik, ~110-140 kata) dalam Bahasa Indonesia "
        "menggunakan kerangka H-A-M-P:\n"
        "1. Hook (0-3s)\n2. Agitasi (4-15s)\n3. Mekanisme (15-38s)\n4. Payoff (38s-52s)\n\n"
        "Kembalikan HANYA JSON valid:\n"
        "{\n"
        '  "breakdown": [\n'
        '    {"segment": "Hook", "time_range": "0-3s", "narration": "...", "visual_receipt": "...", "sfx": "..."}\n'
        "  ]\n"
        "}"
    )

    raw_text, _ = generate_text_with_fallback(
        prompt,
        system_instruction=(
            "Kamu adalah penulis naskah video edukasi teknologi faceless berstandar retensi tinggi. "
            "Kembalikan HANYA JSON valid."
        ),
        response_mime_type="application/json",
        temperature=0.7,
    )

    data = _parse_json_object(raw_text)
    raw_segments = data.get("breakdown") or []
    segments: list[ScriptSegment] = []
    for item in raw_segments:
        narration = str(item.get("narration", "")).strip()
        if not narration:
            continue
        segments.append(
            ScriptSegment(
                segment=str(item.get("segment", "Segmen")).strip(),
                time_range=str(item.get("time_range", "0-10s")).strip(),
                narration=narration,
                visual_receipt=str(item.get("visual_receipt", "-")).strip(),
                sfx=str(item.get("sfx", "-")).strip(),
            )
        )

    if not segments:
        raise RuntimeError("Model tidak mengembalikan segmen naskah H-A-M-P yang valid.")

    clean_text = "\n\n".join(seg.narration for seg in segments)
    tagged_text = auto_tag_text(clean_text).tagged_text if auto_tag else clean_text

    word_count = len(clean_text.split())
    estimated_duration_sec = round(word_count / 2.6, 1)

    table_lines = [
        "| Segmen | Waktu | Narasi | Visual Receipt | SFX |",
        "| --- | --- | --- | --- | --- |",
    ]
    for seg in segments:
        nar = seg.narration.replace("|", "\\|").replace("\n", " ")
        vis = seg.visual_receipt.replace("|", "\\|").replace("\n", " ")
        sfx = seg.sfx.replace("|", "\\|").replace("\n", " ")
        table_lines.append(f"| {seg.segment} | {seg.time_range} | {nar} | {vis} | {sfx} |")
    markdown_table = "\n".join(table_lines)

    CONTENT_SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    slug = slugify(title)
    filename = unique_slug_filename(title, ".md")
    target = CONTENT_SCRIPTS_DIR / filename
    doc_content = (
        f"# {title}\n\n"
        f"{markdown_table}\n\n"
        f"## Clean Narration\n\n{clean_text}\n\n"
        f"## Tagged Narration\n\n{tagged_text}\n"
    )
    atomic_write_text(target, doc_content)

    return ScriptResponse(
        title=title,
        slug=slug,
        breakdown=segments,
        clean_text=clean_text,
        tagged_text=tagged_text,
        word_count=word_count,
        estimated_duration_sec=estimated_duration_sec,
        saved_path=str(target.relative_to(CONTENT_SCRIPTS_DIR.parent.parent)),
        markdown_table=markdown_table,
    )
