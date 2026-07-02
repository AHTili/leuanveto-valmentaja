// tools/wizard-pilot.mjs — Wizard-materialisaation ASSERTOIVA regressioportti (K5, retroauditti).
//
// Tausta: engine-pilot (recommend()-kuormapolku) + selaintestit (?test=1) ovat RAKENTEELLISESTI
// SOKEITA koko wizard-post-process-pinnalle — todiste: engine-pilot pysyi 64/64 bittitarkkana
// koko pilari 3 -kaaren vaikka wizard-output muuttui tarkoituksella joka kierroksella.
// Dump-harness on read-only diagnostiikka (ei assertioita). Tämä pilotti sulkee aukon:
// ajaa 11 jaettua profiilia (tools/wizard-profiles.mjs) index.html-finalize-ketjun läpi ja
// assertoi rakenteelliset invariantit. Exit 1 rikkomuksesta → Stop hook estää valmis-pinnauksen.
//
// Invariantit (pilari 3 -kaaren ratifioidut takuut):
//   I1 KALUSTO      — yksikään slotti ei vaadi q17:stä puuttuvaa kalustoa (metatieto + nimi-
//                     implikoitu tosi-vaatimus: lisäpaino→painolähde, käsipainopenkki→penkki,
//                     GHR/prässi/laite→machines, talja→cable — metatiedosta riippumaton).
//   I2 CAP          — hypertrofia: accessory-sarjat / (sessio × liike) ≤ HYP-katto (6).
//   I3 MEV          — hypertrofia + ei recoveryLimited: työviikon (ΔPct > −0.20) läsnäoleva
//                     päälihas on ≥10 sarjaa TAI mevTimeBudgetAdvisory laukeaa (komposiitti).
//   I4 ALARAAJA     — jokaisella viikolla on alaraaja-/lonkkahingaus-työtä (C3-takuu).
//   I5 PRIMAARIT    — jokainen mapped.primaries-liike esiintyy joka viikolla (D-takuu).
//   I6 EI DUPLIKAATTEJA — ei kahta identtistä (category+name+reps+targetVx) accessory-riviä
//                     samalla päivällä (K3-takuu).
//   I7 FLOOR-RAJAUS — MEV-floor ei muuta primaari-/backoff-slottien sarjoja (K1-takuu).
import { WIZARD_PROFILES } from "./wizard-profiles.mjs";
globalThis.self = globalThis; // data.js IDB-tarkistus (engine-bridge-malli)
import {
  mapWizardToProgram,
  applySplitFilter, applyVolumeCap, applySessionFocusLabels,
  applyEquipmentFilter, ensureLowerBody,
  applyStartingCapacityToSlots,
  applyTimeBudgetCap,
  applyHypertrophyMevFloor, mevTimeBudgetAdvisory,
  applyInjuryFilter,
  isMovementPerformable,
} from "../wizard/wizard-2b-mapper.js";
import { generateCustomMesocycle, generateMultiBlockMesocycle } from "../data.js";

const GEN_DATE = "2026-06-14"; // sama start-ankkuri kuin dump-harnessissa (determinismi)
const MAJOR = new Set(["horisontaalityöntö", "vertikaalityöntö", "horisontaaliveto", "vertikaaliveto", "alaraaja", "lonkkahingaus"]);
const HYP_CAP = 6;
const MEV = 10;
const DELOAD_DELTA = -0.20;

// I1: nimi-implikoitu TOSI-kalustovaatimus — metatiedosta riippumaton (equipment_metadata_
// secondary_requirement -oppi: metatieto voi missata toissijaisen vaatimuksen, nimi ei).
function trueEquipmentViolation(name, eqSet) {
  const n = (name || "").toLowerCase();
  const has = x => eqSet.has(x);
  const weightSource = has("dumbbells") || has("barbell_rack") || has("machines") || has("dip_station");
  if (/lisäpaino/.test(n) && !weightSource) return "lisäpaino ilman painolähdettä";
  if (/käsipainopenkki|incline dumbbell/.test(n) && !(has("barbell_rack") || has("machines"))) return "penkki puuttuu";
  if (/glute-ham/.test(n) && !has("machines")) return "GHR-laite puuttuu";
  if (/prässi|leg extension|leg curl|chest press|\bkone\b|\blaite\b/.test(n) && !has("machines")) return "laite puuttuu";
  if (/talja|cable|pulldown|pushdown/.test(n) && !has("cable_machine")) return "vaijerilaite puuttuu";
  return null;
}

function runProfile(p) {
  const cfg = { wizardId: `wp_${p.id}`, schemaVersion: "3.3", completedAtISO: `${GEN_DATE}T10:00:00Z`, answers: p.answers };
  const ans = p.answers;
  const violations = [];
  const mapped = mapWizardToProgram(cfg, null);
  let meso = mapped.isMultiBlock
    ? generateMultiBlockMesocycle(mapped, mapped.startDateISO)
    : generateCustomMesocycle(mapped, mapped.startDateISO);
  let wp = meso.weekPlans;
  const splitPref = ans.q21_splitPreference;
  if (mapped.isMultiBlock && Array.isArray(meso.customConfig?.blocks)) {
    wp = applySplitFilter(wp, splitPref);
    const capped = [];
    for (const block of meso.customConfig.blocks) {
      capped.push(...applyVolumeCap(wp.filter(w => w.week >= block.startWeek && w.week <= block.endWeek), block.goal));
    }
    wp = capped;
  } else {
    wp = applySplitFilter(wp, splitPref);
    wp = applyVolumeCap(wp, mapped.goal);
  }
  wp = applyInjuryFilter(wp, ans.q11_injuries);
  wp = applyEquipmentFilter(wp, ans.q17_equipment);
  wp = ensureLowerBody(wp, ans.q17_equipment);
  // I7 (K1-takuu): floor EI saa VÄHENTÄÄ primaari-/backoff-sarjoja eikä pudottaa slotteja.
  // Ratifioitu MEV-top-up SAA lisätä primaariin (round-robin, testi-assertoitu) — vain
  // spread-vähennys/katoaminen on kielletty (K1-bugin muoto: backoff 3→1, primaari +1).
  const nonAccMap = plans => plans.map(w => {
    const m2 = {};
    (w.days || []).forEach((d, di) => (d.slots || []).forEach(s => {
      if (s.role === "accessory") return;
      const k = `${di}|${s.role}|${s.defaultMovementName}`;
      m2[k] = (m2[k] || 0) + (Number(s.sets) || 0);
    }));
    return m2;
  });
  const preFloor = nonAccMap(wp);
  wp = applyHypertrophyMevFloor(wp, meso.weekDefs, ans.q12_primaryGoal, mapped._wizardMeta?._capacityTriggers, ans.q17_equipment, ans.q11_injuries);
  const postFloor = nonAccMap(wp);
  for (let i = 0; i < preFloor.length; i++) {
    for (const [k, pre] of Object.entries(preFloor[i])) {
      const post = postFloor[i][k];
      if (post === undefined) violations.push(`I7 vk-idx ${i}: floor PUDOTTI ei-accessory-slotin ${k}`);
      else if (post < pre) violations.push(`I7 vk-idx ${i}: floor VÄHENSI ${k} ${pre}→${post}`);
    }
  }
  wp = applyTimeBudgetCap(wp, ans.q24_frequency, mapped.goal);
  wp = applyStartingCapacityToSlots(wp, mapped._wizardMeta?._capacityTriggers);
  wp = applySessionFocusLabels(wp);

  const eqSet = new Set(Array.isArray(ans.q17_equipment) ? ans.q17_equipment : []);
  const isHyp = ans.q12_primaryGoal === "hypertrophy";
  const recoveryLimited = !!mapped._wizardMeta?._capacityTriggers?.recoveryLimited;
  const deloadWeeks = new Set((meso.weekDefs || [])
    .filter(wd => typeof wd.deltaPctBase === "number" && wd.deltaPctBase <= DELOAD_DELTA).map(wd => wd.week));
  const advisory = mevTimeBudgetAdvisory(wp, meso.weekDefs, ans.q12_primaryGoal, mapped._wizardMeta?._capacityTriggers);
  const primaryNames = (mapped.primaries || []).map(x => x.name);

  for (const w of wp) {
    const catWeek = {};
    let hasLower = false;
    const weekNames = new Set();
    for (const d of (w.days || [])) {
      const dupKeys = new Set();
      const dayMoveAcc = {};
      for (const s of (d.slots || [])) {
        weekNames.add(s.defaultMovementName);
        if (s.category === "alaraaja" || s.category === "lonkkahingaus") hasLower = true;
        if (MAJOR.has(s.category)) catWeek[s.category] = (catWeek[s.category] || 0) + (Number(s.sets) || 0);
        // I1
        if (eqSet.size > 0 && !isMovementPerformable(s.defaultMovementName, null, s.category, eqSet)) {
          violations.push(`I1 vk${w.week}: ${s.defaultMovementName} ei suoritettavissa q17:llä (metatieto)`);
        }
        const tv = trueEquipmentViolation(s.defaultMovementName, eqSet);
        if (eqSet.size > 0 && tv) violations.push(`I1 vk${w.week}: ${s.defaultMovementName} — ${tv} (nimi-implikaatio)`);
        if (s.role === "accessory") {
          // I6
          const k = `${s.category}|${s.defaultMovementName}|${s.reps}|${s.targetVx ?? null}`;
          if (dupKeys.has(k)) violations.push(`I6 vk${w.week}: duplikaatti-accessory-rivi ${s.defaultMovementName} ${s.sets}×${s.reps}`);
          dupKeys.add(k);
          // I2
          if (isHyp) {
            dayMoveAcc[s.defaultMovementName] = (dayMoveAcc[s.defaultMovementName] || 0) + (Number(s.sets) || 0);
          }
        }
      }
      if (isHyp) for (const [nm, v] of Object.entries(dayMoveAcc)) {
        if (v > HYP_CAP) violations.push(`I2 vk${w.week}: ${nm} ${v} accessory-sarjaa yhdessä sessiossa (> ${HYP_CAP})`);
      }
    }
    // I4
    if (!hasLower) violations.push(`I4 vk${w.week}: ei alaraaja-/lonkkahingaus-työtä`);
    // I5
    for (const pn of primaryNames) if (!weekNames.has(pn)) violations.push(`I5 vk${w.week}: primaari ${pn} puuttuu ohjelmasta`);
    // I3
    if (isHyp && !recoveryLimited && !deloadWeeks.has(w.week)) {
      for (const [cat, v] of Object.entries(catWeek)) {
        if (v > 0 && v < MEV && !advisory) violations.push(`I3 vk${w.week}: ${cat} ${v} < ${MEV} EIKÄ advisory lauennut`);
      }
    }
  }
  return violations;
}

let totalViolations = 0;
let failedProfiles = 0;
for (const p of WIZARD_PROFILES) {
  let v;
  try {
    v = runProfile(p);
  } catch (e) {
    v = [`AJOVIRHE: ${e.message}`];
  }
  if (v.length) {
    failedProfiles++;
    totalViolations += v.length;
    console.log(`  ✗ ${p.id}: ${v.length} rikkomusta`);
    for (const msg of v.slice(0, 8)) console.log(`      - ${msg}`);
    if (v.length > 8) console.log(`      … +${v.length - 8} lisää`);
  } else {
    console.log(`  ✓ ${p.id}: invariantit OK`);
  }
}
if (totalViolations > 0) {
  console.log(`WIZARD-PILOT: ${failedProfiles}/${WIZARD_PROFILES.length} profiililla rikkomuksia (${totalViolations} kpl) — FAIL`);
  process.exit(1);
}
console.log(`WIZARD-PILOT: ${WIZARD_PROFILES.length}/${WIZARD_PROFILES.length} profiilia — kaikki invariantit OK`);
