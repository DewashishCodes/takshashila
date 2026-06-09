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
- **Pixel art discipline** — hard edges, chunky rects, no gradients, no antialiasing.
- **No external image assets** — everything is Pixi Graphics primitives, baked
  to NEAREST-scaled textures (tiles/furniture) or drawn live (characters).
- **Colors come from tokens** — scene code reads CSS variables via
  `palette.cssColor()`. Scene-specific constants (robes, wood, water) are
  defined once in `palette.ts` / `sprites.ts` and documented here.

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
| Water | `#2E5F7A` |
| Grass | `#4A6B2F` |
| Wood (desks/shelves/trunk) | `#6B4226` / `#4A2C17` |
| Clay (pots, diyas) | `#9C5530` |
| Palm leaf / parchment | `#D2B48C` / `#E8DCB8` |
| Lamp glow | `#FFB340` |
| Skin | `#C8956C` |
| Eyes / outlines | `#2C1810` |

## 3. World & Layout

- World: **1216×800** px = 38×25 tiles of **32px**. All coordinates live in
  `layout.ts` (`DESK_POSITIONS`, landmarks, decoration map) — no magic numbers
  in renderers.
- Zones: Chanakya's chamber (top-right, walled, raised platform), main
  courtyard with central banyan tree, left/center shishya desk wings, library
  alcove (right, Vishnu Sharma), pillared entrance (bottom-center) with rangoli
  and torches, 2×2 water kund (center-left).
- Paths form a cross from the tree: south to the entrance, east-west spine,
  north-east branch to the chamber door.
- Density rule: no large empty floor — pots, scroll piles, plants, stone
  markings fill gaps (`DECORATIONS` in layout.ts, ~30 items).

## 4. Render layers (bottom → top)

1. Floor tiles (`cacheAsBitmap`)
2. Ground decor — rangoli, kund ripples
3. Furniture — desks, stools, shelves, walls, pillars, trunk, decorations
4. **Avatars**
5. Desk items — lamps, manuscripts (in front of avatars)
6. Lamp glows
7. Tree canopy (over everything below)
8. UI overlays — scroll flights, torch glows
9. Minimap (screen-space, on the stage)

## 5. Character sprites (`sprites.ts`)

Drawn live with Graphics on a **16×28 one-pixel grid**, pivot at bottom-center
of the feet, scaled **×2** into the world (32×56). Shared anatomy bottom→top:
sandals (2×3px) → dhoti (~12×10) → uttariya shawl (~10×6, lighter) → head
(8×8 rounded, skin `#C8956C`) → hair/turban. Face: 2 eye dots + 1 nose pixel.

| Agent | Robe | Uttariya | Headwear | Distinguishing feature |
|---|---|---|---|---|
| Chanakya | ochre `#B8860B` | pale yellow `#F5DEB3`, asymmetric (wider left) | shaved + sikha topknot | short beard; palm-leaf scroll at right hand; wider head |
| Aaruni | burnt orange `#CC5500` | cream `#FFFDD0` | terracotta turban | mud smudges on lower robe (the dam story) |
| Nachiketa | deep blue `#1B3A6B` | white `#F8F8F8` | bare + dark topknot | smallest, 1px eager forward lean |
| Gargi | magenta `#8B1A4A` | gold dupatta `#DAA520`, diagonal over left shoulder | dark hair bun | full-length robe; raised debater's hand (left) |
| Bharadwaja | forest green `#2D5A27` | brown `#8B6914` | dark green turban | chisel in right hand |
| Chandragupta | royal red `#8B0000` | saffron `#FF9933` | red turban, saffron stripe | tallest, stands straight |
| Vishnu Sharma | aged white `#F5F5DC` | sage `#8FBC8F` | white topknot | hunched (+2px down, back ridge); open palm-leaf book in front |

API: `drawSprite(agentId, container)` — the only way avatars are drawn.
Unknown agents get a neutral fallback body.

## 5b. Ambient zones (`ambientObjects.ts`)

Pure scenery + read-only reactions. Entry: `initAmbientObjects(stage, CourtLayout)` — called once by CourtScene after the map is built.

- **Teaching circle** (banyan tree base): 5 seated student NPCs (8×14 grid, ×2, no interaction) in a semicircle with slate tablets facing the tree. A Sanskrit shloka floats above the canopy every 12–20s (4 strings cycled in order; fade 0.5s / hold 2s / fade 0.5s; gold @ 0.7 alpha; Devanagari falls back from Press Start 2P to Noto Sans).
- **Arthashastra wall** (right side, 170×220 @ 1010,210): stone slab, etched book index (gold @ 0.3), diamond divider, cracks, drop shadow. Clickable → `window` CustomEvent `takshashila:scene` with `{ event: 'ARTHASHASTRA_CLICKED' }` — React layer wires a panel later.
- **Debate pit** (608,638, r30, above the rangoli): ring platform, two facing podiums, 8-petal lotus mandala (gold @ 0.2). Lotus pulses 1→1.2→1 over 600ms whenever any agent's avastha flips to working (read-only `onAvashtaChange` subscription, cleaned up on scene destroy).
- **Seeded scatter** (seed 42, deterministic): pot clusters / angled scroll piles / carved stone markers on free floor tiles (>2 tiles from any desk, landmark, or zone; ~8% of eligible tiles), plus wall-mounted torch brackets on perimeter tiles with 2-frame flames alternating every 150ms.

## 6. Animation timings

| Animation | Timing | Notes |
|---|---|---|
| Idle bob | 1px, 800ms cycle | staggered `index × 200ms` per agent — never in unison |
| Working lean | +1px forward | replaces bob while working/processing |
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
- All baked textures use `SCALE_MODES.NEAREST` so zoom stays crisp.
- Furniture is built up-front from `layout.ts` (court looks furnished before
  agents load); avatars attach when Sabha state arrives.
