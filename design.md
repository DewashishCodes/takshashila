# Takshashila — Visual Design Document

The single reference for how Takshashila looks and moves. Update this whenever
the scene, sprites, palette, or animation timings change.
Code home: `src/renderer/src/scene/court/` · UI tokens: `src/renderer/src/design/tokens.css`

---

## 1. Identity

Ancient Indian university (Takshashila, ~5th century BCE) rendered as cozy
pixel art. Reference feel: inhabited top-down office sims (Munder Difflin) —
no large empty areas, every zone furnished, the world breathes through small
ambient motion. Dusk lighting: dark warm stone, saffron-gold accents, oil lamps.

Hard rules:
- **Pixel art discipline** — hard edges, no gradients, no antialiasing.
  All textures `SCALE_MODES.NEAREST`.
- **Real sprite-sheet assets** — floor, furniture, and characters come from
  the packs in `/assets` (repo root), copied into `src/renderer/public/court/`
  and sliced at runtime by `assets.ts`. Only tiny glow-coupled desk items
  (lamp, manuscript, scroll pile, flying sandesh) remain procedural
  (`textures.ts`), plus ambient NPCs/zones (`ambientObjects.ts`).
- **Colors for UI/glows come from tokens** — scene code reads CSS variables
  via `palette.cssColor()`.

## 2. Palette

From design tokens (tokens.css):

| Token | Hex | Scene use |
|---|---|---|
| `--color-stone` | `#2C1810` | canvas background |
| `--color-courtyard` | `#8B6914` | floor base (shaded ×0.55 for dusk) |
| `--color-stone-light` | `#5C3D1E` | platform, stone desks |
| `--color-gold` | `#F4C430` | selection ring, rangoli, accents |
| `--color-gold-dim` | `#A8861E` | platform trim, minimap frame |
| `--color-terracotta` | `#C1440E` | vighna, rangoli |
| `--color-text-primary` | `#F5E6C8` | name labels, manuscripts |

Scene constants (not tokens):

| Element | Hex |
|---|---|
| Clay (diyas) | `#9C5530` |
| Palm leaf / parchment | `#D2B48C` / `#E8DCB8` |
| Lamp glow | `#FFB340` |
| Platform tint | `#C9B896` (sandstone wash over plain stone tiles) |
| Border tint | `#B0A898` |

Floor/props/character colors are owned by the source sheets (Cainos
"Pixel Art Top Down — Basic" + the character packs) — not configurable.

## 3. World & Layout

- World: **1216×800** px = 38×25 tiles of **32px**. All coordinates live in
  `layout.ts` (`DESK_POSITIONS`, landmarks, decoration map) — no magic numbers
  in renderers.
- Zones: Chanakya's chamber (top-right, brick-walled, tinted platform), main
  courtyard with central tree, left/center shishya desk wings, library
  alcove (right, Vishnu Sharma), entrance (bottom-center) with stone arch,
  flanking shrines, rangoli and torches, round stone fountain + praying
  statue as the kund (center-left).
- Paths form a cross from the tree: south to the entrance, east-west spine,
  north-east branch to the chamber door.
- Density rule: no large empty floor — pots, scroll piles, plants, stone
  markings fill gaps (`DECORATIONS` in layout.ts, ~30 items).

## 4. Render layers (bottom → top)

1. Floor tiles (`cacheAsBitmap`)
2. Ground decor — rangoli, kund ripples
3. Furniture — desks, shelves, walls, shrines, fountain, statue, decorations
4. **Avatars**
5. Desk items — lamps, manuscripts (in front of avatars)
6. Lamp glows
7. Canopy — tree sprite + entrance arch (over everything below)
8. UI overlays — scroll flights, torch glows
9. Minimap (screen-space, on the stage)

## 5. Character sprites (`assets.ts` → `Avatar.ts`)

Each agent is a looping **idle animation** sliced from a sprite sheet in
`src/renderer/public/court/char-<id>.png`. Geometry lives in
`CHARACTERS` (assets.ts): frame size, frame count, world scale, foot anchor,
visible height (status-dot placement), animation speed. Frames render through
`AnimatedSprite`, anchor at the feet, drop-shadow ellipse underneath.
Working/processing agents play their loop at **1.8×** speed and lean 1px in.
Loop phases start at a random frame so the cast never breathes in unison.

| Agent | Sheet (source pack) | Frames | Reads as |
|---|---|---|---|
| Chanakya | Necromancer (creativekind) | 8 × 160×128 | dark robed strategist with ember staff |
| Aaruni | Kobold Warrior (free pack) | 6 × 148×96 | scrappy blue fighter — never drops a task |
| Nachiketa | MainCharacter free pack | 10 × 192×128 | young dark seeker with blade |
| Gargi | Gothicvania Bridge Heroine | 4 × 128×64 ×1.6 | red-clad debater |
| Bharadwaja | Knight 2D Pixel Art | 7 × 96×84 ×1.3 | red-caped armored builder |
| Chandragupta | Samurai 2D Pixel Art | 10 × 96×96 | white-haired swordsman, deploys fast |
| Vishnu Sharma | Wizard Pack | 6 × 231×190 ×0.62 | old purple wizard, the storyteller |

Unknown/overflow agents fall back to the Nachiketa sheet
(`FALLBACK_CHARACTER`).

## 5a. Tileset & furniture (`assets.ts`)

Cainos "Pixel Art Top Down — Basic", 32px grid:

- Floor `f0–f3`: clean interior crops of the stone slabs (`tiles-ground.png`),
  offsets avoid the slabs' grout borders. `path` = dotted variants. `platform`
  = plain stone tinted `#C9B896`. `border` = brick face from `tiles-wall.png`
  tinted `#B0A898`. `grass` = plain + flower cells from `tiles-grass.png`
  (no transition tiles — hard edges are accepted).
- Chamber wall: 32×64 cap+face slice of the long wall (`tiles-wall.png`),
  base on the cell row.
- Props (`props.png`): bench = shishya desk, altar = Chanakya's desk,
  cabinet = shelves, shrine = entrance pillars, fountain + statue = kund,
  vase/pot/jug/barrel/chest/rock/cairn/gravestone/signpost = decorations
  (cycled deterministically per `DECORATIONS` kind).
- Plants (`plants.png`): tree2 ×1.5 = the central tree (canopy layer),
  bush1–4 = plant decorations.
- Struct (`struct.png`): stone arch ×1.4 over the entrance (canopy layer).

## 5b. Ambient zones (`ambientObjects.ts`)

Pure scenery + read-only reactions. Entry: `initAmbientObjects(stage, CourtLayout)` — called once by CourtScene after the map is built.

- **Teaching circle** (banyan tree base): 5 seated student NPCs (8×14 grid, ×2, no interaction) in a semicircle with slate tablets facing the tree. A Sanskrit shloka floats above the canopy every 12–20s (4 strings cycled in order; fade 0.5s / hold 2s / fade 0.5s; gold @ 0.7 alpha; Devanagari falls back from Press Start 2P to Noto Sans).
- **Arthashastra wall** (right side, 170×220 @ 1010,210): stone slab, etched book index (gold @ 0.3), diamond divider, cracks, drop shadow. Clickable → `window` CustomEvent `takshashila:scene` with `{ event: 'ARTHASHASTRA_CLICKED' }` — React layer wires a panel later.
- **Debate pit** (608,638, r30, above the rangoli): ring platform, two facing podiums, 8-petal lotus mandala (gold @ 0.2). Lotus pulses 1→1.2→1 over 600ms whenever any agent's avastha flips to working (read-only `onAvashtaChange` subscription, cleaned up on scene destroy).
- **Seeded scatter** (seed 42, deterministic): pot clusters / angled scroll piles / carved stone markers on free floor tiles (>2 tiles from any desk, landmark, or zone; ~8% of eligible tiles), plus wall-mounted torch brackets on perimeter tiles with 2-frame flames alternating every 150ms.

## 6. Animation timings

| Animation | Timing | Notes |
|---|---|---|
| Idle loop | per-sheet speed (≈5–7 fps) | random start frame per agent — never in unison |
| Working | loop ×1.8 + 1px lean | while working/processing |
| Idle glance | flip 1.5s, every 8–12s | random per agent, only when idle |
| Lamp glow (working) | radius 20→28px, 1.5s sine | alpha 0.4 |
| Lamp glow (idle / processing / siddhi / vighna) | static | alpha 0.1 / 0.3 / 0.2 / 0 |
| Sandesh scroll | 900ms flight + 300ms unfurl | 80px arc over furniture, cubic ease-in-out, 3-dot fading trail |
| Kund ripple | every 2s, 1.6s expand | alpha 0.3→0, radius 4→26px |
| Torch flicker | every 100–200ms | brightness 0.6–1.0 |
| Banyan leaves | 5 quads, 4–9px/s upward drift | loop within canopy, sine sway |
| Camera intro | 1.5s entrance → full court | ease-in-out cubic |
| Camera focus pan | 400ms to selected desk | ease-out cubic, user input cancels |
| Shloka float | every 12–20s; 0.5s in / 2s hold / 0.5s out | gold @ 0.7, above canopy |
| Lotus pulse | 600ms, scale 1→1.2→1 | on any avastha → working |
| Torch bracket flames | 2 shapes, alternate 150ms | scatter zone, perimeter |

## 7. Camera & minimap

- Zoom 0.8–1.4×, wheel zooms toward cursor; lower bound relaxes to fit-scale
  so the full court always fits.
- Drag-pan with 5px threshold (avatar taps survive). Clamp keeps ≥⅓ of the
  court visible.
- Minimap: 80×60, bottom-left, robe-colored 3px dots, gold ring on selection.

## 8. Avastha colors (status)

| Avastha | Token | Meaning |
|---|---|---|
| idle | `--color-idle` (forest) | awaiting |
| working | `--color-active` (lamp gold) | running |
| processing | `--color-gold` | waiting on Samrat (anumati) |
| vighna | `--color-error` (terracotta) | stuck/error — lamp goes out |
| siddhi | `--color-success` (sage) | done |

## 9. Engine notes

- `@pixi/unsafe-eval` is imported at the top of `CourtScene.ts` — our CSP has
  no `unsafe-eval` and Pixi's shader generator needs the patch. Never remove.
- `Assets.setPreferences({ preferWorkers: false })` in `assets.ts` — the CSP
  (`script-src 'self'`) blocks the blob workers Pixi's loader spawns for
  texture decoding. Never remove.
- Asset load is async: `CourtFloor` awaits `loadCourtAssets()` before
  constructing `CourtScene`, then replays the latest agents/selection.
- `CourtScene.destroy` keeps base textures alive (`children: true` only) —
  they live in the shared Assets cache and must survive a React remount.
- All textures use `SCALE_MODES.NEAREST` so zoom stays crisp.
- Furniture is built up-front from `layout.ts` (court looks furnished before
  agents load); avatars attach when Sabha state arrives.
