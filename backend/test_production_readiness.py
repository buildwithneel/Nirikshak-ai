"""
NIRIKSHAK AI — MASTER PRODUCTION READINESS SUITE (SECTION 60)
Executes holistic end-to-end regression across Prompts 8, 9, 10, and 11:
- Verification of RBAC, JWT, and Authentication
- Grievance Intake, Relational Inspection Linkage, and Dossier Workspace
- Multi-Image Packaging Panels, Cross-Panel Evidence Aggregation
- Cryptographic Audit Trail Hash Chaining & Tamper Detection
- Statutory PDF Report Generation with SHA-256 Provenance
- Legal Source Traceability & Authoritative Citations
- System Health Diagnostics & Production Latency Tracking
- AI Inspection Copilot, Explainable Evidence Intelligence, Officer Review Assistant
"""

import os
import sys
import subprocess
import time

# Ensure backend directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def run_test_module(module_name: str, description: str) -> bool:
    print("\n" + "=" * 70)
    print(f"RUNNING: {description} ({module_name})")
    print("=" * 70)
    start = time.perf_counter()

    script_path = os.path.join(os.path.dirname(__file__), module_name)
    proc = subprocess.run([sys.executable, script_path], capture_output=True, text=True, encoding="utf-8")
    elapsed = round(time.perf_counter() - start, 2)

    print(proc.stdout)
    if proc.stderr:
        print("STDERR:", proc.stderr)

    passed = proc.returncode == 0
    status_str = "PASSED" if passed else "FAILED"
    print(f"--> {description} RESULT: {status_str} ({elapsed}s)")
    return passed


def main():
    print("*" * 70)
    print("   NIRIKSHAK AI -- MASTER PRODUCTION READINESS AUDIT")
    print("   Government of India / Legal Metrology Enforcement Framework")
    print("*" * 70)

    suites = [
        ("test_prompt8_workflow.py", "Prompt 8 Core Institutional Workflow Suite"),
        ("test_prompt9_workflow.py", "Prompt 9 Multi-Image & Intelligence Analytics Suite"),
        ("test_prompt10_security_reliability.py", "Prompt 10 Security, Reliability & Provenance Suite"),
        ("test_prompt11_copilot.py", "Prompt 11 AI Inspection Copilot & Evidence Intelligence Suite"),
    ]


    all_passed = True
    results = []

    for script, desc in suites:
        ok = run_test_module(script, desc)
        results.append((desc, ok))
        if not ok:
            all_passed = False

    print("\n" + "=" * 70)
    print("   FINAL PRODUCTION READINESS AUDIT SUMMARY")
    print("=" * 70)
    for desc, ok in results:
        badge = "[PASS]" if ok else "[FAIL]"
        print(f"{badge} {desc:58} {'READY' if ok else 'FAILED'}")

    print("=" * 70)
    if all_passed:
        print(">>> MASTER QUALITY GATE PASSED: ALL SPECIFICATIONS VERIFIED <<<")
        print(">>> NIRIKSHAK AI IS 100% PRODUCTION READY FOR DEPLOYMENT <<<")
        return 0
    else:
        print(">>> MASTER QUALITY GATE FAILED: CRITICAL DEFECTS PRESENT <<<")
        return 1


if __name__ == "__main__":
    sys.exit(main())
