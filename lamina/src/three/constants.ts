// Numbers shared by the scene and the page. Kept free of three.js imports so
// the director and the DOM code can use them without pulling in the renderer.

/** Lineup slots [x, y] and scale: a row on wide screens, a 2 x 2 grid on phones. */
export const LINEUP_ROW: [number, number][] = [[-2.75, 0], [-0.92, 0], [0.92, 0], [2.75, 0]]
export const LINEUP_GRID: [number, number][] = [[-0.64, 0.46], [0.64, 0.46], [-0.64, -0.42], [0.64, -0.42]]
export const LINEUP_SCALE = { row: 0.72, grid: 0.5 }

/** Top of the parchment on the oven tray (world y). */
export const TRAY_Y = -0.292

/** Flake flight time at the end of the crunch (seconds of simulated flight). */
export const CRUNCH_T = 1.35
