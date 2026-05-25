// engine.js — Computation engine: e1RM, baselines, readiness, recommend(), mesocycle, decisionTrace
// LeVe AI v4.34.36 — A: PLAN_BASED setRole-filteri (vain top-sarjat, ei accessoreja).
// B: Multi-week-aware cap (cap × ceil(daysSinceLast/7), max 3×). C: accessoryProgression
// Vx-overshoot bonus (V+1 → +increment, V+2 → +1.5×, V+3 → +2×) + sub-target hold (V1-V2)
// + V0 deload. Korjaa Phase 0:n MA/TO/LA-päivien optimoinnin: TO Dippi 58.5 → 60+ kg,
// accessoryt V5-target-V3 → +5 kg vaikka consecutive=1.

import {
  uid, todayISO, parseNumericInput,
  getAllSessions, getSetsForSession, getAllSets, getSetsForMovement,
  getActiveMesocycle, saveMesocycle, createDefaultMesocycle, createPeakingMesocycle,
  getSettings, saveBaseline, getBaseline,
  saveRecommendation, saveDecisionTrace,
  getAllMovements, getMovementProgress, saveMovementProgress,
  getMeasurementsByType,
  getAllMesocycles,
  PULL_VOLUME_CATEGORIES,
  VARIANT_DAY_TYPE_MAP,
  ACCESSORY_SLOT_CATALOG,
  maintenanceStatus,
} from "./data.js";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DAY_TYPE_MULTIPLIERS = {
  heavy: 1.0,
  volume: 0.6,
  speed: 0.4,
  competition: 1.0,
  accessory: 0.0,
  rest: 0,
};

const DAY_TYPE_SET_RECIPES = {
  heavy: { sets: 5, repsRange: [2, 3], targetVxRange: [1, 2] },
  volume: { sets: [4, 5], repsRange: [4, 6], targetVxRange: [2, 3] },
  speed: { sets: [4, 5], repsRange: [2, 2], targetVxRange: [4, 5] },
};

const REST_RECOMMENDATIONS = {
  heavy: { minSec: 180, maxSec: 300, label: "3–5 min" },
  volume: { minSec: 120, maxSec: 180, label: "2–3 min" },
  speed: { minSec: 90, maxSec: 120, label: "1.5–2 min" },
  competition: { minSec: 300, maxSec: 600, label: "5–10 min" },
  accessory: { minSec: 90, maxSec: 150, label: "1.5–2.5 min" },
  accessoryCompound: { minSec: 120, maxSec: 180, label: "2–3 min" },
  accessoryIsolation: { minSec: 60, maxSec: 90, label: "1–1.5 min" },
};

// ═══════════════════════════════════════════════════════════════
// PROGRESSION_CONFIG (v4.35.0 — Eliittitason progressio-malli)
// ═══════════════════════════════════════════════════════════════
//
// Keskitetty konfiguraatio computeProgressionTarget-funktiolle. Jokainen luku
// on dokumentoitu lähteen kanssa. Kalibrointi tehdään tässä, ei inline.
//
// Lähteet (peer-reviewed + vakiintunut käytäntö):
//   • Helms et al. 2018 "RPE vs Percentage 1RM Loading"
//     Frontiers in Physiology 9:247
//   • Helms et al. 2016 "RIR-Based RPE Scale for Resistance Training"
//     Strength & Conditioning Journal 38(4):42-49
//   • Tuchscherer / Reactive Training Systems RPE-tables (julkinen)
//   • Cumming et al. 2024 "Muscle memory in humans" J Physiology
//   • Psilander et al. 2018 "Effects of training, detraining, retraining"
//     J Appl Physiol 126(6):1636-1645
//   • Bruusgaard et al. 2010 "Myonuclei acquired by overload exercise" PNAS
//   • Issurin 2010 "New Horizons for Methodology of Training Periodization"
//     Sports Medicine 40(3):189-206
//
const PROGRESSION_CONFIG = {
  // Helms 2018: 0.5 RPE-yksikön poikkeama target-arvosta = 2% kuorma-säätö
  // → 1.0 RPE = 4%. Vara-skaalalla: 1.0 Vx = 4% (RPE = 10 - Vx).
  // Käytetään lievennettynä session-välillä (puolitettuna), koska Helms 2018
  // -kaava on alunperin saman session sisäinen autoregulaatio.
  HELMS_VX_TO_LOAD_PCT_BETWEEN_SESSIONS: 0.02,

  // Helms 2018 + Renaissance Periodization: viikoittainen progressio PR-vaiheessa
  // edistyneelle voimanostajalle = +2.5%/viikko same target RPE.
  // Vahvistus: %1RM-ryhmä Helms 2018:ssa nostaa kuormaa +2.5% per viikko jos
  // edellinen vk onnistui.
  WEEKLY_BASELINE_PR_PHASE: 0.025,

  // Cumming 2024 / Psilander 2018 / Bruusgaard 2010 — muscle memory / regain.
  // Tutkimus: 12 vk training → 12 vk detraining → 8 vk retraining palautti tason.
  // Eli retraining = ~33% nopeampi kuin alkutraining (12/8 = 1.50).
  // Aggressiivinen regain (kun ratio < 0.85) saa multiplierin 2.0 (Psilander
  // 2018 yläraja: nopein retraining-vauhti aikaisempaan kuntoon palatessa).
  REGAIN_THRESHOLD_FAR: 0.85,
  REGAIN_THRESHOLD_NEAR: 0.95,
  REGAIN_MULTIPLIER_FAR: 2.0,
  REGAIN_MULTIPLIER_NEAR: 1.5,

  // V0-grindi-suoja (atletin profiili: V0-grindi-taipumus).
  // V0-fail viime sessiossa → konservatiivinen palautus −5% seuraavalle.
  // Lähde: atletin profiili + Tuchscherer "don't grind reps" -periaate.
  V0_GRINDI_PENALTY: -0.05,

  // Hard-cap fysiologisen progressio-rajan ylläpitämiseksi.
  // Issurin 2010 + Helms 2018 + Tuchscherer RTS: max +15%/viikko on äärimmäinen
  // (käytännössä vain regain-vaiheen alkupisteessä).
  HARD_CAP_PER_WEEK: 0.15,

  // Toleranssi pyöristys-eroille (kg).
  ROUNDING_TOLERANCE: 0.25,
};

/**
 * Pick the appropriate rest recommendation for an exercise based on its role,
 * category, target Vx and reps. Compound accessories with loaded targetVx need
 * more rest to avoid grinding; isolation work (curls, delt raises) stays short.
 *
 * v4.27.8 korjaukset:
 *  1) Heavy-single-detektio (reps ≤ 3 AND targetVx ≤ 2) → heavy rest 3-5 min
 *     riippumatta roolista tai dayType:stä. Fix: MU primary 3×1 V2 Saturday
 *     (dayType=volume → sai 2-3 min, pitäisi 3-5), top-single RPE 9+ secondary
 *     (sai 2-3, pitäisi 3-5), heavy secondary etukyykky 3×3 V2.
 *  2) Backoff V ≥ 3 → volume rest 2-3 min (ei heavy 3-5) — backoff on määritelmän
 *     mukaan kevyempi toisto-volyymin lisä, ei max-lift.
 *  3) "alaraaja" lisätty compoundCategories-settiin — etukyykky/takakyykky
 *     ilman alaryhmää saivat aiemmin generic accessory 1.5-2.5 min.
 *
 * @param {object} exercise - { role, category, targetVx, reps }
 * @param {string} dayType - "heavy" | "volume" | "speed" | "competition"
 * @returns {{ minSec: number, maxSec: number, label: string }}
 */
function pickRestForExercise(exercise, dayType) {
  if (!exercise) return REST_RECOMMENDATIONS.heavy;

  // Competition attempts always get long rest — katkaistaan ensimmäiseksi.
  if (exercise.role === "opener" || exercise.role === "attempt2" || exercise.role === "attempt3") {
    return REST_RECOMMENDATIONS.competition;
  }

  // Heavy singles / top sets: reps ≤ 3 AND Vx ≤ 2 → heavy rest riippumatta roolista.
  // Kattaa MU 3×1 V2 (Saturday volume), top single RPE 9+ secondary, heavy secondary
  // etukyykky 3×3 V2. Näille 2-3 min ei riitä palauttamaan CNS:ää.
  if (typeof exercise.reps === "number" && exercise.reps <= 3 &&
      typeof exercise.targetVx === "number" && exercise.targetVx <= 2) {
    return REST_RECOMMENDATIONS.heavy;
  }

  // Primary seuraa dayType:ä (heavy-heavy, volume-volume, speed-speed).
  if (exercise.role === "primary") {
    return REST_RECOMMENDATIONS[dayType] || REST_RECOMMENDATIONS.heavy;
  }

  // Backoff: V ≥ 3 = tavanomainen volume-backoff → volume rest (2-3 min).
  // V ≤ 2 backoff = raskas (harvinainen) → seuraa dayType:ä.
  if (exercise.role === "backoff") {
    if (typeof exercise.targetVx === "number" && exercise.targetVx >= 3) {
      return REST_RECOMMENDATIONS.volume;
    }
    return REST_RECOMMENDATIONS[dayType] || REST_RECOMMENDATIONS.heavy;
  }

  // Accessory / support / secondary: erottele compound vs isolation.
  const compoundCategories = new Set([
    "vertikaaliveto", "vertikaalityöntö",
    "horisontaaliveto", "horisontaalityöntö",
    "polvidominantti", "lonkkadominantti",
    "alaraaja",  // v4.27.8: etukyykky/takakyykky kun kategoriana yleinen alaraaja
  ]);
  const isCompoundCategory = compoundCategories.has(exercise.category);
  const hasLoadedTarget = exercise.targetVx !== null && exercise.targetVx !== undefined && exercise.targetVx <= 3;
  const isLowRep = typeof exercise.reps === "number" && exercise.reps <= 8;

  if (isCompoundCategory && (hasLoadedTarget || isLowRep)) {
    return REST_RECOMMENDATIONS.accessoryCompound;
  }
  if (!hasLoadedTarget && (typeof exercise.reps !== "number" || exercise.reps >= 10)) {
    return REST_RECOMMENDATIONS.accessoryIsolation;
  }
  return REST_RECOMMENDATIONS.accessory;
}

const READINESS_CLASSES = { GREEN: 0, YELLOW: 1, RED: 2 };

// ═══════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mad(arr) {
  const med = median(arr);
  return median(arr.map((x) => Math.abs(x - med)));
}

function madSigma(arr) {
  const rawMad = mad(arr);
  const sigma = 1.4826 * rawMad;
  return sigma === 0 ? 1e-6 : sigma;
}

function zScore(value, med, sigma) {
  return (value - med) / Math.max(1e-6, sigma);
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

// ═══════════════════════════════════════════════════════════════
// e1RM CALCULATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * System e1RM: uses bodyweight + external load + Epley with Vara
 * e1RM_system = systemLoadKg × (1 + (reps + Vx) / 30)
 */
function e1rmSystem(bodyweightKg, externalLoadKg, reps, vara) {
  const systemLoad = bodyweightKg + externalLoadKg;
  if (systemLoad <= 0 || reps < 1) return null;
  // Vx ??= 1: käyttäjällä grinding-taipumus, tyhjä raportointi tarkoittaa tyypillisesti V0-V1
  const effectiveReps = reps + (vara ?? 1);
  return systemLoad * (1 + effectiveReps / 30);
}

/**
 * External e1RM: e1RM_system - bodyweight
 */
function e1rmExternal(bodyweightKg, externalLoadKg, reps, vara) {
  const sys = e1rmSystem(bodyweightKg, externalLoadKg, reps, vara);
  if (sys === null) return null;
  return Math.max(0, sys - bodyweightKg);
}

/**
 * Accessory / external-load e1RM.
 * Ilman Vx:ää: simple Epley = weight × (1 + reps / 30)
 * Vx annettu: Epley-Vara = weight × (1 + (reps + Vx) / 30)
 */
function e1rmAccessory(weightKg, reps, vara = null) {
  if (weightKg <= 0 || reps < 1) return null;
  const effectiveReps = reps + (vara ?? 0);
  return weightKg * (1 + effectiveReps / 30);
}

/**
 * β Round B-α-1 — Lähde 1: V/reps → odotettu %1RM.
 *
 * L46 "A puhtaana" -päätös: Epley-Vara identtisesti e1rmSystem-funktion
 * Epley-Vara-osan kanssa. EI tier-parametria — sama kaava kaikilla tier-
 * tasoilla (Taso 1/2/3). Brzycki ja conservative-cross-check rajattu pois
 * eksplisiittisesti (L46). Sisäinen konsistenssi e1RM-toteutuksen kanssa.
 *
 * Käänteinen suunta e1rmSystem:istä: jos sys-1RM = weight × (1 + maxReps/30),
 * niin weight = sys-1RM / (1 + maxReps/30) = sys-1RM × expectedPct,
 * missä expectedPct = 1 / (1 + maxReps/30).
 *
 * @param {number} maxReps — reps + Vx (todellinen max-yritys täydellä failureen asti)
 * @returns {number|null} expectedPct ∈ (0, 1] tai null jos invalid input
 */
function vRepsToExpectedPct(maxReps) {
  if (!Number.isFinite(maxReps) || maxReps < 1) return null;
  return 1 / (1 + maxReps / 30);
}

/**
 * β Round B-α-1 — Tier-resolveri.
 *
 * L48 B.i + C.iii — 3 polkua movement.tier-kentän tulkintaan:
 *   - number (1/2/3): vakio useimmille liikkeille
 *   - function: mesocycle-konteksti (esim. Muscle-up Taso 1 streetlifting_16w:ssä,
 *     Taso 3 muualla)
 *   - string "special": in-session-kuormaratkaisu (Heavy negative leuka,
 *     Board dippi) — säilyy nykyisellä loadPct-kaavalla
 *
 * @param {object} movement — PRESET_MOVEMENTS-record (vaadittu name + tier)
 * @param {object|null} mesocycle — aktiivinen mesosykli (vain function-tier:lle)
 * @returns {number|string} resolved tier (1/2/3 tai "special")
 */
function resolveTier(movement, mesocycle) {
  if (!movement) throw new Error("resolveTier: movement is required");
  const tier = movement.tier;
  if (typeof tier === "number") return tier;
  if (typeof tier === "function") return tier(mesocycle);
  if (typeof tier === "string" && tier === "special") return "special";
  throw new Error(
    `resolveTier: invalid tier for movement ${movement.name || "?"}: ${tier}`
  );
}

/**
 * β Round B-α-1 — Tier-pikkupredikaatti Lähde 2:n primer-routingille.
 * Käytetään myöhemmin α-2:n primer-mekaniikan aktivaation valitsemiseen.
 *
 * @param {object} movement
 * @param {object|null} mesocycle
 * @returns {boolean} true jos tier on 1 tai 2 (= primer aktiivinen Lähde 2:lle)
 */
function tier1Or2(movement, mesocycle) {
  const t = resolveTier(movement, mesocycle);
  return t === 1 || t === 2;
}

/**
 * v4.34.34: Movement-load-style resolver — keskitetty totuudenlähde "lisätäänkö
 * BW e1RM-laskuun?" -kysymykseen. Aiemmin koodi käytti kolmea eri proxyä
 * (mov.isPrimary, slot.role === "primary", primarySlotMeta.isBarbell), mikä
 * johti UI-tason e1RM-virheisiin (Takakyykky 293.8 kg = system, dippi
 * aliarvioitu = ext). Nyt kaikki UI- ja engine-laskut käyttävät tätä funktiota.
 *
 * - "system" → BW + ulkoinen kuorma (Lisäpainoleuanveto, Lisäpainodippi, MU)
 * - "external" → vain ulkoinen kuorma, ei BW (Takakyykky ja muut tankoliikkeet)
 * - undefined → accessory-style (käsipainot ym., ei BW)
 *
 * v4.34.35: nimi-pohjainen fallback käyttäjille joiden movement-rekisteri on
 * tallennettu ennen loadType-kentän käyttöönottoa (data export 2026-05-05 ei
 * sisältänyt loadType-kenttää → Lisäpainodippi & MU-variantit aliarvioituivat).
 */
const SYSTEM_LOAD_NAMES = new Set([
  // Vertikaaliveto: kaikki BW-pohjaiset leuanvedot ja MU
  "Lisäpainoleuanveto", "Vastaote-leuanveto", "Leuanveto (kehonpaino)",
  "Leuanveto chest-to-bar", "Paused pull-up", "Tempo pull-up",
  "Räjähtävä leuka", "Räjähtävä leuka (vyö)", "Räjähtävä leuanveto",
  "Muscle-up", "Muscle-up eksentrinen", "False grip pull-up",
  // Horisontaalityöntö: dippi + variantit
  "Lisäpainodippi", "BW dippi", "BW eksentrinen dippi", "Räjähtävä dippi",
  "Paused dip", "Tempo dip", "Ring dip",
]);
function isSystemLoadMovement(movement) {
  if (!movement) return false;
  if (movement.loadType === "system") return true;
  if (movement.loadType === "external") return false;
  // Legacy fallback 1: isPrimary=true tarkoitti aiemmin "Lisäpainoleuanveto"
  if (movement.isPrimary === true) return true;
  // Legacy fallback 2: nimi-pohjainen tunnistus käyttäjille joiden movement-rekisteri
  // ei sisällä loadType-kenttää (vanha schema).
  if (movement.name && SYSTEM_LOAD_NAMES.has(movement.name)) return true;
  return false;
}

/**
 * Calculate target load from e1RM backward:
 * targetSystemLoad = e1RM_system / (1 + effectiveReps / 30)
 * targetExternalLoad = targetSystemLoad - bodyweightKg
 */
function targetLoadFromE1RM(e1rmSys, bodyweightKg, targetReps, targetVx) {
  if (e1rmSys === null || e1rmSys <= 0) return null;
  const effectiveReps = targetReps + targetVx;
  const targetSystemLoad = e1rmSys / (1 + effectiveReps / 30);
  const external = targetSystemLoad - bodyweightKg;
  return roundToHalf(Math.max(0, external));
}

/**
 * v4.34.42 — Adaptive ceiling streak: tunnistaa "cal aliarvioitu" -tilanteen.
 *
 * Käyttäjäpalaute 2026-05-07: cfg.dippiExtKg=80 → ceiling 88, atletti suoritti
 * vk 2 TO 65.5 kg V3 perfect (PLAN_BASED 92.3 kg). Cap esti todellisen
 * kapasiteettinousun → vk 3 target jäi +0.5 kg vk 2:sta. Engine ei luottanut
 * toistuvaan PLAN_BASED-evidenssiin koska cap oli kiinteä cfg × 1.10.
 *
 * Korjaus: streak-pohjainen kerroin-nosto. Käy sessiot uusin → vanhin, laskee
 * peräkkäisten "perfect-execution + PLAN_BASED-e1RM > baseCeiling" -sessioiden
 * määrän. Bonus-portaikko (palautetaan kerroin-lisä baseen 1.10):
 *   1 streak → +0.00 (=1.10 base, ei muutosta)
 *   2 streak → +0.05 (=1.15)
 *   3+ streak → +0.10 (=1.20 max)
 *
 * Reset jos:
 *   - perfectionin rikkoutuminen (esim. V0 actualVx < targetVx, reps < target)
 *   - PLAN_BASED-e1RM <= baseCeiling (= sessio ei vahvistanut kasvua)
 *   - ei loadPct-tietoa kyseisestä sessio-päivästä
 *
 * Konservatismi V0-grindi-taipumukselle: 1 fail palauttaa kertoimen 1.10:een.
 *
 * @param {Array} topSets - kaikki primary-liikkeen setit (recentTopSets)
 * @param {Array} sessions - kaikki sessiot (date-lookupia varten)
 * @param {Object} mesocycle - aktiivinen mesosykli (loadPct-lookupia varten)
 * @param {boolean} isBarbell - load-tyyppi (false = system-load, +bw)
 * @param {number} bodyweightKg - oletus 91
 * @param {number} baseCeiling - cap-pohjataso (esim. cfg-PR × 1.10)
 * @returns {object} { streak, bonus, info }
 */
function computePerfectStreakCeilingBonus(topSets, sessions, mesocycle, isBarbell, bodyweightKg, baseCeiling) {
  if (!topSets || topSets.length === 0 || !mesocycle || !baseCeiling || baseCeiling <= 0) {
    return { streak: 0, bonus: 0, info: 'no-data' };
  }

  // Vain primary-work setit (sama suodatus kuin PLAN_BASED-blokissa, v4.34.36 BUG-FIX A)
  const primaryWork = topSets.filter(s => s.setRole === 'top');
  if (primaryWork.length === 0) return { streak: 0, bonus: 0, info: 'no-top-sets' };

  // Ryhmittele sessio-id:n mukaan, säilytä järjestys
  const sessGroups = new Map();
  const sessOrder = [];
  for (const s of primaryWork) {
    const sid = s.sessionId || `__nosess_${s.timestamp}`;
    if (!sessGroups.has(sid)) { sessGroups.set(sid, []); sessOrder.push(sid); }
    sessGroups.get(sid).push(s);
  }

  // Käy uusimmasta vanhimpaan, laske streak
  let streak = 0;
  for (let i = sessOrder.length - 1; i >= 0; i--) {
    const sets = sessGroups.get(sessOrder[i]);
    if (!sets || sets.length === 0) break;

    // Perfect execution: kaikki sarjat actualVx >= targetVx ja reps >= targetReps
    const perfect = sets.every(s =>
      s.actualVx !== null && s.actualVx !== undefined
      && s.targetVx !== null && s.targetVx !== undefined
      && s.actualVx >= s.targetVx
      && (s.reps ?? 0) >= (s.targetReps ?? 0)
    );
    if (!perfect) break;

    // Lookup loadPct kyseisestä mesosykli-viikosta+päivästä
    // (sama logiikka kuin PLAN_BASED_E1RM-blokki, v4.34.33 BUG-FIX 1.2)
    const sessId = sessOrder[i];
    const dateISO = sessions?.find(s => s.sessionId === sessId)?.dateISO
                  || sets[0]?.dateISO
                  || sets[0]?.timestamp?.slice(0, 10);
    if (!dateISO) break;

    const wk = getMesocycleWeek(mesocycle, dateISO);
    const dow = new Date(dateISO).getDay() || 7;
    const dayPlan = (wk !== null && wk !== undefined)
      ? mesocycle.weekPlans?.[wk - 1]?.days?.find(d => d.dayOfWeek === dow)
      : null;
    const primarySlot = dayPlan?.slots?.find(s => s.role === 'primary');
    const loadPct = primarySlot?.loadPct;
    if (!loadPct || loadPct <= 0 || loadPct > 1.0) break;

    // PLAN_BASED-e1RM tämän session medianloadista
    const loads = sets.map(x => x.externalLoadKg).filter(v => v > 0);
    if (loads.length === 0) break;
    const medLoad = median(loads);
    const planBasedE1RM = medLoad / loadPct;

    if (planBasedE1RM > baseCeiling) {
      streak++;
    } else {
      break; // sessio ei vahvistanut kasvua → streak ei kasva
    }
  }

  let bonus = 0;
  if (streak >= 3) bonus = 0.10;
  else if (streak >= 2) bonus = 0.05;
  return { streak, bonus, info: `streak=${streak}, bonus=+${(bonus*100).toFixed(0)}%` };
}

/**
 * v4.34.43 — CFG-DRIFT: engine oppii cfg-baseline-tason atletin todellisesta
 * suoriutumisesta.
 *
 * Käyttäjäpalaute 2026-05-07: "Toivoin että sovellus on niin mestarillinen
 * että se kykenee tunnistamaan potentiaalini." B+ streak (v4.34.42) reagoi
 * vk-tasolla mutta vain ceilingiin. CFG-DRIFT vaikuttaa **pohjaan** (cfg-
 * baseline) → koko ohjelma kalibroituu uudelleen kun engine tunnistaa
 * toistuvan ylityksen.
 *
 * KAKSI SIGNAALIA — velocity priorisoituu (atletti: "ohjelmointikone on
 * vara-arviointia parempi" — primer-velocity on objektiivinen, Vx subjektiivinen).
 *
 * SIGNAL B (priority): VELOCITY-PRIMER-TREND
 *   Vaatimus: vähintään 5 primer-velocity-mittausta historiassa.
 *   Logiikka: viim. 3 primer-velocity-mediaani vs baseline (10 viim.) -mediaani.
 *     - Jos viim. 3 mediaani > baseline × 1.05 (= +5 %): cfg += 1 % per
 *       peräkkäinen drift-sessio, max +5 % per blokki (4 vk).
 *   Velocity nopeutuminen samalla loadPct:llä = objektiivinen kapasiteettinousu.
 *
 * SIGNAL A (fallback): VX-OVERSHOOT
 *   Käytössä vain jos velocity-baseline n < 5.
 *   Logiikka: kuten B+ streak mutta vaikutus cfg-arvoon, ei ceilingiin.
 *     - 3+ peräkkäin perfect-execution + PLAN_BASED-e1RM > cfg × 1.10
 *     - cfg += 2.5 % per peräkkäinen, max +10 % per blokki
 *
 * RESET-EHDOT (molemmat signaalit):
 *   - Cal-päivä: drift-counter resetoi, cal-derived arvo lukitaan
 *   - V0-fail (työsarja): counter resetoi, cfg ei laske
 *   - RED readiness: counter resetoi
 *   - Blokki-vaihto (vk 4→5, 8→9, 12→13): counter resetoi
 *
 * Konservatismi V0-grindi-taipumukselle (atletin profiili): yksi V0 resetoi,
 * cfg vain nousee ei laske. PROGRESSION_FLOOR_CAP suojaa erikseen Epley-
 * aliarviolta, FAILURE_LOCKOUT V0-grindiltä.
 *
 * @param {Array} topSets - kaikki primary-liikkeen setit (top + readiness_test + cal)
 * @param {Array} sessions - kaikki sessiot (date-lookupia varten)
 * @param {Object} mesocycle - aktiivinen mesosykli (loadPct + cfg-arvot)
 * @param {boolean} isBarbell - load-tyyppi
 * @param {number} bodyweightKg - oletus 91
 * @param {number} cfgBaseline - nykyinen cfg-arvo (esim. cfg.dippiExtKg = 95)
 * @param {string} dateISO - request-päivä (käytetään blokki-rajan tunnistukseen)
 * @returns {object} { driftPct, signal, source, info, counter }
 */
function computeCfgDrift(topSets, sessions, mesocycle, isBarbell, bodyweightKg, cfgBaseline, dateISO) {
  if (!topSets || topSets.length === 0 || !mesocycle || !cfgBaseline || cfgBaseline <= 0) {
    return { driftPct: 0, signal: null, source: 'no-data', info: '', counter: 0 };
  }

  // Tunnista tämän sessio:n blokki (vk 1-4, 5-8, 9-12, 13-16)
  const currentWk = dateISO ? getMesocycleWeek(mesocycle, dateISO) : null;
  const blockOf = (wk) => wk == null ? null : Math.ceil(wk / 4);
  const currentBlock = blockOf(currentWk);

  // ═══ SIGNAL B: VELOCITY-PRIMER-TREND ═══
  // Käytä jos primer-velocity-baseline >= 5 mittausta
  const primerSets = topSets
    .filter(s => s.setRole === 'readiness_test' && s.velocityRep1 != null && s.velocityRep1 > 0)
    .sort((a, b) => (a.timestamp || a.dateISO || '').localeCompare(b.timestamp || b.dateISO || ''));

  if (primerSets.length >= 5) {
    // Baseline-mediaani 10 viim. mittauksesta
    const baselineWindow = primerSets.slice(-10).map(s => s.velocityRep1);
    const baselineMed = median(baselineWindow);

    // Viim. 3 primer-mediaani
    const recent3 = primerSets.slice(-3).map(s => s.velocityRep1);
    const recent3Med = median(recent3);

    if (baselineMed > 0) {
      const velDeltaPct = (recent3Med - baselineMed) / baselineMed;

      // Reset-tarkistus: käy 3 viim. primer-sessiota läpi, etsi reset-ehdot
      // (V0-fail samassa sessiossa primary-työsarjassa tai RED readiness)
      let driftValid = true;
      for (const ps of primerSets.slice(-3)) {
        // Etsi saman session primary-työsarjat
        const sessionWorkSets = topSets.filter(s =>
          s.sessionId === ps.sessionId && s.setRole === 'top'
        );
        const hasV0Fail = sessionWorkSets.some(s => s.actualVx === 0);
        if (hasV0Fail) { driftValid = false; break; }
      }

      if (driftValid && velDeltaPct >= 0.05) {
        // Counter: kuinka monta peräkkäistä viim. primeriä on yli baseline × 1.05?
        // (käännetty: uusin → vanhin, break kun ensimmäinen alle threshold)
        let counter = 0;
        for (let i = primerSets.length - 1; i >= 0; i--) {
          const v = primerSets[i].velocityRep1;
          if (v > baselineMed * 1.05) counter++;
          else break;
        }
        // Cap: drift max +5 % per blokki, +1 % per peräkkäinen drift-sessio
        const driftPctRaw = Math.min(0.05, counter * 0.01);
        return {
          driftPct: driftPctRaw,
          signal: 'velocity-trend',
          source: `velocity-primer (recent3 med ${recent3Med.toFixed(3)} m/s vs baseline ${baselineMed.toFixed(3)} m/s = +${(velDeltaPct*100).toFixed(1)}%, streak=${counter})`,
          info: `velDelta=+${(velDeltaPct*100).toFixed(1)}%, counter=${counter}`,
          counter,
          velDeltaPct,
        };
      }
      // Velocity-baseline on olemassa mutta ei näytä driftiä → ei drift signaalista B
      return {
        driftPct: 0, signal: 'velocity-trend', source: `velocity-stable (delta ${(velDeltaPct*100).toFixed(1)}%)`,
        info: `velocity-baseline n=${primerSets.length}, no drift`, counter: 0, velDeltaPct,
      };
    }
  }

  // ═══ SIGNAL A: VX-OVERSHOOT (fallback kun velocity-baseline puuttuu) ═══
  const primaryWork = topSets.filter(s => s.setRole === 'top');
  if (primaryWork.length === 0) {
    return { driftPct: 0, signal: 'vx-overshoot', source: 'no-top-sets', info: '', counter: 0 };
  }

  // Ryhmittele sessio-id:n mukaan, säilytä järjestys
  const sessGroups = new Map();
  const sessOrder = [];
  for (const s of primaryWork) {
    const sid = s.sessionId || `__nosess_${s.timestamp}`;
    if (!sessGroups.has(sid)) { sessGroups.set(sid, []); sessOrder.push(sid); }
    sessGroups.get(sid).push(s);
  }

  let counter = 0;
  for (let i = sessOrder.length - 1; i >= 0; i--) {
    const sets = sessGroups.get(sessOrder[i]);
    if (!sets || sets.length === 0) break;

    // Perfect execution
    const perfect = sets.every(s =>
      s.actualVx != null && s.targetVx != null
      && s.actualVx >= s.targetVx
      && (s.reps ?? 0) >= (s.targetReps ?? 0)
    );
    if (!perfect) break;

    // Lookup loadPct
    const sessId = sessOrder[i];
    const dateISOSess = sessions?.find(s => s.sessionId === sessId)?.dateISO
                     || sets[0]?.dateISO || sets[0]?.timestamp?.slice(0, 10);
    if (!dateISOSess) break;

    const wk = getMesocycleWeek(mesocycle, dateISOSess);
    const dow = new Date(dateISOSess).getDay() || 7;
    const dayPlan = (wk != null) ? mesocycle.weekPlans?.[wk - 1]?.days?.find(d => d.dayOfWeek === dow) : null;
    const loadPct = dayPlan?.slots?.find(s => s.role === 'primary')?.loadPct;
    if (!loadPct || loadPct <= 0 || loadPct > 1.0) break;

    // PLAN_BASED-e1RM
    const loads = sets.map(x => x.externalLoadKg).filter(v => v > 0);
    if (loads.length === 0) break;
    const medLoad = median(loads);
    const planBasedE1RM = medLoad / loadPct;

    if (planBasedE1RM > cfgBaseline * 1.10) counter++;
    else break;
  }

  if (counter < 3) {
    return { driftPct: 0, signal: 'vx-overshoot', source: `streak=${counter} (<3 ei laukea)`, info: '', counter };
  }

  // Drift max +10 % per blokki, +2.5 % per peräkkäinen
  const driftPctRaw = Math.min(0.10, (counter - 2) * 0.025);
  return {
    driftPct: driftPctRaw,
    signal: 'vx-overshoot',
    source: `vx-overshoot (perfect-streak ${counter}, +${(driftPctRaw*100).toFixed(1)}%)`,
    info: `counter=${counter}, fallback (velocity-baseline n=${primerSets.length} < 5)`,
    counter,
  };
}

/**
 * v4.34.44 — Hae primary-liikkeen cfg-baseline-arvo. Yleistetty hybridi-rakenne:
 *
 * TASO 1 (uusi, ei-streetlifting-mesoille): mesocycle.movementCfg[movName]
 *   Custom/hypertrofia/maksimivoima/jne. mesoissa kalibrointiarvot tallennetaan
 *   movementCfg-tauluun avaimella defaultMovementName. Tämä on uusi rakenne joka
 *   ei sotke streetliftingConfig.calibration-haaraa.
 *
 * TASO 2 (legacy, streetlifting_16w): mesocycle.streetliftingConfig.calibration
 *   Säilyy bit-perfect koskemattomana — streetlifting_16w-meso käyttää tätä
 *   edelleen kuten v4.34.43:ssa.
 *
 * TASO 3 (fallback): null → recommend() käyttää historia-baselinea (top-3 e1RM
 *   median × adaptive ceiling).
 *
 * Käytössä computeCfgDrift, E1RM_INFLATION_CAP ja persistCfgDriftIfApplicable.
 */
function getCfgBaselineForMovement(mesocycle, primarySlotMeta) {
  const movName = primarySlotMeta?.defaultMovementName;

  // TASO 1: movementCfg (uusi, kaikki ei-streetlifting-mesot)
  const movementCfg = mesocycle?.movementCfg || {};
  if (movName && movementCfg[movName] && movementCfg[movName].e1rmExternal != null) {
    return {
      value: movementCfg[movName].e1rmExternal,
      key: movName,
      movName,
      source: 'movementCfg',
    };
  }

  // TASO 2: streetliftingConfig.calibration (legacy, streetlifting_16w)
  const cfg = mesocycle?.streetliftingConfig?.calibration || {};
  if (movName === "Lisäpainoleuanveto") return { value: cfg.leukaExtKg, key: 'leukaExtKg', movName, source: 'streetliftingConfig' };
  if (movName === "Lisäpainodippi")     return { value: cfg.dippiExtKg,  key: 'dippiExtKg',  movName, source: 'streetliftingConfig' };
  if (movName === "Takakyykky")          return { value: cfg.kyykkyExtKg, key: 'kyykkyExtKg', movName, source: 'streetliftingConfig' };

  // TASO 3: ei kalibrointia → fallback historia-baselineen
  return { value: null, key: null, movName, source: null };
}

// ═══════════════════════════════════════════════════════════════
// BASELINE CALCULATIONS (rolling median + MAD)
// ═══════════════════════════════════════════════════════════════

function computeBaseline(values, windowN) {
  const windowed = values.slice(-windowN);
  if (windowed.length < 3) return null;
  const med = median(windowed);
  const sigma = madSigma(windowed);
  return { median: med, madSigma: sigma, n: windowed.length };
}

function classifyReadinessZ(z) {
  // v4.28.0 bugfix: boundary tulkittu konservatiivisesti. Aiemmin z === -0.5 palautti GREEN
  // ja z === -1.0 palautti YELLOW (if z >= ...) — readiness-järjestelmässä rajalla on
  // turvallisempaa valita alempi luokka, jotta grinder ei ohita YELLOW/RED-varoitusta.
  if (z > -0.5) return "GREEN";
  if (z > -1.0) return "YELLOW";
  return "RED";
}

// ═══════════════════════════════════════════════════════════════
// READINESS SYSTEM: 2/3 rule + velocity veto
// ═══════════════════════════════════════════════════════════════

/**
 * Compute velocity readiness from readiness test rep1 velocity
 */
function velocityReadiness(todayVelocity, baselineValues, windowN = 10) {
  if (todayVelocity === null || todayVelocity === undefined) {
    return { z: null, class: null, channel: "velocity" };
  }
  const bl = computeBaseline(baselineValues, windowN);
  if (!bl) return { z: null, class: null, channel: "velocity" };
  const z = zScore(todayVelocity, bl.median, bl.madSigma);
  return { z, class: classifyReadinessZ(z), channel: "velocity", baseline: bl };
}

/**
 * Compute HRV readiness from Oura night HRV (already as lnRMSSD)
 *
 * v4.33.0 M20d: Rolling 7-päivän keskiarvo-vertailu (Plews 2013, Plews & Laursen 2017).
 * Yksittäinen päivä-HRV on kohinaiseempi kuin rolling-keskiarvo. Vertaillaan TÄMÄN
 * PÄIVÄN HRV vs viim. 7 päivän keskiarvoa (rolling-7) baseline-Median sijasta jos
 * 7+ datapistettä saatavilla. Jos vähemmän, fallback baseline-vertailuun.
 *
 * Smallest worthwhile change ±0.5 SD viikkokeskiarvosta = optimi readiness-marker.
 */
function hrvReadiness(todayLnRMSSD, baselineValues, windowN = 14) {
  if (todayLnRMSSD === null || todayLnRMSSD === undefined) {
    return { z: null, class: null, channel: "hrv" };
  }
  // v4.33.0 M20d: Rolling 7-päivän keskiarvo (Plews 2013)
  if (Array.isArray(baselineValues) && baselineValues.length >= 7) {
    const last7 = baselineValues.slice(-7);
    const rolling7Mean = last7.reduce((a, b) => a + b, 0) / last7.length;
    // Käytetään koko baseline-windowin MAD-sigma:a varianssin estimaattina
    const bl = computeBaseline(baselineValues, windowN);
    if (bl) {
      const z = zScore(todayLnRMSSD, rolling7Mean, bl.madSigma);
      return {
        z,
        class: classifyReadinessZ(z),
        channel: "hrv",
        baseline: bl,
        rolling7Mean,
        method: "rolling7",
      };
    }
  }
  // Fallback: baseline median -vertailu (legacy)
  const bl = computeBaseline(baselineValues, windowN);
  if (!bl) return { z: null, class: null, channel: "hrv" };
  const z = zScore(todayLnRMSSD, bl.median, bl.madSigma);
  return { z, class: classifyReadinessZ(z), channel: "hrv", baseline: bl, method: "baseline-median" };
}

/**
 * v4.33.0 M20a: Yläraaja-readiness MPV warmup-singlessä @ 60-65% 1RM
 *
 * Sánchez-Moreno 2017 (IJSPP 12:1378) osoitti pull-up-spesifin load-velocity-relaation
 * r = -0.96 ja stabiilin V-%1RM-suhteen 12 vk:n harjoittelun yli; Sánchez-Moreno 2020
 * (JSCR 34:911) vahvisti VL-thresholdit (VL25, VL50). Sánchez-Medina &
 * González-Badillo 2011 (MSSE 43:1725) osoittaa, että velocity loss korreloi
 * voimakkaasti neuromuskulaarisen fatiguen kanssa.
 *
 * Käyttö: lisäpainoleuka warmup-single @ 60-65% 1RM aamulla MA + TO + LA.
 * Vertaa tämän päivän MPV vs viim. 7 pv rolling-mediania.
 *
 * Kynnysarvot (heuristiset, johdettu Pareja-Blanco/González-Badillo VL-thresholdeista):
 *   ≥ +3 %   → "Green light", top-set OK, harkitse +2.5 kg
 *   −0..3 %  → Normaali, ohjelman mukaan
 *   −3..−5 % → Pieni varovaisuus, ei testiyrityksiä
 *   −5..−10% → Vähennä top-set 5-10 % (esim. 90 %→82.5 %), volume tai -1 setti
 *   > −10 %  → Lepopäivä TAI kevyt tekniikkasessio @ 50 %
 *   > −15 %  → Mahdollinen NFOR, review koko viikko
 *
 * Returns: { mpv, baseline7Mean, deltaPct, class: "GREEN"|"YELLOW"|"RED", message, recommendedLoadAdjust }
 */
function upperBodyMpvReadiness(todayMpv, recent7DaysMpv) {
  if (todayMpv === null || todayMpv === undefined) {
    return { mpv: null, baseline7Mean: null, deltaPct: null, class: null, message: "Ei MPV-dataa", recommendedLoadAdjust: 0 };
  }
  if (!Array.isArray(recent7DaysMpv) || recent7DaysMpv.length < 3) {
    // Rakenna baseline ensin — alle 3 datapistettä ei riitä luotettavaan vertailuun
    return { mpv: todayMpv, baseline7Mean: null, deltaPct: null, class: null, message: "Baseline rakentuu (3+ MPV-mittausta tarvitaan)", recommendedLoadAdjust: 0 };
  }
  const baseline7Mean = recent7DaysMpv.reduce((a, b) => a + b, 0) / recent7DaysMpv.length;
  if (baseline7Mean <= 0) {
    return { mpv: todayMpv, baseline7Mean, deltaPct: null, class: null, message: "Baseline ei luotettava (≤0)", recommendedLoadAdjust: 0 };
  }
  const deltaPct = ((todayMpv - baseline7Mean) / baseline7Mean) * 100;
  // v4.34.23 KORJAUS — käyttäjäpalaute: aiemmat thresholds olivat liian aggressiivisia.
  // -15 % MPV-laskulla load -50 % (= 26.75 kg V3 atleetille jolla 50 kg = V1) oli naurettava.
  // Tutkimuspohja: Pareja-Blanco/Sánchez-Medina puhuvat WITHIN-SET velocity loss -kynnyksistä
  // (VL15-25), EI day-to-day baseline-drift:istä. Day-to-day variabiliteetti ±3-5 % on luonnostaan,
  // joten -15 % on iso mutta ei "skip session". Plews 2013 + Holmes 2021 -tasoiset realistiset rajat.
  // Lisäksi: load-adjustment EI saa kerrata plan-percentageja kun atleete on muuten työkuntoinen —
  // sen sijaan käytetään VX-BUMPIA (V3 → V4) kompensaationa, ei radikaalia load-pudotusta.
  let cls, message, recommendedLoadAdjust, recommendedVxBump;
  if (deltaPct >= 3) {
    cls = "GREEN";
    message = `MPV +${deltaPct.toFixed(1)}% baseline — Green light, top-set OK, harkitse +2.5 kg`;
    recommendedLoadAdjust = 0.025;  // +2.5%
    recommendedVxBump = 0;
  } else if (deltaPct >= -3) {
    cls = "GREEN";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Normaali, ohjelman mukaan`;
    recommendedLoadAdjust = 0;
    recommendedVxBump = 0;
  } else if (deltaPct >= -7) {
    cls = "YELLOW";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Pieni varovaisuus, ei testiyrityksiä`;
    recommendedLoadAdjust = 0;
    recommendedVxBump = 0;
  } else if (deltaPct >= -12) {
    cls = "YELLOW";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Vähennä top-set 7.5%`;
    recommendedLoadAdjust = -0.075;
    recommendedVxBump = 0;
  } else if (deltaPct >= -18) {
    cls = "RED";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Vähennä load 15% + Vx +1 (esim. V3 → V4)`;
    recommendedLoadAdjust = -0.15;  // v4.34.23: oli -0.50, korjattu -0.15
    recommendedVxBump = 1;          // v4.34.23: kompensaatio Vx-bumpilla
  } else {
    cls = "RED";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Vähennä load 25% + Vx +1, harkitse skip jos < -25%`;
    recommendedLoadAdjust = -0.25;  // v4.34.23: oli -1.0 (skip), korjattu -0.25
    recommendedVxBump = 1;
  }
  return { mpv: todayMpv, baseline7Mean, deltaPct, class: cls, message, recommendedLoadAdjust, recommendedVxBump };
}

/**
 * Compute Vara readiness from recent top-set overshoot
 */
function varaReadiness(recentTopSets, windowN = 5) {
  const sets = recentTopSets.slice(-windowN).filter(
    (s) => s.targetVx !== null && s.targetVx !== undefined &&
           s.actualVx !== null && s.actualVx !== undefined
  );
  if (sets.length < 2) return { z: null, class: null, channel: "vara", meanOvershoot: null };

  const overshoots = sets.map((s) => s.targetVx - s.actualVx);
  const meanOvershoot = avg(overshoots);

  let cls;
  if (meanOvershoot >= 2) cls = "RED";
  else if (meanOvershoot >= 1) cls = "YELLOW";
  else cls = "GREEN";

  return { z: null, class: cls, channel: "vara", meanOvershoot };
}

/**
 * Combine readiness channels using 2/3 rule + velocity veto
 */
function combineReadiness(velocityR, hrvR, varaR) {
  const channels = [velocityR, hrvR, varaR];
  const active = channels.filter((c) => c.class !== null);

  if (active.length === 0) {
    return { combined: "GREEN", capLevel: 0, channels: { velocity: velocityR, hrv: hrvR, vara: varaR } };
  }

  // Count colors
  const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
  for (const ch of active) counts[ch.class]++;

  let combined;

  // 2/3 rule
  if (counts.GREEN >= 2) combined = "GREEN";
  else if (counts.RED >= 2 || (counts.RED >= 1 && counts.YELLOW >= 1)) combined = "RED";
  else combined = "YELLOW";

  // Velocity VETO
  if (velocityR.class === "RED") {
    if (combined === "GREEN") combined = "YELLOW";
    const othersYellowOrRed = [hrvR, varaR].filter(
      (c) => c.class === "YELLOW" || c.class === "RED"
    ).length;
    if (othersYellowOrRed >= 1) combined = "RED";
  }

  const capLevel = combined === "GREEN" ? 0 : combined === "YELLOW" ? 1 : 2;

  return {
    combined,
    capLevel,
    channels: { velocity: velocityR, hrv: hrvR, vara: varaR },
  };
}

// ═══════════════════════════════════════════════════════════════
// MESOCYCLE LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve full mesocycle position — handles inserted deload weeks.
 * Returns { programWeek, isInsertedDeload, calendarWeek } or null if past end.
 *
 * Inserted deload: occupies a calendar week between program weeks, extending
 * the effective mesocycle length by 1 week per insert. The `programWeek`
 * returned during a deload insert = the program week just completed (so phase
 * logic, accessory slot lookups etc. resolve against the pre-deload state).
 */
function resolveMesocyclePosition(mesocycle, dateISO) {
  if (!mesocycle || !mesocycle.startDateISO) return null;
  const start = new Date(mesocycle.startDateISO);
  const current = new Date(dateISO);
  const diffDays = Math.floor((current - start) / (1000 * 60 * 60 * 24));
  // v4.22: erotellaan "ennen alkua" vs "lopun jälkeen" -tilanteet. Aiemmin
  // molemmat palauttivat null, ja recommend() korvasi mesosyklin default:illa
  // kun pääsy ennen startDateISO:a pyyttiin (esim. backfill-polku). Nyt
  // palautetaan strukturoitu result jossa kutsuja näkee miksi.
  if (diffDays < 0) return { programWeek: null, reason: "before-start", diffDays };
  const calendarWeek = Math.floor(diffDays / 7) + 1;

  const inserts = [...(mesocycle.insertedDeloads || [])]
    .map(d => (typeof d === "number" ? d : d.afterProgramWeek))
    .filter(n => Number.isInteger(n) && n >= 0)
    .sort((a, b) => a - b);

  const effectiveWeekCount = mesocycle.weekCount + inserts.length;
  if (calendarWeek > effectiveWeekCount) return { programWeek: null, reason: "after-end", diffDays, calendarWeek };

  let programWeek = 0;
  let insertIdx = 0;
  let isDeload = false;
  for (let cw = 1; cw <= calendarWeek; cw++) {
    isDeload = false;
    if (insertIdx < inserts.length && inserts[insertIdx] === programWeek) {
      isDeload = true;
      insertIdx++;
    } else {
      programWeek++;
    }
  }
  return { programWeek: Math.max(programWeek, 1), isInsertedDeload: isDeload, calendarWeek, reason: "in-range" };
}

/**
 * Determine which program week of the mesocycle we're in based on date.
 * Backward-compatible: returns a number (or null). For full state including
 * inserted-deload flag, use resolveMesocyclePosition().
 */
function getMesocycleWeek(mesocycle, dateISO) {
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  return pos && pos.programWeek ? pos.programWeek : null;
}

function isInsertedDeloadWeek(mesocycle, dateISO) {
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  return pos && pos.programWeek ? pos.isInsertedDeload : false;
}

function isReplacedDeloadWeek(mesocycle, dateISO) {
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  if (!pos || !pos.programWeek || pos.isInsertedDeload) return false;
  const replaced = (mesocycle?.replacedWithDeload || [])
    .map(r => (typeof r === "number" ? r : r.programWeek))
    .filter(Number.isInteger);
  return replaced.includes(pos.programWeek);
}

function isDeloadOverrideWeek(mesocycle, dateISO) {
  return isInsertedDeloadWeek(mesocycle, dateISO) || isReplacedDeloadWeek(mesocycle, dateISO);
}

function getEffectiveWeekCount(mesocycle) {
  if (!mesocycle) return 0;
  const inserts = mesocycle.insertedDeloads?.length || 0;
  return (mesocycle.weekCount || 0) + inserts;
}

/**
 * Get the week definition for a given week number
 */
function getWeekDef(mesocycle, weekNum) {
  if (!mesocycle || !mesocycle.weekDefs) return null;
  return mesocycle.weekDefs.find((w) => w.week === weekNum) || null;
}

/**
 * Get the planned day for today from the week plan.
 * If no exact match for dayOfWeek, finds the NEXT training day (forward-first)
 * so rest days show the upcoming session, not the one already completed.
 *
 * v4.27.11: Aiempi "nearest" logiikka palautti eiliseen planin tasapelitilanteissa.
 * Esim. perjantaina (dow=5) TO (4) ja LA (6) ovat molemmat 1 päivän päässä,
 * mutta TO listataan ensin weekPlans.days:ssa → TO voitti → dashboard näytti
 * eilisen treenin uudelleen. Uusi logiikka laskee forward-etäisyyden (wrap-around
 * seuraavaan viikkoon), joten perjantaina LA voittaa TO:n (fwd=1 vs fwd=6).
 */
function getTodayPlan(mesocycle, weekNum, dayOfWeek) {
  if (!mesocycle || !mesocycle.weekPlans) return null;
  const weekPlan = mesocycle.weekPlans.find((w) => w.week === weekNum);
  if (!weekPlan || !weekPlan.days || !weekPlan.days.length) return null;
  // Exact match
  const exact = weekPlan.days.find((d) => d.dayOfWeek === dayOfWeek);
  if (exact) return exact;
  // Forward-first: pienin päivien määrä TÄNÄÄN → d (wrap-around = ensi vk)
  let best = null;
  let bestFwd = Infinity;
  for (const d of weekPlan.days) {
    let fwd = d.dayOfWeek - dayOfWeek;
    if (fwd <= 0) fwd += 7; // wrap to next week if day already passed
    if (fwd < bestFwd) {
      bestFwd = fwd;
      best = d;
    }
  }
  return best;
}

/**
 * deltaPct_raw calculation: mesocycle week coefficient × day type multiplier
 */
function deltaPctRaw(weekDef, dayType) {
  if (!weekDef) return 0;
  const weekCoeff = weekDef.deltaPctBase || 0;
  const dayMult = DAY_TYPE_MULTIPLIERS[dayType] ?? 1.0;
  return weekCoeff * dayMult;
}

/**
 * Adaptive mesocycle calibration after cycle completion
 * Returns adjustment to deltaPct values for next cycle
 */
function calibrateMesocycle(varaFeedbackSets) {
  if (!varaFeedbackSets.length) return { adjustment: 0, reason: "Ei dataa" };
  const overshoots = varaFeedbackSets
    .filter((s) => s.targetVx !== null && s.actualVx !== null)
    .map((s) => s.targetVx - s.actualVx);
  if (!overshoots.length) return { adjustment: 0, reason: "Ei Vara-dataa" };

  const avgOvershoot = avg(overshoots);
  let adj = 0;
  let reason = "";

  // v4.28.0 bugfix: sign-konventio yhtenäistetty varaTrendCorrection-dokumentaation kanssa.
  // overshoot = targetVx - actualVx. actualVx > targetVx ⇒ overshoot < 0 ⇒ TOO EASY (crushed)
  // → lisää painoa. actualVx < targetVx ⇒ overshoot > 0 ⇒ TOO HARD (struggled) → vähennä.
  // Aiemmin merkit olivat väärin päin: grinderille (actual=0, target=2 → overshoot=+2)
  // engine suositteli +1% vaikka oli selvästi liian raskas. Kynnys-asymmetria säilytetty:
  // +1% vaatii vahvan crush-signaalin (≤ -1.0), -1% lievemmälläkin struggle-signaalilla (≥ 0.5).
  if (avgOvershoot < -1.0) {
    adj = 0.01; // +1%
    reason = `Liian kevyt (avgOvershoot=${avgOvershoot.toFixed(2)}) → +1%`;
  } else if (avgOvershoot > 0.5) {
    adj = -0.01; // -1%
    reason = `Liian raskas (avgOvershoot=${avgOvershoot.toFixed(2)}) → -1%`;
  } else {
    reason = `Sopiva (avgOvershoot=${avgOvershoot.toFixed(2)})`;
  }

  return { adjustment: adj, avgOvershoot, reason };
}

// ═══════════════════════════════════════════════════════════════
// VARA FEEDBACK LOOP
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze recent Vara data for session-level calibration
 */
function varaFeedback(recentSets) {
  const withVara = recentSets.filter(
    (s) => s.actualVx !== null && s.actualVx !== undefined &&
           s.targetVx !== null && s.targetVx !== undefined
  );
  if (withVara.length < 3) return { suggestion: null, type: null };

  const last3 = withVara.slice(-3);
  const allTooEasy = last3.every((s) => s.actualVx > s.targetVx + 1);
  const tooHard = last3.filter((s) => s.actualVx < s.targetVx - 1).length >= 2;

  if (allTooEasy) {
    return { suggestion: "Kuorma liian kevyt, harkitse +1-2 kg", type: "too_easy" };
  }
  if (tooHard) {
    return { suggestion: "Kuorma liian raskas, harkitse -1-2 kg", type: "too_hard" };
  }
  return { suggestion: null, type: null };
}

/**
 * Compute Vara trend correction for recommend().
 * Asymmetric: more aggressive UP when crushing (acceleration mode),
 * conservative DOWN when struggling (safety).
 *
 * meanOvr > 0 ⇒ sarjat olivat helpompia kuin target (target-Vx > actual-Vx väärin päin? ei)
 * meanOvr = targetVx - actualVx; actualVx > targetVx ⇒ meanOvr < 0 ⇒ TOO EASY (crushed)
 * actualVx < targetVx ⇒ meanOvr > 0 ⇒ TOO HARD (struggled)
 *
 * Convention in this codebase (varaFeedback etc.): if actualVx > targetVx, set is "easier than target"
 * because more reps in reserve means less effort. overshoot here = target - actual, so:
 *   meanOvr < 0 (actual > target) = crushed → ACCELERATE (+)
 *   meanOvr > 0 (actual < target) = struggled → HOLD BACK (-)
 */
function varaTrendCorrection(recentTopSets, opts = {}) {
  const maxUp = opts.maxUp ?? 0.035;   // aggressive acceleration
  const maxDown = opts.maxDown ?? 0.020; // conservative hold-back
  const withVara = recentTopSets.filter(
    (s) => s.actualVx !== null && s.targetVx !== null
  ).slice(-6);
  if (withVara.length < 4) return 0;

  // v4.32.8 (Phase 1 -tutkimuslöydös): straight-set-protokollissa Vx vaihtelee
  // freshness-akselilla (esim. sarja 1 V5 fresh → sarja 5 V1 cumulative).
  // Pelkkä mean overshoot voi johtaa harhaan jos sarjat raportoidaan ramp-pattern:nä
  // (V5, V4, V2, V1, V0 → mean = -0.4 mutta sarja 5 V0 = liian raskas).
  //
  // v4.34.34 BUG 2 (c) — DUAL-SIGNAL-PAINOTUS: ekka sarja per-sessio = "kapasiteetti-
  // mittari" (fresh start → kuinka helposti kuorma lähtee), viim. sarja = "väsymys-
  // mittari" (sessio loppuun → riitti voima). Aiempi pelkkä viim.-sarja-painotus
  // (2.0× viim, 1.5× 2.viim, 1.0× muut) sokaisi ekan sarjan V5-helppouden:
  // jos atletti teki 125×6 V5 ekan ja V1 viim. sarjan, mean ≈ V3 = target → ei
  // bonusta. Mutta ekka V5 fresh = tankokuorma 18 % aliarvioitu vrt. kapasiteetti.
  //
  // Uusi painotus (per-sessio-tietoinen):
  //   - viim. session ekka sarja = 1.8× (kapasiteetti-signaali)
  //   - viim. session viim. sarja = 1.8× (väsymys-signaali)
  //   - viim. session muut = 1.2×
  //   - aiempien sessioiden sarjat = 1.0×
  //
  // crushingStreak -säännös: tarkista että viim. 3 sarjaa overall ovat crushed.
  const overshoots = withVara.map((s) => s.targetVx - s.actualVx);

  // Tunnista viim. session sarjat (sessionId-pohjainen, viim. sarjojen blokki)
  const lastSessId = withVara[withVara.length - 1]?.sessionId ?? null;
  const lastSessIndices = lastSessId
    ? withVara.map((s, i) => s.sessionId === lastSessId ? i : -1).filter(i => i >= 0)
    : [];
  const lastSessFirstIdx = lastSessIndices.length > 0 ? lastSessIndices[0] : -1;
  const lastSessLastIdx = lastSessIndices.length > 0 ? lastSessIndices[lastSessIndices.length - 1] : -1;

  const weights = withVara.map((s, i) => {
    if (s.sessionId !== lastSessId) return 1.0;
    if (i === lastSessFirstIdx && i === lastSessLastIdx) return 1.8; // single-set session
    if (i === lastSessFirstIdx) return 1.8; // ekka sarja = kapasiteetti
    if (i === lastSessLastIdx) return 1.8;  // viim. sarja = väsymys
    return 1.2;
  });
  const weightedSum = overshoots.reduce((acc, ovr, i) => acc + ovr * weights[i], 0);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedMeanOvr = weightedSum / totalWeight;

  // V0 missä tahansa viim. 3 sarjassa = "warning" — älä accelerate
  const last3HasFailure = withVara.slice(-3).some(s => s.actualVx === 0);

  // Consecutive crushing: viim. 3 sarjaa kaikki crushed (actualVx >= targetVx+1)
  const last3 = withVara.slice(-3);
  const crushingStreak = last3.length === 3 && last3.every(s => (s.actualVx - s.targetVx) >= 1);

  if (weightedMeanOvr < -0.5 && !last3HasFailure) {
    // Crushed (painotettu): accelerate. Mutta EI accelerate jos viim. sarjoissa V0.
    const base = clamp(Math.abs(weightedMeanOvr) * 0.015, 0, maxUp);
    const bonus = crushingStreak ? 0.010 : 0;
    return Math.min(base + bonus, maxUp);
  }
  if (weightedMeanOvr > 0.5 || last3HasFailure) {
    // Struggled (painotettu) tai viim. sarjoissa V0: hold back.
    // V0 viim. sarjoissa override aina hold-backiksi vaikka mean olisi kurssassa.
    const adjustment = last3HasFailure ? -0.015 : clamp(-weightedMeanOvr * 0.008, -maxDown, 0);
    return Math.max(adjustment, -maxDown);
  }
  return 0;
}

/**
 * v4.34.41 — INTRA-SESSION LOAD ADJUST.
 *
 * Käyttäjäpalaute 2026-05-07: "Jos teen ekan sarjan 57.5 kg V5 (target V3),
 * fixaako engine kuorman heti sopivammaksi jotta saan oikean ärsykkeen?".
 *
 * Tämä on intra-session-version FIRST_SET_CAPACITY_BONUS:ista (joka koski vain
 * NEXT-session-targetia). Aiempi vaihtoehto B+C ei korjannut kuormaa kesken
 * session — atletti jatkoi alkuperäisellä template-kuormalla vaikka ekka V5
 * fresh osoitti kuorman olevan alle kapasiteetin.
 *
 * Logiikka:
 *   - vain heavy-day primary-sarjoille (ei volume, ei accessory, ei back-off)
 *   - vain ekka työsarja (sarja 1)
 *   - vaatii overshoot >= +2 luokkaa (V5 vs V3 target = +2)
 *   - bonus: clamp((overshoot - 1) × 0.025, 0.025, 0.05) → +2.5-5 %
 *     - overshoot 2: +2.5 % (= V5 vs V3)
 *     - overshoot 3: +5.0 % cap (= V6 vs V3)
 *
 * Freshness-suoja: bonus on KONSERVATIIVINEN (max +5 %) koska ekka V5 fresh
 * ei tarkoita että kuorma kesti V3:ssa kaikissa sarjoissa. Atletti saa
 * oikean ärsykkeen ilman riskittömää grindi-kierrettä.
 *
 * Returns: { shouldAdjust, suggestedLoadKg, bumpKg, bumpPct, reason } tai null.
 */
function intraSessionLoadAdjustSuggestion(opts = {}) {
  const {
    firstSetVx, targetVx, currentLoadKg,
    isPrimary = false, dayType = null, setRole = null
  } = opts;
  // Suojat: vain primary-top-sarja heavy-päivänä
  if (!isPrimary || dayType !== "heavy" || setRole !== "top") return null;
  if (firstSetVx === null || firstSetVx === undefined) return null;
  if (targetVx === null || targetVx === undefined) return null;
  if (!currentLoadKg || currentLoadKg <= 0) return null;
  const overshoot = firstSetVx - targetVx;
  if (overshoot < 2) return null; // tarvitaan +2 luokkaa = V5 vs V3 minimi
  const bonus = clamp((overshoot - 1) * 0.025, 0.025, 0.05);
  const newLoad = roundToHalf(currentLoadKg * (1 + bonus));
  const bumpKg = newLoad - currentLoadKg;
  if (bumpKg <= 0) return null; // pyöristys-edge: ei kasvata
  return {
    shouldAdjust: true,
    suggestedLoadKg: newLoad,
    bumpKg,
    bumpPct: bonus * 100,
    reason: `Ekka V${firstSetVx} target V${targetVx}:llä (+${overshoot} luokkaa) — fresh-V kapasiteetti-signaali, +${(bonus*100).toFixed(1)} % seuraaviin sarjoihin`,
  };
}

/**
 * v4.34.34 BUG 2 (b) — FIRST-SET CAPACITY BONUS.
 *
 * Käyttäjäpalaute: "ekassa sarjassa V5-helppous (= 2 sarjaa varaa) ei johda
 * mihinkään, ja backoff-progressio kasvaa +1 kg vaikka V6-headroomia oli paljon".
 * Engine ei ennen tätä versiota tunnistanut ekan-sarjan-fresh-V5 -tilannetta
 * erikseen — se sulautui keskimääräiseen Vx-trendiin.
 *
 * Tämä bonus aktivoituu kun viim. session **ekka työsarja** oli ≥2 luokkaa
 * helpompi kuin target (esim. target V3, actual V5+). Fresh-startin V5+ on
 * vahva kapasiteetti-signaali: target-kuorma oli aliarvioitu, atletti pystyi
 * vähintään +5 %:iin samalla Vx:llä.
 *
 * Bonus: +1.0 % loadPct:hen (= ~+1.5-2 kg primary-liikkeessä). Kerrostuu
 * varaTrendCorrection:n päälle, mutta capatataan +1.5 % maksimiin tämän
 * lähteen osalta. Aktivoituu vain non-cal sessioista, non-deload-päiviin.
 *
 * @param {Array} recentTopSets — sets in chronological order (asc)
 * @param {Object} opts — { maxBonus: 0.015 (default), minOvershoot: 2 }
 * @returns {number} — 0 to maxBonus (kerroin loadPct:hen)
 */
function firstSetCapacityBonus(recentTopSets, opts = {}) {
  const maxBonus = opts.maxBonus ?? 0.015;
  const minOvershoot = opts.minOvershoot ?? 2;
  if (!recentTopSets || recentTopSets.length === 0) return 0;

  // Etsi viim. session sarjat
  const lastSessId = recentTopSets[recentTopSets.length - 1]?.sessionId;
  if (!lastSessId) return 0;
  const lastSessSets = recentTopSets.filter(s => s.sessionId === lastSessId);
  if (lastSessSets.length === 0) return 0;

  // Skippaa cal-dominantit sessiot — cal on tarkoituksella matalampi
  const calCount = lastSessSets.filter(s => s.setRole === "calibration").length;
  if (calCount >= lastSessSets.length * 0.5) return 0;

  // Ekka työsarja (filtteröi calit pois jos sekoittuu)
  const firstWorkSet = lastSessSets.find(s => s.setRole !== "calibration") || lastSessSets[0];
  if (!firstWorkSet || firstWorkSet.actualVx === null || firstWorkSet.targetVx === null) return 0;

  const overshoot = firstWorkSet.actualVx - firstWorkSet.targetVx;
  if (overshoot < minOvershoot) return 0;

  // +1.0 % per Vx-luokka yli minOvershoot:n, capattuna maxBonukseen
  // overshoot=2 → 1.0 %, overshoot=3 → 1.5 % (cap)
  return clamp((overshoot - minOvershoot + 1) * 0.010, 0, maxBonus);
}

/**
 * Gross-mismatch correction: when the prescribed load is FAR off from
 * the athlete's true capacity (overshoot ≥ 1.5 reps consistently), the
 * normal ±3.5% cap is too slow. This mechanism escalates to up to +8%
 * per session when the mismatch is severe AND persistent (2+ sessions).
 *
 * Guard rails: requires 4+ recent top sets, mean overshoot ≤ -1.5
 * (actualVx ≥ targetVx + 1.5 on average), and at least 2 sessions worth.
 */
function grossMismatchCorrection(recentTopSets) {
  const withVara = recentTopSets.filter(
    (s) => s.actualVx !== null && s.targetVx !== null
  ).slice(-8);
  if (withVara.length < 4) return 0;

  const overshoots = withVara.map((s) => s.targetVx - s.actualVx);
  const meanOvr = avg(overshoots);

  // Require sustained large mismatch: mean overshoot ≥ 1.5 (target - actual ≤ -1.5)
  if (meanOvr > -1.5) return 0;

  // Require that ALL recent sets show ≥ 1 overshoot (no outliers)
  const allOvershoot = withVara.every(s => (s.actualVx - s.targetVx) >= 1);
  if (!allOvershoot) return 0;

  // Scale: −1.5 → +5 %, −2.0 → +6.5 %, −2.5+ → +8 %
  const magnitude = Math.abs(meanOvr);
  return clamp((magnitude - 1.5) * 0.030 + 0.050, 0.050, 0.080);
}

/**
 * e1RM momentum bonus: if recent e1RM shows a PR trend,
 * add additional deltaPct to accelerate future sessions.
 *
 * Trigger: latest e1RM >= 1.02 × max(previous 3 e1RMs)
 *   AND 3+ consecutive sessions with rising e1RM.
 * Bonus: +0.5–1.5% depending on magnitude.
 */
function e1rmMomentumBonus(e1rmHistory, maxBonus = 0.015) {
  if (!e1rmHistory || e1rmHistory.length < 4) return 0;
  const recent = e1rmHistory.slice(-4).map(h => h.e1rm).filter(v => v != null);
  if (recent.length < 4) return 0;

  const [a, b, c, latest] = recent;
  const priorMax = Math.max(a, b, c);
  if (priorMax <= 0) return 0;

  const pctJump = (latest - priorMax) / priorMax;
  const rising = (b > a) && (c > b) && (latest > c);

  if (pctJump >= 0.02 && rising) {
    // Scale linearly: 2% jump → 0.5%, 5% jump → 1.5%
    return clamp(pctJump * 0.30, 0.005, maxBonus);
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════
// RETURN FROM BREAK
// ═══════════════════════════════════════════════════════════════

function breakAnalysis(lastSessionDateISO, todayDateISO) {
  if (!lastSessionDateISO) return { breakDays: null, modifier: 0, forcedDayType: null, message: null };

  const last = new Date(lastSessionDateISO);
  const today = new Date(todayDateISO || todayISO());
  const breakDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

  if (breakDays < 7) return { breakDays, modifier: 0, forcedDayType: null, message: null };

  if (breakDays < 14) {
    return {
      breakDays,
      modifier: -0.05,
      forcedDayType: null,
      message: "Viikon tauko — aloitetaan hieman kevyemmin",
    };
  }
  if (breakDays < 28) {
    return {
      breakDays,
      modifier: -0.10,
      forcedDayType: "volume",
      message: "2 viikon tauko — volume-päivä ensin",
    };
  }
  return {
    breakDays,
    modifier: -0.15,
    forcedDayType: "volume",
    message: "Pitkä tauko — aloitetaan konservatiivisesti, 1-2 viikossa normaaliin",
  };
}

/**
 * Check if mesocycle needs reset after break
 */
function mesocycleBreakReset(mesocycle, skippedWeeks) {
  if (skippedWeeks >= 2) {
    return { reset: true, reason: "2+ viikkoa skipattiin → mesosykli nollattu viikkoon 1" };
  }
  return { reset: false, reason: null };
}

// ═══════════════════════════════════════════════════════════════
// FAILURE REACTION
// ═══════════════════════════════════════════════════════════════

// v4.32.8: failureReaction nyt block-aware. Vaiheen 1 syvätutkimuksen löydös
// (ChatGPT + Claude + Refalo 2023):
//   Foundation: Strategia A — säilytä kuorma, kirjaa V0, kevennä ENSI VIIKOLLE.
//                Failure-protokolla EI kuulu foundation-blokkiin (24-48h recovery).
//   Strength:   Strategia B — laske 5% seuraavaan sarjaan. Strength sietää failure-
//                stimuluksen mutta loput sarjat tarvitsevat alennetun kuorman.
//   Intensity:  Strategia C — lopeta liike (2-failure rule, Tuchscherer RTS).
//                Intensity-V0 = CNS-signaali, säilytä recovery seuraaville päiville.
//   Peaking:    Strategia C — lopeta liike. Peaking-V0 = punainen lippu.
//
// v4.34.25: ISOLATION-HAARA (käyttäjäpalaute 2026-05-04). RP/Israetel/Helms/
// Schoenfeld -konsensus: isolation-liikkeen viimeinen sarja saa ja tyypillisesti
// pitäisi mennä lähelle failurea (V0-V1) hypertrofian takia. Engine ei saa kohdella
// tätä samalla logiikalla kuin compound-primary-V0:aa (Lisäpainoleuanveto, kyykky,
// dippi). Käyttäjän hauiskääntö-esimerkki: 3×12 × 16 kg V3/V2/V0 tauoilla 1 min →
// engine laukaisi -2.5% ensi viikolle, joka on yli-suojaava. Engine = valmentaja,
// ei nanny. Isolation last-set V0 EI laukaise nextWeekLoadAdjustia. Mid-set V0
// (sarjaa ennen viimeistä) johtaa -5% loppusarjoihin mutta ei ensi vk:n kevennystä.
//
// Block-aware-parametri valinnainen — vanhat kutsut (ilman blockPhase) saavat
// legacy-Strategia-B:n (5% drop) yhteensopivuuden vuoksi.
// Opts-parametri valinnainen: { isIsolation: bool, isLastSet: bool }.
function failureReaction(currentLoadKg, targetReps, isPrimary, consecutiveFailures, blockPhase = null, opts = {}) {
  // v4.34.25: Isolation-haara — etusija block-aware-logiikan EDESSÄ koska isolation-
  // luokitus pätee kaikissa blokeissa (foundation/strength/intensity/peaking).
  // v4.34.28: Multi-set V0 -tunnistus (cowork-audit kohta 4.4 vaihtoehto c).
  // opts.previousSetVxs = [V0, V0, V0] → kun 2+ peräkkäistä V0 isolaatiossa,
  // ISO-NORMAL palauttaa lisäkentässä warning. Engine ei pakota mitään, mutta
  // atleetti näkee soft-varoituksen "kuorma todennäköisesti liian raskas tällä
  // kertaa". Ei nanny — atleetin valinta säilyy.
  if (opts.isIsolation === true && !isPrimary) {
    const prevVxs = Array.isArray(opts.previousSetVxs) ? opts.previousSetVxs : [];
    const consecutiveV0Count = prevVxs.filter(v => v === 0).length + 1; // +1 = nyt V0
    const multiSetV0Warning = consecutiveV0Count >= 2
      ? `⚠ ${consecutiveV0Count}/${prevVxs.length + 1} sarjaa V0 — kuorma todennäköisesti liian raskas tällä kerralla. Harkitse -2.5 kg seuraavalle sessiolle (atleetin valinta).`
      : null;
    if (opts.isLastSet === true) {
      // Hypertrofian normaali stimulus — ei kevennystä, sarja loppuu joka tapauksessa
      const baseMessage = "Isolation last-set V0 = OK · normaali hypertrofia-stimulus · ei kevennystä";
      return {
        nextSetLoad: currentLoadKg,
        nextSetReps: targetReps,
        shouldStop: true,  // viim. sarja, ei jatkettavaa
        strategy: "ISO-NORMAL",
        message: multiSetV0Warning
          ? `${baseMessage}\n${multiSetV0Warning}`
          : baseMessage,
        warning: multiSetV0Warning,  // erillinen kenttä UI:lle (banner-render)
        nextWeekLoadAdjust: 0,
      };
    }
    // Mid-set V0 isolaatiossa = liian aggressiivinen kuorma TÄLLÄ kerralla
    return {
      nextSetLoad: roundToHalf(currentLoadKg * 0.95),
      nextSetReps: targetReps,
      shouldStop: false,
      strategy: "ISO-MID",
      message: `Isolation V0 ennen viim. sarjaa → -5% loppusarjoihin (${roundToHalf(currentLoadKg * 0.95)} kg) · ei muutosta ensi vk:lle`,
      warning: multiSetV0Warning,
      nextWeekLoadAdjust: 0,
    };
  }

  // Block-aware reactions (v4.32.8)
  if (blockPhase === "foundation") {
    return {
      nextSetLoad: currentLoadKg,  // säilytä kuorma — Strategia A
      nextSetReps: isPrimary ? Math.max(targetReps - 1, 1) : targetReps,
      shouldStop: consecutiveFailures >= 1,  // 1× V0 foundationissa = stop, EI sallita 2x
      strategy: "A",
      message: consecutiveFailures >= 1
        ? "Foundation V0 → lopeta liike. Foundation EI ole failure-protokolla. Ensi viikolla -2.5 kg."
        : "Foundation V0 → kirjaa, jatka samalla kuormalla loppuun. Ensi viikolla -2.5 kg.",
      nextWeekLoadAdjust: -0.025,
    };
  }
  if (blockPhase === "intensity" || blockPhase === "peaking") {
    return {
      nextSetLoad: currentLoadKg,  // ei merkitystä, lopetetaan
      nextSetReps: 0,
      shouldStop: true,             // Strategia C — lopeta heti
      strategy: "C",
      message: blockPhase === "peaking"
        ? "Peaking V0 → STOP. CNS säilytetään kisaa varten. Älä jatka."
        : "Intensity V0 → STOP liike. 2-failure rule (Tuchscherer RTS). Recovery seuraavalle päivälle.",
      nextWeekLoadAdjust: blockPhase === "peaking" ? 0 : -0.05,
    };
  }
  // Strength (default) — Strategia B (5% drop)
  const nextSetLoad = roundToHalf(currentLoadKg * 0.95);  // v4.32.8: 10% → 5% (Refalo 2023)
  const nextSetReps = isPrimary ? Math.max(targetReps - 1, 1) : targetReps;
  if (consecutiveFailures >= 2) {
    return {
      nextSetLoad,
      nextSetReps,
      shouldStop: true,
      strategy: "B",
      message: "2× failure strengthissä — lopeta liike, palautuminen primaryksi.",
      nextWeekLoadAdjust: -0.05,
    };
  }
  return {
    nextSetLoad,
    nextSetReps,
    shouldStop: false,
    strategy: "B",
    message: `Strength V0 → seuraava sarja ${nextSetLoad} kg (-5%, Refalo 2023).`,
    nextWeekLoadAdjust: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// ACCESSORY PROGRESSION LOGIC
// ═══════════════════════════════════════════════════════════════

function accessoryProgression(progress, isLowerBody = false) {
  if (!progress) return { action: "hold", suggestedLoad: null, reason: "Ei progressiodataa" };

  const increment = isLowerBody ? 5 : 2.5;

  // v4.34.36 BUG-FIX C: Vx-overshoot-aware progressio. Aiempi algoritmi käytti
  // VAIN consecutiveTargetMetSessions-laskuria (tarvitaan 2 peräkkäistä target met
  // -sessiota +5 kg:lle). Tämä jätti huomiotta että V5 vs target V3 = 2 luokkaa
  // helpompi → atletti pystyi paljon enemmän kuormaa, mutta engine sanoi "hold"
  // koska consecutive=1.
  //
  // Käyttäjäpalaute: "Tukiliikkeiden hold ei voi olla optimaalinen jos
  // edellisellä viikolla mennyt esim. V3 ja nyt pidettäisiin samassa painossa".
  //
  // Uusi logiikka:
  //   V0 (failure): −increment (kevennä, ei luota progressioon)
  //   sub-target (V_actual < V_target): hold (ei nostaa, ei laskeaa V1-V2:lla)
  //   target met (V_actual == V_target): consecutive>=2 → +increment, muuten hold
  //   overshoot +1: +increment (ei vaadi consecutive=2 — fresh signal riittää)
  //   overshoot +2: +1.5× increment (selvä yli-kapasiteetti)
  //   overshoot +3+: +2× increment (kuorma reilusti aliarvioitu)
  //
  // V0 hold-back nojaa hadFailureLastSession + FAILURE_LOCKOUT primary-haaralle;
  // accessoryllä menetelmä simulee saman tason käyttäen progress.lastMinVx-arvoa.
  const lastVxOvershoot = progress.lastVxOvershoot ?? null; // mean(actualVx) − targetVx
  const lastMinVx = progress.lastMinVx ?? null;

  // Stagnation override (>= 3 vk → flagi liikkeen vaihtoon)
  if (progress.stagnationWeeks >= 3) {
    return {
      action: "hold",
      suggestedLoad: progress.lastLoadKg,
      reason: `Stagnaatio ${progress.stagnationWeeks} viikkoa — harkitse liikkeen vaihtoa`,
      stagnationWarning: true,
    };
  }

  // V0 viim. sessiossa → kevennä (V0 = liian raskas)
  if (lastMinVx === 0) {
    const newLoad = roundToHalf(Math.max(0, (progress.lastLoadKg || 0) - increment));
    return {
      action: "decrease",
      suggestedLoad: newLoad,
      reason: `V0 viim. session sarjassa → kevennä −${increment} kg`,
    };
  }

  // Sub-target (V_actual < V_target, esim. V1-V2 target V3): hold — ei deload
  // V1-V2 painoissa, mutta ei myöskään nosta. Käyttäjäpyyntö 2026-05-05:
  // "ei deloadia heti V1-V2:lla, V0 osalta kyllä".
  if (lastVxOvershoot !== null && lastVxOvershoot < 0) {
    return {
      action: "hold",
      suggestedLoad: progress.lastLoadKg,
      reason: `Hieman alle target Vx (${lastVxOvershoot.toFixed(1)}) — hold, anna runkokunnon palautua`,
    };
  }

  // Target met täsmälleen (overshoot ≈ 0): legacy consecutive=2 -sääntö
  if (lastVxOvershoot !== null && Math.abs(lastVxOvershoot) < 0.5) {
    if (progress.consecutiveTargetMetSessions >= 2) {
      const newLoad = roundToHalf((progress.lastLoadKg || 0) + increment);
      return {
        action: "increase",
        suggestedLoad: newLoad,
        reason: `Target saavutettu ${progress.consecutiveTargetMetSessions}× peräkkäin → +${increment} kg`,
      };
    }
    return {
      action: "hold",
      suggestedLoad: progress.lastLoadKg,
      reason: "Target saavutettu, kasvattamiseen tarvitaan 2× peräkkäin",
    };
  }

  // Overshoot >= +0.5 luokkaa (= last Vx selvästi yli target) → progressio.
  // Multiplier:
  //   0.5–1.5 → 1×, 1.5–2.5 → 1.5×, 2.5+ → 2×
  if (lastVxOvershoot !== null && lastVxOvershoot >= 0.5) {
    let multiplier = 1.0;
    if (lastVxOvershoot >= 2.5) multiplier = 2.0;
    else if (lastVxOvershoot >= 1.5) multiplier = 1.5;
    const bonusKg = increment * multiplier;
    const newLoad = roundToHalf((progress.lastLoadKg || 0) + bonusKg);
    return {
      action: "increase",
      suggestedLoad: newLoad,
      reason: `Vx +${lastVxOvershoot.toFixed(1)} target Vx:stä — fresh-V signaali → +${bonusKg.toFixed(1)} kg`,
    };
  }

  // Legacy fallback: lastVxOvershoot null (vanha progress-record ilman Vx-trackingia)
  if (progress.consecutiveTargetMetSessions >= 2) {
    const newLoad = roundToHalf((progress.lastLoadKg || 0) + increment);
    return {
      action: "increase",
      suggestedLoad: newLoad,
      reason: `Target saavutettu ${progress.consecutiveTargetMetSessions}× peräkkäin → +${increment} kg (legacy)`,
    };
  }

  return {
    action: "hold",
    suggestedLoad: progress.lastLoadKg,
    reason: "Jatka samalla painolla",
  };
}

/**
 * Update movement progress after a session
 */
function updateMovementProgressFromSets(existingProgress, sessionSets, targetReps, targetVx) {
  if (!sessionSets.length) return existingProgress;

  const lastSet = sessionSets[sessionSets.length - 1];
  const lastLoadKg = lastSet.externalLoadKg;
  const lastReps = lastSet.reps;

  // v4.34.34 BUG-FIX E1: Vx-parametri puuttui aiemmin → e1rmAccessory käytti
  // efektiivisiä reppejä = reps + 0, mikä **aliarvioi** atletin todellisen
  // suorituskyvyn (V5-helppo sarja luettiin V0-grindiksi). Tämä rikkoi
  // accessory-progression next-load-suosituksen koko järjestelmästä — atletti
  // teki helpoilla, engine ehdotti samaa kuormaa seuraavalle kerralle.
  // Korjaus: priorisoi actualVx (todellinen palaute), fallback targetVx, sitten 1.
  const lastVx = lastSet.actualVx ?? lastSet.targetVx ?? targetVx ?? 1;
  const e1rm = e1rmAccessory(lastLoadKg, lastReps, lastVx);

  // Check if target was met for all sets
  const allTargetMet = sessionSets.every((s) => {
    const repsMet = s.reps >= (s.targetReps || targetReps);
    const varaMet = targetVx === null || s.actualVx === null || s.actualVx >= targetVx;
    return repsMet && varaMet;
  });

  const progress = existingProgress || {
    movementId: lastSet.movementId,
    currentE1RM: null,
    e1rmHistory: [],
    lastLoadKg: null,
    lastReps: null,
    suggestedLoadKg: null,
    suggestedAction: "hold",
    consecutiveTargetMetSessions: 0,
    stagnationWeeks: 0,
    stagnationFlagged: false,
    stagnationNotifiedAt: null,
    status: "active",
    restingSince: null,
  };

  // Update e1RM
  const prevE1RM = progress.currentE1RM;
  progress.currentE1RM = e1rm;
  progress.e1rmHistory = progress.e1rmHistory || [];
  if (e1rm !== null) {
    progress.e1rmHistory.push({ dateISO: todayISO(), e1rm });
  }
  progress.lastLoadKg = lastLoadKg;
  progress.lastReps = lastReps;

  // v4.34.36 BUG-FIX C: tallenna last-session Vx-tiedot accessoryProgressionia varten.
  // lastVxOvershoot = mean(actualVx) − targetVx (positiivinen = helpompi kuin target)
  // lastMinVx = pienin actualVx (V0 = failure → kevennys)
  const vxValues = sessionSets
    .map(s => s.actualVx)
    .filter(v => v !== null && v !== undefined);
  if (vxValues.length > 0 && targetVx !== null && targetVx !== undefined) {
    const meanActualVx = vxValues.reduce((a, b) => a + b, 0) / vxValues.length;
    progress.lastVxOvershoot = meanActualVx - targetVx;
    progress.lastMinVx = Math.min(...vxValues);
  } else {
    progress.lastVxOvershoot = null;
    progress.lastMinVx = null;
  }

  // Update target met counter
  if (allTargetMet) {
    progress.consecutiveTargetMetSessions = (progress.consecutiveTargetMetSessions || 0) + 1;
  } else {
    progress.consecutiveTargetMetSessions = 0;
  }

  // Update stagnation
  if (prevE1RM !== null && e1rm !== null && e1rm <= prevE1RM) {
    progress.stagnationWeeks = (progress.stagnationWeeks || 0) + 1;
  } else if (e1rm !== null && prevE1RM !== null && e1rm > prevE1RM) {
    progress.stagnationWeeks = 0;
    progress.stagnationFlagged = false;
  }

  if (progress.stagnationWeeks >= 3) {
    progress.stagnationFlagged = true;
  }

  // Compute suggestion
  const prog = accessoryProgression(progress);
  progress.suggestedLoadKg = prog.suggestedLoad;
  progress.suggestedAction = prog.action;

  return progress;
}

// ═══════════════════════════════════════════════════════════════
// NEW MOVEMENT INITIAL WEIGHT
// ═══════════════════════════════════════════════════════════════

function initialWeightFrom1RM(oneRepMax) {
  return roundToHalf(oneRepMax * 0.70);
}

// ═══════════════════════════════════════════════════════════════
// BLOCK RESOLUTION & ACCESSORY SCALAR (v4.25 P1-10)
// ═══════════════════════════════════════════════════════════════
//
// Periodisointiteoria (Issurin 2010, Israetel 2017):
// Accessory-volyymin tulisi laskea kun primary-intensiteetti nousee.
// Blokki 1 (hypertrofia) = full volume; blokki 4 (realization) = minimal.
// Tämä estää kumulatiivisen väsymyksen ennen kisaa ja pitää
// primary-liikkeiden palautumisen priorisoituna loppukaudella.
//
// Skaalarit (soveltuvat vain streetlifting_16w-mesosykleihin):
//   Vk 1-4  → 1.00 (hypertrofia: full accessory volume)
//   Vk 5-8  → 0.85 (voima: -15% accessory)
//   Vk 9-12 → 0.70 (intensifikaatio: -30% accessory)
//   Vk 13-16 → 0.50 (realization/taper: -50% accessory)

function getBlockForWeek(weekNum) {
  if (weekNum <= 4) return 1;
  if (weekNum <= 8) return 2;
  if (weekNum <= 12) return 3;
  return 4;
}

const ACCESSORY_BLOCK_SCALARS = { 1: 1.00, 2: 0.85, 3: 0.70, 4: 0.50 };

function getAccessoryBlockScalar(weekNum) {
  return ACCESSORY_BLOCK_SCALARS[getBlockForWeek(weekNum)] ?? 1.0;
}

// ═══════════════════════════════════════════════════════════════
// MU LOAD AUTOREGULATION (v4.25 P1-9)
// ═══════════════════════════════════════════════════════════════
//
// MU on teknis-voimahybridi: e1RM ei ole luotettava (bimodaalinen
// success/fail), joten progressio tapahtuu absoluuttisina kg-askelina
// edellisen session Vx-havainnoista:
//
//   Kaikki sarjat Vx ≥ 3  → +2.5 kg (helppo, nosta)
//   Keskimäärin Vx 2-3    → +0 kg (optimaalinen kuormitus, pidä)
//   Keskimäärin Vx 1-2    → -2.5 kg (liian raskas, pudota)
//   Yksikin sarja Vx 0    → -5 kg (failure, reset)
//
// Returns: { suggestedDeltaKg, reason, avgVx }

// v4.27.16: MU autoregulation Vx-gradient laajennettu (alkuperäinen).
// v4.32.9 M15: Gradient pienennetty puoleen — MU on suhteellisesti raskaampi liike
// kuin takakyykky. 91 kg atleetti, MU 1RM ≈ BW + 30-50 kg lisäpaino → +2.5 kg lisäys
// = 5-8% suhteellisesti, kun BS:ssä +5 kg / 200 kg = 2.5%. Eli MU:n +2.5 kg on
// funktionaalisesti yhtä iso askel kuin BS:n +5 kg. Pere Coll käytännössä +1-2.5 kg
// microloading WPU/MU:hun; Schulz (KoW) RPE-pohjainen 1.25-2.5 kg WPU/Dipissä,
// MU vielä konservatiivisemmin. Tutkimus: ei peer-reviewed-RCT MU-spesifisesti,
// mutta calisthenics-coaching-konsensus tukee pienempää askelta skill-painotteisille
// liikkeille.
//
// Uusi taso:
//   minVx === 0        → −2.5 kg (failure reset — pienempi pudotus kuin BS:ssä)
//   avgVx ≥ 4 & min≥3  → +2.5 kg (clearly easy — entinen +5 jaettu kahteen)
//   avgVx ≥ 3          → +1.25 kg (all-easy, microloading)
//   avgVx ≥ 2          →  0 kg   (optimal-hold)
//   avgVx < 2          → −1.25 kg (liian raskas, kevennä konservatiivisesti)
function adjustMULoad(recentMUSets) {
  if (!recentMUSets || recentMUSets.length === 0) {
    return { suggestedDeltaKg: 0, reason: "no-history", avgVx: null };
  }
  const lastSession = recentMUSets.slice(-3); // viim. 3 sarjaa ~= viim. sessio
  const varas = lastSession.map(s => s.actualVx).filter(v => v !== null && v !== undefined);
  if (varas.length === 0) {
    return { suggestedDeltaKg: 0, reason: "no-vx-data", avgVx: null };
  }
  const minVx = Math.min(...varas);
  const avgVx = varas.reduce((a, b) => a + b, 0) / varas.length;

  // v4.32.9 M15: gradient pienennetty puoleen MU-spesifyydelle
  if (minVx === 0) return { suggestedDeltaKg: -2.5, reason: "failure-reset", avgVx };
  if (avgVx >= 4 && minVx >= 3) return { suggestedDeltaKg: 2.5, reason: "very-easy-big-jump", avgVx };
  if (avgVx >= 3) return { suggestedDeltaKg: 1.25, reason: "all-easy-progress", avgVx };
  if (avgVx >= 2) return { suggestedDeltaKg: 0, reason: "optimal-hold", avgVx };
  return { suggestedDeltaKg: -1.25, reason: "too-hard-backoff", avgVx };
}

// ═══════════════════════════════════════════════════════════════
// FAILURE LOCKOUT (v4.25 P2-16)
// ═══════════════════════════════════════════════════════════════
//
// Jos edellisen primary-session jokin sarja päättyi Vx 0 (failure), seuraava
// sessio ei saa nostaa kuormaa. Tämä estää kumulatiivista ylikuormaa atleetin
// tunnetun grinding-taipumuksen alla (user_athlete_profile.md: "aliarvioi Vx").
//
// Returns: true if last session had Vx=0, false otherwise.

function hadFailureLastSession(recentTopSets) {
  if (!recentTopSets || recentTopSets.length === 0) return false;
  // Group by sessionId to find the most recent session
  const lastSessionId = recentTopSets[recentTopSets.length - 1].sessionId;
  if (!lastSessionId) return false;
  const lastSessionSets = recentTopSets.filter(s => s.sessionId === lastSessionId);
  return lastSessionSets.some(s => s.actualVx === 0);
}

// ═══════════════════════════════════════════════════════════════
// RATE-LIMIT ANCHOR (v4.27.14)
// ═══════════════════════════════════════════════════════════════
//
// Rate-limitin ankkurin valinta: session-vs-session -cappia varten tarvitaan
// "mistä cap nousee" -viitearvo. Aiempi v4.27.12-toteutus käytti viim. settiä
// (recentTopSets[length-1]) — altis yksittäisen anomalian vaikutukselle:
//   • Deload-session viim. setti @55% kevyt → cap sulkeutuu valloittavasti
//   • 3RM-testin 3. setti Vx0 → cap perustuu failure-settiin
//   • Grindiin päätynyt yksittäinen sarja vinouttaa cappia
//
// v4.27.14-strategia:
//   1. Ryhmitä sets sessionId:n mukaan (viim. 3 sessiota)
//   2. Kussakin sessiossa suodata pois: readiness_test, Vx0, externalLoad<=0
//   3. Laske kunkin session MEDIAN load + MEDIAN Vx
//   4. Ankkuri = RASKAIN median-load näistä → estää deload/test-session
//      vetämästä cappia keinotekoisesti alas
//
// v4.34.14: Palautetaan myös LAST-session-profiili. Kutsuva koodi voi ottaa
// MIN(heaviest × cap, last × cap_per_session) → estää historia-PR-bounce-back-ongelman:
// jos atleetilla on vanhoja korkeita kuormia mutta viim. sessio oli paljon kevyempi,
// vanha "heaviest" sallisi takaisinpalaamisen lähelle PR-tasoja yhdessä viikossa
// vaikka edellinen sessio osoitti aktuaalisen tason olevan matalampi.
//
// Returns: { medianLoad, medianVx, fromSessions, lastSession: { medianLoad, medianVx } } tai null.

function computeRateLimitAnchor(recentTopSets, opts = {}) {
  // v4.34.35: opts.excludeBackoff (default false) — kun true, backoff-sarjat
  // poistetaan anchor-laskusta. Bug: aiemmin primary V3-V4 + backoff V5-V6
  // sekoittuivat → median Vx vinoutui ylöspäin → cap rajoitti virheellisesti
  // primary-targetia. Recommend() antaa true:n primary-target-rate-limitille.
  const excludeBackoff = opts.excludeBackoff === true;
  if (!recentTopSets || recentTopSets.length === 0) return null;

  // Ryhmitä sessionId:n mukaan (säilytä aikajärjestys — recentTopSets on jo sortattu asc)
  const sessionOrder = [];
  const sessionGroups = new Map();
  for (const s of recentTopSets) {
    const sid = s.sessionId || `__no_session_${s.timestamp || ""}`;
    if (!sessionGroups.has(sid)) {
      sessionGroups.set(sid, []);
      sessionOrder.push(sid);
    }
    sessionGroups.get(sid).push(s);
  }

  // Ota viim. 3 sessiota
  const recentSessionIds = sessionOrder.slice(-3);

  // v4.34.28: Cal-sessioiden suodatus lastSession-haaraa varten (cowork-audit kohta 2.2 #2).
  // Aiempi bug: vk 4/8/12 cal-sessio (V1 @92%×3) tunnistettiin "raskaaksi sessioksi" ja
  // lastSession.medianVx = 1 → seuraava raskas-päivä target-Vx 2 = lastVxDelta +1 →
  // useLastAnchor=true → rate-limit cap liian tiukka cal-vk:n jälkeen. Korjaus:
  // tunnistetaan cal-sessiot per-profiili, ja last-haku ohittaa ne.
  const profiles = [];
  for (const sid of recentSessionIds) {
    const sessSets = sessionGroups.get(sid) || [];
    const sets = sessSets.filter(s =>
      (s.externalLoadKg || 0) > 0 &&
      s.setRole !== "readiness_test" &&
      s.actualVx !== 0  // Vx0 = failure, ei käytetä ankkurina
      && (!excludeBackoff || s.setRole !== "backoff") // v4.34.35: primary-only-mode
    );
    if (!sets.length) continue;
    const medianLoad = median(sets.map(s => s.externalLoadKg));
    const vxVals = sets.map(s => s.actualVx ?? s.targetVx ?? 2).filter(v => v !== null && v !== undefined);
    const medianVx = vxVals.length ? median(vxVals) : 2;
    // Cal-sessio jos vähintään 50% setistä on cal-rolea (deload+cal-päivä on hybridi:
    // muutama V4 deload-sarja + cal-sarja; cal dominoi merkitykseltään)
    const calSets = sessSets.filter(s => s.setRole === "calibration");
    const isCalibrationSession = calSets.length > 0 && calSets.length >= sets.length * 0.5;
    // v4.34.36 BUG-FIX B: tallenna session-päivämäärä multi-week-cap-laskua varten.
    // dateISO:n puuttuessa fallback timestamp.slice(0,10).
    const firstSet = sets[0];
    const dateISO = firstSet.dateISO || firstSet.timestamp?.slice(0, 10) || null;
    profiles.push({ sessionId: sid, medianLoad, medianVx, isCalibrationSession, dateISO });
  }

  if (profiles.length === 0) return null;

  // Ankkuri = raskain median-load näistä → deload/test-sessio ei vedä cappia alas.
  // Cal-sessiot SISÄLTYVÄT heaviest-anchoriin (cal-load voi legitimiivistä olla raskain).
  const anchor = profiles.reduce((best, p) => p.medianLoad > best.medianLoad ? p : best);
  // Last-session-profiili — käytä viim. EI-cal-sessiota (cal-vk on hybridi joka
  // vääristää lastVxDelta-laskennan: V1 cal → V2 raskas = +1 vaikka kuorma laskee).
  const nonCalProfiles = profiles.filter(p => !p.isCalibrationSession);
  const last = nonCalProfiles.length > 0
    ? nonCalProfiles[nonCalProfiles.length - 1]
    : profiles[profiles.length - 1];
  return {
    medianLoad: anchor.medianLoad,
    medianVx: anchor.medianVx,
    fromSessions: profiles.length,
    lastSession: {
      medianLoad: last.medianLoad,
      medianVx: last.medianVx,
      isCalibration: last.isCalibrationSession === true,
      dateISO: last.dateISO || null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// PROGRESSION TARGET (v4.35.0 — Eliittitason refaktorointi)
// ═══════════════════════════════════════════════════════════════
//
// Yhtenäinen funktio joka päättää progressio-targetin huomioimalla:
//   1. Helms 2018: Vx-mismatch session-välillä (lievennetty 1Vx = 2%)
//   2. Viikoittainen baseline-progressio (+2.5%/vk × weeksSinceLast)
//   3. Regain-multiplier (Cumming 2024, Psilander 2018)
//   4. V0-grindi-suoja (atletin profiili, −5%)
//   5. Plan-floor (prescribed × baseline = lattia, autoreg voi vain nostaa)
//   6. Hard-cap (max +15% × weeksSinceLast)
//   7. Floor-cap taaksepäin yhteensopivuus (regression-suoja)
//   8. Yliajot: cal/deload/speed-päivä → naive plan
//
// Puhdas funktio: deterministinen, ei sivuvaikutuksia, ei async.
// Pyöristys jätetään kutsujan tehtäväksi (roundToHalf).
// Trace.ruleHits[] sisältää vanhat ruleId:t taaksepäin yhteensopivuudeksi.
//
// @param {object} ctx
// @param {{medianLoad, medianVx, isCalibration, dateISO}|null} ctx.lastSession
//        Viim. session profiili (computeRateLimitAnchor.lastSession)
// @param {number} ctx.targetVx - Tämän session prescribed Vx
// @param {{deltaPctBase}|null} ctx.weekDef - Mesosykli-vk
// @param {string} ctx.dayType - "heavy" | "volume" | "speed" | "competition"
// @param {number|null} ctx.cfgBaseline - Cfg-arvo (esim. 185 kg) — null jos ei
// @param {number|null} ctx.planTarget - Prescribed_pct × baseline (jo laskettu)
// @param {boolean} ctx.planBasedActive - Onko PLAN_BASED_E1RM aktivoitunut
// @param {string} ctx.dateISO - Tämän session päivämäärä
// @returns {{targetLoad: number|null, decisionTrace: object}}
function computeProgressionTarget(ctx) {
  const cfg = PROGRESSION_CONFIG;

  const trace = {
    inputs: {
      lastLoad: ctx.lastSession?.medianLoad ?? null,
      lastVx: ctx.lastSession?.medianVx ?? null,
      lastIsCal: ctx.lastSession?.isCalibration ?? null,
      lastDateISO: ctx.lastSession?.dateISO ?? null,
      targetVx: ctx.targetVx,
      deltaPctBase: ctx.weekDef?.deltaPctBase ?? null,
      dayType: ctx.dayType,
      cfgBaseline: ctx.cfgBaseline,
      planTarget: ctx.planTarget,
      planBasedActive: ctx.planBasedActive === true,
      dateISO: ctx.dateISO,
    },
    regainRatio: null,
    regainMultiplier: 1.0,
    weeklyProgressionPct: 0,
    vxAdjustmentPct: 0,
    weeksSinceLast: 0,
    autoregTarget: null,
    planFloor: ctx.planTarget,
    hardCap: null,
    finalTarget: null,
    ruleHits: [],
    rationale: '',
  };

  const { lastSession, targetVx, weekDef, dayType, cfgBaseline, planTarget,
          planBasedActive, dateISO } = ctx;

  // 1. YLIAJOT: deload, speed, ei lastSessionia, ei planTargetia → naive plan
  const isDeload = (weekDef?.deltaPctBase ?? 0) < 0;
  const isSpeed = dayType === 'speed';

  if (isDeload) {
    trace.finalTarget = planTarget;
    trace.ruleHits.push('PROGRESSION_DELOAD_PASSTHROUGH');
    trace.rationale = `Deload-vk (deltaPctBase ${weekDef.deltaPctBase}): prescribed × baseline (autoreg ohitettu).`;
    return { targetLoad: planTarget, decisionTrace: trace };
  }
  if (isSpeed) {
    trace.finalTarget = planTarget;
    trace.ruleHits.push('PROGRESSION_SPEED_PASSTHROUGH');
    trace.rationale = `Speed-päivä: prescribed × baseline (autoreg ohitettu, intensiteetti tulee Vx:stä).`;
    return { targetLoad: planTarget, decisionTrace: trace };
  }
  if (lastSession === null || lastSession === undefined) {
    trace.finalTarget = planTarget;
    trace.ruleHits.push('PROGRESSION_NO_HISTORY');
    trace.rationale = `Ei viim. ei-cal-sessiota → naive plan.`;
    return { targetLoad: planTarget, decisionTrace: trace };
  }
  if (planTarget === null || planTarget === undefined) {
    trace.finalTarget = null;
    trace.ruleHits.push('PROGRESSION_NO_PLAN');
    trace.rationale = `Ei plan-targetia → null (kutsujan vastuu fallback).`;
    return { targetLoad: null, decisionTrace: trace };
  }

  // 2. V0-grindi-suoja (ennen muuta logiikkaa)
  // Jos viim. sessio meni V0-failina (ei cal), seuraavalle konservatiivinen palautus
  if (lastSession.medianVx === 0 && !lastSession.isCalibration) {
    const conservativeTarget = lastSession.medianLoad * (1 + cfg.V0_GRINDI_PENALTY);
    // Plan-target on edelleen lattia: jos suunnitelma sanoo jotain matalampaa,
    // V0-suoja saa pudottaa kuormaa siihen mutta ei alle.
    const target = Math.max(planTarget, conservativeTarget);
    trace.finalTarget = target;
    trace.ruleHits.push('PROGRESSION_V0_PROTECTION');
    trace.rationale = `V0-fail viim. sessio (${lastSession.medianLoad}@V0) → ${(cfg.V0_GRINDI_PENALTY*100).toFixed(0)}% palautus (= ${conservativeTarget.toFixed(1)} kg). Plan-floor ${planTarget.toFixed(1)} kg ${target === planTarget ? 'voittaa' : 'ohitettu'}.`;
    return { targetLoad: target, decisionTrace: trace };
  }

  // 3. Regain-ratio (vain jos cfgBaseline saatavilla)
  let regainRatio = null;
  let regainMultiplier = 1.0;
  if (cfgBaseline && cfgBaseline > 0) {
    regainRatio = lastSession.medianLoad / cfgBaseline;
    if (regainRatio < cfg.REGAIN_THRESHOLD_FAR) {
      regainMultiplier = cfg.REGAIN_MULTIPLIER_FAR;
      trace.ruleHits.push('PROGRESSION_REGAIN_FAR');
    } else if (regainRatio < cfg.REGAIN_THRESHOLD_NEAR) {
      regainMultiplier = cfg.REGAIN_MULTIPLIER_NEAR;
      trace.ruleHits.push('PROGRESSION_REGAIN_NEAR');
    }
  }
  trace.regainRatio = regainRatio;
  trace.regainMultiplier = regainMultiplier;

  // 4. Weeks since last (multi-week-aware)
  let weeksSinceLast = 1;
  if (lastSession.dateISO && dateISO) {
    const daysSince = Math.max(1, Math.floor(
      (new Date(dateISO).getTime() - new Date(lastSession.dateISO).getTime()) / 86400000
    ));
    weeksSinceLast = Math.min(3, Math.max(1, Math.ceil(daysSince / 7)));
  }
  trace.weeksSinceLast = weeksSinceLast;

  // 5. Vx-mismatch-säätö (Helms 2018 lievennettynä)
  // Jos last_Vx > target_Vx (= viime kerta oli helpompaa kuin tavoiteltiin),
  // nostetaan kuormaa. Vx-skaala: korkeampi luku = helpompi.
  let vxAdjustmentPct = 0;
  if (lastSession.medianVx > targetVx) {
    const vxDiff = lastSession.medianVx - targetVx;
    vxAdjustmentPct = vxDiff * cfg.HELMS_VX_TO_LOAD_PCT_BETWEEN_SESSIONS;
  }
  trace.vxAdjustmentPct = vxAdjustmentPct;

  // 6. Viikoittainen progressio (Helms baseline × regain × weeks)
  const weeklyProgressionPct = cfg.WEEKLY_BASELINE_PR_PHASE * regainMultiplier * weeksSinceLast;
  trace.weeklyProgressionPct = weeklyProgressionPct;

  // 7. Yhdistetty autoreg-target
  // PLAN_BASED-yhteensovitus: jos PLAN_BASED jo aktivoitui primary-haarassa,
  // sen tulos on jo nostanut planTargetin Helms 2018:n mukaisesti. Älä lisää
  // weekly_progression päälle (kaksoiskirjaus-suoja). vxAdjustment lisätään
  // silti, koska se on eri mekanismi (PLAN_BASED tunnistaa saman session
  // overshoot:in, vxAdjustment tunnistaa session-välisen Vx-helpotuksen).
  let totalProgression;
  if (planBasedActive) {
    totalProgression = vxAdjustmentPct;
    trace.ruleHits.push('PROGRESSION_PLAN_BASED_HARMONIZED');
  } else {
    totalProgression = vxAdjustmentPct + weeklyProgressionPct;
  }
  const autoregTarget = lastSession.medianLoad * (1 + totalProgression);
  trace.autoregTarget = autoregTarget;

  // 8. Hard-cap (max +15% × weeksSinceLast)
  const hardCap = lastSession.medianLoad * (1 + cfg.HARD_CAP_PER_WEEK * weeksSinceLast);
  trace.hardCap = hardCap;

  // 9. Lopullinen target
  // Plan-floor: prescribed × baseline = lattia, autoregulaatio voi vain nostaa
  let finalTarget = Math.max(planTarget, autoregTarget);

  // Hard-cap voittaa
  if (finalTarget > hardCap) {
    finalTarget = hardCap;
    trace.ruleHits.push('PROGRESSION_HARD_CAP');
  }

  // 10. Floor-cap (taaksepäin yhteensopivuus): jos viim. sessio meni Vx >= target,
  // älä putoa alle viim. session medianLoadin (regression-suoja).
  // Sallii tasolla pysymisen (Vx_diff = 0 ja weekly-progressio = 0 jälkeen
  // PR-vaiheessa cap voi tuottaa sama kuorma).
  if (lastSession.medianVx >= targetVx
      && !lastSession.isCalibration
      && finalTarget < lastSession.medianLoad - cfg.ROUNDING_TOLERANCE) {
    finalTarget = lastSession.medianLoad;
    trace.ruleHits.push('PROGRESSION_FLOOR_CAP');
  }

  trace.finalTarget = finalTarget;

  // 11. Rationale
  if (regainMultiplier > 1.0) {
    const phaseLbl = regainRatio < cfg.REGAIN_THRESHOLD_FAR ? 'aggressive regain' : 'mild regain';
    trace.rationale = `${phaseLbl} (ratio ${regainRatio.toFixed(2)}, ×${regainMultiplier.toFixed(1)}): weekly ${(weeklyProgressionPct*100).toFixed(1)}% (${(cfg.WEEKLY_BASELINE_PR_PHASE*100).toFixed(1)}% × ${regainMultiplier.toFixed(1)} × ${weeksSinceLast}vk)${vxAdjustmentPct > 0 ? ` + Vx-adj ${(vxAdjustmentPct*100).toFixed(1)}% (last V${lastSession.medianVx} > target V${targetVx})` : ''}. Target ${finalTarget.toFixed(1)} kg ${finalTarget === planTarget ? '(plan-floor)' : finalTarget === hardCap ? '(hard-cap)' : '(autoreg)'}.`;
  } else {
    trace.rationale = `PR-phase: weekly ${(weeklyProgressionPct*100).toFixed(1)}% (${(cfg.WEEKLY_BASELINE_PR_PHASE*100).toFixed(1)}% × ${weeksSinceLast}vk)${vxAdjustmentPct > 0 ? ` + Vx-adj ${(vxAdjustmentPct*100).toFixed(1)}%` : ''}${planBasedActive ? ' [plan-based harmonized]' : ''}. Target ${finalTarget.toFixed(1)} kg ${finalTarget === planTarget ? '(plan-floor)' : finalTarget === hardCap ? '(hard-cap)' : '(autoreg)'}.`;
  }

  return { targetLoad: finalTarget, decisionTrace: trace };
}

// ═══════════════════════════════════════════════════════════════
// LOAD-VELOCITY PROFILE (v4.25.1 — Enode-valmistelu)
// ═══════════════════════════════════════════════════════════════
//
// Rakentaa henkilökohtaisen load-velocity-käyrän ankkuripiste-sarjoista
// (top singlet, openerit, kalibrointitestit). Käyrän avulla voidaan:
//   1. estimoida e1RM ilman failurea (velocity @95% 1RM ≈ liikekohtainen)
//   2. ristiinverrata Vx-pohjaista e1RM:ää (diagnostiikka)
//   3. seurata neurovoiman muutosta kuorma-vakiolla (velocity nousee samalla kuormalla → PR-momentum)
//
// Käyttö: vain sarjoille joilla velocityMean !== null JA setRole on
// "top" | "readiness_test" JA reps === 1 (puhdas 1RM-arvion pohjadata).
// Multi-rep-setit (2+) jäävät ulos koska MCV riippuu rep-positiosta.
//
// Input: sets[] (sessions-store-tasoisia), bodyweightKg, isBarbell
// Output: {
//   points: [{ loadPct, velocity, dateISO, externalLoadKg, systemLoadKg }],
//   slope: number,        // m/s per %1RM (tyypillisesti negatiivinen)
//   intercept: number,    // y-intercept regressioviivasta
//   v1rmEstimate: number, // velocity @100% loadPct (regressioennuste samplen 100%-tasoon)
//   e1rmCrossCheck: number | null, // velocity-pohjainen 1RM arvio (kg, ext) — käyttää MVT:tä
//   n: number             // pisteiden lukumäärä
// }
//
// Evidenssi: González-Badillo & Sánchez-Medina 2010 — LV-relaatio lineaarinen
// luotettavasti välillä 30-100% 1RM samalle liikkeelle samalle henkilölle.
//
// v4.34.25: MOVEMENT_MVT-vakio liike-spesifisille MVT-arvoille (Minimum Velocity
// Threshold, m/s). Aiempi cross-check-laskenta oli matemaattisesti degeneroitunut:
// estimate = systemLoad / loadPct = systemLoad / (systemLoad/maxLoad) = maxLoad
// kaikille pisteille, jolloin regressio ei vaikuttanut tulokseen ja diagnostic-
// trace VBT_E1RM_CROSSCHECK oli pseudosignaali.
//
// KORJAUS: regressio on nyt y = slope × loadPct + intercept. MVT-velocityyn
// vastaava loadPct = (MVT - intercept) / slope. 1RM systemLoad = maxLoad × loadPctAtMVT
// (extrapolointi MVT-kohtaan, voi olla > 1.0 = ennustaa true-1RM korkeammaksi
// kuin näytteessä havaittu max).
//
// Lähteet:
//   - Sánchez-Moreno 2017: pull-up MVT ≈ 0.23 m/s
//   - Pareja-Blanco/González-Badillo: bench MVT ≈ 0.17 m/s, squat ≈ 0.30 m/s
//   - González-Badillo: deadlift MVT ≈ 0.14 m/s
const MOVEMENT_MVT = {
  "Lisäpainoleuanveto":      0.23,  // Sánchez-Moreno 2017
  "Vastaote-leuanveto":      0.23,
  "Paused pull-up":          0.20,  // pause = hieman matalampi MVT
  "Tempo pull-up":           0.20,
  "Lisäpainodippi":          0.20,  // estimaatti, kalibroidaan oman datan myötä
  "Dippi":                   0.20,
  "Takakyykky":              0.30,  // Pareja-Blanco
  "Etukyykky":               0.30,
  "Paused squat":            0.27,
  "Box squat":               0.30,
  "Tempo squat":             0.27,
  "Pin squat":               0.30,
  "Penkkipunnerrus":         0.17,  // Pareja-Blanco
  "Paused bench press":      0.15,
  "Vinopenkkipunnerrus":     0.18,
  "Close-grip bench":        0.17,
  "Spoto press":             0.15,
  "Pystypunnerrus":          0.19,  // estimaatti
  "Push press":              0.22,
  "Maastaveto":              0.14,  // González-Badillo
  "Romanian DL":             0.18,
  "Snatch-grip DL":          0.14,
  "Block pull":              0.14,
  "Paused DL":               0.12,  // pause-deadlift selvästi matalampi
  "Deficit DL":              0.14,
  "Muscle-up":               0.30,  // streetlifting, ei tarkkaa kirjallisuutta
  // v4.38.0: Räjähtävän leuanvedon variantit aliasoituvat Lisäpainoleuanvetoon (0.23).
  // Perustelu: MVT = velocity 1RM:llä, ei training-load-velocity. Sama atleetti +
  // sama liikemekaniikka (vertikaaliveto + lisäpaino) → V@failure konvergoituu samaan
  // riippumatta sub-max intent:istä. Räjähtävässä variantissa ei ole pausea, joten
  // 0.20 (Paused pull-up) ei sovellu. Lähde: Sánchez-Moreno 2017 + Helms 2017 -baseline.
  "Räjähtävä leuanveto":     0.23,
  "Räjähtävä leuka":         0.23,
  "Räjähtävä leuka (vyö)":   0.23,
};
// Default-MVT tuntemattomille liikkeille (konservatiivinen, kyykky-tasolla)
const DEFAULT_MVT = 0.25;

// v4.38.0: Behrmann et al. 2025 (Sensors) -löydös EnodePro-validaatiosta:
// MAPE 4-42%, yliarviointi systemaattinen erityisesti hitailla nopeuksilla
// (<0.5 m/s) bench/squat-pohjadatassa. Streetlifting-V1RM-alueella (squat 0.30,
// bench 0.17, weighted pull-up 0.23, dip 0.20, deadlift 0.14) Enoden 1RM-prediktio
// on epäluotettava. Käytä trendiseurantaan; älä valitse kisapäivän openeria
// pelkän velocity-e1RM:n perusteella. Hernández-Belmonte 2025 + Lemus 2024
// vahvistavat: GymAware RS on ainoa bias-vapaa LPT advanced-tason atleeteille.
const ENODE_LOW_VELOCITY_CAVEAT = "Enode-mittaus tällä hidasalueella (alle 0,5 m/s) yliarvioi nopeutta hieman. Käytä mittauksia trendin seuraamiseen — älä luota yksittäiseen lukuun kisapäivän opener-valinnassa.";

function computeLoadVelocityProfile(sets, bodyweightKg, options = {}) {
  // v4.34.25: movementName lisätty MVT-haulle
  const { isBarbell = false, currentE1RMExternal = null, movementName = null } = options;
  if (!sets || sets.length === 0) {
    return { points: [], slope: null, intercept: null, v1rmEstimate: null, e1rmCrossCheck: null, n: 0, mvt: null };
  }

  // Suodata: vain single-rep-setit joilla velocityMean tallennettuna.
  // Velocity-input-gating (index.html) varmistaa että vain ankkuripisteisiin
  // kirjataan velocity → presence of velocityMean + reps===1 on riittävä suodatin.
  // Ei rajoiteta setRoleen koska secondary-slot-top-singlet tallentuvat
  // "accessory"-rolena save-layerissa.
  // v4.34.25: testit voivat ohittaa reps-suodattimen (anchorit ovat synteettisiä)
  const anchors = sets.filter(s =>
    (s.velocityMean !== null && s.velocityMean !== undefined) &&
    (s.externalLoadKg !== null && s.externalLoadKg !== undefined)
  );

  if (anchors.length < 2) {
    return { points: anchors.map(a => ({
      loadPct: null, velocity: a.velocityMean, dateISO: a.dateISO || a.timestamp || null,
      externalLoadKg: a.externalLoadKg, systemLoadKg: isBarbell ? a.externalLoadKg : (a.externalLoadKg + bodyweightKg),
    })), slope: null, intercept: null, v1rmEstimate: null, e1rmCrossCheck: null, n: anchors.length, mvt: null };
  }

  // Laske loadPct jokaiselle: suhteessa ikkunan max-kuormaan
  const systemLoads = anchors.map(s => isBarbell ? s.externalLoadKg : (s.externalLoadKg + bodyweightKg));
  const maxLoad = Math.max(...systemLoads);
  const points = anchors.map((s, i) => ({
    loadPct: systemLoads[i] / maxLoad,
    velocity: s.velocityMean,
    dateISO: s.dateISO || s.timestamp || null,
    externalLoadKg: s.externalLoadKg,
    systemLoadKg: systemLoads[i],
  }));

  // Lineaarinen regressio: velocity = slope × loadPct + intercept
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.loadPct, 0);
  const sumY = points.reduce((a, p) => a + p.velocity, 0);
  const sumXY = points.reduce((a, p) => a + p.loadPct * p.velocity, 0);
  const sumXX = points.reduce((a, p) => a + p.loadPct * p.loadPct, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0 || Math.abs(denom) < 1e-9) {
    return { points, slope: null, intercept: null, v1rmEstimate: null, e1rmCrossCheck: null, n, mvt: null };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Velocity @100% loadPct (sample-tason 100%-piste — "näytteen rajalla mitattu MVT-ennuste")
  const v1rmEstimate = slope * 1.0 + intercept;

  // v4.34.25: E1RM cross-check liike-spesifillä MVT:llä.
  // Aiempi laskenta degeneroitui maxLoad-arvoon (regressio ohitettiin). Korjattu:
  // regressio antaa loadPctAtMVT = (MVT - intercept) / slope, ja 1RM systemLoad =
  // maxLoad × loadPctAtMVT. Extrapolointi yli sample-rangen (loadPctAtMVT > 1.0)
  // sallittu — kertoo todelliseen 1RM:ään asti, ei pelkkä sample-max.
  const mvt = (movementName && MOVEMENT_MVT[movementName] !== undefined)
    ? MOVEMENT_MVT[movementName]
    : DEFAULT_MVT;
  let e1rmCrossCheck = null;

  // Sanity-tarkistukset:
  // - slope pitää olla negatiivinen (velocity laskee load:n kasvaessa)
  // - jos slope ≥ 0 tai liian lähellä nollaa → regressio epäluotettava
  // - jos loadPctAtMVT ulkopuolelle [0.5, 2.5] → epärealistinen extrapolointi
  if (slope < -0.01) {
    const loadPctAtMVT = (mvt - intercept) / slope;
    if (loadPctAtMVT > 0.5 && loadPctAtMVT < 2.5) {
      const systemAt1RM = maxLoad * loadPctAtMVT;
      e1rmCrossCheck = isBarbell ? systemAt1RM : Math.max(0, systemAt1RM - bodyweightKg);
    }
  }

  return { points, slope, intercept, v1rmEstimate, e1rmCrossCheck, n, mvt };
}

// v4.34.28: Vk 14 peaking decision-tree -kortin datapisteiden aggregointi
// (cowork-audit kohta 3.4). Kortti näyttää atleetille 6-10 datapistettä joiden
// pohjalta päättää vk 15 opener-rehearsaliin spesifi-intensiteetti (@93% vs @95%).
// Aiempi rakenne: TEKSTI-muistiinpano TI vk 14:n primaryNotessa. Tämä on
// rakenteellinen korvaaja jonka UI voi renderöidä.
function computePeakingDecisionTreeCard(ctx) {
  const { mesocycle, allSets, measurements, decisionTraces, currentE1RMExternal, primaryMovementId, dateISO, bodyweightKg } = ctx;
  if (!mesocycle || !primaryMovementId) return null;
  const wk = getMesocycleWeek(mesocycle, dateISO);
  // Aktivoituu vk 14 alusta — 1 vk ennen opener-rehearsalia (vk 15)
  if (wk !== 14) return null;

  // Datapisteet:
  // 1. Vk 12 cal-tulos (e1RM)
  const calSets = (allSets || []).filter(s =>
    s.movementId === primaryMovementId && s.setRole === "calibration"
  );
  const lastCal = calSets[calSets.length - 1] || null;
  const calE1RM = lastCal && lastCal.externalLoadKg && lastCal.reps
    ? Math.round(e1rmAccessory(lastCal.externalLoadKg, lastCal.reps, lastCal.actualVx ?? 1) * 10) / 10
    : null;

  // 2. Vk 12 → vk 14 e1RM-trendi (kasvanut/vakio/laskenut)
  const e1rmTrendDelta = (calE1RM !== null && currentE1RMExternal !== null)
    ? Math.round((currentE1RMExternal - calE1RM) * 10) / 10
    : null;

  // 3. HRV-trendi viim. 7 pv vs baseline
  const hrvRecent = (measurements || [])
    .filter(m => m.hrv != null)
    .slice(-7);
  const hrvAvg = hrvRecent.length > 0
    ? Math.round((hrvRecent.reduce((a, m) => a + m.hrv, 0) / hrvRecent.length) * 10) / 10
    : null;

  // 4. MPV viim. mittaus
  const mpvRecent = (measurements || []).filter(m => m.mpv != null);
  const mpvLast = mpvRecent.length > 0 ? mpvRecent[mpvRecent.length - 1].mpv : null;

  // 5. Bodyweight muutos vk 12 → vk 14
  const bwMeasurements = (measurements || []).filter(m => m.bodyweightKg != null).slice(-14);
  const bwDelta = bwMeasurements.length >= 2
    ? Math.round((bwMeasurements[bwMeasurements.length - 1].bodyweightKg - bwMeasurements[0].bodyweightKg) * 10) / 10
    : null;

  // 6. Vk 12 cal-päivän actualVx-mediaani (kuinka helposti meni)
  const lastCalVx = lastCal?.actualVx ?? null;

  // 7. Velocity vk 12 cal-sessiossa (jos Enode käytössä)
  const lastCalVelocity = lastCal?.velocityMean ?? null;

  // 8. Decision-tracet vk 13-14 ajalta — onko E1RM_INFLATION_CAP, FAILURE_LOCKOUT laukennut?
  const recentTraces = (decisionTraces || []).filter(t => {
    if (!t.recId) return false;
    return ["E1RM_INFLATION_CAP", "E1RM_DEFLATION_CAP", "FAILURE_LOCKOUT", "PROGRESSION_RATE_LIMIT"].includes(t.ruleId);
  });
  const ruleFreqRecent = {};
  for (const t of recentTraces) {
    ruleFreqRecent[t.ruleId] = (ruleFreqRecent[t.ruleId] || 0) + 1;
  }

  // 9. Predicted PR @95% vs @93% — paljonko kuorma eroaa absoluuttisesti
  const load93 = currentE1RMExternal !== null ? Math.round(currentE1RMExternal * 0.93 * 4) / 4 : null;
  const load95 = currentE1RMExternal !== null ? Math.round(currentE1RMExternal * 0.95 * 4) / 4 : null;

  // 10. Suositus-tier perustuen datapisteisiin
  const positiveSignals = [];
  const negativeSignals = [];
  if (e1rmTrendDelta !== null && e1rmTrendDelta > 2) positiveSignals.push(`e1RM noussut +${e1rmTrendDelta} kg vk 12:sta`);
  else if (e1rmTrendDelta !== null && e1rmTrendDelta < -2) negativeSignals.push(`e1RM laskenut ${e1rmTrendDelta} kg vk 12:sta`);
  if (lastCalVx !== null && lastCalVx >= 2) positiveSignals.push(`vk 12 cal Vx ${lastCalVx} (selvä margin)`);
  else if (lastCalVx !== null && lastCalVx <= 0) negativeSignals.push(`vk 12 cal Vx ${lastCalVx} (failure)`);
  if (ruleFreqRecent.FAILURE_LOCKOUT) negativeSignals.push(`FAILURE_LOCKOUT laukennut ${ruleFreqRecent.FAILURE_LOCKOUT}× viim. päätöksissä`);
  if (ruleFreqRecent.E1RM_INFLATION_CAP) negativeSignals.push(`INFLATION_CAP rajoittanut ${ruleFreqRecent.E1RM_INFLATION_CAP}×`);

  let recommendation = "neutral";
  if (positiveSignals.length >= 2 && negativeSignals.length === 0) recommendation = "consider-95";
  else if (negativeSignals.length >= 1) recommendation = "stay-93";

  return {
    week: 14,
    datapoints: {
      vk12CalE1RM: calE1RM,
      vk12CalVx: lastCalVx,
      vk12CalVelocity: lastCalVelocity,
      currentE1RMExternal: currentE1RMExternal !== null ? Math.round(currentE1RMExternal * 10) / 10 : null,
      e1rmTrendDelta,
      hrvAvg7d: hrvAvg,
      mpvLast,
      bodyweightDelta: bwDelta,
      ruleFreqRecent,
      load93,
      load95,
    },
    positiveSignals,
    negativeSignals,
    recommendation, // "consider-95" | "stay-93" | "neutral"
    rationale: recommendation === "consider-95"
      ? `Datapisteet tukevat @95%-yritystä: ${positiveSignals.join("; ")}.`
      : recommendation === "stay-93"
      ? `Pidä @93% — riskisignaaleja: ${negativeSignals.join("; ")}.`
      : "Ei selvää signaalia — pidä @93% (default-konservatiivinen).",
    note: "Päätös atleetilla, ei automaattinen. Pritchard 2016: peak-intensity 90-95% × 1.9±0.8 vk pre-comp.",
  };
}

// v4.34.27: VBT (Velocity-Based Training) Reliability-portti.
// Ennen kuin velocity-pohjainen e1RM voi haastaa Vx-pohjaisen primary-haarana,
// sen on osoitettava luotettavuutensa kahdella kriteerillä:
//   1. n ≥ 10 ankkuripistettä viim. 4 vk (tarpeeksi dataa regressiolle)
//   2. |velocity-e1RM − Vx-e1RM| / Vx-e1RM ≤ 5% (konvergenssi)
//
// Hysteresis: kun jo promoted, demote-kynnys = 8% (ei flikkaa edestakaisin
// 5-7% rajalla). Tämä noudattaa cowork-arvioinnin reliability-portti -mallia
// (kohta 4 vk 1-3 punchlistissa).
//
// MVP: yksi diff-arvio per kutsu — ei vielä convergence-historia (joka vaatisi
// session-tason snapshotteja). Voi lisätä myöhemmin kun datapintaa kertyy.
const VBT_MIN_ANCHORS = 10;
const VBT_ANCHOR_WINDOW_DAYS = 28;
const VBT_PROMOTE_THRESHOLD = 0.05;  // 5%
const VBT_DEMOTE_THRESHOLD = 0.08;   // 8% — hysteresis

// v4.38.0 (Phase 1D): L-V-profiilin detraining decay -aikatriggerit.
// Tutkimusaukko spesifiselle slope/intercept-driftille (Häkkinen 2000 / Hortobágyi
// 1993 / Hwang 2017 lähimmät proxy:t — strength-decay 1 vk merkityksetön, 2 vk
// pieni, ≥ 3 vk slope todennäköisesti loivenee). Kynnykset coaching-päätöksiä,
// ei suoraa peer-reviewed-evidenssiä elite-tasolla.
//   - 14 pv ilman uusia ankkureita → freshness="stale" (warning, regressio toimii)
//   - 21 pv ilman uusia ankkureita → freshness="needs-recalibration" (blokkaa
//     promotion, suosittelee 2-piste mini-L-V-vahvistustestiä)
const VBT_STALE_PROFILE_DAYS = 14;
const VBT_FORCE_RECAL_DAYS = 21;

function computeVBTPromotionStatus(allSets, movementId, currentE1RMExternal, options = {}) {
  const isBarbell = options.isBarbell === true;
  const bodyweightKg = options.bodyweightKg || 91;
  const movementName = options.movementName || null;
  const previouslyPromoted = options.previouslyPromoted === true;
  const todayISOArg = options.todayISO || todayISO();

  if (!movementId || !currentE1RMExternal || currentE1RMExternal <= 0) {
    return {
      status: "not-eligible",
      anchorCount: 0,
      diffPct: null,
      reason: "movementId tai e1RM puuttuu",
      recommendedE1RM: null,
      velocityE1RM: null,
      vxE1RM: currentE1RMExternal || null,
      // v4.38.3: rakenne yhdenmukainen muiden return-haarojen kanssa
      mvt: null,
      deviceCaveat: null,
      freshness: "no-data",
      daysSinceLastAnchor: null,
      latestAnchorDate: null,
    };
  }

  // Filter ankkuripisteet: viim. 28 päivää, oikeassa liikkeessä, velocityMean tallennettu
  const cutoff = new Date(todayISOArg);
  cutoff.setDate(cutoff.getDate() - VBT_ANCHOR_WINDOW_DAYS);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const anchors = allSets.filter(s =>
    s.movementId === movementId &&
    s.velocityMean !== null && s.velocityMean !== undefined &&
    s.externalLoadKg !== null && s.externalLoadKg !== undefined &&
    (s.dateISO || s.timestamp || "9999-12-31") >= cutoffISO
  );

  if (anchors.length < VBT_MIN_ANCHORS) {
    return {
      status: "not-eligible",
      anchorCount: anchors.length,
      diffPct: null,
      reason: `Vain ${anchors.length}/${VBT_MIN_ANCHORS} ankkuripistettä viim. ${VBT_ANCHOR_WINDOW_DAYS} pv`,
      recommendedE1RM: null,
      velocityE1RM: null,
      vxE1RM: currentE1RMExternal,
      mvt: null,
      deviceCaveat: null,
      freshness: "no-data",
      daysSinceLastAnchor: null,
      latestAnchorDate: null,
    };
  }

  // v4.38.0 (Phase 1D): Freshness-tarkistus ennen regressiota. Etsi viim.
  // ankkuripiste ja laske ikä päivinä today:hyn nähden. 14 pv → stale-flag,
  // 21 pv → blokkaa promotion + suosittele mini-L-V-rekalibrointia.
  const latestAnchorDate = anchors
    .map(s => s.dateISO || (s.timestamp ? s.timestamp.slice(0, 10) : null))
    .filter(Boolean)
    .sort()
    .pop() || null;
  let freshness = "fresh";
  let daysSinceLastAnchor = null;
  if (latestAnchorDate) {
    const today = new Date(todayISOArg);
    const last = new Date(latestAnchorDate);
    daysSinceLastAnchor = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    if (daysSinceLastAnchor >= VBT_FORCE_RECAL_DAYS) freshness = "needs-recalibration";
    else if (daysSinceLastAnchor >= VBT_STALE_PROFILE_DAYS) freshness = "stale";
  }
  if (freshness === "needs-recalibration") {
    return {
      status: "not-eligible",
      anchorCount: anchors.length,
      diffPct: null,
      reason: `Malli vanhentunut: ${daysSinceLastAnchor} päivää ilman uutta dataa (raja ${VBT_FORCE_RECAL_DAYS} pv). Suositus: aja uusi kalibrointitesti ennen kuin luotat malliin uudelleen.`,
      recommendedE1RM: null,
      velocityE1RM: null,
      vxE1RM: currentE1RMExternal,
      mvt: null,
      deviceCaveat: null,
      freshness,
      daysSinceLastAnchor,
      latestAnchorDate,
    };
  }

  const lvProfile = computeLoadVelocityProfile(anchors, bodyweightKg, {
    isBarbell, currentE1RMExternal, movementName,
  });

  if (lvProfile.e1rmCrossCheck === null) {
    return {
      status: "not-eligible",
      anchorCount: anchors.length,
      diffPct: null,
      reason: "LV-regressio epäluotettava (slope ≥ 0 tai loadPct@MVT ulkopuolelle [0.5, 2.5])",
      recommendedE1RM: null,
      velocityE1RM: null,
      vxE1RM: currentE1RMExternal,
      mvt: lvProfile.mvt,
      deviceCaveat: (lvProfile.mvt !== null && lvProfile.mvt < 0.5) ? ENODE_LOW_VELOCITY_CAVEAT : null,
      freshness,
      daysSinceLastAnchor,
      latestAnchorDate,
    };
  }

  const diffPct = Math.abs(lvProfile.e1rmCrossCheck - currentE1RMExternal) / currentE1RMExternal;
  const threshold = previouslyPromoted ? VBT_DEMOTE_THRESHOLD : VBT_PROMOTE_THRESHOLD;
  const status = diffPct <= threshold ? "promoted" : "candidate";

  // v4.38.0 (Phase 1D): stale-warning lisätään reason-tekstiin jos profiili
  // 14–20 päivää vanha (operationaalinen mutta käyttäjä saa varoituksen).
  const staleWarn = freshness === "stale"
    ? ` ⚠ Stale profile: ${daysSinceLastAnchor} pv ilman uutta ankkuria — Häkkinen-tyyppinen detraining-drift mahdollinen, harkitse mini-L-V-vahvistusta.`
    : "";

  return {
    status,
    anchorCount: anchors.length,
    diffPct,
    promoteThreshold: VBT_PROMOTE_THRESHOLD,
    demoteThreshold: VBT_DEMOTE_THRESHOLD,
    reason: (status === "promoted"
      ? `${anchors.length} ankkuripistettä · ±${(diffPct * 100).toFixed(1)}% diff (${previouslyPromoted ? "demote" : "promote"} ≤ ${(threshold * 100)}%)`
      : `${anchors.length} ankkuripistettä · ±${(diffPct * 100).toFixed(1)}% diff yli kynnyksen ${(threshold * 100)}%`) + staleWarn,
    recommendedE1RM: status === "promoted" ? lvProfile.e1rmCrossCheck : null,
    velocityE1RM: lvProfile.e1rmCrossCheck,
    vxE1RM: currentE1RMExternal,
    mvt: lvProfile.mvt,
    deviceCaveat: (lvProfile.mvt !== null && lvProfile.mvt < 0.5) ? ENODE_LOW_VELOCITY_CAVEAT : null,
    freshness,
    daysSinceLastAnchor,
    latestAnchorDate,
  };
}

// ═══════════════════════════════════════════════════════════════
// RTF (Reps-to-Failure) -velocity-malli — Jukic 2024 yksilöllinen RIR-velocity
// ═══════════════════════════════════════════════════════════════
//
// v4.38.2 (Phase 3): Jukic et al. 2024 (Scand J Med Sci Sports) -metodi yksilöllisen
// RIR-velocity-mallin rakentamiseen yhdestä RTF-testistä per liike. Mean error
// alle 2 reps populaatio-mappauksesta (Halperin 2022, Mansfield 2023, Paulsen
// 2025: yksilöllinen r² ~0.95+ vs populaatio 0.45–0.49).
//
// Datankeruu:
//   AMRAP-sarja kiinteällä kuormalla, jokaisen rep:n MV mitattuna.
//   Set-rooli "rtf_test", mvReps[] sisältää rep-by-rep MV:t.
//
// Mallin rakennus:
//   Jokaisesta rtf-setistä rep i (0-indexed) kun M = total reps:
//     RIR_i = M - 1 - i  (rep 0 → korkein RIR, rep M-1 → 0 RIR)
//   Velocity_i = mvReps[i]
//   Yhdistä kaikki (RIR, velocity) -pisteet → lineaarinen regressio:
//     velocity = intercept + slope × RIR
//   Tulkinta:
//     - intercept = V@failure (RIR 0) = yksilöllinen MVT
//     - slope     = m/s per RIR-yksikkö
//
// Käyttö (Phase 3.5):
//   Kun targetRir tunnetaan (esim. peaking RIR 1):
//     velocity_at_target = intercept + slope × targetRir
//     VL_cap = (rep1_velocity - velocity_at_target) / rep1_velocity * 100
//   → yksilöllinen VL-cap populaatio-arvon sijaan.
//
// Tutkimuspohja:
//   - Jukic et al. 2024 (Scand J Med Sci Sports) — 1 RTF-testi riittää r² > 0.95
//   - Halperin et al. 2022 (Sports Med scoping review) — RIR-tarkkuuden modulaattorit
//   - Bastos et al. 2024 (Perceptual Motor Skills) — familiarisaatio-protokolla
//   - Sánchez-Moreno 2017 — pull-up rep-velocity loss vs % completed reps r² 0.88

const RTF_MIN_REPS_PER_SET = 4;        // Vähintään 4 rep AMRAPista regressioon
const RTF_MIN_SESSIONS_FOR_MODEL = 1;  // Jukic 2024: 1 sessio riittää
const RTF_R2_THRESHOLD_RELIABLE = 0.85; // Phase 3.5: yksilöllinen cap aktivoituu vain kun r² ≥ 0.85
const RTF_R2_THRESHOLD_PREVIEW = 0.70;  // UI näyttää mallin mutta varoittaa

function computeRtfVelocityModel(allSets, movementId) {
  if (!movementId || !Array.isArray(allSets)) {
    return { status: "no-data", n: 0, sessionsCount: 0, slope: null, intercept: null, r2: null };
  }
  const rtfSets = allSets.filter(s =>
    s.movementId === movementId &&
    s.setRole === "rtf_test" &&
    Array.isArray(s.mvReps) &&
    s.mvReps.length >= RTF_MIN_REPS_PER_SET
  );
  if (rtfSets.length === 0) {
    return { status: "no-data", n: 0, sessionsCount: 0, slope: null, intercept: null, r2: null };
  }
  if (rtfSets.length < RTF_MIN_SESSIONS_FOR_MODEL) {
    return { status: "insufficient-sessions", n: 0, sessionsCount: rtfSets.length, slope: null, intercept: null, r2: null };
  }

  // Kerää (RIR, velocity) -pisteet
  const points = [];
  const sessionIds = new Set();
  const loadsUsed = new Set();
  for (const s of rtfSets) {
    const M = s.mvReps.length;
    if (s.sessionId) sessionIds.add(s.sessionId);
    if (s.externalLoadKg) loadsUsed.add(s.externalLoadKg);
    for (let i = 0; i < M; i++) {
      const v = s.mvReps[i];
      if (typeof v === "number" && v > 0 && v <= 3.0) {
        points.push({ rir: M - 1 - i, velocity: v });
      }
    }
  }
  if (points.length < RTF_MIN_REPS_PER_SET) {
    return { status: "insufficient-points", n: points.length, sessionsCount: rtfSets.length, slope: null, intercept: null, r2: null };
  }

  // Lineaarinen regressio: velocity = intercept + slope × rir
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.rir, 0);
  const sumY = points.reduce((a, p) => a + p.velocity, 0);
  const sumXY = points.reduce((a, p) => a + p.rir * p.velocity, 0);
  const sumXX = points.reduce((a, p) => a + p.rir * p.rir, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0 || Math.abs(denom) < 1e-9) {
    return { status: "degenerate", n, sessionsCount: rtfSets.length, slope: null, intercept: null, r2: null };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // r² (selitysaste)
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const yPred = intercept + slope * p.rir;
    ssTot += (p.velocity - meanY) ** 2;
    ssRes += (p.velocity - yPred) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : null;

  // Sanity: slope pitää olla positiivinen (enemmän RIR → nopeampi rep)
  // Jos negatiivinen → epäluotettava (todennäköisesti datavirhe tai tekninen ongelma)
  const isReliable = slope > 0 && r2 !== null && r2 >= RTF_R2_THRESHOLD_RELIABLE;
  const isPreviewable = slope > 0 && r2 !== null && r2 >= RTF_R2_THRESHOLD_PREVIEW;

  // Velocity ennustukset RIR 0/1/3/5 -arvoille
  const predict = (rir) => Math.max(0, intercept + slope * rir);
  const velocityAtRir = {
    0: predict(0),
    1: predict(1),
    3: predict(3),
    5: predict(5),
  };

  // Status
  let status;
  if (isReliable) status = "reliable";
  else if (isPreviewable) status = "preview";
  else status = "unreliable";

  return {
    status,
    n,
    sessionsCount: rtfSets.length,
    sessionIdsCount: sessionIds.size,
    loadsUsed: [...loadsUsed].sort((a, b) => a - b),
    slope,
    intercept,
    r2,
    velocityAtRir,
    rtfMvtIndividual: intercept,  // = V@failure = MVT yksilölliselle atletille
    builtAtISO: new Date().toISOString(),
    movementId,
    minR2Reliable: RTF_R2_THRESHOLD_RELIABLE,
    minR2Preview: RTF_R2_THRESHOLD_PREVIEW,
  };
}

// v4.38.4 (Phase 2.7A): rep 1 -tavoiterange per liike per blokki.
//
// Kaksisuuntaisen autoregulaation pohja: pelkkä VL-cap (sarjan loppupiste)
// suojaa ylitreenamiselta mutta EI tunnista alistimulaatiota (kuorma kevyt
// → rep 1 liian nopea). Range antaa rep 1 -velocity:lle hyväksyttävän
// haarukan blokin tavoite-RIR:n ympärille.
//
// Logiikka:
//   1. MVT (= V@RIR0) ≈ rtfModel.intercept jos saatavilla, muuten MOVEMENT_MVT-taulu
//   2. Slope ≈ rtfModel.slope (yksilöllinen) tai default 0.045 m/s/RIR
//      (Sánchez-Moreno 2017 -datasta keskiarvo pull-upille; toimii proxy:nä
//      muille liikkeille kunnes oma data kertyy)
//   3. Range RIR-keskelle ±1.5 RIR:
//      lower = V@(targetRir - 1.5)  ← ali = kuorma raskas
//      upper = V@(targetRir + 1.5)  ← yli = kuorma kevyt
//
// Esim. Lisäpainoleuanveto strength-blokissa (targetRir 2.5):
//   intercept 0.23, slope 0.045
//   lower = 0.23 + 0.045 × 1.0 = 0.275 m/s  (rep 1 hitaampi → kuorma liian raskas)
//   upper = 0.23 + 0.045 × 4.0 = 0.410 m/s  (rep 1 nopeampi → kuorma kevyt)
//   optimal: 0.275–0.410 m/s

const DEFAULT_RTF_SLOPE = 0.045;  // m/s/RIR proxy ennen yksilöllistä mallia
const REP1_RANGE_HALFWIDTH_RIR = 1.5;

// v4.38.5 (käyttäjäpalaute 2026-05-10): Kisaliikkeiden tunnistus pitää
// toimia myös kun movement-tietokannassa ei ole isCompetitionLift-flagia
// (vanhoissa rekisteröidyissä movements:eissa flag puuttuu — uudet
// PRESET_MOVEMENTS-asennukset saavat sen, mutta jo perustetut eivät).
// Fallback-nimet kattavat streetlifting + voimanosto + yleisimmät variantit.
const COMPETITION_LIFT_NAMES_FALLBACK = new Set([
  // Streetlifting
  "Lisäpainoleuanveto", "Lisäpainodippi", "Takakyykky", "Muscle-up",
  // Voimanosto
  "Penkkipunnerrus", "Maastaveto",
]);

function isCompetitionLiftMovement(movement) {
  if (!movement) return false;
  if (movement.isCompetitionLift === true) return true;
  return COMPETITION_LIFT_NAMES_FALLBACK.has(movement.name);
}

// v4.49.2 Q1: Grindy-bias-detection. Atletti joka jatkuvasti raportoi V3 mutta
// VBT-data näyttää e1RM-mismatchin (SIGNIFICANT, >7 %) → slot.targetVx-arvoon ei
// voi luottaa, kunnes data palautuu linjaan. Bias on tunnistettu kun ≥3 viimeisestä
// 8 sessiosta sisältää VBT_E1RM_CROSSCHECK SIGNIFICANT -tracen.
function detectGrindyBias(sessions, opts = {}) {
  const windowSize = opts.windowSize ?? 8;
  const threshold = opts.threshold ?? 3;
  const reason = { detected: false, count: 0, sessionsConsidered: 0, windowSize, threshold };
  if (!Array.isArray(sessions) || sessions.length === 0) return reason;
  const recent = sessions.slice(-windowSize);
  let significantCount = 0;
  for (const session of recent) {
    const traces = session?.decisionTraces || session?.traces || [];
    const hasSignificant = traces.some((t) => {
      if (t?.ruleId !== "VBT_E1RM_CROSSCHECK") return false;
      if (t?.after?.severity === "SIGNIFICANT") return true;
      return /SIGNIFICANT/.test(t?.why || "");
    });
    if (hasSignificant) significantCount++;
  }
  return {
    detected: significantCount >= threshold,
    count: significantCount,
    sessionsConsidered: recent.length,
    windowSize,
    threshold,
  };
}

function targetRep1VelocityRange(movementName, blockPhase, rtfModel = null, slotTargetVx = null, biasDetected = false) {
  // Resolvoi efektiivinen blokki-vaihe (sama logiikka kuin vlCapForContext:issa)
  let effectivePhase = blockPhase;
  if (movementName && /räjähtävä\s+(leuka|leuanveto)/i.test(movementName)) {
    effectivePhase = "speed-strength";
  }
  const blockDefaultRir = BLOCK_PHASE_TARGET_RIR[effectivePhase] ?? BLOCK_PHASE_TARGET_RIR.strength;

  // v4.49.2 Q1: Hybridi target-RIR. Akselin design-päätös: konservatiivisempi
  // arvo voittaa kun joko RTF-malli ei ole vielä luotettava TAI grindy-bias on
  // tunnistettu (Vx-raportointi epäluotettava). Reliable + ei-bias → luota
  // slot.targetVx:ään (preset-tekijä tietää mitä haluaa).
  let targetRir;
  let targetRirSource;
  const slotVxValid = typeof slotTargetVx === "number" && slotTargetVx >= 0;
  const isReliableModel = rtfModel && rtfModel.status === "reliable";
  if (slotVxValid && isReliableModel && !biasDetected) {
    targetRir = slotTargetVx;
    targetRirSource = "slot-targetVx-trusted";
  } else if (slotVxValid) {
    targetRir = Math.min(slotTargetVx, blockDefaultRir);
    targetRirSource = biasDetected ? "min-bias-detected-safety" : "min-rtf-uncertain";
  } else {
    targetRir = blockDefaultRir;
    targetRirSource = "block-default-fallback";
  }

  // Intercept (V@failure): ensisijaisesti rtfModel, toissijaisesti MOVEMENT_MVT
  let intercept, slope;
  if (rtfModel && rtfModel.status === "reliable" &&
      typeof rtfModel.slope === "number" && rtfModel.slope > 0 &&
      typeof rtfModel.intercept === "number" && rtfModel.intercept > 0) {
    intercept = rtfModel.intercept;
    slope = rtfModel.slope;
  } else {
    intercept = (movementName && MOVEMENT_MVT[movementName] !== undefined)
      ? MOVEMENT_MVT[movementName]
      : DEFAULT_MVT;
    slope = DEFAULT_RTF_SLOPE;
  }

  const lower = Math.max(0, intercept + slope * Math.max(0, targetRir - REP1_RANGE_HALFWIDTH_RIR));
  const upper = intercept + slope * (targetRir + REP1_RANGE_HALFWIDTH_RIR);
  const center = intercept + slope * targetRir;

  return {
    lower,
    upper,
    center,
    targetRir,
    targetRirSource,
    blockDefaultRir,
    slotTargetVx: slotVxValid ? slotTargetVx : null,
    biasDetected: !!biasDetected,
    phase: effectivePhase,
    source: (rtfModel && rtfModel.status === "reliable") ? "rtf-individual" : "default",
    intercept,
    slope,
  };
}

// Phase 3.5 helper: laskee VL-cap yksilöllisesti kun RTF-malli on saatavilla.
//   targetRir: blokki-spesifi RIR-tavoite (peaking RIR 1, strength RIR 2-3, jne.)
//   rep1Velocity: sarjan ensimmäisen rep:n MV (tarvitaan VL%-laskuun)
//   rtfModel: computeRtfVelocityModel-paluu
function vlCapFromRtfModel(rtfModel, targetRir, rep1Velocity) {
  if (!rtfModel || rtfModel.status !== "reliable") return null;
  if (typeof targetRir !== "number" || typeof rep1Velocity !== "number" || rep1Velocity <= 0) return null;
  const targetVelocity = rtfModel.intercept + rtfModel.slope * targetRir;
  if (targetVelocity <= 0 || targetVelocity >= rep1Velocity) return null;
  return ((rep1Velocity - targetVelocity) / rep1Velocity) * 100;
}

// v4.38.3 (Phase 4): Vx-velocity-konfliktin tunnistus työsarjatasolla.
//
// Atleetin grindaus-bias: hän raportoi Vx 1 vaikka velocity-data implikoi Vx 0
// tai jopa V−1. Tämä funktio käyttää RTF-mallia ennustamaan kuinka monta toistoa
// jäljellä viimeisen rep:n velocity-arvon perusteella, ja vertaa atleetin
// raportoimaan Vx:hen.
//
// Ennustelogiikka (RTF-mallin invertointi):
//   velocity = intercept + slope × RIR
//   → RIR = (velocity - intercept) / slope
//
// Käytetään viimeisen rep:n MV:tä = end-of-set proxy → predictedVx = predictedRir.
// Konflikti = abs(predictedVx - reportedVx) ≥ VX_CONFLICT_DELTA (1.5).
//
// HUOMAA: tämä on havaintoraportointi, EI auto-override (DR-synteesin
// suositus): "ÄLÄ käytä suoraa 'data overrides' -sääntöä — velocity-RIR-mallin
// epävarmuus on liian suuri ilman individualisointia". Yksilöllinen RTF-malli
// (Jukic 2024) tuo r² ~0.95, joten override on tutkimuspohjaisempi — mutta
// MVP:ssä tallennamme vain decisionTracen + UI-disclaimerin. Käyttäjä päättää
// muuttaa raportoidun Vx:n itse jos hyväksyy override:n. Phase 4.5 myöhemmin
// voi lisätä auto-konservatiivisen min(reported, predicted) -ratkaisun.

const VX_CONFLICT_DELTA = 1.5;  // Minimi-ero raportoidun ja ennustetun Vx:n välillä

function predictVxFromVelocity(mvReps, rtfModel, reportedVx = null) {
  // Pre-condition tarkistukset
  if (!Array.isArray(mvReps) || mvReps.length < 1) {
    return { status: "no-data", conflicted: false };
  }
  if (!rtfModel || rtfModel.status !== "reliable") {
    return { status: "no-rtf-model", conflicted: false };
  }
  if (typeof rtfModel.slope !== "number" || rtfModel.slope <= 0) {
    return { status: "rtf-slope-invalid", conflicted: false };
  }

  // Ennusta Vx (= RIR) viimeisen rep:n MV:stä
  const lastMv = mvReps[mvReps.length - 1];
  const rep1Mv = mvReps[0];
  if (typeof lastMv !== "number" || lastMv <= 0) {
    return { status: "invalid-last-mv", conflicted: false };
  }

  // RIR = (velocity - intercept) / slope
  const predictedVxRaw = (lastMv - rtfModel.intercept) / rtfModel.slope;
  // Clamp [0, 5] (Vx-skaala)
  const predictedVx = Math.max(0, Math.min(5, predictedVxRaw));
  const predictedVxRep1Raw = (rep1Mv - rtfModel.intercept) / rtfModel.slope;
  const predictedVxRep1 = Math.max(0, Math.min(5, predictedVxRep1Raw));

  // Konfliktin tunnistus
  let conflicted = false;
  let delta = null;
  if (typeof reportedVx === "number") {
    delta = reportedVx - predictedVx;  // positiivinen = atletti raportoi enemmän varaa
    conflicted = Math.abs(delta) >= VX_CONFLICT_DELTA;
  }

  return {
    status: "ok",
    predictedVx,
    predictedVxRaw,
    predictedVxRep1,
    reportedVx,
    delta,
    conflicted,
    conflictDelta: VX_CONFLICT_DELTA,
    direction: delta === null ? null : (delta > 0 ? "athlete-overestimates-rir" : "athlete-underestimates-rir"),
    rtfR2: rtfModel.r2,
    lastMvUsed: lastMv,
  };
}

// ═══════════════════════════════════════════════════════════════
// VL-CAP per blokki — within-set stop -autoregulaatio
// ═══════════════════════════════════════════════════════════════
//
// v4.38.1 (Phase 2): Pareja-Blanco-tradition VL-cap-arvot per blokki, kytkettynä
// päätösketjun ENSISIJAISEEN pisteeseen (within-set stop) eikä pelkkänä UI-warning.
//
// Tutkimuspohja (Pareja-Blanco 2017/2020/2023 -aalto + Galiano 2022 + Held 2022
// + Lyu 2026 + Sánchez-Moreno 2020 + Jukic 2023 "One Velocity Loss Threshold
// Does Not Fit All"):
//   Foundation/hypertrofia: 25–35 % (CSA-kasvu maksimaalinen, korkea volyymi)
//   Strength:               15–20 % (voima paremmin, väsymys minimissä)
//   Intensity:              10–15 % (explosivinen kapasiteetti, low VL)
//   Peaking:                 5–10 % (CMJ/sprint paras)
//   Speed-strength (pull):  10–15 % (Sánchez-Moreno 2020 VL25 > VL50)
//
// Default-arvot ovat range-keskellä; settings-overridable per blokki.
//
// "Low-V1RM grinder" -profiilille (Akseli) konservatiivisemmat arvot ovat
// perusteltuja koska sama VL-% kohdistuu alempaan absoluuttiseen velocity-
// alueeseen → fatigue-kuormitus per VL-prosentti suurempi (Jukic 2023).
//
// Atleetin RTF-velocity-mallin (Phase 3) jälkeen nämä arvot voidaan kalibroida
// yksilöllisesti — toistaiseksi default = range-keskellä.
const VL_CAP_PER_BLOCK = Object.freeze({
  foundation: 30,        // 25–35 % range-keskellä
  hypertrophy: 30,       // 25–35 % MAV-zone (Pareja-Blanco 2017 PMC5497611)
  strength: 17.5,        // 15–20 %
  intensity: 12.5,       // 10–15 %
  peaking: 7.5,          //  5–10 %
  "speed-strength": 12.5,// 10–15 % räjähtäville pull-up-varianteille
});

// v4.38.3 (Phase 3.5): Blokki-spesifi target-RIR yksilölliselle cap-laskennalle
// RTF-mallista. Mid-range-arvot synteesin VL-cap-rangeista, jotka karkeasti
// vastaavat: korkea VL → korkea RIR (paljon väsymystä), matala VL → matala RIR.
// Foundation  25-35% → RIR 4 (mid 4-5 = paljon varaa)
// Hypertrophy 25-35% → RIR 2.5 (MAV-mid-range, V2-V3 - lähempänä failurea kuin foundation)
// Strength    15-20% → RIR 2.5 (mid 2-3)
// Intensity   10-15% → RIR 1.5 (mid 1-2)
// Peaking      5-10% → RIR 1   (mid 0-1, peak-vaiheen raskaat singlet)
// Speed       10-15% → RIR 4   (mid 4-5 = nopeuden säilytys, ei väsymystä)
//
// v4.49.2 MED-4: Lisätty hypertrophy: 2.5. Hypertrofia-meson slot.targetVx (2-3)
// vertailtiin aiemmin foundation-default 4:ää vasten → K2-false-positiveja
// elite-female-hypertrophy:lla. Nyt hypertrofia-meso saa oman target-RIR-arvon.
const BLOCK_PHASE_TARGET_RIR = Object.freeze({
  foundation: 4,
  hypertrophy: 2.5,
  strength: 2.5,
  intensity: 1.5,
  peaking: 1,
  "speed-strength": 4,
});

// Blokki-vaihe heuristiikka exercise-kontekstista. Speed-strength tunnistetaan
// liikkeen nimestä (Räjähtävä leuanveto / Räjähtävä leuka -variantit) tai
// dayType==="speed" + targetVx >= 4.
//
// v4.38.3 (Phase 3.5): RTF-mallin yksilöllinen cap-laskenta.
//   Jos rtfModel.status === "reliable" ja rep1Velocity > 0:
//     1. Resolvoi blokki-vaihe (kuten ennen)
//     2. Hae targetRir BLOCK_PHASE_TARGET_RIR-mapista
//     3. Laske velocity_at_target = rtfModel.intercept + rtfModel.slope × targetRir
//     4. cap_individual = (rep1Velocity - velocity_at_target) / rep1Velocity * 100
//     5. Source = "rtf-individual" (UI näyttää badge:n)
//   Muuten fallback nykyiseen logiikkaan (settings → defaults).
function vlCapForContext(ctx = {}) {
  const { blockPhase = null, exerciseName = null, dayType = null, targetVx = null, settings = {},
          rtfModel = null, rep1Velocity = null, emitTrace = null } = ctx;

  function resolve() {
    // Resolvoi efektiivinen blokki-vaihe (sama logiikka kuin defaultien valinnassa)
    let effectivePhase;
    let defaultSource;
    const isSpeedStrengthMovement = exerciseName && /räjähtävä\s+(leuka|leuanveto)/i.test(exerciseName);
    const isSpeedDay = dayType === "speed" && typeof targetVx === "number" && targetVx >= 4;
    if (isSpeedStrengthMovement || isSpeedDay) {
      effectivePhase = "speed-strength";
      defaultSource = isSpeedStrengthMovement ? "movement-name" : "speed-day";
    } else if (["foundation", "hypertrophy", "strength", "intensity", "peaking"].includes(blockPhase)) {
      effectivePhase = blockPhase;
      defaultSource = "block-phase";
    } else {
      effectivePhase = "default";
      defaultSource = "fallback";
    }

    // RTF-yksilöllinen cap jos malli reliable + rep1Velocity saatavilla
    if (rtfModel && rtfModel.status === "reliable" &&
        typeof rep1Velocity === "number" && rep1Velocity > 0 &&
        typeof rtfModel.slope === "number" && typeof rtfModel.intercept === "number") {
      const targetRir = BLOCK_PHASE_TARGET_RIR[effectivePhase] ?? BLOCK_PHASE_TARGET_RIR.strength;
      const velocityAtTarget = rtfModel.intercept + rtfModel.slope * targetRir;
      if (velocityAtTarget > 0 && velocityAtTarget < rep1Velocity) {
        const capIndividual = ((rep1Velocity - velocityAtTarget) / rep1Velocity) * 100;
        // Sanity-check: yksilöllinen cap tulisi olla 3–60 % välillä — ulkopuolelle
        // jäävät arvot viittaavat mallin epäluotettavuuteen tai poikkeavaan rep1:een.
        if (capIndividual >= 3 && capIndividual <= 60) {
          return {
            cap: capIndividual,
            phase: effectivePhase,
            source: "rtf-individual",
            targetRir,
            velocityAtTargetRir: velocityAtTarget,
            rtfR2: rtfModel.r2,
          };
        }
      }
    }

    // Fallback: populaatio-default + settings-override (Phase 2 -käyttäytyminen)
    if (effectivePhase === "speed-strength") {
      return {
        cap: settings.vlCapSpeedStrength ?? VL_CAP_PER_BLOCK["speed-strength"],
        phase: "speed-strength",
        source: defaultSource,
        targetRir: BLOCK_PHASE_TARGET_RIR["speed-strength"],
      };
    }
    switch (effectivePhase) {
      case "foundation":
        return { cap: settings.vlCapFoundation ?? VL_CAP_PER_BLOCK.foundation, phase: "foundation", source: "block-phase", targetRir: BLOCK_PHASE_TARGET_RIR.foundation };
      case "hypertrophy":
        return { cap: settings.vlCapHypertrophy ?? VL_CAP_PER_BLOCK.hypertrophy, phase: "hypertrophy", source: "block-phase", targetRir: BLOCK_PHASE_TARGET_RIR.hypertrophy };
      case "strength":
        return { cap: settings.vlCapStrength ?? VL_CAP_PER_BLOCK.strength, phase: "strength", source: "block-phase", targetRir: BLOCK_PHASE_TARGET_RIR.strength };
      case "intensity":
        return { cap: settings.vlCapIntensity ?? VL_CAP_PER_BLOCK.intensity, phase: "intensity", source: "block-phase", targetRir: BLOCK_PHASE_TARGET_RIR.intensity };
      case "peaking":
        return { cap: settings.vlCapPeaking ?? VL_CAP_PER_BLOCK.peaking, phase: "peaking", source: "block-phase", targetRir: BLOCK_PHASE_TARGET_RIR.peaking };
      default:
        return {
          cap: settings.vlStopPercent ?? VL_CAP_PER_BLOCK.strength,
          phase: "default",
          source: "fallback",
          targetRir: null,
        };
    }
  }

  const result = resolve();
  // v4.49.2 QF-5: emit VL_CAP_RESOLVED-trace jos kutsuja antoi emitTrace-callbackin.
  // Mahdollistaa audit-enginen verifioida VL-cap-arvoja (cap%, source, targetRir)
  // ilman että cap pitää inferoida slot.velocityStop:ista tai testata erikseen.
  if (typeof emitTrace === "function") {
    emitTrace({
      ruleId: "VL_CAP_RESOLVED",
      before: { phase: blockPhase, exerciseName, dayType, targetVx },
      after: {
        cap: result.cap,
        source: result.source,
        targetRir: result.targetRir ?? null,
        effectivePhase: result.phase,
      },
      why: `VL-cap ${result.cap.toFixed(1)}% (phase=${result.phase}, source=${result.source})`,
    });
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT DAY PLAN GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a full day plan with primary + accessories based on dayType.
 * This ensures the user ALWAYS gets a complete program, even if the
 * mesocycle weekPlan didn't have an entry for today's weekday.
 */
function generateDefaultDayPlan(dayType, weekDef, accessoryCapActive) {
  const primaryReps = weekDef?.heavyReps || (dayType === "volume" ? 5 : dayType === "speed" ? 2 : 3);
  const primaryVx = weekDef?.heavyTargetVx || (dayType === "volume" ? 3 : dayType === "speed" ? 4 : 2);
  const primarySets = dayType === "volume" ? 5 : dayType === "speed" ? 4 : 5;

  const slots = [
    { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: primarySets, reps: primaryReps, targetVx: primaryVx },
  ];

  // Heavy: add back-off sets (3×5 @-10% with higher Vara target)
  if (dayType === "heavy") {
    slots.push(
      { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto (back-off)", sets: 3, reps: 5, targetVx: 3 },
      { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 4, reps: 6, targetVx: 3 },
      { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: 3 },
      { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
    );
  } else if (dayType === "volume") {
    slots.push(
      { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 4, reps: 8, targetVx: 3 },
      { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 10, targetVx: 3 },
      { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
    );
  } else if (dayType === "speed") {
    slots.push(
      { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 10, targetVx: 4 },
      { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 2, reps: 10, targetVx: null },
    );
  }

  return { dayOfWeek: null, dayType, slots };
}

// ═══════════════════════════════════════════════════════════════
// VELOCITY LOSS %
// ═══════════════════════════════════════════════════════════════

function velocityLossPercent(rep1Velocity, lastRepVelocity) {
  if (!rep1Velocity || !lastRepVelocity || rep1Velocity <= 0) return null;
  return ((rep1Velocity - lastRepVelocity) / rep1Velocity) * 100;
}

// v4.49.2 QF-1: Helms 2017 -warmup-ramp default-skeleton. Käytetään kun preset ei
// määrittele primary-slot.warmupSets:ia (default-meso, beginner/returner/cut/shoulder/
// uncalibrated -profiilit). UI:n hardcoded fallback käyttää tätä samaa scheme:a kun
// skeletonia ei ole, mutta tämä injektio takaa että slot.warmupSets on aina olemassa
// trace-outputissa ja audit ei laukea K1-warning:iä.
const ENGINE_DEFAULT_WARMUP_RAMP = Object.freeze([
  Object.freeze({ pct: 0.40, reps: 5, note: "Liikemalli, kevyt" }),
  Object.freeze({ pct: 0.55, reps: 3, note: "Lämpö" }),
  Object.freeze({ pct: 0.70, reps: 2, note: "Aktivaatio" }),
  Object.freeze({ pct: 0.85, reps: 1, note: "Neural primer" }),
]);

// v4.49.2 QF-5: blockPhase-päättely VL_CAP_RESOLVED-tracen ja muiden phase-tietoisten
// trace-pisteiden tueksi. Samaa heuristiikkaa kuin audit-engine.mjs deriveBlockPhase,
// jotta auditti ja engine pysyvät samalla mappauksella.
function deriveBlockPhaseFromMesocycle(mesocycleType, weekNum, weekLabel) {
  const label = String(weekLabel || "");
  if (/deload|kevennys|recovery/i.test(label)) return "deload";
  if (/peak|peaking|kisaviikko/i.test(label)) return "peaking";
  if (/intens|realisoint|maks/i.test(label)) return "intensity";
  if (/strength/i.test(label)) return "strength";
  // v4.49.2 MED-4: hypertrofia-meson labelit ("Volyymipohja", "Volyymilataus",
  // "Volyymipeak") ovat MAV-vaihetta (V2-V3, RIR 2.5) — eivät foundation-RIR 4:ää.
  if (mesocycleType === "hypertrofia") {
    if (weekNum === 4) return "deload";
    if (typeof weekNum === "number" && weekNum >= 1 && weekNum <= 3) return "hypertrophy";
    return null;
  }
  if (/hyper|foundation|vol|adapt|progress/i.test(label)) return "foundation";
  if (mesocycleType === "streetlifting_16w") {
    if (weekNum === 4 || weekNum === 8 || weekNum === 12) return "deload";
    if (weekNum <= 3) return "foundation";
    if (weekNum <= 7) return "strength";
    if (weekNum <= 11) return "intensity";
    return "peaking";
  }
  if (weekNum === 4) return "deload";
  if (typeof weekNum === "number" && weekNum >= 1 && weekNum <= 3) return "foundation";
  return null;
}

// ═══════════════════════════════════════════════════════════════
// SUGGESTION TIERS (v4.50.0 Track B 2D-δ)
// ═══════════════════════════════════════════════════════════════
//
// Adaptive multi-suggestion: engine tuottaa 2-3 ehdotusta per sessio
// hybridi-päätösstrategioilla (slot.targetVx + bias-detection + RTF-malli +
// readiness + cap-state + VBT-status). Tier-arvot johdetaan aritmeettisesti
// nykyisestä TARGET-laskennasta — laskentaketju säilyy bittitarkasti.
//
// Spacing-perustelu (Helms 2018 + Akselin design-päätös Q2):
//   SAFE       = TARGET kuorma × 0.985, targetVx + 1 (enemmän varaa)
//   TARGET     = nykyinen recommend() (backward-compat ankkuri)
//   AGGRESSIVE = TARGET kuorma × 1.015, targetVx − 1 (lähempänä failurea)
//
// Suppression (Akselin Q1 B-päätös): AGGRESSIVE piilotetaan kun konteksti
// ei tue korkeampaa stimulusta (cap, failure, bias, RTF !reliable, deload,
// speed/competition-päivä). Suppressed-tila kirjoitetaan SUGGESTION_SUPPRESSED-
// traceen audit-todistettavuuden vuoksi.
//
// Backward compat (Akselin Q4 A-päätös): rec.targetExternalLoad / targetVx /
// deltaPct säilyvät TARGET-tier:n arvoina. Atletin valinta tallennetaan
// session-recordiin erikseen (session.selectedSuggestionId + valitut arvot).
function generateSuggestions(ctx) {
  const {
    targetExternalLoad,
    targetVx,
    deltaPct,
    targetReps,
    setCount,
    capLevel,
    hadFailure,
    grindyBiasDetected,
    rtfModelStatus,
    blockPhase,
    dayType,
    preferredBias,
    aggressivenessLearned,
  } = ctx;

  const SAFE_SPACING = 0.015;       // 1.5 pp kevyempi
  const AGGRESSIVE_SPACING = 0.015; // 1.5 pp raskaampi
  const VX_OFFSET = 1;              // ±1 Vx tier-välien välillä

  const targetSuggestion = {
    id: "target",
    label: "Tavoite",
    deltaPct: typeof deltaPct === "number" ? deltaPct : 0,
    targetVx,
    targetExternalLoad,
    setCount,
    targetReps,
    rationaleShort: "Engine-suositus nykyisestä progressiosta",
  };

  const loadIsNumeric = typeof targetExternalLoad === "number" && targetExternalLoad > 0;

  // SAFE-tier: aina näkyvissä jos kuorma laskettavissa.
  // Konservatiivisempi vaihtoehto on aina turvallinen — atletti voi valita
  // tämän väsyneenä ilman engine-veto-oikeutta.
  let safeSuggestion = null;
  if (loadIsNumeric) {
    const safeLoad = roundToHalf(targetExternalLoad * (1 - SAFE_SPACING));
    const safeVx = typeof targetVx === "number" ? targetVx : null;
    safeSuggestion = {
      id: "safe",
      label: "Varovainen",
      deltaPct: (typeof deltaPct === "number" ? deltaPct : 0) - SAFE_SPACING,
      targetVx: safeVx,
      targetExternalLoad: safeLoad,
      setCount,
      targetReps,
      rationaleShort: "Konservatiivinen — enemmän varaa ja kevyempi kuorma",
    };
  }

  // AGGRESSIVE-tier: suppression-tarkistus. Piilotetaan kun konteksti ei
  // tue korkeampaa stimulusta. Jokainen syy kirjataan suppressedReasons:iin
  // jotta audit + UI voi näyttää miksi.
  const suppressedReasons = [];
  if (typeof capLevel === "number" && capLevel >= 1) suppressedReasons.push("readiness-cap");
  if (hadFailure) suppressedReasons.push("recent-failure");
  if (grindyBiasDetected) suppressedReasons.push("grindy-bias");
  if (rtfModelStatus !== "reliable") suppressedReasons.push("rtf-not-reliable");
  if (blockPhase === "deload") suppressedReasons.push("deload-phase");
  if (dayType === "speed" || dayType === "competition") suppressedReasons.push("non-progression-day");

  const aggressiveAvailable = suppressedReasons.length === 0 && loadIsNumeric;
  let aggressiveSuggestion = null;
  if (aggressiveAvailable) {
    const aggLoad = roundToHalf(targetExternalLoad * (1 + AGGRESSIVE_SPACING));
    const aggVx = typeof targetVx === "number" ? Math.max(0, targetVx - VX_OFFSET) : null;
    aggressiveSuggestion = {
      id: "aggressive",
      label: "Rohkea",
      deltaPct: (typeof deltaPct === "number" ? deltaPct : 0) + AGGRESSIVE_SPACING,
      targetVx: aggVx,
      targetExternalLoad: aggLoad,
      setCount,
      targetReps,
      rationaleShort: "Korkea-stimulus — lähempänä failurea",
    };
  }

  // Suggestions-järjestys: SAFE → TARGET → AGGRESSIVE (UI:lla helpompi)
  const suggestions = [];
  if (safeSuggestion) suggestions.push(safeSuggestion);
  suggestions.push(targetSuggestion);
  if (aggressiveSuggestion) suggestions.push(aggressiveSuggestion);

  // Default-suggestion-päätös (Akselin Q3 C-muokattu + 2D-δ-C auto-learn):
  //   1. capLevel ≥ 1 → SAFE (pakotettu, ohittaa preferredBias + learned)
  //   2. effectiveBias yhdistää preferredBias + aggressivenessLearned:
  //        preferredBias  base    learnedAdd  → effectiveBias
  //        "stable"       -0.6    + learned   → ...
  //        "balanced"      0.0    + learned   → ...
  //        "challenging"  +0.6    + learned   → ...
  //      effectiveBias > +0.4 → AGGRESSIVE (jos available)
  //      effectiveBias < -0.4 → SAFE (jos available)
  //      muuten → TARGET
  // Auto-learn osaa nostaa tai laskea biasta ilman että preferredBias muuttuu.
  // Kaikki numeeriset rajat on tutkimuspohjaisesti tasapainotettu siten että
  // pelkkä preferredBias riittää oletusvalintaan, mutta atletin valintahistoria
  // voi sitä päinvastoin painostaa (TARGET-streak → ei muutu; SAFE-streak →
  // siirtyy SAFE-suuntaan).
  const biasBase = preferredBias === "stable" ? -0.6
    : preferredBias === "challenging" ? 0.6
    : 0;
  const learnedAdjustment = typeof aggressivenessLearned === "number"
    ? Math.max(-1, Math.min(1, aggressivenessLearned))
    : 0;
  const effectiveBias = biasBase + learnedAdjustment;

  let defaultSuggestionId = "target";
  const capForcesSafe = typeof capLevel === "number" && capLevel >= 1 && safeSuggestion;
  if (capForcesSafe) {
    defaultSuggestionId = "safe";
  } else if (effectiveBias > 0.4 && aggressiveAvailable) {
    defaultSuggestionId = "aggressive";
  } else if (effectiveBias < -0.4 && safeSuggestion) {
    defaultSuggestionId = "safe";
  }

  return {
    suggestions,
    defaultSuggestionId,
    suppressedReasons,
    aggressiveAvailable,
    effectiveBias,
  };
}

// ═══════════════════════════════════════════════════════════════
// RECOMMEND() — DETERMINISTIC RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Main recommendation function.
 * Input: mesocycle state, e1RM, readiness, settings
 * Output: recommended load, set prescription, decisionTrace
 */
async function recommend(options = {}) {
  const settings = options.settings || (await getSettings());
  const bodyweightKg = options.bodyweightKg || settings.bodyweightKg || 91;
  const dateISO = options.dateISO || todayISO();

  const traces = [];
  function trace(ruleId, before, after, why) {
    traces.push({ traceId: uid(), recId: null, ruleId, before: { ...before }, after: { ...after }, why });
  }

  // v4.34.26: Maintenance-mode early-exit (graceful degradation).
  // Käyttäjä on aktivoinut "ylläpito-tilan" Asetuksista (vamma/elämä/sairas/vaihto).
  // Engine palauttaa minimum-viable-protokollan: 2 sessiota/vk × 60% e1RM × V3-V4.
  // Mesocycle ei etene maintenance-aikana — sykli-rakennetta ei muuteta. Käyttäjä
  // palaa täyteen ohjelmaan kun toggle off TAI durationDays päättyy (auto-expiry).
  const mm = settings.maintenanceMode;
  if (mm && mm.active) {
    const ms = maintenanceStatus(mm, dateISO);
    if (ms.active) {
      // Aktiivinen → palauta maintenance-rec. Mesosykli säilyy mutta dayPlan
      // korvataan suppealla protokollalla.
      const dow = new Date(dateISO).getDay() || 7;
      // 2 sessiota/vk: MA (1) + TO (4) JA muut päivät → ei treeniä
      const isMaintenanceDay = (dow === 1 || dow === 4);
      trace("MAINTENANCE_MODE",
        { active: true, reason: mm.reason || "unknown", daysRemaining: ms.daysRemaining },
        { dayType: "maintenance", isTrainingDay: isMaintenanceDay, expiryISO: ms.expiryISO },
        `Ylläpito-tila aktiivinen (${mm.reason || "ei syytä"}) · ${ms.daysRemaining} pv jäljellä · ${isMaintenanceDay ? "treeni" : "lepopäivä"}`);
      return {
        dateISO,
        weekNum: null,
        weekLabel: "Ylläpito",
        dayType: "maintenance",
        dayPlan: isMaintenanceDay ? {
          label: "Ylläpito · 2/vk",
          slots: [
            { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 3 },
            { role: "accessory", category: dow === 1 ? "horisontaaliveto" : "horisontaalityöntö",
              defaultMovementName: dow === 1 ? "Penkkiveto" : "Penkkipunnerrus",
              sets: 3, reps: 8, targetVx: 4 },
          ],
        } : { label: "Ylläpito · lepopäivä", slots: [] },
        targetExternalLoad: null,  // Engine ei ehdota spesifistä kuormaa — atleetti valitsee 60% e1RM
        e1rmExternal: null,
        e1rmSystem: null,
        deltaPct: 0,
        readiness: options.readiness || null,
        traces,
        maintenanceStatus: ms,
      };
    }
  }

  // 1. Get mesocycle
  let mesocycle = options.mesocycle || (await getActiveMesocycle());
  if (!mesocycle) {
    mesocycle = createDefaultMesocycle(dateISO);
    if (!options.dryRun) await saveMesocycle(mesocycle);
    trace("MESOCYCLE_CREATED", {}, { mesocycleId: mesocycle.mesocycleId }, "Uusi mesosykli luotu automaattisesti");
  }

  // 1b. Delegate peaking mesocycles to dedicated engine
  if (mesocycle.type === "peaking") {
    return recommendPeaking({ ...options, mesocycle });
  }

  // 2. Determine week and day
  // v4.22: erottelu "ennen alkua" (pyyntö backfillille ennen mesosyklin
  // startDateISO:a) ja "lopun jälkeen" (sykli päättynyt). Aiemmin molemmat
  // johtivat default-mesosyklin hiljaiseen luomiseen → treeni-näkymä näytti
  // eri dataa kuin sykli-näkymä kun käyttäjä yritti backfillata ennen alkua.
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  let weekNum = pos?.programWeek ?? null;
  if (weekNum === null) {
    if (pos?.reason === "before-start") {
      // Ei luoda uutta mesosykliä — palautetaan selkeä virhe jotta kutsuja
      // (UI) voi estää backfillin ennen mesosyklin alkua.
      trace("MESOCYCLE_BEFORE_START", {}, { startDateISO: mesocycle.startDateISO, requestedDate: dateISO },
        `Pyydetty päivämäärä ${dateISO} on ennen mesosyklin alkua (${mesocycle.startDateISO})`);
      return {
        dateISO,
        error: "before-start",
        errorMessage: `Mesosykli alkoi ${mesocycle.startDateISO} — ei voida laskea suositusta aiemmalle päivälle`,
        traces,
        dayPlan: null,
        dayType: null,
        weekNum: null,
        weekLabel: null,
        targetExternalLoad: null,
        e1rmExternal: null,
        e1rmSystem: null,
      };
    }
    // after-end: mesosykli on päättynyt → EI luoda hiljaisesti uutta.
    // v4.27.3 korjaus: aiempi versio loi automaattisesti createDefaultMesocycle:n
    // (leuka-focus) vaikka käyttäjä olisi ollut esim. streetlifting_16w-ohjelmassa.
    // Tämä tarkoitti että treeni-sessionin tallennuksen jälkeen sovellus saattoi
    // "vaihtaa ohjelman" ilman käyttäjän lupaa, koska getActiveMesocycle() palautti
    // tuoreimman mesosyklin = uuden defaultin.
    //
    // Nyt palautetaan sama pattern kuin MESOCYCLE_BEFORE_START: virhe jonka UI
    // käsittelee näyttämällä "Aloita uusi sykli" -painikkeen käyttäjälle.
    trace("MESOCYCLE_ENDED", {}, {
      prevType: mesocycle.type,
      prevStartDateISO: mesocycle.startDateISO,
      requestedDate: dateISO,
    }, `Edellinen mesosykli (${mesocycle.type}) on päättynyt — käyttäjän tulee valita seuraava`);
    return {
      dateISO,
      error: "mesocycle-ended",
      errorMessage: `Edellinen mesosykli (${mesocycle.type}) on päättynyt — aloita uusi sykli Mesosykli-näkymästä`,
      prevMesocycleType: mesocycle.type,
      prevMesocycleId: mesocycle.mesocycleId,
      traces,
      dayPlan: null,
      dayType: null,
      weekNum: null,
      weekLabel: null,
      targetExternalLoad: null,
      e1rmExternal: null,
      e1rmSystem: null,
    };
  }

  let weekDef = getWeekDef(mesocycle, weekNum);
  const dayOfWeek = new Date(dateISO).getDay() || 7; // 1=Mon, 7=Sun
  let dayPlan = getTodayPlan(mesocycle, weekNum, dayOfWeek);
  let dayType = dayPlan?.dayType || options.dayType || "heavy";

  const isInsertedDeload = isInsertedDeloadWeek(mesocycle, dateISO);
  const isReplacedDeload = isReplacedDeloadWeek(mesocycle, dateISO);
  // v4.49.2 QF-4: laajenna deload-tunnistus presetti-built-in deload-viikoille
  // (esim. streetlifting_16w vk 4/8/12, default-meso vk 4, wendler531 vk 4). Built-in
  // deload-viikot määrittelevät jo deltaPctBase/heavyReps/heavyTargetVx labelin "Deload"
  // kautta — engine ei tähän asti pakottanut dayType="volume", mikä laukaisi
  // DELOAD_HEAVY_DAYTYPE-auditin 7/8 profiilissa. Nyt label-deloadissa vain dayType
  // pakotetaan volume:ksi, presetin alkuperäiset deload-arvot säilyvät.
  const isLabelDeload = /deload|kevennys/i.test(weekDef?.label || "");
  const isUserDeload = isInsertedDeload || isReplacedDeload;
  const isDeloadOverride = isUserDeload || isLabelDeload;
  if (isUserDeload) {
    // Override: käyttäjän kevennysviikko (lisätty tai korvaava).
    // Volyymi ~50%, kuorma -20%, Vx +2, pakotetaan volume-päivä.
    dayType = "volume";
    const deloadLabel = isInsertedDeload
      ? `Kevennysviikko (lisätty vk ${weekNum} jälkeen)`
      : `Kevennysviikko (korvaa vk ${weekNum})`;
    weekDef = { ...(weekDef || {}), week: weekNum, deltaPctBase: -0.20, label: deloadLabel, heavyReps: weekDef?.heavyReps || 5, heavyTargetVx: (weekDef?.heavyTargetVx ?? 2) + 2 };
    if (dayPlan && dayPlan.slots) {
      const prunedSlots = dayPlan.slots
        .filter(s => s.role === "primary" || s.role === "backoff" || s.slotId === "scapular-control" || s.slotId === "core-hollow")
        .map(s => ({
          ...s,
          sets: Math.max(1, Math.ceil((s.sets || 3) / 2)),
          targetVx: s.targetVx !== null && s.targetVx !== undefined ? s.targetVx + 2 : null,
        }));
      dayPlan = { ...dayPlan, slots: prunedSlots, dayType: "volume" };
    }
    trace("DELOAD_OVERRIDE", {}, { weekNum, dayType, mode: isInsertedDeload ? "insert" : "replace" }, `Käyttäjän kevennysviikko (${isInsertedDeload ? "lisätty" : "korvaava"}): volyymi ~50%, kuorma -20%, Vx +2`);
  } else if (isLabelDeload) {
    // Built-in deload-viikko presetistä (esim. streetlifting_16w vk 4/8/12 "Deload + testaus"):
    // presetin omat deltaPctBase + heavyReps + heavyTargetVx säilyvät, mutta dayType
    // pakotetaan volume:ksi jotta heavy-day-tyyppi ei laukea deload-viikolla.
    const previousDayType = dayType;
    dayType = "volume";
    if (dayPlan) {
      dayPlan = { ...dayPlan, dayType: "volume" };
    }
    trace("DELOAD_OVERRIDE", { dayType: previousDayType }, { weekNum, dayType, mode: "label-builtin", label: weekDef?.label }, `Presetti-deload-viikko (${weekDef?.label}): dayType pakotettu volume:ksi, presetin kuorma-arvot säilytetty`);
  }

  trace("MESOCYCLE_PHASE", {}, { weekNum, dayType, label: weekDef?.label }, `Viikko ${weekNum}: ${weekDef?.label || "?"}`);

  // 3. Break analysis
  const sessions = options.sessions || (await getAllSessions());
  const lastSession = sessions[sessions.length - 1];
  const breakInfo = breakAnalysis(lastSession?.dateISO, dateISO);

  if (breakInfo.modifier !== 0) {
    if (breakInfo.forcedDayType) {
      const oldDayType = dayType;
      dayType = breakInfo.forcedDayType;
      trace("RETURN_FROM_BREAK_DAYTYPE", { dayType: oldDayType }, { dayType }, breakInfo.message);
    }
    trace("RETURN_FROM_BREAK", { modifier: 0 }, { modifier: breakInfo.modifier, breakDays: breakInfo.breakDays }, breakInfo.message);

    // Check mesocycle reset
    if (breakInfo.breakDays >= 14) {
      const skippedWeeks = Math.floor(breakInfo.breakDays / 7);
      const resetInfo = mesocycleBreakReset(mesocycle, skippedWeeks);
      if (resetInfo.reset) {
        mesocycle = createDefaultMesocycle(dateISO);
        if (!options.dryRun) await saveMesocycle(mesocycle);
        weekNum = 1;
        trace("MESOCYCLE_BREAK_RESET", {}, { weekNum: 1 }, resetInfo.reason);
      }
    }
  }

  // 4. Compute e1RM from recent top sets
  const allSets = options.allSets || (await getAllSets());
  const primaryMovementId = options.primaryMovementId || null;

  // Detect barbell-only lift (squat): no bodyweight added to system load
  const primarySlotMeta = dayPlan?.slots?.find(s => s.role === "primary");
  const isBarbell = primarySlotMeta?.isBarbell === true;
  const inferredBlockPhase = deriveBlockPhaseFromMesocycle(mesocycle.type, weekNum, weekDef?.label);

  // β Round B-α-1: movement-objekti + tier-resolvointi primary-liikkeelle.
  // Ladataan allMovements jos ei vielä options:eissa (tarvitaan tier-resolveriin
  // primary + SLOT_LOAD_RESOLVED haara A:lle). Tier päättää onko Lähde 1 -reitti
  // käytössä (number 1/2/3) vai säilyy nykyinen loadPct-kaava ("special").
  const allMovementsForTier = options.allMovements || (await getAllMovements());
  const primaryMovement = primarySlotMeta?.defaultMovementName
    ? allMovementsForTier.find(m => m.name === primarySlotMeta.defaultMovementName)
    : null;
  // Jos movement löytyy ja sillä on tier, resolvoi se. Muuten null (graceful
  // degradation — käytetään nykyistä loadPct-kaavaa fallback-tilanteessa).
  let primaryTier = null;
  if (primaryMovement && primaryMovement.tier !== undefined) {
    try { primaryTier = resolveTier(primaryMovement, mesocycle); }
    catch (e) { primaryTier = null; /* virheellinen tier-määrittely → fallback */ }
  }

  // Filter to primary movement top sets, sorted by date
  // v4.27.15: calibration-setit (AMRAP-testit deload-viikoilla) lasketaan mukaan
  // e1RM-laskentaan. Niillä actualVx === 0 (tekninen failure), jolloin Epley+Vara
  // redusoituu puhtaaksi Epleyksi: e1RM = kuorma × (1 + toistot/30) — vapaa
  // Vx-biasista.
  const topSets = allSets
    .filter((s) => {
      if (primaryMovementId && s.movementId !== primaryMovementId) return false;
      return s.setRole === "top" || s.setRole === "readiness_test" || s.setRole === "calibration";
    })
    .sort((a, b) => {
      // Sort by session date via sessionId lookup or timestamp
      return (a.timestamp || "").localeCompare(b.timestamp || "");
    });

  // e1RM from last 4-6 top sets
  // Barbell lifts (squat): external-load-only formula. CKC lifts: system load (BW + ext).
  const recentTopSets = topSets.slice(-6);
  const e1rmValues = recentTopSets
    .map((s) => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      if (isBarbell) {
        return e1rmAccessory(s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
      }
      return e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
    })
    .filter((v) => v !== null);

  // v4.27.15 → v4.32.8: CALIBRATION OVERRIDE
  //
  // Kalibrointisetti (setRole === "calibration") antaa tarkkuus-prioritisoidun
  // e1RM-mittauksen. Jos TOP-sarjoissa on viim. 3 setissä yksi tai useampi
  // kalibrointi, override: käytä pelkästään kalibrointisettien mediaania
  // (ohita Vx-kontaminoidut top-singlet).
  //
  // v4.32.8 PROTOKOLLAMUUTOS: AMRAP @85 % × failure (V0) → 92 % × 3 V1 (RPE 8).
  //   Tarkkuusparannus DiStasio 2014 + Helms MASS 2023:
  //   - Low-rep e1RM-tarkkuus ±2.7 kg vs AMRAP-extrapoloinnin ±5+ kg
  //   - CNS-kuorma matalampi → deload-viikolla turvallisempi
  //   - actualVx-fallback: ?? targetVx ?? 1 (yhdenmukainen e1RM-laskennan kanssa)
  //
  // Ikkunat:
  //   • Kalibrointi viim. 3 topissa → override (tuore kalibrointi hallitsee)
  //   • Vanhempi kalibrointi       → takaisin mediaaniin (strength changes
  //                                   drift + uutta data kertyy)
  //
  // Backward compat: vanhat V0-AMRAP-kalibroinnit toimivat edelleen
  //   (s.actualVx === 0 → vara = 0 → puhdas Epley).
  const last3Sets = recentTopSets.slice(-3);
  const recentCalibSets = last3Sets.filter(s => s.setRole === "calibration");
  let currentE1RMSystem;
  let e1rmSource = "median";
  if (recentCalibSets.length > 0) {
    const calibE1rms = recentCalibSets.map(s => {
      // v4.32.8: fallback chain — actualVx (raportoitu) → targetVx (V1 uudessa, V0 vanhassa) → 1
      const vara = s.actualVx ?? s.targetVx ?? 1;
      if (isBarbell) {
        return e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara);
      }
      return e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || 1, vara);
    }).filter(v => v !== null);
    currentE1RMSystem = calibE1rms.length > 0 ? median(calibE1rms) : (e1rmValues.length > 0 ? median(e1rmValues) : null);
    if (calibE1rms.length > 0) e1rmSource = `calibration (${recentCalibSets.length} setti${recentCalibSets.length > 1 ? "ä" : ""})`;
  } else {
    currentE1RMSystem = e1rmValues.length > 0 ? median(e1rmValues) : null;
  }
  let currentE1RMExternal = currentE1RMSystem !== null
    ? (isBarbell ? currentE1RMSystem : Math.max(0, currentE1RMSystem - bodyweightKg))
    : null;

  // v4.34.35: tallenna PLAN_BASED:n e1RM-nousu rate-limit-blokille.
  // Kun PLAN_BASED aktivoituu, e1RM nousee perfect-execution-pohjalta. Rate-limit
  // cap (joka oli kiinteä +6%) sokaistui tästä — cap rajoitti kuorman vaikka
  // todellinen e1RM oli nousussa. Korjaus: PLAN_BASED-aware cap = 6% + e1RMGrowth.
  let planBasedE1RMGrowthPct = 0;
  const epleyVaraE1RM = currentE1RMExternal; // tallennetaan ennen PLAN_BASED-overridea

  // v4.34.30: PLAN_BASED_E1RM — kun atletti suoriutui täydellisesti targetin Vx:llä,
  // luota suunnitelmaan, älä Epley+Vara -aliarvioon (Helms 2018, Tuchscherer RTS).
  //
  // Käyttäjäpalaute 2026-05-05: "Tein 4×6 V3 @120 kg juuri kuten oli tavoite, ja
  // engine ehdottaa vk 2 SAMA paino vaikka suunnitelma sanoo +3.5%". Juurisyy:
  // Epley+Vara aliarvioi e1RM:n korkeilla toistoilla ~10-15% (4×6 V3 @120 → 156,
  // todellinen ~175). Konservatiivinen e1RM × suunnitelma % → liian matala target.
  //
  // Korjaus: jos viim. session oli "perfect execution" (kaikki sarjat actualVx ≥
  // targetVx JA reps ≥ targetReps), johdetaan e1RM SUORAAN suunnitelmasta:
  //   plan_e1rm = lastLoad / lastLoadPct
  // Kun lastPct=0.686 ja lastLoad=120 → plan_e1rm = 175 (vrt. Epley+Vara 156).
  // Käytetään MAX(epley_vara, plan_based) → ei pakota alaspäin, vain ylöspäin.
  //
  // Plan-based aktivoituu vain perfect-execution-tilanteessa: jos atletti ei
  // suoriutunut, Epley+Vara säilyy (konservatiivinen suoja grindausta vastaan).
  if (currentE1RMExternal !== null && primaryMovementId && recentTopSets.length > 0) {
    // Hae viim. session SETIT — ei cal, ei deload (filtteröi sessio-tasolla)
    // v4.34.33 BUG-FIX 1.1: jos VIIM. session on cal-dominantti, ÄLÄ laukea
    // PLAN_BASED. Cal on tarkin mittaus (RPE 8 × 3 reps, low-rep e1RM-tarkkuus
    // ±2.7 kg, DiStasio 2014). Plan-based ekstrapoloi loadPct:llä — vanhempi
    // ei-cal-data tuottaa väärän e1RM:n kun cal on jo päivittänyt arvon.
    //
    // v4.34.36 BUG-FIX A: filtteröi VAIN setRole === "top" -sarjat. Aiempi bug:
    // Lisäpainodippi vk 2 MA -accessory (3×10 V5 @ 30 kg BW-volyymi) tunnistettiin
    // "viim. dippi-session"-laukaisijaksi → planBasedExternal = 30/0.71 = 42.25 kg
    // (= aliarvioi e1RM:n 80→42 kg). Korjaus: lastSessionSets sisältää vain
    // primary-work-sarjat, jolloin volume-day accessory-volyymi ei sotke laskua.
    // Ennen filteriä: recentTopSets sisältää JO vain primaryMovementId:n sarjoja
    // (rivi ~1830 filtteri), mutta accessoreja samalle liikkeelle ei suodatettu.
    const lastSessionSets = (() => {
      // Ryhmitä sessionId:n mukaan, ota viim. ei-cal-sessio
      const sessGroups = new Map();
      const sessOrder = [];
      // v4.34.36 A: filtteröi vain primary-work-sarjat (setRole === "top")
      const primaryWorkSets = recentTopSets.filter(s => s.setRole === "top");
      if (primaryWorkSets.length === 0) return null;
      for (const s of primaryWorkSets) {
        const sid = s.sessionId || `__nosess_${s.timestamp}`;
        if (!sessGroups.has(sid)) { sessGroups.set(sid, []); sessOrder.push(sid); }
        sessGroups.get(sid).push(s);
      }
      // v4.34.33: jos viim. session on cal-dominantti, palauta null → cal voittaa
      if (sessOrder.length > 0) {
        const lastSets = sessGroups.get(sessOrder[sessOrder.length - 1]);
        const lastCalCount = lastSets.filter(s => s.setRole === "calibration").length;
        if (lastCalCount >= lastSets.length * 0.5) return null;
      }
      // Käy lopusta alkuun, etsi viim. ei-cal-sessio
      for (let i = sessOrder.length - 1; i >= 0; i--) {
        const sets = sessGroups.get(sessOrder[i]);
        const calCount = sets.filter(s => s.setRole === "calibration").length;
        if (calCount < sets.length * 0.5) return sets;
      }
      return null;
    })();

    if (lastSessionSets && lastSessionSets.length > 0) {
      // Tarkista perfect execution: kaikki sarjat targetVx tai parempi (alempi luku)
      // JA reps >= targetReps. Sallitaan myös yksi V0 jos reps = targetReps (= just-made-it).
      const allHitTarget = lastSessionSets.every(s =>
        s.actualVx !== null && s.actualVx !== undefined && s.targetVx !== null && s.targetVx !== undefined
        && s.actualVx >= s.targetVx  // Vx asteikko: korkeampi = helpompi → actualVx >= targetVx tarkoittaa "yhtä helppo tai helpompi"
        && (s.reps ?? 0) >= (s.targetReps ?? 0)
      );

      if (allHitTarget) {
        // Hae viim. session date → mesocycle-vk → primary-slot loadPct
        // v4.34.33 BUG-FIX 1.2: session.dateISO on AUTORITATIIVINEN, ei set.timestamp.
        // Backfilloidut setit tallennetaan timestamp = recording-aika (= today),
        // joka ei vastaa historiallista vk:ta. Aiempi järjestys (timestamp ensin)
        // teki backfill-päiville väärän vk-lookupin → väärä loadPct → väärä e1RM.
        const lastSessionId = lastSessionSets[0]?.sessionId;
        const lastDateISO = (lastSessionId && (sessions || []).find(s => s.sessionId === lastSessionId)?.dateISO)
          || lastSessionSets[0]?.dateISO
          || lastSessionSets[0]?.timestamp?.slice(0, 10);
        const lastWk = lastDateISO ? getMesocycleWeek(mesocycle, lastDateISO) : null;
        const lastDow = lastDateISO ? (new Date(lastDateISO).getDay() || 7) : null;
        const lastDayPlan = (lastWk !== null && lastDow !== null)
          ? mesocycle.weekPlans?.[lastWk - 1]?.days?.find(d => d.dayOfWeek === lastDow)
          : null;
        const lastPrimarySlot = lastDayPlan?.slots?.find(s => s.role === "primary");
        const lastLoadPct = lastPrimarySlot?.loadPct;

        if (lastLoadPct && lastLoadPct > 0 && lastLoadPct <= 1.0) {
          const lastMedianLoad = median(lastSessionSets.map(s => s.externalLoadKg).filter(v => v > 0));
          if (lastMedianLoad && lastMedianLoad > 0) {
            // v4.34.32: Vx-overshoot-bonus PLAN_BASED-laskennassa.
            // Käyttäjäpalaute: "jos teen V2-target-treenin V3:lla, osaa kone optimoida?".
            // Jos atletti suoriutui HELPOMMIN kuin oli targetoitu (actualVx > targetVx),
            // engine tunnistaa "kuorma oli liian helppo" ja nostaa e1RM:ää suhteessa.
            // Tuchscherer RTS / Helms 2018: +2.5% per Vx-luokka (RPE 7 actual vs RPE 8
            // target = +5%). Kerrointetään plan-based-arvio overshoot:in mukaan.
            const meanOvershoot = lastSessionSets.reduce((sum, s) =>
              sum + ((s.actualVx ?? 0) - (s.targetVx ?? 0)), 0) / lastSessionSets.length;
            // Vain positiivinen overshoot saa bonuksen (negatiivinen = grindas → ei rangaistus
            // tässä, perfect-execution-ehto sen jo suodattaa)
            const vxBonusPct = Math.max(0, meanOvershoot) * 0.025;
            const planBasedExternal = (lastMedianLoad / lastLoadPct) * (1 + vxBonusPct);
            // v4.34.30 PÄIVITETTY: korvaa Epley+Vara plan-based-arvolla AINA kun perfect
            // execution. Älä käytä MAX:ia — Epley voi sekä yli- että aliarvioida e1RM:n
            // ja luottaminen suunnitelmaan on luotettavampaa kuin formula-extrapolointi.
            const original = currentE1RMExternal;
            const diffPct = ((planBasedExternal - original) / original) * 100;
            currentE1RMExternal = planBasedExternal;
            currentE1RMSystem = isBarbell ? planBasedExternal : (planBasedExternal + bodyweightKg);
            // v4.34.35: tallenna nousupct rate-limit-blokille
            planBasedE1RMGrowthPct = epleyVaraE1RM > 0
              ? Math.max(0, (planBasedExternal - epleyVaraE1RM) / epleyVaraE1RM)
              : 0;
            trace("PLAN_BASED_E1RM",
              { e1rmExternal: original.toFixed(1), source: "epley-vara" },
              { e1rmExternal: currentE1RMExternal.toFixed(1), source: "plan-based",
                lastLoad: lastMedianLoad, lastLoadPct, lastWk, perfectExecution: true,
                meanOvershoot: meanOvershoot.toFixed(2),
                vxBonusPct: (vxBonusPct * 100).toFixed(1) + "%",
                diffPct: diffPct.toFixed(1) + "%" },
              `Perfect execution (kaikki sarjat target Vx:llä @${lastMedianLoad} kg, vk ${lastWk} loadPct ${lastLoadPct})${meanOvershoot > 0.1 ? ` + Vx-overshoot ${meanOvershoot.toFixed(1)} (+${(vxBonusPct*100).toFixed(1)}% bonus, atletti suoriutui helpommalla)` : ''} → plan-based e1RM ${planBasedExternal.toFixed(1)} kg ${diffPct >= 0 ? 'yliajaa' : 'korjaa alas'} Epley+Vara ${original.toFixed(1)} kg (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)`);
          }
        }
      }
    }
  }

  // v4.34.28: Ceiling/floor-arvot näkyvissä VBT-promote-clampille (kohta 1).
  // Aiemmin nämä olivat let-muuttujia INFLATION_CAP- ja DEFLATION_CAP-blokkien
  // sisällä → VBT-haara (rivi ~1913) ohitti capit. Bug: jos velocity-pohjainen
  // e1RM oli 4% yli capatun arvon, VBT_PRIMARY_USED nosti currentE1RMExternal
  // takaisin yli capin. Korjaus: ceiling_ext ja floor_ext ovat nyt funktioscope:ssa.
  let ceiling_ext = null;
  let ceilingSource = null;
  let floor_ext = null;
  let floorSource = null;
  // v4.34.43: cfg-drift result (UI persistoi mesocycleen jos driftPct > 0).
  let cfgDriftResult = null;

  // v4.34.15 FIX #1: E1RM-INFLAATION CAP — Epley + Vara -kaava ylimitatoi 1RM:n
  // varsinkin korkeilla toistoilla (V3+ × 6 reps → +20 % seedista yhden session perusteella).
  // Käyttäjäpalaute simulaatiosta: "vk 1 e1RM 106 vs todellinen ~89 — vk 8 cal yli PR".
  //
  // v4.34.42 — B+ ADAPTIVE CEILING: streak-pohjainen kerroin-nosto (ks.
  // computePerfectStreakCeilingBonus). Aiempi kiinteä cfg × 1.10 -ceiling
  // rajoitti kasvun jos atletti toistuvasti ylitti targetin V3+ perfectillä
  // (esim. dippi vk 2 PLAN_BASED 92.3 > ceiling 88 → vk 3 jäi +0.5 kg).
  // Adaptive: 2 peräkkäistä perfect-yli-ceiling-sessiota nostaa kerrointa
  // 1.10 → 1.15, 3+ → 1.20 (max). Yksi V0-fail palauttaa 1.10:een.
  //
  // Logiikka (3 tasoa, prioriteettijärjestyksessä):
  //   1. Cal-historia → ceiling = max(cal-derived) × 1.05 (validoitu mittaus)
  //   2. streetliftingConfig (Lisäpainoleuka/dippi/Takakyykky) → cfg × adaptive
  //   3. (B+) Yleinen historia-baseline → max-3-e1RM × adaptive
  //      — toimii MILLE TAHANSA liikkeelle (variantti-vaihto, custom-meso)
  //
  // Cap pätee vain kun currentE1RMExternal > ceiling. Alaspäin ei capata
  // (oikea heikkous-signaali pitää näkyä rate-limit-anchorissa, ei piilottaa).
  if (currentE1RMExternal !== null && primaryMovementId) {
    const allCalSets = topSets.filter(s => s.setRole === "calibration");
    const recentCalForCeiling = allCalSets.slice(-3); // viim. 3 cal-settiä

    if (recentCalForCeiling.length > 0) {
      // Käytä viim. cal-setin e1RM:ää × 1.05
      const calE1RMs = recentCalForCeiling.map(s => {
        const cv = s.actualVx ?? s.targetVx ?? 1;
        const e1rmSys = isBarbell
          ? e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, cv)
          : e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || 1, cv);
        return isBarbell ? e1rmSys : (e1rmSys - bodyweightKg);
      }).filter(v => v !== null);
      if (calE1RMs.length > 0) {
        ceiling_ext = Math.max(...calE1RMs) * 1.05;
        ceilingSource = `cal-derived (max ${Math.max(...calE1RMs).toFixed(1)} × 1.05)`;
      }
    }

    if (ceiling_ext === null) {
      // Ei cal-historiaa → käytä konfiguroitu PR × adaptive
      // v4.34.42: adaptive-kerroin = 1.10 + streak-bonus (max +0.10 = 1.20)
      // v4.34.43: cfg-arvo voi olla drifted (engine on oppinut atletin todellisen
      // pohjatason). Käytä effectiveCfg = baseCfg × (1 + driftPct).
      const cfgInfo = getCfgBaselineForMovement(mesocycle, primarySlotMeta);
      const initialPR = cfgInfo.value;
      if (initialPR && initialPR > 0) {
        // CFG-DRIFT: laske drift IN-MEMORY (ei muta meso). Persistointi UI:ssa
        // computeRecommendation():n yhteydessä cfgDriftApplied-flagin perusteella.
        const drift = computeCfgDrift(topSets, sessions, mesocycle, isBarbell, bodyweightKg, initialPR, dateISO);
        const effectiveCfg = initialPR * (1 + drift.driftPct);
        if (drift.driftPct > 0) {
          trace("CFG_DRIFT_APPLIED",
            { cfg: initialPR.toFixed(1), source: "cfg-baseline" },
            { effectiveCfg: effectiveCfg.toFixed(1), driftPct: (drift.driftPct*100).toFixed(1) + '%',
              signal: drift.signal, counter: drift.counter, source: drift.source },
            `Cfg-drift +${(drift.driftPct*100).toFixed(1)}% (${drift.signal}): ${cfgInfo.movName} ${initialPR} → ${effectiveCfg.toFixed(1)} kg [${drift.source}]`);
        }
        // Tallenna drift-info recommend()-output:iin (UI persistoi mesocycleen)
        cfgDriftResult = {
          movName: cfgInfo.movName,
          key: cfgInfo.key,
          fromCfg: initialPR,
          toCfg: effectiveCfg,
          driftPct: drift.driftPct,
          signal: drift.signal,
          source: drift.source,
          counter: drift.counter,
          velDeltaPct: drift.velDeltaPct,
          dateISO,
        };

        // Cap-laskenta käyttää effectiveCfg:tä baseena
        const baseCeiling = effectiveCfg * 1.10;
        const sr = computePerfectStreakCeilingBonus(topSets, sessions, mesocycle, isBarbell, bodyweightKg, baseCeiling);
        const ceilingMult = 1.10 + sr.bonus;
        ceiling_ext = effectiveCfg * ceilingMult;
        const driftLabel = drift.driftPct > 0 ? ` [drift +${(drift.driftPct*100).toFixed(1)}%]` : '';
        ceilingSource = `${cfgInfo.movName} PR ${initialPR}${driftLabel} × ${ceilingMult.toFixed(2)}`
                      + (sr.bonus > 0 ? ` [B+ streak ${sr.streak}× → +${(sr.bonus*100).toFixed(0)}%]` : '');
      }
    }

    if (ceiling_ext === null && topSets.length > 0) {
      // v4.34.42 B+ — Yleistys: historia-baseline mille tahansa liikkeelle.
      // Käytä top-3 e1RM:n mediaania baselinena → adaptive × 1.10 + streak.
      // Tämä korvaa hardkoodatun "vain 3 streetlifting-päälikettä" -mallin —
      // variantti-vaihto (esim. Painodippi → Lisäpainodippi) ei riko cap:ia,
      // ja custom-mesosyklit muille liikkeille saavat suojan automaattisesti.
      const histE1RMs = topSets.slice(-12).map(s => {
        const cv = s.actualVx ?? s.targetVx ?? 1;
        if ((s.externalLoadKg ?? 0) <= 0 || (s.reps ?? 0) < 1) return null;
        const e1rmSys = isBarbell
          ? e1rmAccessory(s.externalLoadKg, s.reps, cv)
          : e1rmSystem(bodyweightKg, s.externalLoadKg, s.reps, cv);
        return isBarbell ? e1rmSys : (e1rmSys - bodyweightKg);
      }).filter(v => v !== null && v > 0);

      if (histE1RMs.length > 0) {
        histE1RMs.sort((a, b) => b - a);
        const baseline = median(histE1RMs.slice(0, Math.min(3, histE1RMs.length)));
        const baseCeiling = baseline * 1.10;
        const sr = computePerfectStreakCeilingBonus(topSets, sessions, mesocycle, isBarbell, bodyweightKg, baseCeiling);
        const ceilingMult = 1.10 + sr.bonus;
        ceiling_ext = baseline * ceilingMult;
        ceilingSource = `historia-baseline ${baseline.toFixed(1)} × ${ceilingMult.toFixed(2)}`
                      + (sr.bonus > 0 ? ` [B+ streak ${sr.streak}× → +${(sr.bonus*100).toFixed(0)}%]` : '');
      }
    }

    if (ceiling_ext !== null && currentE1RMExternal > ceiling_ext) {
      const original = currentE1RMExternal;
      currentE1RMExternal = ceiling_ext;
      currentE1RMSystem = isBarbell ? ceiling_ext : (ceiling_ext + bodyweightKg);
      trace("E1RM_INFLATION_CAP",
        { e1rmExternal: original },
        { e1rmExternal: currentE1RMExternal, ceiling: ceiling_ext, source: ceilingSource },
        `e1RM ${original.toFixed(1)} kg → ${currentE1RMExternal.toFixed(1)} kg (cap: ${ceilingSource})`);
    }

    // v4.34.17 FIX #5: E1RM FLOOR CAP (symmetrinen ceiling cap:n kanssa).
    // Käyttäjäpalaute TI-pilotista: Epley + Vara ALIMITTAA squat-1RM:n korkeilla
    // toistoilla (4×6 V3 → e1RM 156 kg vs todellinen PR 175 kg = -11 %). Tämä
    // aiheuttaa ohjelman load-DROPin viikkojen välillä:
    //   Vk 1: 4×6×120 V3 (planned 120 = 0.686 × 175)
    //   Vk 2: 0.71 × computed e1RM 156 = 111 kg (vs intent 0.71 × 175 = 124 kg)
    //   = -9 kg DROP vk 1:stä, vaikka Vx-tavoite sama V3 ja kuorman pitäisi nousta.
    // Erityisen tärkeä squat/dippi-tyyppisille barbell-/external-only-laskennoille
    // (kaava ilman BW-additiota) joissa Epley-curve flatterua nopeammin kuin
    // pull-upissa (jossa BW lisää effective mass-arvoa).
    //
    // Logiikka (symmetrinen ceiling-capin kanssa):
    //   1. Cal-historia → floor = MIN(cal-derived) × 0.95 (validated alaraja)
    //   2. Ei cal:ia    → floor = initialPR × 0.95 (seed alaraja)
    //   3. Jos computed < floor → cap UP — älä luota Epley-aliarvioon ilman cal-validointia
    if (currentE1RMExternal !== null && primaryMovementId) {
      const allCalSetsForFloor = topSets.filter(s => s.setRole === "calibration");
      const recentCalForFloor = allCalSetsForFloor.slice(-3);

      if (recentCalForFloor.length > 0) {
        const calE1RMsFloor = recentCalForFloor.map(s => {
          const cv = s.actualVx ?? s.targetVx ?? 1;
          const e1rmSys = isBarbell
            ? e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, cv)
            : e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || 1, cv);
          return isBarbell ? e1rmSys : (e1rmSys - bodyweightKg);
        }).filter(v => v !== null);
        if (calE1RMsFloor.length > 0) {
          floor_ext = Math.min(...calE1RMsFloor) * 0.95;
          floorSource = `cal-derived (min ${Math.min(...calE1RMsFloor).toFixed(1)} × 0.95)`;
        }
      }

      if (floor_ext === null) {
        // v4.34.43: floor käyttää SAMAA effective cfg:tä kuin ceiling
        // (drift-konsistenssi). Jos cfg drifttasi ylös, myös floor on korkeampi.
        const cfgInfoFloor = getCfgBaselineForMovement(mesocycle, primarySlotMeta);
        const initialPRFloor = cfgInfoFloor.value;
        if (initialPRFloor && initialPRFloor > 0) {
          // Käytä cfgDriftResult:n effective-arvoa jos saatavilla (= sama drift kuin ceilingissä)
          const effectiveCfgFloor = cfgDriftResult?.toCfg ?? initialPRFloor;
          floor_ext = effectiveCfgFloor * 0.95;
          const driftLabel = cfgDriftResult?.driftPct > 0 ? ` [drift +${(cfgDriftResult.driftPct*100).toFixed(1)}%]` : '';
          floorSource = `${cfgInfoFloor.movName} PR ${initialPRFloor}${driftLabel} × 0.95`;
        }
      }

      if (floor_ext !== null && currentE1RMExternal < floor_ext) {
        const originalLow = currentE1RMExternal;
        currentE1RMExternal = floor_ext;
        currentE1RMSystem = isBarbell ? floor_ext : (floor_ext + bodyweightKg);
        trace("E1RM_DEFLATION_CAP",
          { e1rmExternal: originalLow },
          { e1rmExternal: currentE1RMExternal, floor: floor_ext, source: floorSource },
          `e1RM ${originalLow.toFixed(1)} kg → ${currentE1RMExternal.toFixed(1)} kg (floor: ${floorSource} — Epley-aliarviosuoja)`);
      }
    }
  }

  trace("E1RM_COMPUTED", {}, {
    e1rmSystem: currentE1RMSystem?.toFixed(1),
    e1rmExternal: currentE1RMExternal?.toFixed(1),
    fromSets: recentTopSets.length,
    source: e1rmSource,
  }, `e1RM laskettu ${recentTopSets.length} viimeisimmästä top-setistä (lähde: ${e1rmSource})`);

  // v4.25.1: LV-profiilin cross-check (Enode-valmistelu). Ei vaikuta kuormaan —
  // diagnostiikka kun velocity-dataa kertyy ankkuripisteistä. Jos ristiinveto
  // eroaa yli ±7% Vx-pohjaisesta e1RM:stä, tämä on *signaali* että joko:
  //   (a) Vx-raportointi on systemaattisesti biased (atleetin tunnettu taipumus), tai
  //   (b) velocity-anturi on kalibroimaton, tai
  //   (c) LV-profiili on vielä rakentumassa (n < 5 pistettä — vähemmän luotettava).
  if (currentE1RMExternal !== null) {
    // Anchor-set haku: primary-liikkeen KAIKKI setit joilla velocityMean
    // (riippumatta setRole:sta — secondary-slot-top-singlet tallentuvat "accessory"-rolena).
    const anchorSetsForLV = primaryMovementId
      ? allSets.filter(s =>
          s.movementId === primaryMovementId &&
          s.velocityMean !== null && s.velocityMean !== undefined &&
          s.reps === 1
        )
      : [];
    // v4.34.25: pass movementName for liike-spesifi MVT-haku (Sánchez-Moreno 2017 jne.)
    // primarySlotMeta?.defaultMovementName tunnetaan dayPlan-rakenteesta
    const lvProfile = computeLoadVelocityProfile(anchorSetsForLV, bodyweightKg, {
      isBarbell,
      currentE1RMExternal,
      movementName: primarySlotMeta?.defaultMovementName || null,
    });
    if (lvProfile.n >= 3 && lvProfile.e1rmCrossCheck !== null) {
      const diffPct = (lvProfile.e1rmCrossCheck - currentE1RMExternal) / currentE1RMExternal;
      const absDiff = Math.abs(diffPct);
      const severity = absDiff > 0.07 ? "SIGNIFICANT" : absDiff > 0.03 ? "MODERATE" : "ALIGNED";
      trace("VBT_E1RM_CROSSCHECK", {},
        {
          e1rmVx: currentE1RMExternal.toFixed(1),
          e1rmVelocity: lvProfile.e1rmCrossCheck.toFixed(1),
          diffPct: (diffPct * 100).toFixed(1) + "%",
          v1rmEstimate: lvProfile.v1rmEstimate?.toFixed(2),
          points: lvProfile.n,
          severity,
        },
        `LV-profiili ${lvProfile.n} pistettä · Vx-e1RM ${currentE1RMExternal.toFixed(1)} kg vs. velocity-e1RM ${lvProfile.e1rmCrossCheck.toFixed(1)} kg (${(diffPct * 100).toFixed(1)}%) · ${severity}`);
    }

    // v4.34.27: VBT Reliability-portti — promote velocity-pohjainen e1RM PRIMARY-haaraan
    // jos n ≥ 10 ankkuripistettä viim. 4 vk JA |diff| ≤ 5%. Hysteresis ≥ 8% demotelle.
    // Vaatii liike-spesifin MVT:n (Sánchez-Moreno 2017 jne.) — tunnistetaan
    // primarySlotMeta?.defaultMovementName-pohjalta.
    const vbtStatus = computeVBTPromotionStatus(allSets, primaryMovementId, currentE1RMExternal, {
      isBarbell,
      bodyweightKg,
      movementName: primarySlotMeta?.defaultMovementName || null,
      todayISO: dateISO,
      previouslyPromoted: false, // MVP: ei vielä historiaa, lasketaan fresh
    });
    // v4.34.31: Tarkista onko PLAN_BASED_E1RM jo aktivoitunut. Jos kyllä, VBT EI saa
    // ylikirjoittaa sitä (suunnitelma-uskollisuus voittaa yksittäiset velocity-mittaukset).
    // Plan-based on hyödyttänyt useamman session datasta + tunnetusta loadPct-historiasta;
    // VBT on regressio yksittäisten ankkuripisteiden pohjalta. Tärkeysjärjestys:
    //   1. Plan-based (jos perfect execution)
    //   2. VBT (jos n≥10 LV-pistettä JA plan-based ei aktivoitu)
    //   3. Epley+Vara (default)
    const planBasedActive = traces.some(t => t.ruleId === "PLAN_BASED_E1RM");
    if (vbtStatus.status === "promoted" && vbtStatus.recommendedE1RM !== null && !planBasedActive) {
      const oldE1RM = currentE1RMExternal;
      // v4.34.28: Clamp velocity-pohjainen e1RM cap-rajoihin (cowork-audit kohta 2.2 #1).
      // Aiempi bug: jos diff < 5% ja velocity-arvio yli ceiling-capin, VBT-promote nosti
      // e1RM:n yli capin. Korjaus: clampataan ceiling/floor-arvoihin jos ne määritelty.
      let proposedE1RM = vbtStatus.recommendedE1RM;
      const beforeClamp = proposedE1RM;
      if (ceiling_ext !== null) proposedE1RM = Math.min(proposedE1RM, ceiling_ext);
      if (floor_ext !== null)   proposedE1RM = Math.max(proposedE1RM, floor_ext);
      const wasClamped = proposedE1RM !== beforeClamp;
      currentE1RMExternal = proposedE1RM;
      currentE1RMSystem = isBarbell ? currentE1RMExternal : (currentE1RMExternal + bodyweightKg);
      trace("VBT_PRIMARY_USED",
        { e1rmExternal: oldE1RM.toFixed(1), source: "vx-pohjainen" },
        { e1rmExternal: currentE1RMExternal.toFixed(1), source: "velocity-promoted",
          anchorCount: vbtStatus.anchorCount, diffPct: (vbtStatus.diffPct * 100).toFixed(1) + "%",
          clampedToCeiling: wasClamped && ceiling_ext !== null && proposedE1RM === ceiling_ext,
          clampedToFloor: wasClamped && floor_ext !== null && proposedE1RM === floor_ext },
        `VBT promotettu: ${vbtStatus.anchorCount} ankkuripistettä · ±${(vbtStatus.diffPct * 100).toFixed(1)}% diff → e1RM ${oldE1RM.toFixed(1)} → ${currentE1RMExternal.toFixed(1)} kg (velocity-pohjainen)${wasClamped ? ` [clampattu: ${beforeClamp.toFixed(1)} → ${proposedE1RM.toFixed(1)}]` : ""}`);
    } else if (vbtStatus.status === "promoted" && planBasedActive) {
      // VBT olisi aktivoitunut mutta PLAN_BASED on tärkeämpi
      trace("VBT_DEFERRED_TO_PLAN", {},
        { vbtRecommendedE1RM: vbtStatus.recommendedE1RM?.toFixed(1), planBasedE1RM: currentE1RMExternal.toFixed(1),
          anchorCount: vbtStatus.anchorCount, diffPct: vbtStatus.diffPct !== null ? (vbtStatus.diffPct * 100).toFixed(1) + "%" : "n/a" },
        `VBT promote ohitettu: PLAN_BASED on aktiivinen (suunnitelma-uskollisuus voittaa yksittäisen velocity-mittauksen). VBT-arvio ${vbtStatus.recommendedE1RM?.toFixed(1)} kg, plan-based ${currentE1RMExternal.toFixed(1)} kg.`);
    } else if (vbtStatus.status === "candidate") {
      trace("VBT_CANDIDATE", {},
        { anchorCount: vbtStatus.anchorCount, diffPct: vbtStatus.diffPct !== null ? (vbtStatus.diffPct * 100).toFixed(1) + "%" : "n/a" },
        `VBT candidate: ${vbtStatus.reason} (Vx-e1RM säilyy primary-haarana)`);
    }
  }

  // 5. Readiness
  const readiness = options.readiness || { combined: "GREEN", capLevel: 0, channels: {} };
  const capLevel = readiness.capLevel;

  // 6. deltaPct calculation
  const dayMult = DAY_TYPE_MULTIPLIERS[dayType] ?? 1.0;
  let deltaPctRawValue = (weekDef?.deltaPctBase || 0) * dayMult;
  trace("DELTA_PCT_RAW", {}, { deltaPctRaw: deltaPctRawValue }, `deltaPct_raw = ${weekDef?.deltaPctBase || 0} × ${dayMult}`);

  // 7. Vara trend correction (asymmetric: aggressive up, conservative down)
  const varaCorr = varaTrendCorrection(recentTopSets);
  if (varaCorr !== 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue += varaCorr;
    trace("VARA_TREND_CORRECTION", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue }, `Vara-trendikorjaus: ${varaCorr > 0 ? "+" : ""}${(varaCorr * 100).toFixed(2)}% ${varaCorr > 0.015 ? "(AKSELEROINTI 🚀)" : ""}`);
  }

  // 7b. e1RM momentum bonus (PR-trendi kiihdyttää)
  const e1rmSeries = e1rmValues.map(v => ({ e1rm: v }));
  const momentumBonus = e1rmMomentumBonus(e1rmSeries);
  if (momentumBonus > 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue += momentumBonus;
    trace("E1RM_MOMENTUM_BONUS", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue }, `PR-momentum +${(momentumBonus * 100).toFixed(2)}% (e1RM nousutrendi)`);
  }

  // 7c. Gross-mismatch correction (ohjelma aivan väärin skaalattu → escalointi)
  const grossCorr = grossMismatchCorrection(recentTopSets);
  if (grossCorr > 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue += grossCorr;
    trace("GROSS_MISMATCH_CORRECTION", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue }, `Ohjelman skaalausvirhe havaittu — pikakorjaus +${(grossCorr * 100).toFixed(2)}%`);
  }

  // v4.34.34 BUG 2 (b): FIRST-SET CAPACITY BONUS
  // Aktivoituu kun viim. session ekka työsarja oli ≥2 luokkaa helpompi kuin
  // target (esim. target V3, actual V5+). Käyttäjäpalaute: "ekka V5-helppous
  // ei johda mihinkään" → tämä on suora vastaus. Ekka sarja fresh = vahva
  // kapasiteetti-signaali, ei väsymys-signaali. Soveltaa vain heavy-päiviin
  // (volume/speed-päivissä Vx ei mittaa kuorma-kapasiteettia).
  if (dayType === "heavy") {
    const firstSetBonus = firstSetCapacityBonus(recentTopSets);
    if (firstSetBonus > 0) {
      const oldDelta = deltaPctRawValue;
      deltaPctRawValue += firstSetBonus;
      const lastSessId = recentTopSets[recentTopSets.length - 1]?.sessionId;
      const firstWork = recentTopSets.filter(s => s.sessionId === lastSessId).find(s => s.setRole !== "calibration");
      const ovr = firstWork ? (firstWork.actualVx - firstWork.targetVx) : 0;
      trace("FIRST_SET_CAPACITY_BONUS",
        { deltaPct: oldDelta },
        { deltaPct: deltaPctRawValue, overshoot: ovr, bonus: firstSetBonus },
        `Ekka työsarja ${ovr >= 0 ? "+" : ""}${ovr} Vx vs target (target V${firstWork?.targetVx}, actual V${firstWork?.actualVx}) — fresh-V${firstWork?.actualVx} = +${(firstSetBonus*100).toFixed(1)}% kapasiteetti-bonus`);
    }
  }

  // 8. Break modifier
  if (breakInfo.modifier !== 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue += breakInfo.modifier;
    trace("BREAK_MODIFIER", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue }, `Tauko-modifikaattori: ${breakInfo.modifier * 100}%`);
  }

  // 8b. Failure lockout (v4.25 P2-16): jos edellinen sessio meni failureen
  // (Vx 0), ei nosteta kuormaa. Suojaa atleetin grinding-taipumukselta.
  // v4.34.33 BUG-FIX 1.4: trace edelleen vaikka deltaPct olisi jo negatiivinen
  // (esim. tauko-modifikaattori vetänyt sen alas). Käyttäjä saa tietää että
  // engine HUOMASI failuren — UX-konsistenssi, ei behavior change.
  if (hadFailureLastSession(recentTopSets)) {
    if (deltaPctRawValue > 0) {
      const oldDelta = deltaPctRawValue;
      deltaPctRawValue = Math.min(deltaPctRawValue, 0);
      trace("FAILURE_LOCKOUT", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue, capped: true },
        "Edellinen sessio Vx 0 → kuormaa ei nosteta (failure-lockout)");
    } else {
      trace("FAILURE_DETECTED", { deltaPct: deltaPctRawValue }, { deltaPct: deltaPctRawValue, capped: false },
        "Edellinen sessio Vx 0 huomattu — kuorma jo negatiivinen muista syistä, lockoutia ei tarvita");
    }
  }

  // 9. Clamp
  const maxDelta = settings.maxDelta || 0.25;
  let deltaPct = clamp(deltaPctRawValue, -maxDelta, maxDelta);

  // 10. Apply readiness cap + active load reduction
  //     RED  → -5 % kuormaan (tai -8 % jos sekä velocity että Vara punaisia)
  //     YELLOW → -2 % kuormaan
  //     Samalla + targetVx +1 (kevennä varaa) jotta sarjat eivät mene failureen.
  let readinessLoadReduction = 0;
  let readinessVxBump = 0;
  if (capLevel === 2) {
    const oldDelta = deltaPct;
    deltaPct = Math.min(deltaPct, 0);
    if (dayType === "heavy") {
      const oldDayType = dayType;
      dayType = "volume";
      trace("CAP_RED_DAYTYPE", { dayType: oldDayType }, { dayType: "volume" }, "RED readiness → heavy vaihdettu volume:ksi");
    }
    // Double-red (velocity + Vara molemmat RED) = syvä väsymys → isompi vähennys
    const velRed = readiness.channels?.velocity?.class === "RED";
    const varaRed = readiness.channels?.vara?.class === "RED";
    readinessLoadReduction = (velRed && varaRed) ? -0.08 : -0.05;
    readinessVxBump = 1;
    deltaPct += readinessLoadReduction;
    trace("CAP_RED", { deltaPct: oldDelta }, { deltaPct }, `RED readiness → kuorma ${(readinessLoadReduction * 100).toFixed(1)}% + targetVx +${readinessVxBump}${velRed && varaRed ? " (double-red: velocity + Vara)" : ""}`);
  } else if (capLevel === 1) {
    const oldDelta = deltaPct;
    deltaPct = deltaPct * 0.5;
    readinessLoadReduction = -0.02;
    deltaPct += readinessLoadReduction;
    trace("CAP_YELLOW", { deltaPct: oldDelta }, { deltaPct }, `YELLOW readiness → deltaPct puolitettu + kuorma ${(readinessLoadReduction * 100).toFixed(1)}%`);
  }

  // 11. Compute target load — use actual slot reps/Vx when available
  let targetReps, targetVx;
  const primarySlotForLoad = dayPlan?.slots?.find(s => s.role === "primary");
  if (primarySlotForLoad) {
    // Use actual dayPlan slot values (from weekPlan)
    targetReps = primarySlotForLoad.reps;
    targetVx = primarySlotForLoad.targetVx ?? (dayType === "heavy" ? 2 : dayType === "volume" ? 3 : 4);
  } else if (weekDef) {
    targetReps = dayType === "heavy" ? weekDef.heavyReps : (dayType === "volume" ? 5 : 2);
    targetVx = dayType === "heavy" ? weekDef.heavyTargetVx : (dayType === "volume" ? 3 : 4);
  } else {
    targetReps = 3;
    targetVx = 2;
  }

  // Apply readiness Vx bump (RED day → +1 Vx kaikkiin sarjoihin, turvapuskuri)
  if (readinessVxBump > 0 && targetVx !== null) {
    targetVx = targetVx + readinessVxBump;
  }

  let targetExternalLoad;

  // v4.22 P2: Relative-loading -polku. Kun slot määrittelee loadPct (% nykyisestä
  // ext e1RM:stä), engine kunnioittaa sitä suoraan. Tämä on ohjelma-tekijän
  // eksplisiittinen ilmaus: "viikko 11 primary = 90 % current e1RM" — ei
  // mitään deltaPct + effReps -taikuutta päälle. Mahdottomia >100 % 1RM
  // kuormia ei voi syntyä ellei loadPct ole itsessään > 1.0.
  //
  // Käyttö: slot.loadPct = 0.90. Backward-compat: jos loadPct puuttuu, fallback
  // alempaan deltaPct-pohjaiseen laskentaan (ylläpito vanhoille mesosykleille).
  if (primarySlotMeta?.loadPct !== undefined && primarySlotMeta?.loadPct !== null) {
    const pct = primarySlotMeta.loadPct;
    if (currentE1RMExternal !== null && currentE1RMExternal > 0) {
      // β Round B-α-1 — Lähde 1 -reitti tier 1/2/3:lle (L46 "A puhtaana"):
      //   maxReps = targetReps + targetVx
      //   expectedPct = 1 / (1 + maxReps/30)  (vRepsToExpectedPct)
      //   kuorma = isBarbell ? sys × expectedPct : sys × expectedPct − BW
      // Tier "special" (Heavy negative leuka, Board dippi) → säilyy nykyinen
      // loadPct-kaava (in-session-kuorma). Fallback (primaryTier null) → vanha kaava.
      // Brzycki/conservative rajattu pois eksplisiittisesti (L46).
      let pctForResolve = pct;
      let resolveSource = "loadPct";
      if (typeof primaryTier === "number" && (primaryTier === 1 || primaryTier === 2 || primaryTier === 3)) {
        const maxReps = targetReps + targetVx;
        const expectedPct = vRepsToExpectedPct(maxReps);
        if (expectedPct !== null) {
          pctForResolve = expectedPct;
          resolveSource = "vRepsToExpectedPct";
        }
      }
      // Lisäpainoliikkeet (BW-ank): kuorma = pct × (BW + extE1RM) − BW (system-pohjainen)
      // Tankoliikkeet (isBarbell): kuorma = pct × extE1RM (external == system, BW ei nouse tangon mukana)
      targetExternalLoad = roundToHalf(Math.max(0, isBarbell
        ? currentE1RMSystem * pctForResolve
        : currentE1RMSystem * pctForResolve - bodyweightKg));
      trace("LOAD_PCT_RESOLVED", {}, { pct, pctForResolve, resolveSource, primaryTier, targetReps, targetVx, currentE1RMSystem, currentE1RMExternal, isBarbell, targetExternalLoad },
        `${(pctForResolve*100).toFixed(0)}% × ${isBarbell ? "ext" : "sys"} e1RM (${(isBarbell ? currentE1RMExternal : currentE1RMSystem).toFixed(1)} kg)${isBarbell ? "" : " − BW"} = ${targetExternalLoad} kg [src: ${resolveSource}, tier: ${primaryTier ?? "fallback"}]`);

      // v4.35.0 — Eliittitason progressio: yksi funktio päättää kuorman.
      //
      // Vanha cap-only-arkkitehtuuri (PROGRESSION_RATE_LIMIT + PROGRESSION_FLOOR_CAP
      // erillisinä mekanismeina, dual-anchor heaviest+last, planBasedCapBonus,
      // weekMultiplier) on korvattu computeProgressionTarget-funktiolla joka
      // yhdistää regain-multiplier × Helms-weekly + Vx-adjustment + plan-floor +
      // hard-cap + regression-suoja yhdeksi deterministiseksi päätökseksi.
      //
      // Lähteet ja kalibrointi: PROGRESSION_CONFIG-vakio (Helms 2018, Cumming 2024,
      // Psilander 2018, Bruusgaard 2010, Issurin 2010).
      //
      // Vanhat ruleId:t (PROGRESSION_RATE_LIMIT, PROGRESSION_FLOOR_CAP) heijastetaan
      // trace-kutsuina taaksepäin yhteensopivuudeksi: testit jotka asserttaavat
      // näitä trace-merkintöjä säilyvät vihreinä.
      //
      // Anchor (computeRateLimitAnchor) säilytetään koska se tuottaa lastSession-
      // profiilin (medianLoad, medianVx, isCalibration, dateISO) jonka
      // computeProgressionTarget tarvitsee. Excludaa backoff (v4.34.35) jotta
      // anchor.medianVx ei sotkeudu V5-V6-backoff-sarjoista.
      const anchor = computeRateLimitAnchor(recentTopSets, { excludeBackoff: true });
      if (anchor) {
        const planTarget = targetExternalLoad;
        const cfgInfoForProg = getCfgBaselineForMovement(mesocycle, primarySlotMeta);
        const progResult = computeProgressionTarget({
          lastSession: anchor.lastSession,
          targetVx: targetVx ?? 2,
          weekDef,
          dayType,
          cfgBaseline: cfgInfoForProg.value || null,
          planTarget,
          planBasedActive: planBasedE1RMGrowthPct > 0.005,
          dateISO,
        });

        if (progResult.targetLoad !== null) {
          const original = targetExternalLoad;
          targetExternalLoad = roundToHalf(progResult.targetLoad);
          const dt = progResult.decisionTrace;
          const ruleHits = dt.ruleHits;

          // Päätrace: koko progression-päätöksen audit trail
          trace("PROGRESSION_TARGET",
            { targetExternalLoad: original },
            { targetExternalLoad,
              ruleHits,
              regainRatio: dt.regainRatio,
              regainMultiplier: dt.regainMultiplier,
              weeksSinceLast: dt.weeksSinceLast,
              weeklyProgressionPct: dt.weeklyProgressionPct,
              vxAdjustmentPct: dt.vxAdjustmentPct,
              autoregTarget: dt.autoregTarget,
              planFloor: dt.planFloor,
              hardCap: dt.hardCap,
              anchorMedianLoad: anchor.medianLoad,
              anchorMedianVx: anchor.medianVx,
              lastLoad: anchor.lastSession.medianLoad,
              lastVx: anchor.lastSession.medianVx,
              fromSessions: anchor.fromSessions },
            dt.rationale);

          // Taaksepäin yhteensopivuus: heijasta vanhat ruleId:t erillisinä
          // trace-kutsuina jotta vanhat assertit (hasTrace(rec, "PROGRESSION_RATE_LIMIT"),
          // hasTrace(rec, "PROGRESSION_FLOOR_CAP")) säilyvät vihreinä.
          if (ruleHits.includes('PROGRESSION_HARD_CAP')) {
            trace("PROGRESSION_RATE_LIMIT",
              { targetExternalLoad: original },
              { targetExternalLoad,
                hardCap: dt.hardCap,
                autoregTarget: dt.autoregTarget,
                weeksSinceLast: dt.weeksSinceLast,
                newVx: targetVx ?? 2,
                anchorLoad: anchor.medianLoad,
                anchorVx: anchor.medianVx,
                lastLoad: anchor.lastSession.medianLoad,
                lastVx: anchor.lastSession.medianVx,
                fromSessions: anchor.fromSessions },
              `Rate-limit (hard-cap +${(PROGRESSION_CONFIG.HARD_CAP_PER_WEEK*100).toFixed(0)}%/vk × ${dt.weeksSinceLast}vk): ${original} → ${targetExternalLoad} kg.`);
          }
          if (ruleHits.includes('PROGRESSION_FLOOR_CAP')) {
            // before.targetExternalLoad: arvo ennen floor-cap-nostoa
            // (= max(planFloor, autoregTarget) ennen kuin lattia korjasi sen ylös)
            const beforeFloor = roundToHalf(Math.max(dt.planFloor, dt.autoregTarget));
            trace("PROGRESSION_FLOOR_CAP",
              { targetExternalLoad: beforeFloor },
              { targetExternalLoad,
                lastLoad: anchor.lastSession.medianLoad,
                lastVx: anchor.lastSession.medianVx,
                newVx: targetVx ?? 2,
                floor: anchor.lastSession.medianLoad },
              `Floor-cap: ${beforeFloor} → ${targetExternalLoad} kg (regression-suoja: viim. sessio ${anchor.lastSession.medianLoad.toFixed(1)} kg @V${anchor.lastSession.medianVx.toFixed(1)} meni targetin Vx:llä — uutta sessiota ei pudoteta tämän alle).`);
          }
        }
      }
    } else if (primarySlotMeta?.suggestedLoadKg) {
      // Ei vielä e1RM-historiaa → käytä plan-seedattua kuormaa
      targetExternalLoad = primarySlotMeta.suggestedLoadKg;
      trace("LOAD_PCT_SEED", {}, { targetExternalLoad, pct },
        `loadPct ${(pct*100).toFixed(0)}% mutta ei e1RM-historiaa → seed ${targetExternalLoad} kg`);
    } else {
      targetExternalLoad = null;
    }
  } else if (currentE1RMSystem !== null) {
    // Legacy-polku: deltaPct-pohjainen laskenta (käytössä default-mesosyklissä
    // ja vanhemmissa streetlifting_16w-sessioissa jotka eivät vielä tunne loadPct:tä)
    const effectiveReps = targetReps + targetVx;
    if (isBarbell) {
      targetExternalLoad = roundToHalf(Math.max(0,
        (currentE1RMSystem / (1 + effectiveReps / 30)) * (1 + deltaPct)));
    } else {
      const targetSystemLoad = currentE1RMSystem / (1 + effectiveReps / 30);
      const rawExternal = targetSystemLoad * (1 + deltaPct) - bodyweightKg;
      targetExternalLoad = roundToHalf(Math.max(0, rawExternal));
    }
  } else {
    targetExternalLoad = null;
  }

  // Fallback: use slot's suggestedLoadKg when no e1RM history (e.g. new lift / start of program)
  if (targetExternalLoad === null && primarySlotMeta?.suggestedLoadKg !== undefined && primarySlotMeta.suggestedLoadKg !== null) {
    targetExternalLoad = primarySlotMeta.suggestedLoadKg;
    trace("SUGGESTED_LOAD_FALLBACK", {}, { targetExternalLoad },
      "Ei e1RM-dataa — käytetään ohjelman ehdotettu lähtökuorma");
  }

  // v4.27.13: NON-PRIMARY SLOT LOAD RESOLUTION
  //
  // Pre-v4.27.13-bug: UI renderöi backoff-slotin aina "primary × 0.85" (riippumatta
  // slotin omasta loadPct:stä), ja secondary-slotit (top singlet, etukyykky LA)
  // eivät koskaan lukeneet loadPct:tään — UI haki MovementProgress-historiasta.
  // Tämä romautti streetlifting_16w:n relative-loading-arkkitehtuurin: vk 7-16
  // "Top single @88-95%" ja LA:n etukyykky-progressio eivät ikinä toteutuneet
  // suunnitellusti.
  //
  // Ratkaisu: Engine resolvoi jokaisen loadPct-slotin kuorman:
  //   1. Sama liike kuin primary → johdetaan session-effective-e1RM primaryn
  //      (mahdollisesti rate-limitatusta) targetExternalLoad:sta. Näin
  //      primaryn rate-limit säteilee automaattisesti backoff/secondaryyn.
  //   2. Eri liike (loadPctReferenceMovementName asetettu, esim. etukyykky
  //      → Takakyykky) → haetaan referenssi-liikkeen e1RM sen omasta
  //      historiasta, ja sovelletaan erillinen rate-limit slotin oman
  //      liikkeen viim. sarjasta jos historiaa on.
  // Resolvoitu kuorma asetetaan slot.resolvedLoadKg:ksi; UI lukee sen.
  if (dayPlan?.slots) {
    const primaryHasLoadPct = primarySlotMeta?.loadPct !== undefined &&
                              primarySlotMeta?.loadPct !== null &&
                              primarySlotMeta.loadPct > 0;
    // v4.51.x loadpct-fix: sessionEffectiveE1RM on systeemi-pohjainen jotta
    // primary-rate-limit säteilee oikein backoff/secondary-sloteille post-fix-
    // loadPct-resolverissa (pct × system − BW non-barbellille, pct × system barbellille).
    const sessionEffectiveE1RM = (primaryHasLoadPct && targetExternalLoad !== null)
      ? (isBarbell
          ? targetExternalLoad / primarySlotMeta.loadPct
          : (targetExternalLoad + bodyweightKg) / primarySlotMeta.loadPct)
      : null;
    const primaryMovementName = primarySlotMeta?.defaultMovementName || null;

    // Haetaan liikeluettelo kerran (tarvitaan cross-reference-haaralle)
    let allMovsForResolve = null;
    const needsAllMovs = dayPlan.slots.some(s => s.loadPctReferenceMovementName);
    if (needsAllMovs) {
      allMovsForResolve = options.allMovements || await getAllMovements();
    }

    for (const slot of dayPlan.slots) {
      if (slot.role === "primary") continue;
      if (slot.loadPct === undefined || slot.loadPct === null || slot.loadPct <= 0) continue;

      // v4.34.15 FIX #2: CALIBRATION-SLOT RESOLVER + PR-CAP.
      // Cal-päivissä ei ole primary-slottia (kaikki role:"calibration"), joten Haara A ei laukea.
      // Cal-load = pct × currentE1RMExternal (jos sama liike) JA capattu PR × 1.025 (turva).
      // Fix #1 (e1RM-inflaatiocap) on jo rajoittanut currentE1RMExternalia, joten cal-load
      // on luonnollisesti turvarajoissa, mutta lisätään silti eksplisiittinen PR-cap defenseksi.
      if (slot.role === "calibration" &&
          !slot.loadPctReferenceMovementName &&
          slot.defaultMovementName) {
        // Etsi tämän liikkeen oma e1RM (ei välttämättä primaryMovementId)
        const calMovName = slot.defaultMovementName;
        const cfg = mesocycle?.streetliftingConfig?.calibration || {};
        const initialPR = calMovName === "Lisäpainoleuanveto" ? cfg.leukaExtKg
                        : calMovName === "Lisäpainodippi"     ? cfg.dippiExtKg
                        : calMovName === "Takakyykky"          ? cfg.kyykkyExtKg
                        : null;
        // Jos cal-liike == primary-liike (joka ohjaa currentE1RMExternalia), käytä sitä
        let calBaseE1RM = null;
        if (primaryMovementName === calMovName && currentE1RMExternal !== null) {
          calBaseE1RM = currentE1RMExternal;
        } else if (initialPR && initialPR > 0) {
          // Muuten käytä konfiguroitu PR (cal-liike voi olla eri kuin primary tällä päivällä)
          calBaseE1RM = initialPR;
        }
        if (calBaseE1RM !== null) {
          // v4.51.x loadpct-fix: cal-load lasketaan system-pohjaisesti non-barbellille
          // (pct × (BW + cal-1RM) − BW); barbell-sloteilla (Takakyykky) ennallaan.
          const slotIsBarbell = slot.isBarbell === true;
          let calLoad = slotIsBarbell
            ? calBaseE1RM * slot.loadPct
            : (calBaseE1RM + bodyweightKg) * slot.loadPct - bodyweightKg;
          // PR-cap: cal-load ei koskaan yli PR × 1.025 (max +2.5 kg uutta ennätystä testissä)
          let prCapped = false;
          if (initialPR && calLoad > initialPR * 1.025) {
            calLoad = initialPR * 1.025;
            prCapped = true;
          }
          slot.resolvedLoadKg = roundToHalf(Math.max(0, calLoad));
          trace("SLOT_LOAD_RESOLVED_CAL",
            { slotRole: slot.role, slotMovement: calMovName },
            { resolvedLoadKg: slot.resolvedLoadKg, pct: slot.loadPct,
              baseE1RM: calBaseE1RM.toFixed(1), PR: initialPR, prCapped, isBarbell: slotIsBarbell },
            `${calMovName} cal: ${(slot.loadPct*100).toFixed(0)}% × ${calBaseE1RM.toFixed(1)} kg = ${slot.resolvedLoadKg} kg${prCapped ? ` (PR-cap = ${initialPR}×1.025)` : ""}`);
          continue;
        }
      }

      // Haara A: slot jakaa primaryn liikkeen → käytä session-effective-e1RM
      if (!slot.loadPctReferenceMovementName &&
          sessionEffectiveE1RM !== null &&
          primaryMovementName &&
          slot.defaultMovementName === primaryMovementName) {
        // v4.51.x loadpct-fix: sessionEffectiveE1RM on system-pohjainen → pct × system − BW non-barbell.
        // β Round B-α-1: tier 1/2/3 → Lähde 1 -reitti (vRepsToExpectedPct(reps+Vx)).
        // Tier "special" tai fallback → vanha loadPct-kaava.
        const slotIsBarbellA = slot.isBarbell === true;
        const slotMovementA = primarySlotMeta?.defaultMovementName === slot.defaultMovementName
          ? primaryMovement
          : (slot.defaultMovementName ? allMovementsForTier.find(m => m.name === slot.defaultMovementName) : null);
        let slotTierA = null;
        if (slotMovementA && slotMovementA.tier !== undefined) {
          try { slotTierA = resolveTier(slotMovementA, mesocycle); }
          catch (e) { slotTierA = null; }
        }
        let slotPctForResolveA = slot.loadPct;
        let slotResolveSourceA = "loadPct";
        if (typeof slotTierA === "number" && (slotTierA === 1 || slotTierA === 2 || slotTierA === 3)) {
          const slotMaxReps = (slot.reps ?? 0) + (slot.targetVx ?? 0);
          const slotExpectedPct = vRepsToExpectedPct(slotMaxReps);
          if (slotExpectedPct !== null) {
            slotPctForResolveA = slotExpectedPct;
            slotResolveSourceA = "vRepsToExpectedPct";
          }
        }
        slot.resolvedLoadKg = roundToHalf(Math.max(0, slotIsBarbellA
          ? sessionEffectiveE1RM * slotPctForResolveA
          : sessionEffectiveE1RM * slotPctForResolveA - bodyweightKg));
        trace("SLOT_LOAD_RESOLVED",
          { slotRole: slot.role, slotMovement: slot.defaultMovementName },
          { resolvedLoadKg: slot.resolvedLoadKg, pct: slot.loadPct, pctForResolve: slotPctForResolveA, resolveSource: slotResolveSourceA, tier: slotTierA, sessionE1RM: sessionEffectiveE1RM.toFixed(1), isBarbell: slotIsBarbellA },
          `${slot.role} ${slot.defaultMovementName}: ${(slotPctForResolveA*100).toFixed(0)}% × ${slotIsBarbellA ? "ext" : "sys"} e1RM (${sessionEffectiveE1RM.toFixed(1)} kg)${slotIsBarbellA ? "" : " − BW"} = ${slot.resolvedLoadKg} kg [src: ${slotResolveSourceA}, tier: ${slotTierA ?? "fallback"}, primary-rate-limit säteilee]`);
        continue;
      }

      // Haara B: cross-reference (esim. etukyykky → takakyykky-e1RM)
      if (slot.loadPctReferenceMovementName && allMovsForResolve) {
        const refMov = allMovsForResolve.find(m => m.name === slot.loadPctReferenceMovementName);
        if (!refMov) continue;
        const refSets = allSets
          .filter(s => s.movementId === refMov.movementId &&
                       (s.setRole === "top" || s.setRole === "readiness_test"))
          .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
        if (refSets.length === 0) continue;
        const refIsBarbell = slot.isBarbell === true;
        const refRecent = refSets.slice(-6);
        const refVals = refRecent.map(s => {
          const vara = s.actualVx ?? s.targetVx ?? 1;
          if (refIsBarbell) return e1rmAccessory(s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
          return e1rmExternal(bodyweightKg, s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
        }).filter(v => v !== null);
        const refE1RM = refVals.length ? median(refVals) : null;
        if (refE1RM === null || refE1RM <= 0) continue;

        // v4.34.49: CFG-FLOOR cross-reference-haaralle.
        // Atletin palaute 2026-05-08: vk 1 LA Takakyykky 120 kg V4 helposti, mutta
        // vk 2 LA UI ehdotti 94 kg = 0.55 × 170 (historia-mediani). Atletin Asetuksissa
        // cfg.kyykkyExtKg = 185, mutta cross-reference-haara ohitti tämän kokonaan.
        // Ratkaisu: käytä max(historia-mediani, cfg-baseline) → atletin intentionaalinen
        // cfg-arvo toimii alarajana. Jos atletti suoriutuu yli cfg:n, historia voittaa.
        // Säilyttää konservatismin (cfg ei voi LASKEA kuormaa) mutta antaa cfg:n
        // intentionaalisen arvon vaikuttaa secondary-sloteihin (esim. LA Takakyykky).
        let effectiveBaseE1RM = refE1RM;
        const refCfgInfo = getCfgBaselineForMovement(mesocycle, {
          defaultMovementName: slot.loadPctReferenceMovementName,
        });
        if (refCfgInfo.value && refCfgInfo.value > refE1RM) {
          effectiveBaseE1RM = refCfgInfo.value;
          trace("CFG_FLOOR_APPLIED",
            { historyMedian: refE1RM.toFixed(1) },
            { cfgFloor: refCfgInfo.value, source: refCfgInfo.source, key: refCfgInfo.key,
              slotMovement: slot.defaultMovementName,
              referenceMovement: slot.loadPctReferenceMovementName },
            `Cfg-floor: ${slot.loadPctReferenceMovementName} cfg ${refCfgInfo.value} > historia ${refE1RM.toFixed(1)} → käytetään cfg-arvoa baselinena`);
        }
        // v4.51.x loadpct-fix (BW-ank cross-ref): pct × (BW + ref-1RM) − BW non-barbellille.
        // refIsBarbell=true (esim. Paused squat→Takakyykky) ennallaan (system == external).
        let baseLoad = roundToHalf(Math.max(0, refIsBarbell
          ? effectiveBaseE1RM * slot.loadPct
          : (effectiveBaseE1RM + bodyweightKg) * slot.loadPct - bodyweightKg));

        // Rate-limit slotin oman liikkeen historiasta
        // v4.27.14: käyttää computeRateLimitAnchor-helperiä (viim. 3 session
        // raskain median) sen sijaan että käytettäisiin yksittäistä viim. setriä.
        // Robustimpi deload/test-sessioille ja yksittäisille anomalioille.
        const selfMov = allMovsForResolve.find(m => m.name === slot.defaultMovementName);
        if (selfMov) {
          const selfSets = allSets
            .filter(s => s.movementId === selfMov.movementId && s.externalLoadKg > 0)
            .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
          const selfAnchor = computeRateLimitAnchor(selfSets);
          if (selfAnchor) {
            // v4.35.0 — Eliittitason progressio cross-reference-sloteille.
            //
            // Sama yhdistetty progression-päätös kuin primary-haarassa: regain ×
            // Helms-weekly + Vx-adj + plan-floor + hard-cap + regression-suoja
            // yhdellä kutsulla computeProgressionTargetiin. Vanhat ruleId:t
            // (PROGRESSION_RATE_LIMIT_CROSSREF, PROGRESSION_FLOOR_CAP_CROSSREF)
            // heijastetaan trace-kutsuina taaksepäin yhteensopivuudeksi.
            //
            // Cross-ref-spesifit erot primaryyn:
            //   - planBasedActive: false (PLAN_BASED_E1RM ei käsittele
            //     secondary-slotteja — niiden e1RM tulee selfAnchor-historiasta)
            //   - cfgBaseline: slot.defaultMovementName-liikkeen cfg jos
            //     konfiguroitu (yleensä null secondary-sloteille → ei
            //     regain-multiplieria)
            const planTargetCR = baseLoad;
            const cfgInfoCR = getCfgBaselineForMovement(mesocycle, {
              defaultMovementName: slot.defaultMovementName,
            });
            const progResultCR = computeProgressionTarget({
              lastSession: selfAnchor.lastSession,
              targetVx: slot.targetVx ?? 2,
              weekDef,
              dayType: dayPlan?.dayType ?? "heavy",
              cfgBaseline: cfgInfoCR.value || null,
              planTarget: planTargetCR,
              planBasedActive: false,
              dateISO,
            });

            if (progResultCR.targetLoad !== null) {
              const original = baseLoad;
              baseLoad = roundToHalf(progResultCR.targetLoad);
              const dt = progResultCR.decisionTrace;
              const ruleHits = dt.ruleHits;

              trace("PROGRESSION_TARGET_CROSSREF",
                { resolvedLoadKg: original },
                { resolvedLoadKg: baseLoad,
                  ruleHits,
                  regainRatio: dt.regainRatio,
                  regainMultiplier: dt.regainMultiplier,
                  weeksSinceLast: dt.weeksSinceLast,
                  weeklyProgressionPct: dt.weeklyProgressionPct,
                  vxAdjustmentPct: dt.vxAdjustmentPct,
                  autoregTarget: dt.autoregTarget,
                  planFloor: dt.planFloor,
                  hardCap: dt.hardCap,
                  anchorMedianLoad: selfAnchor.medianLoad,
                  anchorMedianVx: selfAnchor.medianVx,
                  lastLoad: selfAnchor.lastSession.medianLoad,
                  lastVx: selfAnchor.lastSession.medianVx,
                  fromSessions: selfAnchor.fromSessions,
                  slotMovement: slot.defaultMovementName,
                  referenceMovement: slot.loadPctReferenceMovementName },
                `${slot.defaultMovementName}: ${dt.rationale}`);

              // Taaksepäin yhteensopivuus: heijasta vanhat cross-ref-ruleId:t
              if (ruleHits.includes('PROGRESSION_HARD_CAP')) {
                trace("PROGRESSION_RATE_LIMIT_CROSSREF",
                  { resolvedLoadKg: original },
                  { resolvedLoadKg: baseLoad,
                    hardCap: dt.hardCap,
                    autoregTarget: dt.autoregTarget,
                    weeksSinceLast: dt.weeksSinceLast,
                    newVx: slot.targetVx ?? 2,
                    anchorLoad: selfAnchor.medianLoad,
                    anchorVx: selfAnchor.medianVx,
                    lastLoad: selfAnchor.lastSession.medianLoad,
                    lastVx: selfAnchor.lastSession.medianVx,
                    fromSessions: selfAnchor.fromSessions,
                    slotMovement: slot.defaultMovementName },
                  `${slot.defaultMovementName} rate-limit (hard-cap +${(PROGRESSION_CONFIG.HARD_CAP_PER_WEEK*100).toFixed(0)}%/vk × ${dt.weeksSinceLast}vk): ${original} → ${baseLoad} kg.`);
              }
              if (ruleHits.includes('PROGRESSION_FLOOR_CAP')) {
                const beforeFloor = roundToHalf(Math.max(dt.planFloor, dt.autoregTarget));
                trace("PROGRESSION_FLOOR_CAP_CROSSREF",
                  { resolvedLoadKg: beforeFloor },
                  { resolvedLoadKg: baseLoad,
                    lastLoad: selfAnchor.lastSession.medianLoad,
                    lastVx: selfAnchor.lastSession.medianVx,
                    newVx: slot.targetVx ?? 2,
                    floor: selfAnchor.lastSession.medianLoad,
                    slotMovement: slot.defaultMovementName,
                    referenceMovement: slot.loadPctReferenceMovementName },
                  `${slot.defaultMovementName} floor-cap: ${beforeFloor} → ${baseLoad} kg (regression-suoja: viim. sessio ${selfAnchor.lastSession.medianLoad.toFixed(1)} kg @V${selfAnchor.lastSession.medianVx.toFixed(1)} meni targetin Vx:llä — uutta sessiota ei pudoteta tämän alle).`);
              }
            }
          }
        }

        slot.resolvedLoadKg = baseLoad;
        trace("SLOT_LOAD_RESOLVED_CROSSREF",
          { slotRole: slot.role, slotMovement: slot.defaultMovementName,
            referenceMovement: slot.loadPctReferenceMovementName },
          { resolvedLoadKg: slot.resolvedLoadKg, pct: slot.loadPct, refE1RM: refE1RM.toFixed(1) },
          `${slot.defaultMovementName}: ${(slot.loadPct*100).toFixed(0)}% × ${slot.loadPctReferenceMovementName}-e1RM (${refE1RM.toFixed(1)} kg) = ${slot.resolvedLoadKg} kg`);
      }
    }
  }

  trace("TARGET_LOAD", {}, {
    targetExternalLoad,
    deltaPct: (deltaPct * 100).toFixed(2) + "%",
    targetReps,
    targetVx,
    isBarbell,
  }, `Ehdotettu kuorma: +${targetExternalLoad} kg`);

  // v4.34.2: Sanity diagnostic — primary-kuorman pitäisi tyypillisesti olla
  // korkeintaan ~1.6× seed-arvo (loadPct × kalibrointi). Jos enemmän, jokin
  // e1RM-ketjussa on pielessä: Vx-bias ylöspäin, väärä movement match,
  // bodyweight-asetus pielessä, calibration manuaalisesti väärin syötetty.
  // Käyttäjäpalaute v4.34.1 (TO-treeni): dippi 4×6 × 125 kg ehdotuksena vaikka
  // calibration D=80 kg → odotettu @68.6% = 55 kg. Ei pystytty toistaa
  // tyhjästä DB:stä, joten lisätty tämä diagnostic tunnistamaan tilanne kun
  // se toistuu. Älä silmukoi tästä ulos — tämä on informational only,
  // varsinainen kuorma palautetaan käyttäjälle muuttumattomana.
  if (targetExternalLoad !== null && primarySlotMeta?.suggestedLoadKg) {
    const seed = primarySlotMeta.suggestedLoadKg;
    const ratio = seed > 0 ? targetExternalLoad / seed : null;
    if (ratio !== null && ratio > 1.6) {
      trace("LOAD_SANITY_WARNING", {},
        { targetExternalLoad, seed, ratio: ratio.toFixed(2),
          currentE1RMExternal: currentE1RMExternal?.toFixed(1),
          primaryMovementName: primarySlotMeta.defaultMovementName,
          recentTopSetsCount: recentTopSets.length,
          e1rmSource },
        `⚠ Primary-kuorma ${targetExternalLoad} kg on ${ratio.toFixed(1)}× seed-arvo (${seed} kg) — tarkista e1RM-historia ja kalibrointi (movement: ${primarySlotMeta.defaultMovementName})`);
      if (typeof console !== "undefined" && console.warn) {
        console.warn(`[LeVe AI sanity] ${primarySlotMeta.defaultMovementName}: target ${targetExternalLoad} kg, seed ${seed} kg, ratio ${ratio.toFixed(2)}, e1RM_ext ${currentE1RMExternal?.toFixed(1) ?? "null"} kg, source ${e1rmSource}, top-sets ${recentTopSets.length} — investigate e1RM chain`);
      }
    }
  }

  // 12. Set prescription
  let setCount;
  const recipe = DAY_TYPE_SET_RECIPES[dayType];
  if (recipe) {
    setCount = Array.isArray(recipe.sets) ? recipe.sets[0] : recipe.sets;
  } else {
    setCount = 3;
  }

  // 13. Vara feedback
  const varaFB = varaFeedback(recentTopSets);
  if (varaFB.suggestion) {
    trace("VARA_FEEDBACK", {}, { suggestion: varaFB.suggestion, type: varaFB.type }, varaFB.suggestion);
  }

  // 14. Accessory cap (independent from primary)
  let accessoryCapActive = false;
  if (capLevel === 2) {
    // Check if ALL 3 channels are RED/YELLOW
    const channels = readiness.channels || {};
    const allBad = [channels.velocity, channels.hrv, channels.vara]
      .filter((c) => c && c.class)
      .every((c) => c.class === "RED" || c.class === "YELLOW");
    if (allBad) {
      accessoryCapActive = true;
      trace("ACCESSORY_CAP_ACTIVE", {}, { volumeReduction: "30%" }, "3/3 kanavaa RED/YELLOW → tukiliikkeet -30% volyymi");
    }
  }

  // 15. Ensure dayPlan always has slots (fallback if mesocycle plan didn't match)
  if (!dayPlan || !dayPlan.slots || dayPlan.slots.length === 0) {
    dayPlan = generateDefaultDayPlan(dayType, weekDef, accessoryCapActive);
    trace("DAY_PLAN_GENERATED", {}, { dayType, slotsCount: dayPlan.slots.length },
      "Päivän ohjelma generoitu oletusliikkeillä");
  }

  // v4.49.2 QF-1: Injektoi ENGINE_DEFAULT_WARMUP_RAMP primary-slot:eihin, joilla
  // warmupSets puuttuu. Default-meso ja muut presetit, jotka eivät määrittele
  // omaa skeletoniä, saavat tämän Helms 2017 -rampin (40/55/70/85 %). UI:n
  // hardcoded fallback ([0.30,0.55,0.75,0.90]) jää käyttöön vain jos tämä
  // injektio jostain syystä epäonnistuu.
  if (dayPlan?.slots) {
    dayPlan = {
      ...dayPlan,
      slots: dayPlan.slots.map((s) => {
        if (s.role !== "primary") return s;
        if (Array.isArray(s.warmupSets) && s.warmupSets.length > 0) return s;
        return { ...s, warmupSets: ENGINE_DEFAULT_WARMUP_RAMP.map((w) => ({ ...w })) };
      }),
    };
  }

  // v4.49.2 QF-5 + Q1: Emit VL_CAP_RESOLVED + SLOT_TARGETVx_RESOLVED -traces tässä
  // kohtaa kun dayPlan on varmasti olemassa (myös fallback-generaattorin jälkeen).
  // VL_CAP_RESOLVED: cap%, source, targetRir auditoitavaksi.
  // SLOT_TARGETVx_RESOLVED: hybridi-päätös slot.targetVx vs block-default-RIR,
  // grindy-bias-detection mukana.
  const primarySlotForTraces = dayPlan?.slots?.find(s => s.role === "primary");
  if (primarySlotForTraces) {
    vlCapForContext({
      blockPhase: inferredBlockPhase,
      exerciseName: primarySlotForTraces?.defaultMovementName,
      dayType,
      targetVx: primarySlotForTraces?.targetVx ?? null,
      settings,
      emitTrace: (entry) => {
        traces.push({ traceId: uid(), recId: null, ruleId: entry.ruleId, before: { ...entry.before }, after: { ...entry.after }, why: entry.why });
      },
    });

    if (typeof primarySlotForTraces.targetVx === "number") {
      const grindyBiasInfo = detectGrindyBias(sessions);
      const rep1Range = targetRep1VelocityRange(
        primarySlotForTraces.defaultMovementName,
        inferredBlockPhase,
        null,
        primarySlotForTraces.targetVx,
        grindyBiasInfo.detected,
      );
      trace("SLOT_TARGETVx_RESOLVED",
        { slotTargetVx: primarySlotForTraces.targetVx, blockPhase: inferredBlockPhase, blockDefaultRir: rep1Range.blockDefaultRir },
        {
          targetRir: rep1Range.targetRir,
          targetRirSource: rep1Range.targetRirSource,
          biasDetected: grindyBiasInfo.detected,
          biasSignificantCount: grindyBiasInfo.count,
          biasSessionsConsidered: grindyBiasInfo.sessionsConsidered,
        },
        `Primary slot.targetVx=${primarySlotForTraces.targetVx} → rep1Range target-RIR=${rep1Range.targetRir} (lähde: ${rep1Range.targetRirSource}${grindyBiasInfo.detected ? `, bias ${grindyBiasInfo.count}/${grindyBiasInfo.sessionsConsidered}` : ""})`);
    }
  }

  // Apply accessory cap: reduce accessory set counts by 30% if active
  if (accessoryCapActive && dayPlan && dayPlan.slots) {
    dayPlan = { ...dayPlan, slots: dayPlan.slots.map(s => {
      if (s.role === "accessory") {
        return { ...s, sets: Math.max(2, Math.round(s.sets * 0.7)) };
      }
      return s;
    })};
  }

  // v4.25 P1-10: Block-based accessory volume scaling.
  // Vain streetlifting_16w. Skaalaa accessory-sarjojen määrää alaspäin
  // myöhemmissä blokeissa (hypertrofia → voima → intensifikaatio → realization).
  // Ei vaikuta primary/secondary/backoff-sarjoihin — vain accessory.
  if (mesocycle.type === "streetlifting_16w" && dayPlan && dayPlan.slots) {
    const blockScalar = getAccessoryBlockScalar(weekNum);
    if (blockScalar < 1.0) {
      const blockNum = getBlockForWeek(weekNum);
      dayPlan = { ...dayPlan, slots: dayPlan.slots.map(s => {
        if (s.role === "accessory" && s.sets > 1) {
          const scaledSets = Math.max(1, Math.round(s.sets * blockScalar));
          return { ...s, sets: scaledSets, _blockScaled: true };
        }
        return s;
      })};
      trace("ACCESSORY_BLOCK_SCALAR", {}, { block: blockNum, scalar: blockScalar, weekNum },
        `Blokki ${blockNum} (vk ${weekNum}) → accessory-volyymi × ${blockScalar} (Issurin 2010)`);
    }
  }

  // v4.25 P1-9: MU load autoregulation.
  // Jos primary-slot on Muscle-up (tai slot.muAutoRegulate=true), säädä
  // suggestedLoadKg edellisen MU-session Vx-havaintojen perusteella.
  // Vaikuttaa vain MU-slotteihin joilla on muAutoRegulate=true (laDay:ssa
  // asetettu skillwork-polulle false, kuormitetuille true).
  if (dayPlan && dayPlan.slots) {
    const muSlot = dayPlan.slots.find(s =>
      s.muAutoRegulate === true &&
      (s.defaultMovementName === "Muscle-up" || s.defaultMovementName === "Muscle up")
    );
    if (muSlot && typeof muSlot.suggestedLoadKg === "number") {
      // Hae viim. MU-setit
      const allMovs = options.allMovements || await getAllMovements();
      const muMov = allMovs.find(m => m.name === "Muscle-up" || m.name === "Muscle up");
      if (muMov) {
        const muSets = allSets
          .filter(s => s.movementId === muMov.movementId && (s.setRole === "top" || !s.setRole))
          .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
          .slice(-6);
        const adj = adjustMULoad(muSets);
        if (adj.suggestedDeltaKg !== 0) {
          const newKg = Math.max(0, muSlot.suggestedLoadKg + adj.suggestedDeltaKg);
          dayPlan = { ...dayPlan, slots: dayPlan.slots.map(s =>
            s === muSlot ? { ...s, suggestedLoadKg: newKg, _muAdjusted: adj } : s
          )};
          trace("MU_AUTO_REGULATE", { loadKg: muSlot.suggestedLoadKg },
            { loadKg: newKg, reason: adj.reason, avgVx: adj.avgVx?.toFixed(1) },
            `MU kuorma ${adj.suggestedDeltaKg > 0 ? "+" : ""}${adj.suggestedDeltaKg} kg (${adj.reason}, edell. Vx ka. ${adj.avgVx?.toFixed(1) ?? "–"})`);
        }
      }
    }
  }

  // 15b. Resolve accessory slots (slotId → phase-appropriate movement, honoring overrides + stagnation)
  if (dayPlan && dayPlan.slots && dayPlan.slots.some(s => s.slotId)) {
    const allMovements = options.allMovements || (await getAllMovements());
    const movementsByName = {};
    for (const m of allMovements) movementsByName[m.name] = m;
    const progressByMovementId = {};
    for (const m of allMovements) {
      const p = await getMovementProgress(m.movementId);
      if (p) progressByMovementId[m.movementId] = p;
    }
    dayPlan = resolveDayPlanSlots(dayPlan, {
      mesocycle, weekNum, movementsByName, progressByMovementId,
    });
    const swaps = dayPlan.slots.filter(s => s._resolvedFrom?.source === "stagnation-swap");
    if (swaps.length) {
      trace("ACCESSORY_SWAP_AUTO", {},
        { count: swaps.length, slots: swaps.map(s => s._resolvedFrom.slotId) },
        `Automaattinen tukiliikevaihto stagnaation perusteella (${swaps.length} liikettä)`);
    }
  }

  // 16. Enrich dayPlan with variant names (if not already assigned from mesocycle)
  if (dayPlan && dayPlan.slots) {
    const variantMap = VARIANT_DAY_TYPE_MAP[dayType] || VARIANT_DAY_TYPE_MAP.heavy;
    for (const slot of dayPlan.slots) {
      if ((slot.role === "primary" || slot.role === "backoff") && slot.category === "vertikaaliveto" && !slot.variantName) {
        slot.variantName = variantMap[0]; // Default variant for this day type
      }
    }
    // Trace if variant assigned
    const primarySlot = dayPlan.slots.find(s => s.role === "primary" && s.variantName);
    if (primarySlot?.variantName) {
      trace("VARIANT_ASSIGNED", {}, { variant: primarySlot.variantName, dayType },
        `Variaatio: ${primarySlot.variantName}`);
    }
  }

  // Build recommendation
  // v4.34.27: VBT-status promote/candidate näkyväksi UI:lle (Edistyminen-välilehti).
  // v4.34.33 BUG-FIX 5.4: lisätty deferred-status — VBT olisi ollut promoted mutta
  // PLAN_BASED voitti. Käyttäjä näkee nyt että velocity-data on jo riittävä mutta
  // suunnitelma-uskollisuus on aktiivinen.
  const vbtPromotedTrace = traces.find(t => t.ruleId === "VBT_PRIMARY_USED");
  const vbtDeferredTrace = traces.find(t => t.ruleId === "VBT_DEFERRED_TO_PLAN");
  const vbtCandidateTrace = traces.find(t => t.ruleId === "VBT_CANDIDATE");
  const vbtSummary = vbtPromotedTrace
    ? { status: "promoted", anchorCount: vbtPromotedTrace.after.anchorCount, diffPct: vbtPromotedTrace.after.diffPct, source: "velocity" }
    : vbtDeferredTrace
    ? { status: "deferred", anchorCount: vbtDeferredTrace.after.anchorCount, diffPct: vbtDeferredTrace.after.diffPct, source: "plan-based" }
    : vbtCandidateTrace
    ? { status: "candidate", anchorCount: vbtCandidateTrace.after.anchorCount, diffPct: vbtCandidateTrace.after.diffPct, source: "vx" }
    : { status: "not-eligible", anchorCount: 0, diffPct: null, source: "vx" };

  // v4.49.2 DEEP-2: RTF-model status rec-output:iin. UI näyttää atletille milloin
  // RTF-malli on luotettava (Vx-targetting voi luottaa slot.targetVx:ään, ei
  // konservatiivista safety-net:iä). Sama enum kuin computeRtfVelocityModel.status:
  //   reliable    — r²≥0.85, n≥6, voidaan luottaa slot.targetVx:ään
  //   preview     — r²≥0.70, "rakentuu" -tila
  //   unreliable  — r²<0.70, mallia ei voida käyttää
  //   insufficient — n<3 sarjaa, malli ei vielä laskettavissa
  //   no-data     — primaryMovementId puuttuu tai ei sarjoja
  let rtfModelStatus = "no-data";
  let rtfModelStats = null;
  if (primaryMovementId) {
    try {
      const rtfModel = computeRtfVelocityModel(allSets, primaryMovementId);
      if (rtfModel && rtfModel.status) {
        rtfModelStatus = rtfModel.status;
        rtfModelStats = {
          n: rtfModel.n ?? null,
          sessionsCount: rtfModel.sessionsCount ?? null,
          r2: rtfModel.r2 ?? null,
          slope: rtfModel.slope ?? null,
          intercept: rtfModel.intercept ?? null,
          minR2Reliable: rtfModel.minR2Reliable ?? null,
          minR2Preview: rtfModel.minR2Preview ?? null,
        };
      }
    } catch (_e) {
      // computeRtfVelocityModel ei saa kaataa recommendia — säilytetään "no-data"
    }
  }
  trace("RTF_MODEL_STATUS",
    { primaryMovementId: primaryMovementId ?? null },
    { status: rtfModelStatus, n: rtfModelStats?.n ?? null, r2: rtfModelStats?.r2 ?? null },
    `RTF-malli ${rtfModelStatus}${rtfModelStats?.n != null ? ` (n=${rtfModelStats.n}, r²=${rtfModelStats.r2?.toFixed(2) ?? "-"})` : ""}`);

  // v4.50.0 (Track B 2D-δ): Adaptive multi-suggestion. Generate SAFE / TARGET /
  // AGGRESSIVE tier-variantit nykyisestä TARGET-laskennasta. Backward compat:
  // rec.targetExternalLoad / targetVx / deltaPct säilyvät TARGET-arvoina.
  let suggestionsResult;
  try {
    const grindyBiasForSuggestions = detectGrindyBias(sessions);
    const hadFailureForSuggestions = hadFailureLastSession(recentTopSets);
    suggestionsResult = generateSuggestions({
      targetExternalLoad,
      targetVx,
      deltaPct,
      targetReps,
      setCount,
      capLevel,
      hadFailure: hadFailureForSuggestions,
      grindyBiasDetected: grindyBiasForSuggestions.detected,
      rtfModelStatus,
      blockPhase: inferredBlockPhase,
      dayType,
      preferredBias: settings.preferredSuggestionBias ?? "balanced",
      aggressivenessLearned: settings.aggressivenessLearned ?? 0,
    });
    trace("SUGGESTIONS_GENERATED",
      { tierCount: suggestionsResult.suggestions.length, defaultId: suggestionsResult.defaultSuggestionId },
      {
        tiers: suggestionsResult.suggestions.map(s => ({
          id: s.id,
          load: s.targetExternalLoad,
          vx: s.targetVx,
          deltaPct: typeof s.deltaPct === "number" ? Number(s.deltaPct.toFixed(4)) : null,
        })),
        defaultSuggestionId: suggestionsResult.defaultSuggestionId,
        aggressiveAvailable: suggestionsResult.aggressiveAvailable,
      },
      `${suggestionsResult.suggestions.length} ehdotusta generoitu, default=${suggestionsResult.defaultSuggestionId}`);
    if (suggestionsResult.suppressedReasons.length > 0) {
      trace("SUGGESTION_SUPPRESSED",
        { tier: "aggressive" },
        { reasons: suggestionsResult.suppressedReasons },
        `Rohkea-ehdotus piilotettu: ${suggestionsResult.suppressedReasons.join(", ")}`);
    }
  } catch (_e) {
    // Fallback: jos generaatio epäonnistuu, palautetaan vain TARGET — pidetään
    // backward compat. Tämä on safety-net, ei normaali polku.
    suggestionsResult = {
      suggestions: [{
        id: "target",
        label: "Tavoite",
        deltaPct: typeof deltaPct === "number" ? deltaPct : 0,
        targetVx,
        targetExternalLoad,
        setCount,
        targetReps,
        rationaleShort: "Engine-suositus",
      }],
      defaultSuggestionId: "target",
      suppressedReasons: [],
      aggressiveAvailable: false,
    };
  }

  const rec = {
    recId: uid(),
    dateISO,
    mesocycleId: mesocycle.mesocycleId,
    mesocycleType: mesocycle.type || "default",
    weekNum,
    weekLabel: weekDef?.label || "?",
    dayType,
    targetExternalLoad,
    targetReps,
    targetVx,
    setCount,
    deltaPct,
    capLevel,
    readiness,
    e1rmSystem: currentE1RMSystem,
    e1rmExternal: currentE1RMExternal,
    bodyweightKg,
    varaFeedback: varaFB,
    breakInfo: breakInfo.breakDays >= 7 ? breakInfo : null,
    accessoryCapActive,
    dayPlan,
    vbtStatus: vbtSummary,
    // v4.49.2 DEEP-2: RTF-model status UI:n näytettäväksi "Miksi tämä paino?"-näkymässä.
    rtfModelStatus,
    rtfModelStats,
    // v4.50.0 (Track B 2D-δ): adaptive multi-suggestion -kentät. Atletti
    // valitsee UI:ssa, valinta tallennetaan session-recordiin erikseen.
    // rec.targetExternalLoad / targetVx / deltaPct (yllä) ovat TARGET-tier:n
    // arvoja backward compat -syistä — kaikki olemassa olevat lukijat toimivat
    // muuttumatta.
    suggestions: suggestionsResult.suggestions,
    defaultSuggestionId: suggestionsResult.defaultSuggestionId,
    suggestionContext: {
      rtfModelStatus,
      capLevel,
      grindyBiasDetected: detectGrindyBias(sessions).detected,
      aggressiveSuppressedReasons: suggestionsResult.suppressedReasons,
      preferredBias: settings.preferredSuggestionBias ?? "balanced",
      aggressivenessLearned: settings.aggressivenessLearned ?? 0,
      effectiveBias: typeof suggestionsResult.effectiveBias === "number"
        ? suggestionsResult.effectiveBias : 0,
    },
    // v4.34.43: cfg-drift result. UI persistoi mesocycleen jos driftPct > 0.
    cfgDriftApplied: cfgDriftResult,
    traces,
  };

  // Assign recId to all traces
  for (const t of traces) t.recId = rec.recId;

  // Save if not dry run
  if (!options.dryRun) {
    await saveRecommendation({
      recId: rec.recId,
      sessionId: null,
      variantId: null,
      targetSetRole: "top",
      targetLoadKg: targetExternalLoad,
      deltaPct,
      capLevel,
      mesocycleWeek: weekNum,
      dayType,
      targetReps,
      targetVx,
      createdAtISO: new Date().toISOString(),
    });
    for (const t of traces) {
      await saveDecisionTrace(t);
    }
  }

  return rec;
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY STIMULUS TRACKER
// ═══════════════════════════════════════════════════════════════

function weeklyStimulus(sets, movements) {
  const movementMap = new Map(movements.map((m) => [m.movementId, m]));

  let pullVolumeSets = 0;
  let pullVolumeTonnage = 0;
  let heavyExposures = 0;
  let totalTonnageExternal = 0;
  let totalTonnageSystem = 0;
  const byCategory = {};

  for (const s of sets) {
    const mov = movementMap.get(s.movementId);
    const category = mov?.category || "muu";
    const loadKg = s.externalLoadKg || 0;
    const reps = s.reps || 0;
    const tonnage = loadKg * reps;

    totalTonnageExternal += tonnage;

    if (PULL_VOLUME_CATEGORIES.has(category)) {
      pullVolumeSets++;
      pullVolumeTonnage += tonnage;
    }

    const effectiveReps = reps + (s.actualVx ?? s.targetVx ?? 1);
    if (effectiveReps <= 4) heavyExposures++;

    if (!byCategory[category]) byCategory[category] = { sets: 0, tonnage: 0 };
    byCategory[category].sets++;
    byCategory[category].tonnage += tonnage;
  }

  return {
    pullVolumeSets,
    pullVolumeTonnage,
    heavyExposures,
    totalTonnageExternal,
    byCategory,
  };
}

// ═══════════════════════════════════════════════════════════════
// STAGNATION DETECTION
// ═══════════════════════════════════════════════════════════════

function checkStagnation(progress) {
  if (!progress || progress.stagnationWeeks < 3) {
    return { stagnated: false, severity: null, message: null };
  }
  if (progress.stagnationWeeks >= 6) {
    return {
      stagnated: true,
      severity: "orange",
      message: `${progress.stagnationWeeks} viikkoa ilman edistystä — suosittelemme liikkeen vaihtoa`,
    };
  }
  return {
    stagnated: true,
    severity: "yellow",
    message: `${progress.stagnationWeeks} viikkoa ilman edistystä — harkitse liikkeen vaihtoa`,
  };
}

// ═══════════════════════════════════════════════════════════════
// ACCESSORY SLOT RESOLUTION (v4.11)
// Each accessory slot has a function (role) + phase variants. Engine resolves
// movement at render time: priority 1) user lock, 2) user soft-override,
// 3) stagnation-advanced variant, 4) phase default (variant index 0).
// ═══════════════════════════════════════════════════════════════

function phaseForWeek(weekNum) {
  if (weekNum <= 4)  return "foundation";
  if (weekNum <= 8)  return "strength";
  if (weekNum <= 12) return "intensity";
  return "peaking";
}

/**
 * Resolve an accessory slot into a concrete movement + rep scheme.
 *
 * @param {object} slot — slot object from weekPlan.days[].slots[]. Must have slotId to be resolvable.
 * @param {object} ctx — { mesocycle, weekNum, movementsByName, progressByMovementId }
 * @returns {object} { movementName, sets, reps, targetVx, note, source, variantIndex, slotFunction }
 *   source: "legacy" | "user-locked" | "user-override" | "stagnation-swap" | "phase-default" | "fallback"
 */
function resolveAccessorySlot(slot, ctx = {}) {
  const { mesocycle, weekNum, movementsByName, progressByMovementId } = ctx;

  // Legacy slot without slotId — fall through untouched
  if (!slot?.slotId) {
    return {
      movementName: slot.defaultMovementName,
      sets: slot.sets, reps: slot.reps, targetVx: slot.targetVx,
      note: slot.note,
      source: "legacy",
      variantIndex: null,
      slotFunction: null,
    };
  }

  const catalog = ACCESSORY_SLOT_CATALOG?.[slot.slotId];
  if (!catalog) {
    return {
      movementName: slot.defaultMovementName,
      sets: slot.sets, reps: slot.reps, targetVx: slot.targetVx,
      note: slot.note,
      source: "fallback",
      variantIndex: null,
      slotFunction: null,
    };
  }

  const phase = phaseForWeek(weekNum || 1);
  const variants = catalog.phaseVariants?.[phase] || [];
  const phaseRep = catalog.repScheme?.[phase] || null;

  // Phase may have no variants (e.g. knee-unilateral during peaking) → drop slot
  if (!variants.length) {
    return { movementName: null, sets: 0, reps: 0, targetVx: null,
             source: "dropped-for-phase", variantIndex: null, slotFunction: catalog.function };
  }

  const overrides = mesocycle?.accessorySlotOverrides || {};
  const ov = overrides[slot.slotId];

  // Honor hard lock absolutely
  if (ov?.locked && ov.movementName) {
    return {
      movementName: ov.movementName,
      sets:    phaseRep?.sets    ?? slot.sets,
      reps:    phaseRep?.reps    ?? slot.reps,
      targetVx: phaseRep?.targetVx ?? slot.targetVx,
      note: ov.reason || phaseRep?.note || slot.note,
      source: "user-locked",
      variantIndex: variants.indexOf(ov.movementName),
      slotFunction: catalog.function,
    };
  }

  // Determine variant index: user-picked, stagnation-advanced, or 0
  let idx = 0;
  let source = "phase-default";
  let reason = null;

  if (Number.isInteger(ov?.variantIndex)) {
    idx = Math.max(0, Math.min(variants.length - 1, ov.variantIndex));
    source = "user-override";
    reason = ov.reason || null;
  } else if (ov?.movementName && variants.includes(ov.movementName)) {
    idx = variants.indexOf(ov.movementName);
    source = "user-override";
    reason = ov.reason || null;
  } else {
    // Auto: stagnation on default variant → advance
    const defaultMov = movementsByName?.[variants[0]];
    if (defaultMov && progressByMovementId) {
      const prog = progressByMovementId[defaultMov.movementId];
      if (prog && prog.stagnationWeeks >= 3 && variants.length > 1) {
        idx = 1;
        source = "stagnation-swap";
        reason = `Stagnaatio ${prog.stagnationWeeks} vk — vaihto variantin 2 liikkeeseen`;
      }
    }
  }

  return {
    movementName: variants[idx],
    sets:    phaseRep?.sets    ?? slot.sets    ?? 3,
    reps:    phaseRep?.reps    ?? slot.reps    ?? 8,
    targetVx: phaseRep?.targetVx ?? slot.targetVx ?? null,
    // v4.34.16: phaseRep.loadPct välitetään resolvoituun slottiin → loadPct-resolver
    // applioi sessionEffectiveE1RM × loadPct (Branch A) jos slot.defaultMovementName === primary.
    loadPct: phaseRep?.loadPct ?? slot.loadPct ?? null,
    note: phaseRep?.note || slot.note || reason,
    source,
    variantIndex: idx,
    slotFunction: catalog.function,
    availableVariants: variants,
    reason,
  };
}

/**
 * Resolve all accessory slots in a dayPlan; return new dayPlan with resolved slots.
 * Drops slots whose phase has no variants (e.g. unilateral during peaking).
 * Preserves primary/backoff/secondary slots as-is (they never have slotId).
 */
function resolveDayPlanSlots(dayPlan, ctx) {
  if (!dayPlan?.slots) return dayPlan;
  const resolvedSlots = [];
  for (const slot of dayPlan.slots) {
    if (!slot.slotId) { resolvedSlots.push(slot); continue; }
    const r = resolveAccessorySlot(slot, ctx);
    if (r.source === "dropped-for-phase" || !r.movementName) continue;
    resolvedSlots.push({
      ...slot,
      defaultMovementName: r.movementName,
      sets: r.sets,
      reps: r.reps,
      targetVx: r.targetVx,
      // v4.34.16: kopio loadPct resolvoituun slottiin (jos phaseRep määritteli)
      ...(r.loadPct !== null && r.loadPct !== undefined ? { loadPct: r.loadPct } : {}),
      note: r.note || slot.note,
      _resolvedFrom: { slotId: slot.slotId, source: r.source, variantIndex: r.variantIndex,
                      availableVariants: r.availableVariants, slotFunction: r.slotFunction },
    });
  }
  return { ...dayPlan, slots: resolvedSlots };
}

/**
 * Compute stagnation-driven swap suggestions for the whole mesocycle.
 * Returns list of { slotId, currentMovement, suggestedMovement, reason }.
 * Used for decision-trace logging + surfacing suggestions to the user.
 */
function suggestAccessorySwaps(mesocycle, weekNum, movementsByName, progressByMovementId) {
  const suggestions = [];
  const phase = phaseForWeek(weekNum || 1);
  const overrides = mesocycle?.accessorySlotOverrides || {};

  for (const [slotId, catalog] of Object.entries(ACCESSORY_SLOT_CATALOG)) {
    if (overrides[slotId]?.locked) continue; // respect lock
    const variants = catalog.phaseVariants?.[phase] || [];
    if (variants.length < 2) continue;
    const currentIdx = overrides[slotId]?.variantIndex ?? 0;
    const currentName = variants[Math.min(currentIdx, variants.length - 1)];
    const mov = movementsByName?.[currentName];
    const prog = mov ? progressByMovementId?.[mov.movementId] : null;
    if (prog && prog.stagnationWeeks >= 3 && currentIdx < variants.length - 1) {
      suggestions.push({
        slotId,
        slotFunction: catalog.function,
        currentMovement: currentName,
        suggestedMovement: variants[currentIdx + 1],
        stagnationWeeks: prog.stagnationWeeks,
        reason: `${prog.stagnationWeeks} vk stagnaatio — vaihto seuraavaan varianttiin`,
      });
    }
  }
  return suggestions;
}

// ═══════════════════════════════════════════════════════════════
// READINESS TEST LOAD (skaalautuva)
// ═══════════════════════════════════════════════════════════════

/**
 * Laskee readiness-velocity-testin kuorman e1RM:n perusteella.
 * ~60% e1RM:stä, pyöristettynä lähimpään 2.5 kg. Min 20, max 80.
 * @param {number|null} e1rmExternal — urheilijan e1RM lisäpaino (kg)
 * @returns {number} readiness-testikuorma (kg)
 */
function readinessTestLoad(e1rmExternal) {
  if (e1rmExternal === null || e1rmExternal === undefined || e1rmExternal <= 0) return 40;
  const raw = e1rmExternal * 0.6;
  const rounded = Math.round(raw / 2.5) * 2.5;
  return clamp(rounded, 20, 80);
}

// ═══════════════════════════════════════════════════════════════
// SPEED DAY LOAD
// ═══════════════════════════════════════════════════════════════

function speedDayLoad(e1rmExternal, bodyweightKg) {
  // Speed day: ~55-60% of 1RM, max intent
  if (e1rmExternal === null) return null;
  const pct = 0.575; // midpoint of 55-60%
  const systemE1RM = e1rmExternal + bodyweightKg;
  const targetSystem = systemE1RM * pct;
  return roundToHalf(Math.max(0, targetSystem - bodyweightKg));
}

// ═══════════════════════════════════════════════════════════════
// OURA HRV CONVERSION
// ═══════════════════════════════════════════════════════════════

function ouraHRVtoLnRMSSD(hrvMs) {
  if (hrvMs === null || hrvMs === undefined || hrvMs <= 0) return null;
  return Math.log(hrvMs);
}

// ═══════════════════════════════════════════════════════════════
// ADAPTIVE VOLUME OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze a completed session and compute adaptive adjustments
 * for future workouts. If the user did extra sets/exercises or
 * skipped some, the engine learns and adjusts.
 */
function analyzeSessionAdaptation(sessionExercises, dayPlanSlots) {
  const adjustments = [];

  // 1. Check per-slot: did the user do more or fewer sets than planned?
  //    Use originalCategory if available (survives mid-workout swaps)
  for (const slot of dayPlanSlots) {
    const matchedExercises = sessionExercises.filter(
      (ex) => (ex.originalCategory || ex.category) === slot.category && ex.role === slot.role
    );

    if (matchedExercises.length === 0) continue;

    for (const ex of matchedExercises) {
      const completedSets = ex.sets.filter((s) => s.completed && !s.isWarmup).length;
      const plannedSets = slot.sets;
      const delta = completedSets - plannedSets;

      if (delta >= 2) {
        // User consistently does more → suggest increasing volume
        adjustments.push({
          category: slot.category,
          role: slot.role,
          movementName: ex.name,
          type: "volume_up",
          delta,
          suggestedSets: Math.min(plannedSets + 1, 6),
          reason: `${ex.name}: ${completedSets} sarjaa tehty (suunniteltu ${plannedSets}) → +1 sarja`,
        });
      } else if (delta <= -1 && completedSets > 0) {
        // User did fewer → reduce volume next time
        adjustments.push({
          category: slot.category,
          role: slot.role,
          movementName: ex.name,
          type: "volume_down",
          delta,
          suggestedSets: Math.max(plannedSets - 1, 2),
          reason: `${ex.name}: ${completedSets} sarjaa tehty (suunniteltu ${plannedSets}) → -1 sarja`,
        });
      }
    }
  }

  // 2. Check for extra exercises the user added (not in plan)
  const plannedCategories = new Set(dayPlanSlots.map((s) => s.category));
  const extraExercises = sessionExercises.filter(
    (ex) => !plannedCategories.has(ex.originalCategory || ex.category) && ex.sets.some((s) => s.completed && !s.isWarmup)
  );

  for (const ex of extraExercises) {
    adjustments.push({
      category: ex.category,
      role: "accessory",
      movementName: ex.name,
      type: "new_exercise",
      suggestedSets: ex.sets.filter((s) => s.completed).length,
      reason: `${ex.name}: lisätty käsin → harkitaan lisäämistä ohjelmaan`,
    });
  }

  return adjustments;
}

/**
 * Apply accumulated session adaptations to mesocycle weekPlan.
 * Only applies after 2+ consistent sessions with same pattern.
 */
function applyAdaptations(mesocycle, adaptationHistory) {
  if (!adaptationHistory || adaptationHistory.length < 2) return { applied: false, changes: [] };

  // Group by category+type and count occurrences
  const counts = {};
  for (const adj of adaptationHistory) {
    const key = `${adj.category}:${adj.type}`;
    if (!counts[key]) counts[key] = { ...adj, count: 0 };
    counts[key].count++;
  }

  const changes = [];
  for (const [key, entry] of Object.entries(counts)) {
    if (entry.count < 2) continue; // Need 2+ sessions with same pattern

    // Apply to all matching weekPlan slots
    for (const wp of mesocycle.weekPlans) {
      for (const day of wp.days) {
        for (const slot of day.slots) {
          if (slot.category === entry.category && slot.role === entry.role) {
            if (entry.type === "volume_up" && entry.suggestedSets > slot.sets) {
              const oldSets = slot.sets;
              slot.sets = entry.suggestedSets;
              changes.push(`${entry.movementName}: ${oldSets} → ${slot.sets} sarjaa`);
            } else if (entry.type === "volume_down" && entry.suggestedSets < slot.sets) {
              const oldSets = slot.sets;
              slot.sets = entry.suggestedSets;
              changes.push(`${entry.movementName}: ${oldSets} → ${slot.sets} sarjaa`);
            }
          }
        }
      }
    }

    if (entry.type === "new_exercise") {
      changes.push(`${entry.movementName}: harkitse ohjelmaan lisäämistä`);
    }
  }

  return { applied: changes.length > 0, changes };
}

// ═══════════════════════════════════════════════════════════════
// FUTURE WORKOUTS PREVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Generate preview of upcoming workouts for N days ahead.
 * Returns array of { dateISO, dayOfWeek, dayType, weekNum, weekLabel, slots }
 */
function getFutureWorkouts(mesocycle, currentDateISO, daysAhead = 14) {
  if (!mesocycle || !mesocycle.weekPlans) return [];

  const results = [];
  const startDate = new Date(currentDateISO);

  for (let d = 1; d <= daysAhead; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateISO = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay() || 7; // 1=Mon, 7=Sun

    const weekNum = getMesocycleWeek(mesocycle, dateISO);
    if (weekNum === null) continue; // Past end of mesocycle

    const weekDef = getWeekDef(mesocycle, weekNum);
    const weekPlan = mesocycle.weekPlans.find((w) => w.week === weekNum);
    if (!weekPlan) continue;

    const dayPlan = weekPlan.days.find((dp) => dp.dayOfWeek === dayOfWeek);
    if (!dayPlan) continue;

    results.push({
      dateISO,
      dayOfWeek,
      dayType: dayPlan.dayType,
      weekNum,
      weekLabel: weekDef?.label || "",
      label: dayPlan.label || "",
      deltaPctBase: weekDef?.deltaPctBase || 0,
      slots: dayPlan.slots,
      // v4.30.4: warmup mukaan jotta sykli-näkymä voi näyttää koko treenin tarkasteluun
      warmup: dayPlan.warmup || [],
    });
  }

  return results;
}

/**
 * Etsii menneet, toteuttamatta jääneet treenipäivät mesosyklistä.
 * "Toteutettu" = jokin sessio on seurannut tuon päivän planiä, ts. sen
 * session.planSourceDateISO (tai vanhoissa sessioissa dateISO) osuu
 * tähän päivään. Tämä tunnistaa oikein myös tilanteet joissa käyttäjä
 * teki Ti:nä Ke:n planin — Ti:n oma plan on edelleen tekemättä.
 *
 * @param {Object} mesocycle
 * @param {Array} sessions — state.sessions
 * @param {string} currentDateISO — "tänään"
 * @param {number} daysBack — kuinka monta vuorokautta taakse tarkistetaan (oletus 3)
 * @returns {Array<{dateISO, dayOfWeek, weekNum, weekLabel, dayType, dayLabel, slots, substitutedPlan}>}
 *   substitutedPlan on { plannedDayType, dateISO } jos samalla kalenteripäivällä
 *   oli eri plan-lähteen sessio (plan-override); muuten null.
 */
function findMissedPriorSessions(mesocycle, sessions, currentDateISO, daysBack = 3) {
  if (!mesocycle || !mesocycle.weekPlans || !currentDateISO) return [];
  const skipped = new Set(mesocycle.skippedDays || []);
  // Päivät joiden plan on toteutettu (planSourceDateISO || dateISO backward-compat)
  const executedPlans = new Set();
  // Sessiot kalenteripäivittäin (jotta voidaan näyttää "teit X sijaan")
  const sessionsByDate = new Map();
  for (const s of (sessions || [])) {
    const planISO = s.planSourceDateISO || s.dateISO;
    if (planISO) executedPlans.add(planISO);
    if (s.dateISO) {
      if (!sessionsByDate.has(s.dateISO)) sessionsByDate.set(s.dateISO, []);
      sessionsByDate.get(s.dateISO).push(s);
    }
  }
  const results = [];
  const base = new Date(currentDateISO);

  for (let d = 1; d <= daysBack; d++) {
    const date = new Date(base);
    date.setDate(date.getDate() - d);
    const iso = date.toISOString().slice(0, 10);
    if (skipped.has(iso)) continue;
    if (executedPlans.has(iso)) continue; // plan on toteutettu jollain päivällä

    const weekNum = getMesocycleWeek(mesocycle, iso);
    if (weekNum === null) continue;

    const dayOfWeek = date.getDay() || 7;
    const weekPlan = mesocycle.weekPlans.find(w => w.week === weekNum);
    const dayPlan = weekPlan?.days?.find(x => x.dayOfWeek === dayOfWeek);
    if (!dayPlan) continue;

    // Jos samalla pv:llä on eri plan-lähteen sessio (override), merkitään korvaus
    const sameDateSessions = sessionsByDate.get(iso) || [];
    const substituted = sameDateSessions[sameDateSessions.length - 1] || null;
    const substitutedPlan = substituted ? {
      plannedDayType: substituted.plannedDayType,
      planSourceDateISO: substituted.planSourceDateISO || substituted.dateISO,
    } : null;

    const weekDef = getWeekDef(mesocycle, weekNum);
    results.push({
      dateISO: iso,
      dayOfWeek,
      weekNum,
      weekLabel: weekDef?.label || "",
      dayType: dayPlan.dayType,
      dayLabel: dayPlan.label || null,
      slots: dayPlan.slots || [],
      substitutedPlan,
    });
  }
  // Uusin ensin
  return results.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

// ═══════════════════════════════════════════════════════════════
// ELITE VOLUME/INTENSITY CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Check if weekly volume meets elite-level minimum thresholds.
 * Returns warnings if below recommended minimums.
 */
function eliteVolumeCheck(weekSets, movements) {
  const stimulus = weeklyStimulus(weekSets, movements);
  const warnings = [];

  // Elite pull volume: minimum ~15 hard sets/week for vertical + horizontal pull
  if (stimulus.pullVolumeSets < 12) {
    warnings.push({
      type: "low_pull_volume",
      current: stimulus.pullVolumeSets,
      target: 15,
      message: `Vetosarjoja ${stimulus.pullVolumeSets}/viikko — eliittitasolla suositus ≥15`,
    });
  }

  // Heavy exposure frequency: at least 4 heavy sets/week
  if (stimulus.heavyExposures < 3) {
    warnings.push({
      type: "low_heavy_exposure",
      current: stimulus.heavyExposures,
      target: 6,
      message: `Heavy-altistuksia ${stimulus.heavyExposures}/viikko — suositus ≥6`,
    });
  }

  // Check push-pull balance
  const pushSets = (stimulus.byCategory["horisontaalityöntö"]?.sets || 0) +
                   (stimulus.byCategory["vertikaalityöntö"]?.sets || 0);
  const pullSets = stimulus.pullVolumeSets;
  if (pullSets > 0 && pushSets < pullSets * 0.5) {
    warnings.push({
      type: "push_pull_imbalance",
      pushSets,
      pullSets,
      message: `Työntö/veto-suhde ${pushSets}:${pullSets} — lisää työntöliikkeitä (tavoite ≥1:2)`,
    });
  }

  return { stimulus, warnings, isEliteReady: warnings.length === 0 };
}

// ═══════════════════════════════════════════════════════════════
// ALL-MOVEMENT e1RM COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute e1RM for any movement from its set history.
 * Uses system Epley for system-load movements (Lisäpainoleuanveto, dippi, MU),
 * accessory Epley for kaikki muut (Takakyykky-style barbell + true accessoryt).
 *
 * v4.34.34: 2. argumentti hyväksyy nyt joko booleanin (taaksepäin yhteensopiva)
 * TAI movement-objektin. Movement-objektista käytetään isSystemLoadMovement(mov)
 * — tämä on KESKITETTY totuudenlähde "lisätäänkö BW e1RM-laskuun" -kysymykseen.
 */
function computeMovementE1RM(movementSets, movementOrIsSystem, bodyweightKg) {
  if (!movementSets.length) return null;

  // v4.34.34: tunnista signature — boolean (legacy) vs movement-objekti (uusi)
  const isSystem = typeof movementOrIsSystem === "boolean"
    ? movementOrIsSystem
    : isSystemLoadMovement(movementOrIsSystem);

  // Take last 6 sets with valid data
  const recent = movementSets
    .filter((s) => s.externalLoadKg > 0 && s.reps >= 1)
    .slice(-6);

  if (!recent.length) return null;

  const values = recent.map((s) => {
    const vara = s.actualVx ?? s.targetVx ?? 1;
    if (isSystem) {
      return e1rmSystem(bodyweightKg, s.externalLoadKg, s.reps, vara);
    } else {
      return e1rmAccessory(s.externalLoadKg, s.reps, vara);
    }
  }).filter((v) => v !== null);

  return values.length > 0 ? median(values) : null;
}

/**
 * v4.35.1 — Yhtenäinen e1RM-laskenta UI:n ja recommend()-funktion välillä.
 *
 * Aiempi computeMovementE1RM palautti pelkkä median(Epley+Vara viim. 6 setistä),
 * eikä huomioinut PLAN_BASED_E1RM-mekanismia (engine.js:2467) eikä cal-historiaa.
 * Tämä aiheutti epäjohdonmukaisuuden Edistyminen-välilehden ja recommend()-funktion
 * välillä (atletin palaute 2026-05-08: e1RM 170.8 vs 184.9 vs 156).
 *
 * Tämä funktio käyttää SAMAA priorisointia kuin recommend() (engine.js:2440-2589):
 *   1. Cal-historia (kalibrointisarjat, setRole === "calibration") — voittaa kun saatavilla
 *   2. PLAN_BASED (viim. ei-cal-session perfect-execution → lastLoad / loadPct) — kun saatavilla
 *   3. Median Epley+Vara (= legacy computeMovementE1RM) — fallback
 *
 * Palauttaa { value: number|null, source: "cal"|"plan-based"|"median"|null, details }.
 *
 * @param {Array} movementSets - viim. liikkeen sarjat (movementId-suodatettu)
 * @param {Array} sessions - kaikki sessiot (PLAN_BASED tarvitsee viim. session loadPct:n)
 * @param {Object|null} mesocycle - aktiivinen mesosykli (PLAN_BASED tarvitsee weekPlans:n)
 * @param {Object} movement - movement-objekti (loadType, isPrimary)
 * @param {number} bodyweightKg
 * @returns {{value: number|null, source: string|null, details: object}}
 */
function computeMovementE1RMBest(movementSets, sessions, mesocycle, movement, bodyweightKg) {
  if (!movementSets || movementSets.length === 0) {
    return { value: null, source: null, details: {} };
  }
  const isSystem = isSystemLoadMovement(movement);
  const isBarbell = !isSystem;

  // 1. Cal-priority: kalibrointi-sarjat ovat tarkin mittaus (DiStasio 2014: ±2.7 kg)
  // v4.35.3: yksikkö-yhteensopivuus — palauta SAMA yksikkö kuin computeMovementE1RM:
  //   barbell → ext (e1rmAccessory output)
  //   system-load → system (e1rmSystem output, sis. bodyweight)
  const calSets = movementSets.filter(s => s.setRole === "calibration");
  const recentCalSets = calSets.slice(-3);
  if (recentCalSets.length > 0) {
    const calE1RMs = recentCalSets.map(s => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      if (isBarbell) return e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara);
      return e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || 1, vara);
    }).filter(v => v !== null);
    if (calE1RMs.length > 0) {
      const calE1RM = median(calE1RMs);
      // Säilytä yksikkö (ext barbell:lle, system system-load:lle)
      return { value: calE1RM, source: "cal", details: { calCount: recentCalSets.length, raw: calE1RM } };
    }
  }

  // 2. PLAN_BASED-priority: jos viim. ei-cal-session oli perfect-execution
  //    JA loadPct on luettavissa mesosyklistä, palauta lastLoad / lastLoadPct
  if (mesocycle && sessions && movement) {
    // Hae primary-work-sarjat (top), suodata accessoryt
    const primaryWorkSets = movementSets.filter(s => s.setRole === "top");
    if (primaryWorkSets.length > 0) {
      // Ryhmitä sessionId:n mukaan, järjestys ascending
      const sessGroups = new Map();
      const sessOrder = [];
      for (const s of primaryWorkSets) {
        const sid = s.sessionId || `__nosess_${s.timestamp}`;
        if (!sessGroups.has(sid)) { sessGroups.set(sid, []); sessOrder.push(sid); }
        sessGroups.get(sid).push(s);
      }
      // Etsi viim. ei-cal-sessio (cal-set-osuus < 50%)
      let lastSessionSets = null;
      let lastSessionId = null;
      for (let i = sessOrder.length - 1; i >= 0; i--) {
        const sets = sessGroups.get(sessOrder[i]);
        const calCount = sets.filter(s => s.setRole === "calibration").length;
        if (calCount < sets.length * 0.5) {
          lastSessionSets = sets;
          lastSessionId = sessOrder[i];
          break;
        }
      }
      if (lastSessionSets && lastSessionSets.length > 0) {
        // Tarkista perfect execution: kaikki sarjat actualVx >= targetVx JA reps >= targetReps
        const allHitTarget = lastSessionSets.every(s =>
          s.actualVx !== null && s.actualVx !== undefined && s.targetVx !== null && s.targetVx !== undefined
          && s.actualVx >= s.targetVx
          && (s.reps ?? 0) >= (s.targetReps ?? 0)
        );
        if (allHitTarget) {
          // Hae viim. session date → mesocycle-vk → primary-slot loadPct
          const lastDateISO = (lastSessionId && sessions.find(s => s.sessionId === lastSessionId)?.dateISO)
            || lastSessionSets[0]?.dateISO
            || lastSessionSets[0]?.timestamp?.slice(0, 10);
          if (lastDateISO) {
            const lastWk = getMesocycleWeek(mesocycle, lastDateISO);
            const lastDow = (new Date(lastDateISO).getDay() || 7);
            const lastDayPlan = (lastWk !== null) && mesocycle.weekPlans?.[lastWk - 1]?.days?.find(d => d.dayOfWeek === lastDow);
            // Etsi slot joka match-aa tämän liikkeen — primary VAI cross-ref
            let lastLoadPct = null;
            if (lastDayPlan?.slots) {
              const matchSlot = lastDayPlan.slots.find(s =>
                s.defaultMovementName === movement.name
                || s.loadPctReferenceMovementName === movement.name
              );
              lastLoadPct = matchSlot?.loadPct;
            }
            if (lastLoadPct && lastLoadPct > 0 && lastLoadPct <= 1.0) {
              const lastMedianLoad = median(lastSessionSets.map(s => s.externalLoadKg).filter(v => v > 0));
              if (lastMedianLoad && lastMedianLoad > 0) {
                // Vx-overshoot bonus (sama kuin recommend():ssa)
                const meanOvershoot = lastSessionSets.reduce((sum, s) =>
                  sum + ((s.actualVx ?? 0) - (s.targetVx ?? 0)), 0) / lastSessionSets.length;
                const vxBonusPct = Math.max(0, meanOvershoot) * 0.025;
                const planBasedExternal = (lastMedianLoad / lastLoadPct) * (1 + vxBonusPct);
                // v4.35.3: yksikkö-yhteensopivuus — palauta SAMA yksikkö kuin computeMovementE1RM:
                //   barbell → ext (planBasedExternal suoraan)
                //   system-load → system (= ext + bodyweight, kuten engine.js:2572)
                const value = isBarbell ? planBasedExternal : (planBasedExternal + bodyweightKg);
                return {
                  value,
                  source: "plan-based",
                  details: { lastLoad: lastMedianLoad, lastLoadPct, lastWk,
                             vxBonusPct, perfectExecution: true,
                             planBasedExternal, isSystemLoad: !isBarbell },
                };
              }
            }
          }
        }
      }
    }
  }

  // 3. Fallback: median Epley+Vara (= legacy computeMovementE1RM-logiikka)
  // v4.35.3: yksikkö-yhteensopivuus — säilytä legacy-palautus sellaisenaan
  // (computeMovementE1RM palauttaa ext barbell:lle, system system-load:lle)
  const fallback = computeMovementE1RM(movementSets, movement, bodyweightKg);
  if (fallback === null) return { value: null, source: null, details: {} };
  return { value: fallback, source: "median", details: { raw: fallback } };
}

/**
 * Compute e1RM history (time series) for any movement.
 * v4.34.34: 3. argumentti hyväksyy joko booleanin tai movement-objektin (kuten yllä).
 */
function computeMovementE1RMHistory(movementSets, sessions, movementOrIsSystem, bodyweightKg) {
  const sessionMap = new Map(sessions.map((s) => [s.sessionId, s]));
  const points = [];

  const isSystem = typeof movementOrIsSystem === "boolean"
    ? movementOrIsSystem
    : isSystemLoadMovement(movementOrIsSystem);

  for (const s of movementSets) {
    if (s.externalLoadKg <= 0 || s.reps < 1) continue;
    const session = sessionMap.get(s.sessionId);
    if (!session) continue;

    const vara = s.actualVx ?? s.targetVx ?? 1;
    let e1rm;
    if (isSystem) {
      e1rm = e1rmSystem(bodyweightKg, s.externalLoadKg, s.reps, vara);
    } else {
      e1rm = e1rmAccessory(s.externalLoadKg, s.reps, vara);
    }

    if (e1rm !== null) {
      points.push({ dateISO: session.dateISO, e1rm, load: s.externalLoadKg, reps: s.reps });
    }
  }

  return points;
}

// ═══════════════════════════════════════════════════════════════
// VARIANT PERIODIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get default variant name for a given day type.
 */
function getDefaultVariantForDayType(dayType) {
  const variants = VARIANT_DAY_TYPE_MAP[dayType] || VARIANT_DAY_TYPE_MAP.heavy;
  return variants[0]; // First variant is default
}

/**
 * Load modifier for each variant.
 * Returns a multiplier to apply to target load.
 * e.g., koroke = +5% (supramaximal eccentric), kuminauha = -40% (speed work)
 */
// Default load modifiers (used when no custom overrides exist)
const DEFAULT_VARIANT_MODIFIERS = {
  "Kilpaveto (leveä vastaote)": 0,
  "Korokeveto":                 0.05,    // +5% supramaximal
  "Nopeusveto kuminauhalla":   -0.40,   // -40% speed
  "Myötäoteveto":              -0.05,   // -5% grip weakness
  "Neutraaliote":              -0.03,   // -3% grip neutral
  "2s ylipito":                -0.05,   // -5% isometric hold
  "1.5-toisto hiissaus":       -0.10,   // -10% tempo reps
};

/**
 * Variant load modifier. Uses customModifiers (from settings) when available,
 * falls back to defaults.
 * @param {string} variantName
 * @param {Object|null} customModifiers — { variantName: number } from settings
 * @returns {number} modifier as a fraction (e.g. -0.05 = -5%)
 */
function variantLoadModifier(variantName, customModifiers = null) {
  if (!variantName) return 0;
  if (customModifiers && variantName in customModifiers) {
    return customModifiers[variantName];
  }
  return DEFAULT_VARIANT_MODIFIERS[variantName] ?? 0;
}

/**
 * Rep/tempo override for specific variants.
 * Returns override info (repsLabel, tempoNotes) or null.
 */
function variantRepOverride(variantName) {
  switch (variantName) {
    case "2s ylipito":
      return { tempoNote: "2s pito yläasennossa", label: "ylipito" };
    case "1.5-toisto hiissaus":
      return { tempoNote: "1.5 toistoa: ylös → puoleen väliin → ylös", label: "hiissaus" };
    case "Nopeusveto kuminauhalla":
      return { tempoNote: "Räjähtävästi, max nopeus", label: "nopeus" };
    case "Korokeveto":
      return { tempoNote: "Eksentrisesti hitaasti (3-4s)", label: "koroke" };
    default:
      return null;
  }
}

/**
 * Assign variants to mesocycle week plans via smart rotation.
 * Heavy days rotate: Kilpaveto ↔ Korokeveto
 * Speed days: always Nopeusveto kuminauhalla
 * Volume days: rotate through Myötäote → Neutraaliote → 2s ylipito → 1.5-toisto hiissaus
 */
function assignVariantRotation(weekPlans) {
  let heavyIdx = 0;
  let volumeIdx = 0;
  const heavyVariants = VARIANT_DAY_TYPE_MAP.heavy;
  const volumeVariants = VARIANT_DAY_TYPE_MAP.volume;
  const speedVariant = VARIANT_DAY_TYPE_MAP.speed[0];

  for (const wp of weekPlans) {
    for (const day of wp.days) {
      for (const slot of day.slots) {
        if (slot.role !== "primary" && slot.role !== "backoff") continue;
        if (slot.category !== "vertikaaliveto") continue;

        if (day.dayType === "heavy") {
          slot.variantName = heavyVariants[heavyIdx % heavyVariants.length];
          // backoff uses same variant as primary
          if (slot.role === "primary") heavyIdx++;
        } else if (day.dayType === "speed") {
          slot.variantName = speedVariant;
        } else if (day.dayType === "volume") {
          slot.variantName = volumeVariants[volumeIdx % volumeVariants.length];
          if (slot.role === "primary") volumeIdx++;
        } else {
          slot.variantName = heavyVariants[0]; // default
        }
      }
    }
  }
  return weekPlans;
}

// ═══════════════════════════════════════════════════════════════
// PEAKING ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * v4.30.3: e1RM-ennuste ohjelman loppuun saakka.
 *
 * Käyttää käyttäjän historiallista trendiä jos saatavilla (≥3 mittauspistettä),
 * muuten edistyneelle harjoittelijalle realistista 0.5 % / vk -default-tahtia.
 * Block-aware: peaking-vaiheessa (viim. 4 vk) gain-rate puolitetaan koska
 * realization ei tuota uusia gainsia, vaan toteuttaa olemassa olevia.
 *
 * @param {Array} history - computeMovementE1RMHistory:n output [{dateISO, e1rm, ...}]
 * @param {number} currentWeekNum - nykyinen viikko (1–totalWeeks)
 * @param {number} totalWeeks - ohjelman pituus (default 16)
 * @returns {Object|null} { predictedFinal, weeklyGainPct, weeksRemaining,
 *                         confidence: "high"|"medium"|"low", projection: [{week, e1rm}] }
 */
function predictE1RMEndOfProgram(history, currentWeekNum, totalWeeks = 16) {
  if (!history || history.length === 0) return null;
  const currentE1RM = history[history.length - 1].e1rm;
  if (!currentE1RM || currentE1RM <= 0) return null;
  const remainingWeeks = Math.max(0, totalWeeks - currentWeekNum);
  if (remainingWeeks === 0) {
    return { predictedFinal: currentE1RM, weeklyGainPct: 0,
             weeksRemaining: 0, confidence: "exact", projection: [] };
  }

  // 1. Arvioi viikoittainen kasvuprosentti historiasta (jos riittävästi dataa)
  let weeklyGainPct = 0.005; // default 0.5% / vk edistyneelle harjoittelijalle
  let confidence = "low";
  if (history.length >= 3) {
    const first = history[0];
    const last = history[history.length - 1];
    const firstMs = new Date(first.dateISO).getTime();
    const lastMs = new Date(last.dateISO).getTime();
    const weeksSpan = (lastMs - firstMs) / (7 * 24 * 60 * 60 * 1000);
    if (weeksSpan >= 1 && first.e1rm > 0) {
      const totalGainPct = (last.e1rm - first.e1rm) / first.e1rm;
      const observed = totalGainPct / weeksSpan;
      // Clamp realistisiin haarukoihin: −0.5%/vk … +1.5%/vk (eliittilifter)
      weeklyGainPct = Math.max(-0.005, Math.min(0.015, observed));
      confidence = history.length >= 6 ? "high" : "medium";
    }
  }

  // 2. Block-aware projektio: peaking (viim. 4 vk) → puolet gain-ratesta
  //    Deload-viikot (4, 8, 12) → ei kasvua (CNS-konservointi)
  const peakingStart = totalWeeks - 3; // vk 13–16 (jos totalWeeks=16)
  let projectedE1RM = currentE1RM;
  const projection = [];
  for (let w = currentWeekNum + 1; w <= totalWeeks; w++) {
    const isPeaking = w >= peakingStart;
    const isDeload = w === 4 || w === 8 || w === 12;
    const weeklyGain = isDeload ? 0 : (isPeaking ? weeklyGainPct * 0.5 : weeklyGainPct);
    projectedE1RM *= (1 + weeklyGain);
    projection.push({ week: w, e1rm: Math.round(projectedE1RM * 10) / 10 });
  }

  return {
    predictedFinal: Math.round(projectedE1RM * 10) / 10,
    weeklyGainPct,
    weeksRemaining: remainingWeeks,
    confidence,
    projection,
  };
}

/**
 * v4.30.3: Streetlifting kisapäivän tavoite-ennuste.
 *
 * Yhdistää e1RM-ennusteen + opener-strategian: ennustaa per kilpailu­liike
 * mitä kuormat kisapäivänä tulevat olemaan, jos käyttäjän nykyinen
 * etenemistahti jatkuu.
 *
 * @param {Object} historyByMovement - { "Lisäpainoleuanveto": [...e1rmHistory], ... }
 * @param {number} currentWeekNum
 * @param {number} totalWeeks
 * @returns {Object|null} per liike: { current, predicted, opener, second, third, weeklyGainPct }
 */
function computeStreetliftingFinalProjection(historyByMovement, currentWeekNum, totalWeeks = 16) {
  if (!historyByMovement) return null;
  // v4.32.7 bugfix: Maastaveto poistettu — streetlifting-kisaliikkeet ovat MU + Leuka + Dippi + Takakyykky.
  // Maastaveto oli aiemmin virheellisesti listalla; ennuste-kortti näytti maavedon "kisaliikkeenä"
  // streetlifting_16w-mesosyklissä vaikka mesosykli ei tue maavetoa kisaliikkeenä.
  const COMPETITION_LIFTS = ["Lisäpainoleuanveto", "Muscle-up", "Lisäpainodippi", "Takakyykky"];
  const result = {};
  for (const liftName of COMPETITION_LIFTS) {
    const history = historyByMovement[liftName];
    if (!history || history.length === 0) continue;
    const currentE1RM = history[history.length - 1].e1rm;
    if (!currentE1RM || currentE1RM <= 0) continue;
    const prediction = predictE1RMEndOfProgram(history, currentWeekNum, totalWeeks);
    if (!prediction) continue;
    const finalE1RM = prediction.predictedFinal;
    result[liftName] = {
      current: Math.round(currentE1RM * 10) / 10,
      predicted: finalE1RM,
      gainKg: Math.round((finalE1RM - currentE1RM) * 10) / 10,
      gainPct: Math.round(((finalE1RM - currentE1RM) / currentE1RM) * 1000) / 10, // 1 desimaali
      opener: roundToHalf(finalE1RM * 0.88),
      second: roundToHalf(finalE1RM * 0.95),
      third: roundToHalf(finalE1RM * 1.02),
      weeklyGainPct: prediction.weeklyGainPct,
      confidence: prediction.confidence,
      weeksRemaining: prediction.weeksRemaining,
    };
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * v4.29.0 (P2): Streetlifting opener-strategia kisapäivälle.
 *
 * Laskee per kilpailu­liike opener / 2nd / 3rd -prosentit e1RM:n perusteella.
 * Lähde: StrengthLog/IPF World Classic 2021 -data (voittajien openerit ~88 %),
 * Helms 2018 ja Bromley Peak Strength.
 *
 * Käyttö: peaking-vaiheessa (vk 13–16) dashboard näyttää tämän taulukon
 * jotta käyttäjä voi suunnitella kisapäivän nostot ennalta.
 *
 * @param {Object} e1rmsByMovementName — { "Lisäpainoleuanveto": 94, ... }
 * @returns {Object|null} per liike: { e1rm, opener, second, third } tai null
 */
function computeStreetliftingOpenerStrategy(e1rmsByMovementName) {
  if (!e1rmsByMovementName || typeof e1rmsByMovementName !== "object") return null;
  // v4.32.7 bugfix: streetlifting-kisaliikkeet ovat MU + Leuka + Dippi + Takakyykky.
  // SSW-formaatti ei sisällä maavetoa. Aiemmassa listassa oli Maastaveto mutta ei
  // Muscle-upia — molemmat virheelliset. Korjattu kanoniseen streetlifting-listaan.
  const COMPETITION_LIFTS = [
    "Lisäpainoleuanveto",
    "Muscle-up",
    "Lisäpainodippi",
    "Takakyykky",
  ];
  // Eliittikäytäntö (Helms, Bromley, IPF World Classic 2021 -data):
  //   Opener:  88–90 % 1RM (= "viimeisin treenisingle prep-blokin lopussa")
  //   2nd:     94–96 % 1RM
  //   3rd:    100–103 % 1RM (PR-yritys)
  const OPENER_PCT = 0.88;
  const SECOND_PCT = 0.95;
  const THIRD_PCT = 1.02;
  const result = {};
  for (const liftName of COMPETITION_LIFTS) {
    const e1rm = e1rmsByMovementName[liftName];
    if (!e1rm || e1rm <= 0) continue;
    result[liftName] = {
      e1rm: Math.round(e1rm * 10) / 10,
      opener: roundToHalf(e1rm * OPENER_PCT),
      second: roundToHalf(e1rm * SECOND_PCT),
      third: roundToHalf(e1rm * THIRD_PCT),
      openerPct: OPENER_PCT,
      secondPct: SECOND_PCT,
      thirdPct: THIRD_PCT,
    };
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Compute attempt loads for competition day.
 * Returns { warmupLoads: [...], opener, second, third } in external kg.
 */
function computeAttemptLoads(e1rmExternal, bw, peakingConfig, isBarbell = false) {
  if (!e1rmExternal || !peakingConfig) return null;

  // v4.51.x loadpct-fix: pct × (BW + e1rmExternal) − BW non-barbellille; pct × e1rmExternal barbell.
  // Sign-flip pct > 1.0 -arvoilla on odotettu (3rd attempt 1.02 → palauttaa aiotun yli-1RM-yrityksen).
  const applyPct = (pct) => isBarbell
    ? e1rmExternal * pct
    : (e1rmExternal + bw) * pct - bw;

  const warmupLoads = (peakingConfig.warmupPcts || [0.40, 0.60, 0.75, 0.85]).map(pct =>
    roundToHalf(Math.max(0, applyPct(pct)))
  );

  return {
    warmupLoads,
    opener: roundToHalf(Math.max(0, applyPct(peakingConfig.openerPct || 0.92))),
    second: roundToHalf(Math.max(0, applyPct(peakingConfig.secondPct || 0.97))),
    third: roundToHalf(Math.max(0, applyPct(peakingConfig.thirdPct || 1.02))),
    e1rmExternal,
  };
}

/**
 * Recommend function specifically for peaking mesocycles.
 * Key differences from normal recommend():
 * - No readiness caps (athlete decides)
 * - Competition day: enriches slots with computed loads
 * - Normal peaking days: load from weekDef deltaPctBase
 */
async function recommendPeaking(options = {}) {
  const settings = options.settings || (await getSettings());
  const bodyweightKg = options.bodyweightKg || settings.bodyweightKg || 91;
  const dateISO = options.dateISO || todayISO();
  const mesocycle = options.mesocycle;

  if (!mesocycle || mesocycle.type !== "peaking") {
    return recommend(options); // fallback to normal
  }

  const traces = [];
  function trace(ruleId, before, after, why) {
    traces.push({ traceId: uid(), recId: null, ruleId, before: { ...before }, after: { ...after }, why });
  }

  // Determine week
  // v4.22: erottele before-start / after-end — peaking-mesosyklissä myös
  // ennen alkua -pyynnöt eivät saa muuttaa käyttäjän valitsemaa mesosykliä
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  let weekNum = pos?.programWeek ?? null;
  if (weekNum === null) {
    if (pos?.reason === "before-start") {
      return {
        dateISO,
        error: "before-start",
        errorMessage: `Peaking-mesosykli alkoi ${mesocycle.startDateISO} — ei voida laskea suositusta aiemmalle päivälle`,
        traces,
        dayPlan: null,
        dayType: null,
        weekNum: null,
        weekLabel: null,
        targetExternalLoad: null,
      };
    }
    // after-end → create new default mesocycle with -5% deload start
    const newMeso = createDefaultMesocycle(dateISO);
    newMeso.weekDefs[0].deltaPctBase = -0.05;
    if (!options.dryRun) await saveMesocycle(newMeso);
    trace("PEAKING_TRANSITION", {}, { type: "default" }, "Peaking päättynyt → normaali mesosykli (-5% start)");
    return recommend({ ...options, mesocycle: newMeso });
  }

  const weekDef = getWeekDef(mesocycle, weekNum);
  const dayOfWeek = new Date(dateISO).getDay() || 7;
  const dayPlan = getTodayPlan(mesocycle, weekNum, dayOfWeek);
  const dayType = dayPlan?.dayType || "heavy";

  trace("PEAKING_PHASE", {}, { weekNum, dayType, label: weekDef?.label },
    `PEAKING Vk ${weekNum}: ${weekDef?.label || "?"}`);

  // e1RM from sets
  const allSets = options.allSets || (await getAllSets());
  const primaryMovementId = options.primaryMovementId || null;
  // v4.27.15: calibration-setit mukaan topSets-filtteriin myös peaking-polussa.
  const topSets = allSets
    .filter(s => {
      if (primaryMovementId && s.movementId !== primaryMovementId) return false;
      return s.setRole === "top" || s.setRole === "readiness_test" || s.setRole === "calibration";
    })
    .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

  const recentTopSets = topSets.slice(-6);
  // Detect barbell-only lift (squat): no bodyweight added to system load
  const peakingPrimarySlot = dayPlan?.slots?.find(s => s.role === "primary");
  const isBarbellPeaking = peakingPrimarySlot?.isBarbell === true
    || options.primaryLoadType === "external";
  const e1rmValues = recentTopSets
    .map(s => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      return isBarbellPeaking
        ? e1rmAccessory(s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara)
        : e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
    })
    .filter(v => v !== null);

  // v4.27.15: Calibration override — ks. recommend()-pääpolun kommentti.
  const peakingLast3Sets = recentTopSets.slice(-3);
  const peakingCalibSets = peakingLast3Sets.filter(s => s.setRole === "calibration");
  let currentE1RMSystem;
  if (peakingCalibSets.length > 0) {
    const calibE1rms = peakingCalibSets.map(s => {
      // v4.34.33 BUG-FIX 1.3: yhtenäinen fallback pää-recommend()-funktion kanssa.
      // Aiempi `?? 0` aliarvioi peaking-cal-setit (V0 = failure) — v4.32.8 protokolla
      // käyttää RPE 8 × 3 V1, joten target-Vx ei välttämättä ole tallennettu actualVx:nä.
      const vara = s.actualVx ?? s.targetVx ?? 1;
      return isBarbellPeaking
        ? e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara)
        : e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || 1, vara);
    }).filter(v => v !== null);
    currentE1RMSystem = calibE1rms.length > 0 ? median(calibE1rms) : (e1rmValues.length > 0 ? median(e1rmValues) : null);
  } else {
    currentE1RMSystem = e1rmValues.length > 0 ? median(e1rmValues) : null;
  }
  // Barbell: external = system (ei BW-vähennystä). Muut: sys - BW.
  const currentE1RMExternal = currentE1RMSystem !== null
    ? (isBarbellPeaking ? currentE1RMSystem : Math.max(0, currentE1RMSystem - bodyweightKg))
    : null;

  // Use peakingConfig e1RM if no computed e1RM
  const useE1RM = currentE1RMExternal || mesocycle.peakingConfig?.e1rmExternal || 93;

  trace("PEAKING_E1RM", {}, {
    e1rmExternal: useE1RM.toFixed(1),
    source: currentE1RMExternal ? "computed" : "peakingConfig",
  }, `Peaking e1RM: ${useE1RM.toFixed(1)} kg`);

  // Competition day: compute attempt loads
  let attemptLoads = null;
  if (dayType === "competition") {
    attemptLoads = computeAttemptLoads(useE1RM, bodyweightKg, mesocycle.peakingConfig, isBarbellPeaking);
    trace("COMPETITION_LOADS", {}, attemptLoads, "Kilpailukuormat laskettu");
  }

  // Normal peaking day: compute load from slot reps/vx (not weekDef!)
  // Apply dayMult to delta like normal recommend() does
  const dayMult = DAY_TYPE_MULTIPLIERS[dayType] ?? 1.0;
  const deltaPct = (weekDef?.deltaPctBase || 0) * dayMult;

  // Read reps/vx from primary slot (accurate per-day prescription)
  const primarySlot = dayPlan?.slots?.find(s => s.role === "primary");
  let targetReps, targetVx;
  if (primarySlot) {
    targetReps = primarySlot.reps;
    targetVx = primarySlot.targetVx ?? (dayType === "heavy" ? 1 : dayType === "volume" ? 2 : 4);
  } else {
    // Fallback to weekDef if no slot found
    targetReps = weekDef?.heavyReps || 2;
    targetVx = weekDef?.heavyTargetVx || 1;
    if (dayType === "volume") {
      targetReps = Math.max(3, targetReps + 2);
      targetVx = Math.min(4, targetVx + 1);
    }
  }

  let targetExternalLoad;
  if (currentE1RMSystem !== null) {
    const effectiveReps = targetReps + targetVx;
    const targetSystemLoad = currentE1RMSystem / (1 + effectiveReps / 30);
    const rawExternal = targetSystemLoad * (1 + deltaPct) - bodyweightKg;
    targetExternalLoad = roundToHalf(Math.max(0, rawExternal));
  } else {
    targetExternalLoad = null;
  }

  const rec = {
    recId: uid(),
    dateISO,
    mesocycleId: mesocycle.mesocycleId,
    mesocycleType: "peaking",
    weekNum,
    weekLabel: weekDef?.label || "?",
    dayType,
    targetExternalLoad,
    targetReps,
    targetVx,
    setCount: dayPlan?.slots?.find(s => s.role === "primary")?.sets || 3,
    deltaPct,
    capLevel: 0, // No caps in peaking
    readiness: options.readiness || { combined: "GREEN", capLevel: 0, channels: {} },
    e1rmSystem: currentE1RMSystem,
    e1rmExternal: currentE1RMExternal,
    bodyweightKg,
    varaFeedback: { suggestion: null, type: null },
    breakInfo: null,
    accessoryCapActive: false,
    dayPlan,
    attemptLoads,
    peakingConfig: mesocycle.peakingConfig,
    traces,
  };

  for (const t of traces) t.recId = rec.recId;

  if (!options.dryRun) {
    await saveRecommendation({
      recId: rec.recId,
      sessionId: null,
      variantId: null,
      targetSetRole: "top",
      targetLoadKg: targetExternalLoad,
      deltaPct,
      capLevel: 0,
      mesocycleWeek: weekNum,
      dayType,
      targetReps,
      targetVx,
      createdAtISO: new Date().toISOString(),
    });
    for (const t of traces) await saveDecisionTrace(t);
  }

  return rec;
}

// ═══════════════════════════════════════════════════════════════
// ANNUAL PERIODIZATION — SUGGESTED NEXT TEMPLATE
// ═══════════════════════════════════════════════════════════════

// Mapping: current mesocycle type → recommended next template(s)
// First entry is the primary recommendation, rest are alternatives
const SUGGESTED_NEXT_TEMPLATE = {
  default:       ["hypertrofia", "maksimivoima", "dup"],           // Perusjaksosta eteenpäin
  hypertrofia:   ["maksimivoima", "default", "dup"],               // Lihasmassasta voimaan
  maksimivoima:  ["peaking", "eksentrinen", "palautuminen"],       // Maksimivoima → kilpailu tai palautuminen
  eksentrinen:   ["palautuminen", "default", "maksimivoima"],      // Eksentrinen → palaudu ensin
  dup:           ["maksimivoima", "hypertrofia", "eksentrinen"],    // DUP → voimablokkiin
  siirtyma:      ["hypertrofia", "default", "dup"],                // GPP → uusi kasvujakso
  palautuminen:  ["hypertrofia", "default", "siirtyma"],           // Palautuminen → uusi kasvu
  peaking:       ["palautuminen", "siirtyma", "hypertrofia"],      // Kilpailun jälkeen → lepo
};

// ═══════════════════════════════════════════════════════════════
// v4.34.0 AI-BLOCK-TUNING (deload-pohjainen analyysipaketti)
// ═══════════════════════════════════════════════════════════════
//
// Generoi rikkaan analyysipaketin atleetin viedäkseen Claude/ChatGPT:lle
// deload-viikolla (vk 4, 8, 12). AI palauttaa block-tuning-suosituksia
// kolmessa kategoriassa:
//   A) Sovellus-tason muutokset (atleetti applaa UI:ssa: slot-swap, e1RM, BW)
//   B) Rakenteelliset muutokset (Claude Code -tasolla: %-progressio,
//      set/rep, backoff-tyyli, engine-säätö)
//   C) Mentaalinen koutsaus (atleetti sisäistää: tekniikkavinkit,
//      pattern-tunnistus, riskimanagement)
//
// Output: { markdown, json, prompt, meta }
//   markdown = atleetin luettava 1500-2000 sanan narratiivi
//   json     = strukturoitu data Claude AI:lle ristivertailuun
//   prompt   = valmis copy-paste AI-prompt jossa kaikki konteksti

// β H-001 B1 (HANDOFF.md §6 K1 ratifioitu 2026-05-25): yhtenäinen aggregaatti-
// laskenta AI Block Tuning -syötteen totalSessions + completedSets -metriikoille.
// Lukittu rajaus:
//   - Viikkojoukko: kutsuja antaa blockSessions, joka on jo viikkofilteröity
//     päättyneisiin blokkiviikkoihin (esim. Foundation = vk 1–3). Käynnissä
//     oleva siirtymä-/deload-viikko vk N EI sisälly aggregaatteihin — se
//     hoidetaan erikseen B5:n currentWeekCalibrationSets-kentällä.
//   - Backfill: sisältyy. Sessio kuuluu joukkoon dateISO:n viikkonsidon kautta,
//     ei kirjausajan. Backfill-kirjatut sessiot/setit ovat aitoa toteutunutta
//     volyymiä ja kuuluvat aggregaatteihin (Israetel-MRV-vertailu vaatii
//     todellisen volyymin).
//   - totalSessions: blockSessions.length — session-tason metriikka, EI warmup-
//     suodatusta.
//   - completedSets: SET-tason suodatin completed === true && isWarmup !== true
//     (= engine.js r. 5318:n kanoninen pattern, vrt. analyzeSessionAdaptation).
// Käytössä generateBlockTuningPackage, generateGenericBlockTuningPackage ja
// generateEndOfCycleTuningPackage -funktioissa varmistamaan sama rajaus
// (HANDOFF.md A1).
function _computeTuningCoreAggregates(blockSessions, allSets) {
  const sessions = blockSessions || [];
  const sets = allSets || [];
  const totalSessions = sessions.length;
  let completedSets = 0;
  for (const sess of sessions) {
    for (const set of sets) {
      if (set.sessionId === sess.sessionId
          && set.completed === true
          && set.isWarmup !== true) {
        completedSets++;
      }
    }
  }
  return { totalSessions, completedSets };
}

// β H-001 B2/A2 (HANDOFF.md §5 kohta 6 + §6 K2(1)-A ratifioitu 2026-05-25):
// Normalisoi slotin note-kentässä esiintyvä "@XX%"-merkkijono vastaamaan
// slot.loadPct:tä AI Block Tuning -syötteen serialisoinnissa.
//
// loadPct on kanoninen kuorma-intentti-kenttä (HANDOFF.md §5 kohta 6) — se on
// dimensioton ja toimii sekä barbell- että BW-skaalatuilla liikkeillä. note
// on kuvailevaa tekstiä; jos sen "@XX%" eroaa loadPct:stä, korvataan loadPct-
// pohjaisella prosentilla.
//
// SCOPE: tämä helper toimii engine.js:n AI Block Tuning -funktioissa
// (generate*TuningPackage). EI muuta data.js-mesosyklitemplaattia eikä
// atletti-UI:n näkymiä — note-merkkijonon LÄHDE on data.js:ssä, B2 korjaa
// VAIN AI-syötteen serialisoinnin (HANDOFF.md §3 scope-aita).
//
// Toleranssi 0,5 prosenttiyksikköä (= ≈ roundToHalf-rasteri 100 kg
// e1RM:llä). Pause/pin/tempo-variantti-spesifikaatiosta riippumatta
// (Akselin K2(1)-A "tiukka" ratifiointi 2026-05-25).
//
// resolvedLoadKg EI sisälly normalisointiin — se on ajonaikainen resolvoitu
// arvo, legitiimisti poikkeava loadPct × e1RM-arvosta (K2(2)-OK ratifiointi).
function _normalizeSlotForTuningSerialization(slot) {
  if (!slot) return slot;
  if (typeof slot.loadPct !== "number" || slot.loadPct <= 0) return slot;
  if (typeof slot.note !== "string") return slot;
  const m = slot.note.match(/@\s*(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return slot;
  const notePct = parseFloat(m[1].replace(",", ".")) / 100;
  if (!Number.isFinite(notePct)) return slot;
  const deltaPp = Math.abs(notePct - slot.loadPct) * 100;
  if (deltaPp <= 0.5) return slot; // toleranssi 0,5 pp
  // Korvaa "@XX%"-merkkijono loadPct-pohjalla. Pyöristys 1 desimaaliin →
  // "@59,5 %" tai "@93 %" (kokonaisluku jos .0).
  const pctNum = slot.loadPct * 100;
  const pctStr = Math.abs(pctNum - Math.round(pctNum)) < 0.05
    ? `${Math.round(pctNum)} %`
    : `${pctNum.toFixed(1).replace(".", ",")} %`;
  return { ...slot, note: slot.note.replace(/@\s*\d+(?:[.,]\d+)?\s*%/, `@${pctStr}`) };
}

function generateBlockTuningPackage(ctx) {
  const { mesocycle, sessions, allSets, measurements, prs, currentWeekNum, settings, decisionTraces } = ctx;

  if (!mesocycle || mesocycle.type !== "streetlifting_16w") {
    return { error: "AI-Block-Tuning vaatii streetlifting_16w-mesosyklin." };
  }

  const wk = currentWeekNum;
  // Deload-tunnistus: vk 4, 8, 12. Vk 16 (kisaviikko) ei generoi.
  const deloadWeeks = [4, 8, 12];
  if (!deloadWeeks.includes(wk)) {
    return {
      error: `AI-Block-Tuning aktivoituu vain deload-viikoilla (vk 4, 8, 12). Olet vk ${wk}. Seuraava deload: vk ${deloadWeeks.find(d => d > wk) || "16 (kisaviikko)"}.`
    };
  }

  // Blokki-rakenne
  const blockMap = {
    4:  { prevBlock: "Foundation",   prevWeeks: [1,2,3], nextBlock: "Strength",  nextWeeks: [5,6,7] },
    8:  { prevBlock: "Strength",     prevWeeks: [5,6,7], nextBlock: "Intensity", nextWeeks: [9,10,11] },
    12: { prevBlock: "Intensity",    prevWeeks: [9,10,11], nextBlock: "Peaking",   nextWeeks: [13,14] },
  };
  const block = blockMap[wk];

  // ── Atleettiprofile ──
  const cal = mesocycle.streetliftingConfig?.calibration || {};
  const bw = settings?.bodyweightKg || 91;
  const profile = {
    bw,
    weekCount: mesocycle.weekCount || 16,
    competitionDate: mesocycle.streetliftingConfig?.competitionDate || "elokuu 2026",
    calibration: cal,
    // v4.34.43: cfg-drift-historia AI-tuningille — näkyvyys siihen miten engine
    // on oppinut atletin todellisen kapasiteetin blokin aikana.
    cfgDriftHistory: (mesocycle.streetliftingConfig?.cfgDriftHistory || []).filter(d => {
      const dw = getMesocycleWeek(mesocycle, d.dateISO);
      return block.prevWeeks.includes(dw);
    }),
    prs: (prs || []).map(p => ({ movement: p.movementName, value: p.value, dateISO: p.dateISO, context: p.context })),
  };

  // ── Edellisen blokin sessio-data ──
  const prevBlockSessions = (sessions || []).filter(s => {
    const sw = getMesocycleWeek(mesocycle, s.dateISO);
    return block.prevWeeks.includes(sw);
  }).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

  const sessionAnalysis = prevBlockSessions.map(sess => {
    const sessSets = (allSets || []).filter(set => set.sessionId === sess.sessionId);
    const sw = getMesocycleWeek(mesocycle, sess.dateISO);
    const slots = sessSets.map(set => ({
      movementName: set.movementName,
      role: set.setRole,
      prescribed: { reps: set.targetReps, vx: set.targetVx, loadKg: set.targetLoadKg, loadPct: set.targetLoadPct },
      actual: { reps: set.reps, actualVx: set.actualVx, loadKg: set.externalLoadKg, velocity: set.velocityMs },
      vxDelta: (set.targetVx != null && set.actualVx != null) ? (set.targetVx - set.actualVx) : null,
    }));
    return {
      week: sw,
      dateISO: sess.dateISO,
      label: sess.label,
      dayType: sess.dayType,
      slots,
      notes: sess.notes || null,
    };
  });

  // ── e1RM-trendit per kisaliike ──
  const compLifts = ["Lisäpainoleuanveto", "Muscle-up", "Lisäpainodippi", "Takakyykky"];
  const e1rmTrends = {};
  for (const liftName of compLifts) {
    const liftSets = (allSets || []).filter(set => set.movementName === liftName && set.externalLoadKg > 0);
    if (liftSets.length === 0) continue;
    const sortedSets = liftSets.sort((a, b) => (a.timestamp || a.dateISO || "").localeCompare(b.timestamp || b.dateISO || ""));
    const dataPoints = sortedSets.slice(-12).map(s => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      const e1rm = liftName === "Takakyykky"
        ? e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara)
        : e1rmSystem(bw, s.externalLoadKg || 0, s.reps || 1, vara);
      return { dateISO: s.dateISO, e1rm: Math.round(e1rm * 10) / 10, load: s.externalLoadKg, reps: s.reps, vx: s.actualVx };
    });
    if (dataPoints.length >= 2) {
      const first = dataPoints[0].e1rm;
      const latest = dataPoints[dataPoints.length - 1].e1rm;
      const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
      e1rmTrends[liftName] = {
        first, latest, deltaPct: Math.round(deltaPct * 10) / 10,
        dataPoints,
      };
    }
  }

  // ── HRV / MPV / BW-trendit ──
  const blockMeasurements = (measurements || []).filter(m => {
    const mw = getMesocycleWeek(mesocycle, m.dateISO);
    return block.prevWeeks.includes(mw) || mw === wk;
  }).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

  const trends = {
    hrv: blockMeasurements.filter(m => m.hrv != null).map(m => ({ dateISO: m.dateISO, value: m.hrv })),
    mpv: blockMeasurements.filter(m => m.mpv != null).map(m => ({ dateISO: m.dateISO, value: m.mpv })),
    bodyweight: blockMeasurements.filter(m => m.bodyweightKg != null).map(m => ({ dateISO: m.dateISO, value: m.bodyweightKg })),
  };

  // ── Anomaliat ──
  const anomalies = [];
  for (const sess of sessionAnalysis) {
    for (const slot of sess.slots) {
      if (slot.actual.actualVx === 0 && slot.role === "primary") {
        anomalies.push({ type: "failure-primary", week: sess.week, day: sess.label, movement: slot.movementName, prescribed: slot.prescribed, actual: slot.actual });
      }
      if (slot.vxDelta != null && Math.abs(slot.vxDelta) >= 2 && slot.role === "primary") {
        anomalies.push({ type: "vx-mismatch", week: sess.week, day: sess.label, movement: slot.movementName, vxDelta: slot.vxDelta, prescribed: slot.prescribed, actual: slot.actual });
      }
    }
  }

  // ── Aggregaatit ──
  // B1 K1 ratifioitu (HANDOFF.md §6 K1, 2026-05-25): totalSessions ja
  // completedSets johdetaan yhdestä rajauksesta (päättyneet blokkiviikot
  // prevBlockSessions, backfill mukana) jaetun _computeTuningCoreAggregates
  // -apufunktion kautta. Sama rajaus generic- ja end-of-cycle-funktioissa.
  const { totalSessions, completedSets } = _computeTuningCoreAggregates(prevBlockSessions, allSets);
  const vxHits = sessionAnalysis.reduce((acc, s) => {
    for (const slot of s.slots) {
      if (slot.prescribed.vx != null && slot.actual.actualVx != null) {
        acc.total++;
        // Hit: actual within ±1 of target
        if (Math.abs(slot.vxDelta || 0) <= 1) acc.hits++;
      }
    }
    return acc;
  }, { hits: 0, total: 0 });
  const aggregates = {
    totalSessions,
    completedSets,
    vxHitRate: vxHits.total > 0 ? Math.round((vxHits.hits / vxHits.total) * 100) : null,
    failureCount: anomalies.filter(a => a.type === "failure-primary").length,
  };

  // v4.34.28: deltaPctBase per blokki-vk + decisionTraces-yhteenveto (cowork-audit kohta 1.1).
  // AI ei voi nyt nähdä mitkä engine-säännöt rajoittivat blokkia → suosittelee jo-rajattuja
  // muutoksia "stagnaation korjaukseksi". Korjaus: lisää frequency-aggregaatti per rule-id.
  const blockDeltaPctBase = block.prevWeeks.map(w => {
    const wd = mesocycle.weekDefs?.find(wd => wd.week === w);
    return { week: w, deltaPctBase: wd?.deltaPctBase ?? null, label: wd?.label || null,
             heavyReps: wd?.heavyReps ?? null, heavyTargetVx: wd?.heavyTargetVx ?? null };
  });
  // Trace-frequency aggregointi (kerää rule-id-laskurit blokin sessioista)
  const blockSessionIds = new Set(prevBlockSessions.map(s => s.sessionId));
  const blockTraces = (decisionTraces || []).filter(t => {
    // recId-yhteys session:iin — käytä recId:n associated rec:in dateISO:ta jos saatavilla
    return t.recId; // hyväksy kaikki — filter on best-effort
  });
  const traceFrequency = {};
  for (const t of blockTraces) {
    if (!t.ruleId) continue;
    traceFrequency[t.ruleId] = (traceFrequency[t.ruleId] || 0) + 1;
  }
  const traceFrequencySorted = Object.entries(traceFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([ruleId, count]) => ({ ruleId, count }));

  // ── Seuraavan blokin prescribed ──
  // β H-001 B2/A2: normalisoi slot.note loadPct:n pohjalla — AI Block Tuning
  // -syötteen JSON + markdown + prompt -puolelle. data.js-templaatti pysyy
  // ennallaan (HANDOFF.md §3 scope-aita).
  const wp = mesocycle.weekPlans || [];
  const nextBlockPrescribed = block.nextWeeks.map(nw => {
    const wkPlan = wp[nw - 1];
    if (!wkPlan?.days) return null;
    return {
      week: nw,
      days: wkPlan.days.map(d => ({
        label: d.label,
        primary: _normalizeSlotForTuningSerialization((d.slots || []).find(s => s.role === "primary")),
        backoff: _normalizeSlotForTuningSerialization((d.slots || []).find(s => s.role === "backoff")),
        topSet: _normalizeSlotForTuningSerialization((d.slots || []).find(s => s.role === "secondary" || s.role === "calibration")),
      })),
    };
  }).filter(Boolean);

  // ── Markdown-narratiivi (atleetille) ──
  const markdown = buildMarkdownNarrative({ profile, block, currentWeek: wk, sessionAnalysis, e1rmTrends, trends, anomalies, aggregates, nextBlockPrescribed });

  // ── JSON-data (AI:lle) ──
  const json = {
    meta: {
      version: "4.34.0",
      generatedAt: new Date().toISOString(),
      currentWeek: wk,
      blockTransition: `${block.prevBlock} → ${block.nextBlock}`,
    },
    profile,
    completedBlock: {
      name: block.prevBlock,
      weeks: block.prevWeeks,
      sessions: sessionAnalysis,
      e1rmTrends,
      trends,
      anomalies,
      aggregates,
      // v4.34.28: deltaPctBase per vk + engine-rule-frequency (cowork-audit kohta 1.1)
      deltaPctBase: blockDeltaPctBase,
      engineRuleFrequency: traceFrequencySorted,
    },
    upcomingBlock: {
      name: block.nextBlock,
      weeks: block.nextWeeks,
      prescribed: nextBlockPrescribed,
    },
  };

  // ── AI-prompt (valmis copy-paste) ──
  const prompt = buildAiPrompt({ profile, block, currentWeek: wk, json, markdown });

  return {
    markdown,
    json,
    prompt,
    meta: {
      currentWeek: wk,
      blockTransition: `${block.prevBlock} → ${block.nextBlock}`,
      generatedAt: new Date().toISOString(),
      sessionsAnalyzed: totalSessions,
      anomaliesFound: anomalies.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// v4.34.48 — GENERIC AI-BLOCK-TUNING (kaikille ei-streetlifting-mesoille)
// ═══════════════════════════════════════════════════════════════
//
// generateBlockTuningPackage on hardkoodattu streetlifting_16w-mesolle:
// blokki-mappi (foundation/strength/intensity/peaking), kisaliikkeet
// (4 hardkoodattua), block.prevWeeks/nextWeeks. Tämä funktio on yleistys
// MILLE TAHANSA mesotyypille — käyttää weekDef.deltaPctBase < 0 -heuristiikkaa
// deload-tunnistukseen ja löytää primary-liikkeet dynaamisesti weekPlans:sta.
//
// Streetlifting_16w säilyy alkuperäisessä funktiossa (delegoidaan jos type matchaa).

function generateGenericBlockTuningPackage(ctx) {
  const { mesocycle, sessions, allSets, prs, currentWeekNum, settings } = ctx;

  if (!mesocycle) {
    return { error: "AI-Block-Tuning vaatii aktiivisen mesosyklin." };
  }
  // Streetlifting_16w käyttää alkuperäistä funktiota — ei tätä
  if (mesocycle.type === "streetlifting_16w") {
    return generateBlockTuningPackage(ctx);
  }

  const wk = currentWeekNum;
  const weekDefs = mesocycle.weekDefs || [];
  const weekDef = weekDefs.find(w => w.week === wk);

  // Deload-tunnistus: viikon deltaPctBase < 0
  if (!weekDef || weekDef.deltaPctBase >= 0) {
    const nextDeload = weekDefs.find(w => w.week > wk && w.deltaPctBase < 0);
    return {
      error: nextDeload
        ? `AI-Block-Tuning aktivoituu deload-viikoilla. Olet vk ${wk}. Seuraava deload: vk ${nextDeload.week}.`
        : `AI-Block-Tuning aktivoituu deload-viikoilla. Olet vk ${wk}. Tässä mesosyklissä ei ole tulevia deload-viikkoja.`,
    };
  }

  // Edellinen blokki = viikot ennen tätä deloadia, alkaen edellisestä deloadista (tai 1)
  const prevDeloads = weekDefs.filter(w => w.week < wk && w.deltaPctBase < 0).map(w => w.week);
  const blockStart = prevDeloads.length > 0 ? prevDeloads[prevDeloads.length - 1] + 1 : 1;
  const prevWeeks = [];
  for (let w = blockStart; w < wk; w++) prevWeeks.push(w);

  // Tuleva blokki = viikot tämän deloadin jälkeen, ennen seuraavaa deloadia (tai loppuun)
  const nextDeloads = weekDefs.filter(w => w.week > wk && w.deltaPctBase < 0).map(w => w.week);
  const blockEnd = nextDeloads.length > 0 ? nextDeloads[0] - 1 : (mesocycle.weekCount || wk);
  const nextWeeks = [];
  for (let w = wk + 1; w <= blockEnd; w++) nextWeeks.push(w);

  const blockLabel = prevWeeks.length > 0 ? `Vk ${prevWeeks[0]}-${prevWeeks[prevWeeks.length - 1]}` : `Vk ${wk}`;
  const nextBlockLabel = nextWeeks.length > 0 ? `Vk ${nextWeeks[0]}-${nextWeeks[nextWeeks.length - 1]}` : "Mesosykli päättyy";

  // Atleettiprofile
  const movementCfg = mesocycle.movementCfg || {};
  const bw = settings?.bodyweightKg || 80;
  const profile = {
    bw,
    weekCount: mesocycle.weekCount || 4,
    mesocycleType: mesocycle.type,
    movementCfg,
    cfgDriftHistory: (mesocycle.cfgDriftHistory || [])
      .filter(d => prevWeeks.includes(getMesocycleWeek(mesocycle, d.dateISO))),
    prs: (prs || []).map(p => ({ movement: p.movementName, value: p.value, dateISO: p.dateISO, context: p.context })),
  };

  // Edellisen blokin sessio-data
  const prevBlockSessions = (sessions || []).filter(s => {
    const sw = getMesocycleWeek(mesocycle, s.dateISO);
    return prevWeeks.includes(sw);
  }).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

  const sessionAnalysis = prevBlockSessions.map(sess => {
    const sessSets = (allSets || []).filter(set => set.sessionId === sess.sessionId);
    const sw = getMesocycleWeek(mesocycle, sess.dateISO);
    const slots = sessSets.map(set => ({
      movementName: set.movementName,
      role: set.setRole,
      prescribed: { reps: set.targetReps, vx: set.targetVx, loadKg: set.targetLoadKg, loadPct: set.targetLoadPct },
      actual: { reps: set.reps, actualVx: set.actualVx, loadKg: set.externalLoadKg, velocity: set.velocityMs },
      vxDelta: (set.targetVx != null && set.actualVx != null) ? (set.targetVx - set.actualVx) : null,
    }));
    return { week: sw, dateISO: sess.dateISO, label: sess.label, dayType: sess.dayType, slots };
  });

  // Etsi uniikit primary-liikkeet weekPlans:sta dynaamisesti
  const primaryMovements = new Set();
  for (const wp of (mesocycle.weekPlans || [])) {
    for (const d of (wp.days || [])) {
      for (const slot of (d.slots || [])) {
        if (slot.role === "primary" && slot.defaultMovementName) {
          primaryMovements.add(slot.defaultMovementName);
        }
      }
    }
  }

  // e1RM-trendit per primary-liike (käyttää e1rmAccessory:ia — generic, ei BW-laskua)
  const e1rmTrends = {};
  for (const liftName of primaryMovements) {
    const liftSets = (allSets || []).filter(set => set.movementName === liftName && set.externalLoadKg > 0);
    if (liftSets.length === 0) continue;
    const sortedSets = liftSets.sort((a, b) => (a.timestamp || a.dateISO || "").localeCompare(b.timestamp || b.dateISO || ""));
    const dataPoints = sortedSets.slice(-12).map(s => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      const e1rm = e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara);
      return { dateISO: s.dateISO, e1rm: Math.round(e1rm * 10) / 10, load: s.externalLoadKg, reps: s.reps, vx: s.actualVx };
    });
    if (dataPoints.length >= 2) {
      const first = dataPoints[0].e1rm;
      const latest = dataPoints[dataPoints.length - 1].e1rm;
      const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
      e1rmTrends[liftName] = { first, latest, deltaPct: Math.round(deltaPct * 10) / 10, dataPoints };
    }
  }

  // Anomaliat
  const anomalies = [];
  for (const sess of sessionAnalysis) {
    for (const slot of sess.slots) {
      if (slot.actual.actualVx === 0 && slot.role === "primary") {
        anomalies.push({ type: "failure-primary", week: sess.week, day: sess.label, movement: slot.movementName, prescribed: slot.prescribed, actual: slot.actual });
      }
      if (slot.vxDelta != null && Math.abs(slot.vxDelta) >= 2 && slot.role === "primary") {
        anomalies.push({ type: "vx-mismatch", week: sess.week, day: sess.label, movement: slot.movementName, vxDelta: slot.vxDelta, prescribed: slot.prescribed, actual: slot.actual });
      }
    }
  }

  // B1 K1 ratifioitu (HANDOFF.md §6 K1, 2026-05-25): yhtenäinen rajaus
  // jaetun _computeTuningCoreAggregates-apufunktion kautta. Generic-funktion
  // prevBlockSessions on dynaamisesti laskettu prevWeeks-rajauksella (rivi 6598).
  const { totalSessions, completedSets } = _computeTuningCoreAggregates(prevBlockSessions, allSets);
  const vxHits = sessionAnalysis.reduce((acc, s) => {
    for (const slot of s.slots) {
      if (slot.prescribed.vx != null && slot.actual.actualVx != null) {
        acc.total++;
        if (Math.abs(slot.vxDelta || 0) <= 1) acc.hits++;
      }
    }
    return acc;
  }, { hits: 0, total: 0 });
  const aggregates = {
    totalSessions, completedSets,
    vxHitRate: vxHits.total > 0 ? Math.round((vxHits.hits / vxHits.total) * 100) : null,
    failureCount: anomalies.filter(a => a.type === "failure-primary").length,
  };

  // Markdown-narratiivi
  const lines = [];
  lines.push(`# AI-Block-Tuning -analyysi (${mesocycle.type}, vk ${wk} deload)`);
  lines.push("");
  lines.push(`**Generoitu**: ${new Date().toLocaleDateString("fi-FI")}`);
  lines.push(`**Mesosykli**: ${mesocycle.type}, vk ${wk}/${profile.weekCount}`);
  lines.push(`**Atleettiprofile**: ${profile.bw} kg bw`);
  if (Object.keys(movementCfg).length > 0) {
    lines.push(`**Kalibrointi (1RM-arviot)**:`);
    for (const [name, cfg] of Object.entries(movementCfg)) {
      lines.push(`  - ${name}: ${cfg.e1rmExternal} kg`);
    }
  }
  lines.push("");
  lines.push(`## Edellisen blokin yhteenveto (${blockLabel})`);
  lines.push("");
  lines.push(`- Sessioita kirjattu: **${aggregates.totalSessions}**`);
  lines.push(`- Sarjoja yhteensä: **${aggregates.completedSets}**`);
  if (aggregates.vxHitRate != null) lines.push(`- Vx-target-hit-rate (±1): **${aggregates.vxHitRate}%**`);
  lines.push(`- Failure-tapauksia (V0 primary): **${aggregates.failureCount}**`);
  lines.push("");

  if (Object.keys(e1rmTrends).length > 0) {
    lines.push("### e1RM-trendit per päälike");
    lines.push("");
    lines.push("| Liike | Lähtö | Loppu | Δ% |");
    lines.push("|---|---|---|---|");
    for (const [name, t] of Object.entries(e1rmTrends)) {
      const arrow = t.deltaPct > 0 ? "📈" : t.deltaPct < 0 ? "📉" : "→";
      lines.push(`| ${name} | ${t.first} kg | ${t.latest} kg | ${arrow} ${t.deltaPct >= 0 ? "+" : ""}${t.deltaPct}% |`);
    }
    lines.push("");
  }

  if (profile.cfgDriftHistory && profile.cfgDriftHistory.length > 0) {
    lines.push("### Engine oppi tämän blokin aikana (CFG-DRIFT)");
    lines.push("");
    for (const d of profile.cfgDriftHistory) {
      lines.push(`- ${d.dateISO}: ${d.movName} ${d.fromCfg?.toFixed(1) || '?'} → **${d.toCfg?.toFixed(1)} kg** (+${(d.driftPct*100).toFixed(1)}%)`);
    }
    lines.push("");
  }

  if (anomalies.length > 0) {
    lines.push("### Anomaliat / risk-flags");
    lines.push("");
    for (const a of anomalies.slice(0, 8)) {
      if (a.type === "failure-primary") {
        lines.push(`- 🔴 **Failure (V0)** vk ${a.week}: ${a.movement} prescribed Vx${a.prescribed.vx}`);
      } else if (a.type === "vx-mismatch") {
        const direction = a.vxDelta > 0 ? "raskaampaa" : "kevyempää";
        lines.push(`- ⚠️ **Vx-mismatch** vk ${a.week}: ${a.movement} target Vx${a.prescribed.vx}, actual V${a.actual.actualVx} (${direction} kuin target)`);
      }
    }
    lines.push("");
  }

  lines.push(`## Tuleva blokki (${nextBlockLabel})`);
  lines.push("");
  lines.push(nextWeeks.length > 0
    ? `${nextWeeks.length} viikkoa, alkaa vk ${nextWeeks[0]}.`
    : "Tämä on viimeinen deload — mesosykli päättyy.");
  lines.push("");

  const markdown = lines.join("\n");

  // JSON
  const json = {
    meta: {
      version: "4.34.48",
      generatedAt: new Date().toISOString(),
      mesocycleType: mesocycle.type,
      currentWeek: wk,
      blockLabel,
      nextBlockLabel,
    },
    profile,
    completedBlock: {
      label: blockLabel, weeks: prevWeeks,
      sessions: sessionAnalysis, e1rmTrends, anomalies, aggregates,
    },
    upcomingBlock: { label: nextBlockLabel, weeks: nextWeeks },
  };

  // AI-prompt (yleinen versio, ei streetlifting-spesifi)
  const prompt = [
    `# AI-Block-Tuning analyysipyyntö`,
    ``,
    `Olet voimaharjoittelu-coach jolla on syvä ymmärrys progressiivisesta`,
    `ylikuormituksesta, periodisaatiosta ja autoregulaatiosta. Atletti on`,
    `juuri suorittanut deload-viikon ${mesocycle.type}-mesosyklissä ja siirtyy`,
    `seuraavaan blokkiin. Analysoi alla oleva data.`,
    ``,
    `## ATLETIN MESOSYKLI`,
    `Tyyppi: ${mesocycle.type}, ${profile.weekCount} viikkoa`,
    `Suoritettu blokki: ${blockLabel}`,
    `Tuleva blokki: ${nextBlockLabel}`,
    `Bodyweight: ${profile.bw} kg`,
    Object.keys(movementCfg).length > 0
      ? `\n### Kalibrointi (1RM-arviot)\n${Object.entries(movementCfg).map(([n, c]) => `- ${n}: ${c.e1rmExternal} kg`).join("\n")}`
      : "",
    ``,
    `## EDELLISEN BLOKIN DATA`,
    `\`\`\`json`,
    JSON.stringify(json.completedBlock, null, 2),
    `\`\`\``,
    ``,
    `## VASTAUKSESI MUOTO`,
    ``,
    `Anna 3 kategoriassa:`,
    `(A) **Sovellus-tason muutokset**: mitä atletti voi tehdä UI:ssa nyt`,
    `(B) **Rakenteelliset muutokset**: koodi-muutosehdotukset seuraavalle blokille`,
    `(C) **Mentaalinen koutsaus**: tekniikkavinkit, palautuminen, riskimanagement`,
    ``,
    `Älä myöntäile — jos blokki-toteutus oli puutteellinen, sano se rehellisesti.`,
  ].filter(Boolean).join("\n");

  return {
    markdown, json, prompt,
    meta: {
      mesocycleType: mesocycle.type,
      currentWeek: wk,
      blockLabel, nextBlockLabel,
      generatedAt: new Date().toISOString(),
      sessionsAnalyzed: totalSessions,
      anomaliesFound: anomalies.length,
    },
  };
}

function buildMarkdownNarrative({ profile, block, currentWeek, sessionAnalysis, e1rmTrends, trends, anomalies, aggregates, nextBlockPrescribed }) {
  const lines = [];
  lines.push(`# AI-Block-Tuning -analyysi — ${block.prevBlock} → ${block.nextBlock} (vk ${currentWeek})`);
  lines.push("");
  lines.push(`**Generoitu**: ${new Date().toLocaleDateString("fi-FI")}`);
  lines.push(`**Mesosykli**: streetlifting_16w, vk ${currentWeek}/16`);
  lines.push(`**Atleettiprofile**: ${profile.bw} kg bw, K=${profile.calibration.kyykkyExtKg} kg, L=${profile.calibration.leukaExtKg} kg, D=${profile.calibration.dippiExtKg} kg`);
  lines.push("");

  lines.push(`## Edellisen blokin yhteenveto (${block.prevBlock}, vk ${block.prevWeeks.join("-")})`);
  lines.push("");
  lines.push(`- Sessioita kirjattu: **${aggregates.totalSessions}**`);
  lines.push(`- Sarjoja yhteensä: **${aggregates.completedSets}**`);
  if (aggregates.vxHitRate != null) {
    lines.push(`- Vx-target-hit-rate (±1): **${aggregates.vxHitRate}%**`);
  }
  lines.push(`- Failure-tapauksia (V0 primary): **${aggregates.failureCount}**`);
  lines.push("");

  if (Object.keys(e1rmTrends).length > 0) {
    lines.push("### e1RM-trendit per kisaliike");
    lines.push("");
    lines.push("| Liike | Lähtö | Loppu | Δ% |");
    lines.push("|---|---|---|---|");
    for (const [name, t] of Object.entries(e1rmTrends)) {
      const arrow = t.deltaPct > 0 ? "📈" : t.deltaPct < 0 ? "📉" : "→";
      lines.push(`| ${name} | ${t.first} kg | ${t.latest} kg | ${arrow} ${t.deltaPct >= 0 ? "+" : ""}${t.deltaPct}% |`);
    }
    lines.push("");
  }

  // v4.34.43: cfg-drift-historia tämän blokin sisällä — näkyvyys siihen miten
  // engine on oppinut atletin todellisen kapasiteetin (cfg-baseline-päivitykset).
  if (profile.cfgDriftHistory && profile.cfgDriftHistory.length > 0) {
    lines.push("### CFG-DRIFT (engine on oppinut tämän blokin aikana)");
    lines.push("");
    lines.push("| Päivä | Liike | Cfg ennen | Cfg jälk. | Δ% | Signaali | Counter |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const d of profile.cfgDriftHistory) {
      lines.push(`| ${d.dateISO} | ${d.movName} | ${d.fromCfg?.toFixed(1) || '?'} kg | ${d.toCfg?.toFixed(1)} kg | +${(d.driftPct*100).toFixed(1)}% | ${d.signal} | ${d.counter} |`);
    }
    lines.push("");
    lines.push("*CFG-drift = engine päivittää cfg-baseline-arvoa kun atletti toistuvasti ylittää engineen syötettyjen perusteella laskettuja targetia. Velocity-signaali (primer-MPV-trend) priorisoidaan Vx-overshoot-signaalin yli kun riittävästi velocity-mittauksia (n ≥ 5).*");
    lines.push("");
  }

  if (trends.hrv.length > 0 || trends.mpv.length > 0 || trends.bodyweight.length > 0) {
    lines.push("### Recovery-/mittari-trendit");
    lines.push("");
    if (trends.hrv.length > 0) {
      const hrvFirst = trends.hrv[0].value, hrvLast = trends.hrv[trends.hrv.length - 1].value;
      const hrvDelta = hrvFirst > 0 ? Math.round(((hrvLast - hrvFirst) / hrvFirst) * 1000) / 10 : 0;
      lines.push(`- **HRV**: ${trends.hrv.length} mittausta, ${hrvFirst.toFixed(1)} → ${hrvLast.toFixed(1)} (${hrvDelta >= 0 ? "+" : ""}${hrvDelta}%)`);
    }
    if (trends.mpv.length > 0) {
      const mpvFirst = trends.mpv[0].value, mpvLast = trends.mpv[trends.mpv.length - 1].value;
      const mpvDelta = mpvFirst > 0 ? Math.round(((mpvLast - mpvFirst) / mpvFirst) * 1000) / 10 : 0;
      lines.push(`- **MPV** (yläraaja-readiness): ${trends.mpv.length} mittausta, ${mpvFirst.toFixed(2)} → ${mpvLast.toFixed(2)} m/s (${mpvDelta >= 0 ? "+" : ""}${mpvDelta}%)`);
    }
    if (trends.bodyweight.length > 0) {
      const bwFirst = trends.bodyweight[0].value, bwLast = trends.bodyweight[trends.bodyweight.length - 1].value;
      const bwDelta = Math.round((bwLast - bwFirst) * 10) / 10;
      lines.push(`- **Bodyweight**: ${bwFirst} → ${bwLast} kg (${bwDelta >= 0 ? "+" : ""}${bwDelta} kg)`);
    }
    lines.push("");
  }

  if (anomalies.length > 0) {
    lines.push("### Anomaliat / risk-flags");
    lines.push("");
    for (const a of anomalies.slice(0, 8)) {
      if (a.type === "failure-primary") {
        lines.push(`- 🔴 **Failure (V0)** vk ${a.week} ${a.day}: ${a.movement} prescribed Vx${a.prescribed.vx}, actual V0 — paino oli liian raskas`);
      } else if (a.type === "vx-mismatch") {
        const direction = a.vxDelta > 0 ? "raskaampaa kuin target" : "kevyempää kuin target";
        lines.push(`- ⚠️ **Vx-mismatch** vk ${a.week} ${a.day}: ${a.movement} target Vx${a.prescribed.vx}, actual V${a.actual.actualVx} (${a.vxDelta > 0 ? "+" : ""}${a.vxDelta} delta — ${direction})`);
      }
    }
    lines.push("");
  }

  lines.push(`## Seuraava blokki (${block.nextBlock}, vk ${block.nextWeeks.join("-")})`);
  lines.push("");
  lines.push("Suunniteltu rakenne (prescribed):");
  lines.push("");
  for (const wk of nextBlockPrescribed) {
    lines.push(`### Vk ${wk.week}`);
    for (const d of wk.days) {
      const p = d.primary;
      const b = d.backoff;
      const t = d.topSet;
      const parts = [];
      if (p) parts.push(`Primary: ${p.defaultMovementName} ${p.sets}×${p.reps} V${p.targetVx} @${Math.round((p.loadPct || 0) * 100)}%`);
      if (b) parts.push(`Backoff: ${b.sets}×${b.reps} @${Math.round((b.loadPct || 0) * 100)}%`);
      if (t) parts.push(`Top: ${t.note || ""}`);
      lines.push(`- ${d.label}: ${parts.join(" | ")}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("**Ohje**: vie tämä paketti Claude AI:lle (Claude.ai) tai ChatGPT:lle. Paste:aa AI-prompt, joka sisältää koko datan + kysymykset. AI palauttaa A/B/C-kategorisoidut suositukset.");
  return lines.join("\n");
}

function buildAiPrompt({ profile, block, currentWeek, json, markdown }) {
  return `KONTEKSTI:
Streetlifter, ${profile.bw} kg bw, 15+ v kokemus.
Mesosykli: streetlifting_16w, currently vk ${currentWeek}/16.
Block-transition: ${block.prevBlock} → ${block.nextBlock}.
Kisapäivä: ${profile.competitionDate}.
Tavoite: takakyykky 200+ kg muscle memory -palautuksena.

PR-historia: ${profile.prs.map(p => `${p.movement} ${p.value} kg (${p.context})`).join(", ") || "ei kirjattu"}

DATA (edellinen blokki + recovery-trendit + anomaliat + seuraava blokki suunniteltuna):

${markdown}

═══════════════════════════════════════════════════════════════════
RAW JSON (tarkka data):
═══════════════════════════════════════════════════════════════════

\`\`\`json
${JSON.stringify(json, null, 2)}
\`\`\`

═══════════════════════════════════════════════════════════════════
TEHTÄVÄ:
═══════════════════════════════════════════════════════════════════

Analysoi edellisen blokin (${block.prevBlock}, vk ${block.prevWeeks.join("-")}) suoritus
ja ehdota seuraavan blokin (${block.nextBlock}, vk ${block.nextWeeks.join("-")})
optimointia atleettispesifisesti.

KÄYTÄ:
- Pelland 2024, Refalo 2023, Robinson 2025, Helms 2018, Tuchscherer RTS,
  Israetel JTS/RP, Bruusgaard 2010, Sánchez-Moreno 2017/2020, Plews 2013
- Streetlifting-no-evidence-guard: jos kysymys streetlifting-spesifi
  (SSW/SLRY) ja peer-reviewed-data ei löydy → mainitse eksplisiittisesti

VASTAA TÄSSÄ FORMAATISSA (atleetti vie suositukset eri kategorioihin):

\`\`\`json
{
  "blockExecutionVerdict": {
    "summary": "1-2 lausetta yleisarvio",
    "progressionRate": "actual vs predicted (%)",
    "recoveryStatus": "GREEN | YELLOW | RED",
    "concerns": ["list of risk flags"]
  },

  "categoryA_appOverrides": [
    {
      "type": "movement_swap | load_calibration | bodyweight_update | extra_deload | accessory_drop",
      "details": "exact UI action atleetti tekee",
      "rationale": "1-2 lausetta + sitaatti",
      "priority": "high | medium | low"
    }
  ],

  "categoryB_codeChanges": [
    {
      "type": "loadPct_adjust | sets_reps_adjust | backoff_style | engine_param | new_movement",
      "scope": "vk X-Y, päivä, slot",
      "from": "current value",
      "to": "proposed value",
      "rationale": "perustelut + sitaatti",
      "priority": "high | medium | low",
      "claudeCodePromptHint": "valmis prompt minulle (Claude Code) toteutusta varten"
    }
  ],

  "categoryC_athleteCoaching": [
    {
      "topic": "technique | recovery | mental | nutrition | risk-management",
      "observation": "mitä datasta nähdään",
      "advice": "konkreettinen toiminta atleetille",
      "rationale": "perustelut"
    }
  ],

  "criticalQuestions": [
    "kysymyksiä joihin Claude haluaa atleetin vastaavan ennen finaalin lukitsemista"
  ],

  "citations": [
    "Tekijä Vuosi — relevantti löydös"
  ]
}
\`\`\`

OUTPUT-VAATIMUKSET:
- Ole spesifi (kg, %, sets/reps tarkasti — ei yleistasoisia neuvoja)
- Erottele vakaa konsensus / aktiivinen debate / heuristiikka
- Kategoria B: anna minulle (Claude Code) tarpeeksi tietoa toteutukseen
  ilman lisäkysymyksiä
- Älä ehdota muutoksia jotka ovat jo toteutettu (esim. v4.32.9 M14
  topSingleFirst — tarkista että et päällekkäistä työtä)
- Älä myöntäile — jos block-execution oli puutteellinen, sano se`;
}

// ═══════════════════════════════════════════════════════════════
// END-OF-CYCLE TUNING — v4.34.27 (cowork-arvioinnin kohta 5)
// ═══════════════════════════════════════════════════════════════
//
// generateBlockTuningPackage:n sisko, mutta MESOCYCLE-AGNOSTIC. Kun mesocycle
// lähestyy loppua (viim. 7 päivää tai jo päättynyt), aktivoi kortti Asetuksissa
// joka generoi koko syklin yhteenvedon + ehdotuksen seuraavalle blokille.
//
// Toimii kaikille mesocycle.type-arvoille:
//   - streetlifting_16w: foundation/strength/intensity/peaking-blokit erikseen
//   - default (4 vk): yksi yhtenäinen sykli
//   - peaking, custom, render: vastaavasti yksi sykli
//
// Trigger:
//   - mesocycle.weekCount - currentWeekNum < 1 (viim. viikko, ≤ 7 päivää lopulle)
//   - tai pos?.reason === "after-end" (jo päättynyt)

function generateEndOfCycleTuningPackage(ctx) {
  const { mesocycle, sessions, allSets, measurements, prs, currentWeekNum, settings, decisionTraces } = ctx;

  if (!mesocycle) {
    return { error: "End-of-Cycle Tuning vaatii aktiivisen mesosyklin." };
  }

  const weekCount = mesocycle.weekCount || 4;
  const wk = currentWeekNum;
  const isFinalWeek = wk !== null && wk >= weekCount;
  const isAfterEnd = wk === null;
  if (!isFinalWeek && !isAfterEnd) {
    const weeksLeft = weekCount - wk;
    return {
      error: `End-of-Cycle Tuning aktivoituu viim. viikolla (≤ 7 pv lopulle). Olet vk ${wk}/${weekCount}, jäljellä ${weeksLeft} vk.`,
    };
  }

  // ── Atleettiprofile ──
  const cal = mesocycle.streetliftingConfig?.calibration || {};
  const bw = settings?.bodyweightKg || 91;
  const profile = {
    bw,
    weekCount,
    mesocycleType: mesocycle.type || "default",
    competitionDate: mesocycle.streetliftingConfig?.competitionDate || null,
    calibration: cal,
    prs: (prs || []).map(p => ({ movement: p.movementName, value: p.value, dateISO: p.dateISO, context: p.context })),
  };

  // ── Koko syklin sessio-data ──
  const cycleSessions = (sessions || []).filter(s => {
    const sw = getMesocycleWeek(mesocycle, s.dateISO);
    return sw !== null && sw >= 1 && sw <= weekCount;
  }).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

  const sessionAnalysis = cycleSessions.map(sess => {
    const sessSets = (allSets || []).filter(set => set.sessionId === sess.sessionId);
    const sw = getMesocycleWeek(mesocycle, sess.dateISO);
    const slots = sessSets.map(set => ({
      movementName: set.movementName,
      role: set.setRole,
      prescribed: { reps: set.targetReps, vx: set.targetVx, loadKg: set.targetLoadKg, loadPct: set.targetLoadPct },
      actual: { reps: set.reps, actualVx: set.actualVx, loadKg: set.externalLoadKg, velocity: set.velocityMs },
      vxDelta: (set.targetVx != null && set.actualVx != null) ? (set.targetVx - set.actualVx) : null,
    }));
    return {
      week: sw, dateISO: sess.dateISO, label: sess.label, dayType: sess.dayType, slots, notes: sess.notes || null,
    };
  });

  // ── e1RM-trendit per päämuovikatselma (mesocycle-agnostic: hae kaikki primary-merkityt) ──
  // Streetlifting_16w käyttää 4 kisaliikettä; muille mesocycleille hae kaikki liikkeet joista on dataa.
  const compLifts = mesocycle.type === "streetlifting_16w"
    ? ["Lisäpainoleuanveto", "Muscle-up", "Lisäpainodippi", "Takakyykky"]
    : Array.from(new Set((allSets || []).filter(s => s.movementName).map(s => s.movementName)))
        .filter(name => {
          const sets = (allSets || []).filter(s => s.movementName === name && s.externalLoadKg > 0);
          return sets.length >= 3; // vähintään 3 settiä että trendi on järkevä
        })
        .slice(0, 6); // max 6 liikettä jotta data ei räjähdä

  const e1rmTrends = {};
  for (const liftName of compLifts) {
    const liftSets = (allSets || []).filter(set => set.movementName === liftName && set.externalLoadKg > 0);
    if (liftSets.length === 0) continue;
    const sortedSets = liftSets.sort((a, b) => (a.timestamp || a.dateISO || "").localeCompare(b.timestamp || b.dateISO || ""));
    const dataPoints = sortedSets.slice(-12).map(s => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      const isBarbell = liftName === "Takakyykky" || liftName === "Etukyykky" ||
                        liftName === "Penkkipunnerrus" || liftName === "Maastaveto" || liftName === "Pystypunnerrus";
      const e1rm = isBarbell
        ? e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara)
        : e1rmSystem(bw, s.externalLoadKg || 0, s.reps || 1, vara);
      return { dateISO: s.dateISO, e1rm: Math.round(e1rm * 10) / 10, load: s.externalLoadKg, reps: s.reps, vx: s.actualVx };
    });
    if (dataPoints.length >= 2) {
      const first = dataPoints[0].e1rm;
      const latest = dataPoints[dataPoints.length - 1].e1rm;
      const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
      e1rmTrends[liftName] = { first, latest, deltaPct: Math.round(deltaPct * 10) / 10, dataPoints };
    }
  }

  // ── Koko syklin recovery-/mittari-trendit ──
  const cycleMeasurements = (measurements || []).filter(m => {
    const mw = getMesocycleWeek(mesocycle, m.dateISO);
    return mw !== null && mw >= 1 && mw <= weekCount;
  }).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

  const trends = {
    hrv: cycleMeasurements.filter(m => m.hrv != null).map(m => ({ dateISO: m.dateISO, value: m.hrv })),
    mpv: cycleMeasurements.filter(m => m.mpv != null).map(m => ({ dateISO: m.dateISO, value: m.mpv })),
    bodyweight: cycleMeasurements.filter(m => m.bodyweightKg != null).map(m => ({ dateISO: m.dateISO, value: m.bodyweightKg })),
  };

  // ── Anomaliat (V0 primaryjen failure, Vx-mismatch ±2+) ──
  const anomalies = [];
  for (const sess of sessionAnalysis) {
    for (const slot of sess.slots) {
      if (slot.actual.actualVx === 0 && slot.role === "primary") {
        anomalies.push({ type: "failure-primary", week: sess.week, day: sess.label, movement: slot.movementName, prescribed: slot.prescribed, actual: slot.actual });
      }
      if (slot.vxDelta != null && Math.abs(slot.vxDelta) >= 2 && slot.role === "primary") {
        anomalies.push({ type: "vx-mismatch", week: sess.week, day: sess.label, movement: slot.movementName, vxDelta: slot.vxDelta, prescribed: slot.prescribed, actual: slot.actual });
      }
    }
  }

  // ── Aggregaatit ──
  // B1 K1 ratifioitu (HANDOFF.md §6 K1, 2026-05-25): koko-syklin tasolla rajaus
  // on cycleSessions (vk 1..weekCount), backfill mukana. Sama jaettu apufunktio
  // kuin block-funktioissa. End-of-cycle pitää vxMismatchCount-lisämetriikan.
  const { totalSessions, completedSets } = _computeTuningCoreAggregates(cycleSessions, allSets);
  const vxHits = sessionAnalysis.reduce((acc, s) => {
    for (const slot of s.slots) {
      if (slot.prescribed.vx != null && slot.actual.actualVx != null) {
        acc.total++;
        if (Math.abs(slot.vxDelta || 0) <= 1) acc.hits++;
      }
    }
    return acc;
  }, { hits: 0, total: 0 });
  const aggregates = {
    totalSessions,
    completedSets,
    vxHitRate: vxHits.total > 0 ? Math.round((vxHits.hits / vxHits.total) * 100) : null,
    failureCount: anomalies.filter(a => a.type === "failure-primary").length,
    vxMismatchCount: anomalies.filter(a => a.type === "vx-mismatch").length,
  };

  // v4.34.28: deltaPctBase per vk + engine-rule-frequency koko sykliltä (cowork-audit kohta 1.1)
  const cycleDeltaPctBase = (mesocycle.weekDefs || []).map(wd => ({
    week: wd.week, deltaPctBase: wd.deltaPctBase ?? null, label: wd.label || null,
    heavyReps: wd.heavyReps ?? null, heavyTargetVx: wd.heavyTargetVx ?? null,
  }));
  const cycleTraceFreq = {};
  for (const t of (decisionTraces || [])) {
    if (!t.ruleId) continue;
    cycleTraceFreq[t.ruleId] = (cycleTraceFreq[t.ruleId] || 0) + 1;
  }
  const cycleTraceFreqSorted = Object.entries(cycleTraceFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([ruleId, count]) => ({ ruleId, count }));

  // ── Markdown-narratiivi ──
  const markdown = buildEndOfCycleMarkdown({
    profile, currentWeek: wk || weekCount, weekCount, sessionAnalysis,
    e1rmTrends, trends, anomalies, aggregates, mesocycleType: mesocycle.type || "default",
  });

  // ── JSON-data (Claude/AI:lle) ──
  const json = {
    meta: {
      version: "4.34.28",
      generatedAt: new Date().toISOString(),
      currentWeek: wk,
      weekCount,
      mesocycleType: mesocycle.type || "default",
      isAfterEnd,
    },
    profile,
    completedCycle: {
      weeks: Array.from({ length: weekCount }, (_, i) => i + 1),
      sessions: sessionAnalysis,
      e1rmTrends, trends, anomalies, aggregates,
      // v4.34.28: deltaPctBase + engineRuleFrequency
      deltaPctBase: cycleDeltaPctBase,
      engineRuleFrequency: cycleTraceFreqSorted,
    },
  };

  // ── AI-prompt (valmis copy-paste) ──
  const prompt = buildEndOfCyclePrompt({ profile, currentWeek: wk || weekCount, weekCount, json, markdown });

  return {
    markdown, json, prompt,
    meta: {
      currentWeek: wk, weekCount, mesocycleType: mesocycle.type || "default",
      generatedAt: new Date().toISOString(),
      sessionsAnalyzed: totalSessions,
      anomaliesFound: anomalies.length,
    },
  };
}

function buildEndOfCycleMarkdown({ profile, currentWeek, weekCount, sessionAnalysis, e1rmTrends, trends, anomalies, aggregates, mesocycleType }) {
  const lines = [];
  lines.push(`# End-of-Cycle Tuning -analyysi — koko sykli (${weekCount} vk)`);
  lines.push("");
  lines.push(`**Generoitu**: ${new Date().toLocaleDateString("fi-FI")}`);
  lines.push(`**Mesocycle**: ${mesocycleType}, vk ${currentWeek}/${weekCount}`);
  lines.push(`**Atleettiprofile**: ${profile.bw} kg bw`);
  if (profile.calibration?.kyykkyExtKg) {
    lines.push(`**Kalibrointi**: K=${profile.calibration.kyykkyExtKg} kg, L=${profile.calibration.leukaExtKg} kg, D=${profile.calibration.dippiExtKg} kg`);
  }
  if (profile.competitionDate) {
    lines.push(`**Kisapäivä**: ${profile.competitionDate}`);
  }
  lines.push("");

  lines.push(`## Syklin yhteenveto`);
  lines.push("");
  lines.push(`- Sessioita kirjattu: **${aggregates.totalSessions}**`);
  lines.push(`- Sarjoja yhteensä: **${aggregates.completedSets}**`);
  if (aggregates.vxHitRate != null) {
    lines.push(`- Vx-target-hit-rate (±1): **${aggregates.vxHitRate}%**`);
  }
  lines.push(`- Failure-tapauksia (V0 primary): **${aggregates.failureCount}**`);
  lines.push(`- Vx-mismatch (±2+): **${aggregates.vxMismatchCount}**`);
  lines.push("");

  if (Object.keys(e1rmTrends).length > 0) {
    lines.push("### e1RM-trendit");
    lines.push("");
    lines.push("| Liike | Lähtö | Loppu | Δ% |");
    lines.push("|---|---|---|---|");
    for (const [name, t] of Object.entries(e1rmTrends)) {
      const arrow = t.deltaPct > 0 ? "📈" : t.deltaPct < 0 ? "📉" : "→";
      lines.push(`| ${name} | ${t.first} kg | ${t.latest} kg | ${arrow} ${t.deltaPct >= 0 ? "+" : ""}${t.deltaPct}% |`);
    }
    lines.push("");
  }

  if (trends.hrv.length > 0 || trends.mpv.length > 0 || trends.bodyweight.length > 0) {
    lines.push("### Recovery-/mittari-trendit");
    lines.push("");
    if (trends.hrv.length > 0) {
      const first = trends.hrv[0].value, last = trends.hrv[trends.hrv.length - 1].value;
      const delta = first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0;
      lines.push(`- **HRV**: ${trends.hrv.length} mittausta, ${first.toFixed(1)} → ${last.toFixed(1)} (${delta >= 0 ? "+" : ""}${delta}%)`);
    }
    if (trends.mpv.length > 0) {
      const first = trends.mpv[0].value, last = trends.mpv[trends.mpv.length - 1].value;
      const delta = first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0;
      lines.push(`- **MPV**: ${trends.mpv.length} mittausta, ${first.toFixed(2)} → ${last.toFixed(2)} m/s (${delta >= 0 ? "+" : ""}${delta}%)`);
    }
    if (trends.bodyweight.length > 0) {
      const first = trends.bodyweight[0].value, last = trends.bodyweight[trends.bodyweight.length - 1].value;
      const delta = Math.round((last - first) * 10) / 10;
      lines.push(`- **Kehonpaino**: ${trends.bodyweight.length} mittausta, ${first.toFixed(1)} → ${last.toFixed(1)} kg (${delta >= 0 ? "+" : ""}${delta} kg)`);
    }
    lines.push("");
  }

  if (anomalies.length > 0) {
    lines.push("### Anomaliat");
    lines.push("");
    for (const a of anomalies.slice(0, 12)) {
      if (a.type === "failure-primary") {
        lines.push(`- 🔴 **vk ${a.week} ${a.day}**: ${a.movement} V0-failure (target ${a.prescribed.reps}×V${a.prescribed.vx}, actual ${a.actual.reps} reps)`);
      } else if (a.type === "vx-mismatch") {
        lines.push(`- 🟡 **vk ${a.week} ${a.day}**: ${a.movement} Vx-delta ${a.vxDelta > 0 ? "+" : ""}${a.vxDelta} (target V${a.prescribed.vx}, actual V${a.actual.actualVx})`);
      }
    }
    if (anomalies.length > 12) lines.push(`- ...ja ${anomalies.length - 12} muuta`);
    lines.push("");
  }

  lines.push(`## Seuraava sykli — pohdittavaa AI:lle`);
  lines.push("");
  lines.push(`Vie tämä paketti Claude/ChatGPT:lle saadaksesi ehdotuksen seuraavan mesocyclen rakenteeksi.`);
  lines.push(`Kysy spesifisti:`);
  lines.push(`1. Mitkä blokit (foundation/strength/intensity/peaking) toimivat hyvin, mitkä eivät?`);
  lines.push(`2. Pitäisikö volyymi-bias / intensity-bias muuttua seuraavassa syklissä?`);
  lines.push(`3. Mitkä slot-rotaatiot (esim. accessory-vaihdot) tuottivat eniten hyötyä?`);
  lines.push(`4. Onko peaking-protokolla A/B-vaihdettava (esim. Bosquet 2007 vs Pritchard NZ raw)?`);
  lines.push(`5. Mikä konkreettinen muutos parantaisi seuraavaa sykliä eniten?`);

  return lines.join("\n");
}

function buildEndOfCyclePrompt({ profile, currentWeek, weekCount, json, markdown }) {
  return `# End-of-Cycle Tuning -pyyntö

Olen edistynyt streetlifting-/voimanostoatleetti (15+v kokemus). Käytän LeVe AI -valmennussovellusta jonka olen rakentanut itselleni Claude Code -työkalulla.

## Konteksti
${profile.competitionDate ? `Kisapäivä: ${profile.competitionDate}.` : "Ei spesifistä kisapäivää."}
Mesocycle: ${json.meta.mesocycleType}, vk ${currentWeek}/${weekCount}.
Profile: ${profile.bw} kg bw.
${profile.calibration?.kyykkyExtKg ? `Kalibrointi: K=${profile.calibration.kyykkyExtKg}, L=${profile.calibration.leukaExtKg}, D=${profile.calibration.dippiExtKg} kg.` : ""}

## Pyyntö
Analysoi koko syklin data (alla JSON) ja palauta ehdotus seuraavan mesocyclen rakenteeksi. Tärkein kysymys: **mikä konkreettinen muutos parantaisi seuraavaa sykliä eniten?**

## Vaadittu vastausformaatti

\`\`\`json
{
  "executive_summary": "1-2 lauseen kiteytys mitä mennyt sykli kertoi atleetin nykytasosta + isoin oppimisaihe.",
  "next_cycle_proposal": {
    "structure": "esim. '4-blokki 16 vk: hypertrofia 4 + voima 4 + intensifikaatio 4 + peaking 4'",
    "volume_bias": "low | balanced | high",
    "intensity_bias": "low | balanced | high",
    "primary_focus": "esim. 'leuanveto-volyymi' tai 'kyykky-tekniikka'",
    "rationale": "lyhyt perustelu (3-5 lausetta)"
  },
  "key_changes_from_previous": [
    { "category": "A | B | C", "change": "konkreettinen muutos", "why": "syy datasta" }
  ],
  "athlete_critical_questions": [
    "kysymys 1 atleetin pohdittavaksi",
    "kysymys 2..."
  ],
  "citations": ["lähde 1 (esim. 'Bosquet 2007 tapering meta')"]
}
\`\`\`

Kategoria A = sovellus-tason muutokset (atleetti applaa UI:ssa: slot-swap, e1RM-update, BW)
Kategoria B = rakenteelliset muutokset (Claude Code -tasolla: %-progressio, set/rep, backoff-tyyli)
Kategoria C = mentaalinen koutsaus (atleetti sisäistää: tekniikkavinkit, riskimanagement)

## Data (mennyt sykli)

\`\`\`json
${JSON.stringify(json, null, 2)}
\`\`\`

## Ohjeet
- Älä ehdota muutoksia jotka rikkovat käyttäjän nykyistä työkalua
- Älä myöntäile — jos sykli oli puutteellinen, sano se
- Erottele vakaa konsensus / aktiivinen debate / heuristiikka
- Streetlifting-spesifeille kysymyksille (peaking, peakkari-protokolla) on usein vain coaching-konsensus, ei RCT — myönnä se
- Jos ehdotat A/B-vertailua, suunnittele se SCED-tyyppisenä (single-case experimental design)`;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  // Constants
  DAY_TYPE_MULTIPLIERS,
  DAY_TYPE_SET_RECIPES,
  REST_RECOMMENDATIONS,
  pickRestForExercise,
  READINESS_CLASSES,
  SUGGESTED_NEXT_TEMPLATE,
  // Math
  median,
  mad,
  madSigma,
  zScore,
  avg,
  clamp,
  roundToHalf,
  // e1RM
  e1rmSystem,
  e1rmExternal,
  e1rmAccessory,
  targetLoadFromE1RM,
  vRepsToExpectedPct,
  resolveTier,
  tier1Or2,
  // Baseline
  computeBaseline,
  classifyReadinessZ,
  // Readiness
  velocityReadiness,
  hrvReadiness,
  varaReadiness,
  upperBodyMpvReadiness,
  // v4.34.0 AI-Block-Tuning
  generateBlockTuningPackage,
  // v4.34.48 — yleinen versio, toimii kaikille ei-streetlifting-mesoille
  generateGenericBlockTuningPackage,
  generateEndOfCycleTuningPackage,
  // β H-001 B1 — jaettu aggregaatti-apufunktio (export vain testikäyttöön)
  _computeTuningCoreAggregates,
  // β H-001 B2/A2 — slot-note-normalisointi (export vain testikäyttöön)
  _normalizeSlotForTuningSerialization,
  combineReadiness,
  // Mesocycle
  getMesocycleWeek,
  getWeekDef,
  getTodayPlan,
  deltaPctRaw,
  calibrateMesocycle,
  // Vara
  varaFeedback,
  varaTrendCorrection,
  e1rmMomentumBonus,
  grossMismatchCorrection,
  // v4.34.34 BUG 2 (b)
  firstSetCapacityBonus,
  // v4.34.41 — intra-session-bump
  intraSessionLoadAdjustSuggestion,
  // Break
  breakAnalysis,
  mesocycleBreakReset,
  // Failure
  failureReaction,
  // Accessory
  accessoryProgression,
  updateMovementProgressFromSets,
  initialWeightFrom1RM,
  // Velocity
  velocityLossPercent,
  // Recommend
  recommend,
  recommendPeaking,
  // v4.34.14: rate-limit-anchor exposed for tests + diagnostics
  computeRateLimitAnchor,
  // v4.35.0: eliittitason progressio-malli (Helms 2018, Cumming 2024, Issurin 2010)
  PROGRESSION_CONFIG,
  computeProgressionTarget,
  // Variant periodization
  DEFAULT_VARIANT_MODIFIERS,
  getDefaultVariantForDayType,
  variantLoadModifier,
  variantRepOverride,
  assignVariantRotation,
  // Peaking
  computeAttemptLoads,
  computeStreetliftingOpenerStrategy,
  // v4.30.3: ennuste
  predictE1RMEndOfProgram,
  computeStreetliftingFinalProjection,
  // Weekly
  weeklyStimulus,
  // Stagnation
  checkStagnation,
  // Accessory slot resolution (v4.11)
  phaseForWeek,
  resolveAccessorySlot,
  resolveMesocyclePosition,
  isInsertedDeloadWeek,
  isReplacedDeloadWeek,
  isDeloadOverrideWeek,
  getEffectiveWeekCount,
  resolveDayPlanSlots,
  suggestAccessorySwaps,
  // Default plan
  generateDefaultDayPlan,
  // Block periodization (v4.25 P1-10)
  getBlockForWeek,
  getAccessoryBlockScalar,
  // MU autoregulation (v4.25 P1-9)
  adjustMULoad,
  // Failure lockout (v4.25 P2-16)
  hadFailureLastSession,
  // Load-velocity profile (v4.25.1 — Enode)
  computeLoadVelocityProfile,
  MOVEMENT_MVT,
  DEFAULT_MVT,
  ENODE_LOW_VELOCITY_CAVEAT,
  computeVBTPromotionStatus,
  VBT_MIN_ANCHORS,
  VBT_ANCHOR_WINDOW_DAYS,
  VBT_PROMOTE_THRESHOLD,
  VBT_DEMOTE_THRESHOLD,
  VBT_STALE_PROFILE_DAYS,
  VBT_FORCE_RECAL_DAYS,
  // v4.38.1 (Phase 2) VL-cap autoregulaatio
  VL_CAP_PER_BLOCK,
  vlCapForContext,
  // v4.38.3 (Phase 3.5) Yksilöllinen cap RTF-mallista
  BLOCK_PHASE_TARGET_RIR,
  // v4.38.2 (Phase 3) RTF-velocity-malli (Jukic 2024)
  computeRtfVelocityModel,
  vlCapFromRtfModel,
  RTF_MIN_REPS_PER_SET,
  RTF_MIN_SESSIONS_FOR_MODEL,
  RTF_R2_THRESHOLD_RELIABLE,
  RTF_R2_THRESHOLD_PREVIEW,
  // v4.38.3 (Phase 4) Vx-velocity-konfliktin tunnistus
  predictVxFromVelocity,
  VX_CONFLICT_DELTA,
  // v4.38.4 (Phase 2.7) kaksisuuntainen autoregulaatio
  targetRep1VelocityRange,
  DEFAULT_RTF_SLOPE,
  // v4.49.2 Q1: grindy-bias-detection slot.targetVx-hybridille
  detectGrindyBias,
  // v4.50.0+ (Track B 2D-δ): Adaptive multi-suggestion -tier-generaattori
  generateSuggestions,
  // v4.38.5 — kisaliikkeiden tunnistus fallback nimellä
  isCompetitionLiftMovement,
  COMPETITION_LIFT_NAMES_FALLBACK,
  computePeakingDecisionTreeCard,
  // Readiness test
  readinessTestLoad,
  // Speed
  speedDayLoad,
  // HRV
  ouraHRVtoLnRMSSD,
  // Adaptive
  analyzeSessionAdaptation,
  applyAdaptations,
  // Future workouts
  getFutureWorkouts,
  // Missed prior sessions
  findMissedPriorSessions,
  // Elite check
  eliteVolumeCheck,
  // Movement e1RM
  computeMovementE1RM,
  computeMovementE1RMHistory,
  // v4.35.1: yhtenäinen e1RM (cal → plan-based → median, sama kuin recommend())
  computeMovementE1RMBest,
  // v4.34.34 movement-load-style resolver
  isSystemLoadMovement,
  // v4.34.44: cfg-baseline-resolveri (TASO 1: movementCfg, TASO 2: streetliftingConfig)
  getCfgBaselineForMovement,
};
