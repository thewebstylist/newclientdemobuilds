// All timing in seconds, converted with fps at use-site.
export const T = {
  duration: 5,
  landStart: -0.07, // polaroids slap onto the floor
  landStagger: 0.07,
  hideMuralUntil: 0.4, // paint is under the prints by then
  holdUntil: 0.95, // first fly-away
  flyStarts: [0.95, 1.33, 1.68, 2.0, 2.3], // accelerating rhythm, by fly order
  flyDur: 0.75,
  camPullStart: 0.9,
  camPullEnd: 3.4,
  reveal: 3.02, // last polaroid clears the lettering -> confetti + shimmer
};

// Collage layout in world coords (1920x1080). z = stacking (higher = on top).
// fly = order in which they leave (0 first). dir = exit vector.
export const POLAROIDS = [
  { src: "photos/p1.jpg", x: 590, y: 400, rot: -9, z: 2, fly: 2, dir: [-1.0, -0.55], caption: "baby Jetty" },
  { src: "photos/p2.jpg", x: 965, y: 355, rot: 4, z: 4, fly: 0, dir: [0.15, -1.0], caption: "best buds" },
  { src: "photos/p3.jpg", x: 1340, y: 410, rot: 8, z: 3, fly: 1, dir: [1.0, -0.5], caption: "road trip" },
  { src: "photos/p4.jpg", x: 700, y: 705, rot: 6, z: 0, fly: 4, dir: [-0.8, 1.0], caption: "super Jetty!" },
  { src: "photos/p5.jpg", x: 1215, y: 700, rot: -6, z: 1, fly: 3, dir: [0.9, 0.9], caption: "Jetty & Dad" },
] as const;
