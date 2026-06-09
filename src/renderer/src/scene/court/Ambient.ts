import { Container, Graphics } from 'pixi.js'
import { Avatar } from './Avatar'
import { TREE, KUND_CENTER, TORCHES } from './layout'

// Continuous ambient life: drifting banyan leaves, kund ripples,
// flickering entrance torches, and idle agents glancing around.

const CANOPY_R = 70

interface Leaf { g: Graphics; vy: number; x0: number }
interface Glance { until: number; next: number }

export class Ambient {
  // leaves + ripples live in the canopy/ground layers passed in
  private leaves: Leaf[] = []
  private ripples: Array<{ g: Graphics; t: number }> = []
  private rippleTimer = 0
  private torches: Graphics[] = []
  private torchTimer = 0
  private glances = new Map<string, Glance>()
  private elapsed = 0

  private groundLayer: Container

  constructor(groundLayer: Container, canopyLayer: Container, uiLayer: Container) {
    this.groundLayer = groundLayer

    // drifting leaves
    for (let i = 0; i < 5; i++) {
      const g = new Graphics()
      g.beginFill(0x5a8a3c)
      g.drawRect(0, 0, 3, 3)
      g.endFill()
      const x0 = TREE.x + (Math.random() * 2 - 1) * CANOPY_R * 0.7
      g.position.set(x0, TREE.y - 30 - Math.random() * 50)
      canopyLayer.addChild(g)
      this.leaves.push({ g, vy: 4 + Math.random() * 5, x0 })
    }

    // entrance torches
    for (const t of TORCHES) {
      const g = new Graphics()
      g.position.set(t.x, t.y)
      uiLayer.addChild(g)
      this.torches.push(g)
      this.drawTorch(g, 1)
    }
  }

  private drawTorch(g: Graphics, brightness: number): void {
    g.clear()
    g.beginFill(0xffb340, 0.18 * brightness)
    g.drawCircle(0, 0, 14)
    g.endFill()
    g.beginFill(0xffd700, brightness)
    g.drawRect(-2, -2, 4, 4)
    g.endFill()
  }

  update(deltaMS: number, avatars: Map<string, Avatar>): void {
    this.elapsed += deltaMS
    const dt = deltaMS / 1000

    // leaves drift upward, loop within canopy bounds
    for (const leaf of this.leaves) {
      leaf.g.y -= leaf.vy * dt
      leaf.g.x = leaf.x0 + Math.sin(this.elapsed / 900 + leaf.x0) * 6
      leaf.g.alpha = 0.5 + Math.sin(this.elapsed / 700 + leaf.vy) * 0.3
      if (leaf.g.y < TREE.y - 30 - CANOPY_R) {
        leaf.g.y = TREE.y - 20
        leaf.x0 = TREE.x + (Math.random() * 2 - 1) * CANOPY_R * 0.7
      }
    }

    // kund ripple every 2s
    this.rippleTimer += deltaMS
    if (this.rippleTimer >= 2000) {
      this.rippleTimer = 0
      const g = new Graphics()
      g.position.set(KUND_CENTER.x, KUND_CENTER.y)
      this.groundLayer.addChild(g)
      this.ripples.push({ g, t: 0 })
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]
      r.t += deltaMS
      const k = r.t / 1600
      if (k >= 1) { r.g.destroy(); this.ripples.splice(i, 1); continue }
      r.g.clear()
      r.g.lineStyle(1.5, 0x9fd0e8, 0.3 * (1 - k))
      r.g.drawCircle(0, 0, 4 + k * 22)
    }

    // torch flicker — random brightness every 100–200ms
    this.torchTimer -= deltaMS
    if (this.torchTimer <= 0) {
      this.torchTimer = 100 + Math.random() * 100
      for (const g of this.torches) this.drawTorch(g, 0.6 + Math.random() * 0.4)
    }

    // idle glances — every 8–12s per agent, flip for 1.5s
    for (const [id, avatar] of avatars) {
      let glance = this.glances.get(id)
      if (!glance) {
        glance = { until: 0, next: this.elapsed + 8000 + Math.random() * 4000 }
        this.glances.set(id, glance)
      }
      if (avatar.avastha !== 'idle') {
        avatar.setFlip(false)
        glance.next = this.elapsed + 8000 + Math.random() * 4000
        continue
      }
      if (glance.until > this.elapsed) continue
      if (avatar.avastha === 'idle' && this.elapsed >= glance.next) {
        avatar.setFlip(true)
        glance.until = this.elapsed + 1500
        glance.next = this.elapsed + 8000 + Math.random() * 4000
        setTimeout(() => avatar.setFlip(false), 1500)
      }
    }
  }
}
