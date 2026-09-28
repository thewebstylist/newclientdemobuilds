/**
 * Poster and fallback stills. The hosted build loads them from posters/; the
 * single-file build embeds a small set as data URIs (window.__LAMINA_POSTERS)
 * and maps every other still to its nearest embedded neighbour.
 */
declare global {
  interface Window { __LAMINA_POSTERS?: Record<string, string> }
}

const NEAREST: Record<string, string> = {
  lamination: 'crunch', crumb: 'crunch', lens: 'hero', viewer: 'hero', order: 'hero', lineup: 'hero',
}

export function posterSrc(name: string, variant: 'd' | 'm'): string {
  const embedded = window.__LAMINA_POSTERS
  if (!embedded) return `posters/${name}-${variant}.webp`
  return embedded[`${name}-${variant}`] ?? embedded[`${NEAREST[name] ?? 'hero'}-${variant}`] ?? embedded[`hero-${variant}`]
}
