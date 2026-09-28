/**
 * The element the app renders into. Colour variables and measurements live
 * here rather than on <html>, so the demo keeps its look when it is embedded
 * inside another site (the single-file widget build scopes all CSS to it).
 */
export const appRoot = (): HTMLElement => document.getElementById('subhue-root') ?? document.documentElement
