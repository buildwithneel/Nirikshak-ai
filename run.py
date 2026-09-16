import os
import sys
import time
import subprocess
import webbrowser
import signal

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")

    print("\n" + "=" * 65)
    print("                 NIRIKSHAK AI - SYSTEM LAUNCHER")
    print("       Legal Metrology Compliance & Enforcement Platform")
    print("=" * 65 + "\n")

    # 1. Start FastAPI Backend
    print("[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir
    )

    # 2. Start Vite Frontend
    print("[2/3] Starting Vite React Frontend on http://localhost:5173 ...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=root_dir
    )

    # 3. Wait and open browser
    time.sleep(3)
    target_url = "http://localhost:5173"
    print(f"[3/3] Opening browser at {target_url} ...")
    webbrowser.open(target_url)

    print("\n" + "=" * 65)
    print("  NIRIKSHAK AI IS ACTIVE!")
    print(f"  * Web Portal: {target_url}")
    print("  * Backend API: http://127.0.0.1:8000")
    print("  * API Docs:    http://127.0.0.1:8000/docs")
    print("=" * 65)
    print("Press Ctrl+C to terminate both servers cleanly.\n")

    def handle_sigint(sig, frame):
        print("\nShutting down NIRIKSHAK AI servers...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
            backend_proc.wait(timeout=3)
            frontend_proc.wait(timeout=3)
        except Exception:
            backend_proc.kill()
            frontend_proc.kill()
        print("Shutdown complete. Goodbye.")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sigint)

    try:
        while True:
            time.sleep(1)
            # Check if any process terminated unexpectedly
            if backend_proc.poll() is not None:
                print("Backend process exited.")
                break
            if frontend_proc.poll() is not None:
                print("Frontend process exited.")
                break
    except KeyboardInterrupt:
        handle_sigint(None, None)

if __name__ == "__main__":
    main()
