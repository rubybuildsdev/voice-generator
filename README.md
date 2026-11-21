# Mosaic Voice Studio — AI Faceless Video Production Engine (v3.0 Refactored)

Arsitektur hasil audit & refactor penuh dari `rubybuildsdev/voice-generator` dengan backend FastAPI modular, perbaikan seluruh celah keamanan/konkurensi/logika, dan antarmuka **Mosaic Voice Studio** yang menyamakan estetika `MosaicPromptTemplate` (3-scene WebGL re-tiling sky, tipografi pixel SVG interaktif, liquid-glass morphing composer, dan 3D tilt spotlight cards).

## Ringkasan Perbaikan Utama

### Keamanan & Validasi
- **Anti Path Traversal:** Validasi terpusat `safe_resolve_under()` di `server/config.py` diterapkan pada `transcribe_service.py`, `tts_service.py`, dan `media.py`.
- **CORS Aman:** Menghapus kombinasi wildcard `allow_origins=["*"]` + `allow_credentials=True`; origin dikonfigurasi via `CORS_ORIGINS` di `.env`.
- **Sanitasi Error & POST-Only SSE:** Menghapus `GET /api/pipeline/stream` (mencegah paparan naskah panjang di URL) dan menyaring pesan exception internal dari respons HTTP/SSE.

### Konkurensi & Stabilitas
- **Non-Blocking Event Loop:** Seluruh router (`titles`, `scripts`, `tts`, `transcribe`, `history`) membungkus I/O Gemini/disk dengan `await asyncio.to_thread(...)`.
- **Thread-Safe Client & TTL Health Check:** `server/services/gemini_client.py` memakai `threading.Lock` dan TTL cache (kegagalan startup sementara tidak lagi mengunci status permanen).
- **Anti Kolisi File & Cache Stale:** `unique_slug_filename()` menambahkan timestamp UTC + 6-char UUID hex, penulisan file atomik (`os.replace`), dan header `Cache-Control: no-cache, must-revalidate`.
- **Anti Stream Ganda & Unhandled Rejection:** `useStudioPipeline.ts` membatalkan `AbortController` aktif sebelum memulai stream baru serta saat unmount, dan menangani error `fetchHistory`/`fetchHealth`.

### Bug Logika
- **Presisi WebVTT:** `format_vtt_time()` di `audio_utils.py` memakai total milidetik integer + `divmod`, mustahil menghasilkan `00:00:60.000` atau `.1000`.
- **Tanpa Silent Fallback:** `transcribe_audio()` melempar `FileNotFoundError` eksplisit jika file tidak ditemukan, menghapus file di Gemini Files API dalam blok `finally`, dan tidak mengembalikan dummy `"Selesai"`.
- **Orchestrator Lintas OS:** `run_studio.py` memanggil `wait_for_server()` sebelum membuka browser dan mematikan seluruh process group/tree (`os.killpg` di POSIX, `taskkill /F /T` di Windows).

## Cara Menjalankan (Windows PowerShell)

```powershell
# 1. Siapkan environment Python
python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt

# 2. Salin konfigurasi API key
Copy-Item .env.example .env
# Isi GEMINI_API_KEY di file .env

# 3. Instal dependensi UI
cd ui; npm install; cd ..

# 4. Jalankan full-stack studio (Backend + Frontend otomatis)
python run_studio.py
```

## Pengujian & Verifikasi

```powershell
# Unit & security tests backend
python -m unittest discover -s tests -v

# Lint & TypeScript build frontend
cd ui; npm run lint; if ($?) { npm run build }; cd ..
```
