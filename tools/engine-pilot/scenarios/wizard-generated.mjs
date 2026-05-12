// wizard-generated.mjs
// Generic 4-week custom block (käytetty profiileilla joilla on ei-streetlifting meso).
// Mesocycle-tyyppi tulee profiilin mesoConfig.type-kentästä.

export const WIZARD_GENERATED = {
  id: "wizard-generated",
  label: "Wizard-generated 4 vk (profiilikohtainen)",
  mesocycleType: null, // profile.mesoConfig.type
  weekRange: [1, 4],
  daysPerWeek: 3, // default 3, voi olla 4
  days: (() => {
    const out = [];
    for (let w = 1; w <= 4; w++) {
      for (const dow of [1, 3, 5]) {
        // MA/KE/PE
        out.push({ weekNum: w, dayOfWeek: dow });
      }
    }
    return out;
  })(),
};

export default WIZARD_GENERATED;
