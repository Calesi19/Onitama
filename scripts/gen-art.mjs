// Generates every piece of ink in the game as plain SVG path data, written to
// src/art/generated.ts. Nothing here ships to the browser and nothing is traced
// from existing artwork: each mark is a centre line plus a pressure curve,
// expanded into a filled, tapered brush stroke. Run: node scripts/gen-art.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const round = (n) => Math.round(n * 10) / 10;

/** Small deterministic PRNG, so regenerating gives identical output. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Catmull-Rom through `pts`, `n` samples per segment. */
function spline(pts, n) {
  const out = [];
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
      out.push([f(p[i - 1][0], p[i][0], p[i + 1][0], p[i + 2][0]), f(p[i - 1][1], p[i][1], p[i + 1][1], p[i + 2][1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Closed smooth path through `poly` using quadratic midpoints. */
function smoothClosed(input) {
  // Every shape winds the same way, so overlapping strokes never cancel out.
  let area = 0;
  input.forEach((p, i) => {
    const q = input[(i + 1) % input.length];
    area += p[0] * q[1] - q[0] * p[1];
  });
  const poly = area < 0 ? [...input].reverse() : input;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(poly[poly.length - 1], poly[0]);
  let d = `M${round(start[0])} ${round(start[1])}`;
  for (let i = 0; i < poly.length; i++) {
    const m = mid(poly[i], poly[(i + 1) % poly.length]);
    d += `Q${round(poly[i][0])} ${round(poly[i][1])} ${round(m[0])} ${round(m[1])}`;
  }
  return d + 'Z';
}

/**
 * One brush stroke. `w` is the full loaded width; `a`/`b` are the share of the
 * stroke spent pressing down and lifting off; `head` keeps a blunt start.
 */
function brush(pts, w, { a = 0.18, b = 0.4, head = 0.25, n = 4, seed = 7 } = {}) {
  const r = rng(seed * 31 + Math.round(pts[0][0] * 7 + pts[0][1] * 13));
  const c = spline(pts, n);
  const m = c.length - 1;
  const phase = r() * 6;
  const left = [];
  const right = [];
  for (let i = 0; i <= m; i++) {
    const t = i / m;
    const prev = c[Math.max(0, i - 1)];
    const next = c[Math.min(m, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const rise = Math.min(1, t / a);
    const fall = Math.min(1, (1 - t) / b);
    const ease = (v) => Math.sin((v * Math.PI) / 2);
    const breathe = 1 + 0.1 * Math.sin(t * 7 + phase);
    const half = (w / 2) * (head + (1 - head) * ease(rise)) * ease(fall) * breathe;
    const skew = 0.06 * w * Math.sin(t * 5 + phase);
    left.push([c[i][0] + nx * (half + skew), c[i][1] + ny * (half + skew)]);
    right.push([c[i][0] - nx * (half - skew), c[i][1] - ny * (half - skew)]);
  }
  return smoothClosed([...left, ...right.reverse()]);
}

/** A closed shape with a hand-cut, faintly uneven edge. */
function wobble(pts, amount, seed) {
  const r = rng(seed);
  return smoothClosed(pts.map(([x, y]) => [x + (r() - 0.5) * amount, y + (r() - 0.5) * amount]));
}

function circle(cx, cy, rx, ry, n, amount, seed) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  return wobble(pts, amount, seed);
}

function polygon(corners, perSide) {
  const pts = [];
  corners.forEach((c, i) => {
    const d = corners[(i + 1) % corners.length];
    for (let j = 0; j < perSide; j++) {
      const t = j / perSide;
      pts.push([c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t]);
    }
  });
  return pts;
}

const dot = (x, y, r, s = 3) => circle(x, y, r, r, 8, r * 0.25, s);

// ---------- the sixteen stances, 64 x 64 ----------

const GLYPHS = {
  Tiger: [
    brush([[10, 22], [8, 38], [20, 54], [32, 59], [44, 54], [56, 38], [54, 22]], 6, { a: 0.1, b: 0.1, head: 0.5 }),
    brush([[10, 24], [8, 10], [18, 8], [24, 15], [32, 13], [40, 15], [46, 8], [56, 10], [54, 24]], 5.4, { a: 0.1, b: 0.1, head: 0.5 }),
    brush([[32, 15], [32, 27]], 4.4, { a: 0.1, b: 0.7 }),
    brush([[23, 19], [32, 21], [41, 19]], 3.2, { b: 0.3 }),
    brush([[21, 26], [32, 29], [43, 26]], 3.2, { b: 0.3 }),
    brush([[17, 33], [21, 36], [26, 34]], 3.6, { b: 0.4 }),
    brush([[47, 33], [43, 36], [38, 34]], 3.6, { b: 0.4 }),
    brush([[28, 44], [32, 47], [36, 44]], 3.4, { a: 0.3, b: 0.3 }),
    brush([[32, 47], [32, 52]], 2.2, { b: 0.5 }),
    brush([[10, 42], [17, 43], [22, 45]], 2.4, { b: 0.8 }),
    brush([[54, 42], [47, 43], [42, 45]], 2.4, { b: 0.8 }),
  ],
  Dragon: [
    brush([[52, 8], [42, 6], [38, 14], [46, 22], [52, 32], [42, 42], [26, 34], [14, 38], [20, 50], [32, 54]], 5.6, { a: 0.1, b: 0.45, n: 4 }),
    brush([[52, 8], [58, 11], [61, 8]], 3.6, { b: 0.7 }),
    brush([[44, 8], [46, 3], [52, 2]], 1.9, { b: 0.7 }),
    brush([[52, 11], [58, 17], [58, 24]], 1.8, { b: 0.8 }),
    brush([[42, 20], [36, 18], [33, 22]], 2.2, { b: 0.7 }),
    brush([[30, 37], [24, 28], [17, 28]], 2.2, { b: 0.7 }),
  ],
  Crab: [
    brush([[16, 34], [24, 26], [40, 26], [48, 34], [40, 44], [24, 44], [17, 36]], 7, { a: 0.1, b: 0.14, head: 0.6 }),
    brush([[16, 30], [8, 24], [10, 14], [17, 12]], 4.4, { b: 0.3 }),
    brush([[10, 16], [15, 18], [18, 13]], 3),
    brush([[48, 30], [56, 24], [54, 14], [47, 12]], 4.4, { b: 0.3 }),
    brush([[54, 16], [49, 18], [46, 13]], 3),
    brush([[18, 42], [9, 44], [5, 51]], 2.6, { b: 0.7 }),
    brush([[23, 46], [17, 51], [15, 58]], 2.6, { b: 0.7 }),
    brush([[46, 42], [55, 44], [59, 51]], 2.6, { b: 0.7 }),
    brush([[41, 46], [47, 51], [49, 58]], 2.6, { b: 0.7 }),
    dot(28, 22, 1.7),
    dot(36, 22, 1.7),
  ],
  Elephant: [
    brush([[48, 22], [38, 12], [24, 14], [18, 26], [16, 40], [10, 50], [6, 44]], 7.5, { a: 0.14, b: 0.3, n: 4 }),
    brush([[34, 16], [50, 14], [56, 28], [48, 40], [38, 36]], 4.4, { b: 0.4 }),
    brush([[21, 34], [25, 42], [31, 43]], 3.2, { b: 0.7 }),
    brush([[44, 38], [42, 48], [44, 58]], 6, { b: 0.2 }),
    brush([[28, 40], [27, 50], [28, 58]], 5.6, { b: 0.2 }),
    dot(26, 23, 1.6),
  ],
  Monkey: [
    brush([[22, 18], [14, 22], [13, 34], [22, 44], [36, 44]], 8, { a: 0.14, b: 0.3 }),
    circle(29, 16, 8.5, 8, 10, 1.1, 5),
    brush([[36, 44], [48, 48], [56, 40], [50, 32], [44, 36]], 3.2, { a: 0.1, b: 0.5 }),
    brush([[18, 28], [30, 34], [36, 28]], 3.8, { b: 0.5 }),
    brush([[22, 44], [18, 52], [24, 56]], 4.4, { b: 0.5 }),
    brush([[33, 44], [34, 52], [40, 55]], 4.4, { b: 0.5 }),
  ],
  Mantis: [
    wobble(polygon([[42, 6], [55, 12], [45, 19]], 2), 1, 4),
    brush([[43, 17], [38, 26], [28, 36], [15, 56]], 5.6, { a: 0.1, b: 0.65 }),
    brush([[37, 24], [24, 15], [18, 25], [27, 33]], 3.7, { b: 0.5 }),
    brush([[20, 20], [14, 14], [16, 7]], 2.4, { b: 0.7 }),
    brush([[31, 33], [40, 42], [50, 44], [58, 56]], 2.2, { b: 0.6 }),
    brush([[28, 37], [22, 46], [32, 58]], 2.2, { b: 0.6 }),
    brush([[47, 8], [52, 3], [60, 3]], 1.4, { b: 0.8 }),
  ],
  Crane: [
    brush([[34, 36], [24, 32], [22, 20], [28, 12], [20, 8]], 3.8, { a: 0.1, b: 0.25 }),
    brush([[21, 8], [12, 11], [4, 12]], 2.6, { b: 0.9 }),
    brush([[24, 32], [40, 20], [60, 20]], 8.5, { a: 0.12, b: 0.6 }),
    brush([[27, 37], [42, 38], [57, 26]], 6.5, { a: 0.14, b: 0.55 }),
    brush([[33, 39], [32, 50], [34, 61]], 1.9, { b: 0.4 }),
    brush([[39, 38], [42, 49], [41, 60]], 1.9, { b: 0.4 }),
    dot(25, 7, 1.8, 9),
  ],
  Boar: [
    brush([[8, 38], [14, 22], [30, 16], [46, 22], [56, 34]], 9.5, { a: 0.12, b: 0.24 }),
    brush([[10, 37], [28, 46], [50, 38]], 5.5, { a: 0.14, b: 0.3 }),
    brush([[10, 34], [4, 39], [8, 44]], 5, { b: 0.4 }),
    brush([[10, 43], [14, 38], [17, 34]], 2.2, { b: 0.8 }),
    brush([[24, 44], [23, 50], [25, 56]], 5, { b: 0.2 }),
    brush([[44, 42], [46, 50], [44, 56]], 5, { b: 0.2 }),
    brush([[56, 34], [61, 30], [59, 25]], 2, { b: 0.8 }),
    brush([[20, 16], [24, 11], [28, 14]], 3.2, { b: 0.7 }),
  ],
  Frog: [
    circle(32, 34, 13, 15, 10, 1.2, 6),
    circle(23, 18, 5.4, 5, 8, 0.6, 6),
    circle(41, 18, 5.4, 5, 8, 0.6, 2),
    brush([[20, 26], [9, 24], [7, 14], [3, 9]], 4.4, { b: 0.5 }),
    brush([[44, 26], [55, 24], [57, 14], [61, 9]], 4.4, { b: 0.5 }),
    brush([[22, 44], [7, 40], [6, 54], [15, 60]], 5.4, { b: 0.4 }),
    brush([[42, 44], [57, 40], [58, 54], [49, 60]], 5.4, { b: 0.4 }),
  ],
  Rabbit: [
    circle(36, 42, 16, 13, 10, 1.4, 8),
    circle(21, 33, 8.8, 8, 10, 1, 2),
    brush([[20, 28], [17, 16], [24, 5]], 5, { a: 0.1, b: 0.5 }),
    brush([[24, 28], [28, 16], [37, 9]], 5, { a: 0.1, b: 0.5 }),
    brush([[24, 53], [34, 58], [48, 56]], 4, { a: 0.14, b: 0.4 }),
    circle(53, 44, 3.4, 3.4, 7, 0.5, 2),
  ],
  Eel: [
    brush([[6, 18], [18, 12], [30, 20], [36, 34], [48, 42], [58, 34]], 7.5, { a: 0.08, b: 0.8, n: 4 }),
    brush([[9, 13], [4, 16], [6, 22]], 3.6, { b: 0.5 }),
    brush([[20, 10], [30, 13], [38, 26]], 1.8, { b: 0.7 }),
    brush([[26, 28], [32, 38], [42, 46]], 1.8, { b: 0.7 }),
  ],
  Goose: [
    brush([[37, 38], [24, 28], [28, 14], [20, 7]], 5.4, { a: 0.14, b: 0.2 }),
    brush([[21, 7], [14, 9], [8, 13]], 3.6, { b: 0.8 }),
    brush([[24, 36], [36, 52], [54, 42], [62, 32]], 8, { a: 0.14, b: 0.6 }),
    brush([[30, 36], [42, 30], [58, 34]], 5.5, { a: 0.14, b: 0.5 }),
    brush([[36, 51], [35, 57], [30, 61]], 2, { b: 0.7 }),
    brush([[43, 50], [43, 56], [38, 61]], 2, { b: 0.7 }),
  ],
  Horse: [
    brush([[46, 60], [46, 42], [38, 24], [24, 14], [16, 16]], 12, { a: 0.1, b: 0.3 }),
    brush([[26, 13], [15, 21], [7, 32], [10, 37], [17, 33], [27, 27]], 7.5, { a: 0.2, b: 0.25 }),
    brush([[24, 13], [26, 6], [30, 3]], 3.6, { b: 0.7 }),
    brush([[26, 9], [40, 8], [50, 18], [56, 34]], 3.4, { a: 0.1, b: 0.7 }),
    brush([[34, 13], [48, 22], [59, 42]], 3, { a: 0.1, b: 0.8 }),
    brush([[30, 60], [34, 46], [32, 36]], 4.6, { a: 0.1, b: 0.7 }),
  ],
  Rooster: [
    brush([[18, 18], [22, 32], [30, 44], [42, 42]], 8.5, { a: 0.14, b: 0.3 }),
    circle(17, 16, 5.8, 5.2, 8, 0.7, 4),
    brush([[12, 10], [14, 4], [19, 8], [22, 3], [26, 11]], 3, { b: 0.4 }),
    brush([[12, 17], [8, 18], [5, 21]], 2.6, { b: 0.9 }),
    brush([[14, 22], [13, 26], [16, 28]], 3, { b: 0.7 }),
    brush([[30, 32], [44, 16], [60, 22]], 5.2, { a: 0.14, b: 0.75 }),
    brush([[34, 38], [48, 28], [61, 38]], 4.4, { a: 0.14, b: 0.75 }),
    brush([[36, 42], [48, 42], [56, 52]], 3.6, { a: 0.14, b: 0.75 }),
    brush([[28, 44], [28, 54], [24, 60]], 2.4, { b: 0.5 }),
    brush([[35, 44], [37, 54], [33, 60]], 2.4, { b: 0.5 }),
  ],
  Ox: [
    brush([[32, 25], [15, 25], [5, 16], [9, 5]], 5.6, { a: 0.1, b: 0.75 }),
    brush([[32, 25], [49, 25], [59, 16], [55, 5]], 5.6, { a: 0.1, b: 0.75 }),
    wobble(polygon([[20, 24], [44, 24], [39, 48], [36, 56], [28, 56], [25, 48]], 2), 1.2, 3),
    brush([[20, 28], [11, 28], [6, 33]], 4, { b: 0.7 }),
    brush([[44, 28], [53, 28], [58, 33]], 4, { b: 0.7 }),
  ],
  Cobra: [
    wobble(polygon([[33, 6], [43, 10], [49, 22], [46, 34], [36, 41], [30, 41], [20, 34], [17, 22], [23, 10]], 2), 1, 6),
    brush([[33, 39], [35, 47], [48, 49], [52, 55], [38, 60], [12, 57]], 6, { a: 0.1, b: 0.65 }),
    brush([[33, 7], [31, 2], [28, 1]], 1.3, { b: 0.9 }),
    brush([[33, 7], [33, 2], [37, 1]], 1.3, { b: 0.9 }),
  ],
};

const glyphs = Object.fromEntries(Object.entries(GLYPHS).map(([k, v]) => [k, v.join('')]));

// ---------- marks ----------

const torii = (o = {}) => {
  const w = o.w ?? 1;
  return [
    brush([[4, 13], [14, 15], [50, 15], [60, 13]], 5.6 * w, { a: 0.1, b: 0.1, head: 0.6 }),
    brush([[7, 24], [32, 24], [57, 24]], 3.4 * w, { a: 0.08, b: 0.08, head: 0.7 }),
    brush([[16, 13], [15, 36], [13, 58]], 4.6 * w, { a: 0.04, b: 0.08, head: 0.8 }),
    brush([[48, 13], [49, 36], [51, 58]], 4.6 * w, { a: 0.04, b: 0.08, head: 0.8 }),
    brush([[32, 16], [32, 24]], 3 * w, { a: 0.04, b: 0.04, head: 0.9 }),
  ].join('');
};

function enso(cx, cy, r, w, seed) {
  const pts = [];
  const turn = 1.86;
  for (let i = 0; i <= 12; i++) {
    const t = -2.1 + (i / 12) * turn * Math.PI;
    const rr = r * (1 + 0.016 * Math.sin(i * 1.7 + seed));
    pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
  }
  return brush(pts, w, { a: 0.1, b: 0.5, n: 4, seed });
}

function splash(seed) {
  const r = rng(seed);
  const core = [];
  const arms = 22;
  for (let i = 0; i < arms; i++) {
    const t = (i / arms) * Math.PI * 2;
    const spike = i % 2 ? 26 + r() * 6 : 34 + r() * 14;
    core.push([50 + Math.cos(t) * spike, 50 + Math.sin(t) * spike]);
  }
  let d = smoothClosed(core);
  for (let i = 0; i < 11; i++) {
    const t = r() * Math.PI * 2;
    const dist = 44 + r() * 8;
    d += dot(50 + Math.cos(t) * dist, 50 + Math.sin(t) * dist, 0.9 + r() * 1.8, i);
  }
  return d;
}

// The board's lines, brushed rather than ruled. 500 x 500.
const gridLines = [100, 200, 300, 400]
  .flatMap((v, i) => [
    brush([[v, 4], [v + 1.5, 250], [v - 1, 496]], 2.6, { a: 0.03, b: 0.12, head: 0.5, seed: i + 2 }),
    brush([[4, v], [250, v - 1.5], [496, v + 1]], 2.6, { a: 0.03, b: 0.12, head: 0.5, seed: i + 9 }),
  ])
  .join('');

const marks = {
  grid: gridLines,
  torii: torii(),
  // Blot for a legal destination.
  blot: circle(50, 50, 46, 44, 12, 7, 11),
  // Brush circle: a chosen piece, or a piece that can be taken.
  enso: enso(50, 50, 40, 9, 3),
  splash: splash(5),
  // Student: a river stone. Master: a tall pointed tablet, tip toward the enemy.
  student: circle(50, 50, 39, 37, 12, 1.6, 21),
  master: wobble(polygon([[50, 3], [78, 21], [86, 95], [14, 95], [22, 21]], 3), 1.1, 9),
  stone: circle(50, 54, 36, 30, 10, 5, 4),
  stream: [
    brush([[6, 26], [28, 16], [52, 30], [76, 18], [96, 26]], 7, { a: 0.1, b: 0.5, n: 4 }),
    brush([[4, 50], [26, 40], [50, 54], [74, 42], [96, 50]], 9, { a: 0.1, b: 0.5, n: 4 }),
    brush([[6, 74], [28, 64], [52, 78], [76, 66], [94, 74]], 7, { a: 0.1, b: 0.5, n: 4 }),
  ].join(''),
  strokeA: brush([[2, 7], [90, 5.5], [200, 7], [320, 5], [398, 6.5]], 6.5, { a: 0.03, b: 0.35, n: 4 }),
  strokeB: brush([[2, 5], [110, 7], [230, 5], [330, 7], [398, 5.5]], 4.6, { a: 0.05, b: 0.5, n: 4 }),
};

// The logo seal: a vermilion block with a torii cut out of it and one stone
// beneath the arch, for the two ways of winning.
const sealOuter = wobble(polygon([[6, 6], [94, 5], [95, 94], [5, 95]], 6), 2.2, 13);
marks.seal = sealOuter;
marks.sealRound = circle(50, 50, 45, 45, 18, 2.2, 17);
marks.sealCut = [
  brush([[20, 28], [34, 31], [66, 31], [80, 28]], 7, { a: 0.08, b: 0.08, head: 0.7 }),
  brush([[26, 42], [50, 42], [74, 42]], 4.4, { a: 0.06, b: 0.06, head: 0.8 }),
  brush([[35, 29], [34, 54], [32, 82]], 6, { a: 0.03, b: 0.06, head: 0.8 }),
  brush([[65, 29], [66, 54], [68, 82]], 6, { a: 0.03, b: 0.06, head: 0.8 }),
  dot(50, 70, 7.5, 3),
].join('');

// ---------- the island on the home screen, 400 x 300 ----------

const island = {
  far: smoothClosed([
    [-10, 220], [40, 214], [90, 196], [128, 180], [160, 170], [196, 186], [232, 192], [268, 212], [330, 220], [410, 224], [410, 232], [-10, 232],
  ]),
  near: smoothClosed([
    [230, 228], [262, 214], [290, 204], [312, 198], [340, 208], [372, 214], [412, 212], [412, 232], [230, 232],
  ]),
  arch: torii({ w: 1.08 }),
  water: [
    brush([[58, 238], [140, 236], [214, 239]], 2.6, { a: 0.1, b: 0.6, n: 4 }),
    brush([[176, 247], [244, 245], [344, 248]], 2.2, { a: 0.1, b: 0.6, n: 4 }),
    brush([[92, 257], [156, 255], [238, 258]], 1.9, { a: 0.1, b: 0.6, n: 4 }),
    brush([[236, 266], [288, 265], [330, 267]], 1.6, { a: 0.1, b: 0.6, n: 4 }),
  ].join(''),
};

const out = `// Generated by scripts/gen-art.mjs. Do not edit by hand.

export const GLYPHS: Record<string, string> = ${JSON.stringify(glyphs, null, 2)};

export const MARKS = ${JSON.stringify(marks, null, 2)} as const;

export const ISLAND = ${JSON.stringify(island, null, 2)} as const;
`;

writeFileSync(fileURLToPath(new URL('../src/art/generated.ts', import.meta.url)), out);
console.log(`generated.ts: ${(out.length / 1024).toFixed(1)} KB`);
