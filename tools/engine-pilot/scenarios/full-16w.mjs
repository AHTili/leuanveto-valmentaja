// full-16w.mjs
// Koko streetlifting_16w vk 1-16 — go/no-go-skenaario Akselille.

export const FULL_16W = {
  id: "full-16w",
  label: "Full 16 vk (streetlifting_16w vk 1-16)",
  mesocycleType: "streetlifting_16w",
  weekRange: [1, 16],
  daysPerWeek: 4,
  days: (() => {
    const out = [];
    for (let w = 1; w <= 16; w++) {
      for (const dow of [1, 2, 4, 6]) {
        out.push({ weekNum: w, dayOfWeek: dow });
      }
    }
    return out;
  })(),
};

export default FULL_16W;
