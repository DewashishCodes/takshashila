import { Container, FederatedPointerEvent } from 'pixi.js'

// Pan/zoom controller for the world container. Drag empty floor to pan,
// mouse wheel zooms toward the cursor. Taps on avatars are not swallowed:
// panning only engages after the pointer moves past a small threshold.

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.5
const DRAG_THRESHOLD = 5 // px before a press becomes a pan

export class Camera {
  private world: Container
  private worldW: number
  private worldH: number
  private viewW = 0
  private viewH = 0

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

  /** Wire pointer events on the stage and wheel on the canvas */
  attach(stage: Container, canvas: HTMLCanvasElement): void {
    stage.eventMode = 'static'

    stage.on('pointerdown', (e: FederatedPointerEvent) => {
      this.dragging = true
      this.panning = false
      this.lastX = e.globalX
      this.lastY = e.globalY
      this.downX = e.globalX
      this.downY = e.globalY
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
      this.lastX = e.globalX
      this.lastY = e.globalY
      this.clamp()
    })

    const end = (): void => { this.dragging = false; this.panning = false }
    stage.on('pointerup', end)
    stage.on('pointerupoutside', end)

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.world.scale.x * factor))
      const applied = next / this.world.scale.x
      if (applied === 1) return
      // zoom toward the cursor: keep the world point under it stationary
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
    this.clamp()
  }

  /** Fit and center the whole court in the view */
  fit(): void {
    if (this.viewW === 0 || this.viewH === 0) return
    const scale = Math.min(this.viewW / this.worldW, this.viewH / this.worldH)
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
    this.world.scale.set(clamped)
    this.world.x = (this.viewW - this.worldW * clamped) / 2
    this.world.y = (this.viewH - this.worldH * clamped) / 2
  }

  /** Keep at least a third of the court on screen */
  private clamp(): void {
    if (this.viewW === 0) return
    const s = this.world.scale.x
    const w = this.worldW * s
    const h = this.worldH * s
    const margin = 0.66
    this.world.x = Math.min(this.viewW - w * (1 - margin), Math.max(-w * margin, this.world.x))
    this.world.y = Math.min(this.viewH - h * (1 - margin), Math.max(-h * margin, this.world.y))
  }
}
