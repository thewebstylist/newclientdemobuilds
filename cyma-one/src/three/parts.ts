// The nine parts of CYMA One, top of the stack first. Shared by the 3D model
// and the anatomy panel so labels can never drift from the geometry.
export const PARTS = [
  { id: 'cap', name: 'Phase plug', detail: 'Solid aluminium, hand polished' },
  { id: 'bezel', name: 'Machined bezel', detail: 'Diamond-cut chamfer catches the light' },
  { id: 'cone', name: 'Woofer diaphragm', detail: 'Carbon-weave cone, half-roll surround' },
  { id: 'coil', name: 'Voice coil + spider', detail: 'Four-layer copper winding' },
  { id: 'array', name: '360° mid/high array', detail: 'Three mids, three tweeters, all around' },
  { id: 'motor', name: 'Neodymium motor', detail: 'Vented pole piece for long excursion' },
  { id: 'board', name: 'Amplifier + DSP', detail: '240 W across a three-way active system' },
  { id: 'enclosure', name: 'Machined enclosure', detail: 'Precision-machined, bead-blasted aluminium' },
  { id: 'base', name: 'Isolation base', detail: 'Damped plinth with USB-C' },
] as const
export type PartId = (typeof PARTS)[number]['id']
