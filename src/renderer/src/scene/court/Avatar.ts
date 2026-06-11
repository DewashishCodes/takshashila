import { AnimatedSprite, Container, Graphics, Text, TextStyle } from 'pixi.js'
import { AVASTHA_COLOR_KEY, type ScenePalette } from './palette'
import { CHARACTERS, FALLBACK_CHARACTER, type CourtAssets } from './assets'

// An agent on the court floor: selection ring under the feet, looping idle
// animation from the character sheet (assets.ts), status dot above the head,
// name label below. Working agents play their idle loop faster and lean in.

export class Avatar extends Container {
  readonly agentId: string
  avastha = 'idle'

  private ring: Graphics
  private statusDot: Graphics
  private bodyC: Container
  private anim: AnimatedSprite
  private idleSpeed: number
  private pal: ScenePalette

  constructor(
    agentId: string,
    displayName: string,
    pal: ScenePalette,
    assets: CourtAssets,
    onTap: (id: string) => void
  ) {
    super()
    this.agentId = agentId
    this.pal = pal

    const def = CHARACTERS[agentId] ?? CHARACTERS[FALLBACK_CHARACTER]
    const frames = assets.characters[agentId] ?? assets.characters[FALLBACK_CHARACTER]
    this.idleSpeed = def.speed

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

    // soft drop shadow under every character
    const shadow = new Graphics()
    shadow.beginFill(0x000000, 0.25)
    shadow.drawEllipse(0, 1, 16, 6)
    shadow.endFill()
    this.addChild(shadow)

    // character sprite, origin at the feet
    this.bodyC = new Container()
    this.anim = new AnimatedSprite(frames)
    this.anim.anchor.set(0.5, def.anchorY)
    this.anim.scale.set(def.scale)
    this.anim.animationSpeed = def.speed
    // desynchronize the cast — don't let everyone breathe in unison
    this.anim.gotoAndPlay(Math.floor(Math.random() * frames.length))
    this.bodyC.addChild(this.anim)
    this.addChild(this.bodyC)

    // status dot above the head
    this.statusDot = new Graphics()
    this.statusDot.position.set(0, -def.height - 12)
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
    // working agents move with urgency
    const busy = avastha === 'working' || avastha === 'processing'
    this.anim.animationSpeed = busy ? this.idleSpeed * 1.8 : this.idleSpeed
  }

  setSelected(selected: boolean): void {
    this.ring.visible = selected
  }

  /** Idle glance — flip the sprite horizontally (ambient animation) */
  setFlip(flipped: boolean): void {
    this.bodyC.scale.x = flipped ? -1 : 1
  }

  /** Per-frame animation hook. The sheet loop does the breathing now. */
  tick(_elapsedMS: number, _index: number): void {
    this.bodyC.position.y =
      this.avastha === 'working' || this.avastha === 'processing' ? 1 : 0
  }
}
