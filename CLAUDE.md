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
          ├── outbox/
          └── workspace/
              └── CLAUDE.md         agent persona — read by Claude Code on startup
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

| # | Status | Name | Focus |
|---|---|---|---|
| 0 | ✅ Done | Scaffold | electron-vite + React + TS + design tokens |
| 1 | ✅ Done | Real Terminals | node-pty + xterm.js + ConPTY |
| 2 | ✅ Done | Sabha Layer | File structure, mailboxes, router, itihas |
| 3 | ✅ Done | Chanakya | GOD agent, Stop-loop, Aadesh bar, Anumati queue |
| 4 | ✅ Done | Hook Server | Named pipe, cth-hook shim, avastha updates |
| 5 | ✅ Done | Court Floor | Pixi.js scene, tiled map, avatar sprites, camera |
| 6 | 🔲 Next | Animations | Lamp overlay, scroll arc, avatar walk + A* |
| 7 | 🔲 | Detail Panel | Terminal/Files/Git/Smriti tabs, CodeMirror |
| 8 | 🔲 | Polish | Onboarding wizard, Add Shishya flow, search panels |
| 9 | 🔲 | Packaging | electron-builder, NSIS installer, README |

**Rule: Do not start M5 (Pixi.js floor) until M1 (terminals) works.**

## Hook Server (M4)

Lifecycle events from Claude Code sessions drive accurate avastha — no more guessing from output silence.

```
Claude Code (in agent workspace)
  → reads .claude/settings.json        (written by initSabha, per agent)
  → on PreToolUse/PostToolUse/UserPromptSubmit/Stop/SessionStart
    runs: node <sabhaHome>/cth-hook.js  (shim, generated by startHookServer)
  → shim reads payload from stdin, connects to TAKSHASHILA_HOOK_PIPE (env),
    writes one JSON line { agentId, event, toolName, timestamp }, exits 0
  → hooks.ts parses → index.ts routes:
      applyHookEvent (sabha.ts) — avastha + lastKriya → identity.json → watcher → renderer
      Stop + chanakya — notifyChanakyaStop() → markPromptReady + processInbox
```

Rules:
- Pipe: `\\.\pipe\takshashila-hooks-<pid>` Windows, tmpdir socket Unix. Started **before** initSabha and any PTY spawn.
- pty.ts injects `TAKSHASHILA_HOOK_PIPE` + `CLAUDE_CODE_AGENT_ID` into every session env.
- The shim must always exit 0 fast (3s hard guard) — never block or fail a tool call.
- The shim requires `node` on PATH.
- Avastha map: SessionStart/Stop → idle, UserPromptSubmit/PreToolUse/PostToolUse → working. Stop clears lastKriya.
- Single write path: hook → identity.json → file watcher → renderer. Never double-send to the renderer.

## Court Floor (M5 + visual overhaul)

Pixi.js v7 scene in `src/renderer/src/scene/court/`. All art is procedural — chunky-rect pixel art (`PX = 4`) baked to NEAREST textures, zero external assets. CSP note: `@pixi/unsafe-eval` is imported at the top of CourtScene.ts because our CSP forbids `new Function` — never remove it.

- `layout.ts` — **single source of truth for all coordinates.** `DESK_POSITIONS` (all 7 agents), `buildTileGrid()` (38×25: floor variants, perimeter, paths, kund, grass, platform), chamber wall cells, landmarks (TREE, ENTRANCE, KUND, RANGOLI, PILLARS), `DECORATIONS`. New scene work imports from here — no magic numbers.
- `palette.ts` — `cssColor()` reads design tokens at runtime; `ROBE_COLORS` per agent; `shade()`.
- `textures.ts` — tile set + furniture (desk/stool/bookshelf/pillar/wall) + desk items + decorations + avatar.
- `Avatar.ts` — sprite + avastha dot + label + selection ring + `setFlip()` for glances.
- `Camera.ts` — tweened: `intro()` (entrance → fit, 1.5s), `panTo()` (400ms ease-out on selection), wheel-zoom 0.8–1.4 relaxed to fit-scale. User input cancels tweens.
- `LampOverlay.ts` — per-desk glow by avastha (working = 1.5s sine pulse, vighna = out).
- `ScrollAnim.ts` — sandesh arc (80px over furniture, trail, unfurl). `'samrat'` maps to ENTRANCE.
- `Ambient.ts` — leaves, kund ripples, torch flicker, idle glances.
- `Minimap.ts` — screen-space, bottom-left, robe-colored dots.
- `CourtScene.ts` — 8 ordered layers: floor → ground → furniture → avatars → desk items → glows → canopy → UI. Furniture built up-front from layout, not on agent load.
- `components/CourtFloor/index.tsx` — React wrapper; subscribes `onSandesh` → `playScroll`; chanakya idle→working transition fires a samrat scroll from the entrance. Scene errors render an inline panel, never blank the app.

Renderer types: `src/renderer/src/env.d.ts` declares `window.takshashila` — keep it mirrored with `src/preload/index.ts`.

## Chanakya PTY — Lessons Learned

These patterns are settled and must not be regressed:

- **Persona via CLAUDE.md, never stdin** — writing a system prompt to the PTY echoes it visibly in the terminal. Instead write `CLAUDE.md` to the agent's workspace; Claude Code reads it silently on startup. `ensureChanakyaClaudeMd()` in `chanakya.ts` handles creation.
- **Prompt-gated delivery** — never write an aadesh to the PTY unless Claude Code is at the `>` prompt. Use `promptReady` flag + `aadeshQueue`. Two ways it becomes true: (1) direct regex on stripped output `/(?:^|[\r\n])\s*>\s*$/`, (2) 1.5s silence fallback via `promptSilenceTimer`. Both call `markPromptReady()`.
- **`\r\n` to submit** — Windows ConPTY + readline need carriage-return + line-feed. `\r` alone is not enough.
- **ANSI stripping must cover private-mode CSI** — `\x1b[?25h` / `\x1b[?25l` use `?` as parameter byte (0x3f). The old `[0-9;]*` regex missed this. Correct range: `[\x30-\x3f]*` for parameter bytes.
- **Terminal sizing** — register `term.onResize` before first `fitAddon.fit()` or the PTY never learns the real cols/rows. Always call `pty.resize` explicitly after spawn and in `ResizeObserver`.

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
