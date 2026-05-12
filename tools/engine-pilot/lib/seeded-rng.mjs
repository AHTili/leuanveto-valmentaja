// seeded-rng.mjs
// Mulberry32 — fast deterministic 32-bit PRNG.
// Saman seed:n kanssa sama trajektori, joten harness-ajot ovat reproduceable.

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Normaalijakauma Box-Mullerilla — palauttaa N(0, 1) -arvon seeded RNG:llä.
export function gaussianFromRng(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Apuri: clamp + round to step
export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

export function roundStep(x, step) {
  return Math.round(x / step) * step;
}
