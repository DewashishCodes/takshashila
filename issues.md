# Known Issues

## [OPEN] Shishya PTY session not auto-spawning for some agents

**Agents affected:** Nachiketa, Vishnu Sharma (possibly others — not fully confirmed)

**Symptom:**
When Chanakya delegates a sandesh to these agents, `shishya.ts` attempts to write to their PTY session but no session exists yet. The delivery errors out silently. The terminal tab in the UI is blank / not running Claude.

**Workaround (confirmed working):**
1. Click the agent in the court floor to open ShishyaPanel
2. Switch to the Terminal tab — this triggers the renderer to spawn a PTY session manually
3. Ask Chanakya to resend the instructions
4. Everything works as expected after that

**Root cause (hypothesis):**
`spawnShishya()` in `shishya.ts` calls `spawnSession()` from `pty.ts`, but the session may be silently failing or not being registered in the `sessions` map for these specific agents. Could be related to:
- A timing issue during `startShishyaRuntimes` at app boot (agents dir not fully initialised yet)
- `resolveClaudeCommand` returning a bad path for some agents but not others
- The renderer-side `TerminalPane` being the actual spawn trigger, and the main-process lazy spawn not working for every agent

**To investigate:**
- Add logging to `spawnShishya` to confirm `spawnSession` succeeds and the data listener is registered
- Check if `sessions.has(agentId)` is true after `spawnShishya` returns for the failing agents
- Compare what's different about Nachiketa and Vishnu Sharma's identity/workspace vs Bharadwaja who works
- Consider whether the fix is to eagerly spawn all PTY sessions at app start rather than lazily on first sandesh
