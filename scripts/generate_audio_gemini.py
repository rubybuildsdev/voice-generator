import os, sys, base64, shutil
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
    print("ERROR: GEMINI_API_KEY is not set. Please set it in .env file or environment variable.", file=sys.stderr)
    sys.exit(1)

client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})

def resolve_input(text_or_file: str) -> tuple[str, str | None]:
    """Returns (text_content, stem_name_if_file)"""
    candidate_paths = [
        Path(text_or_file),
        Path("content/scripts") / text_or_file,
    ]
    for p in candidate_paths:
        if p.is_file():
            return p.read_text(encoding='utf-8'), p.stem
    return text_or_file, None

def resolve_output_paths(output_path: str | None, input_stem: str | None) -> tuple[Path, Path | None]:
    """
    Returns (primary_output_path, None)
    Primary defaults to output/audio/<name>.wav
    """
    if not output_path:
        stem = input_stem or "output"
        primary = Path("output/audio") / f"{stem}.wav"
        return primary, None

    p = Path(output_path)
    if not p.suffix:
        p = p.with_suffix(".wav")

    # If bare filename without directory components:
    if len(p.parts) == 1:
        primary = Path("output/audio") / p.name
        return primary, None

    return p, None

def generate_tts(text: str, output_path: str | Path, mirror_path: str | Path | None = None, voice: str = "Kore"):
    print(f"Generating TTS with Gemini API (model: gemini-3.8-flash-tts, voice: {voice})...")
    interaction = client.interactions.create(
        model="gemini-3.8-flash-tts",
        input=[{
            "type": "user_input",
            "content": [{
                "type": "text",
                "text": text,
                "annotations": [{
                    "type": "speech_metadata",
                    "style": "energetic, natural tech educator, conversational style",
                }],
            }],
        }],
        response_format={"type": "audio"},
        generation_config={
            "speech_config": [
                {"voice": voice},
            ]
        },
    )
    
    if interaction.output_audio and interaction.output_audio.data:
        audio_bytes = base64.b64decode(interaction.output_audio.data)
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "wb") as f:
            f.write(audio_bytes)
        print(f"✓ Success! Audio saved to: {out_p}")

        if mirror_path and Path(mirror_path) != out_p:
            mir_p = Path(mirror_path)
            mir_p.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(out_p, mir_p)
            print(f"✓ Mirrored to: {mir_p} (for backward compatibility)")

        return str(out_p)
    else:
        raise RuntimeError("No audio data returned by Gemini 3.8 Flash TTS")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_audio_gemini.py <text_or_file> [output_path] [voice]")
        print("Examples:")
        print("  python scripts/generate_audio_gemini.py content/scripts/naskah_ai.txt")
        print("  python scripts/generate_audio_gemini.py content/scripts/naskah_ai.txt output/audio/naskah_ai.wav Kore")
        print("  python scripts/generate_audio_gemini.py \"Teks naskah dengan <sigh>...\" output/audio/test.wav Fola")
        sys.exit(1)

    input_arg = sys.argv[1]
    out_arg = sys.argv[2] if len(sys.argv) > 2 else None
    voice_arg = sys.argv[3] if len(sys.argv) > 3 else "Kore"

    text_content, input_stem = resolve_input(input_arg)
    primary_path, mirror_path = resolve_output_paths(out_arg, input_stem)

    generate_tts(text_content, primary_path, mirror_path, voice_arg)
