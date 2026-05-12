// multi-block-issurin.mjs
// Multi-block Issurin: hypertrofia (4 vk) → maksimivoima (4 vk) → intensifikaatio (4 vk) → peaking (2 vk) = 14 vk.
// Käytetään profiileilla joilla on kilpailutavoite mutta ei streetlifting.

export const MULTI_BLOCK_ISSURIN = {
  id: "multi-block-issurin",
  label: "Multi-block Issurin 14 vk (hyp → max → int → peak)",
  mesocycleType: "custom-multi-block",
  weekRange: [1, 14],
  daysPerWeek: 3,
  days: (() => {
    const out = [];
    for (let w = 1; w <= 14; w++) {
      for (const dow of [1, 3, 5]) {
        out.push({ weekNum: w, dayOfWeek: dow });
      }
    }
    return out;
  })(),
};

export default MULTI_BLOCK_ISSURIN;
