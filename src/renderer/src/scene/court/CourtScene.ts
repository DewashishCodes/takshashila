// Our CSP has script-src 'self' (no unsafe-eval). Pixi normally generates
// batch shaders with `new Function` — this patch makes it work without eval.
// Must be imported before the first Application is constructed.
import '@pixi/unsafe-eval'
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { Avatar } from './Avatar'
import { Walker } from './Walk'
import { Camera } from './Camera'
import { LampOverlay } from './LampOverlay'
import { ScrollAnim } from './ScrollAnim'
import { Ambient } from './Ambient'
import { Minimap } from './Minimap'
import { initAmbientObjects } from './ambientObjects'
import { scenePalette, type ScenePalette } from './palette'
import type { CourtAssets, PlantName } from './assets'
import {
  buildTileGrid, DESK_POSITIONS, overflowSeat, type Seat,
  DESK_OFFSET, LAMP_OFFSET,
  TILE, WORLD_W, WORLD_H,
  TREE, ENTRANCE, KUND_CENTER, RANGOLI, PILLARS,
  CHAMBER_WALL, CHANAKYA_SHELF, LIBRARY_SHELVES, DECORATIONS
} from './layout'
import {
  makeManuscriptTexture, makeLampTexture, makeScrollPileTexture,
  makeScrollSpriteTexture
} from './textures'

interface SceneAgent {
  id: string
  name: string
  avastha: string
}

export class CourtScene {
  private app: Application
  private world: Container
  private camera: Camera
  private pal: ScenePalette
  private assets: CourtAssets

  // render layers, bottom → top
  private floorLayer = new Container()
  private groundLayer = new Container()    // ripples, rangoli
  private furnitureLayer = new Container() // desks, shelves, walls, pillars, decor
  private avatarLayer = new Container()
  private deskItemLayer = new Container()  // lamps, manuscripts — in front of avatars
  private glowLayer: LampOverlay
  private canopyLayer = new Container()    // tree canopy over everything beneath it
  private uiLayer = new Container()        // scroll flights, torch glows

  private avatars = new Map<string, Avatar>()
  private seats = new Map<string, Seat>()
  private overflowCount = 0
  private elapsed = 0
  private cleanups: Array<() => void> = []

  private scrollAnim: ScrollAnim
  private ambient: Ambient
  private minimap: Minimap
  private walker: Walker
  private spawnCount = 0
  private agentIds: string[] = []
  private selectedId: string | null = null

  private manuscriptTex: Texture
  private lampTex: Texture

  private onSelect: (id: string | null) => void

  constructor(host: HTMLElement, onSelect: (id: string | null) => void, assets: CourtAssets) {
    this.onSelect = onSelect
    this.pal = scenePalette()
    this.assets = assets

    this.app = new Application({
      background: this.pal.stone,
      antialias: false,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      resizeTo: host
    })
    host.appendChild(this.app.view as HTMLCanvasElement)

    this.world = new Container()
    this.app.stage.addChild(this.world)

    this.glowLayer = new LampOverlay()
    this.world.addChild(
      this.floorLayer, this.groundLayer, this.furnitureLayer,
      this.avatarLayer, this.deskItemLayer, this.glowLayer,
      this.canopyLayer, this.uiLayer
    )

    // small shared textures that stay procedural (tiny, glow-coupled)
    const r = this.app.renderer
    this.manuscriptTex = makeManuscriptTexture(r)
    this.lampTex = makeLampTexture(r)

    this.buildFloor()
    this.buildStructures()
    this.buildDecorations()
    this.buildTree()
    this.buildKund()
    this.buildRangoli()
    this.buildSeating()
    this.walker = new Walker(this.seats)
    this.avatarLayer.sortableChildren = true // y-sort while agents walk past each other

    // ambient zones: teaching circle, inscription wall, debate pit, scatter
    initAmbientObjects(this.world, {
      groundLayer: this.groundLayer,
      furnitureLayer: this.furnitureLayer,
      uiLayer: this.uiLayer,
      ticker: this.app.ticker,
      addCleanup: (fn) => this.cleanups.push(fn)
    })

    this.scrollAnim = new ScrollAnim(makeScrollSpriteTexture(r))
    this.uiLayer.addChild(this.scrollAnim)

    this.ambient = new Ambient(this.groundLayer, this.canopyLayer, this.uiLayer)

    this.minimap = new Minimap()
    this.app.stage.addChild(this.minimap)

    // camera
    this.camera = new Camera(this.world, WORLD_W, WORLD_H)
    this.camera.attach(this.app.stage, this.app.view as HTMLCanvasElement)
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('pointertap', (e) => {
      if (e.target === this.app.stage) this.onSelect(null)
    })

    this.app.renderer.on('resize', (w: number, h: number) => {
      this.camera.resize(w, h)
      this.minimap.place(h)
    })
    this.camera.resize(this.app.screen.width, this.app.screen.height)
    this.minimap.place(this.app.screen.height)

    // load sequence: tight on the entrance, slow pan up to the full court
    this.camera.intro(ENTRANCE.x, ENTRANCE.y)

    // master ticker
    this.app.ticker.add(() => {
      const dms = this.app.ticker.deltaMS
      this.elapsed += dms
      this.camera.update(dms)
      this.glowLayer.update(dms)
      this.scrollAnim.update(dms)
      this.ambient.update(dms, this.avatars)
      this.walker.update(dms, this.avatars)
      let i = 0
      for (const avatar of this.avatars.values()) {
        avatar.tick(this.elapsed, i++)
        avatar.zIndex = avatar.y
      }
    })
  }

  // ─── World construction ──────────────────────────────────────────────────

  private buildFloor(): void {
    const grid = buildTileGrid()
    for (let rIdx = 0; rIdx < grid.length; rIdx++) {
      for (let c = 0; c < grid[rIdx].length; c++) {
        const kind = grid[rIdx][c]
        const variants = this.assets.tiles[kind]
        const t = new Sprite(variants[(rIdx * 7 + c * 13) % variants.length])
        t.position.set(c * TILE, rIdx * TILE)
        if (kind === 'platform') t.tint = this.assets.platformTint
        if (kind === 'border') t.tint = 0xb0a898
        this.floorLayer.addChild(t)
      }
    }
    this.floorLayer.cacheAsBitmap = true
  }

  private buildStructures(): void {
    // chamber low wall — stone cap + brick face, base on the cell row
    for (const cell of CHAMBER_WALL) {
      const w = new Sprite(this.assets.wallSegment)
      w.anchor.set(0, 1)
      w.position.set(cell.c * TILE, cell.r * TILE + TILE)
      this.furnitureLayer.addChild(w)
    }

    // chanakya's shelf (behind his desk) + library alcove shelves
    const shelfSpots = [CHANAKYA_SHELF, ...LIBRARY_SHELVES]
    for (const spot of shelfSpots) {
      const s = new Sprite(this.assets.props.cabinet)
      s.anchor.set(0.5, 1)
      s.scale.set(1.2)
      s.position.set(spot.x, spot.y + 50)
      this.furnitureLayer.addChild(s)
    }

    // entrance: standing shrines flank the gap, stone arch over it
    for (const p of PILLARS) {
      const s = new Sprite(this.assets.props.shrine)
      s.anchor.set(0.5, 1)
      s.position.set(p.x, p.y)
      this.furnitureLayer.addChild(s)
    }
    const arch = new Sprite(this.assets.arch)
    arch.anchor.set(0.5, 1)
    arch.scale.set(1.4)
    arch.position.set(ENTRANCE.x, ENTRANCE.y + 24)
    this.canopyLayer.addChild(arch) // agents/scrolls pass under it
  }

  private buildDecorations(): void {
    // deterministic variety: cycle through textures per decor kind
    const variants: Record<string, Texture[]> = {
      pot: [this.assets.props.vase, this.assets.props.pot, this.assets.props.jug, this.assets.props.barrel],
      scrolls: [makeScrollPileTexture(this.app.renderer), this.assets.props.chest],
      stone: [this.assets.props.rock, this.assets.props.cairn, this.assets.props.gravestone, this.assets.props.signpost],
      plant: (['bush1', 'bush2', 'bush3', 'bush4'] as PlantName[]).map((b) => this.assets.plants[b])
    }
    const trees = [this.assets.plants.tree1, this.assets.plants.tree3]
    const counters: Record<string, number> = { pot: 0, scrolls: 0, stone: 0, plant: 0, tree: 0 }
    for (const d of DECORATIONS) {
      if (d.kind === 'tree') {
        const t = new Sprite(trees[counters.tree++ % trees.length])
        t.anchor.set(0.5, 1)
        t.scale.set(1.2)
        t.position.set(d.x, d.y + 12)
        this.canopyLayer.addChild(t) // agents pass under the crown
        continue
      }
      const list = variants[d.kind]
      const s = new Sprite(list[counters[d.kind]++ % list.length])
      s.anchor.set(0.5, 1)
      s.position.set(d.x, d.y)
      this.furnitureLayer.addChild(s)
    }

    // grass tufts scattered over the grass patches (pure ground detail)
    const tufts = (['tuft1', 'tuft2', 'tuft3', 'tuft4'] as PlantName[])
      .map((t) => this.assets.plants[t])
    const grid = buildTileGrid()
    let n = 0
    for (let rIdx = 0; rIdx < grid.length; rIdx++) {
      for (let c = 0; c < grid[rIdx].length; c++) {
        if (grid[rIdx][c] !== 'grass') continue
        if (((rIdx * 31 + c * 17) % 10) > 3) continue // ~40% of grass tiles
        const s = new Sprite(tufts[n++ % tufts.length])
        s.position.set(c * TILE, rIdx * TILE)
        this.groundLayer.addChild(s)
      }
    }
  }

  private buildTree(): void {
    // one full tree — canopy layer so agents pass beneath its crown
    const tree = new Sprite(this.assets.plants.tree2)
    tree.anchor.set(0.5, 1)
    tree.scale.set(1.5)
    tree.position.set(TREE.x, TREE.y + 28)
    this.canopyLayer.addChild(tree)
  }

  private buildKund(): void {
    // the sacred pool is a round stone fountain from the props sheet
    const fountain = new Sprite(this.assets.props.fountain)
    fountain.anchor.set(0.5, 0.55)
    fountain.position.set(KUND_CENTER.x, KUND_CENTER.y)
    this.furnitureLayer.addChild(fountain)

    // water in the basin — the Ambient ripples play over this (uiLayer)
    const water = new Graphics()
    water.beginFill(0x2e5f7a, 0.75)
    water.drawEllipse(KUND_CENTER.x, KUND_CENTER.y + 2, 34, 18)
    water.endFill()
    water.beginFill(0x9fd0e8, 0.35) // glints
    water.drawRect(KUND_CENTER.x - 14, KUND_CENTER.y - 4, 6, 2)
    water.drawRect(KUND_CENTER.x + 6, KUND_CENTER.y + 6, 8, 2)
    water.endFill()
    this.furnitureLayer.addChild(water)

    // a praying statue watches over the water
    const statue = new Sprite(this.assets.props.statue)
    statue.anchor.set(0.5, 1)
    statue.position.set(KUND_CENTER.x, KUND_CENTER.y - 52)
    this.furnitureLayer.addChild(statue)
  }

  private buildRangoli(): void {
    const g = new Graphics()
    const colors = [this.pal.gold, this.pal.terracotta, 0xe8dcb8, 0x4a7c59]
    // diamond rings of pixel dots
    for (let ring = 1; ring <= 3; ring++) {
      const c = colors[ring % colors.length]
      const rPx = ring * 7
      for (let i = 0; i < ring * 4; i++) {
        const a = (i / (ring * 4)) * Math.PI * 2
        // diamond metric: |cos|+|sin| normalized
        const dx = Math.cos(a)
        const dy = Math.sin(a)
        const norm = Math.abs(dx) + Math.abs(dy)
        g.beginFill(c)
        g.drawRect(RANGOLI.x + (dx / norm) * rPx - 1, RANGOLI.y + (dy / norm) * rPx * 0.7 - 1, 2.5, 2.5)
        g.endFill()
      }
    }
    g.beginFill(colors[0])
    g.drawRect(RANGOLI.x - 1.5, RANGOLI.y - 1.5, 3, 3)
    g.endFill()
    this.groundLayer.addChild(g)
  }

  /** Desks, manuscripts and lamps for the whole cast — built up front
   *  so the court looks furnished even before agents finish loading. */
  private buildSeating(): void {
    for (const [id, seat] of Object.entries(DESK_POSITIONS)) {
      this.seats.set(id, seat)
      this.placeDeskFurniture(id, seat)
    }
  }

  private placeDeskFurniture(id: string, seat: Seat): void {
    const desk = new Sprite(id === 'chanakya' ? this.assets.props.altar : this.assets.props.bench)
    desk.anchor.set(0.5, 0)
    desk.position.set(seat.x + DESK_OFFSET.x, seat.y + DESK_OFFSET.y)
    this.furnitureLayer.addChild(desk)

    const manuscript = new Sprite(this.manuscriptTex)
    manuscript.anchor.set(0.5, 0.5)
    manuscript.position.set(seat.x - 8, seat.y + DESK_OFFSET.y + 10)
    this.deskItemLayer.addChild(manuscript)

    const lamp = new Sprite(this.lampTex)
    lamp.anchor.set(0.5, 1)
    lamp.position.set(seat.x + LAMP_OFFSET.x, seat.y + LAMP_OFFSET.y + 4)
    this.deskItemLayer.addChild(lamp)

    this.glowLayer.addLamp(id, seat.x + LAMP_OFFSET.x, seat.y + LAMP_OFFSET.y)
  }

  private seatFor(id: string): Seat {
    let seat = this.seats.get(id)
    if (!seat) {
      seat = overflowSeat(this.overflowCount++)
      this.seats.set(id, seat)
      this.placeDeskFurniture(id, seat) // late furniture for overflow agents
    }
    return seat
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Create/update avatars seated at their desks. Idempotent. */
  updateAgents(agents: SceneAgent[]): void {
    this.agentIds = agents.map((a) => a.id)
    for (const agent of agents) {
      let avatar = this.avatars.get(agent.id)
      if (!avatar) {
        const seat = this.seatFor(agent.id)
        avatar = new Avatar(agent.id, agent.name, this.pal, this.assets, (id) => this.onSelect(id))
        this.avatarLayer.addChild(avatar)
        this.avatars.set(agent.id, avatar)
        // the master is already seated; shishyas walk in through the gate
        if (agent.id === 'chanakya') avatar.position.set(seat.x, seat.y)
        else this.walker.enterFromGate(avatar, seat, this.spawnCount++)
      }
      avatar.setAvastha(agent.avastha)
      this.glowLayer.setAvastha(agent.id, agent.avastha)
    }
    this.minimap.updateAgents(this.agentIds, this.selectedId)
  }

  /** Select + smooth pan to the agent's desk */
  setSelected(id: string | null): void {
    this.selectedId = id
    for (const [aid, avatar] of this.avatars) {
      avatar.setSelected(aid === id)
    }
    if (id) {
      const seat = this.seats.get(id)
      if (seat) this.camera.panTo(seat.x, seat.y, 400)
    }
    this.minimap.updateAgents(this.agentIds, id)
  }

  /** Fly a sandesh scroll between two agents ('samrat' = the entrance) */
  playScroll(fromId: string, toId: string): void {
    const from = fromId === 'samrat' ? ENTRANCE : this.seats.get(fromId)
    const to = toId === 'samrat' ? ENTRANCE : this.seats.get(toId)
    if (!from || !to) return
    this.scrollAnim.play(
      from.x + LAMP_OFFSET.x, from.y + LAMP_OFFSET.y - 8,
      to.x + LAMP_OFFSET.x, to.y + LAMP_OFFSET.y - 8
    )
  }

  destroy(): void {
    for (const fn of this.cleanups) { try { fn() } catch { /* already gone */ } }
    this.cleanups = []
    // children only — the base textures live in the shared Assets cache and
    // must survive a React remount (StrictMode mounts the scene twice in dev)
    this.app.destroy(true, { children: true })
    this.avatars.clear()
    this.seats.clear()
  }
}
