# Takshashila — Claude Code Guide

Multi-agent Claude Code harness. Windows-first Electron desktop app. Ancient Indian pixel-art university theme.

---

## Architecture

```
Electron Main Process
  ├── index.ts       — window, IPC handlers, quit guard
  ├── pty.ts         — node-pty manager (spawn/write/resize/kill/stream)
  ├── sabha.ts       — Sabha layer: agent state, mailboxes, blackboard, itihas
  ├── hooks.ts       — Hook server (Named Pipe on Windows, UDS on Unix)
  ├── chanakya.ts    — GOD agent loop (Stop-loop, routing, anumati queue)
  ├── memory.ts      — Smriti layer (markdown + optional semantic index)
  ├── config.ts      — Harness config persistence
  ├── fs.ts          — Sandboxed filesystem bridge
  └── git.ts         — Git operations bridge (isomorphic-git)

Preload
  └── index.ts       — contextBridge → typed window.takshashila API

Renderer (React 18 + TypeScript)
  ├── App.tsx
  ├── design/        — tokens.css, tokens.ts, global.css
  ├── components/    — CourtFloor, ShishyaPanel, ShishyaCard, AadeshBar,
  │                    AnumatiPanel, SmritiPanel, ItihasPanel, OnboardingWizard
  ├── scene/court/   — Pixi.js scene: Avatar, Camera, ScrollAnim, LampOverlay
  ├── store/         — Zustand: agentStore, uiStore
  └── hooks/         — usePty, useSabha
```

## Tech Stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron 30+ |
| Bundler | electron-vite |
| Renderer | React 18 + TypeScript (strict) |
| 2D scene | Pixi.js v7 |
| Terminal emulator | xterm.js 5 |
| PTY | node-pty 1.x |
| State | Zustand |
| IPC | contextBridge (no nodeIntegration in renderer) |
| Sabha git | isomorphic-git |
| Structured DB | better-sqlite3 |
| Packaging | electron-builder (NSIS/Windows, DMG/macOS) |
| Hook server | Node `net` module |
| Code editor | CodeMirror 6 |

## Terminology

| App Concept | Term | Meaning |
|---|---|---|
| User | Samrat | Issues mandates |
| GOD Orchestrator | Chanakya | Routes, adjudicates, escalates |
| AI Agent | Shishya | Specialist Claude Code session |
| Task/Command | Aadesh | Royal mandate |
| Message between agents | Sandesh | Scroll passed between desks |
| Memory/state | Smriti | Long-term memory file |
| Agent status | Avastha | Current state (idle/working/error) |
| Error/failure | Vighna | Obstacle |
| Success | Siddhi | Accomplishment |
| Approval request | Anumati | Permission required from Samrat |
| Event log | Itihas | Append-only chronicle |
| Agent workspace | Kshetra | Working directory |
| Shared state layer | Sabha | Hive / shared council layer |

## Sabha File Structure

```
%APPDATA%\Takshashila\sabha\        (Windows default)
~/.takshashila/sabha/               (macOS/Linux)
  ├── config.json
  ├── blackboard.md
  ├── itihas.jsonl                  append-only
  ├── anumati/
  │   └── <uuid>.json
  └── agents/
      └── <agent-id>/
          ├── identity.json
          ├── smriti.md
          ├── inbox/
          └── outbox/
```

## Windows-Specific Rules

- Hook server: **Named Pipe** `\\.\pipe\takshashila-hooks-<pid>` — NOT a Unix socket
- PTY: ConPTY backend via node-pty. Requires Visual Studio Build Tools (C++ workload)
- `electron-rebuild` runs in postinstall — non-negotiable
- All paths via `path.join()` / `path.resolve()` — never hardcoded `/`
- Sabha default: `%APPDATA%\Takshashila\sabha`

## Design Tokens

All colors and fonts from CSS variables in `src/renderer/src/design/tokens.css`. Never hardcode values in components.

Key palette:
- `--color-stone: #2C1810` — app background
- `--color-gold: #F4C430` — primary accent, active states
- `--color-terracotta: #C1440E` — warnings, escalations
- `--color-text-primary: #F5E6C8` — warm parchment

Key fonts:
- `--font-display: 'Yatra One'` — agent names, headings
- `--font-pixel: 'Press Start 2P'` — status labels, badges
- `--font-mono: 'JetBrains Mono'` — terminal, code

## IPC API

All renderer↔main communication through `window.takshashila`:
- `pty.*` — spawn, write, resize, kill, onData
- `sabha.*` — getAgents, sendAadesh, getBlackboard, getItihas, onSandesh, onAvashtaChange
- `anumati.*` — getPending, respond, onNew
- `smriti.*` — getAgentSmriti, search
- `fs.*` — listDir, readFile, writeFile (sandboxed to agent Kshetra)
- `git.*` — status, log, branches
- `config.*` — get, set

## Agents (The Cast)

| Agent | ID | Domain |
|---|---|---|
| Chanakya | chanakya | GOD orchestrator |
| Aaruni | aaruni | Long-running tasks, retries |
| Nachiketa | nachiketa | Web search, research |
| Gargi | gargi | Code review, validation |
| Bharadwaja | bharadwaja | Code writing, builds |
| Chandragupta | chandragupta | Quick tasks, deployments |
| Vishnu Sharma | vishnu_sharma | Documentation, reports |

## Build Milestones

| # | Name | Focus |
|---|---|---|
| 0 | Scaffold | electron-vite + React + TS + design tokens |
| 1 | Real Terminals | node-pty + xterm.js + ConPTY |
| 2 | Sabha Layer | File structure, mailboxes, router, itihas |
| 3 | Chanakya | GOD agent, Stop-loop, Aadesh bar, Anumati queue |
| 4 | Hook Server | Named pipe, cth-hook shim, avastha updates |
| 5 | Court Floor | Pixi.js scene, tiled map, avatar sprites, camera |
| 6 | Animations | Lamp overlay, scroll arc, avatar walk + A* |
| 7 | Detail Panel | Terminal/Files/Git/Smriti tabs, CodeMirror |
| 8 | Polish | Onboarding wizard, Add Shishya flow, search panels |
| 9 | Packaging | electron-builder, NSIS installer, README |

**Rule: Do not start M5 (Pixi.js floor) until M1 (terminals) works.**

## Key Risks

- `node-pty` build: detect missing VS Build Tools in onboarding wizard
- Chanakya silence: watchdog timer — if no PTY output for >30s with non-empty inbox, re-trigger
- Hook pipe conflicts: PID in pipe name, cleanup on `before-quit`
- Sabha perf: only commit changed agent dirs, enforce 2000-word smriti limit

## node-pty Windows Build — Known Patches

After `npm install`, `node_modules/node-pty` requires three manual patches before `@electron/rebuild` succeeds:

1. **`deps/winpty/src/winpty.gyp` line 13** — replace the `GetCommitHash.bat` shell call with a static value:
   ```
   'WINPTY_COMMIT_HASH%': 'none',
   ```

2. **`deps/winpty/src/winpty.gyp` line 25** — replace the `UpdateGenVersion.bat` shell call with a hardcoded include path:
   ```
   'gen',
   ```
   Then manually create `deps/winpty/src/gen/GenVersion.h`:
   ```cpp
   const char GenVersion_Version[] = "0.4.4-dev";
   const char GenVersion_Commit[] = "none";
   ```

3. **`deps/winpty/src/winpty.gyp` lines 44 + 146** and **`binding.gyp` line 9** — disable Spectre mitigation (not installed in BuildTools by default):
   ```
   'SpectreMitigation': 'false'
   ```

Then run: `npx @electron/rebuild -f -w node-pty`

## Dev Commands

```bash
npm run dev        # start app in dev mode (HMR)
npm run build      # production build
npm run preview    # preview production build
npx @electron/rebuild -f -w node-pty   # rebuild node-pty after patching
```
