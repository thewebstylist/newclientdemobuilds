// Eight pigments, always in the same order around the woofer:
// magenta, cyan, yellow, orange, violet, lime, cobalt, crimson.
export type PaletteName = 'original' | 'neon' | 'sunset' | 'ocean' | 'mono'

export interface Palette {
  label: string
  colors: string[]
  /** UI accent, tuned for >= 7:1 contrast on the near-black canvas. */
  accent: string
  /** Scalar applied to paint saturation in the shader (1 = as authored). */
  saturation: number
  /** Extra self-illumination so neon reads as electric without bloom. */
  glow: number
}

export const PIGMENT_NAMES = ['Magenta', 'Cyan', 'Yellow', 'Orange', 'Violet', 'Lime', 'Cobalt', 'Crimson']

export const PALETTES: Record<PaletteName, Palette> = {
  original: {
    label: 'Original',
    colors: ['#ff1f8f', '#00c8f0', '#ffd000', '#ff6200', '#8a3cff', '#8ef000', '#1f4bff', '#dd0a2f'],
    accent: '#ff5aa8',
    saturation: 1,
    glow: 0.04,
  },
  neon: {
    label: 'Neon',
    colors: ['#ff2bd6', '#00fff0', '#f2ff1f', '#ff7a1a', '#b64dff', '#4dff3a', '#2f7bff', '#ff1f5a'],
    accent: '#3dfff0',
    saturation: 1.15,
    glow: 0.22,
  },
  sunset: {
    label: 'Sunset',
    colors: ['#ff3d6e', '#ff9a3d', '#ffcf40', '#ff5a1f', '#c43d8f', '#ffb38a', '#7a2c9f', '#c80f3a'],
    accent: '#ff9a4d',
    saturation: 1,
    glow: 0.06,
  },
  ocean: {
    label: 'Ocean',
    colors: ['#00e0ff', '#0090ff', '#24ffd0', '#4d7bff', '#8cf6ff', '#00b8a8', '#1a3dff', '#9cc2ff'],
    accent: '#4dd2ff',
    saturation: 1,
    glow: 0.06,
  },
  mono: {
    label: 'Mono',
    colors: ['#f2f2f2', '#c9c9c9', '#9d9d9d', '#ffffff', '#858585', '#dedede', '#b3b3b3', '#6e6e6e'],
    accent: '#f2f2f2',
    saturation: 0,
    glow: 0.02,
  },
}

export const PALETTE_ORDER: PaletteName[] = ['original', 'neon', 'sunset', 'ocean', 'mono']

export type FinishName = 'obsidian' | 'titanium' | 'sand'

export interface Finish {
  label: string
  note: string
  body: string
  roughness: number
  swatch: string
}

export const FINISHES: Record<FinishName, Finish> = {
  obsidian: { label: 'Obsidian', note: 'Bead-blasted black aluminium', body: '#2b2b2f', roughness: 0.46, swatch: '#1b1b1e' },
  titanium: { label: 'Titanium', note: 'Brushed natural titanium tone', body: '#9a9ca0', roughness: 0.34, swatch: '#9b9ea3' },
  sand: { label: 'Sand', note: 'Warm anodised champagne', body: '#c2ab8a', roughness: 0.42, swatch: '#c4ad8c' },
}

export const FINISH_ORDER: FinishName[] = ['obsidian', 'titanium', 'sand']
