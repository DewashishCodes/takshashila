# Takshashila — Product Requirements Document
### Multi-Agent Claude Code Harness · Desktop App · Windows-First

---

## 1. Vision

**Takshashila** is a desktop application that wraps real Claude Code CLI sessions as collaborative AI agents, each visualized as a scholar-avatar on a 2D pixel-art university courtyard. The user is the **Samrat** — they issue mandates from a command bar. **Chanakya**, the GOD orchestrator agent, breaks down the mandate, assigns work to specialist shishyas, routes scrolls (messages) between them, and only escalates critical decisions back to the Samrat.

The concept is inspired by the historical Takshashila university — the greatest seat of learning and political strategy in the ancient world, where Chanakya himself studied and taught. The characters are drawn from Indian epics and history, not from objects of active religious worship, keeping the theme respectful and immersive.

**The magic:** watching agents collaborate in real-time on a living courtyard floor. Scrolls fly desk-to-desk. Lamps flicker as agents think. The Samrat watches the whole ashram work, can tap any shishya to read their terminal, and only gets interrupted for decisions that truly need them.

---

## 2. Core Concepts & Terminology

| App Concept | Takshashila Term | Description |
|---|---|---|
| Application | Takshashila | The university / harness itself |
| User | Samrat | The ruler who issues mandates |
| GOD Orchestrator | Chanakya | Master strategist who runs the floor |
| AI Agent | Shishya | A disciple / specialist |
| Task / Command | Aadesh | A royal mandate |
| Message between agents | Sandesh | A scroll passed between desks |
| Memory / state | Smriti | What is remembered |
| Tool call | Kriya | An action performed |
| Agent status | Avastha | Current state |
| Error / failure | Vighna | An obstacle |
| Success | Siddhi | Accomplishment |
| Approval request | Anumati | Permission required from Samrat |
| Log / event history | Itihas | The chronicle |
| Agent's workspace | Kshetra | Their working directory |
| Memory file | Smriti-patrika | The agent's memory document |
| Hive (shared layer) | Sabha | The shared council layer |

---

## 3. The Cast

Each shishya is a real terminal running `claude` (or any configurable command). Their personality flavors their on-screen presence but does not affect the underlying process — the process is always a real Claude Code session.

### Chanakya (GOD Orchestrator)
- **Domain:** Strategy, orchestration, adjudication
- **Personality:** Cold, calculating, never wastes words. Speaks in short declarative sentences.
- **Seat:** Separate elevated stone chamber (top-right of floor, slightly apart from others)
- **Behavior:** Always-on. Reads every Aadesh, assigns work to shishyas, routes Sandeshas, escalates only Anumati-level decisions (destructive ops, spend, scope changes) to the Samrat.
- **Visual:** Slightly larger avatar, distinct robe, always at his desk.

### Aaruni (Executor)
- **Domain:** Persistence, long-running tasks, retries, background jobs
- **Personality:** Devoted, never gives up. Will block the dam himself if needed.
- **Seat:** Ground floor, left wing

### Nachiketa (Researcher)
- **Domain:** Web search, knowledge retrieval, fact-finding
- **Personality:** Fearless questioner. Went to the edge of death for truth.
- **Seat:** Ground floor, center

### Gargi (Analyst)
- **Domain:** Code review, validation, critique, testing
- **Personality:** Sharp, contrarian, pokes holes in everything. The debater.
- **Seat:** Ground floor, right wing

### Bharadwaja (Engineer)
- **Domain:** Code writing, file manipulation, builds
- **Personality:** Methodical builder, obsessed with correctness.
- **Seat:** Workshop area, lower floor

### Chandragupta (Executor-fast)
- **Domain:** Quick tasks, deployments, running commands
- **Personality:** Eager, fast, sometimes reckless. Young energy.
- **Seat:** Near the entrance, always ready

### Vishnu Sharma (Scribe)
- **Domain:** Documentation, summaries, README writing, reports
- **Personality:** Wise, uses analogies and stories for everything. The Panchatantra author.
- **Seat:** Library alcove

> **Note:** The number of active shishyas shown on the floor matches the number of live agent processes. Unused desks are shown empty and dimly lit. The Samrat can spawn new agents via the "Add Shishya" flow.

---

## 4. Architecture Overview

```
    Samrat ── Aadesh ──►  ┌─────────────────┐
                          │    Chanakya     │  GOD agent / orchestrator
                          │  (stone chamber)│  routing · adjudication · escalation
                          └────────┬────────┘
                                   │ assigns · routes · escalates
        ┌──────────────────────────┼──────────────────────────┐
        ▼                           ▼                           ▼
  ┌──────────┐               ┌──────────┐               ┌──────────┐
  │  Aaruni  │  ─Sandesh──►  │ Nachiketa│  ─Sandesh──►  │  Gargi   │
  │  claude  │               │  claude  │               │  claude  │
  │ + Smriti │               │ + Smriti │               │ + Smriti │
  └──────────┘               └──────────┘               └──────────┘
        └──────────── Sabha (shared layer) ─────────────────────┘
                   Smriti · Sandesh · Itihas · Anumati queue
```

### Two Data Planes

**Terminal Plane (Node/Electron main process)**
- `pty.ts` — `node-pty` manager. Spawns each shishya as a real process in a PTY. Full read/write/resize/kill.
- Windows: uses ConPTY (named pipe), not Unix PTY. `node-pty` supports this natively on Windows with proper build tooling.
- Streams PTY output over IPC to renderer via `pty:data:<id>` channels.
- `fs.ts` / `git.ts` — sandboxed file system and git helpers exposed over contextBridge.

**Sabha / Event Plane (Node/Electron main process)**
- `sabha.ts` — on-disk multi-agent layer. Per-agent identity + long-term Smriti, atomic-file Sandesh mailboxes, shared blackboard, append-only Itihas log, single-committer git.
- `hooks.ts` — Windows-compatible hook server. On Windows: named pipe server (`\\.\pipe\takshashila-hooks`). On macOS/Linux: Unix domain socket. Receives Claude Code hook payloads (`PreToolUse`, `PostToolUse`, `Stop`, …).
- `memory.ts` — Smriti layer. Markdown-first per-agent memory, mined into a shared semantic index. Degrades gracefully to plain markdown when semantic index is unavailable.
- `chanakya.ts` — GOD agent loop. Reads every Aadesh, routes Sandeshas, manages Anumati queue, runs the Stop-loop for idle agents draining inboxes.

**Renderer (Electron Renderer — React + TypeScript)**
- `CourtFloor` — Pixi.js scene: Tiled map, camera, avatars, pathfinding, seat assignment, Sandesh animations.
- `ShishyaPanel` — per-agent detail view: terminal (xterm.js), command bar, file browser (CodeMirror), git tab.
- `AadeshBar` — the Samrat's input — always visible at bottom.
- `AnumatiPanel` — approval queue for escalated decisions.
- `SmritiPanel` — searchable memory across all agents.
- `ItihasPanel` — event log / chronicle.

---

## 5. Windows-First Technical Requirements

This is the headline difference from Munder Difflin. Every platform-specific decision must default to Windows.

### node-pty on Windows
- Use `node-pty` with `electron-rebuild` in postinstall.
- Windows requires **Visual Studio Build Tools** (C++ workload). Onboarding wizard must detect and warn if missing.
- Use `ConPTY` backend (default in node-pty ≥0.10 on Windows 10 1903+).
- Shell default: `cmd.exe` or `powershell.exe` (user-configurable). `claude` must be on PATH.

### Hook Server on Windows
- Replace Unix domain socket with a **Windows Named Pipe**: `\\.\pipe\takshashila-hooks-<pid>`.
- The `cth-hook` shim posted to this pipe instead of a UDS path.
- All pipe path construction must be in `hooks.ts`, centralized.

### File Paths
- All path operations use `path.join()` / `path.resolve()` — never hardcoded `/` separators.
- Hive directory defaults to `%APPDATA%\Takshashila\sabha` on Windows, `~/.takshashila/sabha` on macOS/Linux.

### Git
- Bundled `isomorphic-git` for the single-committer layer (avoids requiring `git` on PATH).
- If system `git` is present, prefer it (better performance). Fall back to isomorphic-git.

### Packaging
- `electron-builder` with `nsis` target for Windows — produces a signed `.exe` installer.
- `electron-builder` with `dmg` for macOS.
- Code signing: placeholders in `electron-builder.yml`; actual certs applied at release time.

---

## 6. UI / Visual Design

### Design Philosophy

**Aesthetic direction: Ancient Indian pixel-art meets serious productivity tool.**

The goal is unforgettable. Someone should open this app and immediately feel like they've walked into something they've never seen before. The pixel art is not retro-for-nostalgia — it's the texture of carved stone, palm leaves, and terracotta brought into a screen. Every UI element should feel like it belongs to this world.

**References to internalize:**
- Munder Difflin's layout (see screenshot): 2D overhead office floor (left ~70%), agent cards strip at bottom, detail panel on right (~30%)
- Aesthetic departure: where Munder Difflin is grey/green corporate carpet, Takshashila is terracotta, deep forest green, gold ink, stone

### Color Palette (CSS Variables)

```css
:root {
  /* Backgrounds */
  --color-stone: #2C1810;          /* deep burnt earth — app background */
  --color-courtyard: #8B6914;      /* sun-baked stone — floor tiles */
  --color-stone-mid: #3D2314;      /* panel backgrounds */
  --color-stone-light: #5C3D1E;    /* elevated surfaces, cards */
  
  /* Accents */
  --color-gold: #F4C430;           /* saffron gold — primary accent, active states */
  --color-gold-dim: #A8861E;       /* muted gold — secondary accent */
  --color-terracotta: #C1440E;     /* fired clay — warnings, escalations */
  --color-lamp: #FFD700;           /* lamp glow — active/working state */
  --color-forest: #2D5A27;         /* deep jungle green — idle state */
  --color-ash: #8C7B6B;            /* ash white — secondary text */
  
  /* Text */
  --color-text-primary: #F5E6C8;   /* warm parchment — primary text */
  --color-text-secondary: #A89070; /* aged ink — secondary text */
  --color-text-dim: #6B5040;       /* faded ink — disabled / placeholder */
  
  /* Status colors */
  --color-active: #FFD700;         /* lamp gold — working */
  --color-idle: #2D5A27;           /* forest green — awaiting */
  --color-error: #C1440E;          /* terracotta — vighna */
  --color-success: #4A7C59;        /* deep sage — siddhi */
}
```

### Typography

```css
/* Display / headings — Sanskrit-feel, strong, readable */
@import url('https://fonts.googleapis.com/css2?family=Yatra+One&display=swap');
/* Body / UI — clean pixel-readable monospace for terminal, sans for UI */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); /* pixel UI labels */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans&display=swap'); /* body text */

--font-display: 'Yatra One', serif;         /* app title, agent names */
--font-pixel: 'Press Start 2P', monospace;  /* status labels, badges, counters */
--font-body: 'Noto Sans', sans-serif;       /* descriptions, prose */
--font-mono: 'JetBrains Mono', monospace;   /* terminal, code, file paths */
```

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TAKSHASHILA                           [Smriti] [Itihas] [─][□][×] │  ← title bar (24px, dark stone)
├──────────────────────────────────┬──────────────────────────────┤
│                                  │                              │
│                                  │   SHISHYA DETAIL PANEL       │
│                                  │   ┌──────────────────────┐   │
│   COURT FLOOR (Pixi.js)          │   │ Avatar + name + avastha│  │
│   ~68% width                     │   ├──────────────────────┤   │
│                                  │   │ [TERMINAL] [FILES]   │   │
│   Overhead 2D pixel-art          │   │  [GIT]    [SMRITI]   │   │
│   courtyard with banyan tree,    │   ├──────────────────────┤   │
│   stone desks, oil lamps         │   │                      │   │
│                                  │   │  xterm.js terminal   │   │
│   Avatars walk to desks,         │   │  (full read/write)   │   │
│   scrolls animate between them   │   │                      │   │
│                                  │   └──────────────────────┘   │
│                                  │                              │
├──────────────────────────────────┴──────────────────────────────┤
│  SHISHYA STRIP  [Chanakya] [Aaruni] [Nachiketa] [Gargi] [+ Add] │  ← 96px agent cards
├─────────────────────────────────────────────────────────────────┤
│  ॥ Aadesh:  [_______________________________________________] ►  │  ← command bar (48px)
└─────────────────────────────────────────────────────────────────┘
```

### Court Floor (Pixi.js Scene)

**Map design:**
- Overhead 2D perspective, ~800×480 virtual pixels, camera can pan/zoom
- Tileset: stone floor tiles with variation, courtyard walls, banyan tree in center, pathways
- Chanakya's chamber: elevated slightly (uses a raised stone platform tile), top-right quadrant, separated by a low wall
- Shishya desks: stone slabs with palm-leaf manuscripts, individual oil lamps
- Decorative elements: hanging clay pots, rangoli patterns near entrance, water feature (kund) center-left

**Avatar design:**
- 16×32px sprites, top-down perspective
- Each shishya has a distinct dhoti/robe color coded to their domain
- Chanakya: ochre robe, always at desk (rarely walks)
- Idle animation: subtle bob, lamp flicker
- Working animation: hunched forward, lamp bright
- Walk animation: 4-frame cycle, pathfinding to destination desk
- Status indicator: small colored lamp overlay above head (gold=active, green=idle, orange=processing, red=vighna)

**Sandesh animation:**
- When a message routes between agents, a small rolled scroll sprite spawns at sender's desk
- Arcs in a parabolic path to recipient's desk (500ms, ease-in-out)
- On arrival: sparkle particle burst, recipient's lamp pulses
- Escalations to Samrat: scroll flies to a small "throne" icon near the Aadesh bar

**Camera:**
- Default: full court visible
- Click on shishya: smooth pan + slight zoom to their desk
- Click on detail panel's "expand" button: full-screen terminal overlay

### Shishya Cards (Bottom Strip)

Each card (96px tall, ~160px wide):

```
┌─────────────────────┐
│ [avatar 32px] NAME  │
│ ● avastha-label     │
│ ████░░░░ progress   │  ← only when active
│ last kriya text...  │
└─────────────────────┘
```

- Active card: gold border, lamp-glow drop shadow
- Card background: `--color-stone-light`, pixel-border style (CSS `outline` with stepped corners)
- Click: opens that shishya's detail panel on the right
- Cards scroll horizontally if more than 6 agents

### Shishya Detail Panel (Right, ~32% width)

**Header:** Avatar (48px) + Name in `--font-display` + Avastha badge + Kshetra path

**Tabs:**
- `॥ Terminal` — full xterm.js instance, the live PTY. Command bar below to type into session.
- `📜 Files` — sandboxed file tree + CodeMirror editor for the Kshetra directory
- `⚔️ Git` — status, log with commit graph, branch list
- `🧠 Smriti` — this agent's memory.md, rendered as formatted text with edit capability

**Terminal styling:**
- Background: `#1A0E08` (near-black stone)
- Text: `#F5E6C8` (parchment)
- Cursor: amber block `#F4C430`
- Selection: `rgba(244, 196, 48, 0.3)`
- Font: `JetBrains Mono 13px`

### Aadesh Bar (Bottom)

```
॥ Aadesh: [_________________________________________________] ►
```

- Always visible, full width
- Prefix `॥ Aadesh:` in `--font-pixel`, gold color
- Input: parchment-colored text, stone background, gold focus ring
- Send button `►`: lights up on input, gold fill on hover
- On send: input clears, sends to Chanakya's inbox, triggers Chanakya processing animation

### Anumati Panel (Escalation overlay)

When Chanakya escalates a decision:
- Overlay slides up from bottom (400ms, spring easing)
- Scroll illustration at top
- Decision text in clear language
- Two buttons: `✓ Anumat Deta Hoon` (Approve) and `✗ Nahi` (Deny)
- Background darkens (courtyard dims)

### Status Lamp System

Every agent's lamp state:
| Avastha | Lamp | Color | Animation |
|---|---|---|---|
| Idle / awaiting | Dim | `--color-forest` | Slow pulse (3s cycle) |
| Working / kriya | Bright | `--color-lamp` | Steady |
| Processing / thinking | Flicker | `--color-gold` | Fast flicker (0.3s) |
| Vighna / error | Extinguished | `--color-error` | One-shot fade-out |
| Siddhi / complete | Flash | `--color-success` | Brief flash then dim |

### Pixel-Art UI Component Style

All panels use a "carved stone" border style:

```css
.pixel-panel {
  background: var(--color-stone-mid);
  border: 2px solid var(--color-gold-dim);
  box-shadow: 
    inset 0 0 0 1px var(--color-stone),
    4px 4px 0 var(--color-stone),
    0 0 20px rgba(244, 196, 48, 0.05);
  image-rendering: pixelated;
}

.pixel-panel--active {
  border-color: var(--color-gold);
  box-shadow: 
    inset 0 0 0 1px var(--color-stone),
    4px 4px 0 var(--color-stone),
    0 0 20px rgba(244, 196, 48, 0.15);
}
```

Badges use `--font-pixel` at 8px, uppercase, pixel-padded.

---

## 7. Sabha (Hive) Layer — File Structure

```
~/.takshashila/sabha/              (or %APPDATA%\Takshashila\sabha on Windows)
  ├── config.json                  harness config (agents, default command, home)
  ├── blackboard.md                shared state Chanakya writes to
  ├── itihas.jsonl                 append-only event log
  ├── anumati/                     escalation queue
  │   └── <uuid>.json              individual escalation items
  ├── agents/
  │   └── <agent-id>/
  │       ├── identity.json        name, domain, persona, kshetra path
  │       ├── smriti.md            long-term memory (markdown-first)
  │       ├── inbox/               incoming sandeshas (atomic file per message)
  │       │   └── <timestamp>-<uuid>.json
  │       └── outbox/              outgoing (router reads and delivers)
  │           └── <timestamp>-<uuid>.json
  └── .git/                        single-committer git (never touched by agents)
```

### Sandesh (Message) Format

```json
{
  "id": "uuid",
  "from": "nachiketa",
  "to": "gargi",
  "timestamp": "ISO8601",
  "speech_act": "request" | "inform" | "result" | "escalate",
  "subject": "brief subject",
  "body": "message content",
  "aadesh_ref": "uuid of originating aadesh (optional)"
}
```

### Aadesh (Task) Format

```json
{
  "id": "uuid",
  "from": "samrat",
  "timestamp": "ISO8601",
  "text": "the mandate text",
  "status": "pending" | "in_progress" | "siddhi" | "vighna",
  "assigned_to": ["chanakya"],
  "subtasks": []
}
```

---

## 8. The GOD Agent (Chanakya)

Chanakya is himself a Claude Code process, but runs with a special system prompt that gives him the orchestrator role. He has access to the full Sabha layer as his workspace.

### Chanakya's System Prompt (injected at spawn)

```
You are Chanakya, the master strategist and orchestrator of Takshashila.
You are cold, precise, and never waste words.

Your role:
1. Read every Aadesh (mandate) from the Samrat.
2. Break it into subtasks. Assign each to the right shishya by writing to their inbox.
3. Monitor progress via the blackboard and event log.
4. Route sandeshas between shishyas when coordination is needed.
5. Escalate ONLY these to the Samrat for Anumati: destructive file operations, 
   API spend decisions, scope changes that invalidate the original Aadesh.
6. Write outcomes to the blackboard. Update the Aadesh status to siddhi or vighna.

Shishyas and their domains:
- aaruni: long-running tasks, retries, persistence
- nachiketa: research, web search, knowledge retrieval
- gargi: code review, validation, testing, critique
- bharadwaja: code writing, file editing, builds
- chandragupta: quick tasks, deployments, running commands
- vishnu_sharma: documentation, summaries, reports

Always write to the blackboard before assigning tasks.
Always read smriti before starting work on a new aadesh.
```

### Chanakya's Stop-Loop

When Chanakya's `claude` process emits a `Stop` hook event:
1. Check inbox for pending sandeshas.
2. If found: re-inject them into the session and continue.
3. If inbox empty and no pending aadesh: enter idle state (lamp dims, awaiting).
4. The harness periodically pings Chanakya with inbox check prompts.

---

## 9. Hook System (Windows-Compatible)

### Hook Server

```typescript
// hooks.ts — platform-aware server
const PIPE_PATH = process.platform === 'win32'
  ? `\\\\.\\pipe\\takshashila-hooks-${process.pid}`
  : `/tmp/takshashila-hooks-${process.pid}.sock`;
```

On Windows: `net.createServer()` listening on the named pipe path.
On macOS/Linux: same API, Unix domain socket path.

### cth-hook Shim

A small executable (bundled with the app) that each Claude Code session invokes as its hook. The shim reads the hook payload from stdin and POSTs it to the hook server pipe.

```
CLAUDE_HOOKS_PIPE=\\.\pipe\takshashila-hooks-<pid>  # injected into agent env
```

### Hook Payload → Sabha Events

| Hook event | Sabha action |
|---|---|
| `PreToolUse` | Lamp → flicker. Log to Itihas. Update avastha. |
| `PostToolUse` | Lamp → bright. Update blackboard if tool was Write/Edit. |
| `Stop` | Trigger Stop-loop. Lamp → idle or next kriya. |
| `Notification` | Log to Itihas. Trigger Sandesh animation if message routing. |

---

## 10. Memory (Smriti) Layer

### Per-Agent Smriti

Each agent has `smriti.md` in their Sabha directory. Claude Code sessions are initialized with a `--system` injection that tells them to:
1. Read their `smriti.md` at the start of each session.
2. Append a brief summary of what they learned/did at the end of each session.
3. Keep smriti under ~2000 words; summarize older entries.

### Shared Semantic Index (Optional Enhancement)

When available, a semantic search index (backed by `sqlite-vec` or a local embedding model) is built over all agent smritis and the blackboard. The `SmritiPanel` queries this index. The app degrades gracefully (linear text search) when the index is not available.

---

## 11. Onboarding Wizard

First-run flow, 4 steps:

**Step 1: Welcome**
- Animated Chanakya avatar slides in
- "Takshashila awaits, Samrat."
- Brief one-sentence description of what the app does

**Step 2: System Check**
- Detect: Node.js version, `claude` on PATH, C++ build tools (Windows), Git
- Show green/red indicators per item
- For missing items: inline instructions + links
- Must resolve all red items before proceeding (or "Continue anyway" for non-critical)

**Step 3: Sabha Setup**
- Pick Sabha home directory (default shown, override allowed)
- Pick default agent command (default: `claude`)
- Pick default shell (Windows: `cmd.exe` or `powershell.exe`)

**Step 4: Spawn Chanakya**
- "Chanakya takes his seat."
- Spawns the GOD agent process
- Shows live terminal output as Chanakya initializes
- On success: "The court is open." → enters main app

---

## 12. Core User Flows

### Flow 1: Issuing an Aadesh

1. Samrat types in Aadesh bar: `"Build a FastAPI endpoint for user authentication"`
2. Press Enter / click `►`
3. Aadesh written to Chanakya's inbox
4. Chanakya's lamp flickers → starts processing
5. Chanakya breaks task down, writes to blackboard, assigns to Bharadwaja + Gargi
6. Two scrolls animate from Chanakya's chamber to their desks
7. Bharadwaja and Gargi lamps go bright
8. Progress visible in their shishya cards
9. Gargi sends a scroll back to Chanakya with a review note
10. Chanakya routes to Bharadwaja
11. On completion: all lamps flash siddhi green
12. Chanakya writes outcome to blackboard
13. Brief toast notification: "Siddhi — endpoint built and reviewed"

### Flow 2: Anumati Escalation

1. Bharadwaja's task requires deleting the entire `/src` directory
2. This triggers an escalation Sandesh to Chanakya
3. Chanakya writes to Anumati queue
4. Anumati panel slides up over the court floor
5. "Bharadwaja requests: delete /src/legacy (47 files). Proceed?"
6. Samrat taps Approve or Deny
7. Result routed back to Bharadwaja; lamp resumes

### Flow 3: Inspecting a Shishya

1. Samrat clicks Nachiketa's card or avatar
2. Court camera pans to Nachiketa's desk
3. Right panel shows Nachiketa's terminal (live PTY stream)
4. Samrat can type a message directly into the terminal
5. Tabs allow browsing Nachiketa's Kshetra files, git log, smriti

### Flow 4: Spawning a New Shishya

1. Click `+ Add` in the shishya strip
2. Modal: pick name/persona (from cast list or custom), pick Kshetra directory, pick command
3. New avatar walks in from the entrance of the courtyard
4. Sits at the next available desk
5. Lamp glows idle
6. Chanakya is notified of the new arrival

---

## 13. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Desktop shell | Electron 30+ | contextBridge, no nodeIntegration in renderer |
| Bundler | electron-vite | Fast HMR, separate main/preload/renderer configs |
| Renderer framework | React 18 + TypeScript | Strict mode |
| 2D scene | Pixi.js v7 | WebGL renderer, Tiled map support via `@pixi/tilemap` |
| Terminal emulator | xterm.js 5 | With `xterm-addon-fit`, `xterm-addon-web-links` |
| PTY | node-pty 1.x | electron-rebuild in postinstall; ConPTY on Windows |
| State management | Zustand | Lightweight, no boilerplate |
| IPC | Electron contextBridge | Typed `window.takshashila` API |
| Sabha (git) | isomorphic-git | Bundled; no system git required |
| Smriti DB | better-sqlite3 | For structured state; file-based, Windows-friendly |
| Packaging | electron-builder | NSIS installer for Windows, DMG for macOS |
| Hook server | Node `net` module | Named pipe (Windows) / UDS (Unix) |
| Code editor | CodeMirror 6 | File browser editor in ShishyaPanel |
| Fonts | Google Fonts | Yatra One, Press Start 2P, Noto Sans, JetBrains Mono |
| Pixel art assets | Custom / LimeZu-free | Courtyard tileset; character sprites (custom Takshashila cast) |

---

## 14. File & Folder Structure

```
takshashila/
  src/
    main/
      index.ts          Electron main: window, IPC handlers, quit guard
      pty.ts            node-pty manager (spawn / write / resize / kill / stream)
      sabha.ts          Sabha layer (smriti, mailboxes, router, blackboard, itihas)
      hooks.ts          Hook server (named pipe on Windows, UDS on Unix)
      chanakya.ts       GOD agent loop (Stop-loop, routing, anumati queue)
      memory.ts         Smriti layer (markdown wrapper + optional semantic index)
      config.ts         Harness config persistence + Sabha home setup
      fs.ts             Sandboxed filesystem bridge
      git.ts            Git operations bridge (isomorphic-git)
    preload/
      index.ts          contextBridge → typed window.takshashila API
    renderer/
      src/
        App.tsx
        design/
          tokens.css    All CSS variables (colors, fonts, spacing, shadows)
          tokens.ts     TypeScript mirrors of design tokens
          global.css    Global resets and base styles
        components/
          CourtFloor/       Pixi.js scene entry + React wrapper
          ShishyaPanel/     Agent detail (tabs: terminal, files, git, smriti)
          ShishyaCard/      Bottom strip card component
          AadeshBar/        Samrat command input
          AnumatiPanel/     Escalation approval overlay
          SmritiPanel/      Memory search panel
          ItihasPanel/      Event log panel
          OnboardingWizard/ First-run setup flow
          PixelPanel/       Base pixel-border panel component
        scene/
          court/
            CourtFloor.ts   Pixi application, scene setup
            Avatar.ts       Sprite + animation state machine
            Camera.ts       Pan/zoom
            cast.ts         Avatar definitions for each shishya
            pathfinding.ts  A* on the tile grid
            ScrollAnim.ts   Sandesh scroll animation
            LampOverlay.ts  Status lamp rendering
        store/
          agentStore.ts     Zustand: agents, avastha, aadesh queue
          uiStore.ts        Zustand: selected agent, panel state, overlays
        hooks/
          usePty.ts         PTY data subscription hook
          useSabha.ts       Sabha event subscription hook
        assets/
          tilesets/         Courtyard tile images
          sprites/          Avatar sprite sheets
          ATTRIBUTION.md    Asset license notes
  electron-builder.yml
  electron.vite.config.ts
  package.json
  tsconfig.json
```

---

## 15. IPC API (window.takshashila)

```typescript
interface TakshashilaAPI {
  // PTY
  pty: {
    spawn(opts: SpawnOpts): Promise<string>;          // returns agent id
    write(id: string, data: string): void;
    resize(id: string, cols: number, rows: number): void;
    kill(id: string): Promise<void>;
    onData(id: string, cb: (data: string) => void): Unsubscribe;
  };

  // Sabha
  sabha: {
    getAgents(): Promise<AgentIdentity[]>;
    sendAadesh(text: string): Promise<string>;        // returns aadesh id
    getBlackboard(): Promise<string>;
    getItihas(limit?: number): Promise<ItihasEntry[]>;
    onSandesh(cb: (msg: Sandesh) => void): Unsubscribe;
    onAvashtaChange(cb: (update: AvashtaUpdate) => void): Unsubscribe;
  };

  // Anumati
  anumati: {
    getPending(): Promise<AnumatiItem[]>;
    respond(id: string, approved: boolean): Promise<void>;
    onNew(cb: (item: AnumatiItem) => void): Unsubscribe;
  };

  // Smriti
  smriti: {
    getAgentSmriti(agentId: string): Promise<string>;
    search(query: string): Promise<SmritiResult[]>;
  };

  // FS
  fs: {
    listDir(agentId: string, rel: string): Promise<FsEntry[]>;
    readFile(agentId: string, rel: string): Promise<string>;
    writeFile(agentId: string, rel: string, content: string): Promise<void>;
  };

  // Git
  git: {
    status(agentId: string): Promise<GitStatus>;
    log(agentId: string, limit?: number): Promise<GitCommit[]>;
    branches(agentId: string): Promise<string[]>;
  };

  // Config
  config: {
    get(): Promise<HarnessConfig>;
    set(partial: Partial<HarnessConfig>): Promise<void>;
  };
}
```

---

## 16. Milestones & Build Order

### Milestone 0 — Scaffold (1-2 days)
- electron-vite + React + TypeScript project
- `window.takshashila` contextBridge skeleton
- Design tokens CSS loaded
- App renders with correct color palette and fonts

### Milestone 1 — Real Terminals (2-3 days)
- `node-pty` integrated with `electron-rebuild` in postinstall
- Windows ConPTY tested explicitly
- Single agent spawns and streams to xterm.js in renderer
- Command bar writes to PTY
- Resize handled correctly

### Milestone 2 — Sabha Layer (2-3 days)
- Sabha directory structure initialized
- Agent identity, smriti, inbox/outbox file ops
- Sandesh router (outbox → inbox delivery)
- Itihas append-only log
- isomorphic-git commit on each Sabha mutation

### Milestone 3 — Chanakya GOD Agent (2-3 days)
- Chanakya spawns as special agent with orchestrator system prompt
- Stop-loop implemented
- Aadesh bar sends to Chanakya inbox
- Chanakya assigns to other agents via sandesh
- Anumati queue populated and panel functional

### Milestone 4 — Hook Server (1-2 days)
- Named pipe server (Windows) / UDS (Unix) in `hooks.ts`
- `cth-hook` shim bundled
- `PreToolUse`, `PostToolUse`, `Stop` events reach Sabha layer
- Avastha updates fire correctly

### Milestone 5 — Court Floor (3-4 days)
- Pixi.js app in renderer
- Tiled courtyard map renders
- Avatar sprites placed at assigned desks
- Camera pan/zoom
- Click on avatar selects agent in detail panel

### Milestone 6 — Animations (2-3 days)
- Lamp overlay on each avatar, state-driven
- Sandesh scroll animation (parabolic arc, 500ms)
- Arrival sparkle
- Avatar walk animation (A* pathfinding to desk on task start)

### Milestone 7 — Full Detail Panel (2-3 days)
- All four tabs: Terminal, Files, Git, Smriti
- Files: sandboxed tree + CodeMirror editor
- Git: status, log, branch list
- Smriti: rendered markdown + edit

### Milestone 8 — Onboarding & Polish (2-3 days)
- Onboarding wizard (system check, Sabha setup, Chanakya spawn)
- `+ Add Shishya` flow with avatar walk-in animation
- Anumati panel slide animation
- Smriti search panel
- Itihas panel

### Milestone 9 — Packaging (1-2 days)
- `electron-builder.yml` configured for NSIS (Windows) and DMG (macOS)
- `postinstall` runs `electron-rebuild` for `node-pty`
- README with prereqs (Visual Studio Build Tools for Windows)
- Test installer on Windows 10 and Windows 11

---

## 17. Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `node-pty` build failure on Windows | Document exact VS Build Tools version required. Detect in onboarding wizard. Consider bundling prebuilt `.node` binary for common Electron versions. |
| Hook server named pipe conflicts | Include PID in pipe name. Clean up pipe on app exit (close server in `app.on('before-quit')`). |
| Chanakya goes silent (Stop-loop breaks) | Watchdog timer: if no PTY output from Chanakya for >30s and inbox is non-empty, re-trigger the prompt. |
| Font rendering in pixel-art UI | Use `image-rendering: pixelated` on all sprite elements. Lock `Press Start 2P` to exact pixel sizes. |
| Large Smriti files degrading performance | Enforce 2000-word limit via summarization prompt. Archive old smriti to `smriti-archive.md`. |
| isomorphic-git performance on large Sabha | Shallow commit history. Only commit changed agent dirs, not the full tree on every mutation. |

---

## 18. Out of Scope (v1)

- Voice input for Aadesh
- Cloud sync of Sabha
- Multiplayer / team Samrats
- Mobile client
- Semantic memory index (nice-to-have, degrades gracefully)
- Remotion landing page video
- More than 7 simultaneous agents (UI supports scrolling but no testing beyond 7)

---

## 19. Handoff Notes for Claude Code

- Start with **Milestone 0** (scaffold + design tokens). Do not start the Pixi floor until terminals work.
- The most critical Windows-specific fix is in `hooks.ts` — get the named pipe path right from day one.
- Design tokens in `tokens.css` must be set up before any component is styled — every color and font should come from variables, never hardcoded.
- The `electron-rebuild` postinstall is non-negotiable. Test it on a clean Windows machine early.
- Keep `sabha.ts` simple and file-based. Resist the urge to put everything in SQLite — markdown files are inspectable and debuggable.
- Chanakya's system prompt is critical. Spend time on it. A bad orchestrator makes the whole thing feel broken.
- Pixel art assets: use placeholder colored rectangles for avatars and tiles in early milestones. Don't block on art.

---

*Document version: 1.0 · Project: Takshashila · Author: Dewashish + Claude*
