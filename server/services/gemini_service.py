import os
import re
import wave
import json
import base64
import shutil
import math
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from google import genai
from google.genai import types

from server.config import (
    GEMINI_API_KEY,
    CONTENT_TITLES_DIR,
    CONTENT_SCRIPTS_DIR,
    OUTPUT_AUDIO_DIR,
    OUTPUT_TRANSCRIPTS_DIR,
    TEXT_MODEL,
    TEXT_MODEL_FALLBACK,
    TTS_MODEL,
    TRANSCRIBE_MODEL,
    AVAILABLE_VOICES,
    OFFICIAL_VOCAL_TAGS,
)
from server.schemas import (
    TitleRecommendation,
    ThumbnailConcept,
    TitleResponse,
    ScriptSegment,
    ScriptResponse,
    AutoTagResponse,
    TTSResponse,
    WordTimestamp,
    TranscribeResponse,
    HistoryItem,
)

_client = None
_detected_model_info = None

def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set. Please set it in .env or environment variable.")
        _client = genai.Client(api_key=GEMINI_API_KEY, http_options={"api_version": "v1beta"})
    return _client

def detect_active_model() -> Dict[str, str]:
    """
    Pings Gemini API to automatically detect the best responsive text model
    accessible with the configured GEMINI_API_KEY.
    """
    global _detected_model_info
    if _detected_model_info is not None:
        return _detected_model_info

    client = get_client()
    candidates = [
        {"id": "gemini-3.8-flash", "name": "Gemini 3.8 Flash"},
        {"id": "gemini-3.8-flash-lite", "name": "Gemini 3.8 Flash-Lite"},
        {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash"},
        {"id": "gemini-3.5-flash-lite", "name": "Gemini 3.5 Flash-Lite"},
    ]

    for cand in candidates:
        try:
            res = client.models.generate_content(
                model=cand["id"],
                contents="ping",
                config={"max_output_tokens": 5}
            )
            if res and res.text:
                _detected_model_info = {
                    "model_id": cand["id"],
                    "display_name": cand["name"],
                    "status": "connected"
                }
                return _detected_model_info
        except Exception:
            continue

    _detected_model_info = {
        "model_id": TEXT_MODEL,
        "display_name": "Gemini 3.8 Flash",
        "status": "default"
    }
    return _detected_model_info

def slugify(text: str) -> str:
    """Generate a clean URL/filename safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:45] if text else "konten-faceless"

def get_wav_info(wav_path: Path) -> Tuple[float, int, int]:
    """Returns (duration_seconds, sample_rate, num_frames) using wave module."""
    try:
        with wave.open(str(wav_path), "rb") as wf:
            framerate = wf.getframerate()
            nframes = wf.getnframes()
            duration = nframes / float(framerate) if framerate > 0 else 0.0
            return round(duration, 2), framerate, nframes
    except Exception:
        # Fallback approximation: 24kHz mono 16-bit PCM = 48,000 bytes/sec
        size = wav_path.stat().st_size
        est_duration = max(0.5, round((size - 44) / 48000.0, 2))
        return est_duration, 24000, int(est_duration * 24000)

def format_vtt_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    if ms >= 1000:
        s += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

# -------------------------------------------------------------------------
# 1. TAHAP 1: TITLE GENERATION (/cari-judul)
# -------------------------------------------------------------------------
SYSTEM_TITLE_PROMPT = """Kamu adalah Master Strategist Konten Edukasi Teknologi Faceless Indonesia (spesialis TikTok, YouTube Shorts, & Reels).
Tugasmu adalah menganalisis topik/data/berita dan merancang 3 rekomendasi judul video pendek dengan standar retensi tinggi dan konsep thumbnail pelengkap.

ATURAN WAJIB JUDUL:
1. PANJANG KARAKTER KETAT: Wajib 44–54 KARAKTER (termasuk spasi). Hitung dengan sangat teliti!
2. KATA KUNCI DI DEPAN: Kata kunci utama harus berada dalam 40 karakter pertama agar tidak terpotong di beranda HP.
3. FORMULA RETENSI TERUJI:
   - Numerical Specificity: angka spesifik (misal: "10.000 mAh", "2nm", "Aus 2x Cepat", "300%").
   - Contrarian / Negative: peringatan atau bantahan mitos ("Jangan Scan QR!", "Kenapa Silikon Cepat Aus?").
   - Curiosity Gap: menahan mekanisme inti ("Rahasia Bodi HP 8mm Muat Baterai Raksasa").
   - How Things Work & Contrast: perbandingan dua teknologi ("Grafit vs Silikon-Karbon").
   - Time Marker & Urgency: penanda waktu ("2026", "2027").

KONSEP THUMBNAIL SINERGIS:
- Teks Layar: 2–4 kata ringkas kontras tinggi yang melengkapi judul (bukan mengulang judul).
- Visual Utama: Deskripsi grafis kontras tinggi tanpa wajah (misal: "Animasi baterai silikon pecah micro-fracture warna neon oranye").

OUTPUT FORMAT WAJIB JSON VALID DENGAN SKEMA:
{
  "recommendations": [
    {
      "title": "Teks judul persis 44-54 karakter",
      "char_count": 48,
      "formula": "Nama Formula",
      "why_it_works": "Alasan psikologis retensi audiens"
    }
  ],
  "thumbnail": {
    "screen_text": "Teks 2-4 kata",
    "visual_concept": "Deskripsi visual grafis tanpa wajah"
  }
}
Keluarkan HANYA JSON murni tanpa markdown wrapper atau pengantar.
"""

def generate_titles(topic: str, count: int = 3) -> TitleResponse:
    client = get_client()
    user_prompt = f"Topik / Data Riset:\n{topic}\n\nHasilkan 3 rekomendasi judul 44-54 karakter dan konsep thumbnail."

    models_to_try = [TEXT_MODEL, TEXT_MODEL_FALLBACK]
    last_err = None

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config={
                    "system_instruction": SYSTEM_TITLE_PROMPT,
                    "temperature": 0.4,
                }
            )
            raw_text = response.text.strip()
            # Clean markdown codeblocks if returned
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                raw_text = re.sub(r"\n?```$", "", raw_text)

            data = json.loads(raw_text)
            recommendations: List[TitleRecommendation] = []
            for rec in data.get("recommendations", []):
                actual_title = rec.get("title", "").strip()
                recommendations.append(TitleRecommendation(
                    title=actual_title,
                    char_count=len(actual_title),
                    formula=rec.get("formula", "Curiosity Gap"),
                    why_it_works=rec.get("why_it_works", "Memicu rasa ingin tahu penonton")
                ))

            thumb_data = data.get("thumbnail", {})
            thumbnail = ThumbnailConcept(
                screen_text=thumb_data.get("screen_text", "JANGAN SALAH PILIH!"),
                visual_concept=thumb_data.get("visual_concept", "Grafis 3D kontras tinggi tanpa wajah")
            )

            # Build markdown summary for storage & display
            md_lines = [
                f"# Hasil Riset Judul Faceless: {topic[:40]}...",
                f"*Dibuat pada: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n",
                "### Rekomendasi Judul (44–54 Karakter)",
            ]
            for i, r in enumerate(recommendations, 1):
                md_lines.append(f"{i}. **{r.title}** (`{r.char_count} karakter` • Formula: `{r.formula}`)")
                md_lines.append(f"   - *Mengapa efektif:* {r.why_it_works}")
            md_lines.append("\n### Konsep Thumbnail Sinergis")
            md_lines.append(f"- **Teks Layar (2–4 kata):** `{thumbnail.screen_text}`")
            md_lines.append(f"- **Visual Utama:** {thumbnail.visual_concept}")

            markdown_output = "\n".join(md_lines)

            # Persist to content/titles
            title_slug = slugify(topic)
            title_file = CONTENT_TITLES_DIR / f"{title_slug}.md"
            title_file.write_text(markdown_output, encoding="utf-8")

            return TitleResponse(
                success=True,
                topic=topic,
                recommendations=recommendations,
                thumbnail=thumbnail,
                markdown_output=markdown_output
            )
        except Exception as e:
            last_err = e
            continue

    raise RuntimeError(f"Gagal generate judul: {last_err}")

# -------------------------------------------------------------------------
# 2. TAHAP 2: H-A-M-P SCRIPT GENERATION (/naskah)
# -------------------------------------------------------------------------
SYSTEM_SCRIPT_PROMPT = """Kamu adalah Master Penulis Naskah Video Edukasi Pendek (TikTok/Shorts/Reels) Bahasa Indonesia dengan gaya santai, cerdas, mengalir, dan berstandar retensi tinggi.

ATURAN WAJIB STRUKTUR H-A-M-P:
1. H — Hook (0–3 Detik): Langsung to-the-point dengan kontradiksi, anomali, atau angka mengejutkan. DILARANG KERAS basa-basi pembuka ("Halo guys", "Balik lagi sama gue", dll.).
2. A — Agitasi (Detik 4–15): Hubungkan fakta ke dampak nyata penonton (dompet jebol, baterai drop, privasi bocor, karier terancam).
3. M — Mekanisme (Detik 15–38): Jawab janji judul di 30% pertama. Bedah cara kerja dengan bahasa obrolan santai berbobot.
4. P — Payoff / CTA (Detik 38–Selesai): Berikan 1–2 langkah praktis pencegahan + polling diskusi interaktif di komentar.

ATURAN VISUAL RECEIPTS:
- Wajib sertakan arahan grafis visual receipts nyata di kolom visual, contoh:
  [PHONE 3D CUTAWAY], [BATTERY HEALTH GAUGE DROP 78%], [PARTICLE SWELLING 300%], [SMART CHARGE HUD 80%], [SOURCE BADGE APJII 2026].

ATURAN INLINE VOCAL TAGS GEMINI 3.8 FLASH TTS:
- Naskah audio WAJIB menyertakan inline vocal tags resmi Google Gemini secara otomatis, proporsional, dan natural (3-6 tag per naskah):
  <short pause>, <long pause>, <breath>, <heavy breath>, <exhales>, <sigh>, <pff>, <phew>, <chuckle>, <gasp>, <snicker>, <laugh>, <throat-clearing>, <whispers>, <groan>, <grunt>, <cheer>, <tsk>.
- Gunakan <short pause> sebelum punchline fakta.
- Gunakan <sigh> atau <pff> saat mengutarakan kekesalan/masalah audiens.
- Gunakan <gasp> saat angka kaget.
- Gunakan <phew> atau <exhales> di akhir segmen Payoff.

DURASI TOTAL: ~45–60 detik (~120–145 kata).

OUTPUT FORMAT WAJIB JSON VALID:
{
  "breakdown": [
    {
      "segment": "Hook",
      "time_range": "00:00 - 00:04",
      "narration": "Teks narasi hook dengan <sigh> atau tag vokal...",
      "visual_receipt": "[PHONE 3D CUTAWAY] Teks visual...",
      "sfx": "Sub-Drop / Braam"
    },
    {
      "segment": "Agitasi",
      "time_range": "00:04 - 00:15",
      "narration": "Teks narasi agitasi...",
      "visual_receipt": "[BATTERY HEALTH GAUGE]...",
      "sfx": "Warning Tick"
    },
    {
      "segment": "Mekanisme",
      "time_range": "00:15 - 00:38",
      "narration": "Teks narasi mekanisme...",
      "visual_receipt": "[PARTICLE SWELLING 300%]...",
      "sfx": "Creak / Fracture sound"
    },
    {
      "segment": "Payoff",
      "time_range": "00:38 - Selesai",
      "narration": "Teks narasi payoff dengan <phew>...",
      "visual_receipt": "[SMART CHARGE HUD 80%]...",
      "sfx": "Shield Chime"
    }
  ],
  "clean_text": "Teks narasi gabungan utuh satu paragraf TANPA VOCAL TAGS sama sekali (untuk subtitle)",
  "tagged_text": "Teks narasi gabungan utuh lengkap DENGAN AUTO INLINE VOCAL TAGS siap dibaca Gemini 3.8 Flash TTS"
}
Keluarkan HANYA JSON murni tanpa markdown wrapper atau pengantar.
"""

def generate_hamp_script(title: str, topic_context: str = "", voice_style: str = "conversational", auto_tag: bool = True) -> ScriptResponse:
    client = get_client()
    tag_instruction = "lengkap dengan auto inline vocal tags dan visual receipts." if auto_tag else "dengan narasi bersih (tanpa inline vocal tags) dan visual receipts."
    user_prompt = f"Judul Video Terpilih:\n{title}\n\nKonteks Riset Tambahan:\n{topic_context or 'Gunakan fakta kredibel teknologi terkini.'}\n\nGaya Tutur:\n{voice_style}\n\nBuat naskah H-A-M-P {tag_instruction}"

    models_to_try = [TEXT_MODEL, TEXT_MODEL_FALLBACK]
    last_err = None

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config={
                    "system_instruction": SYSTEM_SCRIPT_PROMPT,
                    "temperature": 0.4,
                }
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                raw_text = re.sub(r"\n?```$", "", raw_text)

            data = json.loads(raw_text)
            breakdown_list: List[ScriptSegment] = []
            for b in data.get("breakdown", []):
                breakdown_list.append(ScriptSegment(
                    segment=b.get("segment", "Segmen"),
                    time_range=b.get("time_range", "00:00 - 00:15"),
                    narration=b.get("narration", ""),
                    visual_receipt=b.get("visual_receipt", "[GRAPHIC]"),
                    sfx=b.get("sfx", "Chime")
                ))

            clean_text = data.get("clean_text", "").strip()
            tagged_text = data.get("tagged_text", "").strip()

            if not clean_text and tagged_text:
                # Strip tags automatically
                clean_text = re.sub(r"<[^>]+>", "", tagged_text).strip()
                clean_text = re.sub(r"\s+", " ", clean_text)

            if not tagged_text and clean_text:
                tagged_text = clean_text

            if not auto_tag:
                # User opted out of vocal tags, enforce clean text for audio synthesis
                tagged_text = clean_text
                for b in breakdown_list:
                    b.narration = re.sub(r"<[^>]+>", "", b.narration).strip()
                    b.narration = re.sub(r"\s+", " ", b.narration)

            words = clean_text.split()
            word_count = len(words)
            # Estimate 2.5 words per second in Indonesian speech
            est_duration = round(word_count / 2.5, 1)

            # Build markdown table
            table_rows = [
                "| Waktu / Segmen | Narasi Voice-Over (Audio) | Arahan Visual & Motion | Sound Effect (SFX) |",
                "| :--- | :--- | :--- | :--- |"
            ]
            for b in breakdown_list:
                table_rows.append(f"| `{b.time_range}` **({b.segment})** | {b.narration} | `{b.visual_receipt}` | *{b.sfx}* |")
            markdown_table = "\n".join(table_rows)

            slug = slugify(title)
            # Save to content/scripts
            txt_path = CONTENT_SCRIPTS_DIR / f"{slug}.txt"
            md_path = CONTENT_SCRIPTS_DIR / f"{slug}.md"

            txt_path.write_text(tagged_text, encoding="utf-8")

            full_md_content = f"""# Naskah H-A-M-P: {title}
*Dibuat: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Durasi Estimasi: ~{est_duration}s ({word_count} kata)*

### Naskah Siap Rekam (Format 2 Kolom)
{markdown_table}

### Teks Narasi Bersih (Tanpa Tag - Subtitle):
> {clean_text}

### Teks Narasi Siap TTS (Dengan Inline Vocal Tags):
> {tagged_text}
"""
            md_path.write_text(full_md_content, encoding="utf-8")

            return ScriptResponse(
                success=True,
                title=title,
                slug=slug,
                breakdown=breakdown_list,
                clean_text=clean_text,
                tagged_text=tagged_text,
                word_count=word_count,
                estimated_duration_sec=est_duration,
                saved_path=str(txt_path),
                markdown_table=markdown_table
            )
        except Exception as e:
            last_err = e
            continue

    raise RuntimeError(f"Gagal generate naskah: {last_err}")

# -------------------------------------------------------------------------
# 3. AUTO TAG VOCAL (/scripts/auto-tag)
# -------------------------------------------------------------------------
SYSTEM_AUTOTAG_PROMPT = """Kamu adalah ahli penata vokal dan sutradara suara untuk video edukasi pendek (TikTok/Shorts/Reels) yang menggunakan model Gemini 3.8 Flash TTS.

Tugasmu:
Menyisipkan INLINE VOCAL TAGS resmi Google Gemini secara otomatis, natural, dan proporsional ke dalam naskah bahasa Indonesia agar terdengar seperti manusia berbicara (ekspresif, bernapas, ada jeda, dan emosional).

Daftar tag resmi yang didukung:
<short pause>  <long pause>  <breath>  <heavy breath>  <exhales>
<sigh>  <pff>  <phew>  <chuckle>  <gasp>  <snicker>  <laugh>
<throat-clearing>  <whispers>  <groan>  <grunt>  <cheer>  <tsk>

Aturan Penyisipan Tag:
1. JANGAN berlebihan! Cukup 3-6 tag per 60 detik naskah agar tetap profesional dan enak didengar.
2. Gunakan:
   - <short pause> pada koma penting, pergantian ide, atau sebelum mengungkap fakta kunci.
   - <sigh> atau <pff> pada rasa frustrasi atau masalah penonton.
   - <gasp> pada saat ada angka / fakta mengejutkan.
   - <chuckle> atau <snicker> saat membongkar mitos lucu atau kesalahan umum.
   - <breath> sebelum kalimat panjang atau penjelasan teknis.
   - <phew> atau <exhales> pada solusi akhir yang melegakan.
3. Tetap pertahankan teks asli tanpa mengubah maknanya.
4. Output HANYA teks naskah yang sudah diberi tag, tanpa pengantar atau penjelasan tambahan.
"""

def auto_tag_text(text: str) -> AutoTagResponse:
    client = get_client()
    models_to_try = [TEXT_MODEL, TEXT_MODEL_FALLBACK]

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=f"Naskah:\n{text}\n\nMasukkan inline vocal tags secara natural:",
                config={
                    "system_instruction": SYSTEM_AUTOTAG_PROMPT,
                    "temperature": 0.4,
                }
            )
            tagged = response.text.strip()
            # Find detected tags
            detected = re.findall(r"<[a-zA-Z -]+>", tagged)
            return AutoTagResponse(
                success=True,
                original_text=text,
                tagged_text=tagged,
                tag_count=len(detected),
                detected_tags=detected
            )
        except Exception:
            continue
    raise RuntimeError("Gagal melakukan auto tag vokal.")

# -------------------------------------------------------------------------
# 4. TAHAP 3: GEMINI 3.8 FLASH TTS (/tts)
# -------------------------------------------------------------------------
def generate_tts(text: str, voice: str = "Kore", filename: str = None, style: str = None) -> TTSResponse:
    client = get_client()

    # Determine filename and slug
    if not filename:
        slug = f"audio_{int(time.time())}"
    else:
        slug = slugify(filename)

    out_file = OUTPUT_AUDIO_DIR / f"{slug}.wav"

    # Find voice style description if not provided
    selected_voice_info = next((v for v in AVAILABLE_VOICES if v["id"].lower() == voice.lower()), AVAILABLE_VOICES[0])
    effective_voice = selected_voice_info["id"]
    effective_style = style or selected_voice_info.get("style", "energetic, natural tech educator, conversational style")

    interaction = client.interactions.create(
        model=TTS_MODEL,
        input=[{
            "type": "user_input",
            "content": [{
                "type": "text",
                "text": text,
                "annotations": [{
                    "type": "speech_metadata",
                    "style": effective_style,
                }],
            }],
        }],
        response_format={"type": "audio"},
        generation_config={
            "speech_config": [
                {"voice": effective_voice},
            ]
        },
    )

    if not interaction.output_audio or not interaction.output_audio.data:
        raise RuntimeError("Model Gemini 3.8 Flash TTS tidak mengembalikan data audio.")

    audio_bytes = base64.b64decode(interaction.output_audio.data)

    # Save to primary output
    out_file.write_bytes(audio_bytes)

    # Read duration & framerate
    duration_sec, sample_rate, _ = get_wav_info(out_file)
    duration_frames = math.ceil(duration_sec * 30)
    file_size = out_file.stat().st_size

    audio_url = f"/api/audio/{out_file.name}"

    return TTSResponse(
        success=True,
        filename=out_file.name,
        audio_url=audio_url,
        voice=effective_voice,
        duration_sec=duration_sec,
        duration_frames=duration_frames,
        file_size_bytes=file_size,
        sample_rate=sample_rate,
        primary_path=str(out_file),
        mirror_path=None
    )

# -------------------------------------------------------------------------
# 5. TAHAP 4: GEMINI 3.5 TRANSCRIBE (/transkrip)
# -------------------------------------------------------------------------
def transcribe_audio(audio_file_or_path: Optional[str] = None) -> TranscribeResponse:
    client = get_client()

    # Resolve target audio
    target_path = None
    if audio_file_or_path:
        candidates = [
            Path(audio_file_or_path),
            OUTPUT_AUDIO_DIR / audio_file_or_path,
            OUTPUT_AUDIO_DIR / f"{audio_file_or_path}.wav",
        ]
        for c in candidates:
            if c.is_file():
                target_path = c
                break

    if not target_path:
        # Pick the latest wav file in OUTPUT_AUDIO_DIR
        wav_files = list(OUTPUT_AUDIO_DIR.glob("*.wav"))
        if not wav_files:
            raise FileNotFoundError("Tidak ada file audio WAV ditemukan di output/audio/")
        wav_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        target_path = wav_files[0]

    base_stem = target_path.stem
    mime = "audio/wav" if target_path.suffix.lower() == ".wav" else "audio/mp3"

    # Upload to Gemini Files API
    uploaded_file = client.files.upload(file=str(target_path))

    response = client.interactions.create(
        model=TRANSCRIBE_MODEL,
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

    words: List[Dict[str, Any]] = []
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
        # Fallback dump or synthetic breakdown
        words = [{"text": "Selesai", "startSec": 0.0, "endSec": 1.0}]

    # 1. Primary Output: output/transcripts/{base_stem}.json & .vtt
    json_path = OUTPUT_TRANSCRIPTS_DIR / f"{base_stem}.json"
    vtt_path = OUTPUT_TRANSCRIPTS_DIR / f"{base_stem}.vtt"

    json_path.write_text(json.dumps(words, indent=2, ensure_ascii=False), encoding="utf-8")

    # Build WebVTT
    vtt_lines = ["WEBVTT", ""]
    for idx, w in enumerate(words, 1):
        vtt_lines.append(f"{idx}")
        vtt_lines.append(f"{format_vtt_time(w['startSec'])} --> {format_vtt_time(w['endSec'])}")
        vtt_lines.append(w["text"])
        vtt_lines.append("")
    vtt_content = "\n".join(vtt_lines)
    vtt_path.write_text(vtt_content, encoding="utf-8")

    word_items = [WordTimestamp(text=w["text"], startSec=w["startSec"], endSec=w["endSec"]) for w in words]
    total_duration = words[-1]["endSec"] if words else 0.0

    return TranscribeResponse(
        success=True,
        filename=base_stem,
        words=word_items,
        vtt_content=vtt_content,
        vtt_url=f"/api/transcripts/{base_stem}.vtt",
        json_url=f"/api/transcripts/{base_stem}.json",
        word_count=len(words),
        duration_sec=total_duration
    )

# -------------------------------------------------------------------------
# 6. HISTORY & PERSISTENCE
# -------------------------------------------------------------------------
def get_history_items() -> List[HistoryItem]:
    items: List[HistoryItem] = []
    # Check output/audio for generated files
    wav_files = list(OUTPUT_AUDIO_DIR.glob("*.wav"))
    wav_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    for wf in wav_files:
        stem = wf.stem
        stat = wf.stat()
        created_iso = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        dur, _, _ = get_wav_info(wf)

        # Check transcript
        json_f = OUTPUT_TRANSCRIPTS_DIR / f"{stem}.json"
        vtt_f = OUTPUT_TRANSCRIPTS_DIR / f"{stem}.vtt"
        has_transcript = json_f.exists()

        items.append(HistoryItem(
            id=stem,
            type="audio",
            name=wf.name,
            title=stem.replace("-", " ").replace("_", " ").title(),
            created_at=created_iso,
            file_size_bytes=stat.st_size,
            duration_sec=dur,
            audio_url=f"/api/audio/{wf.name}",
            json_url=f"/api/transcripts/{stem}.json" if has_transcript else None,
            vtt_url=f"/api/transcripts/{stem}.vtt" if has_transcript else None,
            has_transcript=has_transcript
        ))

    return items
