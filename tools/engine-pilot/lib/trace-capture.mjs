// trace-capture.mjs
// Käärii recommend()-output canonical JSON-trace-formaattiin per (profile, scenario, week, day).
// Pidä output kompakti: vain ydinkentät, ei koko mesocycle-objektia.

export function captureTrace({ profileId, scenarioId, weekNum, dayOfWeek, dateISO, ctx, rec }) {
  const traces = Array.isArray(rec?.traces) ? rec.traces : [];

  // Reduce slots — säilytä vain audit:in kannalta kriittiset kentät
  const slots = (rec?.dayPlan?.slots || []).map((s) => ({
    role: s.role,
    movementName: s.movementName || s.defaultMovementName,
    variantName: s.variantName ?? null,
    reps: s.reps ?? null,
    targetVx: s.targetVx ?? null,
    sets: s.sets ?? null,
    loadPct: s.loadPct ?? null,
    resolvedLoadKg: s.resolvedLoadKg ?? null,
    velocityStop: s.velocityStop ?? null,
    suggestedLoadKg: s.suggestedLoadKg ?? null,
    warmupSets: s.warmupSets ?? null, // K1: tarkistetaan onko skeleton olemassa
    note: s.note ?? null,
    isCalibration: !!s.isCalibration,
    loadPctReferenceMovementName: s.loadPctReferenceMovementName ?? null,
    // H-002 B3: cross-ref-slot-metadata audit-engine SLOT_MISMATCH-detektorin
    // cross-ref-haaralle. data.js laDay tuottaa nämä cross-ref-with-scaling
    // -sloteille (loadPct = nominalLoadPct × refScale). Akseli ratifioi
    // scope-laajennuksen 2026-05-26 STOP-raportin jälkeen.
    refScale: s.refScale ?? null,
    nominalLoadPct: s.nominalLoadPct ?? null,
  }));

  // Reduce traces — säilytä ruleId + valitut kentät, ei kaikkea
  const traceSnapshots = traces.map((t) => {
    const out = { ruleId: t.ruleId };
    // Säilytä numeeriset + status-kentät yleisesti
    for (const k of Object.keys(t)) {
      if (k === "ruleId") continue;
      const v = t[k];
      if (
        typeof v === "number" ||
        typeof v === "string" ||
        typeof v === "boolean" ||
        v === null
      ) {
        out[k] = v;
      } else if (Array.isArray(v) && v.length <= 12 && v.every((x) => typeof x !== "object")) {
        out[k] = v;
      } else if (typeof v === "object" && v !== null) {
        // Kompakti objekti-snapshot (max 5 avainta primitive:ksi)
        const compact = {};
        let count = 0;
        for (const ki of Object.keys(v)) {
          const vi = v[ki];
          if (typeof vi === "number" || typeof vi === "string" || typeof vi === "boolean" || vi === null) {
            compact[ki] = vi;
            count++;
            if (count >= 5) break;
          }
        }
        if (count > 0) out[k] = compact;
      }
    }
    return out;
  });

  return {
    profileId,
    scenarioId,
    weekNum,
    dayOfWeek,
    dateISO,
    input: {
      e1rmExternalCtx: ctx?.e1rmExternal ?? null, // jos esim. asetettu manuaalisesti
      bodyweightKg: ctx?.bodyweightKg ?? null,
      readiness: ctx?.readiness
        ? {
            combined: ctx.readiness.combined,
            capLevel: ctx.readiness.capLevel,
            channels: {
              velocity: ctx.readiness.channels?.velocity?.class ?? null,
              hrv: ctx.readiness.channels?.hrv?.class ?? null,
              vara: ctx.readiness.channels?.vara?.class ?? null,
            },
          }
        : null,
      mesocycleType: ctx?.mesocycle?.type ?? null,
      programMeta: ctx?.mesocycle?._programMeta
        ? {
            handTuned: ctx.mesocycle._programMeta.handTuned ?? null,
            tierProgressionApplied: ctx.mesocycle._programMeta.tierProgressionApplied ?? null,
            source: ctx.mesocycle._programMeta.source ?? null,
          }
        : null,
      allSetsCount: Array.isArray(ctx?.allSets) ? ctx.allSets.length : 0,
      sessionsCount: Array.isArray(ctx?.sessions) ? ctx.sessions.length : 0,
    },
    output: {
      error: rec?.error ?? null,
      errorMessage: rec?.errorMessage ?? null,
      weekNum: rec?.weekNum ?? null,
      weekLabel: rec?.weekLabel ?? null,
      dayType: rec?.dayType ?? null,
      targetExternalLoad: rec?.targetExternalLoad ?? null,
      targetReps: rec?.targetReps ?? null,
      targetVx: rec?.targetVx ?? null,
      setCount: rec?.setCount ?? null,
      deltaPct: rec?.deltaPct ?? null,
      capLevel: rec?.capLevel ?? null,
      e1rmSystem: rec?.e1rmSystem ?? null,
      e1rmExternal: rec?.e1rmExternal ?? null,
      bodyweightKg: rec?.bodyweightKg ?? null,
      accessoryCapActive: rec?.accessoryCapActive ?? null,
      vbtStatus: rec?.vbtStatus
        ? {
            status: rec.vbtStatus.status,
            severity: rec.vbtStatus.severity,
            diffPct: rec.vbtStatus.diffPct,
            n: rec.vbtStatus.n,
          }
        : null,
      varaFeedback: rec?.varaFeedback
        ? { type: rec.varaFeedback.type, suggestion: rec.varaFeedback.suggestion }
        : null,
      breakInfo: rec?.breakInfo
        ? { breakDays: rec.breakInfo.breakDays, modifier: rec.breakInfo.modifier, forcedDayType: rec.breakInfo.forcedDayType }
        : null,
      cfgDriftApplied: rec?.cfgDriftApplied ?? null,
      slots,
      // v4.50.0 (Track B 2D-δ): adaptive multi-suggestion -audit
      suggestions: Array.isArray(rec?.suggestions)
        ? rec.suggestions.map((s) => ({
            id: s.id,
            label: s.label ?? null,
            deltaPct: typeof s.deltaPct === "number" ? s.deltaPct : null,
            targetVx: s.targetVx ?? null,
            targetExternalLoad: s.targetExternalLoad ?? null,
            setCount: s.setCount ?? null,
            targetReps: s.targetReps ?? null,
          }))
        : null,
      defaultSuggestionId: rec?.defaultSuggestionId ?? null,
      suggestionContext: rec?.suggestionContext
        ? {
            rtfModelStatus: rec.suggestionContext.rtfModelStatus ?? null,
            capLevel: rec.suggestionContext.capLevel ?? null,
            grindyBiasDetected: rec.suggestionContext.grindyBiasDetected ?? null,
            preferredBias: rec.suggestionContext.preferredBias ?? null,
            aggressiveSuppressedReasons: Array.isArray(rec.suggestionContext.aggressiveSuppressedReasons)
              ? rec.suggestionContext.aggressiveSuppressedReasons
              : [],
          }
        : null,
    },
    traces: traceSnapshots,
    auditFlags: [], // täytetään audit-engine.mjs:ssa
  };
}

// Apuri: tarkista onko trace-array sisältää ruleId:n
export function hasTrace(traceSnapshots, ruleId) {
  return Array.isArray(traceSnapshots) && traceSnapshots.some((t) => t.ruleId === ruleId);
}

export function findTrace(traceSnapshots, ruleId) {
  return Array.isArray(traceSnapshots)
    ? traceSnapshots.find((t) => t.ruleId === ruleId) ?? null
    : null;
}
