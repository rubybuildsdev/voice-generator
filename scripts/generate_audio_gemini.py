"""CLI mandiri untuk sintesis suara Gemini TTS 24 kHz Mono WAV."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server.config import DEFAULT_VOICE  # noqa: E402
from server.services.tts_service import generate_tts  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate voice-over WAV memakai Gemini TTS.")
    parser.add_argument("input_file", type=Path, help="File teks naskah input.")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help=f"Nama profil suara (default: {DEFAULT_VOICE}).")
    parser.add_argument("--name", default=None, help="Nama dasar file output.")
    parser.add_argument("--style", default="", help="Instruksi gaya bicara opsional.")
    args = parser.parse_args()

    if not args.input_file.exists():
        print(f"[ERROR] File tidak ditemukan: {args.input_file}", file=sys.stderr)
        return 1

    text = args.input_file.read_text(encoding="utf-8")
    res = generate_tts(text=text, voice=args.voice, filename=args.name or args.input_file.stem, style=args.style)
    print(f"[OK] Audio disimpan: {res.primary_path} ({res.duration_sec}s / {res.duration_frames} frames @30fps)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
