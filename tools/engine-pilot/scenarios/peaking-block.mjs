// peaking-block.mjs
// Streetlifting_16w vk 13-16 (peaking → kisapäivä).

export const PEAKING_BLOCK = {
  id: "peaking-block",
  label: "Peaking 4 vk (streetlifting_16w vk 13-16)",
  mesocycleType: "streetlifting_16w",
  weekRange: [13, 16],
  daysPerWeek: 4,
  days: (() => {
    const out = [];
    for (let w = 13; w <= 16; w++) {
      for (const dow of [1, 2, 4, 6]) {
        out.push({ weekNum: w, dayOfWeek: dow });
      }
    }
    return out;
  })(),
};

export default PEAKING_BLOCK;
