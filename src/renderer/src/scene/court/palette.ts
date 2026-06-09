// Bridge between CSS design tokens and Pixi's numeric colors.
// Components never hardcode colors — the scene reads them from tokens.css
// at runtime via getComputedStyle.

export function cssColor(varName: string, fallback: number): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  if (v.startsWith('#')) {
    const hex = v.slice(1)
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
    const n = parseInt(full, 16)
    if (!Number.isNaN(n)) return n
  }
  return fallback
}

export function scenePalette(): {
  stone: number
  courtyard: number
  stoneLight: number
  gold: number
  goldDim: number
  terracotta: number
  textPrimary: number
  active: number
  idle: number
  error: number
  success: number
} {
  return {
    stone:       cssColor('--color-stone',        0x2c1810),
    courtyard:   cssColor('--color-courtyard',    0x8b6914),
    stoneLight:  cssColor('--color-stone-light',  0x5c3d1e),
    gold:        cssColor('--color-gold',         0xf4c430),
    goldDim:     cssColor('--color-gold-dim',     0xa8861e),
    terracotta:  cssColor('--color-terracotta',   0xc1440e),
    textPrimary: cssColor('--color-text-primary', 0xf5e6c8),
    active:      cssColor('--color-active',       0xffd700),
    idle:        cssColor('--color-idle',         0x2d5a27),
    error:       cssColor('--color-error',        0xc1440e),
    success:     cssColor('--color-success',      0x4a7c59)
  }
}

export type ScenePalette = ReturnType<typeof scenePalette>

// Robe colors per agent — drawn from the terminal ANSI palette in tokens
// (TerminalPane theme) so each shishya keeps a consistent identity color.
export const ROBE_COLORS: Record<string, number> = {
  chanakya:      0xf4c430, // gold — the orchestrator
  aaruni:        0xc1440e, // terracotta
  nachiketa:     0x5b7fa6, // blue
  gargi:         0x9b6b9b, // magenta
  bharadwaja:    0x4a7c59, // green
  chandragupta:  0xe05a2b, // bright orange
  vishnu_sharma: 0x5b9b9b  // cyan
}

export const AVASTHA_COLOR_KEY: Record<string, keyof ScenePalette> = {
  idle:       'idle',
  working:    'active',
  processing: 'gold',
  vighna:     'error',
  siddhi:     'success'
}

/** Multiply a 24-bit color's brightness by f (0..~1.5) */
export function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * f))
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * f))
  const b = Math.min(255, Math.round((color & 0xff) * f))
  return (r << 16) | (g << 8) | b
}
