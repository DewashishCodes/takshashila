import { Container, Graphics, Sprite, Texture } from 'pixi.js'

// A sandesh scroll arcing between two desks. Flies OVER the furniture:
// parabolic arc peaking 80px above the higher endpoint, cubic ease-in-out,
// a 3-dot fading trail, and a 300ms unfurl on arrival.

const FLIGHT_MS = 900
const UNFURL_MS = 300
const ARC_HEIGHT = 80

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

interface Flight {
  sprite: Sprite
  trail: Graphics[]
  fromX: number; fromY: number
  toX: number;   toY: number
  peakY: number
  t: number
  phase: 'fly' | 'unfurl'
  unfurlT: number
}

export class ScrollAnim extends Container {
  private texture: Texture
  private flights: Flight[] = []

  constructor(scrollTexture: Texture) {
    super()
    this.texture = scrollTexture
  }

  play(fromX: number, fromY: number, toX: number, toY: number): void {
    const sprite = new Sprite(this.texture)
    sprite.anchor.set(0.5)
    sprite.position.set(fromX, fromY)
    this.addChild(sprite)

    const trail: Graphics[] = []
    for (let i = 0; i < 3; i++) {
      const dot = new Graphics()
      dot.beginFill(0xe8dcb8, 0.4)
      dot.drawCircle(0, 0, 2)
      dot.endFill()
      dot.visible = false
      this.addChild(dot)
      trail.push(dot)
    }

    this.flights.push({
      sprite, trail,
      fromX, fromY, toX, toY,
      peakY: Math.min(fromY, toY) - ARC_HEIGHT,
      t: 0, phase: 'fly', unfurlT: 0
    })
  }

  private pointAt(f: Flight, k: number): { x: number; y: number } {
    const e = easeInOutCubic(k)
    const x = f.fromX + (f.toX - f.fromX) * e
    const lin = f.fromY + (f.toY - f.fromY) * e
    // parabolic lift toward peakY, max at k=0.5
    const lift = (Math.min(f.fromY, f.toY) - f.peakY) * 4 * e * (1 - e)
    return { x, y: lin - lift }
  }

  update(deltaMS: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i]

      if (f.phase === 'fly') {
        f.t += deltaMS
        const k = Math.min(1, f.t / FLIGHT_MS)
        const p = this.pointAt(f, k)
        f.sprite.position.set(p.x, p.y)
        f.sprite.rotation = Math.sin(k * Math.PI * 4) * 0.3

        // trail dots lag behind at fixed offsets, fading out
        for (let d = 0; d < f.trail.length; d++) {
          const lag = k - (d + 1) * 0.08
          if (lag <= 0) { f.trail[d].visible = false; continue }
          const tp = this.pointAt(f, lag)
          f.trail[d].visible = true
          f.trail[d].position.set(tp.x, tp.y)
          f.trail[d].alpha = 0.4 * (1 - (d + 1) / 4) * (1 - k)
        }

        if (k >= 1) {
          f.phase = 'unfurl'
          f.sprite.rotation = 0
          for (const dot of f.trail) dot.visible = false
        }
      } else {
        // unfurl: widen 2px → 8px (scale x 1→4 on a 12px-wide sprite ≈ visual widen)
        f.unfurlT += deltaMS
        const k = Math.min(1, f.unfurlT / UNFURL_MS)
        f.sprite.scale.set(1 + k * 1.5, 1)
        f.sprite.alpha = 1 - k * k
        if (k >= 1) {
          f.sprite.destroy()
          for (const dot of f.trail) dot.destroy()
          this.flights.splice(i, 1)
        }
      }
    }
  }
}
