"""Thread-safe Gemini SDK client singleton dan deteksi status model."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

from google import genai
from google.genai import types

from server.config import (
    GEMINI_API_KEY,
    TEXT_MODEL,
    TEXT_MODEL_FALLBACK,
    TRANSCRIBE_MODEL,
    TTS_MODEL,
)

logger = logging.getLogger(__name__)

_client_lock = threading.Lock()
_client_instance: genai.Client | None = None

_health_lock = threading.Lock()
_health_cache: dict[str, Any] | None = None
_health_cached_at: float = 0.0
_HEALTH_TTL_SUCCESS_SEC = 300.0
_HEALTH_TTL_FAILURE_SEC = 15.0


class GeminiConfigError(RuntimeError):
    """Dilempar ketika GEMINI_API_KEY belum dikonfigurasi."""


def is_configured() -> bool:
    return bool(GEMINI_API_KEY)


def get_client() -> genai.Client:
    """Mengembalikan instance genai.Client secara thread-safe."""
    global _client_instance
    if _client_instance is not None:
        return _client_instance

    with _client_lock:
        if _client_instance is None:
            if not GEMINI_API_KEY:
                raise GeminiConfigError(
                    "GEMINI_API_KEY belum diatur di file .env."
                )
            _client_instance = genai.Client(api_key=GEMINI_API_KEY)
        return _client_instance


def reset_client_for_tests() -> None:
    """Membersihkan cache client & health check untuk pengujian unit."""
    global _client_instance, _health_cache, _health_cached_at
    with _client_lock:
        _client_instance = None
    with _health_lock:
        _health_cache = None
        _health_cached_at = 0.0


def extract_response_text(response: Any) -> str:
    """Mengambil teks dari response Gemini secara aman tanpa AttributeError/NoneType."""
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

    candidates = getattr(response, "candidates", None) or []
    parts_text: list[str] = []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str):
                parts_text.append(part_text)
    return "".join(parts_text).strip()


def generate_text_with_fallback(
    prompt: str,
    *,
    system_instruction: str | None = None,
    response_mime_type: str | None = None,
    temperature: float = 0.7,
) -> tuple[str, str]:
    """Memanggil TEXT_MODEL dengan fallback otomatis, timeout 20s, dan AFC dimatikan."""
    client = get_client()
    models_to_try = [TEXT_MODEL]
    if TEXT_MODEL_FALLBACK and TEXT_MODEL_FALLBACK != TEXT_MODEL:
        models_to_try.append(TEXT_MODEL_FALLBACK)

    config_kwargs: dict[str, Any] = {
        "temperature": temperature,
        "http_options": types.HttpOptions(timeout=20000),
        "automatic_function_calling": types.AutomaticFunctionCallingConfig(disable=True),
    }
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction
    if response_mime_type:
        config_kwargs["response_mime_type"] = response_mime_type

    config = types.GenerateContentConfig(**config_kwargs)

    last_error: Exception | None = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            text = extract_response_text(response)
            if text:
                return text, model_name
            raise RuntimeError(f"Model {model_name} mengembalikan respons teks kosong.")
        except Exception as exc:
            logger.warning("Gagal memanggil model %s: %s", model_name, exc)
            last_error = exc

    raise RuntimeError(
        f"Semua model teks gagal merespons ({', '.join(models_to_try)})."
    ) from last_error


def detect_active_model(force_refresh: bool = False) -> dict[str, Any]:
    """Mengecek model aktif dengan TTL cache agar kegagalan sementara tidak terkunci selamanya."""
    global _health_cache, _health_cached_at

    now = time.monotonic()
    with _health_lock:
        if not force_refresh and _health_cache is not None:
            ttl = (
                _HEALTH_TTL_SUCCESS_SEC
                if _health_cache.get("status") == "connected"
                else _HEALTH_TTL_FAILURE_SEC
            )
            if (now - _health_cached_at) < ttl:
                return dict(_health_cache)

    if not is_configured():
        result = {
            "status": "unconfigured",
            "text_model": TEXT_MODEL,
            "tts_model": TTS_MODEL,
            "transcribe_model": TRANSCRIBE_MODEL,
            "display_name": TEXT_MODEL,
        }
    else:
        status = "degraded"
        active_text_model = TEXT_MODEL
        try:
            client = get_client()
            client.models.get(model=TEXT_MODEL)
            status = "connected"
        except Exception as exc:
            logger.warning("Health check model %s gagal: %s", TEXT_MODEL, exc)
            if TEXT_MODEL_FALLBACK and TEXT_MODEL_FALLBACK != TEXT_MODEL:
                try:
                    client = get_client()
                    client.models.get(model=TEXT_MODEL_FALLBACK)
                    active_text_model = TEXT_MODEL_FALLBACK
                    status = "connected"
                except Exception as fallback_exc:
                    logger.warning(
                        "Health check fallback model %s gagal: %s",
                        TEXT_MODEL_FALLBACK,
                        fallback_exc,
                    )

        result = {
            "status": status,
            "text_model": active_text_model,
            "tts_model": TTS_MODEL,
            "transcribe_model": TRANSCRIBE_MODEL,
            "display_name": active_text_model,
        }

    with _health_lock:
        _health_cache = result
        _health_cached_at = time.monotonic()
        return dict(result)
