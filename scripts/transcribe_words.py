"""CLI mandiri untuk transkripsi word-level JSON & WebVTT bebas bug pembulatan."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server.services.transcribe_service import transcribe_audio  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Transkripsikan file WAV di output/audio/ menjadi JSON & VTT.")
    parser.add_argument("audio_filename", help="Nama file WAV di dalam folder output/audio/ (mis. demo.wav).")
    args = parser.parse_args()

    res = transcribe_audio(args.audio_filename)
    print(f"[OK] {res.word_count} kata terdeteksi ({res.duration_sec}s)")
    print(f"     VTT : {res.vtt_url}")
    print(f"     JSON: {res.json_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
