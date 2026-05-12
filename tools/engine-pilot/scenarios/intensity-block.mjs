// intensity-block.mjs
// Streetlifting_16w vk 9-12 (intensity + deload vk 12).

export const INTENSITY_BLOCK = {
  id: "intensity-block",
  label: "Intensity 4 vk (streetlifting_16w vk 9-12)",
  mesocycleType: "streetlifting_16w",
  weekRange: [9, 12],
  daysPerWeek: 4,
  days: (() => {
    const out = [];
    for (let w = 9; w <= 12; w++) {
      for (const dow of [1, 2, 4, 6]) {
        out.push({ weekNum: w, dayOfWeek: dow });
      }
    }
    return out;
  })(),
};

export default INTENSITY_BLOCK;
