# Project Context: Codex Desktop & Core

## Overview

This workspace contains two distinct but related projects:

1.  **`codex/`**: The **Codex Core**. This is the official OpenAI Codex CLI repository (monorepo). It contains the core logic (Rust), the CLI wrapper (Node.js), and SDKs. It acts as the "engine" for coding tasks.
2.  **`codex-desktop/`**: The **Codex Desktop** application. This is a new GUI project (Tauri + React + TypeScript) designed to wrap the Codex CLI, providing a visual interface for session management, diff reviews, and safer execution.

**Relationship:**
The `codex-desktop` application is a frontend "workbench" that utilizes the `codex` CLI (or its internal libraries) to perform actual coding agents tasks.

---

## 1. Codex Desktop (`codex-desktop/`)

**Type:** Desktop Application (Tauri, React, TypeScript)
**Goal:** Provide a beautiful, controlled, and safe GUI for the Codex CLI.

### Key Files & Structure
*   `src-tauri/`: Rust backend for the desktop app. Handles system interactions, PTY (pseudo-terminal) for running the CLI, and file system operations.
*   `src/`: Frontend React application.
    *   `App.tsx`: Main entry point.
*   `tauri.conf.json`: Tauri configuration (Identifier: `com.codex.desktop`).
*   `codex destop.md`: **Product Requirements Document (PRD)**. Contains detailed features, architecture, and roadmap (in Chinese).

### Development (Desktop)

**Prerequisites:** Node.js, Rust (Cargo).

```bash
cd codex-desktop

# Install dependencies
npm install

# Run in development mode (Frontend + Tauri backend)
npm run tauri:dev

# Build for production
npm run tauri:build
```

### Architecture Highlights (from PRD)
*   **Engine:** Uses the local `codex` CLI as a subprocess (via PTY).
*   **Safety:** "Diff-first" approach. Users preview changes before applying them.
*   **Session Management:** Persists chat sessions and project states locally.

---

## 2. Codex Core (`codex/`)

**Type:** Monorepo (Rust Workspace + Node.js)
**Goal:** The core intelligence and CLI tool for local coding assistance.

### Key Files & Structure
*   `codex-rs/`: The main Rust workspace containing the core logic.
    *   `Cargo.toml`: Workspace definition.
    *   `codex-cli/`: The Rust binary entry point (often wrapped).
    *   `core/`: Core logic.
*   `codex-cli/`: Node.js wrapper for distribution (npm package).
*   `sdk/`: TypeScript SDK.

### Development (Core)

**Prerequisites:** Rust (Cargo), pnpm.

```bash
cd codex

# Build the Rust core
cargo build

# Run tests
cargo test
```

---

## User Preferences & Notes

*   **Language:** The PRD (`codex destop.md`) is written in Chinese, indicating the user or team may prefer or use Chinese for documentation/planning.
*   **Current Focus:** Likely setting up the `codex-desktop` MVP (Minimum Viable Product) to interface with the `codex` core.
*   **Priority:** Visual hierarchy, "Z-Order/Hit-Testing" issues, and adhering to "Obsidian Ceramic V7" visual specs (from memory).
