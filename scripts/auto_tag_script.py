import os, sys
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

SYSTEM_PROMPT = """Kamu adalah ahli penata vokal dan sutradara suara untuk video edukasi pendek (TikTok/Shorts/Reels) yang menggunakan model Gemini 3.8 Flash TTS.

Tugasmu:
Menyisipkan INLINE VOCAL TAGS resmi Google Gemini secara otomatis, natural, dan proporsional ke dalam naskah bahasa Indonesia agar terdengar seperti manusia berbicara (ekspresif, bernapas, ada jeda, dan emosional).

Daftar tag resmi yang didukung:
<argh>  <breath>  <heavy breath>  <exhales>
<cackle>  <cheer>  <chuckle>  <cough>
<cry>  <gasp>  <giggle>  <groan>
<growl>  <grunt>  <grr>  <hiss>
<laugh>  <moan>  <pant>  <pff>  <phew>
<scream>  <shout>  <shriek>  <sigh>
<sneeze>  <snicker>  <snort>  <sob>
<throat-clearing>  <tsk>  <whimper>  <whispers>
<yawn>  <short pause>  <long pause>

Aturan Penyisipan Tag:
1. JANGAN berlebihan! Cukup 3-6 tag per 60 detik naskah agar tetap profesional dan enak didengar.
2. Gunakan:
   - <short pause> pada koma penting, pergantian ide, atau sebelum mengungkap fakta kunci.
   - <sigh> atau <pff> pada rasa frustrasi atau masalah penonton (Hook / Agitasi).
   - <gasp> pada saat ada angka / fakta mengejutkan.
   - <chuckle> atau <snicker> saat membongkar mitos lucu atau kesalahan umum.
   - <breath> sebelum kalimat panjang atau penjelasan teknis.
   - <phew> atau <exhales> pada solusi akhir yang melegakan.
3. Tetap pertahankan teks asli tanpa mengubah maknanya.
4. Output HANYA teks naskah yang sudah diberi tag, tanpa pengantar atau penjelasan tambahan.
"""

def auto_tag(text: str) -> str:
    models_to_try = ["gemini-3.8-flash", "gemini-3.8-flash-lite"]
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=f"Naskah:\n{text}\n\nMasukkan inline vocal tags secara natural:",
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "temperature": 0.4,
                }
            )
            return response.text.strip()
        except Exception as e:
            print(f"Warning: {model_name} failed ({e}), trying fallback...", file=sys.stderr)
            continue
    raise RuntimeError("Semua model gagal melakukan auto-tag")

def resolve_input(input_val: str) -> str:
    candidates = [
        Path(input_val),
        Path("content/scripts") / input_val,
    ]
    for c in candidates:
        if c.is_file():
            return c.read_text(encoding='utf-8')
    return input_val

def resolve_output_path(output_val: str | None) -> Path | None:
    if not output_val:
        return None
    p = Path(output_val)
    if len(p.parts) == 1:
        return Path("content/scripts") / p.name
    return p

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/auto_tag_script.py <input_text_or_file> [output_file]")
        print("Examples:")
        print("  python scripts/auto_tag_script.py content/scripts/naskah_ai.txt")
        print("  python scripts/auto_tag_script.py content/scripts/naskah_ai.txt content/scripts/naskah_ai_tagged.txt")
        sys.exit(1)
        
    input_val = sys.argv[1]
    content = resolve_input(input_val)
        
    tagged = auto_tag(content)
    print("\n--- HASIL AUTO TAG VOCAL ---")
    print(tagged)
    print("----------------------------\n")
    
    if len(sys.argv) > 2:
        out_path = resolve_output_path(sys.argv[2])
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(tagged, encoding='utf-8')
        print(f"Tersimpan di: {out_path}")
