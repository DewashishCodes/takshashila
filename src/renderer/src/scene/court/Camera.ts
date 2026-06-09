import { Container, FederatedPointerEvent } from 'pixi.js'

// Pan/zoom controller with tweened motion. Drag to pan, wheel zooms toward
// the cursor (0.8–1.4×, relaxed down to fit-scale so the whole court is
// always reachable). User input cancels any running tween.

const MAX_ZOOM = 1.4
const DRAG_THRESHOLD = 5

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

interface Tween {
  fromX: number; fromY: number; fromS: number
  toX: number;   toY: number;   toS: number
  t: number; dur: number
  ease: (t: number) => number
}

export class Camera {
  private world: Container
  private worldW: number
  private worldH: number
  private viewW = 0
  private viewH = 0
  private minZoom = 0.8

  private tween: Tween | null = null
  private dragging = false
  private panning = false
  private lastX = 0
  private lastY = 0
  private downX = 0
  private downY = 0

  constructor(world: Container, worldW: number, worldH: number) {
    this.world = world
    this.worldW = worldW
    this.worldH = worldH
  }

  attach(stage: Container, canvas: HTMLCanvasElement): void {
    stage.eventMode = 'static'

    stage.on('pointerdown', (e: FederatedPointerEvent) => {
      this.tween = null // user takes over
      this.dragging = true
      this.panning = false
      this.lastX = e.globalX; this.lastY = e.globalY
      this.downX = e.globalX; this.downY = e.globalY
    })

    stage.on('pointermove', (e: FederatedPointerEvent) => {
      if (!this.dragging) return
      const dx = e.globalX - this.lastX
      const dy = e.globalY - this.lastY
      if (!this.panning) {
        const total = Math.abs(e.globalX - this.downX) + Math.abs(e.globalY - this.downY)
        if (total < DRAG_THRESHOLD) return
        this.panning = true
      }
      this.world.x += dx
      this.world.y += dy
      this.lastX = e.globalX; this.lastY = e.globalY
      this.clamp()
    })

    const end = (): void => { this.dragging = false; this.panning = false }
    stage.on('pointerup', end)
    stage.on('pointerupoutside', end)

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault()
      this.tween = null
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const next = Math.min(MAX_ZOOM, Math.max(this.minZoom, this.world.scale.x * factor))
      const applied = next / this.world.scale.x
      if (applied === 1) return
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      this.world.x = cx - (cx - this.world.x) * applied
      this.world.y = cy - (cy - this.world.y) * applied
      this.world.scale.set(next)
      this.clamp()
    }, { passive: false })
  }

  resize(viewW: number, viewH: number): void {
    this.viewW = viewW
    this.viewH = viewH
    // never trap the user above fit-scale: relax the lower zoom bound
    this.minZoom = Math.min(0.8, this.fitScale())
    this.clamp()
  }

  private fitScale(): number {
    if (this.viewW === 0) return 0.8
    return Math.min(this.viewW / this.worldW, this.viewH / this.worldH)
  }

  /** Instantly center on a world point at the given scale */
  jumpTo(wx: number, wy: number, scale: number): void {
    this.world.scale.set(scale)
    this.world.x = this.viewW / 2 - wx * scale
    this.world.y = this.viewH / 2 - wy * scale
  }

  /** Tween to center a world point. Keeps current scale unless given one. */
  panTo(wx: number, wy: number, durMs = 400, scale?: number): void {
    const s = scale ?? this.world.scale.x
    this.tween = {
      fromX: this.world.x, fromY: this.world.y, fromS: this.world.scale.x,
      toX: this.viewW / 2 - wx * s,
      toY: this.viewH / 2 - wy * s,
      toS: s,
      t: 0, dur: durMs,
      ease: easeOutCubic
    }
  }

  /** Tween to the full-court fit view */
  panToFit(durMs = 1500): void {
    const s = this.fitScale()
    this.tween = {
      fromX: this.world.x, fromY: this.world.y, fromS: this.world.scale.x,
      toX: (this.viewW - this.worldW * s) / 2,
      toY: (this.viewH - this.worldH * s) / 2,
      toS: s,
      t: 0, dur: durMs,
      ease: easeInOutCubic
    }
  }

  /** Load sequence: start tight on the entrance, drift up to the full court */
  intro(entranceX: number, entranceY: number): void {
    this.jumpTo(entranceX, entranceY - 60, 1.15)
    this.panToFit(1500)
  }

  fitNow(): void {
    const s = this.fitScale()
    this.world.scale.set(s)
    this.world.x = (this.viewW - this.worldW * s) / 2
    this.world.y = (this.viewH - this.worldH * s) / 2
  }

  /** Advance tweens — call every frame with elapsed ms */
  update(deltaMS: number): void {
    if (!this.tween) return
    const tw = this.tween
    tw.t += deltaMS
    const k = Math.min(1, tw.t / tw.dur)
    const e = tw.ease(k)
    const s = tw.fromS + (tw.toS - tw.fromS) * e
    this.world.scale.set(s)
    this.world.x = tw.fromX + (tw.toX - tw.fromX) * e
    this.world.y = tw.fromY + (tw.toY - tw.fromY) * e
    if (k >= 1) this.tween = null
  }

  /** Keep at least a third of the court on screen during manual panning */
  private clamp(): void {
    if (this.viewW === 0 || this.tween) return
    const s = this.world.scale.x
    const w = this.worldW * s
    const h = this.worldH * s
    const margin = 0.66
    this.world.x = Math.min(this.viewW - w * (1 - margin), Math.max(-w * margin, this.world.x))
    this.world.y = Math.min(this.viewH - h * (1 - margin), Math.max(-h * margin, this.world.y))
  }
}
