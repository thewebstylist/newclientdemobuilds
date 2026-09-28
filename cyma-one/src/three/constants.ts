// Timing shared by the shaders and the DOM readouts. Kept free of three.js
// imports so the page shell can load before the 3D engine chunk.

/** Paint time at which the eruption freezes. */
export const PEAK_T = 1.05
/** Delay between successive pools launching (paint-time units). */
export const STAGGER = 0.034
