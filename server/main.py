"""Entrypoint aplikasi FastAPI untuk Mosaic Voice Studio (v3.0.0)."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from server.config import CORS_ORIGINS, LOG_LEVEL, UI_DIST_DIR, ensure_directories
from server.routers import history, media, pipeline, scripts, titles, transcribe, tts

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_directories()
    logger.info("Mosaic Voice Studio API v3.0.0 siap (CORS: %s)", CORS_ORIGINS)
    yield


app = FastAPI(
    title="Mosaic Voice Studio — AI Faceless Video Production API",
    version="3.0.0",
    lifespan=lifespan,
)

# Keamanan CORS: tidak pernah mengizinkan wildcard origin dengan allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Terjadi kesalahan internal pada server."},
    )


app.include_router(history.router)
app.include_router(titles.router)
app.include_router(scripts.router)
app.include_router(tts.router)
app.include_router(transcribe.router)
app.include_router(pipeline.router)
app.include_router(media.router)

if UI_DIST_DIR.exists() and (UI_DIST_DIR / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(UI_DIST_DIR), html=True), name="ui")
