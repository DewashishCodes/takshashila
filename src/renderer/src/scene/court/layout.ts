// Single source of truth for the court map. Every scene file imports its
// coordinates from here — no magic numbers scattered in renderers.
// Grid: 38×25 tiles of 32px → world 1216×800.

export const TILE = 32
export const COLS = 38
export const ROWS = 25
export const WORLD_W = COLS * TILE // 1216
export const WORLD_H = ROWS * TILE // 800

// ─── Tile kinds ───────────────────────────────────────────────────────────────

export type TileKind =
  | 'f0' | 'f1' | 'f2' | 'f3'   // stone floor variants
  | 'border'                     // perimeter wall ring
  | 'path'                       // walkway
  | 'water'                      // kund
  | 'grass'                      // earth/grass edges
  | 'platform'                   // chanakya's raised chamber floor

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Build the full tile map. Deterministic — same court every launch. */
export function buildTileGrid(): TileKind[][] {
  const rnd = mulberry32(7717)
  const g: TileKind[][] = []

  for (let r = 0; r < ROWS; r++) {
    const row: TileKind[] = []
    for (let c = 0; c < COLS; c++) {
      const roll = rnd()
      row.push(roll < 0.4 ? 'f0' : roll < 0.65 ? 'f1' : roll < 0.85 ? 'f2' : 'f3')
    }
    g.push(row)
  }

  // grass in the four corners + sparse along edges
  const grassPatch = (r0: number, c0: number, r1: number, c1: number): void => {
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (rnd() < 0.75) g[r][c] = 'grass'
  }
  grassPatch(1, 1, 3, 4)
  grassPatch(1, 33, 2, 36)
  grassPatch(21, 1, 23, 3)
  grassPatch(21, 34, 23, 36)
  for (let c = 1; c < COLS - 1; c++) {
    if (rnd() < 0.18) g[1][c] = 'grass'
    if (rnd() < 0.18) g[ROWS - 2][c] = 'grass'
  }

  // pathways — cross from the banyan tree
  for (let c = 2; c <= 35; c++) { g[12][c] = 'path' }                 // main horizontal
  for (let r = 12; r <= 23; r++) { g[r][18] = 'path'; g[r][19] = 'path' } // entrance → tree
  for (let r = 8; r <= 11; r++)  { g[r][30] = 'path'; g[r][31] = 'path' } // tree → chamber door

  // water kund (2×2), center-left
  g[9][6] = 'water'; g[9][7] = 'water'
  g[10][6] = 'water'; g[10][7] = 'water'

  // chanakya's platform (4×3 darker tiles)
  for (let r = 2; r <= 4; r++)
    for (let c = 28; c <= 32; c++)
      g[r][c] = 'platform'

  // perimeter ring last — entrance gap at bottom, cols 17–20
  for (let c = 0; c < COLS; c++) {
    g[0][c] = 'border'
    if (c < 17 || c > 20) g[ROWS - 1][c] = 'border'
  }
  for (let r = 0; r < ROWS; r++) {
    g[r][0] = 'border'
    g[r][COLS - 1] = 'border'
  }

  return g
}

// ─── Seats — avatar feet positions. Desks render at +14y, stools under feet ──

export interface Seat { x: number; y: number }

export const DESK_POSITIONS: Record<string, Seat> = {
  chanakya:      { x: 976,  y: 132 },  // chamber, top-right, on the platform
  aaruni:        { x: 160,  y: 430 },  // left wing, front row
  nachiketa:     { x: 352,  y: 430 },
  gargi:         { x: 160,  y: 590 },  // left wing, back row
  bharadwaja:    { x: 352,  y: 590 },
  chandragupta:  { x: 514,  y: 510 },  // center wing
  vishnu_sharma: { x: 1072, y: 470 }   // library alcove, right side
}

/** Overflow seats for agents added later (M8) */
export function overflowSeat(index: number): Seat {
  return { x: 180 + index * 150, y: 700 }
}

export const DESK_OFFSET   = { x: 0,  y: 14 }   // desk center relative to feet
export const LAMP_OFFSET   = { x: 24, y: 8 }    // oil lamp, top-right of desk
export const STOOL_OFFSET  = { x: 0,  y: 4 }    // stool under the avatar

// ─── Landmarks ────────────────────────────────────────────────────────────────

export const TREE       = { x: 624, y: 384 }
export const KUND       = { x: 224, y: 320 }    // top-left corner of the 2×2 water area
export const KUND_CENTER = { x: 256, y: 352 }
export const ENTRANCE   = { x: 608, y: 776 }    // samrat's scrolls spawn here
export const RANGOLI    = { x: 608, y: 700 }

export const PILLARS = [
  { x: 528, y: 792 },
  { x: 688, y: 792 }
]
export const TORCHES = [
  { x: 528, y: 722 },
  { x: 688, y: 722 }
]

// Chamber low wall: horizontal run with a door gap at cols 30–31, plus a
// vertical run closing the left side. Tile coords {r, c}.
export const CHAMBER_WALL: Array<{ r: number; c: number }> = (() => {
  const cells: Array<{ r: number; c: number }> = []
  for (let c = 26; c <= 36; c++) {
    if (c === 30 || c === 31) continue // door
    cells.push({ r: 7, c })
  }
  for (let r = 1; r <= 6; r++) cells.push({ r, c: 26 })
  return cells
})()

// Chamber furniture
export const CHANAKYA_SHELF = { x: 976, y: 78 }   // bookshelf behind the desk
export const LIBRARY_SHELVES = [
  { x: 1056, y: 396 },
  { x: 1120, y: 396 },
  { x: 1170, y: 460 }
]

// ─── Decorations — fill the floor so no area feels empty ─────────────────────

export type DecorKind = 'pot' | 'scrolls' | 'stone' | 'plant'

export const DECORATIONS: Array<{ x: number; y: number; kind: DecorKind }> = [
  // along the left wall
  { x: 56,  y: 180, kind: 'pot' },    { x: 56,  y: 330, kind: 'plant' },
  { x: 56,  y: 520, kind: 'pot' },    { x: 60,  y: 680, kind: 'stone' },
  // top edge / near chamber
  { x: 240, y: 90,  kind: 'plant' },  { x: 420, y: 70,  kind: 'pot' },
  { x: 560, y: 100, kind: 'scrolls' },{ x: 700, y: 70,  kind: 'stone' },
  { x: 840, y: 100, kind: 'plant' },
  // chamber interior corners
  { x: 880, y: 200, kind: 'pot' },    { x: 1130, y: 90,  kind: 'plant' },
  { x: 1150, y: 210, kind: 'scrolls' },
  // between the desk wings
  { x: 256, y: 500, kind: 'scrolls' },{ x: 440, y: 430, kind: 'pot' },
  { x: 256, y: 660, kind: 'stone' },  { x: 450, y: 660, kind: 'plant' },
  { x: 620, y: 560, kind: 'stone' },
  // around the kund
  { x: 180, y: 300, kind: 'plant' },  { x: 330, y: 310, kind: 'pot' },
  { x: 190, y: 390, kind: 'stone' },
  // right side / library
  { x: 950, y: 380, kind: 'scrolls' },{ x: 960, y: 560, kind: 'pot' },
  { x: 1100, y: 620, kind: 'plant' }, { x: 1160, y: 540, kind: 'stone' },
  // near the entrance
  { x: 460, y: 720, kind: 'pot' },    { x: 760, y: 720, kind: 'plant' },
  { x: 850, y: 680, kind: 'scrolls' },{ x: 350, y: 730, kind: 'stone' },
  // tree surroundings
  { x: 540, y: 330, kind: 'stone' },  { x: 720, y: 330, kind: 'scrolls' },
  { x: 730, y: 450, kind: 'pot' }
]
