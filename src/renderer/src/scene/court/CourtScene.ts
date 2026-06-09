// Our CSP has script-src 'self' (no unsafe-eval). Pixi normally generates
// batch shaders with `new Function` — this patch makes it work without eval.
// Must be imported before the first Application is constructed.
import '@pixi/unsafe-eval'
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { Avatar } from './Avatar'
import { Camera } from './Camera'
import { LampOverlay } from './LampOverlay'
import { ScrollAnim } from './ScrollAnim'
import { Ambient } from './Ambient'
import { Minimap } from './Minimap'
import { scenePalette, ROBE_COLORS, shade, type ScenePalette } from './palette'
import {
  buildTileGrid, DESK_POSITIONS, overflowSeat, type Seat,
  DESK_OFFSET, LAMP_OFFSET, STOOL_OFFSET,
  TILE, WORLD_W, WORLD_H,
  TREE, ENTRANCE, RANGOLI, PILLARS,
  CHAMBER_WALL, CHANAKYA_SHELF, LIBRARY_SHELVES, DECORATIONS
} from './layout'
import {
  makeTileSet, makeDeskTexture, makeStoolTexture, makeBookshelfTexture,
  makePillarTexture, makeWallTexture, makeManuscriptTexture, makeLampTexture,
  makePotTexture, makeScrollPileTexture, makeStoneMarkTexture, makePlantTexture,
  makeTrunkTexture, makeScrollSpriteTexture, makeAvatarTexture
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

  // render layers, bottom → top
  private floorLayer = new Container()
  private groundLayer = new Container()    // ripples, rangoli
  private furnitureLayer = new Container() // desks, shelves, walls, pillars, trunk, decor
  private avatarLayer = new Container()
  private deskItemLayer = new Container()  // lamps, manuscripts — in front of avatars
  private glowLayer: LampOverlay
  private canopyLayer = new Container()    // tree canopy over everything beneath it
  private uiLayer = new Container()        // scroll flights, torch glows

  private avatars = new Map<string, Avatar>()
  private avatarTextures = new Map<string, Texture>()
  private seats = new Map<string, Seat>()
  private overflowCount = 0

  private scrollAnim: ScrollAnim
  private ambient: Ambient
  private minimap: Minimap
  private agentIds: string[] = []
  private selectedId: string | null = null

  private deskTex: Texture
  private stoolTex: Texture
  private manuscriptTex: Texture
  private lampTex: Texture

  private onSelect: (id: string | null) => void

  constructor(host: HTMLElement, onSelect: (id: string | null) => void) {
    this.onSelect = onSelect
    this.pal = scenePalette()

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

    // shared textures
    const r = this.app.renderer
    this.deskTex = makeDeskTexture(r, this.pal)
    this.stoolTex = makeStoolTexture(r, this.pal)
    this.manuscriptTex = makeManuscriptTexture(r)
    this.lampTex = makeLampTexture(r)

    this.buildFloor()
    this.buildStructures()
    this.buildDecorations()
    this.buildTree()
    this.buildRangoli()
    this.buildSeating()

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
      this.camera.update(dms)
      this.glowLayer.update(dms)
      this.scrollAnim.update(dms)
      this.ambient.update(dms, this.avatars)
    })
  }

  // ─── World construction ──────────────────────────────────────────────────

  private buildFloor(): void {
    const tiles = makeTileSet(this.app.renderer, this.pal)
    const grid = buildTileGrid()
    for (let rIdx = 0; rIdx < grid.length; rIdx++) {
      for (let c = 0; c < grid[rIdx].length; c++) {
        const kind = grid[rIdx][c]
        const variants = tiles[kind]
        const t = new Sprite(variants[(rIdx * 7 + c * 13) % variants.length])
        t.position.set(c * TILE, rIdx * TILE)
        this.floorLayer.addChild(t)
      }
    }
    this.floorLayer.cacheAsBitmap = true
  }

  private buildStructures(): void {
    const r = this.app.renderer

    // chamber low wall
    const wallTex = makeWallTexture(r, this.pal)
    for (const cell of CHAMBER_WALL) {
      const w = new Sprite(wallTex)
      w.position.set(cell.c * TILE, cell.r * TILE + TILE / 2)
      this.furnitureLayer.addChild(w)
    }

    // chanakya's bookshelf (behind his desk)
    const shelfTall = makeBookshelfTexture(r, true)
    const chShelf = new Sprite(shelfTall)
    chShelf.anchor.set(0.5, 1)
    chShelf.position.set(CHANAKYA_SHELF.x, CHANAKYA_SHELF.y + 40)
    this.furnitureLayer.addChild(chShelf)

    // library alcove shelves
    const shelfShort = makeBookshelfTexture(r, false)
    for (let i = 0; i < LIBRARY_SHELVES.length; i++) {
      const s = new Sprite(i === 0 ? shelfTall : shelfShort)
      s.anchor.set(0.5, 1)
      s.position.set(LIBRARY_SHELVES[i].x, LIBRARY_SHELVES[i].y + 50)
      this.furnitureLayer.addChild(s)
    }

    // entrance pillars
    const pillarTex = makePillarTexture(r, this.pal)
    for (const p of PILLARS) {
      const s = new Sprite(pillarTex)
      s.anchor.set(0.5, 1)
      s.position.set(p.x, p.y)
      this.furnitureLayer.addChild(s)
    }
  }

  private buildDecorations(): void {
    const r = this.app.renderer
    const tex = {
      pot: makePotTexture(r),
      scrolls: makeScrollPileTexture(r),
      stone: makeStoneMarkTexture(r, this.pal),
      plant: makePlantTexture(r)
    }
    for (const d of DECORATIONS) {
      const s = new Sprite(tex[d.kind])
      s.anchor.set(0.5, 1)
      s.position.set(d.x, d.y)
      this.furnitureLayer.addChild(s)
    }
  }

  private buildTree(): void {
    // trunk in furniture layer, canopy in its own top layer
    const trunk = new Sprite(makeTrunkTexture(this.app.renderer))
    trunk.anchor.set(0.5, 1)
    trunk.position.set(TREE.x, TREE.y + 24)
    this.furnitureLayer.addChild(trunk)

    const canopy = new Graphics()
    const leaf = 0x2f5a22
    canopy.beginFill(shade(leaf, 0.85))
    canopy.drawCircle(TREE.x - 28, TREE.y - 38, 34)
    canopy.endFill()
    canopy.beginFill(shade(leaf, 0.95))
    canopy.drawCircle(TREE.x + 26, TREE.y - 42, 38)
    canopy.endFill()
    canopy.beginFill(leaf)
    canopy.drawCircle(TREE.x - 4, TREE.y - 62, 40)
    canopy.endFill()
    canopy.beginFill(shade(leaf, 1.25))
    canopy.drawCircle(TREE.x + 8, TREE.y - 74, 24)
    canopy.endFill()
    // highlight pixels
    canopy.beginFill(shade(leaf, 1.5))
    canopy.drawRect(TREE.x - 20, TREE.y - 80, 4, 4)
    canopy.drawRect(TREE.x + 24, TREE.y - 60, 4, 4)
    canopy.drawRect(TREE.x - 40, TREE.y - 44, 4, 4)
    canopy.endFill()
    this.canopyLayer.addChild(canopy)
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

  /** Desks, stools, manuscripts and lamps for the whole cast — built up front
   *  so the court looks furnished even before agents finish loading. */
  private buildSeating(): void {
    const r = this.app.renderer
    const chanakyaDesk = makeDeskTexture(r, this.pal, true)

    for (const [id, seat] of Object.entries(DESK_POSITIONS)) {
      this.seats.set(id, seat)

      const desk = new Sprite(id === 'chanakya' ? chanakyaDesk : this.deskTex)
      desk.anchor.set(0.5, 0)
      desk.position.set(seat.x + DESK_OFFSET.x, seat.y + DESK_OFFSET.y)
      this.furnitureLayer.addChild(desk)

      const stool = new Sprite(this.stoolTex)
      stool.anchor.set(0.5, 1)
      stool.position.set(seat.x + STOOL_OFFSET.x, seat.y + STOOL_OFFSET.y)
      this.furnitureLayer.addChild(stool)

      const manuscript = new Sprite(this.manuscriptTex)
      manuscript.anchor.set(0.5, 0.5)
      manuscript.position.set(seat.x - 8, seat.y + DESK_OFFSET.y + 6)
      this.deskItemLayer.addChild(manuscript)

      const lamp = new Sprite(this.lampTex)
      lamp.anchor.set(0.5, 1)
      lamp.position.set(seat.x + LAMP_OFFSET.x, seat.y + LAMP_OFFSET.y + 4)
      this.deskItemLayer.addChild(lamp)

      this.glowLayer.addLamp(id, seat.x + LAMP_OFFSET.x, seat.y + LAMP_OFFSET.y)
    }
  }

  private seatFor(id: string): Seat {
    let seat = this.seats.get(id)
    if (!seat) {
      seat = overflowSeat(this.overflowCount++)
      this.seats.set(id, seat)
      // late furniture for overflow agents
      const desk = new Sprite(this.deskTex)
      desk.anchor.set(0.5, 0)
      desk.position.set(seat.x + DESK_OFFSET.x, seat.y + DESK_OFFSET.y)
      this.furnitureLayer.addChild(desk)
      this.glowLayer.addLamp(id, seat.x + LAMP_OFFSET.x, seat.y + LAMP_OFFSET.y)
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
        const robe = ROBE_COLORS[agent.id] ?? 0x8c7b6b
        let tex = this.avatarTextures.get(agent.id)
        if (!tex) {
          tex = makeAvatarTexture(this.app.renderer, robe)
          this.avatarTextures.set(agent.id, tex)
        }
        const seat = this.seatFor(agent.id)
        avatar = new Avatar(agent.id, agent.name, tex, this.pal, (id) => this.onSelect(id))
        avatar.position.set(seat.x, seat.y)
        this.avatarLayer.addChild(avatar)
        this.avatars.set(agent.id, avatar)
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
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
    this.avatars.clear()
    this.avatarTextures.clear()
    this.seats.clear()
  }
}
