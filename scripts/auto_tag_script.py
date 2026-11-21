"""CLI mandiri untuk menyisipkan inline vocal tags resmi Gemini (menggunakan server.services)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server.services.audio_utils import atomic_write_text  # noqa: E402
from server.services.script_service import auto_tag_text  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Auto-tag naskah dengan vocal tags resmi Gemini.")
    parser.add_argument("input_file", type=Path, help="Path ke file teks/markdown naskah.")
    parser.add_argument("-o", "--output", type=Path, default=None, help="Path file output (opsional).")
    args = parser.parse_args()

    if not args.input_file.exists():
        print(f"[ERROR] File tidak ditemukan: {args.input_file}", file=sys.stderr)
        return 1

    raw_text = args.input_file.read_text(encoding="utf-8")
    result = auto_tag_text(raw_text)

    if args.output:
        atomic_write_text(args.output, result.tagged_text)
        print(f"[OK] {result.tags_inserted} vocal tags disisipkan -> {args.output}")
    else:
        print(result.tagged_text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
