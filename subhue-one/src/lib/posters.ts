/**
 * Poster and fallback stills. The hosted build loads them from posters/; the
 * single-file build embeds a small set as data URIs (window.__SUBHUE_POSTERS)
 * and maps every other still to its nearest embedded neighbour.
 */
declare global {
  interface Window { __SUBHUE_POSTERS?: Record<string, string> }
}

const NEAREST: Record<string, string> = {
  frozen: 'drop', inside: 'drop', 'finish-titanium': 'finish-obsidian', 'finish-sand': 'finish-obsidian',
}

export function posterSrc(name: string, variant: 'd' | 'm'): string {
  const embedded = window.__SUBHUE_POSTERS
  if (!embedded) return `posters/${name}-${variant}.webp`
  const base = name.startsWith('frozen') ? 'frozen' : name
  return embedded[`${name}-${variant}`] ?? embedded[`${NEAREST[base] ?? 'hero'}-${variant}`] ?? embedded[`hero-${variant}`]
}
