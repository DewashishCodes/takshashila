import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { AVASTHA_COLOR_KEY, type ScenePalette } from './palette'
import { drawSprite } from './sprites'

// An agent on the court floor: selection ring under the feet, character
// sprite (sprites.ts), status dot above the head, name label below.
//
// Idle bob: 1px shift on an 800ms cycle, offset per agent so the court
// doesn't bob in robotic unison. Working: 1px forward lean, no bob.

const BOB_CYCLE_MS = 800
const BOB_STAGGER_MS = 200

export class Avatar extends Container {
  readonly agentId: string
  avastha = 'idle'

  private ring: Graphics
  private statusDot: Graphics
  private bodyC: Container
  private pal: ScenePalette

  constructor(
    agentId: string,
    displayName: string,
    pal: ScenePalette,
    onTap: (id: string) => void
  ) {
    super()
    this.agentId = agentId
    this.pal = pal

    // selection ring — ellipse shadow under the feet, gold when selected
    this.ring = new Graphics()
    this.ring.beginFill(pal.gold, 0.35)
    this.ring.drawEllipse(0, 0, 24, 9)
    this.ring.endFill()
    this.ring.lineStyle(2, pal.gold, 0.9)
    this.ring.drawEllipse(0, 0, 24, 9)
    this.ring.position.set(0, 2)
    this.ring.visible = false
    this.addChild(this.ring)

    // character sprite, origin at the feet
    this.bodyC = new Container()
    drawSprite(agentId, this.bodyC)
    this.addChild(this.bodyC)

    // status dot above the head
    this.statusDot = new Graphics()
    this.statusDot.position.set(0, -64)
    this.addChild(this.statusDot)
    this.setAvastha('idle')

    const label = new Text(displayName.toUpperCase(), new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 7,
      fill: pal.textPrimary
    }))
    label.resolution = 2
    label.anchor.set(0.5, 0)
    label.position.set(0, 8)
    this.addChild(label)

    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.on('pointertap', () => onTap(this.agentId))
  }

  setAvastha(avastha: string): void {
    this.avastha = avastha
    const key = AVASTHA_COLOR_KEY[avastha] ?? 'idle'
    const color = this.pal[key]
    this.statusDot.clear()
    this.statusDot.beginFill(color)
    this.statusDot.drawCircle(0, 0, 4)
    this.statusDot.endFill()
    // faint glow halo
    this.statusDot.beginFill(color, 0.25)
    this.statusDot.drawCircle(0, 0, 7)
    this.statusDot.endFill()
  }

  setSelected(selected: boolean): void {
    this.ring.visible = selected
  }

  /** Idle glance — flip the sprite horizontally (ambient animation) */
  setFlip(flipped: boolean): void {
    this.bodyC.scale.x = flipped ? -1 : 1
  }

  /** Per-frame animation. `index` staggers the bob so agents stay out of sync. */
  tick(elapsedMS: number, index: number): void {
    if (this.avastha === 'working' || this.avastha === 'processing') {
      // lean into the work
      this.bodyC.position.y = 1
      return
    }
    const phase = (elapsedMS + index * BOB_STAGGER_MS) % BOB_CYCLE_MS
    this.bodyC.position.y = phase < BOB_CYCLE_MS / 2 ? 0 : -1
  }
}
