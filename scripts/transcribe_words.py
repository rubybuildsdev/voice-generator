import os, sys, json, shutil
from pathlib import Path
from google import genai

# Load .env
env_file = Path('.env')
if env_file.exists():
    for line in env_file.read_text(encoding='utf-8').splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip().strip("'\"")

api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
if not api_key:
    print("ERROR: GEMINI_API_KEY is not set.", file=sys.stderr)
    sys.exit(1)

client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})

def format_vtt_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

def resolve_audio_path(audio_arg: str | None) -> Path:
    if audio_arg:
        candidates = [
            Path(audio_arg),
            Path("output/audio") / audio_arg,
            Path("output/audio") / f"{audio_arg}.wav",
        ]
        for c in candidates:
            if c.is_file():
                return c
        return Path(audio_arg)
    
    defaults = list(Path("output/audio").glob("*.wav"))
    if defaults:
        return defaults[0]
    return Path("output/audio/output.wav")

def transcribe_audio_words(audio_path: str | Path):
    audio_path_obj = Path(audio_path)
    if not audio_path_obj.exists():
        print(f"ERROR: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    base_stem = audio_path_obj.stem

    print(f"Uploading {audio_path_obj} to Gemini Files API...")
    uploaded_file = client.files.upload(file=str(audio_path_obj))
    print(f"Uploaded: {uploaded_file.uri}. Transcribing with gemini-3.5-transcribe (word-level)...")

    mime = "audio/wav" if audio_path_obj.suffix.lower() == '.wav' else "audio/mp3"
    response = client.interactions.create(
        model="gemini-3.5-transcribe",
        input=[{
            "type": "audio",
            "uri": uploaded_file.uri,
            "mime_type": mime,
        }],
        generation_config={
            "transcription_config": {
                "mode": {
                    "type": "verbatim",
                    "timestamp_granularities": ["word"],
                }
            }
        },
    )

    # Extract word_info annotations
    words = []
    for step in response.steps:
        if step.type == "model_output":
            for c in step.content:
                if hasattr(c, "annotations"):
                    for a in c.annotations:
                        type_val = a.get("type") if isinstance(a, dict) else getattr(a, "type", None)
                        if type_val == "word_info":
                            w_text = a.get("text") if isinstance(a, dict) else getattr(a, "text", "")
                            s_off = a.get("start_offset") if isinstance(a, dict) else getattr(a, "start_offset", "0s")
                            e_off = a.get("end_offset") if isinstance(a, dict) else getattr(a, "end_offset", "0s")
                            s_sec = float(str(s_off).rstrip("s"))
                            e_sec = float(str(e_off).rstrip("s"))
                            words.append({
                                "text": w_text,
                                "startSec": round(s_sec, 3),
                                "endSec": round(e_sec, 3)
                            })

    if not words:
        print("Warning: No word_info annotations found in response. Dumping raw steps.")
        raw_dir = Path("output/transcripts")
        raw_dir.mkdir(parents=True, exist_ok=True)
        raw_path = raw_dir / f"{base_stem}_raw.json"
        with open(raw_path, "w", encoding="utf-8") as f:
            steps_dict = [s.model_dump() if hasattr(s, "model_dump") else str(s) for s in response.steps]
            json.dump(steps_dict, f, indent=2, default=str, ensure_ascii=False)
        return

    # 1. Primary Output: output/transcripts/{base_stem}.json & .vtt
    out_transcripts_dir = Path("output/transcripts")
    out_transcripts_dir.mkdir(parents=True, exist_ok=True)

    json_primary = out_transcripts_dir / f"{base_stem}.json"
    with open(json_primary, "w", encoding="utf-8") as f:
        json.dump(words, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved {len(words)} words to {json_primary}")

    # Build WebVTT
    vtt_lines = ["WEBVTT", ""]
    for idx, w in enumerate(words, 1):
        vtt_lines.append(f"{idx}")
        vtt_lines.append(f"{format_vtt_time(w['startSec'])} --> {format_vtt_time(w['endSec'])}")
        vtt_lines.append(w["text"])
        vtt_lines.append("")

    vtt_content = "\n".join(vtt_lines)
    vtt_primary = out_transcripts_dir / f"{base_stem}.vtt"
    with open(vtt_primary, "w", encoding="utf-8") as f:
        f.write(vtt_content)
    print(f"✓ Saved word-level WebVTT to {vtt_primary}")

if __name__ == "__main__":
    audio_arg = sys.argv[1] if len(sys.argv) > 1 else None
    resolved_audio = resolve_audio_path(audio_arg)
    transcribe_audio_words(resolved_audio)
