// strength-block.mjs
// Streetlifting_16w vk 5-8 (strength + deload vk 8).
// Sama rakenne kuin foundation: 4 päivää/vk (MA/TI/TO/LA).
// Käyttää SAMAN mesocycle:n (streetlifting_16w), mutta runner alkaa vk:sta 5.

export const STRENGTH_BLOCK = {
  id: "strength-block",
  label: "Strength 4 vk (streetlifting_16w vk 5-8)",
  mesocycleType: "streetlifting_16w",
  weekRange: [5, 8],
  daysPerWeek: 4,
  days: (() => {
    const out = [];
    for (let w = 5; w <= 8; w++) {
      for (const dow of [1, 2, 4, 6]) {
        out.push({ weekNum: w, dayOfWeek: dow });
      }
    }
    return out;
  })(),
};

export default STRENGTH_BLOCK;
