// Real pixel-art assets for the court floor, served from /court (renderer
// public dir, copied from the source packs in /assets at the repo root).
//
//   tiles-*.png    Cainos "Pixel Art Top Down — Basic" (CC0): floor, walls
//   props.png      same pack: vases, barrels, monuments, fountain, statue…
//   plants.png     same pack: trees, bushes, grass tufts
//   struct.png     same pack: stone arches (entrance gate)
//   char-*.png     one idle sprite-sheet per agent (free 2D character packs)
//
// Everything is sliced here, once, into NEAREST-filtered textures. The rest
// of the scene imports `CourtAssets` and never touches pixel rectangles.

import { Assets, Rectangle, SCALE_MODES, Texture, type BaseTexture } from 'pixi.js'
import type { TileKind } from './layout'

// ─── Character sheets ─────────────────────────────────────────────────────────

export interface CharacterDef {
  /** sheet url under /court */
  url: string
  frameW: number
  frameH: number
  frames: number
  /** row index for multi-row sheets */
  row: number
  /** world scale applied to the frame */
  scale: number
  /** feet line inside the frame, as a fraction of frameH (anchor y) */
  anchorY: number
  /** visible character height in world px after scaling — places the status dot */
  height: number
  /** animation speed for Pixi AnimatedSprite (frames per ticker frame) */
  speed: number
}

// The cast. Frame geometry measured from each sheet.
export const CHARACTERS: Record<string, CharacterDef> = {
  // Necromancer — the dark strategist at the top of the court
  chanakya:      { url: 'court/char-chanakya.png',      frameW: 160, frameH: 128, frames: 8,  row: 0, scale: 1.2,  anchorY: 0.81, height: 78, speed: 0.10 },
  // Kobold warrior — scrappy, never lets go of a long task
  aaruni:        { url: 'court/char-aaruni.png',        frameW: 148, frameH: 96,  frames: 6,  row: 0, scale: 1.0,  anchorY: 0.93, height: 64, speed: 0.09 },
  // Wandering seeker — Nachiketa, the questioner
  nachiketa:     { url: 'court/char-nachiketa.png',     frameW: 192, frameH: 128, frames: 10, row: 0, scale: 1.0,  anchorY: 0.86, height: 66, speed: 0.10 },
  // Heroine — Gargi, the philosopher who out-argued the court
  gargi:         { url: 'court/char-gargi.png',         frameW: 128, frameH: 64,  frames: 4,  row: 0, scale: 1.6,  anchorY: 0.92, height: 62, speed: 0.06 },
  // Knight — Bharadwaja, armored builder of solid things
  bharadwaja:    { url: 'court/char-bharadwaja.png',    frameW: 96,  frameH: 84,  frames: 7,  row: 0, scale: 1.3,  anchorY: 0.91, height: 64, speed: 0.09 },
  // Samurai — Chandragupta, the swift blade of deployment
  chandragupta:  { url: 'court/char-chandragupta.png',  frameW: 96,  frameH: 96,  frames: 10, row: 0, scale: 1.1,  anchorY: 0.92, height: 62, speed: 0.10 },
  // Old wizard with the staff — Vishnu Sharma, teller of the Panchatantra
  vishnu_sharma: { url: 'court/char-vishnu_sharma.png', frameW: 231, frameH: 190, frames: 6,  row: 0, scale: 0.62, anchorY: 0.875, height: 70, speed: 0.08 }
}

/** Overflow agents (added later via M8) reuse the seeker sheet */
export const FALLBACK_CHARACTER = 'nachiketa'

// Walk/run loops — same frame geometry as the idle sheet of the same agent.
// nachiketa's pack ships no run sheet: his idle doubles as the walk loop.
const WALK_SHEETS: Record<string, { url: string; frames: number; row: number }> = {
  chanakya:      { url: 'court/char-chanakya.png',      frames: 8,  row: 1 },
  aaruni:        { url: 'court/walk-aaruni.png',        frames: 8,  row: 0 },
  nachiketa:     { url: 'court/char-nachiketa.png',     frames: 10, row: 0 },
  gargi:         { url: 'court/walk-gargi.png',         frames: 7,  row: 0 },
  bharadwaja:    { url: 'court/walk-bharadwaja.png',    frames: 8,  row: 0 },
  chandragupta:  { url: 'court/walk-chandragupta.png',  frames: 16, row: 0 },
  vishnu_sharma: { url: 'court/walk-vishnu_sharma.png', frames: 8,  row: 0 }
}

// ─── Prop + tile rectangles (source px) ───────────────────────────────────────

const PROP_RECTS = {
  vase:      { x: 160, y: 212, w: 32,  h: 46 },
  pot:       { x: 160, y: 284, w: 32,  h: 32 },
  jug:       { x: 162, y: 346, w: 28,  h: 38 },
  barrel:    { x: 160, y: 152, w: 32,  h: 40 },
  chest:     { x: 94,  y: 18,  w: 36,  h: 42 },
  cabinet:   { x: 94,  y: 82,  w: 36,  h: 74 },  // tall shelf with drawers
  bench:     { x: 286, y: 14,  w: 64,  h: 48 },  // agent desk
  altar:     { x: 286, y: 82,  w: 68,  h: 44 },  // chanakya's desk
  shrine:    { x: 288, y: 156, w: 32,  h: 62 },  // standing shrine — pillars
  cairn:     { x: 416, y: 196, w: 40,  h: 64 },  // stacked stone marker
  gravestone:{ x: 224, y: 232, w: 32,  h: 48 },
  signpost:  { x: 94,  y: 156, w: 36,  h: 42 },
  statue:    { x: 444, y: 12,  w: 44,  h: 80 },
  fountain:  { x: 352, y: 268, w: 96,  h: 74 },  // round well — the kund
  rock:      { x: 128, y: 480, w: 40,  h: 32 }
} as const
export type PropName = keyof typeof PROP_RECTS

const PLANT_RECTS = {
  tree1: { x: 32,  y: 12,  w: 104, h: 142 },
  tree2: { x: 158, y: 8,   w: 100, h: 146 },
  tree3: { x: 292, y: 30,  w: 84,  h: 122 },
  bush1: { x: 92,  y: 188, w: 42,  h: 34 },
  bush2: { x: 152, y: 182, w: 52,  h: 40 },
  bush3: { x: 214, y: 178, w: 54,  h: 46 },
  bush4: { x: 340, y: 184, w: 50,  h: 40 },
  tuft1: { x: 0,   y: 384, w: 32,  h: 32 },
  tuft2: { x: 32,  y: 384, w: 32,  h: 32 },
  tuft3: { x: 64,  y: 416, w: 32,  h: 32 },
  tuft4: { x: 96,  y: 448, w: 32,  h: 32 }
} as const
export type PlantName = keyof typeof PLANT_RECTS

// struct.png — entrance arch
const ARCH_RECT = { x: 412, y: 24, w: 68, h: 68 }

// tiles-wall.png — one wall column slice: stone cap + brick face
const WALL_SEGMENT = { x: 64, y: 192, w: 32, h: 64 }

// floor variants, all 32×32 source cells
// offsets chosen to stay inside the slabs, clear of their grout borders
const GROUND_CELLS: Record<string, Array<[number, number]>> = {
  plain:  [[8, 8], [40, 8], [8, 40], [40, 40]],
  dotted: [[168, 8], [216, 56]]
}
const GRASS_CELLS: Array<[number, number]> = [
  [0, 0], [32, 32], [64, 64], [96, 0], [0, 64], [64, 96], [192, 32], [224, 96]
]
const FLOWER_CELLS: Array<[number, number]> = [[128, 0], [160, 64], [224, 0]]

// ─── Loading + slicing ────────────────────────────────────────────────────────

export interface CourtAssets {
  /** floor textures per tile kind — pick any variant per cell */
  tiles: Record<TileKind, Texture[]>
  /** platform cells reuse plain stone with this tint */
  platformTint: number
  props: Record<PropName, Texture>
  plants: Record<PlantName, Texture>
  arch: Texture
  wallSegment: Texture
  /** animation frames per agent id */
  characters: Record<string, { idle: Texture[]; walk: Texture[] }>
}

function slice(base: BaseTexture, x: number, y: number, w: number, h: number): Texture {
  return new Texture(base, new Rectangle(x, y, w, h))
}

function sliceRow(
  base: BaseTexture, frameW: number, frameH: number, frames: number, row: number
): Texture[] {
  const out: Texture[] = []
  for (let i = 0; i < frames; i++) {
    out.push(slice(base, i * frameW, row * frameH, frameW, frameH))
  }
  return out
}

export async function loadCourtAssets(): Promise<CourtAssets> {
  // CSP (script-src 'self') forbids the blob workers Pixi's loader prefers —
  // decode textures on the main thread instead
  Assets.setPreferences({ preferWorkers: false })
  const urls = [...new Set([
    'court/tiles-ground.png', 'court/tiles-grass.png', 'court/tiles-wall.png',
    'court/props.png', 'court/plants.png', 'court/struct.png',
    ...Object.values(CHARACTERS).map((c) => c.url),
    ...Object.values(WALK_SHEETS).map((w) => w.url)
  ])]
  const loaded = await Assets.load<Texture>(urls)
  const baseOf = (url: string): BaseTexture => {
    const tex = loaded[url]
    tex.baseTexture.scaleMode = SCALE_MODES.NEAREST
    return tex.baseTexture
  }

  const ground = baseOf('court/tiles-ground.png')
  const grass = baseOf('court/tiles-grass.png')
  const wall = baseOf('court/tiles-wall.png')
  const props = baseOf('court/props.png')
  const plants = baseOf('court/plants.png')
  const struct = baseOf('court/struct.png')

  const cells = (base: BaseTexture, list: Array<[number, number]>): Texture[] =>
    list.map(([x, y]) => slice(base, x, y, 32, 32))

  const plain = cells(ground, GROUND_CELLS.plain)
  const dotted = cells(ground, GROUND_CELLS.dotted)
  const grassTiles = cells(grass, GRASS_CELLS)
  const flowerTiles = cells(grass, FLOWER_CELLS)

  const tiles: Record<TileKind, Texture[]> = {
    f0: [plain[0]],
    f1: [plain[1]],
    f2: [plain[2], plain[3]],
    f3: [dotted[0], dotted[1]],
    path: dotted,
    border: [slice(wall, WALL_SEGMENT.x, WALL_SEGMENT.y + 32, 32, 32)], // brick face
    water: [plain[0]],        // fountain prop covers the kund cells
    grass: [...grassTiles, ...grassTiles, ...flowerTiles], // flowers ~1 in 6
    platform: [plain[0], plain[1]]
  }

  const propTex = Object.fromEntries(
    Object.entries(PROP_RECTS).map(([k, r]) => [k, slice(props, r.x, r.y, r.w, r.h)])
  ) as Record<PropName, Texture>

  const plantTex = Object.fromEntries(
    Object.entries(PLANT_RECTS).map(([k, r]) => [k, slice(plants, r.x, r.y, r.w, r.h)])
  ) as Record<PlantName, Texture>

  const characters: CourtAssets['characters'] = {}
  for (const [id, def] of Object.entries(CHARACTERS)) {
    const w = WALK_SHEETS[id]
    characters[id] = {
      idle: sliceRow(baseOf(def.url), def.frameW, def.frameH, def.frames, def.row),
      walk: sliceRow(baseOf(w.url), def.frameW, def.frameH, w.frames, w.row)
    }
  }

  return {
    tiles,
    platformTint: 0xc9b896, // warm sandstone wash over the chamber floor
    props: propTex,
    plants: plantTex,
    arch: slice(struct, ARCH_RECT.x, ARCH_RECT.y, ARCH_RECT.w, ARCH_RECT.h),
    wallSegment: slice(wall, WALL_SEGMENT.x, WALL_SEGMENT.y, WALL_SEGMENT.w, WALL_SEGMENT.h),
    characters
  }
}
