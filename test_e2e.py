#!/usr/bin/env python3
"""
End-to-End Integration Verification Script
Tests FastAPI backend, Vite UI build, proxy connectivity, and run_studio.py.
"""

import os
import sys
import time
import json
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

def test_run_studio_help():
    print("\n--- 1. Testing run_studio.py CLI interface ---")
    res = subprocess.run([sys.executable, "run_studio.py", "--help"], capture_output=True, text=True)
    assert res.returncode == 0, f"run_studio.py --help failed: {res.stderr}"
    assert "--backend-port" in res.stdout
    assert "--frontend-port" in res.stdout
    assert "--no-browser" in res.stdout
    print("✓ run_studio.py CLI arguments verified.")

def test_frontend_build():
    print("\n--- 2. Testing Frontend Production Build ---")
    ui_dir = ROOT_DIR / "ui"
    dist_dir = ui_dir / "dist"
    index_html = dist_dir / "index.html"
    assert index_html.exists(), "ui/dist/index.html does not exist! Run npm run build."
    html_content = index_html.read_text(encoding="utf-8")
    assert "Voice Studio" in html_content or "faceless" in html_content.lower() or "<div id=\"root\">" in html_content
    print("✓ ui/dist/index.html successfully verified.")

def test_server_and_ui_concurrent():
    print("\n--- 3. Testing Backend & Frontend Concurrent Execution ---")
    backend_cmd = [
        sys.executable, "-m", "uvicorn", "server.main:app",
        "--host", "127.0.0.1", "--port", "8000"
    ]
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_cmd = [
        npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"
    ]

    backend_proc = subprocess.Popen(backend_cmd, cwd=str(ROOT_DIR), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=str(ROOT_DIR / "ui"), stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        # Wait up to 15 seconds for backend
        backend_ready = False
        for _ in range(30):
            try:
                with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1) as resp:
                    if resp.status == 200:
                        backend_ready = True
                        break
            except Exception:
                time.sleep(0.5)
        assert backend_ready, "Backend failed to respond on port 8000"
        print("✓ Backend responded 200 OK at http://127.0.0.1:8000/api/health")

        # Wait up to 15 seconds for frontend
        frontend_ready = False
        for _ in range(30):
            try:
                with urllib.request.urlopen("http://127.0.0.1:5173", timeout=1) as resp:
                    if resp.status == 200:
                        frontend_ready = True
                        break
            except Exception:
                time.sleep(0.5)
        assert frontend_ready, "Frontend Vite dev server failed to respond on port 5173"
        print("✓ Frontend Vite dev server responded 200 OK at http://127.0.0.1:5173")

        # Test Frontend Proxy to Backend (/api/health via port 5173)
        proxy_ready = False
        last_error = None
        for _ in range(10):
            try:
                with urllib.request.urlopen("http://127.0.0.1:5173/api/health", timeout=2) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        assert data.get("status") in ("online", "healthy"), f"Unexpected status: {data}"
                        assert data.get("gemini_api_configured") is True
                        proxy_ready = True
                        break
            except Exception as e:
                last_error = e
                time.sleep(1)
        assert proxy_ready, f"Vite proxy to /api/health failed: {last_error}"
        print("✓ Vite Proxy verified: http://127.0.0.1:5173/api/health proxied cleanly to FastAPI!")

        # Test API voices endpoint through proxy
        with urllib.request.urlopen("http://127.0.0.1:5173/api/tts/voices", timeout=2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert data.get("success") is True
            assert len(data.get("voices", [])) >= 8
            print(f"✓ Proxy voices check passed: {len(data['voices'])} voices available.")

        # Test API tags endpoint through proxy
        with urllib.request.urlopen("http://127.0.0.1:5173/api/tts/tags", timeout=2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert data.get("success") is True
            assert len(data.get("tags", [])) >= 15
            print(f"✓ Proxy tags check passed: {len(data['tags'])} official tags available.")

        # Test Static audio serving through proxy
        with urllib.request.urlopen("http://127.0.0.1:5173/api/history", timeout=2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert data.get("success") is True
            print(f"✓ Proxy history check passed: {data.get('total')} items.")

    finally:
        print("\nCleaning up test processes...")
        if os.name == "nt":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(backend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            backend_proc.terminate()
            frontend_proc.terminate()
        print("✓ Clean shutdown complete.")

if __name__ == "__main__":
    print("==================================================")
    print("🧪 RUNNING END-TO-END INTEGRATION TEST SUITE")
    print("==================================================")
    test_run_studio_help()
    test_frontend_build()
    test_server_and_ui_concurrent()
    print("\n==================================================")
    print("🎉 ALL END-TO-END INTEGRATION CHECKS PASSED!")
    print("==================================================")
