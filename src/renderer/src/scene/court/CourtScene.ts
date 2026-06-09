import { Application, Container, Sprite, Texture } from 'pixi.js'
import { Avatar } from './Avatar'
import { Camera } from './Camera'
import { scenePalette, ROBE_COLORS, type ScenePalette } from './palette'
import { makeFloorTextures, makeDaisTexture, makeDeskTexture, makeAvatarTexture, TILE } from './textures'

interface SceneAgent {
  id: string
  name: string
  avastha: string
}

// World layout — fixed positions for the cast. Chanakya presides from the
// dais at the top; six shishyas sit at desks in an arc facing him.
const WORLD_W = 1216
const WORLD_H = 800

const POSITIONS: Record<string, { x: number; y: number }> = {
  chanakya:      { x: 608, y: 230 },
  aaruni:        { x: 200, y: 470 },
  nachiketa:     { x: 360, y: 530 },
  gargi:         { x: 520, y: 560 },
  bharadwaja:    { x: 696, y: 560 },
  chandragupta:  { x: 856, y: 530 },
  vishnu_sharma: { x: 1016, y: 470 }
}

// Fallback spots for agents added later (M8 Add Shishya flow)
const OVERFLOW_Y = 700
let overflowIndex = 0
function positionFor(id: string): { x: number; y: number } {
  if (POSITIONS[id]) return POSITIONS[id]
  overflowIndex += 1
  return { x: 150 + overflowIndex * 160, y: OVERFLOW_Y }
}

export class CourtScene {
  private app: Application
  private world: Container
  private camera: Camera
  private pal: ScenePalette
  private avatars = new Map<string, Avatar>()
  private avatarTextures = new Map<string, Texture>()
  private deskTexture: Texture
  private onSelect: (id: string | null) => void
  private fitted = false

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

    this.buildFloor()
    this.deskTexture = makeDeskTexture(this.app.renderer, this.pal)

    // dais behind Chanakya
    const dais = new Sprite(makeDaisTexture(this.app.renderer, this.pal))
    dais.anchor.set(0.5, 0.5)
    dais.position.set(POSITIONS.chanakya.x, POSITIONS.chanakya.y - 4)
    this.world.addChild(dais)

    this.camera = new Camera(this.world, WORLD_W, WORLD_H)
    this.camera.attach(this.app.stage, this.app.view as HTMLCanvasElement)

    // tap on empty floor clears selection
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('pointertap', (e) => {
      if (e.target === this.app.stage) this.onSelect(null)
    })

    // track host size for the camera
    this.app.renderer.on('resize', (w: number, h: number) => {
      this.camera.resize(w, h)
      if (!this.fitted && w > 0 && h > 0) {
        this.camera.fit()
        this.fitted = true
      }
    })
    this.camera.resize(this.app.screen.width, this.app.screen.height)
    if (this.app.screen.width > 0) {
      this.camera.fit()
      this.fitted = true
    }
  }

  private buildFloor(): void {
    const tiles = makeFloorTextures(this.app.renderer, this.pal)
    const cols = Math.ceil(WORLD_W / TILE)
    const rows = Math.ceil(WORLD_H / TILE)
    const floor = new Container()
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // deterministic variant choice — same court every launch
        const t = new Sprite(tiles[(r * 7 + c * 13) % tiles.length])
        t.position.set(c * TILE, r * TILE)
        floor.addChild(t)
      }
    }
    floor.cacheAsBitmap = true // one draw call for the whole floor
    this.world.addChild(floor)
  }

  /** Create/update avatars from agent state. Idempotent. */
  updateAgents(agents: SceneAgent[]): void {
    for (const agent of agents) {
      let avatar = this.avatars.get(agent.id)
      if (!avatar) {
        const robe = ROBE_COLORS[agent.id] ?? 0x8c7b6b
        let tex = this.avatarTextures.get(agent.id)
        if (!tex) {
          tex = makeAvatarTexture(this.app.renderer, robe)
          this.avatarTextures.set(agent.id, tex)
        }
        const pos = positionFor(agent.id)

        // desk in front of every shishya (not the orchestrator — he has the dais)
        if (agent.id !== 'chanakya') {
          const desk = new Sprite(this.deskTexture)
          desk.anchor.set(0.5, 0)
          desk.position.set(pos.x, pos.y + 6)
          this.world.addChild(desk)
        }

        avatar = new Avatar(agent.id, agent.name, tex, this.pal, (id) => this.onSelect(id))
        avatar.position.set(pos.x, pos.y)
        this.world.addChild(avatar)
        this.avatars.set(agent.id, avatar)
      }
      avatar.setAvastha(agent.avastha)
    }
  }

  setSelected(id: string | null): void {
    for (const [aid, avatar] of this.avatars) {
      avatar.setSelected(aid === id)
    }
  }

  destroy(): void {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
    this.avatars.clear()
    this.avatarTextures.clear()
  }
}
