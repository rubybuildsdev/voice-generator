#!/usr/bin/env python3
"""
Voice Studio Orchestrator (run_studio.py)
Concurrently runs FastAPI backend server and Vite frontend dev server.
Provides clean terminal logging, graceful process termination on Windows/Linux,
and automatic browser launch.
"""

import argparse
import os
import signal
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent
SERVER_DIR = ROOT_DIR / "server"
UI_DIR = ROOT_DIR / "ui"

# ANSI Colors for terminal output
RESET = "\033[0m"
BOLD = "\033[1m"
GREEN = "\033[32m"
BLUE = "\033[34m"
CYAN = "\033[36m"
YELLOW = "\033[33m"
RED = "\033[31m"
MAGENTA = "\033[35m"

# Enable VT100 colors in Windows cmd/powershell
if os.name == "nt":
    os.system("")

def log_system(msg: str):
    print(f"{BOLD}{CYAN}[Studio Manager]{RESET} {msg}", flush=True)

def log_backend(msg: str):
    print(f"{GREEN}[FastAPI]{RESET} {msg}", flush=True)

def log_frontend(msg: str):
    print(f"{MAGENTA}[Vite UI]{RESET} {msg}", flush=True)

def log_error(msg: str):
    print(f"{BOLD}{RED}[Error]{RESET} {msg}", flush=True)

def stream_reader(pipe, log_func, on_ready_callback=None):
    """Stream subprocess output line-by-line."""
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            clean_line = line.rstrip()
            if clean_line:
                log_func(clean_line)
                if on_ready_callback and on_ready_callback(clean_line):
                    on_ready_callback = None
    except Exception:
        pass
    finally:
        pipe.close()

def kill_process_tree(proc: subprocess.Popen):
    """Safely terminate a process and all its child processes."""
    if not proc or proc.poll() is not None:
        return
    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False
            )
        else:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
    except Exception as e:
        log_error(f"Failed to kill process {proc.pid}: {e}")

def check_dependencies(skip_install: bool = False):
    """Verify backend and frontend dependencies are present."""
    log_system("Checking environment dependencies...")
    
    # 1. Check Python packages
    try:
        import fastapi
        import uvicorn
        log_system("✓ FastAPI and Uvicorn are installed.")
    except ImportError:
        log_error("FastAPI or Uvicorn not installed.")
        req_file = ROOT_DIR / "requirements.txt"
        if req_file.exists() and not skip_install:
            log_system(f"Installing dependencies from {req_file.name}...")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req_file)], check=True)
        else:
            log_error("Please install dependencies: pip install -r requirements.txt")
            sys.exit(1)

    # 2. Check UI node_modules
    if UI_DIR.exists():
        node_modules = UI_DIR / "node_modules"
        if not node_modules.exists() and not skip_install:
            log_system("ui/node_modules not found. Running npm install in ui/...")
            npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
            subprocess.run([npm_cmd, "install"], cwd=str(UI_DIR), check=True)
            log_system("✓ npm dependencies installed.")

def wait_for_server(url: str, timeout: int = 15) -> bool:
    """Poll a URL until it responds with HTTP 200 or timeout occurs."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "VoiceStudioHealthCheck"})
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status in (200, 404):  # Even 404 indicates server is responding
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def main():
    parser = argparse.ArgumentParser(
        description="Run AI Faceless Voice Studio (FastAPI + Vite Frontend)"
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host binding (default: 127.0.0.1)")
    parser.add_argument("--backend-port", type=int, default=8000, help="Backend API port (default: 8000)")
    parser.add_argument("--frontend-port", type=int, default=5173, help="Frontend UI port (default: 5173)")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically launch web browser")
    parser.add_argument("--backend-only", action="store_true", help="Launch only FastAPI backend")
    parser.add_argument("--frontend-only", action="store_true", help="Launch only Vite frontend")
    parser.add_argument("--skip-install", action="store_true", help="Skip automatic dependency installation")
    args = parser.parse_args()

    print(f"{BOLD}{BLUE}===================================================={RESET}")
    print(f"{BOLD}{BLUE}     🎬 AI Faceless Voice Studio Orchestrator     {RESET}")
    print(f"{BOLD}{BLUE}===================================================={RESET}\n")

    check_dependencies(args.skip_install)

    processes = []
    
    def cleanup_handler(signum=None, frame=None):
        log_system("Shutting down Voice Studio services...")
        for p in processes:
            kill_process_tree(p)
        log_system("All services stopped.")
        sys.exit(0)

    # Register signal handlers
    signal.signal(signal.SIGINT, cleanup_handler)
    signal.signal(signal.SIGTERM, cleanup_handler)

    # 1. Start FastAPI Backend
    backend_proc = None
    if not args.frontend_only:
        log_system(f"Starting FastAPI backend on http://{args.host}:{args.backend_port}...")
        backend_cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "server.main:app",
            "--host",
            args.host,
            "--port",
            str(args.backend_port),
            "--reload"
        ]
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(ROOT_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        processes.append(backend_proc)

        threading.Thread(
            target=stream_reader,
            args=(backend_proc.stdout, log_backend),
            daemon=True
        ).start()
        threading.Thread(
            target=stream_reader,
            args=(backend_proc.stderr, log_backend),
            daemon=True
        ).start()

    # 2. Start Vite Frontend
    frontend_proc = None
    vite_ready_event = threading.Event()

    def check_vite_ready(line: str) -> bool:
        if "http://localhost:" in line or "http://127.0.0.1:" in line or "ready in" in line.lower():
            vite_ready_event.set()
            return True
        return False

    if not args.backend_only and UI_DIR.exists():
        log_system(f"Starting Vite UI dev server on port {args.frontend_port}...")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        frontend_cmd = [
            npm_cmd,
            "run",
            "dev",
            "--",
            "--host",
            args.host,
            "--port",
            str(args.frontend_port)
        ]
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=str(UI_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        processes.append(frontend_proc)

        threading.Thread(
            target=stream_reader,
            args=(frontend_proc.stdout, log_frontend, check_vite_ready),
            daemon=True
        ).start()
        threading.Thread(
            target=stream_reader,
            args=(frontend_proc.stderr, log_frontend),
            daemon=True
        ).start()

    # Health check & Browser launch
    if not args.no_browser and not args.backend_only and UI_DIR.exists():
        ui_url = f"http://{args.host}:{args.frontend_port}"
        log_system(f"Waiting for UI service to be ready at {ui_url}...")
        vite_ready_event.wait(timeout=10)
        time.sleep(1)  # small stabilization pause
        log_system(f"Opening browser at {ui_url}...")
        webbrowser.open(ui_url)

    log_system(f"{GREEN}Voice Studio is live! Press Ctrl+C to terminate.{RESET}")

    # Keep main thread alive monitoring children
    try:
        while True:
            for p in processes:
                exit_code = p.poll()
                if exit_code is not None:
                    log_error(f"Process PID {p.pid} exited unexpectedly with code {exit_code}")
                    cleanup_handler()
            time.sleep(0.5)
    except KeyboardInterrupt:
        cleanup_handler()

if __name__ == "__main__":
    main()
