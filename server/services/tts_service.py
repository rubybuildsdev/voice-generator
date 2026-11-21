"""Layanan sintesis suara Gemini TTS dengan nama file unik dan penulisan atomik."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

from google.genai import types

from server.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    DEFAULT_VOICE,
    OUTPUT_AUDIO_DIR,
    TTS_MODEL,
    VALID_VOICE_IDS,
    safe_resolve_under,
)
from server.schemas import TTSResponse
from server.services.audio_utils import (
    atomic_write_bytes,
    get_wav_info,
    pcm_to_wav_bytes,
    unique_slug_filename,
)
from server.services.gemini_client import get_client


def _extract_audio_bytes(response: Any) -> bytes:
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            if inline_data is not None and getattr(inline_data, "data", None):
                raw = inline_data.data
                if isinstance(raw, str):
                    return base64.b64decode(raw)
                return bytes(raw)
    raise RuntimeError("Model TTS tidak mengembalikan data audio.")


def generate_tts(
    text: str,
    voice: str = DEFAULT_VOICE,
    filename: str | None = None,
    style: str = "",
) -> TTSResponse:
    """Menghasilkan audio WAV 24 kHz Mono dari teks menggunakan Gemini TTS."""
    selected_voice = voice.strip() if voice and voice.strip() in VALID_VOICE_IDS else DEFAULT_VOICE
    prompt_text = f"Gaya bicara: {style.strip()}\n\n{text.strip()}" if style.strip() else text.strip()

    client = get_client()
    response = client.models.generate_content(
        model=TTS_MODEL,
        contents=prompt_text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=selected_voice,
                    )
                )
            ),
        ),
    )

    raw_audio = _extract_audio_bytes(response)
    wav_bytes = pcm_to_wav_bytes(raw_audio)

    OUTPUT_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    if filename and filename.strip():
        stem = Path(filename.strip()).stem
        final_name = unique_slug_filename(stem, ".wav")
    else:
        final_name = unique_slug_filename("voice-studio", ".wav")

    target_path = safe_resolve_under(OUTPUT_AUDIO_DIR, final_name, ALLOWED_AUDIO_EXTENSIONS)
    atomic_write_bytes(target_path, wav_bytes)

    info = get_wav_info(target_path)
    return TTSResponse(
        filename=target_path.name,
        audio_url=f"/api/audio/{target_path.name}",
        voice=selected_voice,
        duration_sec=float(info["duration_sec"]),
        duration_frames=int(info["duration_frames"]),
        file_size_bytes=int(info["file_size_bytes"]),
        sample_rate=int(info["sample_rate"]),
        primary_path=str(target_path.relative_to(OUTPUT_AUDIO_DIR.parent.parent)),
    )
