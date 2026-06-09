import { Container, Graphics } from 'pixi.js'

// Oil-lamp glow per desk. Driven by the agent's avastha:
//   working    — bright pulse, radius 20–28px on a 1.5s sine cycle
//   processing — steady amber, waiting on the Samrat
//   idle       — faint ember
//   siddhi     — calm warm glow
//   vighna     — extinguished
const GLOW_COLOR = 0xffb340

interface Lamp {
  g: Graphics
  x: number
  y: number
  avastha: string
  phase: number
}

export class LampOverlay extends Container {
  private lamps = new Map<string, Lamp>()

  addLamp(agentId: string, x: number, y: number): void {
    if (this.lamps.has(agentId)) return
    const g = new Graphics()
    g.position.set(x, y)
    this.addChild(g)
    const lamp: Lamp = { g, x, y, avastha: 'idle', phase: Math.random() * Math.PI * 2 }
    this.lamps.set(agentId, lamp)
    this.draw(lamp, 0.1, 24)
  }

  setAvastha(agentId: string, avastha: string): void {
    const lamp = this.lamps.get(agentId)
    if (lamp) lamp.avastha = avastha
  }

  update(deltaMS: number): void {
    for (const lamp of this.lamps.values()) {
      switch (lamp.avastha) {
        case 'working': {
          lamp.phase += (deltaMS / 1500) * Math.PI * 2
          const s = (Math.sin(lamp.phase) + 1) / 2 // 0..1
          this.draw(lamp, 0.4, 20 + s * 8)
          break
        }
        case 'processing': this.draw(lamp, 0.3, 24); break
        case 'siddhi':     this.draw(lamp, 0.2, 24); break
        case 'vighna':     this.draw(lamp, 0, 0);    break
        default:           this.draw(lamp, 0.1, 24)  // idle
      }
    }
  }

  private draw(lamp: Lamp, alpha: number, radius: number): void {
    lamp.g.clear()
    if (alpha <= 0 || radius <= 0) return
    lamp.g.beginFill(GLOW_COLOR, alpha)
    lamp.g.drawCircle(0, 0, radius)
    lamp.g.endFill()
    // hot core
    lamp.g.beginFill(GLOW_COLOR, Math.min(1, alpha * 1.8))
    lamp.g.drawCircle(0, 0, radius * 0.35)
    lamp.g.endFill()
  }
}
