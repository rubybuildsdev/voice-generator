import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
from fastapi.testclient import TestClient
from server.main import app

def run_tests():
    print("==================================================")
    print("🚀 RUNNING COMPREHENSIVE BACKEND TEST SUITE")
    print("==================================================")

    client = TestClient(app)

    # 1. Root & Health
    print("\n[TEST 1] Root & Health endpoints...")
    resp = client.get("/")
    assert resp.status_code == 200, f"Root failed: {resp.status_code}"
    print("  ✓ GET / => 200 OK")

    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Health failed: {resp.status_code}"
    data = resp.json()
    assert data["gemini_api_configured"] is True, "Gemini API key not detected"
    print(f"  ✓ GET /api/health => 200 OK (models: {data['models']})")

    # 2. TTS Voices & Vocal Tags
    print("\n[TEST 2] TTS Voices & Vocal Tags...")
    resp = client.get("/api/tts/voices")
    assert resp.status_code == 200
    voices = resp.json()["voices"]
    assert len(voices) >= 8, f"Expected at least 8 voices, got {len(voices)}"
    print(f"  ✓ GET /api/tts/voices => 200 OK ({len(voices)} voice profiles)")

    resp = client.get("/api/tts/tags")
    assert resp.status_code == 200
    tags = resp.json()["tags"]
    assert len(tags) >= 15
    print(f"  ✓ GET /api/tts/tags => 200 OK ({len(tags)} official vocal tags)")

    # 3. History
    print("\n[TEST 3] History endpoint...")
    resp = client.get("/api/history")
    assert resp.status_code == 200
    hist = resp.json()
    print(f"  ✓ GET /api/history => 200 OK ({hist['total']} items in history)")

    # 4. Title Generation
    print("\n[TEST 4] Title Generation (/api/titles/generate)...")
    title_payload = {
        "topic": "Bahaya mengisi baterai ponsel semalaman dengan fast charging 120 watt",
        "count": 3
    }
    resp = client.post("/api/titles/generate", json=title_payload)
    assert resp.status_code == 200, f"Title generation failed: {resp.text}"
    title_data = resp.json()
    assert len(title_data["recommendations"]) > 0
    sample_title = title_data["recommendations"][0]["title"]
    char_len = title_data["recommendations"][0]["char_count"]
    formula = title_data["recommendations"][0]["formula"]
    print(f"  ✓ Generated: '{sample_title}' ({char_len} chars, Formula: {formula})")
    print(f"  ✓ Thumbnail concept: {title_data['thumbnail']['screen_text']}")

    # 5. H-A-M-P Script Generation
    print("\n[TEST 5] H-A-M-P Script Generation (/api/scripts/generate)...")
    script_payload = {
        "title": sample_title,
        "topic_context": "Baterai silikon-karbon cepat aus jika terus dialiri daya 120W saat suhu panas.",
        "voice_style": "conversational"
    }
    resp = client.post("/api/scripts/generate", json=script_payload)
    assert resp.status_code == 200, f"Script generation failed: {resp.text}"
    script_data = resp.json()
    assert len(script_data["breakdown"]) == 4, f"Expected 4 segments, got {len(script_data['breakdown'])}"
    assert script_data["tagged_text"], "Missing tagged_text"
    assert script_data["clean_text"], "Missing clean_text"
    print(f"  ✓ Generated H-A-M-P script: {script_data['word_count']} words, est {script_data['estimated_duration_sec']}s")
    print(f"  ✓ Tagged preview: {script_data['tagged_text'][:120]}...")

    # 6. Auto Tag Script
    print("\n[TEST 6] Auto Vocal Tagging (/api/scripts/auto-tag)...")
    raw_text = "Jangan pernah cas ponsel semalaman. Panas berlebih bisa merusak kesehatan baterai hingga 80 persen dalam setahun. Solusinya, aktifkan proteksi baterai sekarang."
    resp = client.post("/api/scripts/auto-tag", json={"text": raw_text})
    assert resp.status_code == 200, f"Auto-tag failed: {resp.text}"
    autotag_data = resp.json()
    print(f"  ✓ Auto-tagged ({autotag_data['tag_count']} tags inserted): {autotag_data['tagged_text'][:100]}...")

    # 7. Gemini 3.8 Flash TTS
    print("\n[TEST 7] Gemini 3.8 Flash TTS (/api/tts/generate)...")
    tts_payload = {
        "text": "Jangan pernah charge HP semalaman! <sigh> Panas 120 watt ini perlahan merusak sel bateraimu. <short pause> Aktifkan batas 80 persen sekarang juga. <phew>",
        "voice": "Kore",
        "filename": "test_backend_suite"
    }
    resp = client.post("/api/tts/generate", json=tts_payload)
    assert resp.status_code == 200, f"TTS failed: {resp.text}"
    tts_data = resp.json()
    assert tts_data["filename"].startswith("test_backend_suite")
    assert tts_data["filename"].endswith(".wav")
    assert tts_data["duration_sec"] > 0
    assert tts_data["duration_frames"] > 0
    print(f"  ✓ TTS generated: {tts_data['filename']} ({tts_data['duration_sec']}s, {tts_data['duration_frames']} frames @ 30 FPS)")

    # 8. Media Serving
    print("\n[TEST 8] Audio Serving (/api/audio/test_backend_suite.wav)...")
    resp = client.get(f"/api/audio/{tts_data['filename']}")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("audio/wav")
    assert len(resp.content) > 10000
    print(f"  ✓ GET /api/audio/{tts_data['filename']} => 200 OK ({len(resp.content)} bytes, Content-Type: audio/wav)")

    # 9. Gemini 3.5 Transcribe
    print("\n[TEST 9] Gemini 3.5 Transcribe Word-Level (/api/transcribe)...")
    resp = client.post("/api/transcribe", json={"audio_file": tts_data["filename"]})
    assert resp.status_code == 200, f"Transcribe failed: {resp.text}"
    trans_data = resp.json()
    assert trans_data["word_count"] > 0
    assert len(trans_data["words"]) > 0
    sample_word = trans_data["words"][0]
    print(f"  ✓ Transcribed: {trans_data['word_count']} words. Sample: '{sample_word['text']}' [{sample_word['startSec']}s - {sample_word['endSec']}s]")
    print(f"  ✓ WebVTT generated ({len(trans_data['vtt_content'].splitlines())} lines)")

    # 10. Transcript Serving
    print("\n[TEST 10] Transcript Serving (/api/transcripts)...")
    resp = client.get(f"/api/transcripts/{trans_data['filename']}.vtt")
    assert resp.status_code == 200
    print(f"  ✓ GET /api/transcripts/{trans_data['filename']}.vtt => 200 OK")

    # 11. SSE Pipeline Stream
    print("\n[TEST 11] SSE Pipeline Stream (/api/pipeline/stream)...")
    with client.stream("GET", "/api/pipeline/stream?intent=voice_only&prompt=Uji+coba+sintesis+singkat&voice=Kore&auto_proceed=false") as stream_resp:
        assert stream_resp.status_code == 200
        events_received = []
        for line in stream_resp.iter_lines():
            if line:
                events_received.append(line)
                if len(events_received) >= 8:
                    break
        print(f"  ✓ SSE Streaming works! Received {len(events_received)} stream lines")

    print("\n==================================================")
    print("🎉 ALL 11 TEST SUITES PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
