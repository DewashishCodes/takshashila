# Takshashila — Pre-M9 Improvement Backlog

Findings from a code audit after M8 (2026-06-12). Ordered by priority.
Recommended scope before packaging: **all of Tier 1 + Tier 2** ("M8.5 — The Living Sabha").

---

## Tier 1 — The harness isn't actually multi-agent yet

### 1.1 Shishya runtime — specialists never run Claude or receive work
Chanakya's CLAUDE.md tells him to "name the specialist to delegate to", but that's
prose into a terminal. Nothing parses his answer, nothing writes a sandesh to the
shishya's inbox, and no shishya ever gets a `claude` session spawned — their
terminals open plain PowerShell. The six specialists are decorative.

Needed:
- **Generalize the chanakya.ts pattern** into a per-agent runtime: spawn `claude`
  in the agent's kshetra, prompt-gated delivery (`promptReady` + queue + `\r`
  submit), inbox watcher, avastha via hooks (already per-agent).
- Lazy spawn: start a shishya's claude session when the first sandesh arrives,
  not all seven at boot (cost).

### 1.2 Delegation channel — how Chanakya actually routes
Most robust approach: a small `cth-sandesh.js` script (generated into the sabha,
like `cth-hook.js`) that any agent can invoke via Bash:

```
node <sabhaHome>/cth-sandesh.js --to bharadwaja --subject "build X" --body "..."
```

It writes a sandesh JSON into the target's inbox. File-based — no fragile
output parsing. Results flow back the same way (shishya → chanakya's inbox,
plus outbox copy so the renderer's scroll animation fires). Document the tool
in every agent's workspace CLAUDE.md.

### 1.3 Per-shishya workspace CLAUDE.md personas
Only Chanakya gets a persona file (`ensureChanakyaClaudeMd`). Seed shishyas and
custom shishyas from M8 (`createAgent` in sabha.ts) get none — a spawned claude
session would have no idea who it is. Generate one per agent from
identity.json (name, domain, persona, sandesh-tool usage, smriti conventions).

### 1.4 Anumati panel — approvals are invisible
Main detects y/n permission prompts, writes anumati items, and emits
`anumati:new` — but no renderer component listens. Chanakya silently stalls at
permission prompts unless his terminal tab happens to be open.

The IPC is all there waiting: `anumati.getPending` / `anumati.respond` /
`anumati.onNew` / `chanakya:anumati-respond`. Needed: a renderer panel (toast
stack or queue drawer) with approve/deny buttons; deny/approve writes to the
session and clears the item.

---

## Tier 2 — Actual bugs found

### 2.1 `chanakya:restart` only stops
`registerChanakyaHandlers` (chanakya.ts) calls `stopChanakya()` and never
starts him again — also doesn't kill/respawn the PTY. A "restart" action is
currently a kill switch. Should: stop, kill the `chanakya` session, then
`startChanakya(getConfig(), getSender)`.

### 2.2 Chanakya's specialist roster is static
`ensureChanakyaClaudeMd` writes the seed six once and returns early if the file
exists — he will never know a summoned shishya (e.g. Panini) exists, and prompt
fixes never propagate. Regenerate the roster section on every boot (or use
markers to rewrite just that block), and refresh it when `sabha:addAgent` runs.

### 2.3 Anumati y/n detection is loose
`/\(y\/n\b|\bYes\b.*\bNo\b/i` in chanakya.ts `onOutput` will false-positive on
ordinary output containing "Yes … No". Tighten to Claude Code's actual
permission-prompt shapes (e.g. numbered "1. Yes / 2. No" menus), and consider
gating on PreToolUse hook state.

---

## Tier 3 — UX polish (droppable for v0.1)

- **3.1 Blackboard viewer/editor** — `sabha:getBlackboard` / `sabha:updateBlackboard`
  IPC exists, zero UI. Natural fit: third tab in the SearchPanel, or a modal.
- **3.2 Aadesh history** — up/down arrow recall in the Aadesh bar; queue-depth
  indicator when Chanakya is busy (aadeshQueue length is main-side only today).
- **3.3 Retire a shishya** — can summon but never dismiss. Needs `sabha:removeAgent`
  (guard: seeds non-removable; kill PTY; close watchers; archive dir rather than delete).
- **3.4 Settings modal** — change defaultCommand / view sabha home post-onboarding
  without editing config.json by hand; "re-run onboarding" button.
- **3.5 Itihas live tail** — SearchPanel itihas tab is a snapshot; subscribe or poll
  while open.

---

## Tier 4 — Engineering hygiene (post-v0.1 acceptable)

- **4.1 No tests** — at minimum: sabha sandesh/inbox round-trip, slugify/createAgent,
  ANSI-strip + prompt-ready regex, A* pathfinding.
- **4.2 No lint script** — add ESLint + a `lint` npm script.
- **4.3 Bundle size** — renderer chunk is 2.8 MB (Pixi + CodeMirror + xterm in one);
  manualChunks or dynamic import for CodeMirror panes.
- **4.4 itihas.jsonl unbounded growth** — rotate or cap (e.g. keep last 10k lines on boot).
