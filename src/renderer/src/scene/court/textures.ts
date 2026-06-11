import { Graphics, IRenderer, SCALE_MODES, Texture } from 'pixi.js'

// Small procedural textures that stay hand-drawn: desk items coupled to the
// lamp glow system and the flying sandesh scroll. Everything else (floor,
// furniture, characters) now comes from real sprite sheets — see assets.ts.

const PX = 4

function bake(renderer: IRenderer, g: Graphics): Texture {
  const tex = renderer.generateTexture(g, { scaleMode: SCALE_MODES.NEAREST })
  g.destroy()
  return tex
}

function px(g: Graphics, color: number, x: number, y: number, w = 1, h = 1): void {
  g.beginFill(color)
  g.drawRect(x * PX, y * PX, w * PX, h * PX)
  g.endFill()
}

export function makeManuscriptTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  px(g, 0xe8dcb8, 0, 0, 5, 2)
  px(g, 0xc9b787, 0, 1, 5, 1)
  px(g, 0x8a7350, 1, 0, 1, 2) // binding cord
  return bake(renderer, g)
}

export function makeLampTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  px(g, 0x8a5a2b, 0, 1, 3, 1)   // clay diya
  px(g, 0xffd700, 1, 0, 1, 1)   // flame
  return bake(renderer, g)
}

export function makeScrollPileTexture(renderer: IRenderer): Texture {
  const g = new Graphics()
  px(g, 0xd8c9a3, 0, 1, 3, 1)
  px(g, 0xc4ab78, 2, 1, 3, 1)
  px(g, 0xe8dcb8, 1, 0, 3, 1)
  return bake(renderer, g)
}

export function makeScrollSpriteTexture(renderer: IRenderer): Texture {
  // the flying sandesh
  const g = new Graphics()
  px(g, 0xe8dcb8, 0, 0, 3, 1)
  px(g, 0xc1440e, 1, 0, 1, 1) // wax seal
  return bake(renderer, g)
}
