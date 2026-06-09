import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import { AVASTHA_COLOR_KEY, type ScenePalette } from './palette'

// An agent on the court floor: selection ring under the feet, pixel sprite,
// status dot above the head, name label below. Animations come in M6.

export class Avatar extends Container {
  readonly agentId: string

  private ring: Graphics
  private statusDot: Graphics
  private pal: ScenePalette

  constructor(
    agentId: string,
    displayName: string,
    texture: Texture,
    pal: ScenePalette,
    onTap: (id: string) => void
  ) {
    super()
    this.agentId = agentId
    this.pal = pal

    // selection ring — ellipse shadow under the feet, gold when selected
    this.ring = new Graphics()
    this.ring.beginFill(pal.gold, 0.35)
    this.ring.drawEllipse(0, 0, 26, 10)
    this.ring.endFill()
    this.ring.lineStyle(2, pal.gold, 0.9)
    this.ring.drawEllipse(0, 0, 26, 10)
    this.ring.position.set(0, 2)
    this.ring.visible = false
    this.addChild(this.ring)

    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5, 1)
    sprite.position.set(0, 0)
    this.addChild(sprite)

    // status dot above the head
    this.statusDot = new Graphics()
    this.statusDot.position.set(0, -sprite.height - 8)
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
}
