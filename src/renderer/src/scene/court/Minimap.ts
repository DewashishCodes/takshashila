import { Container, Graphics } from 'pixi.js'
import { DESK_POSITIONS, WORLD_W, WORLD_H } from './layout'
import { ROBE_COLORS } from './palette'

// Semi-transparent minimap pinned to the bottom-left of the canvas
// (screen space — added to the stage, not the world). Colored dots
// mark each agent's desk; the selected agent's dot gets a ring.

const MAP_W = 80
const MAP_H = 60
const PAD = 10

export class Minimap extends Container {
  private dots = new Map<string, Graphics>()
  private frame: Graphics

  constructor() {
    super()
    this.frame = new Graphics()
    this.frame.beginFill(0x1a0e08, 0.55)
    this.frame.drawRect(0, 0, MAP_W, MAP_H)
    this.frame.endFill()
    this.frame.lineStyle(1, 0xa8861e, 0.8)
    this.frame.drawRect(0, 0, MAP_W, MAP_H)
    this.addChild(this.frame)
    this.eventMode = 'none'
  }

  updateAgents(agentIds: string[], selectedId: string | null): void {
    for (const id of agentIds) {
      const seat = DESK_POSITIONS[id]
      if (!seat) continue
      let dot = this.dots.get(id)
      if (!dot) {
        dot = new Graphics()
        this.addChild(dot)
        this.dots.set(id, dot)
      }
      const x = (seat.x / WORLD_W) * MAP_W
      const y = (seat.y / WORLD_H) * MAP_H
      dot.clear()
      dot.beginFill(ROBE_COLORS[id] ?? 0x8c7b6b)
      dot.drawRect(x - 1.5, y - 1.5, 3, 3)
      dot.endFill()
      if (id === selectedId) {
        dot.lineStyle(1, 0xf4c430, 1)
        dot.drawCircle(x, y, 4)
      }
    }
  }

  /** Pin to bottom-left of the view */
  place(viewH: number): void {
    this.position.set(PAD, viewH - MAP_H - PAD)
  }
}
