# Implementation Plan: Ultra Nmap Pro

Ultra Nmap Pro is a mobile-first, robust network administration and auditing tool designed for Termux.

## 1. Architectural Overview
*   **Backend**: Node.js/Express. Provides API endpoints, manages scan jobs via `child_process`, and persists data using **SQLite**.
*   **Frontend**: React (Vite). Mobile-first design served directly by the Express backend.
*   **Persistence**: SQLite database for jobs, history, and reports, ensuring state survives server restarts.
*   **Scanner Engine**: `nmap` executed via Node.js `spawn` with structured argument arrays for security.

## 2. Key Technical Guarantees
| Requirement Area | Implementation Strategy |
| :--- | :--- |
| **Termux Compatibility** | Runtime detection of `nmap`, `python`, `node`. No external Linux dependencies. |
| **Robust Job Management** | SQLite-backed job storage. Orphan cleanup on server startup. PID tracking & real `SIGTERM` for cancellation. |
| **Security** | Strict input sanitization (whitelist approach). `spawn` with array arguments to prevent shell injection. |
| **Parsing & Human Interpretation** | Nmap XML output parsing to structured JSON. Dedicated interpretation logic for summary, details, and raw output. |
| **Data Integrity** | No "invented" results. Direct mapping from parser to UI models. |
| **Limits & Resource Management** | Strict limits on concurrent jobs, log sizes, scan timeouts, and history retention. |

## 3. Development Phases
1.  **Foundation**: Server setup (Express/SQLite), system detection, API structure.
2.  **Scanner Core**: Job management, `child_process.spawn` implementation, input validation.
3.  **Parser Engine**: Nmap XML parsing to structured JSON representation.
4.  **UI/UX**: Mobile-first dashboard, scanner configuration, execution tracking, history, and report views.
5.  **Testing**: Validation of all 17 functional test cases (including cancellation and restart recovery).

## 4. Execution Workflow
*   **Install/Run**: `bash ultra.sh` (or `npm run start`).
*   **Start**: Server checks environment, cleans orphan jobs, starts HTTP server.
*   **Scan**: User configures in UI -> API creates Job -> Job Manager executes -> Scanner monitors `stdout/stderr` -> Parser writes to SQLite -> API serves results.

This plan guarantees a functional, secure, and mobile-optimized tool. I am ready to begin the implementation upon your approval.
