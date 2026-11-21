"""Voice Studio Orchestrator lintas OS (Windows/Linux/macOS) tanpa orphan process."""

from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
UI_DIR = BASE_DIR / "ui"
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
UI_PORT = int(os.getenv("UI_PORT", "5173"))


def wait_for_server(url: str, timeout_sec: float = 25.0, interval_sec: float = 0.5) -> bool:
    """Menunggu hingga endpoint HTTP merespons sebelum membuka browser."""
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2.0) as resp:
                if resp.status < 500:
                    return True
        except (urllib.error.URLError, TimeoutError, OSError):
            pass
        time.sleep(interval_sec)
    return False


def kill_process_tree(proc: subprocess.Popen[bytes] | None) -> None:
    """Menghentikan seluruh pohon proses secara bersih di Windows maupun POSIX."""
    if proc is None or proc.poll() is not None:
        return
    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except (ProcessLookupError, OSError):
        pass


def main() -> int:
    npm_cmd = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm_cmd:
        print("[ERROR] npm tidak ditemukan di PATH. Pastikan Node.js sudah terpasang.")
        return 1

    if not (UI_DIR / "node_modules").exists():
        print("[INFO] Menginstal dependensi frontend di ui/ ...")
        subprocess.run([npm_cmd, "install"], cwd=str(UI_DIR), check=True)

    popen_kwargs: dict[str, object] = {}
    if os.name == "nt":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs["start_new_session"] = True

    backend_proc: subprocess.Popen[bytes] | None = None
    frontend_proc: subprocess.Popen[bytes] | None = None

    try:
        print(f"[STUDIO] Menyalakan FastAPI Backend di http://{API_HOST}:{API_PORT} ...")
        backend_proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "server.main:app",
                "--host",
                API_HOST,
                "--port",
                str(API_PORT),
            ],
            cwd=str(BASE_DIR),
            **popen_kwargs,
        )

        print(f"[STUDIO] Menyalakan Mosaic Voice Studio UI di http://localhost:{UI_PORT} ...")
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev", "--", "--port", str(UI_PORT)],
            cwd=str(UI_DIR),
            **popen_kwargs,
        )

        api_ready = wait_for_server(f"http://{API_HOST}:{API_PORT}/api/health", timeout_sec=20.0)
        ui_ready = wait_for_server(f"http://127.0.0.1:{UI_PORT}", timeout_sec=25.0)
        if api_ready and ui_ready:
            url = f"http://localhost:{UI_PORT}"
            print(f"[STUDIO] Siap digunakan di {url}")
            webbrowser.open(url)
        else:
            print("[WARN] Salah satu server belum merespons dalam batas waktu; periksa log terminal.")

        while True:
            if backend_proc.poll() is not None:
                print(f"[STUDIO] Backend berhenti dengan kode {backend_proc.returncode}.")
                return backend_proc.returncode or 1
            if frontend_proc.poll() is not None:
                print(f"[STUDIO] Frontend berhenti dengan kode {frontend_proc.returncode}.")
                return frontend_proc.returncode or 1
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n[STUDIO] Mematikan server backend dan frontend...")
        return 0
    finally:
        kill_process_tree(frontend_proc)
        kill_process_tree(backend_proc)


if __name__ == "__main__":
    raise SystemExit(main())
