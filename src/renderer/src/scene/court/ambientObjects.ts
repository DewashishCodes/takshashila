import { Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js'
import { shade } from './palette'
import {
  buildTileGrid, DESK_POSITIONS, DECORATIONS, PILLARS, LIBRARY_SHELVES,
  TREE, RANGOLI, KUND_CENTER, TILE, COLS, ROWS
} from './layout'

// Ambient content for the empty zones of the court. Pure scenery + read-only
// reactions — never writes to Sabha/PTY/agent state.
//
// Zone 1: gurukul teaching circle under the banyan tree (+ floating shlokas)
// Zone 2: Arthashastra inscription wall (clickable → window CustomEvent)
// Zone 3: debate pit with a lotus mandala that pulses when work begins
// Zone 4: seeded scatter of pots / scroll piles / stone markers / torches

export interface CourtLayout {
  groundLayer: Container
  furnitureLayer: Container
  uiLayer: Container
  ticker: Ticker
  addCleanup: (fn: () => void) => void
}

const GOLD = 0xf4c430

// ─── Shared helpers ───────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function p1(g: Graphics, color: number, x: number, y: number, w = 1, h = 1): void {
  g.beginFill(color)
  g.drawRect(x, y, w, h)
  g.endFill()
}

// ─── Zone 1 — Teaching circle ─────────────────────────────────────────────────

const SHLOKAS = [
  '॥ विद्या ददाति विनयम् ॥',
  '॥ योगः कर्मसु कौशलम् ॥',
  '॥ सत्यमेव जयते ॥',
  '॥ तमसो मा ज्योतिर्गमय ॥'
]

const STUDENT_DHOTIS = [0x9a8a6a, 0x7a8a9a, 0x9a7a6a, 0x8a9a7a, 0x8a7a9a]

function drawStudent(dhoti: number): Graphics {
  // simple seated figure, 8×14 one-px grid, no face detail — ambient NPC
  const g = new Graphics()
  const skin = 0xc8956c
  p1(g, skin, 2, 0, 4, 4)                  // head
  p1(g, 0x2c1810, 3, -1, 2, 1)             // hair
  p1(g, dhoti, 1, 4, 6, 5)                 // dhoti
  p1(g, shade(dhoti, 0.8), 3, 5, 1, 4)     // fold
  p1(g, dhoti, 0, 9, 8, 3)                 // crossed legs
  p1(g, shade(dhoti, 0.7), 0, 11, 8, 1)    // ground shadow line
  g.pivot.set(4, 12)
  g.scale.set(2)
  return g
}

interface ShlokaState {
  text: Text
  phase: 'hidden' | 'in' | 'hold' | 'out'
  t: number
  wait: number
  index: number
  rnd: () => number
}

function initTeachingCircle(layout: CourtLayout): ShlokaState {
  // semicircle of students below the tree, facing it
  const angles = [20, 60, 100, 140, 180] // degrees, lower half (+y is down)
  const radius = 62
  for (let i = 0; i < angles.length; i++) {
    const a = (angles[i] * Math.PI) / 180
    const x = TREE.x + Math.cos(a) * radius
    const y = TREE.y + 18 + Math.sin(a) * radius * 0.7
    const student = drawStudent(STUDENT_DHOTIS[i % STUDENT_DHOTIS.length])
    student.position.set(x, y)
    layout.furnitureLayer.addChild(student)

    // slate tablet in front of each student, toward the tree
    const tx = TREE.x - x
    const ty = TREE.y - y
    const len = Math.hypot(tx, ty) || 1
    const slate = new Graphics()
    p1(slate, 0x4a4a4a, 0, 0, 8, 6)
    p1(slate, 0x3a3a3a, 1, 1, 6, 4)
    slate.pivot.set(4, 3)
    slate.position.set(x + (tx / len) * 16, y + (ty / len) * 12)
    layout.groundLayer.addChild(slate)
  }

  // floating shloka above the canopy
  const text = new Text('', new TextStyle({
    // Press Start 2P has no Devanagari glyphs — canvas falls back to Noto Sans
    fontFamily: '"Press Start 2P", "Noto Sans", sans-serif',
    fontSize: 7,
    fill: GOLD
  }))
  text.resolution = 2
  text.anchor.set(0.5, 1)
  text.position.set(TREE.x, TREE.y - 126)
  text.alpha = 0
  layout.uiLayer.addChild(text)

  const rnd = mulberry32(4242)
  return { text, phase: 'hidden', t: 0, wait: 6000 + rnd() * 8000, index: 0, rnd }
}

function tickShloka(s: ShlokaState, deltaMS: number): void {
  s.t += deltaMS
  switch (s.phase) {
    case 'hidden':
      if (s.t >= s.wait) {
        s.text.text = SHLOKAS[s.index % SHLOKAS.length]
        s.index++
        s.phase = 'in'; s.t = 0
      }
      break
    case 'in': {
      const k = Math.min(1, s.t / 500)
      s.text.alpha = 0.7 * k
      if (k >= 1) { s.phase = 'hold'; s.t = 0 }
      break
    }
    case 'hold':
      if (s.t >= 2000) { s.phase = 'out'; s.t = 0 }
      break
    case 'out': {
      const k = Math.min(1, s.t / 500)
      s.text.alpha = 0.7 * (1 - k)
      if (k >= 1) {
        s.phase = 'hidden'; s.t = 0
        s.wait = 12000 + s.rnd() * 8000 // 12–20s until the next one
      }
      break
    }
  }
}

// ─── Zone 2 — Arthashastra inscription wall ───────────────────────────────────

const WALL_RECT = { x: 1010, y: 210, w: 170, h: 220 } // world px

function initArthashastraWall(layout: CourtLayout): void {
  const root = new Container()

  // shadow, offset bottom-right
  const shadow = new Graphics()
  shadow.beginFill(0x000000, 0.35)
  shadow.drawRect(WALL_RECT.x + 4, WALL_RECT.y + 4, WALL_RECT.w, WALL_RECT.h)
  shadow.endFill()
  root.addChild(shadow)

  // stone: dark border + lighter center
  const stone = new Graphics()
  stone.beginFill(0x3d2314)
  stone.drawRect(WALL_RECT.x, WALL_RECT.y, WALL_RECT.w, WALL_RECT.h)
  stone.endFill()
  stone.beginFill(0x5c4a2a)
  stone.drawRect(WALL_RECT.x + 4, WALL_RECT.y + 4, WALL_RECT.w - 8, WALL_RECT.h - 8)
  stone.endFill()
  root.addChild(stone)

  // etched text
  const lines: Array<{ str: string; deva?: boolean }> = [
    { str: 'ARTHASHASTRA' },
    { str: 'अर्थशास्त्र', deva: true },
    { str: '' }, // divider row drawn below
    { str: 'Book I · On Training' },
    { str: 'Book II · On Revenue' },
    { str: 'Book III · On Law' },
    { str: 'Book IV · On Order' },
    { str: 'Book V · On Conduct' }
  ]
  const cx = WALL_RECT.x + WALL_RECT.w / 2
  let y = WALL_RECT.y + 22
  for (const line of lines) {
    if (line.str === '') {
      // decorative divider — row of diamond pixels
      const div = new Graphics()
      for (let i = -3; i <= 3; i++) {
        div.beginFill(GOLD, 0.3)
        div.moveTo(cx + i * 14, y - 3)
        div.lineTo(cx + i * 14 + 3, y)
        div.lineTo(cx + i * 14, y + 3)
        div.lineTo(cx + i * 14 - 3, y)
        div.closePath()
        div.endFill()
      }
      root.addChild(div)
      y += 22
      continue
    }
    const t = new Text(line.str, new TextStyle({
      fontFamily: line.deva
        ? '"Noto Sans", sans-serif'
        : '"Press Start 2P", "Noto Sans", sans-serif',
      fontSize: line.deva ? 9 : 6,
      fill: GOLD
    }))
    t.alpha = 0.3
    t.resolution = 2
    t.anchor.set(0.5, 0)
    t.position.set(cx, y)
    root.addChild(t)
    y += line.deva ? 24 : 22
  }

  // cracks across the face
  const cracks = new Graphics()
  cracks.lineStyle(1, 0x2c1810, 0.4)
  cracks.moveTo(WALL_RECT.x + 18, WALL_RECT.y + 30)
  cracks.lineTo(WALL_RECT.x + 44, WALL_RECT.y + 74)
  cracks.lineTo(WALL_RECT.x + 38, WALL_RECT.y + 102)
  cracks.moveTo(WALL_RECT.x + WALL_RECT.w - 22, WALL_RECT.y + 140)
  cracks.lineTo(WALL_RECT.x + WALL_RECT.w - 52, WALL_RECT.y + 182)
  cracks.moveTo(WALL_RECT.x + 60, WALL_RECT.y + WALL_RECT.h - 26)
  cracks.lineTo(WALL_RECT.x + 88, WALL_RECT.y + WALL_RECT.h - 54)
  root.addChild(cracks)

  // clickable — surfaces a window event the React layer can pick up later
  root.eventMode = 'static'
  root.cursor = 'pointer'
  root.on('pointertap', () => {
    window.dispatchEvent(new CustomEvent('takshashila:scene', {
      detail: { event: 'ARTHASHASTRA_CLICKED' }
    }))
  })

  layout.groundLayer.addChild(root)
}

// ─── Zone 3 — Debate pit ──────────────────────────────────────────────────────

const PIT = { x: 608, y: 638, r: 30 }

interface LotusState {
  lotus: Container
  pulseT: number // -1 = idle
}

function initDebatePit(layout: CourtLayout): LotusState {
  // circular stone platform: darker ring, lighter center
  const platform = new Graphics()
  platform.beginFill(shade(0x8b6914, 0.4))
  platform.drawCircle(PIT.x, PIT.y, PIT.r)
  platform.endFill()
  platform.beginFill(shade(0x8b6914, 0.62))
  platform.drawCircle(PIT.x, PIT.y, PIT.r - 5)
  platform.endFill()
  layout.groundLayer.addChild(platform)

  // two podiums facing each other across the center
  for (const side of [-1, 1]) {
    const pod = new Graphics()
    const px0 = PIT.x + side * (PIT.r - 8)
    p1(pod, shade(0x5c3d1e, 1.2), 0, 0, 8, 3)   // top
    p1(pod, 0x5c3d1e, 1, 3, 6, 9)               // column
    p1(pod, shade(0x5c3d1e, 0.7), 1, 11, 6, 1)  // base shadow
    pod.pivot.set(4, 12)
    pod.position.set(px0, PIT.y + 4)
    layout.furnitureLayer.addChild(pod)
  }

  // lotus mandala — 8 petals rotated around the center
  const lotus = new Container()
  for (let i = 0; i < 8; i++) {
    const petal = new Graphics()
    petal.beginFill(GOLD)
    petal.drawEllipse(0, -9, 3.5, 9)
    petal.endFill()
    petal.rotation = (i / 8) * Math.PI * 2
    lotus.addChild(petal)
  }
  const core = new Graphics()
  core.beginFill(GOLD)
  core.drawCircle(0, 0, 3)
  core.endFill()
  lotus.addChild(core)
  lotus.alpha = 0.2
  lotus.position.set(PIT.x, PIT.y)
  layout.groundLayer.addChild(lotus)

  const state: LotusState = { lotus, pulseT: -1 }

  // pulse once whenever any agent starts working — read-only subscription
  const unsub = window.takshashila.sabha.onAvashtaChange((update) => {
    if (update.avastha === 'working') state.pulseT = 0
  })
  layout.addCleanup(unsub)

  return state
}

function tickLotus(s: LotusState, deltaMS: number): void {
  if (s.pulseT < 0) return
  s.pulseT += deltaMS
  const k = Math.min(1, s.pulseT / 600)
  s.lotus.scale.set(1 + 0.2 * Math.sin(k * Math.PI)) // 1 → 1.2 → 1
  if (k >= 1) { s.pulseT = -1; s.lotus.scale.set(1) }
}

// ─── Zone 4 — Seeded ambient scatter ──────────────────────────────────────────

interface Torch { flame: Graphics; t: number; shape: boolean }

function makePotCluster(rnd: () => number): Graphics {
  const g = new Graphics()
  const clay = 0x8b4513
  const n = 2 + Math.floor(rnd() * 2)
  for (let i = 0; i < n; i++) {
    const r = 4 + rnd() * 2
    const ox = i * 8 - (n - 1) * 4
    const tall = i === 0 ? 3 : 0 // first pot slightly taller
    g.beginFill(shade(clay, 0.9 + rnd() * 0.2))
    g.drawEllipse(ox, -r - tall, r, r + tall)
    g.endFill()
    g.beginFill(shade(clay, 0.6))
    g.drawEllipse(ox, -r * 2 - tall + 1, r * 0.5, 1.5) // rim
    g.endFill()
  }
  return g
}

function makeScrollPile(rnd: () => number): Container {
  const c = new Container()
  const n = 2 + Math.floor(rnd() * 2)
  for (let i = 0; i < n; i++) {
    const s = new Graphics()
    s.beginFill(i % 2 === 0 ? 0xd2b48c : 0xe8dcb8)
    s.drawRect(-3, -2, 6, 4)
    s.endFill()
    s.rotation = (rnd() - 0.5) * 0.5
    s.position.set((rnd() - 0.5) * 5, -i * 3)
    c.addChild(s)
  }
  return c
}

function makeStoneMarker(rnd: () => number): Graphics {
  const g = new Graphics()
  const base = shade(0x8b6914, 0.42)
  g.beginFill(base)
  g.drawRect(-8, -16, 16, 16)
  g.endFill()
  g.lineStyle(1, 0x2c1810, 0.7)
  if (rnd() < 0.5) {
    g.moveTo(-4, -8); g.lineTo(4, -8)   // carved cross
    g.moveTo(0, -12); g.lineTo(0, -4)
  } else {
    g.drawCircle(0, -8, 4)              // carved circle
  }
  return g
}

function makeTorchBracket(): { c: Container; flame: Graphics } {
  const c = new Container()
  const bracket = new Graphics()
  p1(bracket, 0x4a4a4a, 0, 0, 2, 6)  // vertical iron
  p1(bracket, 0x4a4a4a, 0, 0, 5, 2)  // horizontal arm
  bracket.pivot.set(2, 6)
  c.addChild(bracket)
  const flame = new Graphics()
  flame.position.set(2, -8)
  c.addChild(flame)
  return { c, flame }
}

function drawFlame(flame: Graphics, shape: boolean): void {
  flame.clear()
  if (shape) {
    p1(flame, 0xffb340, -1, 0, 2, 3)
    p1(flame, 0xffd700, -1, -1, 1, 1)
  } else {
    p1(flame, 0xffb340, -1.5, 1, 3, 2)
    p1(flame, 0xffd700, 0, -1, 1, 2)
  }
}

function initScatter(layout: CourtLayout): Torch[] {
  const rnd = mulberry32(42)
  const grid = buildTileGrid()
  const torches: Torch[] = []

  // everything an object must keep distance from (world px)
  const occupied: Array<{ x: number; y: number }> = [
    ...Object.values(DESK_POSITIONS),
    ...DECORATIONS,
    ...PILLARS,
    ...LIBRARY_SHELVES,
    TREE, KUND_CENTER, RANGOLI,
    { x: PIT.x, y: PIT.y },
    { x: 608, y: 776 } // entrance
  ]
  const MIN_D = TILE * 2

  const isFree = (x: number, y: number): boolean => {
    // named zone rects
    if (x > WALL_RECT.x - 40 && x < WALL_RECT.x + WALL_RECT.w + 20 &&
        y > WALL_RECT.y - 20 && y < WALL_RECT.y + WALL_RECT.h + 20) return false
    if (Math.hypot(x - TREE.x, y - TREE.y) < 110) return false        // teaching circle
    if (Math.hypot(x - PIT.x, y - PIT.y) < 70) return false
    if (x > 26 * TILE && y < 8 * TILE) return false                   // chamber interior
    for (const o of occupied) {
      if (Math.hypot(x - o.x, y - o.y) < MIN_D) return false
    }
    return true
  }

  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      const kind = grid[r][c]
      const isFloor = kind === 'f0' || kind === 'f1' || kind === 'f2' || kind === 'f3'
      const isEdge = r === 1 || r === ROWS - 2 || c === 1 || c === COLS - 2

      const x = c * TILE + TILE / 2
      const y = r * TILE + TILE / 2

      // torch brackets only on perimeter-adjacent tiles
      if (isEdge && isFloor && rnd() < 0.05 && isFree(x, y)) {
        const { c: torch, flame } = makeTorchBracket()
        torch.position.set(x, y)
        layout.furnitureLayer.addChild(torch)
        const t: Torch = { flame, t: rnd() * 150, shape: rnd() < 0.5 }
        drawFlame(flame, t.shape)
        torches.push(t)
        continue
      }

      if (!isFloor || isEdge) continue
      if (rnd() >= 0.08) continue // ~1 object per 3 empty tile-areas
      if (!isFree(x, y)) continue

      const roll = rnd()
      if (roll < 0.34) {
        const pot = makePotCluster(rnd)
        pot.position.set(x, y)
        layout.furnitureLayer.addChild(pot)
      } else if (roll < 0.67) {
        const pile = makeScrollPile(rnd)
        pile.position.set(x, y)
        layout.furnitureLayer.addChild(pile)
      } else {
        const marker = makeStoneMarker(rnd)
        marker.position.set(x, y + 8)
        layout.groundLayer.addChild(marker)
      }
    }
  }

  return torches
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function initAmbientObjects(stage: Container, layout: CourtLayout): void {
  void stage // layers come from `layout`; param kept for the documented signature

  const shloka = initTeachingCircle(layout)
  initArthashastraWall(layout)
  const lotus = initDebatePit(layout)
  const torches = initScatter(layout)

  layout.ticker.add(() => {
    const dms = layout.ticker.deltaMS
    tickShloka(shloka, dms)
    tickLotus(lotus, dms)
    for (const torch of torches) {
      torch.t += dms
      if (torch.t >= 150) {
        torch.t = 0
        torch.shape = !torch.shape
        drawFlame(torch.flame, torch.shape)
      }
    }
  })
}
