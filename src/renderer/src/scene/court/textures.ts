import { Graphics, IRenderer, SCALE_MODES, Texture } from 'pixi.js'
import { shade, type ScenePalette } from './palette'
import { TILE, type TileKind } from './layout'

// All art is procedural: chunky rects baked to NEAREST textures.
// Pixel-art rules: hard edges, no gradients, PX-sized art pixels.

const PX = 4

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function bake(renderer: IRenderer, g: Graphics): Texture {
  const tex = renderer.generateTexture(g, { scaleMode: SCALE_MODES.NEAREST })
  g.destroy()
  return tex
}

function px(g: Graphics, color: number, x: number, y: number, w = 1, h = 1): void {
  g.beginFill(color)
  g.drawRect(x * PX, y * PX, w * PX, h * PX)
  g.endFill()
}

// ─── Tile set ─────────────────────────────────────────────────────────────────

function makeStoneTile(renderer: IRenderer, base: number, seed: number, detail: boolean): Texture {
  const g = new Graphics()
  const rnd = mulberry32(seed)
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      px(g, shade(base, 0.93 + rnd() * 0.12), x, y)
  // grout
  px(g, shade(base, 0.62), 0, 7, 8, 1)
  px(g, shade(base, 0.62), 7, 0, 1, 8)
  if (detail) {
    // crack / chip details
    px(g, shade(base, 0.7), 2, 2)
    px(g, shade(base, 0.7), 3, 3)
    px(g, shade(base, 1.18), 5, 5)
  }
  return bake(renderer, g)
}

function makeBorderTile(renderer: IRenderer, pal: ScenePalette, seed: number): Texture {
  const g = new Graphics()
  const rnd = mulberry32(seed)
  const base = shade(pal.stone, 1.5)
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      px(g, shade(base, 0.9 + rnd() * 0.2), x, y)
  // brick courses
  px(g, shade(base, 0.55), 0, 3, 8, 1)
  px(g, shade(base, 0.55), 0, 7, 8, 1)
  px(g, shade(base, 0.55), 3, 0, 1, 3)
  px(g, shade(base, 0.55), 6, 4, 1, 3)
  // top highlight
  px(g, shade(base, 1.35), 0, 0, 8, 1)
  return bake(renderer, g)
}

function makePathTile(renderer: IRenderer, pal: ScenePalette, seed: number): Texture {
  const g = new Graphics()
  const rnd = mulberry32(seed)
  const base = shade(pal.courtyard, 0.78)
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      px(g, shade(base, 0.94 + rnd() * 0.12), x, y)
  // flagstone joints
  px(g, shade(base, 0.65), 0, 3, 4, 1)
  px(g, shade(base, 0.65), 4, 6, 4, 1)
  px(g, shade(base, 0.65), 4, 0, 1, 4)
  return bake(renderer, g)
}

function makeWaterTile(renderer: IRenderer, seed: number): Texture {
  const g = new Graphics()
  const rnd = mulberry32(seed)
  const base = 0x2e5f7a
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      px(g, shade(base, 0.9 + rnd() * 0.18), x, y)
  // glints
  px(g, shade(base, 1.6), 2, 1, 2, 1)
  px(g, shade(base, 1.5), 5, 4, 1, 1)
  px(g, shade(base, 1.45), 1, 6, 2, 1)
  return bake(renderer, g)
}

function makeGrassTile(renderer: IRenderer, seed: number): Texture {
  const g = new Graphics()
  const rnd = mulberry32(seed)
  const base = 0x4a6b2f
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      px(g, shade(base, 0.85 + rnd() * 0.25), x, y)
  // tufts
  px(g, shade(base, 1.4), 1, 2)
  px(g, shade(base, 1.35), 5, 5)
  px(g, shade(base, 0.6), 3, 6)
  return bake(renderer, g)
}

function makePlatformTile(renderer: IRenderer, pal: ScenePalette, seed: number): Texture {
  const g = new Graphics()
  const rnd = mulberry32(seed)
  const base = shade(pal.stoneLight, 0.85)
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      px(g, shade(base, 0.92 + rnd() * 0.14), x, y)
  px(g, shade(pal.goldDim, 0.8), 0, 7, 8, 1)
  px(g, shade(base, 0.6), 7, 0, 1, 8)
  return bake(renderer, g)
}

export function makeTileSet(renderer: IRenderer, pal: ScenePalette): Record<TileKind, Texture[]> {
  const floorBase = shade(pal.courtyard, 0.55)
  return {
    f0:       [makeStoneTile(renderer, floorBase, 11, false)],
    f1:       [makeStoneTile(renderer, floorBase, 23, false)],
    f2:       [makeStoneTile(renderer, floorBase, 37, true)],
    f3:       [makeStoneTile(renderer, shade(floorBase, 1.08), 51, true)],
    border:   [makeBorderTile(renderer, pal, 61), makeBorderTile(renderer, pal, 67)],
    path:     [makePathTile(renderer, pal, 71), makePathTile(renderer, pal, 73)],
    water:    [makeWaterTile(renderer, 83)],
    grass:    [makeGrassTile(renderer, 91), makeGrassTile(renderer, 97)],
    platform: [makePlatformTile(renderer, pal, 103)]
  }
}

// ─── Furniture ────────────────────────────────────────────────────────────────

export function makeDeskTexture(renderer: IRenderer, pal: ScenePalette, large = false): Texture {
  const g = new Graphics()
  const stone = shade(pal.stoneLight, 1.25) // beige stone slab
  const w = large ? 20 : 14 // art px
  const h = 7
  // slab top
  px(g, shade(stone, 1.2), 0, 0, w, 2)
  // slab face
  px(g, stone, 0, 2, w, h - 4)
  // legs
  px(g, shade(stone, 0.6), 1, h - 2, 2, 2)
  px(g, shade(stone, 0.6), w - 3, h - 2, 2, 2)
  // shadow under slab
  px(g, shade(stone, 0.45), 0, h - 2, w, 1)
  void pal
  return bake(renderer, g)
}

export function makeStoolTexture(renderer: IRenderer, pal: ScenePalette): Texture {
  const g = new Graphics()
  const stone = shade(pal.stoneLight, 1.05)
  px(g, shade(stone, 1.15), 0, 0, 4, 1)
  px(g, stone, 0, 1, 4, 1)
  px(g, shade(stone, 0.6), 1, 2, 1, 1)
  px(g, shade(stone, 0.6), 3, 2, 1, 1)
  return bake(renderer, g)
}

export function makeBookshelfTexture(renderer: IRenderer, tall: boolean): Texture {
  const g = new Graphics()
  const wood = 0x4a2c17
  const w = 8
  const h = tall ? 24 : 16
  px(g, wood, 0, 0, w, h)
  px(g, shade(wood, 1.3), 0, 0, w, 1)
  // shelves with scroll bundles
  const scrollColors = [0xd8c9a3, 0xc4a35a, 0xb08968, 0xd8c9a3]
  for (let s = 0; s < (tall ? 4 : 3); s++) {
    const sy = 2 + s * 5
    px(g, shade(wood, 0.55), 0, sy + 3, w, 1) // shelf board
    for (let i = 0; i < 3; i++) {
      px(g, scrollColors[(s + i) % scrollColors.length], 1 + i * 2, sy, 2, 3)
    }
  }
  return bake(renderer, g)
}

export function makePillarTexture(renderer: IRenderer, pal: ScenePalette): Texture {
  const g = new Graphics()
  const stone = shade(pal.stone, 2.2)
  px(g, shade(stone, 1.25), 0, 0, 8, 2)   // capital
  px(g, stone, 1, 2, 6, 12)               // shaft
  px(g, shade(stone, 0.75), 2, 2, 1, 12)  // shaft shading
  px(g, shade(stone, 1.25), 0, 14, 8, 2)  // base
  return bake(renderer, g)
}

export function makeWallTexture(renderer: IRenderer, pal: ScenePalette): Texture {
  // low chamber wall — one tile wide, half tile tall, with cap highlight
  const g = new Graphics()
  const stone = shade(pal.stone, 1.8)
  px(g, shade(stone, 1.35), 0, 0, 8, 1)
  px(g, stone, 0, 1, 8, 3)
  px(g, shade(stone, 0.55), 0, 4, 8, 1)
  px(g, shade(stone, 0.7), 3, 1, 1, 3)
  return bake(renderer, g)
}

// ─── Desk items + decorations ─────────────────────────────────────────────────

export function makeManuscriptTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  px(g, 0xe8dcb8, 0, 0, 5, 2)
  px(g, 0xc9b787, 0, 1, 5, 1)
  px(g, 0x8a7350, 1, 0, 1, 2) // binding cord
  return bake(renderer, g)
}

export function makeLampTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  px(g, 0x8a5a2b, 0, 1, 3, 1)   // clay diya
  px(g, 0xffd700, 1, 0, 1, 1)   // flame
  return bake(renderer, g)
}

export function makePotTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  const clay = 0x9c5530
  px(g, shade(clay, 0.7), 1, 0, 2, 1)  // rim
  px(g, clay, 0, 1, 4, 2)              // belly
  px(g, shade(clay, 1.25), 1, 1, 1, 1) // highlight
  px(g, shade(clay, 0.6), 1, 3, 2, 1)  // foot
  return bake(renderer, g)
}

export function makeScrollPileTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  px(g, 0xd8c9a3, 0, 1, 3, 1)
  px(g, 0xc4ab78, 2, 1, 3, 1)
  px(g, 0xe8dcb8, 1, 0, 3, 1)
  return bake(renderer, g)
}

export function makeStoneMarkTexture(renderer: IRenderer, pal: ScenePalette): Texture {
  const g = new Graphics()
  const s = shade(pal.courtyard, 0.42)
  px(g, s, 0, 1, 2, 1)
  px(g, s, 2, 0, 1, 1)
  px(g, shade(s, 1.3), 1, 1, 1, 1)
  return bake(renderer, g)
}

export function makePlantTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  const leaf = 0x3f6b2a
  const clay = 0x9c5530
  px(g, shade(leaf, 1.2), 1, 0, 1, 1)
  px(g, leaf, 0, 1, 3, 1)
  px(g, shade(leaf, 0.75), 2, 0, 1, 1)
  px(g, clay, 0, 2, 3, 1)
  px(g, shade(clay, 0.6), 0, 3, 3, 1)
  return bake(renderer, g)
}

export function makeTrunkTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  const bark = 0x4a2c17
  px(g, bark, 1, 0, 3, 8)
  px(g, shade(bark, 1.3), 1, 0, 1, 8)         // light side
  px(g, shade(bark, 0.65), 3, 0, 1, 8)        // dark side
  px(g, bark, 0, 6, 5, 2)                     // root flare
  px(g, shade(bark, 0.65), 0, 7, 5, 1)
  return bake(renderer, g)
}

export function makeScrollSpriteTexture(renderer: IRenderer): Texture {
  // the flying sandesh
  const g = new Graphics()
  px(g, 0xe8dcb8, 0, 0, 3, 1)
  px(g, 0xc1440e, 1, 0, 1, 1) // wax seal
  return bake(renderer, g)
}

// ─── Avatar — 8×10 art-pixel person, robe color per agent ────────────────────

const AVATAR_MAP = [
  '..TTTT..',
  '.TTTTTT.',
  '.SSSSSS.',
  '.SESSES.',
  '..SSSS..',
  '.RRRRRR.',
  'RRRRRRRR',
  'RRRDDRRR',
  'RRRDDRRR',
  '.RR..RR.'
]

export function makeAvatarTexture(renderer: IRenderer, robe: number): Texture {
  const g = new Graphics()
  const colors: Record<string, number> = {
    T: shade(robe, 0.65),
    S: 0xd9a066,
    E: 0x2c1810,
    R: robe,
    D: shade(robe, 0.7)
  }
  for (let y = 0; y < AVATAR_MAP.length; y++) {
    for (let x = 0; x < AVATAR_MAP[y].length; x++) {
      const c = AVATAR_MAP[y][x]
      if (c === '.') continue
      px(g, colors[c], x, y)
    }
  }
  return bake(renderer, g)
}

export { TILE }
