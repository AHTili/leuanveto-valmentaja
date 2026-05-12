// scenario-runner.mjs
// Ajaa N viikkoa × M päivää sekvenssiä per profiili:
//   for each (week, day) in scenario:
//     ctx = buildCtx(profile, mesocycle, accumulatedSets, accumulatedSessions, readiness)
//     rec = await recommend(ctx)
//     captureTrace(rec) → traces.push(snapshot)
//     simSets = simulator.simulateSession(profile, rec.dayPlan, weekNum, dayOfWeek)
//     accumulatedSets.push(...simSets)
//     accumulatedSessions.push(...synthesizedSession)
//
// Pidä kaikki state harness-puolella — engine.js + data.js eivät persistoi mitään
// koska _db === null Node-puolella.

import { recommend } from "./engine-bridge.mjs";
import { captureTrace } from "./trace-capture.mjs";
import { simulateSet, rngForDay } from "./athlete-simulator.mjs";
import { gaussianFromRng, mulberry32 } from "./seeded-rng.mjs";

function isoDateAddDays(startISO, days) {
  const d = new Date(startISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Default readiness: GREEN, mutta voi vaihdella profiilin HRV-mittarin mukaan.
// Yksinkertainen baseline: jos profiili on grindy + intensity-phase → vara YELLOW
// useammin (varan overshoot trend). Tämä on heuristinen — emme yritä replikoida
// engine.js velocityReadiness/hrvReadiness-funktioita tasan.
function simulateReadiness(profile, weekNum, dayOfWeek, rngFn) {
  const hrvDelta = gaussianFromRng(rngFn) * 0.5;
  const velDelta = gaussianFromRng(rngFn) * 0.5;

  const hrvClass = hrvDelta < -1 ? "RED" : hrvDelta < -0.5 ? "YELLOW" : "GREEN";
  const velClass = velDelta < -1 ? "RED" : velDelta < -0.5 ? "YELLOW" : "GREEN";

  // Grindy-bias: vara raportoidaan optimistisesti = useammin GREEN
  const varaClass = profile.bias.grindy > 0.5 ? "GREEN" : (rngFn() < 0.1 ? "YELLOW" : "GREEN");

  const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
  [hrvClass, velClass, varaClass].forEach((c) => counts[c]++);

  let combined;
  let capLevel = 0;
  if (counts.GREEN >= 2) {
    combined = "GREEN";
    capLevel = 0;
  } else if (counts.RED >= 2 || (counts.RED >= 1 && counts.YELLOW >= 1)) {
    combined = "RED";
    capLevel = 2;
  } else {
    combined = "YELLOW";
    capLevel = 1;
  }
  // Velocity veto
  if (velClass === "RED" && combined === "GREEN") {
    combined = "YELLOW";
    capLevel = 1;
  }

  return {
    combined,
    capLevel,
    channels: {
      velocity: { class: velClass, z: velDelta },
      hrv: { class: hrvClass, z: hrvDelta },
      vara: { class: varaClass, z: null, meanOvershoot: profile.bias.grindy ?? 0 },
    },
  };
}

// Synthesoi Session-objekti tämän päivän setistä (data.js Session-store-formaattia ei tarvi exact match).
function synthesizeSession({ profile, weekNum, dayOfWeek, dateISO, rec, simulatedSets }) {
  return {
    sessionId: `sim-${profile.id}-w${weekNum}-d${dayOfWeek}`,
    dateISO,
    weekNum,
    dayOfWeek,
    dayType: rec?.dayType ?? null,
    mesocycleId: rec?.mesocycleId ?? null,
    exercises: simulatedSets.reduce((acc, s) => {
      const key = s.movementName;
      acc[key] = acc[key] || { movementName: key, movementId: s.movementId, sets: [] };
      acc[key].sets.push({
        weight: s.externalLoadKg,
        reps: s.reps,
        vara: s.vara,
        targetVx: s.targetVx,
        setRole: s.setRole,
        mvReps: s.mvReps,
      });
      return acc;
    }, {}),
    bodyweightKg: profile.meta.bodyweightKg,
    completedAtISO: dateISO + "T18:00:00Z",
  };
}

// Build ctx for recommend() — ohittaa IDB:n täysin
function buildCtx({
  profile,
  mesocycle,
  dateISO,
  accumulatedSets,
  accumulatedSessions,
  readiness,
  movementCatalog,
}) {
  return {
    settings: {
      bodyweightKg: profile.meta.bodyweightKg,
      e1rmExternalSetting: profile.cfgBaselines?.["Takakyykky"] ?? 93,
    },
    bodyweightKg: profile.meta.bodyweightKg,
    dateISO,
    mesocycle,
    allMovements: movementCatalog,
    allSets: accumulatedSets,
    sessions: accumulatedSessions,
    readiness,
    primaryMovementId: movementCatalog[0]?.movementId,
    dryRun: true,
  };
}

// Kerää mesocyclen sloteista uniikki movement-catalog.
// movementId-strategia: käytä movementName:a (samaa jonka simulator antaa set:eihin)
// jotta engine.js:n filter `set.movementId === primaryMovementId` matchaa oikein.
function deriveMovementCatalog(mesocycle) {
  const seen = new Map();
  let firstPrimary = null;
  for (const wp of mesocycle.weekPlans || []) {
    for (const d of wp.days || []) {
      for (const s of d.slots || []) {
        const name = s.movementName || s.defaultMovementName;
        if (!name) continue;
        if (!seen.has(name)) {
          const movementId = name; // KÄYTÄ NAMEÄ ID:NÄ (matchaa simulator-set:in movementId:n kanssa)
          const isPrimary = s.role === "primary";
          if (isPrimary && !firstPrimary) firstPrimary = movementId;
          seen.set(name, {
            movementId,
            name,
            category: s.category || "uncategorized",
            isPrimary,
            isPreset: true,
            isCompetitionLift: !!s.competitionLift,
            loadType: s.competitionLift ? "system" : "external",
          });
        }
      }
    }
  }
  return { catalog: [...seen.values()], firstPrimaryId: firstPrimary };
}

// Pää-funktio: aja yksi (profile, scenario)
export async function runScenario({ profile, scenario, mesocycle }) {
  const { catalog: movementCatalog, firstPrimaryId } = deriveMovementCatalog(mesocycle);
  const primaryMovementId = firstPrimaryId || movementCatalog[0]?.movementId;
  const accumulatedSets = [];
  const accumulatedSessions = [];
  const traces = [];
  const errors = [];

  for (const { weekNum, dayOfWeek } of scenario.days) {
    const dayIndex = (weekNum - 1) * 7 + (dayOfWeek - 1);
    const dateISO = isoDateAddDays(mesocycle.startDateISO, dayIndex);
    const readinessRng = mulberry32((profile.seed ?? 12345) ^ (weekNum * 100 + dayOfWeek));
    const readiness = simulateReadiness(profile, weekNum, dayOfWeek, readinessRng);

    const ctx = buildCtx({
      profile,
      mesocycle,
      dateISO,
      accumulatedSets,
      accumulatedSessions,
      readiness,
      movementCatalog,
      primaryMovementId,
    });

    let rec;
    try {
      rec = await recommend(ctx);
    } catch (e) {
      errors.push({
        weekNum,
        dayOfWeek,
        dateISO,
        message: e.message,
        stack: e.stack?.split("\n").slice(0, 5).join("\n"),
      });
      continue;
    }

    // Snapshot ennen simulaatiota (rec-objekti voi mutatoida)
    const trace = captureTrace({
      profileId: profile.id,
      scenarioId: scenario.id,
      weekNum,
      dayOfWeek,
      dateISO,
      ctx,
      rec,
    });
    traces.push(trace);

    if (rec?.error) {
      // Mesocycle ended / before-start / muu → skip simulator
      continue;
    }

    // Simuloi tämän päivän setit
    const dayRng = rngForDay(profile, weekNum, dayOfWeek);
    const simulatedSets = [];
    const slots = rec.dayPlan?.slots || [];
    let setCounter = 0;
    for (const slot of slots) {
      const setsForSlot = slot.sets ?? 0;
      for (let s = 0; s < setsForSlot; s++) {
        const simSet = simulateSet({
          profile,
          weekNum,
          dayOfWeek,
          setIndex: setCounter++,
          slot,
          rngFn: dayRng,
        });
        simSet.completedAtISO = dateISO + "T18:00:00Z";
        simulatedSets.push(simSet);
      }
    }
    accumulatedSets.push(...simulatedSets);
    const session = synthesizeSession({
      profile,
      weekNum,
      dayOfWeek,
      dateISO,
      rec,
      simulatedSets,
    });
    accumulatedSessions.push(session);
  }

  return {
    profileId: profile.id,
    scenarioId: scenario.id,
    mesocycleType: mesocycle.type,
    daysPlanned: scenario.days.length,
    daysCompleted: traces.length,
    setsTotal: accumulatedSets.length,
    errors,
    traces,
    accumulatedSets, // exposed for AI-block-tuning runner
    accumulatedSessions,
  };
}
