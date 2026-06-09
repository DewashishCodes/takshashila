import { Graphics, IRenderer, SCALE_MODES, Texture } from 'pixi.js'
import { shade, type ScenePalette } from './palette'

// All art is generated procedurally: chunky rects on a Graphics object,
// baked to a texture with NEAREST scaling so camera zoom stays crisp pixel-art.

const PX = 4 // logical pixel size — every "art pixel" is a 4×4 rect

export const TILE = 32 // world tile size (8 art pixels)

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

// ─── Floor tiles — sun-baked courtyard stone, 3 variants ─────────────────────

export function makeFloorTextures(renderer: IRenderer, pal: ScenePalette): Texture[] {
  const variants: Texture[] = []
  for (let v = 0; v < 3; v++) {
    const g = new Graphics()
    const rnd = mulberry32(1000 + v * 77)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        // subtle brightness grain per art-pixel
        const f = 0.92 + rnd() * 0.14
        g.beginFill(shade(pal.courtyard, f * 0.55)) // darkened courtyard — dusk court
        g.drawRect(x * PX, y * PX, PX, PX)
        g.endFill()
      }
    }
    // grout lines along bottom + right edge
    g.beginFill(shade(pal.courtyard, 0.38))
    g.drawRect(0, TILE - 2, TILE, 2)
    g.drawRect(TILE - 2, 0, 2, TILE)
    g.endFill()
    variants.push(bake(renderer, g))
  }
  return variants
}

// ─── Dais — Chanakya's raised platform with gold trim ─────────────────────────

export function makeDaisTexture(renderer: IRenderer, pal: ScenePalette): Texture {
  const g = new Graphics()
  const w = TILE * 6
  const h = TILE * 2.5
  // platform body
  g.beginFill(shade(pal.stoneLight, 0.9))
  g.drawRect(0, 0, w, h)
  g.endFill()
  // top surface highlight
  g.beginFill(shade(pal.stoneLight, 1.15))
  g.drawRect(PX, PX, w - PX * 2, h * 0.45)
  g.endFill()
  // gold trim border
  g.beginFill(pal.goldDim)
  g.drawRect(0, 0, w, PX)
  g.drawRect(0, h - PX, w, PX)
  g.drawRect(0, 0, PX, h)
  g.drawRect(w - PX, 0, PX, h)
  g.endFill()
  // front steps
  g.beginFill(shade(pal.stoneLight, 0.7))
  g.drawRect(w * 0.33, h, w * 0.34, PX * 2)
  g.endFill()
  return bake(renderer, g)
}

// ─── Desk — wooden writing desk for the shishyas ──────────────────────────────

export function makeDeskTexture(renderer: IRenderer, pal: ScenePalette): Texture {
  const g = new Graphics()
  const wood = 0x6b4226
  const w = TILE * 1.75
  const h = TILE * 0.75
  // desktop
  g.beginFill(shade(wood, 1.2))
  g.drawRect(0, 0, w, PX * 2)
  g.endFill()
  // body
  g.beginFill(wood)
  g.drawRect(0, PX * 2, w, h - PX * 2)
  g.endFill()
  // legs
  g.beginFill(shade(wood, 0.6))
  g.drawRect(PX, h, PX, PX * 2)
  g.drawRect(w - PX * 2, h, PX, PX * 2)
  g.endFill()
  // a scroll resting on the desk
  g.beginFill(pal.textPrimary)
  g.drawRect(w * 0.55, -PX, PX * 3, PX)
  g.endFill()
  return bake(renderer, g)
}

// ─── Avatar — 8×10 art-pixel pixel person, robe color per agent ───────────────
// T turban · S skin · E eye · R robe · D robe shadow · . empty

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
      g.beginFill(colors[c])
      g.drawRect(x * PX, y * PX, PX, PX)
      g.endFill()
    }
  }
  return bake(renderer, g)
}
