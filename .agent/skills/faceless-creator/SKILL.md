---
name: faceless-creator
description: "Master skill modular untuk produksi video edukasi faceless. Menangani 4 perintah terpisah bertahap: /cari-judul (riset judul 44-54 karakter dari data), /naskah (naskah H-A-M-P natural, visual receipts, dan auto inline vocal tags Gemini TTS), /tts (generate suara narator via Gemini 3.8 Flash TTS), dan /transkrip (transkripsi kata per kata presisi milidetik via Gemini 3.5 Transcribe)."
---

# FACELESS CREATOR (MODULAR 4-STAGE PIPELINE)

## Arsitektur & Struktur Direktori Kerja
Sistem ini menggunakan arsitektur folder 4-tahap yang terisolasi rapi dan efisien:

```
voice-generator/
├── content/
│   ├── titles/               # [Tahap 1] Bank riset topik & ide judul teruji (.md)
│   └── scripts/              # [Tahap 2] Naskah narasi H-A-M-P siap rekam (.txt / .md)
├── docs/
│   └── list-voice.md         # Katalog 30+ profil suara studio & panduan vocal tags
├── output/
│   ├── audio/                # [Tahap 3] File WAV voice-over resmi (24 kHz Mono)
│   └── transcripts/          # [Tahap 4] File WebVTT (.vtt) & JSON word-level timestamps
├── scripts/                  # Mesin eksekusi Gemini API (TTS, Transcribe, Auto-Tag)
├── server/                   # Backend API (FastAPI)
└── ui/                       # Frontend Voice Studio (React + Vite)
```

## Ikhtisar Alur Kerja Modular
Pengguna memiliki kendali penuh di setiap tahapan produksi melalui 4 perintah utama:

```
[1. /cari-judul] ──► Riset & validasi judul 44-54 karakter ──► content/titles/
       │
       ▼
[2. /naskah]     ──► Naskah H-A-M-P + Auto Vocal Tags      ──► content/scripts/
       │
       ▼
[3. /tts]        ──► Sintesis Audio Gemini 3.8 Flash TTS   ──► output/audio/
       │
       ▼
[4. /transkrip]  ──► Subtitle Kinetik Kata per Kata        ──► output/transcripts/
```

---

## 1. Perintah `/cari-judul`
**Pemicu:** `/cari-judul [tempel data / teks artikel / berita / topik kasar]`  
**Tujuan Penyimpanan:** Disimpan di `content/titles/` (contoh: `content/titles/45-ide-konten-faceless.md`)  
**Tugas:** Mengekstrak fakta terkuat menjadi 3 rekomendasi judul video pendek berstandar retensi tinggi dan konsep thumbnail pelengkap.

### Aturan Wajib Judul:
1. **Panjang Karakter Ketat:** Wajib **44–54 karakter** (termasuk spasi). Hitung dan tuliskan jumlah karakternya di samping judul.
2. **Kata Kunci di Depan:** Letakkan kata kunci utama di 40 karakter pertama.
3. **5 Formula Teruji:**
   - **Numerical Specificity:** Angka spesifik (`10.000 mAh`, `2nm`, `Aus 2x Cepat`, `300%`).
   - **Contrarian / Negative:** Peringatan atau bantahan mitos (`Jangan Scan QR!`, `Kenapa Silikon Cepat Aus?`).
   - **Curiosity Gap:** Menahan mekanisme inti (`Rahasia Bodi HP 8mm Muat Baterai Raksasa`).
   - **How Things Work & Contrast:** Perbandingan dua teknologi (`Grafit vs Silikon-Karbon`).
   - **Time Marker & Urgency:** Menggunakan penanda waktu (`2026`, `2027`).

### Format Output `/cari-judul`:
```markdown
### Rekomendasi Judul (44–54 Karakter)
1. **[Teks Judul 1]** (`XX karakter` • Formula: `[Nama Formula]`)
2. **[Teks Judul 2]** (`XX karakter` • Formula: `[Nama Formula]`)
3. **[Teks Judul 3]** (`XX karakter` • Formula: `[Nama Formula]`)

### Konsep Thumbnail Sinergis
- **Teks Layar (2–4 kata):** `[Teks singkat melengkapi judul]`
- **Visual Utama:** `[Deskripsi grafis kontras tinggi tanpa wajah]`

👉 *Ketik `/naskah [nomor/judul pilihan]` untuk membuat naskah.*
```

---

## 2. Perintah `/naskah`
**Pemicu:** `/naskah [judul]` atau `/naskah` (menggunakan judul yang baru dipilih)  
**Tujuan Penyimpanan:** Simpan naskah ke `content/scripts/[slug].txt` atau `content/scripts/[slug].md`  
**Tugas:** Merancang naskah siap baca bergaya percakapan cerdas santai Indonesia lengkap dengan arahan visual sinematik (*Visual Receipts*), sound effects (SFX), dan penyisipan otomatis inline vocal tags Gemini TTS.

### Aturan Wajib Naskah:
1. **Kerangka H-A-M-P:**
   - **H — Hook (0–3 Detik):** Langsung to-the-point dengan kontradiksi atau angka mengejutkan. **LARANGAN KERAS:** Dilarang basa-basi pembuka (*"Halo semuanya"*, dll.).
   - **A — Agitasi (Detik 4–15):** Hubungkan fakta ke dampak nyata penonton (dompet, privasi, baterai rusak, karier).
   - **M — Mekanisme (Inti Video):** Jawab janji judul di 30% pertama video. Bedah cara kerja dengan bahasa obrolan santai, bukan akademis kaku.
   - **P — Payoff / CTA (Penutup):** 1–2 langkah praktis pencegahan + polling diskusi interaktif di komentar.
2. **Visual Receipts (Bukan Kotak Dashboard Biasa):**
   - Wajib menyertakan grafis nyata: `[PHONE 3D CUTAWAY]`, `[BATTERY HEALTH GAUGE DROP]`, `[PARTICLE SWELLING 300%]`, `[SMART CHARGE HUD 80%]`, atau `[SOURCE BADGE]`.
3. **Durasi Ideal:** ~45–60 detik (~120–145 kata).
4. **Otomatisasi Inline Vocal Tags (Gemini 3.8 Flash TTS):**
   - Naskah **WAJIB langsung menyertakan inline vocal tags resmi Google Gemini** secara otomatis, natural, dan proporsional (3–6 tag per 60 detik naskah) agar audio voice-over terdengar seperti manusia hidup (ada nafas, jeda, tawa kecil, atau emosi frustrasi).
   - **Daftar Tag Resmi yang Didukung:**
     `<short pause>`, `<long pause>`, `<breath>`, `<heavy breath>`, `<exhales>`, `<sigh>`, `<pff>`, `<phew>`, `<chuckle>`, `<gasp>`, `<snicker>`, `<laugh>`, `<throat-clearing>`, `<whispers>`, `<groan>`, `<grunt>`, `<cheer>`, `<tsk>`.
   - **Panduan Penempatan Tag Natural:**
     - `<short pause>`: Pada koma penting, pergantian ide, jeda dramatis, atau sebelum mengungkap fakta kunci.
     - `<sigh>` atau `<pff>`: Pada rasa frustrasi atau masalah penonton (Hook / Agitasi).
     - `<gasp>`: Pada saat ada angka mengejutkan atau peringatan bahaya.
     - `<chuckle>` atau `<snicker>`: Saat membongkar mitos lucu, kebiasaan keliru, atau ironi.
     - `<breath>`: Sebelum kalimat teknis atau penjelasan panjang.
     - `<phew>` atau `<exhales>`: Pada solusi akhir yang melegakan di segmen Payoff.
     - *(Tersedia helper script `python scripts/auto_tag_script.py` jika memproses teks eksternal).*

### Format Output `/naskah`:
```markdown
### Naskah Siap Rekam (Format 2 Kolom)
| Waktu / Segmen | Narasi Voice-Over (Audio) | Arahan Visual & Motion | Sound Effect (SFX) |
| :--- | :--- | :--- | :--- |
| `00:00 - 00:04` **(Hook)** | *(Narasi lugas dengan auto vocal tags)* | `[PHONE CUTAWAY]` ... | *Sub-Drop / Braam* |
| `00:04 - 00:15` **(Agitasi)** | ... | `[HEALTH GAUGE]` ... | *Warning Tick* |
| `00:15 - 00:38` **(Mekanisme)** | ... | `[PARTICLE SWELLING]` ... | *Creak / Fracture sound* |
| `00:38 - Selesai` **(Payoff)** | ... | `[SMART CHARGE 80%]` ... | *Shield Chime* |

### Teks Narasi Bersih (Tanpa Tag - untuk Tampilan / Subtitle):
> "[Teks narasi satu paragraf penuh bersih tanpa vocal tags...]"

### Teks Narasi Siap TTS (Dengan Auto Inline Vocal Tags):
> "[Teks narasi lengkap dengan <short pause>, <breath>, <sigh>, dll. yang siap langsung diproses Gemini 3.8 Flash TTS...]"

👉 *Tersimpan di `content/scripts/[slug].txt`. Ketik `/tts` untuk men-generate suara voice-over.*
```

---

## 3. Perintah `/tts`
**Pemicu:** `/tts [path_file_atau_teks]` atau `/tts` (menggunakan naskah terakhir)  
**Tujuan Penyimpanan:** `output/audio/[slug].wav`  
**Tugas:** Mengonversi naskah menjadi file audio WAV berkualitas tinggi menggunakan **Gemini 3.8 Flash TTS**.

### Eksekusi Teknis:
1. Jalankan script (bisa menggunakan file di `content/scripts/` atau teks langsung):
   ```bash
   python scripts/generate_audio_gemini.py "content/scripts/[slug].txt" "output/audio/[slug].wav" "Kore"
   ```
   *(Pilihan suara populer: `Kore` [Tegas/Edukatif], `Fola` [Jernih/Ramah], dll. — lihat `docs/list-voice.md`)*
2. Menggunakan model resmi: **`gemini-3.8-flash-tts`** (API version `v1beta`).
3. Output audio WAV 24 kHz mono disimpan di `output/audio/[slug].wav`.
4. Hitung durasi audio presisi (dalam detik) dan konversi ke total frame Remotion @ 30 FPS:
   $$\text{durationInFrames} = \lceil \text{audioDurationInSeconds} \times 30 \rceil$$

### Format Output `/tts`:
```markdown
### Voice-Over Berhasil Dihasilkan!
- **Audio File:** `output/audio/[slug].wav`
- **Model:** `gemini-3.8-flash-tts` (Voice: Kore)
- **Durasi Audio:** `XX.XX detik` (`XXXX frames @ 30 FPS`)

👉 *Ketik `/transkrip` untuk mengekstrak transkrip kata per kata dari audio ini.*
```

---

## 4. Perintah `/transkrip`
**Pemicu:** `/transkrip [path audio]` atau `/transkrip` (menggunakan audio terakhir)  
**Tujuan Penyimpanan:** 
- `output/transcripts/[slug].json` (Data word-level timestamps lengkap)
- `output/transcripts/[slug].vtt` (Subtitle WebVTT per kata)  
**Tugas:** Mentranskrip audio **KATA PER KATA (word-level timestamps)** menggunakan **Gemini 3.5 Transcribe** untuk subtitle kinetik.

### Eksekusi Teknis:
1. Jalankan script:
   ```bash
   python scripts/transcribe_words.py "output/audio/[slug].wav"
   ```
2. Menggunakan model resmi: **`gemini-3.5-transcribe`** (v1beta) dengan mode word-level timestamp:
   ```python
   "timestamp_granularities": ["word"]
   ```
3. **ATURAN MUTLAK: Transkripsi WAJIB per kata, BUKAN per kalimat.**

### Format Output `/transkrip`:
```markdown
### Transkrip Per Kata Selesai!
- **Total Kata:** `XXX kata` berhasil diekstrak dengan offset milidetik.
- **Lokasi Data:**
  - `output/transcripts/[slug].json`
  - `output/transcripts/[slug].vtt`
- **Contoh Word Timestamps:**
  - `0.20s - 0.50s`: "[Kata 1]"
  - `0.50s - 0.70s`: "[Kata 2]"
  - `0.70s - 1.00s`: "[Kata 3]"

👉 *Audio dan data transkrip per kata kini siap dipasang ke komposisi Remotion Studio!*
```
