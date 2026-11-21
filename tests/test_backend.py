"""Unit & security tests untuk memverifikasi seluruh perbaikan bug backend."""

from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from server.config import (
    ALLOWED_AUDIO_EXTENSIONS,
    CORS_ORIGINS,
    UnsafePathError,
    safe_resolve_under,
)
from server.schemas import PipelineRequest, WordTimestamp
from server.services.audio_utils import (
    format_vtt_time,
    generate_vtt,
    get_wav_info,
    pcm_to_wav_bytes,
    unique_slug_filename,
)
from server.services.pipeline_service import compute_steps, resolve_intent
from server.services.transcribe_service import transcribe_audio


class TestSecurityAndPathValidation(unittest.TestCase):
    def test_blocks_path_traversal_and_bad_extensions(self) -> None:
        with TemporaryDirectory() as tmp:
            base = Path(tmp)
            for bad in ("../secret.wav", "/etc/passwd", "a/b.wav", "a\\b.wav", "..", ".", "evil.txt"):
                with self.assertRaises(UnsafePathError, msg=f"Harus menolak: {bad}"):
                    safe_resolve_under(base, bad, ALLOWED_AUDIO_EXTENSIONS)

            good = safe_resolve_under(base, "demo-01.wav", ALLOWED_AUDIO_EXTENSIONS)
            self.assertEqual(good.parent, base.resolve())
            self.assertEqual(good.name, "demo-01.wav")

    def test_transcribe_missing_file_raises_not_silent_fallback(self) -> None:
        with self.assertRaises(FileNotFoundError):
            transcribe_audio("non-existent-audio-file-xyz.wav")

    def test_cors_no_wildcard(self) -> None:
        self.assertNotIn("*", CORS_ORIGINS)


class TestAudioAndVttFormatting(unittest.TestCase):
    def test_format_vtt_time_boundary_rollover(self) -> None:
        self.assertEqual(format_vtt_time(0.0), "00:00:00.000")
        self.assertEqual(format_vtt_time(-2.5), "00:00:00.000")
        self.assertEqual(format_vtt_time(59.9996), "00:01:00.000")
        self.assertEqual(format_vtt_time(3599.9999), "01:00:00.000")
        self.assertEqual(format_vtt_time(61.2345), "00:01:01.235")

    def test_generate_vtt_produces_valid_cues(self) -> None:
        words = [
            WordTimestamp(text="Halo", startSec=0.0, endSec=0.4),
            WordTimestamp(text="dunia", startSec=0.4, endSec=0.9),
        ]
        vtt = generate_vtt(words, words_per_cue=2)
        self.assertTrue(vtt.startswith("WEBVTT"))
        self.assertIn("00:00:00.000 --> 00:00:00.900", vtt)
        self.assertIn("Halo dunia", vtt)

    def test_unique_slug_filename_prevents_collisions(self) -> None:
        names = {unique_slug_filename("Judul Sama", ".wav") for _ in range(25)}
        self.assertEqual(len(names), 25)

    def test_get_wav_info_missing_and_valid_file(self) -> None:
        with TemporaryDirectory() as tmp:
            missing = Path(tmp) / "missing.wav"
            info = get_wav_info(missing)
            self.assertEqual(info["duration_sec"], 0.0)
            self.assertEqual(info["file_size_bytes"], 0)

            valid = Path(tmp) / "tone.wav"
            # 1 detik silence @ 24kHz mono 16-bit = 48000 bytes PCM
            wav_bytes = pcm_to_wav_bytes(b"\x00\x00" * 24000)
            valid.write_bytes(wav_bytes)
            valid_info = get_wav_info(valid)
            self.assertAlmostEqual(float(valid_info["duration_sec"]), 1.0, places=2)
            self.assertEqual(valid_info["duration_frames"], 30)


class TestPipelineLogic(unittest.TestCase):
    def test_resolve_intent_auto_vs_explicit(self) -> None:
        short_req = PipelineRequest(intent="auto", prompt="Kenapa GPU lebih cepat dari CPU")
        self.assertEqual(resolve_intent(short_req), "full")

        tagged_req = PipelineRequest(intent="auto", prompt="Halo semua <short pause> ini demo")
        self.assertEqual(resolve_intent(tagged_req), "voice_only")

        long_req = PipelineRequest(intent="auto", prompt=" ".join(["kata"] * 45))
        self.assertEqual(resolve_intent(long_req), "voice_only")

        explicit_script = PipelineRequest(intent="script", prompt="Topik AI", script_text="Draft awal")
        self.assertEqual(resolve_intent(explicit_script), "script")

    def test_compute_steps_respects_auto_proceed(self) -> None:
        self.assertEqual(compute_steps("title", auto_proceed=False), ["title"])
        self.assertEqual(compute_steps("script", auto_proceed=False), ["script"])
        self.assertEqual(compute_steps("script", auto_proceed=True), ["script", "tts", "transcribe"])
        self.assertEqual(compute_steps("voice_only", auto_proceed=False), ["tts", "transcribe"])
        self.assertEqual(compute_steps("full", auto_proceed=True), ["title", "script", "tts", "transcribe"])


if __name__ == "__main__":
    unittest.main()
