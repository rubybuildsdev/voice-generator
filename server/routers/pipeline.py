import asyncio
import json
import time
from typing import AsyncGenerator
from fastapi import APIRouter, Request, HTTPException, Query
from sse_starlette.sse import EventSourceResponse

from server.schemas import PipelineRequest, PipelineResponse
from server.services import gemini_service

router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])

async def execute_pipeline_generator(
    intent: str,
    prompt: str,
    title: str = None,
    script_text: str = None,
    voice: str = "Kore",
    auto_tag: bool = True,
    auto_proceed: bool = True
) -> AsyncGenerator[dict, None]:
    start_time = time.time()
    current_title = title or ""
    current_script_tagged = script_text or ""
    current_audio_file = None

    try:
        # Determine intent if auto
        effective_intent = intent
        if effective_intent == "auto":
            # If prompt has tags or is multi-line with script keywords, treat as script/voice
            if any(t in prompt for t in ["<short pause>", "<sigh>", "<breath>"]) or len(prompt.split()) > 40:
                effective_intent = "voice_only"
            elif any(w in prompt.lower() for w in ["judul", "ide", "topik", "riset", "berita"]):
                effective_intent = "title"
            else:
                effective_intent = "title"

        yield {
            "event": "log",
            "data": json.dumps({
                "step": "init",
                "status": "running",
                "message": f"Pipeline dimulai. Mode: {effective_intent.upper()} (Suara: {voice})",
                "progress": 5
            })
        }
        await asyncio.sleep(0.1)

        # -------------------------------------------------------------
        # STEP 1: TITLE GENERATION
        # -------------------------------------------------------------
        if effective_intent in ["title", "full", "auto"]:
            yield {
                "event": "step_start",
                "data": json.dumps({
                    "step": "title",
                    "status": "running",
                    "message": "Tahap 1: Meriset judul tajam 44-54 karakter & konsep thumbnail...",
                    "progress": 15
                })
            }
            # Run blocking call in threadpool
            title_res = await asyncio.to_thread(gemini_service.generate_titles, prompt, 3)
            best_rec = title_res.recommendations[0] if title_res.recommendations else None
            current_title = best_rec.title if best_rec else prompt[:50]

            yield {
                "event": "step_complete",
                "data": json.dumps({
                    "step": "title",
                    "status": "done",
                    "message": f"Tahap 1 Selesai: {len(title_res.recommendations)} judul ditemukan. Terpilih: '{current_title}'",
                    "progress": 30,
                    "payload": title_res.model_dump()
                })
            }
            await asyncio.sleep(0.1)

            if not auto_proceed and effective_intent == "title":
                yield {
                    "event": "pipeline_complete",
                    "data": json.dumps({
                        "status": "complete",
                        "message": "Riset judul selesai. Silakan pilih judul untuk naskah.",
                        "progress": 100,
                        "execution_time_sec": round(time.time() - start_time, 2)
                    })
                }
                return

        # -------------------------------------------------------------
        # STEP 2: SCRIPT GENERATION
        # -------------------------------------------------------------
        if effective_intent in ["script", "full", "auto"] or (auto_proceed and current_title):
            if not current_script_tagged:
                script_title = current_title or prompt
                yield {
                    "event": "step_start",
                    "data": json.dumps({
                        "step": "script",
                        "status": "running",
                        "message": f"Tahap 2: Menyusun naskah H-A-M-P & menyisipkan auto vocal tags untuk: '{script_title[:40]}...' ",
                        "progress": 40
                    })
                }
                script_res = await asyncio.to_thread(
                    gemini_service.generate_hamp_script,
                    title=script_title,
                    topic_context=prompt if prompt != script_title else "",
                    voice_style="conversational",
                    auto_tag=auto_tag
                )
                current_script_tagged = script_res.tagged_text

                yield {
                    "event": "step_complete",
                    "data": json.dumps({
                        "step": "script",
                        "status": "done",
                        "message": f"Tahap 2 Selesai: Naskah siap rekam ({script_res.word_count} kata, ~{script_res.estimated_duration_sec}s)",
                        "progress": 55,
                        "payload": script_res.model_dump()
                    })
                }
                await asyncio.sleep(0.1)

                if not auto_proceed and effective_intent == "script":
                    yield {
                        "event": "pipeline_complete",
                        "data": json.dumps({
                            "status": "complete",
                            "message": "Naskah selesai. Siap diproses ke sintesis audio TTS.",
                            "progress": 100,
                            "execution_time_sec": round(time.time() - start_time, 2)
                        })
                    }
                    return

        # -------------------------------------------------------------
        # STEP 3: TTS SYNTHESIS
        # -------------------------------------------------------------
        if effective_intent in ["voice_only", "full", "auto"] or (auto_proceed and current_script_tagged):
            text_for_tts = current_script_tagged or prompt
            yield {
                "event": "step_start",
                "data": json.dumps({
                    "step": "tts",
                    "status": "running",
                    "message": f"Tahap 3: Mensintesis voice-over WAV dengan Gemini 3.8 Flash TTS ({voice})...",
                    "progress": 65
                })
            }
            tts_res = await asyncio.to_thread(
                gemini_service.generate_tts,
                text=text_for_tts,
                voice=voice,
                filename=gemini_service.slugify(current_title or "voice-studio")
            )
            current_audio_file = tts_res.filename

            yield {
                "event": "step_complete",
                "data": json.dumps({
                    "step": "tts",
                    "status": "done",
                    "message": f"Tahap 3 Selesai: Audio '{tts_res.filename}' dihasilkan ({tts_res.duration_sec}s, {tts_res.duration_frames} frames)",
                    "progress": 80,
                    "payload": tts_res.model_dump()
                })
            }
            await asyncio.sleep(0.1)

            if not auto_proceed and effective_intent == "voice_only":
                yield {
                    "event": "pipeline_complete",
                    "data": json.dumps({
                        "status": "complete",
                        "message": "Audio selesai.",
                        "progress": 100,
                        "execution_time_sec": round(time.time() - start_time, 2)
                    })
                }
                return

        # -------------------------------------------------------------
        # STEP 4: WORD-LEVEL TRANSCRIBE
        # -------------------------------------------------------------
        if auto_proceed and current_audio_file:
            yield {
                "event": "step_start",
                "data": json.dumps({
                    "step": "transcribe",
                    "status": "running",
                    "message": f"Tahap 4: Mengekstrak transkrip kata per kata dengan Gemini 3.5 Transcribe...",
                    "progress": 85
                })
            }
            trans_res = await asyncio.to_thread(gemini_service.transcribe_audio, current_audio_file)

            yield {
                "event": "step_complete",
                "data": json.dumps({
                    "step": "transcribe",
                    "status": "done",
                    "message": f"Tahap 4 Selesai: {trans_res.word_count} kata presisi milidetik siap untuk Remotion Studio!",
                    "progress": 100,
                    "payload": trans_res.model_dump()
                })
            }
            await asyncio.sleep(0.1)

        # -------------------------------------------------------------
        # PIPELINE FINISH
        # -------------------------------------------------------------
        total_time = round(time.time() - start_time, 2)
        yield {
            "event": "pipeline_complete",
            "data": json.dumps({
                "status": "complete",
                "message": f"Seluruh tahapan produksi video faceless berhasil diselesaikan dalam {total_time} detik!",
                "progress": 100,
                "execution_time_sec": total_time
            })
        }

    except Exception as err:
        yield {
            "event": "error",
            "data": json.dumps({
                "status": "error",
                "error": str(err),
                "progress": 0
            })
        }

@router.get("/stream")
async def pipeline_stream_get(
    request: Request,
    intent: str = Query("auto"),
    prompt: str = Query(...),
    title: str = Query(None),
    script_text: str = Query(None),
    voice: str = Query("Kore"),
    auto_tag: bool = Query(True),
    auto_proceed: bool = Query(True)
):
    """
    Endpoint Server-Sent Events (SSE) via GET untuk monitoring alur build secara real-time.
    """
    return EventSourceResponse(
        execute_pipeline_generator(
            intent=intent,
            prompt=prompt,
            title=title,
            script_text=script_text,
            voice=voice,
            auto_tag=auto_tag,
            auto_proceed=auto_proceed
        )
    )

@router.post("/stream")
async def pipeline_stream_post(request: Request, body: PipelineRequest):
    """
    Endpoint Server-Sent Events (SSE) via POST untuk payload teks/prompt panjang.
    """
    return EventSourceResponse(
        execute_pipeline_generator(
            intent=body.intent or "auto",
            prompt=body.prompt,
            title=body.title,
            script_text=body.script_text,
            voice=body.voice or "Kore",
            auto_tag=body.auto_tag if body.auto_tag is not None else True,
            auto_proceed=body.auto_proceed if body.auto_proceed is not None else True
        )
    )

@router.post("/run", response_model=PipelineResponse)
async def pipeline_run_sync(req: PipelineRequest):
    """
    Eksekusi alur produksi secara synchronous (mengembalikan respon JSON terstruktur lengkap).
    """
    start_time = time.time()
    title_data = None
    script_data = None
    tts_data = None
    trans_data = None

    effective_intent = req.intent or "auto"
    current_title = req.title or ""
    current_script_tagged = req.script_text or ""
    current_audio_file = None
    auto_tag_setting = req.auto_tag if req.auto_tag is not None else True

    try:
        # Step 1: Title
        if effective_intent in ["title", "full", "auto"] and not current_title:
            title_data = gemini_service.generate_titles(req.prompt, 3)
            if title_data.recommendations:
                current_title = title_data.recommendations[0].title

        # Step 2: Script
        if (effective_intent in ["script", "full", "auto"] or req.auto_proceed) and not current_script_tagged:
            script_title = current_title or req.prompt
            script_data = gemini_service.generate_hamp_script(
                title=script_title,
                topic_context=req.prompt if req.prompt != script_title else "",
                voice_style="conversational",
                auto_tag=auto_tag_setting
            )
            current_script_tagged = script_data.tagged_text

        # Step 3: TTS
        if effective_intent in ["voice_only", "full", "auto"] or (req.auto_proceed and current_script_tagged):
            text_for_tts = current_script_tagged or req.prompt
            tts_data = gemini_service.generate_tts(
                text=text_for_tts,
                voice=req.voice or "Kore",
                filename=gemini_service.slugify(current_title or "voice-studio")
            )
            current_audio_file = tts_data.filename

        # Step 4: Transcribe
        if req.auto_proceed and current_audio_file:
            trans_data = gemini_service.transcribe_audio(current_audio_file)

        return PipelineResponse(
            success=True,
            intent=effective_intent,
            title_data=title_data,
            script_data=script_data,
            tts_data=tts_data,
            transcribe_data=trans_data,
            execution_time_sec=round(time.time() - start_time, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
