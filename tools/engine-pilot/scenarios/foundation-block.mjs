// foundation-block.mjs
// Streetlifting_16w vk 1-4 (foundation + deload vk 4).
// 4 päivää/viikko: MA (1), TI (2), TO (4), LA (6).

export const FOUNDATION_BLOCK = {
  id: "foundation-block",
  label: "Foundation 4 vk (streetlifting_16w vk 1-4)",
  mesocycleType: "streetlifting_16w",
  weekRange: [1, 4],
  daysPerWeek: 4,
  days: (() => {
    const out = [];
    for (let w = 1; w <= 4; w++) {
      for (const dow of [1, 2, 4, 6]) {
        out.push({ weekNum: w, dayOfWeek: dow });
      }
    }
    return out;
  })(),
};

export default FOUNDATION_BLOCK;
