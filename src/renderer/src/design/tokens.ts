// TypeScript mirrors of tokens.css — use in Pixi.js scene and JS that can't read CSS vars.
export const colors = {
  stone:       0x2C1810,
  courtyard:   0x8B6914,
  stoneMid:    0x3D2314,
  stoneLight:  0x5C3D1E,
  gold:        0xF4C430,
  goldDim:     0xA8861E,
  terracotta:  0xC1440E,
  lamp:        0xFFD700,
  forest:      0x2D5A27,
  ash:         0x8C7B6B,
  textPrimary: 0xF5E6C8,
  active:      0xFFD700,
  idle:        0x2D5A27,
  error:       0xC1440E,
  success:     0x4A7C59
} as const

export const fonts = {
  display: "'Yatra One', serif",
  pixel:   "'Press Start 2P', monospace",
  body:    "'Noto Sans', sans-serif",
  mono:    "'JetBrains Mono', monospace"
} as const

export const layout = {
  titlebarHeight:  24,
  stripHeight:     96,
  aadeshBarHeight: 48,
  panelWidthPct:   0.32
} as const
