import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from server.config import (
    BASE_DIR,
    OUTPUT_AUDIO_DIR,
    OUTPUT_TRANSCRIPTS_DIR,
    GEMINI_API_KEY,
    TEXT_MODEL,
    TTS_MODEL,
    TRANSCRIBE_MODEL,
)
from server.routers import (
    titles,
    scripts,
    tts,
    transcribe,
    pipeline,
    media,
    history,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup check
    print("=" * 60)
    print("🎙️ AI Faceless Video Production Engine (FastAPI Backend)")
    print(f"📁 Workspace: {BASE_DIR}")
    print(f"🔑 Gemini API Key configured: {bool(GEMINI_API_KEY)}")
    print(f"⚡ Text Model: {TEXT_MODEL}")
    print(f"🔊 TTS Model: {TTS_MODEL}")
    print(f"📝 Transcribe Model: {TRANSCRIBE_MODEL}")
    print(f"🎧 Output Audio: {OUTPUT_AUDIO_DIR}")
    print(f"📄 Output Transcripts: {OUTPUT_TRANSCRIPTS_DIR}")
    print("=" * 60)
    yield
    print("🛑 FastAPI server shutting down...")

app = FastAPI(
    title="AI Faceless Video Production API",
    description="Backend service untuk produksi video edukasi pendek faceless dengan Google Gemini 3.8 Flash TTS, Gemini 3.5 Transcribe, dan H-A-M-P Script generator.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite / React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directories for direct audio/transcript asset serving
app.mount("/audio", StaticFiles(directory=str(OUTPUT_AUDIO_DIR)), name="audio_static")
app.mount("/transcripts", StaticFiles(directory=str(OUTPUT_TRANSCRIPTS_DIR)), name="transcripts_static")

# Include Routers
app.include_router(titles.router)
app.include_router(scripts.router)
app.include_router(tts.router)
app.include_router(transcribe.router)
app.include_router(pipeline.router)
app.include_router(media.router)
app.include_router(history.router)

@app.get("/")
async def root():
    return {
        "service": "AI Faceless Video Production Engine",
        "status": "online",
        "docs_url": "/docs",
        "endpoints": {
            "title_generation": "POST /api/titles/generate",
            "script_generation": "POST /api/scripts/generate",
            "auto_tag_vocal": "POST /api/scripts/auto-tag",
            "tts_generate": "POST /api/tts/generate",
            "tts_voices": "GET /api/tts/voices",
            "vocal_tags": "GET /api/tts/tags",
            "transcribe": "POST /api/transcribe",
            "pipeline_sync": "POST /api/pipeline/run",
            "pipeline_sse": "GET /api/pipeline/stream or POST /api/pipeline/stream",
            "audio_file": "GET /api/audio/{filename}",
            "transcript_file": "GET /api/transcripts/{filename}",
            "history": "GET /api/history",
            "health": "GET /api/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
