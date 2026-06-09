import { Container, Graphics } from 'pixi.js'
import { shade } from './palette'

// Character sprites — ancient Indian scholars/strategists, drawn with
// Graphics primitives on a 16×28 one-pixel grid, then scaled ×2 into the
// world (32×56) so detail survives the fit-scale camera.
//
// Shared anatomy, bottom → top:
//   feet/sandals → dhoti (robe body) → uttariya (shawl) → head → hair/turban
// Per-character colors and distinguishing features below.

const SKIN = 0xc8956c
const EYE  = 0x2c1810
const FOOT = 0x3a2417

// 1-art-pixel rect
function p(g: Graphics, color: number, x: number, y: number, w = 1, h = 1): void {
  g.beginFill(color)
  g.drawRect(x, y, w, h)
  g.endFill()
}

interface BodyOpts {
  robe: number
  uttariya: number
  /** vertical shift of the whole figure (+down). Vishnu hunches +2, Chandragupta stands tall -1 */
  dy?: number
  /** forward lean of the torso in px (Nachiketa's eagerness) */
  lean?: number
  /** robe bottom row — Gargi's robe is longer */
  robeBottom?: number
  /** head width (Chanakya is older and more imposing) */
  headW?: number
}

/** Shared anatomy. Returns the head top row so hair/turbans know where to sit. */
function body(g: Graphics, o: BodyOpts): { headTop: number; headLeft: number; headW: number } {
  const dy = o.dy ?? 0
  const lean = o.lean ?? 0
  const robeBottom = o.robeBottom ?? 23
  const headW = o.headW ?? 8
  const headLeft = 8 - Math.floor(headW / 2)

  // feet — sandals, 3px each
  p(g, FOOT, 4, 25 + dy, 3, 2)
  p(g, FOOT, 9, 25 + dy, 3, 2)

  // dhoti — main robe body ~12 wide
  p(g, o.robe, 2 + lean, 14 + dy, 12, robeBottom - 13)
  // robe fold shading
  p(g, shade(o.robe, 0.78), 7 + lean, 15 + dy, 1, robeBottom - 15)

  // uttariya — shawl draped across the upper body, lighter
  p(g, o.uttariya, 3 + lean, 10 + dy, 10, 6)
  p(g, shade(o.uttariya, 0.85), 3 + lean, 14 + dy, 10, 1) // lower drape edge

  // head — rounded rect: core + side columns inset 1px top/bottom
  const ht = 3 + dy
  p(g, SKIN, headLeft + 1, ht, headW - 2, 8)
  p(g, SKIN, headLeft, ht + 1, 1, 6)
  p(g, SKIN, headLeft + headW - 1, ht + 1, 1, 6)

  // face — eyes + nose
  p(g, EYE, headLeft + 2, ht + 3)
  p(g, EYE, headLeft + headW - 3, ht + 3)
  p(g, shade(SKIN, 0.75), headLeft + Math.floor(headW / 2), ht + 4)

  return { headTop: ht, headLeft, headW }
}

// ─── The cast ─────────────────────────────────────────────────────────────────

function chanakya(g: Graphics): void {
  const robe = 0xb8860b      // deep ochre
  const utt  = 0xf5deb3      // pale yellow
  const h = body(g, { robe, uttariya: utt, headW: 9 })

  // uttariya draped asymmetrically — wider on the left
  p(g, utt, 1, 10, 3, 7)
  p(g, shade(utt, 0.85), 1, 16, 3, 1)

  // shaved head with a single sikha — tiny topknot
  p(g, 0x4a2c17, 7, h.headTop - 2, 2, 2)

  // short beard below the chin
  p(g, 0x4a2c17, h.headLeft + 2, h.headTop + 7, h.headW - 4, 1)
  p(g, 0x4a2c17, h.headLeft + 3, h.headTop + 8, h.headW - 6, 1)

  // palm-leaf scroll held at the right side
  p(g, 0xd2b48c, 10, 16, 6, 3)
  p(g, shade(0xd2b48c, 0.7), 10, 17, 6, 1) // leaf line
}

function aaruni(g: Graphics): void {
  const robe = 0xcc5500      // burnt orange
  const utt  = 0xfffdd0      // cream
  const h = body(g, { robe, uttariya: utt })

  // terracotta turban wrap — curved: wide base, narrower crown
  p(g, robe, h.headLeft, h.headTop - 1, h.headW, 2)
  p(g, robe, h.headLeft + 1, h.headTop - 3, h.headW - 2, 2)
  p(g, shade(robe, 0.75), h.headLeft + 2, h.headTop - 1, 1, 1) // wrap fold

  // mud smudges on the lower robe — he blocked the dam with his body
  p(g, 0x5a3a1a, 4, 20)
  p(g, 0x5a3a1a, 5, 22)
  p(g, 0x5a3a1a, 10, 21)
}

function nachiketa(g: Graphics): void {
  const robe = 0x1b3a6b      // deep blue
  const utt  = 0xf8f8f8      // white
  // youngest — slightly smaller (sits lower), eager 1px forward lean
  const h = body(g, { robe, uttariya: utt, dy: 2, lean: 1 })

  // brahmacharya topknot, no turban
  p(g, 0x2c1810, 7, h.headTop - 2, 2, 2)
}

function gargi(g: Graphics): void {
  const robe = 0x8b1a4a      // deep magenta
  const utt  = 0xdaa520      // gold dupatta
  // longer robe — body extends to the feet
  const h = body(g, { robe, uttariya: utt, robeBottom: 25 })

  // dupatta draped diagonally over the left shoulder
  for (let i = 0; i < 6; i++) {
    p(g, utt, 4 + i, 10 + i, 2, 1)
  }

  // hair — dark bun on top
  p(g, EYE, 6, h.headTop - 2, 4, 2)
  p(g, EYE, 7, h.headTop - 3, 2, 1)
  p(g, EYE, h.headLeft, h.headTop, h.headW, 1) // hairline

  // raised hand — the debater's gesture, left side, reaching up
  p(g, SKIN, 1, 9, 2, 2)
  p(g, robe, 1, 11, 2, 4) // sleeve
}

function bharadwaja(g: Graphics): void {
  const robe = 0x2d5a27      // forest green
  const utt  = 0x8b6914      // brown
  const h = body(g, { robe, uttariya: utt })

  // dark green turban wrap
  const tur = 0x1d3a18
  p(g, tur, h.headLeft, h.headTop - 1, h.headW, 2)
  p(g, tur, h.headLeft + 1, h.headTop - 3, h.headW - 2, 2)

  // chisel in the right hand — the builder
  p(g, 0x3a3a3a, 13, 14, 2, 6)
  p(g, 0x6b4226, 13, 13, 2, 2) // wooden grip
}

function chandragupta(g: Graphics): void {
  const robe = 0x8b0000      // royal red
  const utt  = 0xff9933      // saffron
  // warrior build — stands tall, no lean
  const h = body(g, { robe, uttariya: utt, dy: -1 })

  // turban: red base with a saffron stripe
  p(g, 0xa01010, h.headLeft, h.headTop - 1, h.headW, 2)
  p(g, 0xa01010, h.headLeft + 1, h.headTop - 4, h.headW - 2, 2)
  p(g, utt, h.headLeft + 1, h.headTop - 2, h.headW - 2, 1) // stripe
}

function vishnuSharma(g: Graphics): void {
  const robe = 0xf5f5dc      // aged white cloth
  const utt  = 0x8fbc8f      // sage green
  // very old — small hunched body, everything sits 2px lower
  const h = body(g, { robe, uttariya: utt, dy: 2, lean: 1 })

  // hunched back — a raised pixel ridge behind the shoulders
  p(g, robe, 2, 11, 2, 2)
  p(g, shade(robe, 0.8), 2, 12, 2, 1)

  // white topknot of an elder
  p(g, 0xf8f8f8, 7, h.headTop - 2, 2, 2)

  // large palm-leaf book open in front of him
  const leaf = 0xd2b48c
  p(g, leaf, 4, 20, 8, 6)
  p(g, shade(leaf, 0.65), 8, 20, 1, 6)  // spine
  p(g, shade(leaf, 0.8), 5, 22, 3, 1)   // text lines
  p(g, shade(leaf, 0.8), 9, 23, 2, 1)
}

function fallback(g: Graphics, robe: number): void {
  body(g, { robe, uttariya: shade(robe, 1.4) })
}

// ─── Public API ───────────────────────────────────────────────────────────────

const DRAWERS: Record<string, (g: Graphics) => void> = {
  chanakya,
  aaruni,
  nachiketa,
  gargi,
  bharadwaja,
  chandragupta,
  vishnu_sharma: vishnuSharma
}

/**
 * Draw an agent's character sprite into the given container.
 * Origin: bottom-center of the feet (so position = where they stand).
 */
export function drawSprite(agentId: string, container: Container): void {
  const g = new Graphics()
  const draw = DRAWERS[agentId]
  if (draw) draw(g)
  else fallback(g, 0x8c7b6b)
  g.pivot.set(8, 27)
  g.scale.set(2)
  container.addChild(g)
}
