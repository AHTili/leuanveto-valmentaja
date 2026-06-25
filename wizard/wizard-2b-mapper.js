// wizard-2b-mapper.js — Track B Vaihe 2B-α (mapping wizardConfig → ohjelma)
// LeVe AI v4.39.0+
//
// Pure-function: wizardConfig (30 vastausta v3.3) + mainAppState (LeVeCoachDB
// luku-vain snapshot) → generateCustomMesocycle-yhteensopiva input-objekti.
//
// Tutkimuspohja: docs/VAIHE_2B_RESEARCH_VERIFICATION.md (2026-05-11):
//   - Issurin Table V residuaalit (RISTIINTARKISTETTU, 4 itsenäistä lähdettä)
//   - Huiberts 2024 sex-modifier CT-skenaariossa (PDF-VERIFIOITU)
//   - Petré 2021 training-status kvalitatiivisena (PDF-VERIFIOITU)
//   - Nunes 2021 + ACSM 2009 liikejärjestys (RISTIINTARKISTETTU, delegoidaan
//     pää-app:in distributePrimariesToDays:lle)
//
// Spec: docs/VAIHE_2B_alpha_SPECIFICATION.md.
//
// SUUNNITTELUPÄÄTÖKSET (K1-K4):
//   K1: Hypertrofia → strength_endurance kategoria, paitsi q12 viittaa
//       max-voimaan → maksimivoima-aloitus (Issurin-kategorioiden soveltaminen,
//       EI uusi luku)
//   K2: Block-pituudet kvalitatiivisesti lengthByTier-taulukolla.
//       EI numeerisia progressio-kertoimia (Petré ei tue niitä).
//   K3: q26-PR-migraatio jätetty 2B-γ:lle (skipIfMainAppHas-pohjaisesti).
//   K4: Jako 2B-α (mapping, tämä tiedosto) + 2B-β (UI+DB) + 2B-γ (PR+energia).
//
// FABRIKOINTI-KIELTO: Plews 2013 -tyyppinen "lisätty kynnys" on KIELLETTY.
// Heuristic-säännöt merkitään eksplisiittisesti // HEURISTIC -kommentilla.
// Tutkijaviittaukset vain koodikommenteissa, EI UI-näkyviin stringeihin.
//
// EI riippuvuutta data.js:stä — pure mapping. Pää-app:in puoli (2B-β)
// importoi tämän mapperin ja syöttää output:n generateCustomMesocycle:lle.

import { SCHEMA_INVARIANTS } from "./wizard-schema.js";
// Pilari 3 C2: liikepankki substituutiopooliksi (kalusto-suodatuksen korvaajat — oikeat
// katalogi-liikkeet, ei keksittyjä nimiä).
import { FALLBACK_MOVEMENT_BANK } from "./wizard-movement-bank.js";

export const MAPPER_VERSION = "2D-gamma-v1.0";

// ═══════════════════════════════════════════════════════════════════════
// PROGRAM_STYLES — Adaptive multi-suggestion (Track B Vaihe 2D-α)
// ═══════════════════════════════════════════════════════════════════════
//
// Tapa 3 (käyttäjän valitsema arkkitehtuuri 2026-05-11):
//   Wizard 3.3 säilyy ennallaan (ei q31_programStyle lisätä). Sen sijaan
//   mapper tunnistaa profiilin → ehdottaa top-3 metodologiaa confidence-
//   järjestyksessä → käyttäjä valitsee preview-modaalissa.
//
// 2D-α: 7 single-block + 1 multi-block style = 8 vaihtoehtoa.
// 2D-β (tuleva): + wendler531 + topSetBackoff + madcow5x5
// 2D-γ (tuleva): + westsideConjugate + gzcl + sheiko + minimalist + smolov
// 2D-δ (tuleva): hybrid-yhdistelmät (esim. "5/3/1 + Issurin-peaking")
//
// CONFIDENCE-LASKENTA:
//   - 0-100 pistettä, lasketaan featureMatch-funktiolla per tyyli
//   - Goal-match: 40 pistettä (perusvaatimus)
//   - Experience-match: 20 pistettä
//   - Recent block transition: 15 pistettä
//   - Recovery/special context: ±10-15 pistettä
//   - Default penalty: tyyli jolla ei selvää matchia saa max 30
//
// FABRIKOINTI-KIELTO: tämä on PÄÄTÖSALGORITMI, ei tutkimustaulukon
// suora soveltaminen. Lähteet säilyvät tausta-perustelussa
// (esim. Issurin block-residuaalit ohjaavat multi-block-suosittelua),
// mutta confidence-painotukset ovat algoritmin omia heuristiikkoja.
// Status _wizardMeta.rules.source:ssa: "ALGORITMI 2D-α".

export const PROGRAM_STYLES = Object.freeze({
  // ── Multi-block (käytä jos q27_targetDate + aikaa ≥ 8 vk) ──
  "multi-issurin": {
    id: "multi-issurin",
    label: "Block-periodisaatio (Issurin)",
    shortDesc: "Vaiheittainen ohjelma: hypertrofia → voima → intensifikaatio → peaking",
    weekCount: "8–16",
    bestFor: "Kisaan/testaukseen 8+ vk päästä",
    iconHint: "🏆",
    isMultiBlock: true,
    factoryHint: "generateMultiBlockMesocycle",
    sourceLabel: "Issurin 2010 block-residuaalit (RISTIINTARKISTETTU)",
  },
  // ── Single-block-tyylit ──
  "single-hypertrofia": {
    id: "single-hypertrofia",
    label: "Hypertrofiajakso",
    shortDesc: "Lihasmassan kasvatus, korkea volyymi, 6–8 toistoa",
    weekCount: 4,
    bestFor: "Pohjarakentaminen, ei kisaa lähellä",
    iconHint: "💪",
    isMultiBlock: false,
    goal: "hypertrofia",
    factoryHint: "createHypertrofiaMesocycle",
    sourceLabel: "Israetel — hypertrophy MEV→MAV progression",
  },
  "single-maksimivoima": {
    id: "single-maksimivoima",
    label: "Maksimivoima-blokki",
    shortDesc: "Hermostollinen blokki, 1–3 toistoa, raskaat kuormat (Vx 1–4)",
    weekCount: 4,
    bestFor: "Voima-PR tai kisaan valmistautuminen (ei vielä peaking)",
    iconHint: "🏋️",
    isMultiBlock: false,
    goal: "maksimivoima",
    factoryHint: "createMaksimivoimaMesocycle",
    sourceLabel: "Issurin block-malli — maksimivoimavaihe",
  },
  "single-yhdistelma": {
    id: "single-yhdistelma",
    label: "Perusjakso (Ma/Pe/No)",
    shortDesc: "Yhdistelmä: maksimivoima + perusvoima + nopeusvoima samalla viikolla",
    weekCount: 4,
    bestFor: "Ei kisaa, kaikki ominaisuudet yhtaikaa",
    iconHint: "⚡",
    isMultiBlock: false,
    goal: "yhdistelma",
    factoryHint: "createDefaultMesocycle",
    sourceLabel: "Pää-app perusjakso (käytännöllinen konventio)",
  },
  "single-dup": {
    id: "single-dup",
    label: "DUP — undulating",
    shortDesc: "Päivittäin vaihtuva intensiteetti: voima/volyymi/nopeus kierto",
    weekCount: 4,
    bestFor: "Stagnaatio perinteisessä lineaarisessa progressiossa, kokenut",
    iconHint: "🔄",
    isMultiBlock: false,
    goal: "undulating",
    factoryHint: "createDUPMesocycle",
    sourceLabel: "Rhea 2002 — DUP 25 % suurempia voimanlisäyksiä vs. lineaarinen",
  },
  "single-eksentrinen": {
    id: "single-eksentrinen",
    label: "Eksentrinen erikoisblokki",
    shortDesc: "Supramaksimaalinen kuorma + hidas eksentrinen + isometriapidot",
    weekCount: 4,
    bestFor: "Kokenut atleti jolla 1RM on stagnoinut perusblokeissa",
    iconHint: "⬇️",
    isMultiBlock: false,
    goal: "eksentrinen",
    factoryHint: "createEksenterinenMesocycle",
    sourceLabel: "Eksentrinen overload — kokeneille (advanced+)",
  },
  "single-siirtyma": {
    id: "single-siirtyma",
    label: "Siirtymäjakso (GPP)",
    shortDesc: "Yleiskunto, ote, prehab — kevyt valmistautumisjakso",
    weekCount: 3,
    bestFor: "Deloadin tai tauon jälkeen, ennen uutta blokkia",
    iconHint: "🌿",
    isMultiBlock: false,
    goal: "siirtyma",
    factoryHint: "createSiirtymaMesocycle",
    sourceLabel: "GPP-konventio — pohjarakennus ennen SPP-vaihetta",
  },
  "single-palautuminen": {
    id: "single-palautuminen",
    label: "Palautumissilta",
    shortDesc: "Aktiivinen palautuminen, matala intensiteetti (vain 2 vk)",
    weekCount: 2,
    bestFor: "Kisan jälkeen tai loppuunajetussa tilassa",
    iconHint: "😴",
    isMultiBlock: false,
    goal: "palautuminen",
    factoryHint: "createPalautuminenMesocycle",
    sourceLabel: "Aktiivisen palautumisen konventio (Pää-app-skeleton)",
  },
  // ── 2D-β: klassiset voimanosto-ohjelmat ──
  "single-wendler531": {
    id: "single-wendler531",
    label: "Wendler 5/3/1",
    shortDesc: "Klassinen 4-vk sykli, AMRAP viim. sarja, BBB-assistance",
    weekCount: 4,
    bestFor: "Klassinen voimanostorakenne, autoreguloitu AMRAP",
    iconHint: "📅",
    isMultiBlock: false,
    goal: "wendler531",
    factoryHint: "createWendler531Mesocycle",
    sourceLabel: "Wendler 2009 5/3/1 (T-Nation -artikkeli PDF-VERIFIOITU ydinprosenteille)",
  },
  "single-top-set-backoff": {
    id: "single-top-set-backoff",
    label: "Top-set + Backoff",
    shortDesc: "1 raskas single @ Vara 0-1 + 2-3 backoff @ 80% top-singleista",
    weekCount: 4,
    bestFor: "Minimitehokas voimasignaali, ajan rajallisuus",
    iconHint: "🎯",
    isMultiBlock: false,
    goal: "topSetBackoff",
    factoryHint: "createTopSetBackoffMesocycle",
    sourceLabel: "Androulakis-Korakakis 2021 (PMC8435792, METD-konseptipaperi)",
  },
  "single-madcow-5x5": {
    id: "single-madcow-5x5",
    label: "Madcow 5×5",
    shortDesc: "5-vk lineaarinen progressio Ma/Ke/Pe HLM-pattern, +2.5%/vk",
    weekCount: 5,
    bestFor: "Intermediate, klassinen 5×5 ramp + PR-yritys vk5",
    iconHint: "🏗️",
    isMultiBlock: false,
    goal: "madcow5x5",
    factoryHint: "createMadcow5x5Mesocycle",
    sourceLabel: "Madcow 5×5 (anonyymi yhteisön mukautus Bill Starr 1976 -pohjasta)",
  },
  // ── 2D-γ: edistyneet metodologiat ──
  "single-westside-conjugate": {
    id: "single-westside-conjugate",
    label: "Westside Conjugate",
    shortDesc: "4×/vk ME/DE-rotaatio, viikoittainen liikevaihto, top single ≥90%",
    weekCount: 4,
    bestFor: "Advanced/elite, klassinen Conjugate-metodi (raw-mukautus)",
    iconHint: "🔀",
    isMultiBlock: false,
    goal: "westsideConjugate",
    factoryHint: "createWestsideConjugateMesocycle",
    sourceLabel: "Simmons 2007 + WSBB-blogit (2018-2025); raw-streetlifting-mukautus = WESTSIDE-DERIVED",
  },
  "single-gzcl-jt20": {
    id: "single-gzcl-jt20",
    label: "GZCL Jacked & Tan 2.0",
    shortDesc: "4×/vk 12 vk, T1/T2/T3 tier-rakenne, RM-target laskee 10→1",
    weekCount: 12,
    bestFor: "Advanced, strukturoitu tier-malli + AMRAP-progressio",
    iconHint: "📊",
    isMultiBlock: false,
    goal: "gzclJT20",
    factoryHint: "createGZCLMesocycle",
    sourceLabel: "Lefever 2016 J&T 2.0 -blogi (EMPIRINEN, ei peer-reviewed)",
  },
  "single-sheiko-derived": {
    id: "single-sheiko-derived",
    label: "Sheiko #29 (johdettu)",
    shortDesc: "3×/vk 4 vk, %1RM-pyramidi, max-int. 75-85%; SHEIKO-DERIVED",
    weekCount: 4,
    bestFor: "Voimanostotausta, korkea volyymi prep-vaihe",
    iconHint: "🇷🇺",
    isMultiBlock: false,
    goal: "sheikoDerived",
    factoryHint: "createSheikoDerivedMesocycle",
    sourceLabel: "Sheiko #29 (yhteisökopio foorumi-spreadsheetistä); leuka+dippi = SHEIKO-DERIVED LAAJENNUS",
  },
  "single-minimalist-rp": {
    id: "single-minimalist-rp",
    label: "Minimalist RP (Israetel)",
    shortDesc: "3×/vk MEV→MAV sets-progressio, push/pull/legs, hypertrofia-fokus",
    weekCount: 4,
    bestFor: "Hypertrofia-painotus, apuliikkeiden volyymi-hallinta",
    iconHint: "📐",
    isMultiBlock: false,
    goal: "minimalistRP",
    factoryHint: "createMinimalistRPMesocycle",
    sourceLabel: "Israetel RP-blogi 2017+ (DOKUMENTOITU, ei peer-reviewed)",
  },
  "single-smolov-jr": {
    id: "single-smolov-jr",
    label: "Smolov Jr",
    shortDesc: "4×/vk 3+1 vk intensiivinen blokki, yhden liikkeen specialty",
    weekCount: 4,
    bestFor: "Yhden liikkeen PR-yritys lyhyellä syklillä (vain yksi kerrallaan)",
    iconHint: "💀",
    isMultiBlock: false,
    goal: "smolovJr",
    factoryHint: "createSmolovJrMesocycle",
    sourceLabel: "Smolov Jr -yhteisömukautus (Tsatsouline-välitysketju)",
  },
  "single-coan-phillipi": {
    id: "single-coan-phillipi",
    label: "Coan-Phillipi (DL)",
    shortDesc: "1× DL/vk, 10 vk + meet vk 11, lineaarinen %-progressio",
    weekCount: 11,
    bestFor: "Deadlift-spesialisaatio, peakaus kisaan/testaukseen",
    iconHint: "🎖️",
    isMultiBlock: false,
    goal: "coanPhillipi",
    factoryHint: "createCoanPhillipiMesocycle",
    sourceLabel: "Mark Phillipi -alkuperäisessee (powerpage.net, mirror-versiot)",
  },
});

// Max-tavoitteet joissa maksimivoima/peaking-tyyli on etusijalla
const _MAX_GOALS = new Set([
  "max_1RM",
  "powerlifting",
  "streetlifting_with_explosive_components",
]);

// pickProgramStyle — palauttaa kandidaattilistan confidence-järjestyksessä.
//
// Input: answers (wizardConfig.answers), opts = { daysUntilTarget }
// Output: array of {styleId, style, confidence, rationale[], weekCount}
//         sorted desc by confidence. Top-3 = ensimmäiset 3 elementtiä.
//
// Algoritmi (per tyyli, summa 0-100):
//   1. Base score per tyyli (esim. multi-block 0 jos ei kisapäivää, 60 jos on)
//   2. Goal match bonus (max +40)
//   3. Experience match (max +20)
//   4. Recent block transition (max +15)
//   5. Special context (cut/break/fatigue): bonus/malus ±15
//
// Cap-säännöt:
//   - Palautuminen MAX 70 paitsi jos eksplisiittinen fatigue-indikaattori
//   - Siirtymä MAX 75 paitsi jos deload/break-paluu
//   - Eksentrinen MAX 70 jos beginner/intermediate (rajataan kokeneille)
export function pickProgramStyle(answers, opts = {}) {
  const daysUntilTarget = (opts && typeof opts.daysUntilTarget === "number") ? opts.daysUntilTarget : null;
  const candidates = [];

  const a = answers || {};
  const isMaxGoal = _MAX_GOALS.has(a.q12_primaryGoal);
  const isHypGoal = a.q12_primaryGoal === "hypertrophy";
  const isGenStrength = a.q12_primaryGoal === "general_strength";
  const isPowerOutput = a.q12_primaryGoal === "power_output" || a.q12_primaryGoal === "sport_RFD";
  const tier = a.q08_selfLevel;
  const isAdvancedPlus = tier === "advanced" || tier === "elite";
  const isIntermPlus = tier === "intermediate" || tier === "advanced" || tier === "elite";
  const recent = a.q29_recentBlock;
  const cutAggressive = a.q14_cutting === "yes" && a.q30_energyBudget &&
    Number(a.q30_energyBudget.deficitKcal) >= 500;
  const breakMonths = Number(a.q10_trainingBreakMonths) || 0;
  const volPref = a.q23_volumePref;
  const hasTargetDate = !!a.q27_targetDate;
  const isCompetition = a.q28_targetType === "competition";

  // ── 1. MULTI-ISSURIN (kisapäivä + aikaa ≥ 8 vk) ──
  {
    const c = { styleId: "multi-issurin", style: PROGRAM_STYLES["multi-issurin"], confidence: 0, rationale: [], weekCount: null };
    if (hasTargetDate && typeof daysUntilTarget === "number" && daysUntilTarget >= 56) {
      c.confidence = 85;
      c.rationale.push(`Kisapäivä asetettu (${daysUntilTarget} pv) → riittävästi aikaa block-periodisaatiolle`);
      if (isCompetition) {
        c.confidence += 10;
        c.rationale.push("Kisa-tavoite → multi-blokki on tieteellinen standardi (Issurin)");
      }
      if (isMaxGoal) {
        c.confidence += 5;
        c.rationale.push("Max-tavoite tukee perinteistä hyp→str→int→peak-sekvenssiä");
      }
      // Block-pituuksien sopivuus
      if (daysUntilTarget >= 112) { // 16+ vk
        c.weekCount = Math.min(16, Math.floor(daysUntilTarget / 7));
      } else if (daysUntilTarget >= 84) { // 12+ vk
        c.weekCount = 12;
      } else { // 8-11 vk
        c.weekCount = 8;
      }
    } else if (hasTargetDate && daysUntilTarget !== null && daysUntilTarget < 56) {
      c.confidence = 25;
      c.rationale.push(`Kisapäivä ${daysUntilTarget} pv — alle 8 vk → block-periodisaatiolle liian vähän aikaa`);
    } else {
      c.confidence = 10;
      c.rationale.push("Ei kisapäivää → block-periodisaatio toimii myös, mutta single-blokki on yksinkertaisempi");
    }
    candidates.push(c);
  }

  // ── 2. SINGLE-MAKSIMIVOIMA ──
  {
    const c = { styleId: "single-maksimivoima", style: PROGRAM_STYLES["single-maksimivoima"], confidence: 0, rationale: [], weekCount: 4 };
    if (isMaxGoal) {
      c.confidence += 40;
      c.rationale.push("Päätavoite max-voima → maksimivoima-blokki on suoraan kohdistettu");
    } else if (isGenStrength) {
      c.confidence += 15;
      c.rationale.push("Yleinen voima → maksimivoima toimii osana");
    }
    if (recent === "hypertrophy") {
      c.confidence += 15;
      c.rationale.push("Edellinen blokki hypertrofia → seuraava luonteva askel on max-voima (Issurin-sekvenssi)");
    } else if (recent === "strength") {
      c.confidence += 8;
      c.rationale.push("Edellinen voimablokki → max-voima on jatkumo");
    } else if (recent === "peaking" || recent === "deload") {
      c.confidence -= 10;
      c.rationale.push(`Edellinen ${recent} → vaatii ensin hypertrofia/GPP-pohjan ennen uutta max-blokkia`);
    }
    if (isAdvancedPlus) {
      c.confidence += 10;
      c.rationale.push("Edistynyt taso sietää max-blokin neurokuormaa");
    } else if (tier === "beginner") {
      c.confidence -= 15;
      c.rationale.push("Aloittelijalle max-blokki on liian aikainen (hermosto + tekniikka ei valmis)");
    }
    if (cutAggressive) {
      c.confidence -= 15;
      c.rationale.push("Aggressivinen cut + max-blokki = ristiriita (palautumiskapasiteetti rajallinen)");
    }
    candidates.push(c);
  }

  // ── 3. SINGLE-HYPERTROFIA ──
  {
    const c = { styleId: "single-hypertrofia", style: PROGRAM_STYLES["single-hypertrofia"], confidence: 0, rationale: [], weekCount: 4 };
    if (isHypGoal) {
      c.confidence += 40;
      c.rationale.push("Päätavoite hypertrofia → hypertrofia-blokki suoraan kohdistettu");
    } else if (a.q13_secondaryGoal === "hypertrophy") {
      c.confidence += 20;
      c.rationale.push("Sivutavoite hypertrofia → hypertrofia-blokki toimii pohjana");
    }
    if (recent === "peaking" || recent === "deload" || recent === "off_program") {
      c.confidence += 15;
      c.rationale.push(`Edellinen ${recent} → uusi sykli aloittaa luonnollisesti volyymivaiheella`);
    } else if (recent === "hypertrophy") {
      c.confidence -= 5;
      c.rationale.push("Edellinen blokki oli jo hypertrofia → seuraava luonteva askel on voima");
    }
    if (isMaxGoal && recent !== "peaking" && recent !== "deload") {
      c.confidence -= 10;
      c.rationale.push("Max-tavoite + ei juuri peakingin jälkeen → hypertrofiavaihe ei ole etusijalla");
    }
    if (cutAggressive) {
      c.confidence -= 10;
      c.rationale.push("Aggressivinen cut + hypertrofia = lihasmassan kasvu rajoittuu (kohtuullisesti hyödyllinen)");
    }
    candidates.push(c);
  }

  // ── 4. SINGLE-YHDISTELMA (Perusjakso) ──
  {
    const c = { styleId: "single-yhdistelma", style: PROGRAM_STYLES["single-yhdistelma"], confidence: 0, rationale: [], weekCount: 4 };
    if (isGenStrength) {
      c.confidence += 40;
      c.rationale.push("Yleinen voima ja terveys → perusjakso kattaa kaikki ominaisuudet");
    } else if (a.q12_primaryGoal === "sport_RFD") {
      c.confidence += 20;
      c.rationale.push("Lajin RFD → perusjakson nopeuspäivä tukee räjähtävää voimaa");
    } else {
      // Aina jossain määrin sopiva fallback
      c.confidence += 15;
      c.rationale.push("Yleisesti soveltuva — jos selvää kapeaa kohdetta ei ole, perusjakso on turvallinen valinta");
    }
    if (tier === "beginner") {
      c.confidence += 15;
      c.rationale.push("Aloittelijalle perusjakso on koulutuksellisesti paras (kaikki ominaisuudet kosketuksissa)");
    } else if (isIntermPlus) {
      c.confidence += 5;
      c.rationale.push("Keskitaso+ saa silti pohjarakennukseen perusjaksosta arvoa");
    }
    if (recent === "off_program") {
      c.confidence += 10;
      c.rationale.push("Tulet pois ohjelmattomasta vaiheesta → laajapohjainen yhdistelmäjakso rakentaa kaiken pohjan");
    }
    candidates.push(c);
  }

  // ── 5. SINGLE-DUP ──
  {
    const c = { styleId: "single-dup", style: PROGRAM_STYLES["single-dup"], confidence: 0, rationale: [], weekCount: 4 };
    if (isIntermPlus) {
      c.confidence += 15;
      c.rationale.push("Keskitaso+ pystyy hyödyntämään päivittäin vaihtuvaa intensiteettiä");
    } else {
      c.confidence -= 10;
      c.rationale.push("Aloittelijalle DUP on liian monimutkainen — kaikkien tyylien optimointi sopii kokeneille");
    }
    if (volPref === "MAV" || volPref === "MRV") {
      c.confidence += 15;
      c.rationale.push(`Volyymipreferenssi "${volPref}" sopii DUP:in vaihtuvalle kuormalle`);
    }
    if (isGenStrength || isHypGoal) {
      c.confidence += 15;
      c.rationale.push("Yleinen voima / hypertrofia → DUP sopii kun haluat varioida ärsykettä");
    } else if (isMaxGoal && recent === "strength") {
      c.confidence -= 5;
      c.rationale.push("Max-tavoite + edellinen voima → DUP ei ole etusijalla peakingin valmistuksessa");
    }
    // Jos käyttäjä on tehnyt useita peräkkäisiä perinteisiä blokkeja: DUP variointia
    if (recent === "strength" || recent === "hypertrophy") {
      c.confidence += 5;
      c.rationale.push("Aiempi perinteinen blokki → DUP voi tarjota variointia");
    }
    candidates.push(c);
  }

  // ── 6. SINGLE-EKSENTRINEN (specialty) ──
  {
    const c = { styleId: "single-eksentrinen", style: PROGRAM_STYLES["single-eksentrinen"], confidence: 0, rationale: [], weekCount: 4 };
    if (!isAdvancedPlus) {
      c.confidence = 5;
      c.rationale.push("Eksentrinen erikoisblokki vaatii edistyneen tason (palautumiskuorma korkea)");
    } else {
      c.confidence += 25;
      c.rationale.push("Edistynyt taso → eksentrinen on käytettävissä työkalupakissa");
      if (isMaxGoal) {
        c.confidence += 15;
        c.rationale.push("Max-tavoite → eksentrinen blokki rakentaa lockout-vahvuutta ja sietokykyä yli 1RM:n");
      }
      if (recent === "strength" || recent === "hypertrophy") {
        c.confidence += 10;
        c.rationale.push("Edellinen perinteinen voima/hypertrofia → eksentrinen tuo variaatiota stagnaatioon");
      } else if (recent === "peaking" || recent === "deload") {
        c.confidence -= 10;
        c.rationale.push(`Edellinen ${recent} → eksentrinen ennen perusvolyymin palauttamista on liian aikainen`);
      }
      // Cap kun beginner/intermediate
      if (cutAggressive) {
        c.confidence -= 15;
        c.rationale.push("Aggressivinen cut + eksentrinen = palautumiskapasiteetti liian rajallinen");
      }
    }
    candidates.push(c);
  }

  // ── 7. SINGLE-SIIRTYMA (GPP, 3 vk natiivi) ──
  {
    const c = { styleId: "single-siirtyma", style: PROGRAM_STYLES["single-siirtyma"], confidence: 0, rationale: [], weekCount: 3 };
    if (recent === "deload") {
      c.confidence += 60;
      c.rationale.push("Edellinen deload → siirtymäjakso on luonteva askel ennen uutta SPP-vaihetta");
    } else if (recent === "off_program") {
      c.confidence += 30;
      c.rationale.push("Tulet pois ohjelmattomasta vaiheesta → GPP rakentaa pohjan ennen voima/hypertrofiablokkia");
    } else if (breakMonths >= 1) {
      c.confidence += 35;
      c.rationale.push(`Pidempi tauko (${breakMonths} kk) → GPP palauttaa pohjan turvallisesti`);
    } else {
      c.confidence += 10;
      c.rationale.push("Siirtymäjakso toimii myös 'reset'-jaksona blokkien välissä");
    }
    if (tier === "beginner") {
      c.confidence += 10;
      c.rationale.push("Aloittelijalle GPP on koulutuksellisesti hyvä pohja");
    }
    if (hasTargetDate && typeof daysUntilTarget === "number" && daysUntilTarget < 28) {
      c.confidence -= 20;
      c.rationale.push("Kisapäivä alle 4 vk → GPP-vaihe söisi peakingin valmisteluaikaa");
    }
    candidates.push(c);
  }

  // ── 8. SINGLE-PALAUTUMINEN (2 vk natiivi) ──
  {
    const c = { styleId: "single-palautuminen", style: PROGRAM_STYLES["single-palautuminen"], confidence: 0, rationale: [], weekCount: 2 };
    if (recent === "peaking") {
      c.confidence += 50;
      c.rationale.push("Tulet juuri peakingista → 2 vk aktiivinen palautuminen on ensisijaisen tärkeä");
    } else if (breakMonths >= 2 && isAdvancedPlus) {
      c.confidence += 30;
      c.rationale.push(`Pidempi tauko (${breakMonths} kk) + edistynyt taso → kevyt palautuminen ennen kovaa vaihetta`);
    } else {
      c.confidence = 8;
      c.rationale.push("Palautumissilta on varattu tilanteisiin joissa fatigue-indikaattori on selvä (peakingin jälkeen tai kisan jäljiltä)");
    }
    if (cutAggressive && recent === "peaking") {
      c.confidence += 5;
      c.rationale.push("Cut-vaihe + peakingin jälkeen → kevyt palautuminen on välttämätön");
    }
    if (hasTargetDate && typeof daysUntilTarget === "number" && daysUntilTarget < 21) {
      c.confidence -= 20;
      c.rationale.push("Kisapäivä alle 3 vk → palautumissilta söisi peakingin valmistuksen");
    }
    candidates.push(c);
  }

  // ── 9. SINGLE-WENDLER531 (2D-β) ──
  // Wendler 5/3/1 — klassinen voimanostorakenne, sopii kun atletti haluaa
  // strukturoidun 4-vk-syklin AMRAP-progressiolla. Hyvä useimmille kokeneille.
  //
  // v4.51.8: Suodatus jolla varmistetaan että Wendler on todella sopiva:
  //   - Wendler on KANONISESTI 4-liikkeen ohjelma (Pystypunnerrus, Maastaveto,
  //     Penkkipunnerrus, Takakyykky). Sen TM-laskenta = 90% 1RM jokaiselle.
  //     Ilman 1RM-dataa tai tankoa Wendler ei toimi.
  //   - Estävät rajoitukset: selkä/polvi/olkapää-vammat blokkaavat osan 4
  //     kisaliikkeestä → Wendler ei sovi.
  {
    const c = { styleId: "single-wendler531", style: PROGRAM_STYLES["single-wendler531"], confidence: 0, rationale: [], weekCount: 4 };

    // PRE-CHECK 1: Kalusto — Wendler vaatii barbell_rack:in
    const eqSet = new Set(Array.isArray(a.q17_equipment) ? a.q17_equipment : []);
    const hasBarbellRack = eqSet.has("barbell_rack");
    if (!hasBarbellRack) {
      c.confidence = 0;
      c.rationale.push("Wendler 5/3/1 vaatii tangon + kyykkytelineen — Wendlerin 4 kisaliikettä (Pystypunnerrus, Maastaveto, Penkkipunnerrus, Takakyykky) eivät onnistu ilman kalustoa");
      candidates.push(c);
      // Skip muut tarkistukset — confidence on jo nollattu
      // (kandidaatti silti pushed jotta UI näyttää syyn miksi tämä ei sovi)
    } else {
      // PRE-CHECK 2: 1RM-data 4 kisaliikkeelle
      const wendlerLifts = ["pystypunnerrus", "maastaveto", "penkkipunnerrus", "takakyykky"];
      const prs = Array.isArray(a.q26_personalRecords) ? a.q26_personalRecords : [];
      const prNamesLower = prs
        .filter(p => p && (p.loadType === "external" || p.loadType === "system"))
        .map(p => (p.movementName || "").toLowerCase());
      const matchedWendlerLifts = wendlerLifts.filter(lift =>
        prNamesLower.some(prName => prName.includes(lift))
      );
      const missingCount = wendlerLifts.length - matchedWendlerLifts.length;

      // Kohdeyleisö: powerlifting + max-tavoite + kokenut
      if (isMaxGoal) {
        c.confidence += 35;
        c.rationale.push("Max-tavoite → Wendler 5/3/1 on klassinen voimanostorakenne (PDF-VERIFIOITU)");
      } else if (isGenStrength) {
        c.confidence += 20;
        c.rationale.push("Yleinen voima → Wendler 5/3/1 tukee kestoa ja PR-progressiota");
      }
      if (isIntermPlus) {
        c.confidence += 15;
        c.rationale.push("Keskitaso+ pystyy hyödyntämään AMRAP-autoregulaatiota tarkasti");
      } else {
        c.confidence -= 5;
        c.rationale.push("Aloittelijalle Wendler 5/3/1 vaatii kokemusta AMRAP-arviointiin (Vara ±1 tarkkuus)");
      }
      if (recent === "hypertrophy" || recent === "strength") {
        c.confidence += 10;
        c.rationale.push("Edellinen perinteinen blokki → Wendler on luonteva askel strukturoidulle voimasyklille");
      } else if (recent === "peaking" || recent === "deload") {
        c.confidence -= 5;
        c.rationale.push(`Edellinen ${recent} → Wendler voi olla liian intensiivinen ilman volyymivaihetta`);
      }
      if (a.q25_rpePrecision === "vara_calibrated") {
        c.confidence += 5;
        c.rationale.push("Kalibroitunut Vara (±1) → AMRAP-tarkkuus parantaa Wendlerin TM-säätöä");
      }
      if (cutAggressive) {
        c.confidence -= 10;
        c.rationale.push("Aggressivinen cut + AMRAP-Wendler = ristiriita (BBB-volyymi 5×10 raskas)");
      }

      // PRE-CHECK 2-tulos: PR-data Wendlerin 4 kisaliikkeelle
      if (missingCount >= 3) {
        c.confidence -= 30;
        c.rationale.push(`Wendler vaatii 1RM-arvion 4 kisaliikkeelle (Pystypunnerrus, Maastaveto, Penkkipunnerrus, Takakyykky). Annoit ${matchedWendlerLifts.length}/4 — TM-laskenta ei toimi ilman 1RM:ää`);
      } else if (missingCount >= 1) {
        c.confidence -= 10;
        const missingNames = wendlerLifts
          .filter(lift => !matchedWendlerLifts.includes(lift))
          .map(s => s.charAt(0).toUpperCase() + s.slice(1));
        c.rationale.push(`Wendler-TM-laskentaan tarvitaan vielä 1RM: ${missingNames.join(", ")}`);
      } else {
        c.confidence += 5;
        c.rationale.push("1RM annettu kaikille 4 Wendler-kisaliikkeelle → TM-laskenta voidaan tehdä suoraan");
      }

      // PRE-CHECK 3: Vammat jotka estävät Wendlerin kisaliikkeitä
      const injuries = Array.isArray(a.q11_injuries) ? a.q11_injuries : [];
      const absoluteAreas = injuries
        .filter(i => i && i.type === "absolute" && typeof i.area === "string")
        .map(i => i.area.toLowerCase());
      const wendlerInjuryBlocks = [];
      if (absoluteAreas.some(a => /selk|alaselk|back/.test(a))) wendlerInjuryBlocks.push("Maastaveto");
      if (absoluteAreas.some(a => /polvi|knee/.test(a))) wendlerInjuryBlocks.push("Takakyykky");
      if (absoluteAreas.some(a => /olka|olkapää|shoulder/.test(a))) wendlerInjuryBlocks.push("Pystypunnerrus / Penkkipunnerrus");
      if (wendlerInjuryBlocks.length > 0) {
        c.confidence -= 25 * wendlerInjuryBlocks.length;
        c.rationale.push(`Absoluuttinen vamma estää: ${wendlerInjuryBlocks.join(" + ")} — Wendler ei sovi koska 4 kisaliikettä ovat välttämättömiä`);
      }

      candidates.push(c);
    }
  }

  // ── 10. SINGLE-TOP-SET-BACKOFF (2D-β) ──
  // Androulakis-Korakakis 2021: minimitehokas voima — sopii kun aika rajallinen
  // tai atletti haluaa puhdasta voimaa ilman korkeaa volyymia.
  {
    const c = { styleId: "single-top-set-backoff", style: PROGRAM_STYLES["single-top-set-backoff"], confidence: 0, rationale: [], weekCount: 4 };
    if (isMaxGoal) {
      c.confidence += 30;
      c.rationale.push("Max-tavoite → top-single @ RPE 9 + 80% backoff on tehokas voimasignaali");
    }
    if (a.q23_volumePref === "MEV") {
      c.confidence += 25;
      c.rationale.push("Volyymipreferenssi MEV → minimitehokas top-set+backoff sopii suoraan");
    } else if (a.q23_volumePref === "MAV") {
      c.confidence += 5;
      c.rationale.push("MAV-preferenssi → top-set+backoff:n volyymi on hieman alle suosittelusi");
    } else if (a.q23_volumePref === "MRV") {
      c.confidence -= 10;
      c.rationale.push("MRV-preferenssi → top-set+backoff EI tuota tarpeeksi volyymia (vain 3-4 työnsarjaa/lift)");
    }
    if (isAdvancedPlus) {
      c.confidence += 10;
      c.rationale.push("Edistynyt taso sietää RPE 9-9.5 -voimasinglet (Zourdos 2016: kokenut atletti tarkka)");
    } else if (tier === "beginner") {
      c.confidence -= 15;
      c.rationale.push("Aloittelijan RIR-tarkkuus heikko (Zourdos 2016 ES > NS p=0.023) → singlet riskialttiit");
    }
    // Lyhyt sessio ja tehokkuus
    const sessionMin = Number(a.q24_frequency?.sessionLengthMinutes) || 60;
    if (sessionMin < 60) {
      c.confidence += 10;
      c.rationale.push(`Sessio < 60 min → minimitehokas top-set+backoff sopii ajalliseen rajoitteeseen`);
    }
    if (cutAggressive) {
      c.confidence += 5;
      c.rationale.push("Aggressivinen cut → matala volyymi (top-set+backoff) sopii palautumiskapasiteetille");
    }
    candidates.push(c);
  }

  // ── 11. SINGLE-MADCOW-5x5 (2D-β) ──
  // Madcow 5×5: intermediate-tason lineaarinen progressio. EI advanced (15+v)
  // lifterille suoraan — yhteisön ohjeessa "+2.5%/vk on intermediate-arvo".
  {
    const c = { styleId: "single-madcow-5x5", style: PROGRAM_STYLES["single-madcow-5x5"], confidence: 0, rationale: [], weekCount: 5 };
    if (tier === "intermediate") {
      c.confidence += 40;
      c.rationale.push("Keskitaso (1-3 v) → Madcow 5×5 on kohdistettu intermediate-LP:lle");
    } else if (tier === "beginner") {
      c.confidence += 15;
      c.rationale.push("Aloittelija → Madcow toimii LP-ohjelmana, mutta StrongLifts/Starting Strength on yleensä parempi alkuun");
    } else if (tier === "advanced") {
      c.confidence -= 10;
      c.rationale.push("Edistynyt (3-8 v) → +2.5%/vk progressio epärealistinen; redukoi 1-1.5%/vk tai harkitse blokkimallia");
    } else if (tier === "elite") {
      c.confidence -= 20;
      c.rationale.push("Eliitti (8+ v) → +2.5%/vk on liian aggressiivinen, stagnaatio ehkä vk 5");
    }
    if (isMaxGoal || isGenStrength) {
      c.confidence += 15;
      c.rationale.push("Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua");
    }
    if (recent === "off_program" || recent === "deload") {
      c.confidence += 10;
      c.rationale.push("Tulet pois ohjelmattomasta/deloadista → Madcow:n lineaarinen progressio palauttaa pohjan");
    }
    if (a.q24_frequency?.daysPerWeek === 3) {
      c.confidence += 5;
      c.rationale.push("3 päivää/vk → sopii suoraan Madcow:n Ma/Ke/Pe-rakenteeseen");
    } else if (a.q24_frequency?.daysPerWeek > 3) {
      c.confidence -= 5;
      c.rationale.push("Yli 3 päivää/vk → Madcow:n HLM-pattern ei laajene helposti");
    }
    candidates.push(c);
  }

  // ── 12. SINGLE-WESTSIDE-CONJUGATE (2D-γ) ──
  // WSBB Conjugate: advanced/elite + max-tavoite. Vaatii kokemusta + nelipäiväistä viikkoa.
  {
    const c = { styleId: "single-westside-conjugate", style: PROGRAM_STYLES["single-westside-conjugate"], confidence: 0, rationale: [], weekCount: 4 };
    if (isMaxGoal) {
      c.confidence += 30;
      c.rationale.push("Max-tavoite + Westside-rotaatio sopivat klassiseen voimanostokontekstiin");
    } else if (a.q12_primaryGoal === "powerlifting") {
      c.confidence += 25;
      c.rationale.push("Voimanostokisaus → Westside on equipped-PL-tausta, sopii myös rawille");
    }
    if (isAdvancedPlus) {
      c.confidence += 25;
      c.rationale.push("Edistynyt taso vaaditaan — ME-rotaation viikoittainen vaihto + 1RM-singletkin");
    } else {
      c.confidence -= 20;
      c.rationale.push("Aloittelijalle/intermediate Westside on liian monimutkainen + 1RM-singlet riskialttiit");
    }
    if (a.q24_frequency?.daysPerWeek === 4) {
      c.confidence += 10;
      c.rationale.push("4 päivää/vk → sopii suoraan ME-Lower/ME-Upper/DE-Lower/DE-Upper -jakoon");
    } else if (a.q24_frequency?.daysPerWeek < 4) {
      c.confidence -= 15;
      c.rationale.push("Westside vaatii 4 päivää/vk — vähemmällä joudut leikkaamaan ME- tai DE-päivän");
    }
    if (recent === "peaking" || recent === "deload") {
      c.confidence -= 10;
      c.rationale.push(`Edellinen ${recent} → Westside ei ole optimaalinen ennen pohjavaihetta`);
    }
    candidates.push(c);
  }

  // ── 13. SINGLE-GZCL-JT20 (2D-γ) ──
  // GZCL J&T 2.0: 12 vk, tier-rakenne. Vaatii ajan + advanced.
  {
    const c = { styleId: "single-gzcl-jt20", style: PROGRAM_STYLES["single-gzcl-jt20"], confidence: 0, rationale: [], weekCount: 12 };
    if (isMaxGoal || isGenStrength) {
      c.confidence += 30;
      c.rationale.push("Voima/yleinen voima + 12 vk strukturoitu T1/T2/T3-tier-rakenne tukee progressiota");
    }
    if (isIntermPlus) {
      c.confidence += 20;
      c.rationale.push("Keskitaso+ pystyy hyödyntämään LSAMRAP-progressiota tarkasti");
    } else {
      c.confidence -= 10;
      c.rationale.push("Aloittelijalle J&T 2.0 on liian monimutkainen — GZCLP olisi parempi (mutta sitä ei ole tässä)");
    }
    if (volPref === "MAV") {
      c.confidence += 10;
      c.rationale.push("MAV-volyymipreferenssi sopii T1+T2+T3 tier-volyymin 1:2:3-suhteeseen");
    }
    // 12 vk vaatii aikaa — jos kisapäivä alle 12 vk, penalty
    if (hasTargetDate && typeof daysUntilTarget === "number" && daysUntilTarget < 84) {
      c.confidence -= 15;
      c.rationale.push("Kisapäivä alle 12 vk → J&T 2.0 ei mahdu kalenteriin kokonaisuudessaan");
    }
    if (recent === "off_program" || recent === "deload") {
      c.confidence += 10;
      c.rationale.push("Tulet pois ohjelmattomasta/deloadista → J&T 2.0:n RM-target 10→1 antaa hyvän progressioväylän");
    }
    candidates.push(c);
  }

  // ── 14. SINGLE-SHEIKO-DERIVED (2D-γ) ──
  // Sheiko #29 prep: korkea volyymi, voimanosto-tausta.
  {
    const c = { styleId: "single-sheiko-derived", style: PROGRAM_STYLES["single-sheiko-derived"], confidence: 0, rationale: [], weekCount: 4 };
    if (a.q12_primaryGoal === "powerlifting") {
      c.confidence += 35;
      c.rationale.push("Voimanostokisaus → Sheiko-volyymi (200-400 NL/vk) on kanoninen prep");
    } else if (isMaxGoal) {
      c.confidence += 15;
      c.rationale.push("Max-tavoite + venäläinen high-volume-tradicio");
    }
    if (volPref === "MRV") {
      c.confidence += 20;
      c.rationale.push("MRV-volyymipreferenssi → Sheiko-volyymi sopii suoraan");
    } else if (volPref === "MEV") {
      c.confidence -= 15;
      c.rationale.push("MEV-preferenssi → Sheiko-volyymi (3 sessiota × 2h) on liian raskas");
    }
    if (isAdvancedPlus) {
      c.confidence += 10;
      c.rationale.push("Edistynyt taso vaaditaan — Sheiko-prep on intermediate/advanced -konteksti");
    } else {
      c.confidence -= 15;
      c.rationale.push("Aloittelijalle Sheiko-volyymi on liian raskas");
    }
    // Streetlifting-laajennus = SHEIKO-DERIVED → mutta jos atletti ei powerliftaa, isompi malli sopii heikommin
    if (a.q09_sport === "streetlifting") {
      c.confidence -= 10;
      c.rationale.push("Streetlifting-spesialisaatio → leuka/dippi-laajennus on SHEIKO-DERIVED, ei kanoninen");
    }
    if (cutAggressive) {
      c.confidence -= 20;
      c.rationale.push("Aggressivinen cut + Sheiko-volyymi = ristiriita (palautumiskapasiteetti rajallinen)");
    }
    candidates.push(c);
  }

  // ── 15. SINGLE-MINIMALIST-RP (2D-γ) ──
  // RP Minimalist: hypertrofia-fokus, MEV → MAV. Pääliikkeen 1RM-progressio rajallinen.
  {
    const c = { styleId: "single-minimalist-rp", style: PROGRAM_STYLES["single-minimalist-rp"], confidence: 0, rationale: [], weekCount: 4 };
    if (isHypGoal) {
      c.confidence += 40;
      c.rationale.push("Hypertrofia-tavoite → RP volume landmarks suoraan kohdistettu");
    } else if (a.q13_secondaryGoal === "hypertrophy") {
      c.confidence += 20;
      c.rationale.push("Sivutavoite hypertrofia → RP-malli tukee apuliikkeitä");
    } else if (isMaxGoal) {
      c.confidence -= 15;
      c.rationale.push("Max-tavoite + RP-hypertrofia = väärä työkalu pääliikkeelle (volyymilandmark on hypertrofialle)");
    }
    if (volPref === "MAV" || volPref === "MRV") {
      c.confidence += 15;
      c.rationale.push("MAV/MRV-preferenssi → RP-progressio toimii kohdistetusti");
    }
    if (cutAggressive) {
      c.confidence -= 10;
      c.rationale.push("Aggressivinen cut + hypertrofia = kasvu rajoittuu (sopii silti maintenance:iin)");
    }
    candidates.push(c);
  }

  // ── 16. SINGLE-SMOLOV-JR (2D-γ) ──
  // Smolov Jr: yhden liikkeen intensiivi-spesialisaatio. Erittäin riskialtis.
  {
    const c = { styleId: "single-smolov-jr", style: PROGRAM_STYLES["single-smolov-jr"], confidence: 0, rationale: [], weekCount: 4 };
    if (isMaxGoal && isAdvancedPlus) {
      c.confidence += 25;
      c.rationale.push("Max-tavoite + edistynyt taso → Smolov Jr on yksittäisen liikkeen peak-vaihtoehto");
    } else if (isMaxGoal) {
      c.confidence += 10;
      c.rationale.push("Max-tavoite → Smolov Jr toimii, mutta tarvitset hyvän pohjan");
    } else {
      c.confidence = 5;
      c.rationale.push("Smolov Jr on yhden liikkeen intensiivi-blokki, ei sovi ilman selvää max-tavoitetta");
    }
    if (tier === "beginner" || tier === "intermediate") {
      c.confidence -= 25;
      c.rationale.push("Aloittelijalle/intermediate Smolov Jr on liian intensiivi (jännerakenne-riski)");
    }
    if (cutAggressive) {
      c.confidence -= 25;
      c.rationale.push("Aggressivinen cut + Smolov Jr = vaarallinen yhdistelmä (palautumiskapasiteetti+lisävaatimukset)");
    }
    if (recent === "peaking" || recent === "deload") {
      c.confidence -= 15;
      c.rationale.push(`Edellinen ${recent} → Smolov Jr vaatii hyvän pohjan, ei sovi heti peakingin jälkeen`);
    }
    candidates.push(c);
  }

  // ── 17. SINGLE-COAN-PHILLIPI (2D-γ) ──
  // Coan-Phillipi: DL-spesifinen peakaus 10 vk + meet.
  {
    const c = { styleId: "single-coan-phillipi", style: PROGRAM_STYLES["single-coan-phillipi"], confidence: 0, rationale: [], weekCount: 11 };
    if (a.q12_primaryGoal === "powerlifting") {
      c.confidence += 30;
      c.rationale.push("Voimanostokisaus + DL-spesialisaatio → Coan-Phillipi on kanoninen peakaus");
    } else if (isMaxGoal) {
      c.confidence += 15;
      c.rationale.push("Max-tavoite → Coan-Phillipi DL-peakaus toimii, jos DL on prioriteetti");
    }
    if (hasTargetDate && typeof daysUntilTarget === "number" && daysUntilTarget >= 70 && daysUntilTarget <= 84) {
      c.confidence += 25;
      c.rationale.push(`Kisapäivä ${daysUntilTarget} pv → Coan-Phillipi 11 vk osuu täsmälleen kisapäivään`);
    } else if (hasTargetDate && typeof daysUntilTarget === "number" && (daysUntilTarget < 70 || daysUntilTarget > 91)) {
      c.confidence -= 10;
      c.rationale.push(`Kisapäivä ${daysUntilTarget} pv ei sovi Coan-Phillipi 10+1 vk -kalenteriin tarkasti`);
    }
    if (isAdvancedPlus) {
      c.confidence += 10;
      c.rationale.push("Edistynyt taso vaaditaan — 'Desired 1RM' edellyttää realistista 1RM-tietämystä");
    }
    if (a.q09_sport === "streetlifting") {
      c.confidence -= 15;
      c.rationale.push("Streetlifting-spesialisaatio → Coan-Phillipi on DL-spesifi, leuka/dippi-mukautus = COAN-PHILLIPI-DERIVED");
    }
    candidates.push(c);
  }

  // ── Cap-säännöt + rationale-fallback (rajoittavat tyylejä sopimattomissa konteksteissa) ──
  for (const c of candidates) {
    // Eksentrinen MAX 25 jos beginner/intermediate
    if (c.styleId === "single-eksentrinen" && !isAdvancedPlus && c.confidence > 5) {
      c.confidence = Math.min(c.confidence, 25);
    }
    // Rationale-fallback: jos style ei saanut yhtään perustelua, lisää geneerinen.
    // Tämä takaa että UI näyttää aina jotain (eikä tyhjää korttia).
    if (!Array.isArray(c.rationale) || c.rationale.length === 0) {
      c.rationale = ["Yleisesti soveltuva tyyli — ei vahvaa kohdistusta profiiliisi tässä tapauksessa"];
    }
    // Min/max-rajoitus 0-100
    c.confidence = Math.max(0, Math.min(100, Math.round(c.confidence)));
  }

  // Lajittele desc
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

// ─── Issurin Table V residuaalit (RISTIINTARKISTETTU) ──────────────────
// Lähde: Issurin & Lustig 2004 / Issurin 2008 Table V, modifoitu.
// 4 itsenäistä ristiviittauslähdettä toistavat täsmälleen samat luvut
// (Sportlyzer, TrainHeroic, Jastrzębski 2011, ExRx.net) — ks.
// docs/VAIHE_2B_RESEARCH_VERIFICATION.md §1.2.
//
// Yksikkö: päivää. Muoto: mean ± SD.
// HUOM: Hypertrofialle ja RFD:lle EI MAINITTU omia rivejä alkuperäisessä
// taulukossa — heuristic-sääntö K1 hoitaa hypertrofian tulkinnan.
export const RESIDUAL_DAYS = Object.freeze({
  aerobic_endurance:    { mean: 30, sd: 5, source: "Issurin Table V" },
  maximal_strength:     { mean: 30, sd: 5, source: "Issurin Table V" },
  anaerobic_glycolytic: { mean: 18, sd: 4, source: "Issurin Table V" },
  strength_endurance:   { mean: 15, sd: 5, source: "Issurin Table V" },
  maximal_speed:        { mean: 5,  sd: 3, source: "Issurin Table V" },
});

// ─── Validointi ───────────────────────────────────────────────────────
// Tarkistaa että wizardConfig + mainAppState sisältävät mapping:ille
// vaaditut tiedot. Palauttaa { valid: bool, errors: [{ reason, qid }] }.
//
// 2B-α EI tee koko wizardConfig-skeeman validointia (sen tekee wizard-data.js
// validateWizardConfig:ssa); tämä on KEVYT pre-flight-tarkistus että
// mapping ei kaadu undefined-arvoihin.
export function validateMappingInput(wizardConfig, mainAppState) {
  const errors = [];
  const push = (reason, qid) => errors.push({ reason, qid: qid || null });

  if (!wizardConfig || typeof wizardConfig !== "object") {
    push("wizardConfig puuttuu tai virheellinen");
    return { valid: false, errors };
  }
  if (!wizardConfig.completedAtISO) {
    push("Wizard pitää suorittaa loppuun ennen ohjelman generointia");
  }
  if (wizardConfig.schemaVersion !== "3.3") {
    push(`Vain wizard-skeema 3.3 tuetaan, sait: ${wizardConfig.schemaVersion}`);
  }
  const a = wizardConfig.answers;
  if (!a || typeof a !== "object") {
    push("wizardConfig.answers puuttuu");
    return { valid: false, errors };
  }

  // Pakolliset kentät joita ilman mapping ei voi toimia
  const REQUIRED_KEYS = [
    ["q08_selfLevel",       ["beginner", "intermediate", "advanced", "elite"]],
    ["q09_sport",           ["powerlifting", "streetlifting", "hypertrophy", "sport", "hybrid"]],
    ["q12_primaryGoal",     null], // string, ei spesifiä validointia
    ["q14_cutting",         ["yes", "no"]],
    ["q15_aerobicModality", ["none", "running", "cycling", "rowing", "swimming", "other"]],
    ["q21_splitPreference", ["fullbody", "upper_lower", "ppl", "broscience", "custom"]],
    ["q23_volumePref",      ["MEV", "MAV", "MRV", "auto"]],
    ["q29_recentBlock",     ["hypertrophy", "strength", "intensification", "peaking", "deload", "off_program"]],
  ];
  for (const [qid, validValues] of REQUIRED_KEYS) {
    const v = a[qid];
    if (v === undefined || v === null || v === "") {
      push(`Pakollinen kysymys ${qid} puuttuu`, qid);
    } else if (validValues && !validValues.includes(v)) {
      push(`${qid}: tuntematon arvo "${v}"`, qid);
    }
  }

  // q24_frequency on composite
  const freq = a.q24_frequency;
  if (!freq || typeof freq !== "object") {
    push("q24_frequency puuttuu", "q24_frequency");
  } else {
    const d = Number(freq.daysPerWeek);
    if (Number.isNaN(d) || d < 1 || d > 7) {
      push("q24_frequency.daysPerWeek 1-7 vaaditaan", "q24_frequency");
    }
    const s = Number(freq.sessionLengthMinutes);
    if (Number.isNaN(s) || s < 15 || s > 240) {
      push("q24_frequency.sessionLengthMinutes 15-240 vaaditaan", "q24_frequency");
    }
  }

  // q17_equipment array (vähintään yksi)
  if (!Array.isArray(a.q17_equipment) || a.q17_equipment.length === 0) {
    push("q17_equipment: valitse vähintään yksi kaluston tyyppi", "q17_equipment");
  }

  // mainAppState voi olla null (uusi käyttäjä) — sallittu
  if (mainAppState !== null && mainAppState !== undefined && typeof mainAppState !== "object") {
    push("mainAppState virheellinen tyyppi");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Vaihe 1: pickStartingBlock ───────────────────────────────────────
//
// Tutkimuspohja: Issurin 2010 block-malli + Issurin Table V residuaalit.
// K1-päätös: hypertrofia tulkitaan strength_endurance-kategoriaksi paitsi
// kun q12 viittaa max-voimaan, jolloin aletaan maksimivoima-blokilla
// (= Issurin-kategorioiden suora soveltaminen, ei keksitty luku).
//
// Päätöslogiikka:
//   q29="peaking"/"deload"/"off_program" → hypertrofia-aloitus (turvallisuus)
//   q29="hypertrophy" + q12 max-voima-target → maksimivoima-aloitus
//   q29="hypertrophy" + muu → yhdistelma
//   q29="strength" + q12 max-target → maksimivoima
//   q29="strength" + muu → yhdistelma
//   q29="intensification" → maksimivoima (= peaking-valmistus)
//
// Output: "hypertrofia" | "maksimivoima" | "yhdistelma" | "undulating"
//         (vastaa GOAL_SKELETONS-avaimia pää-app:issa)
// Pilari 3 C1: MAX_GOALS moduulitasolle (jaettu pickStartingBlock + goal→primary-resolveri,
// yhtenäinen tavoiteluokitus — single-sourced).
const MAX_GOALS = new Set([
  "max_1RM",
  "powerlifting",
  "streetlifting_with_explosive_components",
]);

export function pickStartingBlock(q29_recentBlock, q12_primaryGoal) {
  const isMaxGoal = MAX_GOALS.has(q12_primaryGoal);

  switch (q29_recentBlock) {
    case "peaking":
    case "deload":
    case "off_program":
      return "hypertrofia";
    case "hypertrophy":
      // K1 heuristic: hypertrofiasta seuraava on tyypillisesti voima.
      // Jos atletilla on max-tavoite, mennään suoraan maksimivoimaan.
      // Muutoin yhdistelma joka antaa pohjaa ja siirtää maksimi-vaiheen myöhemmäksi.
      return isMaxGoal ? "maksimivoima" : "yhdistelma";
    case "strength":
      return isMaxGoal ? "maksimivoima" : "yhdistelma";
    case "intensification":
      // Intensifikaation jälkeen peaking-valmistus — koska pää-app:in custom-
      // generaattori ei tue peaking-blokkia (vain default/hyp/maks/dup), valitaan
      // maksimivoima ja jätetään käyttäjälle valinta vaihtaa peaking-template:iin
      // myöhemmin manuaalisesti pää-app:in puolella.
      return "maksimivoima";
    default:
      return "yhdistelma"; // turvallinen fallback
  }
}

// ─── Vaihe 2: pickWeekCount ────────────────────────────────────────────
//
// Tutkimuspohja: Petré 2021 (PDF-VERIFIOITU kvalitatiivinen) — advanced/elite
// suurempi interferenssi → lyhyemmät blokit; Issurin 2010 block-malli.
//
// K2-päätös: kvalitatiiviset pituudet, EI numeerisia progressio-kertoimia.
// // HEURISTIC — Petré ei anna numeerisia kg/vk-arvoja, vain ES per status.
//
// lengthByTier-taulukko: alle 80 LoC, helppo päivittää jos tutkimus tuo
// uusia evidenssejä.
const _BLOCK_LENGTHS_BY_TIER = Object.freeze({
  beginner:     { hypertrofia: 8, maksimivoima: 4, yhdistelma: 6, undulating: 4 },
  intermediate: { hypertrofia: 6, maksimivoima: 4, yhdistelma: 4, undulating: 4 },
  advanced:     { hypertrofia: 4, maksimivoima: 4, yhdistelma: 4, undulating: 4 },
  elite:        { hypertrofia: 4, maksimivoima: 4, yhdistelma: 4, undulating: 4 },
});

export function pickWeekCount(q08_selfLevel, pickedBlock) {
  const tier = _BLOCK_LENGTHS_BY_TIER[q08_selfLevel];
  if (!tier) return 4;
  return tier[pickedBlock] || 4;
}

// ─── Vaihe 3: pickRecoveryCapacity ─────────────────────────────────────
//
// Tutkimuspohja:
//   - 2B-γ: Helms 2018 Front Physiol 9:247 (PDF-VERIFIOITU): cut-vaje >20%
//     (~500 kcal/päivä 91 kg atletille) vaatii volyymileikkauksen.
//   - 2B-α: Huiberts 2024 (PDF-VERIFIOITU): sex-difference vain concurrent
//     training -skenaariossa miehillä alaraajoilla (SMD = -0.43).
//   - 2B-α: Petré 2021: advanced/elite suurempi interferenssi same-session-cardiosta.
//
// Sääntöjen prioriteetti:
//   1. UUSI 2B-γ: cut + deficitKcal >= 500 → "heikko" (Helms 2018)
//   2. CT + male + advanced+ → "heikko" (Huiberts)
//   3. q23 primary signaali: MEV → heikko, MRV → hyva, MAV → keski
//   4. q23="auto" + advanced/elite → "hyva"
//   5. Default → "keski"
export function pickRecoveryCapacity(answers) {
  // 1. UUSI 2B-γ: Cut + aggressive vaje → heikko (volyymileikkaus pakollinen).
  // Helms 2018: vaje >20% maintenance:sta (n. >500 kcal/päivä 91 kg atletille)
  // vaatii volyymileikkauksen jotta palautuminen säilyy.
  if (answers.q14_cutting === "yes" && answers.q30_energyBudget && typeof answers.q30_energyBudget === "object") {
    const deficitKcal = Number(answers.q30_energyBudget.deficitKcal);
    if (!Number.isNaN(deficitKcal) && deficitKcal >= 500) {
      return "heikko";
    }
  }

  const hasCT = answers.q15_aerobicModality !== "none";
  const isMale = answers.q02_sex === "male";
  const isAdvancedPlus = answers.q08_selfLevel === "advanced" || answers.q08_selfLevel === "elite";
  const volumePref = answers.q23_volumePref;

  // 2. Huiberts-modifier kapea ehto:
  if (hasCT && isMale && isAdvancedPlus) {
    return "heikko";
  }

  // 3-5. q23 primary signaali → tier-default → keski-fallback
  if (volumePref === "MEV") return "heikko";
  if (volumePref === "MRV") return "hyva";
  if (volumePref === "MAV") return "keski";
  if (isAdvancedPlus) return "hyva";
  return "keski";
}

// ─── Vaihe 4: pickPrimaries ────────────────────────────────────────────
//
// Tutkimuspohja: ei suoraa tutkimusta (käytännön ohjelmointi). Lähtökohta:
// päälaji määrää default-primaryt, sitten suodatetaan q11_injuries
// (absolute-rajoitukset), q22_avoidedExercises ja q17_equipment perusteella.
//
// // HEURISTIC: q11-injury-mapping perustuu keyword-hakuun ("olka", "polvi",
// "selk") koska liikkeille ei ole formal injury-affinity-kenttää.
// 2B-γ voi rakentaa tarkemman mapping:n jos tarpeen.
const _SPORT_DEFAULTS = Object.freeze({
  streetlifting: [
    { name: "Lisäpainoleuanveto", category: "vertikaaliveto",     requires: ["pullup_bar"] },
    { name: "Lisäpainodippi",     category: "horisontaalityöntö", requires: ["dip_station"] },
    { name: "Takakyykky",         category: "alaraaja",           requires: ["barbell_rack"] },
    { name: "Muscle-up",          category: "vertikaaliveto",     requires: ["pullup_bar"] },
  ],
  powerlifting: [
    { name: "Penkkipunnerrus", category: "horisontaalityöntö", requires: ["barbell_rack"] },
    { name: "Takakyykky",      category: "alaraaja",           requires: ["barbell_rack"] },
    { name: "Maastaveto",      category: "lonkkahingaus",      requires: ["barbell_rack"] },
  ],
  hypertrophy: [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto", requires: ["pullup_bar"] }],
  sport:       [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto", requires: ["pullup_bar"] }],
  hybrid:      [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto", requires: ["pullup_bar"] }],
});

// Pilari 3 C1 (FIX-A): tavoite-spesifit primaari-setit epäspesifeille lajeille
// (q09_sport ∈ {hypertrophy, sport, hybrid}). Ratifioitu 2026-06-18 (W1-standardista):
//   max     → tanko-big-3 (1RM-spesifisyys vaatii liikkeen harjoittelun)
//   general → full-body compound: alaraaja + työntö + veto (päälihasryhmät katettu)
//   hyp     → push + pull + legs (VOL-1: ≥10 settiä/lihasryhmä)
// Periaate: tavoite-spesifinen + päälihasryhmät katettu + ALARAAJA AINA mukana (#4-takuu setissä).
const _GOAL_PRIMARY_SETS = Object.freeze({
  max: [
    { name: "Takakyykky",      category: "alaraaja",           requires: ["barbell_rack"] },
    { name: "Penkkipunnerrus", category: "horisontaalityöntö", requires: ["barbell_rack"] },
    { name: "Maastaveto",      category: "lonkkahingaus",      requires: ["barbell_rack"] },
  ],
  general: [
    { name: "Takakyykky",         category: "alaraaja",           requires: ["barbell_rack"] },
    { name: "Penkkipunnerrus",    category: "horisontaalityöntö", requires: ["barbell_rack"] },
    { name: "Lisäpainoleuanveto", category: "vertikaaliveto",     requires: ["pullup_bar"] },
  ],
  hypertrophy: [
    { name: "Lisäpainoleuanveto", category: "vertikaaliveto",     requires: ["pullup_bar"] },
    { name: "Penkkipunnerrus",    category: "horisontaalityöntö", requires: ["barbell_rack"] },
    { name: "Takakyykky",         category: "alaraaja",           requires: ["barbell_rack"] },
  ],
});
function _goalPrimarySet(q12_primaryGoal) {
  const key = MAX_GOALS.has(q12_primaryGoal) ? "max"
            : (q12_primaryGoal === "hypertrophy" ? "hypertrophy" : "general");
  return _GOAL_PRIMARY_SETS[key].map(p => ({ ...p }));
}
const _NON_SPECIFIC_SPORTS = new Set(["hypertrophy", "sport", "hybrid"]);

// Injury-keyword → liike-keyword -mapping. // HEURISTIC.
const _INJURY_BLOCKLIST = [
  { injuryKeywords: ["olka", "olkapää", "shoulder"], movementKeywords: ["dippi", "punnerrus", "press"] },
  { injuryKeywords: ["polvi", "knee"],               movementKeywords: ["kyykky", "squat"] },
  { injuryKeywords: ["selk", "alaselk", "back"],     movementKeywords: ["maavet", "deadlift"] },
];

// ─── Pilari 3 FIX-B (C0): liike → VÄHIMMÄISkalustovaatimus ──────────────────
// A1 paljasti: liikepankissa EI ole kalustometatietoa (vain loadType+category),
// joten q17_equipment ei suodata apuliikkeitä → kalusto-vuoto (P2/P8). Tämä on
// se puuttuva kanoninen artefakti. Periaate (ratifioitu 2026-06-18):
// kalustovaatimus = liikkeen VÄHIMMÄISvaatimus.
//   requires:[...]     → KAIKKI tarvitaan (AND).
//   requiresAny:[[..]] → mikä tahansa ali-setti riittää (OR) — "lisäpaino vaaditaan
//                        mutta DB tai tanko käy".
//   [] / ei taulukossa → aina suoritettavissa (kehonpaino / ei välinettä).
// Tuntematon liike → movementRequiredEquipment-heuristiikka; EPÄVARMA → [] (älä
// suodata pois — inklusiivinen default, ratifioitu).
const _EQ_GROUPS = {
  pullup_bar:    ["Lisäpainoleuanveto", "Leuanveto (kehonpaino)", "Muscle-up", "Vastaote-leuat", "Yksikätinen leuanveto", "Archer pull-up", "L-sit pull-up", "Front Lever (hold)", "Planche (hold)", "Human Flag (hold)"],
  dip_station:   ["Lisäpainodippi", "Dippi (kehonpaino)", "Dippi"],
  barbell_rack:  ["Takakyykky", "Kyykky", "Etukyykky", "Penkkipunnerrus", "Maastaveto", "Pystypunnerrus", "Penkkiveto", "Vinopenkkipunnerrus", "Close-grip bench", "Floor press", "Pin press", "JM press", "Rack pull", "Romanialainen maastaveto (RDL)", "Romanian DL", "Paused squat", "Front squat", "Deficit DL", "Pin squat", "Box squat", "Safety bar squat", "Paused DL", "Block pull", "Snatch-grip DL", "Good morning", "Paused bench press", "Spoto press", "Larsen press", "Board press", "Push press", "Seated OHP", "Z-press", "T-bar row", "Seal row", "Hip thrust"],
  cable_machine: ["Ylätalja", "Lat pulldown", "Ylätalja neutraaliote", "Alatalja", "Cable row", "Seated row", "Tricep pushdown", "Face pull", "Cable crunch", "Cable curl", "Pallof press"],
  machines:      ["Jalkaprässi", "Yhden jalan jalkaprässi", "Leg extension", "Leg curl", "Chest press", "Shoulder press laite", "Pullover kone", "Chest-supported row", "Front-foot elevated split squat"],
  dumbbells:     ["Pystypunnerrus käsipainot", "Hauiskääntö käsipainot", "Hammer curl", "Preacher curl", "Incline curl", "Spider curl", "Sivunosto", "Dumbbell fly", "Skull crusher", "Overhead tricep ext", "French press", "Kickback"],
};
const MOVEMENT_EQUIPMENT = Object.freeze((() => {
  const m = {};
  for (const [eq, names] of Object.entries(_EQ_GROUPS)) for (const n of names) m[n] = [eq];
  return m;
})());
// "lisäpaino vaaditaan" mutta DB TAI tanko riittää (ratifioitu).
const MOVEMENT_EQUIPMENT_ANY = Object.freeze({
  "Hauiskääntö tanko": [["barbell_rack"], ["dumbbells"]],
  "Hauiskääntö":       [["dumbbells"], ["barbell_rack"]],
  "Power shrug":       [["barbell_rack"], ["dumbbells"]],
});
// Eksplisiittisesti kehonpaino (vähimmäisvaatimus = ei välinettä — ratifioitu:
// Bulgarian/lunge/pohjenosto/GHR → bodyweight).
const BODYWEIGHT_MOVEMENTS = new Set([
  "Handstand push-up (HSPU)", "Bulgarian split squat", "Walking lunge", "Pohjenosto",
  "Glute-Ham Raise", "Hyperextensio", "Vatsalihakset (yleinen)", "L-sit (hold)",
  "Hanging leg raise", "Ab wheel rollout",
]);

// Palauta liikkeen vähimmäiskalustovaatimus: { requires: [...]|null, any: [[...]]|null }.
export function movementRequiredEquipment(name, loadType, category) {
  if (!name || typeof name !== "string") return { requires: [], any: null };
  if (MOVEMENT_EQUIPMENT[name])     return { requires: MOVEMENT_EQUIPMENT[name], any: null };
  if (MOVEMENT_EQUIPMENT_ANY[name]) return { requires: null, any: MOVEMENT_EQUIPMENT_ANY[name] };
  if (BODYWEIGHT_MOVEMENTS.has(name)) return { requires: [], any: null };
  const n = name.toLowerCase();
  if (/talja|cable|pulldown|pushdown|pallof/.test(n))                                   return { requires: ["cable_machine"], any: null };
  if (/laite|kone|prässi|leg extension|leg curl|machine|smith|hack|chest press|chest-supported/.test(n)) return { requires: ["machines"], any: null };
  if (/käsipaino|dumbbell|hammer|preacher|incline curl|spider|skull|kickback|\bfly\b|sivunosto/.test(n)) return { requires: ["dumbbells"], any: null };
  if (loadType === "isometric_hold") return { requires: [], any: null };
  if (loadType === "system") {
    if (category === "vertikaaliveto")     return { requires: ["pullup_bar"], any: null };
    if (category === "horisontaalityöntö") return { requires: ["dip_station"], any: null };
    return { requires: [], any: null }; // muu kehonpaino (esim. HSPU)
  }
  // loadType external, ei avainsana-osumaa → EPÄVARMA → [] (älä suodata, inklusiivinen)
  return { requires: [], any: null };
}

// Onko liike suoritettavissa annetulla kalustolla (Set q17-arvoja)?
export function isMovementPerformable(name, loadType, category, eqSet) {
  const { requires, any } = movementRequiredEquipment(name, loadType, category);
  if (any) return any.some(opt => opt.every(req => eqSet.has(req)));
  return requires.every(req => eqSet.has(req));
}

export function pickPrimaries(answers) {
  // Pilari 3 C1 (FIX-A): spesifit lajit (streetlifting/powerlifting) → _SPORT_DEFAULTS (ennallaan).
  // Epäspesifit (hypertrophy/sport/hybrid) → tavoite-spesifi setti q12_primaryGoal:n mukaan
  // (EI enää default-leuanveto). q12 saavuu nyt resolveriin — A1-juuri #1.
  let primaries;
  if (_NON_SPECIFIC_SPORTS.has(answers.q09_sport)) {
    primaries = _goalPrimarySet(answers.q12_primaryGoal);
  } else {
    primaries = _SPORT_DEFAULTS[answers.q09_sport] || _SPORT_DEFAULTS.hybrid;
  }
  primaries = primaries.map(p => ({ ...p })); // shallow copy jotta original ei muutu

  // 1. q11_injuries (absolute) → poista
  if (Array.isArray(answers.q11_injuries)) {
    const absoluteAreas = answers.q11_injuries
      .filter(i => i && i.type === "absolute" && typeof i.area === "string")
      .map(i => i.area.toLowerCase());
    if (absoluteAreas.length > 0) {
      primaries = primaries.filter(p => {
        const nameL = p.name.toLowerCase();
        return !_INJURY_BLOCKLIST.some(b => {
          const injuryHit = absoluteAreas.some(a => b.injuryKeywords.some(k => a.includes(k)));
          if (!injuryHit) return false;
          return b.movementKeywords.some(k => nameL.includes(k));
        });
      });
    }
  }

  // 2. q22_avoidedExercises → poista nimi-osumat
  if (Array.isArray(answers.q22_avoidedExercises)) {
    const avoided = answers.q22_avoidedExercises
      .filter(s => typeof s === "string" && s.trim().length > 0)
      .map(s => s.toLowerCase().trim());
    if (avoided.length > 0) {
      primaries = primaries.filter(p => {
        const nameL = p.name.toLowerCase();
        return !avoided.some(av => nameL.includes(av) || av.includes(nameL));
      });
    }
  }

  // 3. q17_equipment → poista jos vaadittu kalusto puuttuu
  const eq = new Set(Array.isArray(answers.q17_equipment) ? answers.q17_equipment : []);
  primaries = primaries.filter(p => {
    if (!Array.isArray(p.requires) || p.requires.length === 0) return true;
    return p.requires.every(req => eq.has(req));
  });

  // 4. Fallback: jos kaikki poistettu, turvallinen yksi liike
  // (Lisäpainoleuanveto ei vaadi tankoa/dippitelinettä — toimii bodyweightina
  // jos pullup_bar löytyy. Jos sekään ei löydy, palautetaan Leuanveto.)
  if (primaries.length === 0) {
    if (eq.has("pullup_bar")) {
      primaries = [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }];
    } else {
      primaries = [{ name: "Leuanveto (kehonpaino)", category: "vertikaaliveto" }];
    }
  }

  // Palauta vain name+category (generateCustomMesocycle:n vaatima rakenne)
  return primaries.map(({ name, category }) => ({ name, category }));
}

// ─── Vaihe 5: pickPreferredDaysOfWeek ──────────────────────────────────
//
// v4.51.6: Lukee q31_preferredDays ensisijaisesti. Jos atletti valitsi päivät
// itse JA listan pituus täsmää q24.daysPerWeek-arvon kanssa, käytetään hänen
// valintaansa. Muuten fallback tasaisesti jaettuihin defaultti-päiviin
// (lepopäivä raskaiden välissä). Tämä antaa atletille kontrollin treeniajoista
// säilyttäen samalla älykkään defaultin niille jotka eivät halua valita.
//
// Päivänumerot: 0=Ma, 1=Ti, 2=Ke, 3=To, 4=Pe, 5=La, 6=Su.
export function pickPreferredDaysOfWeek(q24_frequency, q31_preferredDays) {
  const days = Number(q24_frequency?.daysPerWeek);
  if (Number.isNaN(days) || days < 1) return null;
  // v4.51.6: prioritisoi käyttäjän valinta jos lista on validi.
  if (Array.isArray(q31_preferredDays) && q31_preferredDays.length === days) {
    const validDays = q31_preferredDays
      .map(d => Number(d))
      .filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
    if (validDays.length === days) {
      // Järjestä päivänumerot nousevasti jotta jako toimii ennustettavasti
      return validDays.sort((a, b) => a - b);
    }
  }
  // Fallback: tasaisesti jaetut päivät lepopäivän kanssa raskaiden välissä.
  if (days === 1) return [0];                       // Ma
  if (days === 2) return [1, 4];                    // Ti, Pe
  if (days === 3) return [1, 3, 5];                 // Ti, To, La
  if (days === 4) return [0, 2, 4, 5];              // Ma, Ke, Pe, La
  if (days === 5) return [0, 1, 3, 4, 5];           // Ma, Ti, To, Pe, La
  if (days === 6) return [0, 1, 2, 4, 5, 6];        // Ma, Ti, Ke, Pe, La, Su
  if (days === 7) return [0, 1, 2, 3, 4, 5, 6];
  return null;
}

// ─── Vaihe 6: applyTargetDateAnchor ────────────────────────────────────
//
// Jos q27_targetDate on annettu, lasketaan weekCount niin että viimeinen
// viikko osuu kisapäivän viikolle. Ylikirjoittaa pickWeekCount-tuloksen.
//
// Rajat: minDaysFromNow 14 (= 2 vk) wizardissa varmistettu, mutta tarkistetaan
// täällä uudelleen. maxWeekCount 16 (= pää-app:n streetlifting_16w-pituus).
export function applyTargetDateAnchor(weekCountFromTier, q27_targetDate, startDateISO) {
  if (!q27_targetDate || typeof q27_targetDate !== "string") {
    return { weekCount: weekCountFromTier, anchored: false, warning: null };
  }
  const start = new Date(startDateISO);
  const target = new Date(q27_targetDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) {
    return { weekCount: weekCountFromTier, anchored: false, warning: "Päivämäärät virheellisiä" };
  }
  const diffMs = target.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 86400000));
  if (diffWeeks < 2) {
    return {
      weekCount: Math.max(2, weekCountFromTier),
      anchored: false,
      warning: "Kisapäivä on alle 2 viikon päässä — peakingin ankkurointi ei mahdollista",
    };
  }
  const anchoredWeeks = Math.min(diffWeeks, 16);
  return { weekCount: anchoredWeeks, anchored: true, warning: null };
}

// ─── 2C-α: Multi-blokki-mahdollisuus ──────────────────────────────────
//
// Issurin 2010 block-malli: hypertrofia → strength → intensification → peaking.
// Kun atletilla on kisapäivä (q27_targetDate) JA aikaa ≥ 5 vk → tuotetaan
// useamman blokin sekvenssi yhdessä mesocyclessä, ei yhden blokin
// (= 2B-α:n single-blokki-logiikka).
//
// Pää-app:in scaleWeekCount rajoittaa blokki-pituudet 4/8/12 vk:hon JA
// vain 4-vk-pohjaisille skeleton:eille. Tästä syystä 2C-α käyttää
// **4 vk per blokki** -rakennetta (paitsi peaking 2 vk). Sekvenssit:
//
//   ≥ 14 vk käytettävissä → 4 blokkia (4+4+4+2 = 14)
//   10-13 vk             → 3 blokkia (4+4+2 = 10)
//   6-9 vk               → 2 blokkia (4+2 = 6)
//   < 6 vk               → null (= fallback single-blokkiin)
//
// q08_selfLevel ei muuta vk-pituuksia tässä versiossa — se hoidetaan
// myöhemmin 2C-γ:ssa tier-pohjaisten progressio-kerrointen kautta.
// 2C-α tuo VAIN sekvenssin rakenteen, ei kg-progressio-säätöä.

export function pickBlockSequence(answers, daysUntilTarget) {
  // Ei target-päivää TAI alle 5 vk → single-blokki (=2B-α-logiikka)
  if (typeof daysUntilTarget !== "number" || daysUntilTarget < 35) {
    return null;
  }

  const totalWeeks = Math.min(Math.floor(daysUntilTarget / 7), 20); // cap 20 vk
  const isMaxGoal = ["max_1RM", "powerlifting", "streetlifting_with_explosive_components"]
    .includes(answers.q12_primaryGoal);

  // Multi-blokki vain max-tavoitteille (powerlifting/streetlifting/1RM-fokus).
  // Hypertrofia-tavoitteelle EI auto-multi-blokkia — käyttäjä saa single-blokin
  // jonka voi toistaa (hypertrofia-progressio on pidempi prosessi, ei
  // tarvitse peaking-vaihetta).
  if (!isMaxGoal) {
    return null;
  }

  // q29_recentBlock vaikuttaa aloitusblokkiin (Issurin block-sekvenssi):
  //   peaking/deload/off_program → aloita hypertrofiasta
  //   hypertrophy → SKIP hypertrofia, aloita strengthistä
  //   strength    → SKIP hyp + str, aloita intensifikaatiosta
  //   intensification → aloita peaking (jos aikaa) tai strength
  //
  // 2C-δ KORJAUS: skip-sääntö pätee VAIN jos aikaa on rajoitettu (< 14 vk).
  // Issurin Table V residuaalit rapautuvat 30 ± 5 vrk:n jälkeen → jos aikaa
  // on ≥ 14 vk q29-blokin jälkeen, residuaalit ovat hävinneet ja TARVITAAN
  // uusi sykli alusta. Pilotti paljasti aiemmin että elite + q29=strength
  // + 16 vk kisaan jätti 10 vk hukkaan koska skipHyp+skipStr leikkasi sekvenssin
  // 6 vk:hon.
  const q29 = answers.q29_recentBlock;
  const hasAmpleTime = totalWeeks >= 14;
  const skipHyp = !hasAmpleTime && ["hypertrophy", "strength", "intensification"].includes(q29);
  const skipStr = !hasAmpleTime && ["strength", "intensification"].includes(q29);

  // Rakenna sekvenssi siitä blokista, jossa atletti _ei_ ole jo (= ei
  // päällekäisyyttä residuaalin kanssa). Peaking on aina viimeisenä, 2 vk.
  const candidates = [];
  // 2C-β2: käyttää uusia aitoja goal-arvoja:
  //   "intensifikaatio" → createIntensifikaatioMesocycle (matala volyymi, V1-V2)
  //   "peaking"        → createMultiBlockPeakingSkeleton (taper + kisaviikko)
  // Aiemmin (2C-α) intensifikaatio mappautui "yhdistelma":aan ja peaking
  // "maksimivoima":aan, mikä tuotti pilottiohjelmissa "strength toisinaan"
  // -rakenteita Issurin-mallin sijaan.
  if (!skipHyp) candidates.push({ goal: "hypertrofia",     weekCount: 4, label: "hypertrofia" });
  if (!skipStr) candidates.push({ goal: "maksimivoima",    weekCount: 4, label: "strength" });
  candidates.push({ goal: "intensifikaatio", weekCount: 4, label: "intensification" });
  candidates.push({ goal: "peaking",         weekCount: 2, label: "peaking" });

  // Valitse niin monta blokkia kuin aikaa riittää (peaking aina mukaan)
  const peakingBlock = candidates[candidates.length - 1];
  const middleBlocks = candidates.slice(0, -1);

  const blocks = [];
  let usedWeeks = peakingBlock.weekCount; // peaking 2 vk varattu
  // Lisää viimeiseksi → ensimmäiseksi (eli reverse-järjestyksessä jotta
  // peakingin lähinnä oleva blokki saadaan, jos aika ei riitä kaikille)
  for (let i = middleBlocks.length - 1; i >= 0; i--) {
    if (usedWeeks + middleBlocks[i].weekCount <= totalWeeks) {
      blocks.unshift(middleBlocks[i]);
      usedWeeks += middleBlocks[i].weekCount;
    }
  }
  blocks.push(peakingBlock);

  if (blocks.length < 2) {
    // Vain peaking mahtuu → ei kannata multi-blokki, käytä single-blokki
    return null;
  }

  return {
    blocks,
    totalWeeks: usedWeeks,
    anchored: true,
    skippedBlocks: { hypertrofia: skipHyp, strength: skipStr },
  };
}

export function mapWizardToMultiBlockMesocycle(wizardConfig, mainAppState) {
  // Validointi (sama kuin mapWizardToMesocycle)
  const validation = validateMappingInput(wizardConfig, mainAppState);
  if (!validation.valid) {
    throw new Error(`mapWizardToMultiBlockMesocycle: ${validation.errors[0].reason}`);
  }
  const a = wizardConfig.answers;
  const startDateISO = _todayISO();

  // Laske daysUntilTarget jos q27 annettu
  let daysUntilTarget = null;
  if (a.q27_targetDate) {
    const target = new Date(a.q27_targetDate);
    const start = new Date(startDateISO);
    if (!Number.isNaN(target.getTime()) && !Number.isNaN(start.getTime())) {
      daysUntilTarget = Math.floor((target.getTime() - start.getTime()) / 86400000);
    }
  }

  // Päätä block-sekvenssi
  const sequence = pickBlockSequence(a, daysUntilTarget);
  if (!sequence) {
    // Fallback: single-blokki (2B-γ-logiikka)
    return mapWizardToMesocycle(wizardConfig, mainAppState);
  }

  // Yhteiset kentät (sama logiikka kuin 2B-α/γ)
  const recoveryCapacity = pickRecoveryCapacity(a);
  const primaries = pickPrimaries(a);
  // v4.51.6: lue q31_preferredDays (atletin oma valinta) jos annettu
  const preferredDaysOfWeek = pickPreferredDaysOfWeek(a.q24_frequency, a.q31_preferredDays);
  const daysPerWeek = Number(a.q24_frequency?.daysPerWeek) || 3;

  const sexModifierApplied =
    a.q15_aerobicModality !== "none" &&
    a.q02_sex === "male" &&
    (a.q08_selfLevel === "advanced" || a.q08_selfLevel === "elite");

  const customLabel = `Räätälöity multi-blokki (${sequence.totalWeeks} vk, ${sequence.blocks.length} vaihetta)`;

  return {
    // generateMultiBlockMesocycle-yhteensopivat parametrit:
    blocks: sequence.blocks,
    primaries,
    daysPerWeek,
    recoveryCapacity,
    preferredDaysOfWeek,
    customLabel,
    startDateISO,
    isMultiBlock: true,
    // 2C-α metadata:
    _wizardMeta: {
      wizardId: wizardConfig.wizardId,
      wizardSchemaVersion: wizardConfig.schemaVersion,
      mapperVersion: MAPPER_VERSION,
      blockSequenceRationale: `${sequence.blocks.length}-blokin sekvenssi (${sequence.totalWeeks} vk)`,
      blocks: sequence.blocks.map(b => ({ goal: b.goal, weekCount: b.weekCount, label: b.label })),
      skippedBlocks: sequence.skippedBlocks,
      sexModifierApplied,
      targetDateAnchored: true,
      targetDateWarning: null,
      rules: _collectMultiBlockRules(a, sequence, recoveryCapacity, sexModifierApplied),
    },
  };
}

function _collectMultiBlockRules(a, sequence, recoveryCapacity, sexModifierApplied) {
  const rules = [];
  rules.push({
    rule: `q27_targetDate annettu + ${sequence.totalWeeks} vk käytettävissä → multi-blokki-sekvenssi`,
    status: "KVALITATIIVINEN",
    source: "Issurin 2010 block-sekvenssi (hyp → str → int → peak)",
  });
  const blockLabels = sequence.blocks.map(b => `${b.label} ${b.weekCount}vk`).join(" → ");
  rules.push({
    rule: `Block-sekvenssi: ${blockLabels}`,
    status: "KVALITATIIVINEN",
    source: "Issurin Table V residuaalit (RISTIINTARKISTETTU)",
  });
  if (sequence.skippedBlocks.hypertrofia || sequence.skippedBlocks.strength) {
    const skipped = [];
    if (sequence.skippedBlocks.hypertrofia) skipped.push("hypertrofia");
    if (sequence.skippedBlocks.strength) skipped.push("strength");
    rules.push({
      rule: `q29_recentBlock="${a.q29_recentBlock}" → ohitettiin: ${skipped.join(", ")}`,
      status: "KVALITATIIVINEN",
      source: "Issurin Table V residuaalit (aiempi blokki tuottaa residuaalin)",
    });
  }
  // Cut-aggressive-sääntö (2B-γ)
  const deficitKcal = a.q14_cutting === "yes" && a.q30_energyBudget
    ? Number(a.q30_energyBudget.deficitKcal) : NaN;
  if (a.q14_cutting === "yes" && !Number.isNaN(deficitKcal) && deficitKcal >= 500) {
    rules.push({
      rule: `Cut-vaihe + aggressive vaje (${deficitKcal} kcal/päivä) → recoveryCapacity="heikko"`,
      status: "PDF-VERIFIOITU",
      source: "Helms 2018 (vaje >20% → volyymileikkaus pakollinen)",
    });
  }
  if (sexModifierApplied) {
    rules.push({
      rule: `Concurrent training + miehillä + advanced → recoveryCapacity="heikko"`,
      status: "PDF-VERIFIOITU",
      source: "Huiberts 2024 (SMD -0.43 lower-body strength)",
    });
  }
  rules.push({
    rule: `q23_volumePref="${a.q23_volumePref}" → recoveryCapacity="${recoveryCapacity}"`,
    status: "KÄYTÄNNÖLLINEN",
    source: "Pää-app:in volume-tier-konventio",
  });
  rules.push({
    rule: `Liikejärjestys delegoidaan pää-app:in distributePrimariesToDays:lle (per blokki)`,
    status: "RISTIINTARKISTETTU",
    source: "Nunes 2021 (MJ-before-SJ) + ACSM 2009 Position Stand",
  });
  // 2C-γ: Tier-progressio multi-block:lle
  const tierMultMB = TIER_PROGRESSION_MULTIPLIERS[a.q08_selfLevel];
  if (typeof tierMultMB === "number") {
    const sexMultMB = a.q02_sex === "female" ? SEX_PROGRESSION_MULTIPLIER_FEMALE : 1.0;
    rules.push({
      rule: `q08_selfLevel="${a.q08_selfLevel}"${sexMultMB !== 1.0 ? " + naiskerroin" : ""} → progressiokerroin ${(tierMultMB*sexMultMB).toFixed(2)}× kullekin blokille (yksilövaihtelu ±50-100 %)`,
      status: "EMPIRINEN",
      source: "Latella 2020 powerlifting (n=1897) + Nuckols SBS-kyselydata + Williams 2017 (untrained > trained periodisaatiossa)",
    });
  }
  return rules;
}

// ─── 2C-δ: Isometric-pitojen e1RM-mallinnus ───────────────────────────
//
// Tutkimuspohja: docs/VAIHE_2C_RESEARCH_VERIFICATION.md (2026-05-11).
// PubMed-haku 11 termiä → NOLLATULOS calisthenics-isometric-progressiolle.
// Käytettävät lähteet:
//   - Steven Low "Overcoming Gravity 2" 2016 (EMPIRINEN PROTOKOLLA):
//     Front Lever -progressio Tuck → Adv Tuck → Straddle → Half Lay → Full
//     Sweet-spot: 60-70% max-hold, 2-3x/vk, 1 rep ≈ 2s isometric
//   - Christopher Sommer "GymnasticBodies" Steady State Cycle (EMPIRINEN):
//     60s/15s-tavoitteet, 8-12 vk SSC
//   - Heavyweight Cali + Frinks-survey n=322 (EI-TUTKIMUSPOHJAINEN):
//     Full Front Lever ≈ weighted pull-up @ 80-90 % BW (1RM)
//   - Marcus Urbanski (Rise With Marcus) biomekaaninen torque-malli (KLASSINEN
//     MEKANIIKKA, EI calisthenics-validoitu):
//     τ = r × BW × g × cos(θ), r ≈ 0.225 × pituus
//
// STATUS: **EMPIRINEN HEURISTIIKKA, EI peer-reviewed.** Yksilövaihteluväli
// ±15-25 % (Heavyweight Cali, antropometriasta riippuvainen). EI saa
// väittää tieteellistä validaatiota — _wizardMeta.rules.status="EMPIRINEN
// PROTOKOLLA".

// Front Lever -progressiotasot ja %BW-kertoimet weighted pull-up 1RM:lle.
// Lähteet: OG2 (Low) tasot + Heavyweight Cali / Frinks n=322 -konsensus
// (Tuck/Adv Tuck/Straddle-välitasot ovat Reddit-yhteisön ekstrapolaatiota,
// ei suoraa lähdettä — merkitty status="EMPIRINEN HEURISTIIKKA").
const FRONT_LEVER_LEVELS = Object.freeze({
  tuck:        { pctBW: 0.10, ssCsTargetSec: 60, source: "Yhteisöheuristiikka" },
  adv_tuck:    { pctBW: 0.30, ssCsTargetSec: 60, source: "Reddit ekstrapolaatio" },
  straddle:    { pctBW: 0.55, ssCsTargetSec: 15, source: "Reddit ekstrapolaatio" },
  half_lay:    { pctBW: 0.70, ssCsTargetSec: 15, source: "OG2 + yhteisö" },
  full:        { pctBW: 0.85, ssCsTargetSec: 15, source: "Heavyweight Cali + Frinks n=322" },
});

// Planche-progressio: Urbanski biomekaaninen torque-malli, KLASSINEN MEKANIIKKA,
// EI calisthenics-validoitu.
// τ = r × BW × g × cos(θ); r ≈ 0.225 × pituus (ei käytettävissä BW ainoaa)
// Käytetään %BW-vastinetta lisäpaino-dippi 1RM:lle (kuorma per käsivarsi
// → vastaa työntö-volyymia)
const PLANCHE_LEVELS = Object.freeze({
  tuck:        { pctBW: 0.20, ssCsTargetSec: 60, source: "OG2 + yhteisö" },
  adv_tuck:    { pctBW: 0.35, ssCsTargetSec: 60, source: "Yhteisöheuristiikka" },
  straddle:    { pctBW: 0.55, ssCsTargetSec: 15, source: "OG2 + Sommer" },
  half_lay:    { pctBW: 0.70, ssCsTargetSec: 10, source: "Sommer" },
  full:        { pctBW: 0.85, ssCsTargetSec: 10, source: "Sommer (full planche 10s end goal)" },
});

// HSPU-progressio: koska tämä on ohjeitettu kehonpaino-OHP-tyylisesti,
// e1RM-vastine perustuu pikalinjaan koko BW:n päälle (= "kykenee
// nostamaan oma kehopainon ylös päästä").
// Pää-app:in pystypunnerrus 1RM-vastine.
const HSPU_LEVELS = Object.freeze({
  pike:           { pctBW: 0.30, source: "OG2 (Pike HSPU = ~30% BW OHP-vastine)" },
  box:            { pctBW: 0.50, source: "OG2 yhteisöheuristiikka" },
  wall_ecc:       { pctBW: 0.70, source: "OG2 yhteisöheuristiikka" },
  wall:           { pctBW: 1.00, source: "OG2: full wall HSPU = oma BW OHP" },
  free_ecc:       { pctBW: 1.10, source: "Yhteisöheuristiikka (eccentric ≥ BW)" },
  free:           { pctBW: 1.25, source: "OG2 + Sommer: free HSPU vaatii balance + BW × 1.25 OHP-vastine" },
});

// One-arm pull-up -progressio: kehonpaino × 1.0 = unassisted yhden käden veto.
// Lähde: Low "kun 3-4 sets × 10s eccentric → unassisted".
const OAP_LEVELS = Object.freeze({
  ecc_3_5s:        { pctBW: 0.50, source: "Low OG2 (3-5s eccentric ≈ 50% BW pull-up)" },
  ecc_7_10s:       { pctBW: 0.75, source: "Low OG2 (7-10s eccentric ≈ 75% BW pull-up)" },
  finger_assisted: { pctBW: 0.90, source: "Low: 1 sormi assistance ≈ 90 % BW" },
  unassisted:      { pctBW: 1.00, source: "Low OG2 + Sommer (täysi BW yhdellä kädellä)" },
});

// Movement-name → level-tunnistus. Käyttäjä syöttää q26-PR-rivin
// movementName-kenttään esim. "Front Lever (Straddle)" — tämä funktio
// kartoittaa nimen oikealle tason vakioidulle id:lle.
function _detectIsometricLevel(movementName) {
  if (typeof movementName !== "string") return null;
  const n = movementName.toLowerCase();

  // Front Lever
  if (n.includes("front lever") || n.includes("frontlever") || n.includes("fl ")) {
    if (n.includes("full"))     return { kind: "front_lever", level: "full",     def: FRONT_LEVER_LEVELS.full };
    if (n.includes("half"))     return { kind: "front_lever", level: "half_lay", def: FRONT_LEVER_LEVELS.half_lay };
    if (n.includes("straddle")) return { kind: "front_lever", level: "straddle", def: FRONT_LEVER_LEVELS.straddle };
    if (n.includes("adv") || n.includes("advanced"))
                                return { kind: "front_lever", level: "adv_tuck", def: FRONT_LEVER_LEVELS.adv_tuck };
    if (n.includes("tuck"))     return { kind: "front_lever", level: "tuck",     def: FRONT_LEVER_LEVELS.tuck };
    // Defaultti jos vain "Front Lever" annettu → oletetaan full
    return { kind: "front_lever", level: "full", def: FRONT_LEVER_LEVELS.full };
  }
  // Planche
  if (n.includes("planche")) {
    if (n.includes("full"))     return { kind: "planche", level: "full",     def: PLANCHE_LEVELS.full };
    if (n.includes("half"))     return { kind: "planche", level: "half_lay", def: PLANCHE_LEVELS.half_lay };
    if (n.includes("straddle")) return { kind: "planche", level: "straddle", def: PLANCHE_LEVELS.straddle };
    if (n.includes("adv") || n.includes("advanced"))
                                return { kind: "planche", level: "adv_tuck", def: PLANCHE_LEVELS.adv_tuck };
    if (n.includes("tuck"))     return { kind: "planche", level: "tuck",     def: PLANCHE_LEVELS.tuck };
    return { kind: "planche", level: "full", def: PLANCHE_LEVELS.full };
  }
  // HSPU (Handstand Push-up)
  if (n.includes("hspu") || (n.includes("handstand") && n.includes("push"))) {
    if (n.includes("free"))     return { kind: "hspu", level: "free",     def: HSPU_LEVELS.free };
    if (n.includes("wall"))     return { kind: "hspu", level: "wall",     def: HSPU_LEVELS.wall };
    if (n.includes("box"))      return { kind: "hspu", level: "box",      def: HSPU_LEVELS.box };
    if (n.includes("pike"))     return { kind: "hspu", level: "pike",     def: HSPU_LEVELS.pike };
    return { kind: "hspu", level: "wall", def: HSPU_LEVELS.wall };
  }
  // One-arm pull-up
  if ((n.includes("one") && n.includes("arm") && (n.includes("pull") || n.includes("chin"))) ||
      n.includes("oap") || n.includes("yhdellä") || n.includes("yhdella")) {
    return { kind: "oap", level: "unassisted", def: OAP_LEVELS.unassisted };
  }
  // L-sit ja Human Flag jäävät tuntemattomaksi tällä versiolla — palauta null
  return null;
}

// Pidon keston vaikutus e1RM:än. Sommer SSC + Low sweet-spot:
//   < 5s     → primary-reps-1-alueella, kapasiteetti rajaava
//   5-15s    → nominaali "sweet spot" (Low)
//   15-30s   → kapasiteetti yli vaativuuden (lähestyy seuraavaa tasoa)
//   > 30s    → vahva varmuus tasolla, todennäköisesti siirtymässä eteenpäin
// HUOM: tämä on EMPIRINEN HEURISTIIKKA, ei tieteellinen kerroin.
function _holdDurationMultiplier(holdSeconds) {
  if (typeof holdSeconds !== "number" || holdSeconds < 1) return 0.70;
  if (holdSeconds < 5)   return 0.70;
  if (holdSeconds <= 15) return 1.00;
  if (holdSeconds <= 30) return 1.15;
  return 1.30;
}

// Pää-funktio: arvioi isometric-PR:n e1RM-vastine kg:na.
// PR-item: { movementName, loadType: "isometric_hold", holdSeconds, addedWeightKg? }
// bodyweightKg: q03_weight wizard-config:sta.
// Palauttaa: { e1RM, kind, level, formula, status } tai null jos liike tuntematon.
export function estimateIsometricE1RM(prItem, bodyweightKg) {
  if (!prItem || prItem.loadType !== "isometric_hold") return null;
  const bw = Number(bodyweightKg);
  if (Number.isNaN(bw) || bw <= 0) return null;
  const detected = _detectIsometricLevel(prItem.movementName);
  if (!detected) return null;

  const baseE1RM_BW = bw * detected.def.pctBW;
  const durationMult = _holdDurationMultiplier(prItem.holdSeconds);
  const adjustedE1RM = baseE1RM_BW * durationMult;
  const addedWeight = Number(prItem.addedWeightKg);
  const finalE1RM = adjustedE1RM + (Number.isNaN(addedWeight) ? 0 : addedWeight);

  return {
    e1RM: Math.round(finalE1RM * 10) / 10,
    kind: detected.kind,
    level: detected.level,
    pctBW: detected.def.pctBW,
    durationMultiplier: durationMult,
    addedWeightKg: Number.isNaN(addedWeight) ? 0 : addedWeight,
    formula: `${detected.kind}@${detected.level} (${(detected.def.pctBW * 100).toFixed(0)}% BW × duration ${durationMult.toFixed(2)}× + lisäpaino)`,
    sourceStatus: "EMPIRINEN HEURISTIIKKA",
    source: `${detected.def.source} (Low OG2 + Sommer SSC, ei peer-reviewed; yksilövaihtelu ±15-25 %)`,
  };
}

// ─── 2C-γ: Tier-pohjainen kg/vk-progressio ────────────────────────────
//
// Tutkimuspohja: docs/VAIHE_2C_RESEARCH_VERIFICATION.md (2026-05-11).
// Lähteet:
//   - Latella et al. 2020 (J Strength Cond Res 34(9):2412-2418) — powerlifting
//     Australia n=1897, 2003-2018, kg/päivä total per training-status
//   - Greg Nuckols Stronger by Science -kyselydata (EMPIRINEN, voluntary
//     response bias mainittu kirjoittajan caveat:ssa)
//   - Williams et al. 2017 Sports Med 47(10):2083-2100 (PDF-VERIFIOITU) —
//     KRIITTINEN: untrained hyötyy ENEMMÄN periodisaatiosta kuin trained
//     (β = -0.59, p = 0.0305). Tier-kertoimet (1.0 → 0.05) tukevat tätä.
//
// STATUS: **EMPIRINEN, EI RCT-VALIDOITU.** Tier-kertoimet ovat
// powerlifting-kilpailudatan ekstrapolaatiota. Yksilövaihteluväli ±50-100 %
// (Latella 2020: SD usein > keskiarvo, r² lähtötasolle 0.06-0.12).
//
// TÄMÄ TIETO MERKITSE _wizardMeta.rules.source-kenttiin selkeästi.

// Tier-progressiokerroin: skaalaa pää-app:n weekDef.deltaPctBase-arvoa.
// Pää-app:in nominaali on +2.5%/vk (vk 2), +5%/vk (vk 3). Tier-kerroin
// vähentää tätä elite-/advanced-atleeteilla joiden absoluuttinen kg/vk on
// pienempi (Latella Q4 ~0.24 kg/vk total → ~0.05% per liike per vk).
//
// VAIN POSITIIVISET deltaPctBase-arvot säädetään (= progressio-viikot vk 2-3).
// Negatiiviset säilyvät: vk 1 akklimatisaatio (-10%) + vk 4 deload (-25%).
const TIER_PROGRESSION_MULTIPLIERS = Object.freeze({
  beginner:     1.00,  // Nominaali (Latella: ~2.3 kg/vk squat = ~2.5% jos 1RM 100kg)
  intermediate: 0.40,  // ~1% per vk (Latella: 0.75 kg/vk squat = ~0.5-0.6% jos 1RM 130kg)
  advanced:     0.15,  // ~0.4% per vk (Latella: 0.3 kg/vk squat = ~0.17% jos 1RM 175kg)
  elite:        0.05,  // ~0.125% per vk (Latella Q4: 0.10 kg/vk squat = ~0.05% jos 1RM 200kg)
});

// Naiskerroin (Nuckols SBS-kyselydata: nais-kg/vk ≈ 0.5-0.6 × mies-kg/vk).
// Käytetään keskiarvoa 0.55 — tier-kerrointa kerrotaan tällä jos q02=female.
const SEX_PROGRESSION_MULTIPLIER_FEMALE = 0.55;

// Soveltaa tier-kertoimen weekDefs-array:lle. Käytetään handleGenerateProgram:ssa
// generaattorin (single tai multi-block) jälkeen ennen tallennusta DB:hen.
export function applyTierProgression(weekDefs, tier, sex) {
  if (!Array.isArray(weekDefs)) return weekDefs;
  const tierMult = TIER_PROGRESSION_MULTIPLIERS[tier];
  if (typeof tierMult !== "number") return weekDefs; // tuntematon tier → ei muutosta
  const sexMult = sex === "female" ? SEX_PROGRESSION_MULTIPLIER_FEMALE : 1.0;
  const combined = tierMult * sexMult;
  return weekDefs.map(wd => {
    // Säilytä deload + akklimatisaatio-viikot (deltaPctBase ≤ 0) — ne ovat
    // absoluuttisia, eivät progressiokertoimia
    if (typeof wd.deltaPctBase !== "number" || wd.deltaPctBase <= 0) return wd;
    return {
      ...wd,
      deltaPctBase: Math.round(wd.deltaPctBase * combined * 1000) / 1000,
      // Säilytetään alkuperäinen nominaali audit-jälkenä
      _originalDeltaPctBase: wd.deltaPctBase,
      _tierProgressionApplied: { tier, sex, multiplier: combined },
    };
  });
}

// ─── 2C-β2: Split-filtteri ja volyymi-cap ──────────────────────────────
//
// Pää-app:in distributePrimariesToDays rotatoi primary-liikkeen päivien
// välillä, mutta accessory:t tulevat skeleton:ista joka on tyypillisesti
// full-body. Tämä rikkoo q21="upper_lower"/"ppl"/"broscience" -split-
// preferenssin: esim. kyykky-päivänä saattaa olla "Seated row" ja "Chest
// press" accessoryina vaikka käyttäjä halusi upper/lower-jaon.
//
// applySplitFilter suodattaa accessory-slotit niin että kunkin päivän
// accessory:t vastaavat primary-liikkeen kategoriaa q21-säännön mukaisesti.

const UPPER_PULL_CATS = ["vertikaaliveto", "horisontaaliveto", "hauisfleksio"];
const UPPER_PUSH_CATS = ["vertikaalityöntö", "horisontaalityöntö", "ojentajaekstensio"];
const UPPER_CATS = [...UPPER_PULL_CATS, ...UPPER_PUSH_CATS];
const LOWER_CATS = ["alaraaja", "lonkkahingaus"];
const NEUTRAL_CATS = ["core", "muu"]; // sallittu kaikissa päivissä

export function applySplitFilter(weekPlans, splitPref) {
  if (!Array.isArray(weekPlans)) return weekPlans;
  // "fullbody"/"custom"/null → ei suodatusta
  if (splitPref !== "upper_lower" && splitPref !== "ppl" && splitPref !== "broscience") {
    return weekPlans;
  }
  return weekPlans.map(wp => ({
    ...wp,
    days: Array.isArray(wp.days) ? wp.days.map(d => {
      if (!d || !Array.isArray(d.slots)) return d;
      const primarySlot = d.slots.find(s => s.role === "primary" || s.role === "backoff");
      if (!primarySlot) return d;
      const primaryCat = primarySlot.category;
      if (!primaryCat) return d;

      // Päätä mikä kategoria-joukko on sallittu tälle päivälle
      let allowedCats = null;
      if (splitPref === "upper_lower") {
        if (UPPER_CATS.includes(primaryCat))      allowedCats = [...UPPER_CATS, ...NEUTRAL_CATS];
        else if (LOWER_CATS.includes(primaryCat)) allowedCats = [...LOWER_CATS, ...NEUTRAL_CATS];
      } else if (splitPref === "ppl") {
        if (UPPER_PULL_CATS.includes(primaryCat))      allowedCats = [...UPPER_PULL_CATS, ...NEUTRAL_CATS];
        else if (UPPER_PUSH_CATS.includes(primaryCat)) allowedCats = [...UPPER_PUSH_CATS, ...NEUTRAL_CATS];
        else if (LOWER_CATS.includes(primaryCat))       allowedCats = [...LOWER_CATS, ...NEUTRAL_CATS];
      } else if (splitPref === "broscience") {
        // Lihasryhmäkohtainen — kapeampi kuin PPL: vain primary-kategoria + neutrals
        allowedCats = [primaryCat, ...NEUTRAL_CATS];
      }
      if (!allowedCats) return d;

      // Suodata accessory-slotit, säilytä primary/backoff/warmup/opener/attempt
      const filteredSlots = d.slots.filter(s => {
        if (s.role !== "accessory") return true;
        return allowedCats.includes(s.category);
      });
      return { ...d, slots: filteredSlots };
    }) : wp.days,
  }));
}

// ─── 2C-β2: Volyymi-cap per kategoria per blokki ──────────────────────
//
// Helms 2018 + Schoenfeld 2019: MV (Maximum Volume) per lihasryhmä per
// viikko vaihtelee 10-20 sarjaa. Aito Issurin-malli VÄHENTÄÄ volyymiä
// blokeittain (hyp → strength → intensification → peaking). 2C-α-pilotti
// tuotti tilanteita jossa strength-blokki nostatti yhden kategorian
// volyymin 14.8 set/vk:hon ja intensifikaatio nosti accessory-volyymiä
// yhtäkkiä, mikä on Issurin-malli päinvastoin.
//
// applyVolumeCap rajaa accessory-sarjat per kategoria per viikko:
//   hypertrofia → max 16 set/vk per kategoria
//   maksimivoima → max 10 set/vk
//   intensifikaatio → max 8 set/vk
//   peaking (mb) → max 6 set/vk
//   yhdistelma → max 14 set/vk
//   undulating → max 14 set/vk

const VOLUME_CAPS_PER_WEEK = Object.freeze({
  hypertrofia:     16,
  yhdistelma:      14,
  undulating:      14,
  maksimivoima:    10,
  intensifikaatio:  8,
  peaking:          6,
  "peaking-mb":     6,
});

export function applyVolumeCap(weekPlans, blockGoal) {
  if (!Array.isArray(weekPlans)) return weekPlans;
  const cap = VOLUME_CAPS_PER_WEEK[blockGoal] || 16;

  return weekPlans.map(wp => {
    if (!Array.isArray(wp.days)) return wp;
    // Laske kunkin kategorian total sets viikossa (vain accessoryt, primary aina koskematon)
    const catAccessorySets = {};
    wp.days.forEach(d => {
      if (!Array.isArray(d.slots)) return;
      d.slots.forEach(s => {
        if (s.role !== "accessory") return;
        const c = s.category;
        catAccessorySets[c] = (catAccessorySets[c] || 0) + (Number(s.sets) || 0);
      });
    });
    // Tunnista yli-cap-kategoriat
    const overCats = {};
    for (const [cat, total] of Object.entries(catAccessorySets)) {
      if (total > cap) overCats[cat] = total;
    }
    if (Object.keys(overCats).length === 0) return wp;

    // Pienennä accessory-sarjoja over-cap-kategorioissa proportionalisesti
    return {
      ...wp,
      days: wp.days.map(d => ({
        ...d,
        slots: Array.isArray(d.slots) ? d.slots.map(s => {
          if (s.role !== "accessory") return s;
          if (!(s.category in overCats)) return s;
          const total = overCats[s.category];
          const scale = cap / total;
          return { ...s, sets: Math.max(1, Math.round((Number(s.sets) || 0) * scale)) };
        }) : d.slots,
      })),
    };
  });
}

// ─── Pilari 3 C2 (FIX-B): kalusto-suodatin ─────────────────────────────
// A1-juuri #2: materialisaatiokerros (data.js) on kalustosokea → apuliikkeet vuotavat
// ohi q17:n (kaapeli/laite/penkki vaikka atletilla ei ole). Tämä post-process-vaihe
// suodattaa KOKO materialisoidun apuliikejoukon yli (yksi suodatin, ei per-stage):
//   - kelvoton apuliike → KORVATAAN sama-kategoria-ekvivalentilla (suoritettavissa q17:llä,
//     kehonpaino preferoituna) → säilyttää volyymin + treenitavoitteen (ratifioitu).
//   - jos substituuttia ei ole → pudota slot (ratifioitu: pudota vain viimeisenä keinona).
// No-op täyskalustolle JA kun q17 puuttuu/tyhjä (turvallinen — ei strippaa vahingossa).
// Primaarit on jo suodatettu pickPrimaries:ssä (requires) → tässä vain accessory-slotit.
function _eqCost(m, eqSet) {
  const { requires, any } = movementRequiredEquipment(m.name, m.loadType, m.category);
  let cost = any ? 1 : requires.length; // 0 = kehonpaino (preferoitu), 1 = yksi väline
  if (m.isCompetitionLift) cost += 0.5; // preferoi ei-kisaliike apuliike-korvaajaksi (Leuanveto > Lisäpainoleuanveto)
  return cost;
}
export function applyEquipmentFilter(weekPlans, q17Equipment, movementBank = FALLBACK_MOVEMENT_BANK) {
  if (!Array.isArray(q17Equipment) || q17Equipment.length === 0) return weekPlans; // ei q17 → no-op
  const eqSet = new Set(q17Equipment);
  const bank = (Array.isArray(movementBank) && movementBank.length) ? movementBank : FALLBACK_MOVEMENT_BANK;
  const subCache = {};
  const findSub = (category) => {
    if (category in subCache) return subCache[category];
    const cands = bank.filter(m => m && m.category === category && m.id !== "fb_custom_other"
      && isMovementPerformable(m.name, m.loadType, m.category, eqSet));
    cands.sort((a, b) => _eqCost(a, eqSet) - _eqCost(b, eqSet)); // kehonpaino ensin (inklusiivisin)
    subCache[category] = cands[0] || null;
    return subCache[category];
  };
  return weekPlans.map(wp => ({
    ...wp,
    days: wp.days.map(d => ({
      ...d,
      slots: d.slots.reduce((acc, s) => {
        if (s.role !== "accessory") { acc.push(s); return acc; }
        if (isMovementPerformable(s.defaultMovementName, null, s.category, eqSet)) { acc.push(s); return acc; }
        const sub = findSub(s.category);
        if (sub) acc.push({ ...s, defaultMovementName: sub.name, variantName: null, _equipmentSubstituted: true });
        // ei substituuttia → pudota slot (viimeinen keino)
        return acc;
      }, []),
    })),
  }));
}

// ─── Pilari 3 C3: ensureLowerBody — rakenteellinen alaraaja-invariantti ──
// A1-juuri #4: "kattavat" skeletonit (createDefaultMesocycle) ovat alaraaja-tyhjiä
// (kategoria alaraaja vain liikepankissa, ei skeleton-sloteissa). FIX-A:n goal-setit
// sisältävät aina alaraajan, MUTTA equipment-cull voi poistaa sen → turvaverkko tarvitaan.
// Ratifioitu (Akseli "ei vaikka mistä"): materialisoitu ohjelma EI KOSKAAN ilman ≥1
// alaraaja/lonkkahingaus-liikettä, riippumatta goal-setistä/skeletonista. Jos puuttuu →
// injektoi suoritettavissa oleva alaraaja-accessory (kehonpaino-fallback aina mahdollinen).
// No-op kun jalat jo mukana (yleisin tapaus FIX-A:n jälkeen).
export function ensureLowerBody(weekPlans, q17Equipment, movementBank = FALLBACK_MOVEMENT_BANK) {
  const isLeg = c => c === "alaraaja" || c === "lonkkahingaus";
  const hasLeg = weekPlans.some(wp => wp.days?.some(d => d.slots?.some(s => isLeg(s.category))));
  if (hasLeg) return weekPlans; // jalat jo mukana → ei tehdä mitään
  const eqSet = new Set(Array.isArray(q17Equipment) ? q17Equipment : []);
  const bank = (Array.isArray(movementBank) && movementBank.length) ? movementBank : FALLBACK_MOVEMENT_BANK;
  const legCands = bank.filter(m => m && isLeg(m.category) && m.id !== "fb_custom_other"
    && isMovementPerformable(m.name, m.loadType, m.category, eqSet));
  legCands.sort((a, b) => _eqCost(a, eqSet) - _eqCost(b, eqSet)); // kehonpaino ensin
  // Kehonpaino-fallback (aina suoritettavissa) jos pankki ei tarjoa suoritettavaa.
  const leg = legCands[0] || { name: "Bulgarian split squat", category: "alaraaja" };
  // Injektoi alaraaja-accessory jokaisen viikon ensimmäiseen päivään → jalat joka viikko.
  return weekPlans.map(wp => {
    if (!wp.days || wp.days.length === 0) return wp;
    return {
      ...wp,
      days: wp.days.map((d, i) => i !== 0 ? d : ({
        ...d,
        slots: [...(d.slots || []), {
          role: "accessory", category: leg.category, defaultMovementName: leg.name,
          sets: 3, reps: 8, targetVx: 3, variantName: null, _lowerBodyGuaranteed: true,
        }],
      })),
    };
  });
}

// ─── 2C-β: Session-fokus per päivä ─────────────────────────────────────
//
// Pää-app:in skeleton-factoryt antavat päiväkorteille yleisiä labeleita
// ("Perusvoima A", "Maksimivoima", "Nopeusvoima") jotka EIVÄT viittaa
// kilpailuliikkeeseen. 2C-β post-prosessoi weekPlans-arrayn niin että
// labelit ovat fokus-pohjaisia ("Pullup-fokus (volyymi)" jne).
//
// Tämä on PURE UI -muutos — dayType ja muut treenin sisällön logiikka-
// kentät säilyvät ennallaan. Vain käyttäjälle näkyvä label vaihtuu.
//
// Tutkimuspohja: ei vaadita (käyttäjäystävällisyys-laajennus). ACSM 2009
// priority-first -periaate toteutuu jo pää-app:in distributePrimariesToDays:n
// kautta (primary-slot ensimmäisenä).

export function applySessionFocusLabels(weekPlans) {
  if (!Array.isArray(weekPlans)) return weekPlans;
  return weekPlans.map(wp => ({
    ...wp,
    days: Array.isArray(wp.days) ? wp.days.map(d => {
      if (!d || !Array.isArray(d.slots)) return d;
      // Hae primary-slot (cloneDayWithPrimary asetti substitutePrimarySlot:lla)
      const primarySlot = d.slots.find(s => s.role === "primary" || s.role === "backoff");
      if (!primarySlot || !primarySlot.defaultMovementName) return d;
      const primaryName = primarySlot.defaultMovementName;
      const focusLabel = _focusLabelForPrimary(primaryName);
      const typeSuffix = _dayTypeSuffix(d.dayType);
      const newLabel = typeSuffix ? `${focusLabel} (${typeSuffix})` : focusLabel;
      return {
        ...d,
        label: newLabel,
        originalLabel: d.label, // säilytä alkuperäinen audit-jälkeä varten
        sessionFocus: primaryName,
      };
    }) : wp.days,
  }));
}

function _focusLabelForPrimary(name) {
  if (typeof name !== "string") return "Treeni";
  const n = name.toLowerCase();
  // Streetlifting + powerlifting kilpailuliikkeet ja yleiset variantit
  if (n.includes("lisäpainoleuanveto") || n.includes("lisäpaino-leuanveto")) return "Pullup-fokus";
  if (n.includes("lisäpainodippi") || n.includes("lisäpaino-dippi"))         return "Dippi-fokus";
  if (n.includes("muscle-up") || n.includes("muscle up"))                    return "Muscle-up-fokus";
  if (n.includes("takakyykky"))      return "Kyykky-fokus";
  if (n.includes("etukyykky"))       return "Etukyykky-fokus";
  if (n.includes("penkkipunnerrus")) return "Penkki-fokus";
  if (n.includes("maastaveto"))      return "Maave-fokus";
  if (n.includes("pystypunnerrus"))  return "Pysty-fokus";
  if (n.includes("leuanveto"))       return "Pullup-fokus"; // bodyweight pullup
  if (n.includes("dippi"))           return "Dippi-fokus";
  // Fallback: käytä primary-nimeä lyhyemmin
  return `${name}-fokus`;
}

function _dayTypeSuffix(dayType) {
  const map = {
    volume: "volyymi",
    heavy: "raskas",
    speed: "nopeus",
    intensity: "intensiteetti",
    skill: "tekniikka",
    deload: "kevennys",
  };
  return map[dayType] || "";
}

// ─── Vaihe 7: mapWizardToMesocycle (main) ──────────────────────────────
//
// Yhdistää kaikki mapping-funktiot. Palauttaa generateCustomMesocycle:lle
// suoraan annettavan input-objektin + _wizardMeta-kentän jota 2B-β tallentaa
// mesocycleen.customConfig:iin.
//
// Heittää Error:n jos input on virheellinen — 2B-β:n UI-puoli nappaa ja
// näyttää käyttäjälle.
export function mapWizardToMesocycle(wizardConfig, mainAppState, opts = {}) {
  const validation = validateMappingInput(wizardConfig, mainAppState);
  if (!validation.valid) {
    const firstErr = validation.errors[0];
    throw new Error(`mapWizardToMesocycle: ${firstErr.reason}`);
  }
  const a = wizardConfig.answers;

  const startDateISO = _todayISO();

  // 2D-α: opts.selectedStyleId voi pakottaa goal:n single-block-tyyleihin.
  // Style-ID:t: "single-hypertrofia", "single-maksimivoima", "single-yhdistelma",
  //             "single-dup", "single-eksentrinen", "single-siirtyma",
  //             "single-palautuminen"
  let goal;
  let styleSource = "automaattinen";
  if (typeof opts.selectedStyleId === "string" && opts.selectedStyleId !== "") {
    const style = PROGRAM_STYLES[opts.selectedStyleId];
    if (!style || !style.goal) {
      throw new Error(`mapWizardToMesocycle: tuntematon selectedStyleId "${opts.selectedStyleId}"`);
    }
    goal = style.goal;
    styleSource = `käyttäjän valinta: ${style.label}`;
  } else {
    goal = pickStartingBlock(a.q29_recentBlock, a.q12_primaryGoal);
  }

  // 2D-α + 2D-β + 2D-γ: viikkomäärä — jos goal-tyylin natiivipituus on lukko, käytä sitä.
  // Lukot 2D-α/β: siirtyma=3, palautuminen=2, madcow5x5=5 (PR-vk5 lopussa).
  // Lukot 2D-γ: gzclJT20=12 (J&T 2.0 2×6 vk), coanPhillipi=11 (10 vk + meet vk 11).
  // Muutoin tier-pohjainen pickWeekCount + anchor.
  const PROGRAM_STYLE_NATIVE_WEEKS = {
    siirtyma: 3,
    palautuminen: 2,
    madcow5x5: 5,
    gzclJT20: 12,
    coanPhillipi: 11,
  };
  let weekCount;
  let anchorResult = { anchored: false, warning: null };
  if (PROGRAM_STYLE_NATIVE_WEEKS[goal]) {
    weekCount = PROGRAM_STYLE_NATIVE_WEEKS[goal];
  } else {
    const weekCountTier = pickWeekCount(a.q08_selfLevel, goal === "eksentrinen" ? "maksimivoima" : goal);
    anchorResult = applyTargetDateAnchor(weekCountTier, a.q27_targetDate, startDateISO);
    weekCount = anchorResult.weekCount;
  }

  const recoveryCapacity = pickRecoveryCapacity(a);
  const primaries = pickPrimaries(a);
  // v4.51.6: lue q31_preferredDays (atletin oma valinta) jos annettu
  const preferredDaysOfWeek = pickPreferredDaysOfWeek(a.q24_frequency, a.q31_preferredDays);
  const daysPerWeek = Number(a.q24_frequency?.daysPerWeek) || 3;

  const sexModifierApplied =
    a.q15_aerobicModality !== "none" &&
    a.q02_sex === "male" &&
    (a.q08_selfLevel === "advanced" || a.q08_selfLevel === "elite");

  const customLabel = `Räätälöity wizardilla (${_goalLabel(goal)}, ${weekCount} vk, ${primaries.length} ${primaries.length === 1 ? "päämääräliike" : "päämääräliikettä"})`;

  return {
    // generateCustomMesocycle-yhteensopivat parametrit:
    goal,
    primaries,
    daysPerWeek,
    weekCount,
    recoveryCapacity,
    preferredDaysOfWeek,
    customLabel,
    startDateISO,
    // 2B-α metadata (kulkee mesocycle.customConfig._wizardMeta:iin 2B-β:ssa):
    _wizardMeta: {
      wizardId: wizardConfig.wizardId,
      wizardSchemaVersion: wizardConfig.schemaVersion,
      mapperVersion: MAPPER_VERSION,
      pickedStartingBlock: goal,
      blockLengthRationale: `${a.q08_selfLevel}-tier`,
      styleSource,
      selectedStyleId: opts.selectedStyleId || null,
      sexModifierApplied,
      targetDateAnchored: anchorResult.anchored,
      targetDateWarning: anchorResult.warning,
      rules: collectAppliedRules(a, goal, weekCount, recoveryCapacity, sexModifierApplied, anchorResult.anchored, opts.selectedStyleId),
    },
  };
}

// ─── 2D-α: Korkea-tason dispatcher (UI:n ainoa kosketuspinta) ─────────
//
// mapWizardToProgram(wizardConfig, mainAppState, opts)
//
// opts = { selectedStyleId?: string, daysUntilTarget?: number }
//
// Käyttölogiikka:
//   1. Jos opts.selectedStyleId on annettu → käytä sitä suoraan
//   2. Muutoin laske pickProgramStyle() ja käytä top-1:tä
//
// Dispatcher valitsee oikean polun:
//   - "multi-issurin"  → mapWizardToMultiBlockMesocycle
//   - "single-*"       → mapWizardToMesocycle(opts.selectedStyleId)
//
// Palauttaa lisäksi candidates-listan (top-3) UI:lle näytettäväksi.
export function mapWizardToProgram(wizardConfig, mainAppState, opts = {}) {
  const validation = validateMappingInput(wizardConfig, mainAppState);
  if (!validation.valid) {
    throw new Error(`mapWizardToProgram: ${validation.errors[0].reason}`);
  }
  const a = wizardConfig.answers;
  const startDateISO = _todayISO();

  // Laske daysUntilTarget aina (tarvitaan pickProgramStyle:lle)
  let daysUntilTarget = (opts && typeof opts.daysUntilTarget === "number") ? opts.daysUntilTarget : null;
  if (daysUntilTarget === null && a.q27_targetDate) {
    const target = new Date(a.q27_targetDate);
    const start = new Date(startDateISO);
    if (!Number.isNaN(target.getTime()) && !Number.isNaN(start.getTime())) {
      daysUntilTarget = Math.floor((target.getTime() - start.getTime()) / 86400000);
    }
  }

  // Hae top-3 kandidaatti (myös silloin kun selectedStyleId on annettu — UI
  // näyttää vaihtoehdot vaikka käyttäjä on jo valinnut yhden)
  const candidates = pickProgramStyle(a, { daysUntilTarget });
  const top3 = candidates.slice(0, 3);

  // Valitse styleId — käyttäjän valinta voittaa, muutoin top-1
  const chosenStyleId = (typeof opts.selectedStyleId === "string") ? opts.selectedStyleId : top3[0]?.styleId;
  if (!chosenStyleId) {
    throw new Error("mapWizardToProgram: ei valittavissa olevaa tyyliä");
  }
  const chosenStyle = PROGRAM_STYLES[chosenStyleId];
  if (!chosenStyle) {
    throw new Error(`mapWizardToProgram: tuntematon styleId "${chosenStyleId}"`);
  }

  // Dispatch
  let mapped;
  if (chosenStyle.isMultiBlock) {
    mapped = mapWizardToMultiBlockMesocycle(wizardConfig, mainAppState);
    if (!mapped.isMultiBlock) {
      // Fallback käynnistyi (esim. ei targetDatea) — käytä sitä mutta merkitse
      mapped._wizardMeta = mapped._wizardMeta || {};
      mapped._wizardMeta.styleFallbackFromMulti = true;
    }
  } else {
    mapped = mapWizardToMesocycle(wizardConfig, mainAppState, { selectedStyleId: chosenStyleId });
  }

  // Liitä kandidaatti-lista metadataan
  mapped._wizardMeta = mapped._wizardMeta || {};
  mapped._wizardMeta.styleCandidates = top3.map(c => ({
    styleId: c.styleId,
    label: c.style.label,
    shortDesc: c.style.shortDesc,
    weekCount: c.weekCount,
    confidence: c.confidence,
    rationale: c.rationale,
    iconHint: c.style.iconHint,
    isMultiBlock: !!c.style.isMultiBlock,
  }));
  mapped._wizardMeta.chosenStyleId = chosenStyleId;
  mapped._wizardMeta.chosenStyleLabel = chosenStyle.label;
  mapped._wizardMeta.daysUntilTarget = daysUntilTarget;

  return mapped;
}

// ─── Helper: rules-array (auditointi-jälki) ────────────────────────────
function collectAppliedRules(a, goal, weekCount, recoveryCapacity, sexModifierApplied, targetDateAnchored, selectedStyleId) {
  const rules = [];
  if (typeof selectedStyleId === "string" && PROGRAM_STYLES[selectedStyleId]) {
    rules.push({
      rule: `Käyttäjän valitsema ohjelmointityyli: ${PROGRAM_STYLES[selectedStyleId].label} → goal "${goal}"`,
      status: "KÄYTTÄJÄVALINTA",
      source: "ALGORITMI 2D-α (adaptive multi-suggestion)",
    });
  } else {
    rules.push({
      rule: `q29_recentBlock="${a.q29_recentBlock}" → aloitusblokki "${goal}"`,
      status: "KVALITATIIVINEN",
      source: "Issurin 2010 block-malli + Issurin Table V residuaalit",
    });
  }
  rules.push({
    rule: `q08_selfLevel="${a.q08_selfLevel}" → ${weekCount} vk ${goal}-blokille`,
    status: "HEURISTIC",
    source: "Petré 2021 kvalitatiivinen (advanced suurempi interferenssi → lyhyemmät blokit)",
  });
  // 2B-γ: cut-aggressive-sääntö kun se aktivoituu
  const deficitKcal = a.q14_cutting === "yes" && a.q30_energyBudget
    ? Number(a.q30_energyBudget.deficitKcal) : NaN;
  if (a.q14_cutting === "yes" && !Number.isNaN(deficitKcal) && deficitKcal >= 500) {
    rules.push({
      rule: `Cut-vaihe + aggressive vaje (${deficitKcal} kcal/päivä) → recoveryCapacity="heikko" (volyymileikkaus)`,
      status: "PDF-VERIFIOITU",
      source: "Helms 2018 (vaje >20% → volyymileikkaus pakollinen)",
    });
  }
  if (sexModifierApplied) {
    rules.push({
      rule: `Concurrent training + miehillä + advanced → recoveryCapacity="heikko"`,
      status: "PDF-VERIFIOITU",
      source: "Huiberts 2024 (SMD -0.43 lower-body strength)",
    });
  }
  rules.push({
    rule: `q23_volumePref="${a.q23_volumePref}" → recoveryCapacity="${recoveryCapacity}"`,
    status: "KÄYTÄNNÖLLINEN",
    source: "Pää-app:in volume-tier-konventio",
  });
  if (targetDateAnchored) {
    rules.push({
      rule: `q27_targetDate annettu → weekCount ankkuroitu ${weekCount} vk:hon`,
      status: "KÄYTÄNNÖLLINEN",
      source: "Helms 2014 peaking ≥ 2 vk",
    });
  }
  rules.push({
    rule: `Liikejärjestys delegoidaan pää-app:in distributePrimariesToDays:lle`,
    status: "RISTIINTARKISTETTU",
    source: "Nunes 2021 (MJ-before-SJ, ES=-0.58 SJ-suorituksille) + ACSM 2009 Position Stand",
  });
  // 2C-γ: Tier-progressio
  const tierMult = TIER_PROGRESSION_MULTIPLIERS[a.q08_selfLevel];
  if (typeof tierMult === "number") {
    const sexMult = a.q02_sex === "female" ? SEX_PROGRESSION_MULTIPLIER_FEMALE : 1.0;
    rules.push({
      rule: `q08_selfLevel="${a.q08_selfLevel}"${sexMult !== 1.0 ? " + naiskerroin" : ""} → progressiokerroin ${(tierMult*sexMult).toFixed(2)}× (yksilövaihtelu ±50-100 %)`,
      status: "EMPIRINEN",
      source: "Latella 2020 powerlifting (n=1897) + Nuckols SBS-kyselydata + Williams 2017 (untrained > trained periodisaatiossa)",
    });
  }
  return rules;
}

// ─── Yksityishelpperit ─────────────────────────────────────────────────
function _todayISO() {
  // Suomi-aikavyöhykkeessä, mutta riittää YYYY-MM-DD-merkkijonona.
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function _goalLabel(goal) {
  const labels = { hypertrofia: "hypertrofia", maksimivoima: "maksimivoima", yhdistelma: "yhdistelmä", undulating: "DUP" };
  return labels[goal] || goal;
}

// ─── Self-test (Vaihe 1D:n tyyliin) ────────────────────────────────────
// Ajetaan node:lla tai selaimen konsolista. Palauttaa { ok, checks, errors }.
export function selfTestMapper() {
  const report = { ok: true, checks: [], errors: [] };
  const ck = (label, cond) => {
    report.checks.push({ label, ok: !!cond });
    if (!cond) { report.ok = false; report.errors.push(label); }
  };

  // ─── 1. RESIDUAL_DAYS + invariantit ─────────────────────────────────
  ck("RESIDUAL_DAYS sisältää 5 ominaisuutta",
     Object.keys(RESIDUAL_DAYS).length === 5);
  ck("RESIDUAL_DAYS maximal_strength = 30 ± 5 (Issurin)",
     RESIDUAL_DAYS.maximal_strength.mean === 30 && RESIDUAL_DAYS.maximal_strength.sd === 5);
  ck("RESIDUAL_DAYS maximal_speed = 5 ± 3 (Issurin)",
     RESIDUAL_DAYS.maximal_speed.mean === 5 && RESIDUAL_DAYS.maximal_speed.sd === 3);
  ck("MAPPER_VERSION on 2D-gamma-v1.0", MAPPER_VERSION === "2D-gamma-v1.0");

  // ─── 1b. PROGRAM_STYLES + pickProgramStyle (Track B 2D-α + 2D-β + 2D-γ) ────
  ck("PROGRAM_STYLES sisältää multi-issurin",
     !!PROGRAM_STYLES["multi-issurin"]);
  ck("PROGRAM_STYLES sisältää 7 single-tyyliä (2D-α)",
     ["single-hypertrofia","single-maksimivoima","single-yhdistelma","single-dup","single-eksentrinen","single-siirtyma","single-palautuminen"]
       .every(k => !!PROGRAM_STYLES[k]));
  ck("PROGRAM_STYLES sisältää 3 klassista voimanostotyyliä (2D-β)",
     ["single-wendler531","single-top-set-backoff","single-madcow-5x5"]
       .every(k => !!PROGRAM_STYLES[k]));
  ck("PROGRAM_STYLES sisältää 6 edistynyttä metodologiaa (2D-γ)",
     ["single-westside-conjugate","single-gzcl-jt20","single-sheiko-derived","single-minimalist-rp","single-smolov-jr","single-coan-phillipi"]
       .every(k => !!PROGRAM_STYLES[k]));
  ck("PROGRAM_STYLES kokonaismäärä = 17 (1 multi + 16 single)",
     Object.keys(PROGRAM_STYLES).length === 17);
  ck("PROGRAM_STYLES single-wendler531 goal=wendler531",
     PROGRAM_STYLES["single-wendler531"].goal === "wendler531");
  ck("PROGRAM_STYLES single-madcow-5x5 weekCount=5",
     PROGRAM_STYLES["single-madcow-5x5"].weekCount === 5);
  ck("PROGRAM_STYLES single-top-set-backoff goal=topSetBackoff",
     PROGRAM_STYLES["single-top-set-backoff"].goal === "topSetBackoff");
  ck("PROGRAM_STYLES single-gzcl-jt20 weekCount=12 (2D-γ)",
     PROGRAM_STYLES["single-gzcl-jt20"].weekCount === 12);
  ck("PROGRAM_STYLES single-coan-phillipi weekCount=11 (10 vk + meet vk 11)",
     PROGRAM_STYLES["single-coan-phillipi"].weekCount === 11);
  ck("PROGRAM_STYLES single-westside-conjugate goal=westsideConjugate",
     PROGRAM_STYLES["single-westside-conjugate"].goal === "westsideConjugate");
  ck("PROGRAM_STYLES single-siirtyma natiivipituus 3 vk",
     PROGRAM_STYLES["single-siirtyma"].weekCount === 3);
  ck("PROGRAM_STYLES single-palautuminen natiivipituus 2 vk",
     PROGRAM_STYLES["single-palautuminen"].weekCount === 2);
  ck("PROGRAM_STYLES single-hypertrofia goal=hypertrofia",
     PROGRAM_STYLES["single-hypertrofia"].goal === "hypertrofia");

  // pickProgramStyle: max-tavoite + edellinen hypertrofia + advanced
  // → maksimivoima top-1
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no", q21_splitPreference: "fullbody",
    });
    ck("pickProgramStyle: max + hypertrophy-recent + advanced → top-1 single-maksimivoima",
       cands[0].styleId === "single-maksimivoima");
    ck("pickProgramStyle: kandidaatit järjestyksessä desc (top-1 conf >= top-2)",
       cands.length >= 2 && cands[0].confidence >= cands[1].confidence);
    ck("pickProgramStyle: top-1 confidence > 40 (selvä match)",
       cands[0].confidence > 40);
  }

  // pickProgramStyle: hypertrofia-tavoite + off_program → hypertrofia top-1
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "intermediate", q12_primaryGoal: "hypertrophy",
      q29_recentBlock: "off_program", q23_volumePref: "auto",
      q14_cutting: "no",
    });
    ck("pickProgramStyle: hypertrophy + off_program → top-1 single-hypertrofia",
       cands[0].styleId === "single-hypertrofia");
  }

  // pickProgramStyle: peakingin jälkeen + ei max-tavoitetta → palautuminen suosittu
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "general_strength",
      q29_recentBlock: "peaking", q23_volumePref: "auto",
      q14_cutting: "no",
    });
    const top3 = cands.slice(0, 3);
    ck("pickProgramStyle: peaking-recent → palautuminen top-3:ssa",
       top3.some(c => c.styleId === "single-palautuminen"));
  }

  // pickProgramStyle: kisapäivä + aikaa ≥ 8 vk → multi-issurin top-1
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no", q27_targetDate: "2026-09-01",
      q28_targetType: "competition",
    }, { daysUntilTarget: 84 });
    ck("pickProgramStyle: kisapäivä + 84 pv + competition → top-1 multi-issurin",
       cands[0].styleId === "multi-issurin");
    ck("pickProgramStyle: multi-issurin confidence > 80",
       cands[0].confidence > 80);
  }

  // pickProgramStyle: kisapäivä alle 8 vk → multi-issurin EI top-1
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "strength", q23_volumePref: "MAV",
      q14_cutting: "no", q27_targetDate: "2026-06-10",
    }, { daysUntilTarget: 30 });
    ck("pickProgramStyle: kisapäivä 30 pv → multi-issurin EI top-1",
       cands[0].styleId !== "multi-issurin");
  }

  // pickProgramStyle: deload-recent → siirtymä top-3:ssa
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "intermediate", q12_primaryGoal: "general_strength",
      q29_recentBlock: "deload", q23_volumePref: "auto",
      q14_cutting: "no",
    });
    const top3 = cands.slice(0, 3);
    ck("pickProgramStyle: deload-recent → siirtymä top-3:ssa",
       top3.some(c => c.styleId === "single-siirtyma"));
  }

  // pickProgramStyle: aloittelija + eksentrinen → confidence rajattu MAX 25
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "beginner", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "auto",
      q14_cutting: "no",
    });
    const eks = cands.find(c => c.styleId === "single-eksentrinen");
    ck("pickProgramStyle: beginner + eksentrinen → confidence ≤ 25 (cap)",
       eks && eks.confidence <= 25);
  }

  // pickProgramStyle: kandidaatit eivät sisällä duplikaatteja
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "hypertrophy",
      q29_recentBlock: "strength", q23_volumePref: "MAV",
      q14_cutting: "no",
    });
    const styleIds = cands.map(c => c.styleId);
    const unique = new Set(styleIds);
    ck("pickProgramStyle: ei duplikaatteja kandidaattilistalla",
       unique.size === styleIds.length);
    ck("pickProgramStyle: kaikki 17 tyyliä esiintyy kandidaattilistalla (2D-γ)",
       styleIds.length === 17);
  }

  // pickProgramStyle: kaikilla rationale[] täytetty
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "intermediate", q12_primaryGoal: "general_strength",
      q29_recentBlock: "off_program", q23_volumePref: "auto",
      q14_cutting: "no",
    });
    ck("pickProgramStyle: jokaisella kandidaatilla rationale[] vähintään 1 perustelu",
       cands.every(c => Array.isArray(c.rationale) && c.rationale.length >= 1));
  }

  // pickProgramStyle: confidence välillä [0, 100]
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "elite", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "intensification", q23_volumePref: "MEV",
      q14_cutting: "yes", q30_energyBudget: { deficitKcal: 700, proteinGPerKg: 2.0 },
    });
    ck("pickProgramStyle: kaikki confidence-arvot välillä [0, 100]",
       cands.every(c => c.confidence >= 0 && c.confidence <= 100));
  }

  // pickProgramStyle: female-kerroin ei sotke confidence-laskua (q02 ei käytetä siellä)
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no", q02_sex: "female",
    });
    ck("pickProgramStyle: female-atleti + max_1RM + hypertrophy-recent → maksimivoima silti top-1",
       cands[0].styleId === "single-maksimivoima");
  }

  // ─── 2. pickStartingBlock ──────────────────────────────────────────
  ck("pickStartingBlock: peaking → hypertrofia",
     pickStartingBlock("peaking", "any") === "hypertrofia");
  ck("pickStartingBlock: deload → hypertrofia",
     pickStartingBlock("deload", "any") === "hypertrofia");
  ck("pickStartingBlock: off_program → hypertrofia",
     pickStartingBlock("off_program", "any") === "hypertrofia");
  ck("pickStartingBlock: hypertrophy + max_1RM → maksimivoima",
     pickStartingBlock("hypertrophy", "max_1RM") === "maksimivoima");
  ck("pickStartingBlock: hypertrophy + powerlifting → maksimivoima",
     pickStartingBlock("hypertrophy", "powerlifting") === "maksimivoima");
  ck("pickStartingBlock: hypertrophy + streetlifting_with_explosive_components → maksimivoima",
     pickStartingBlock("hypertrophy", "streetlifting_with_explosive_components") === "maksimivoima");
  ck("pickStartingBlock: hypertrophy + hypertrophy-goal → yhdistelma",
     pickStartingBlock("hypertrophy", "hypertrophy") === "yhdistelma");
  ck("pickStartingBlock: strength + max_1RM → maksimivoima",
     pickStartingBlock("strength", "max_1RM") === "maksimivoima");
  ck("pickStartingBlock: strength + general_strength → yhdistelma",
     pickStartingBlock("strength", "general_strength") === "yhdistelma");
  ck("pickStartingBlock: intensification → maksimivoima",
     pickStartingBlock("intensification", "any") === "maksimivoima");

  // ─── 3. pickWeekCount ──────────────────────────────────────────────
  ck("pickWeekCount: beginner + hypertrofia → 8",
     pickWeekCount("beginner", "hypertrofia") === 8);
  ck("pickWeekCount: intermediate + hypertrofia → 6",
     pickWeekCount("intermediate", "hypertrofia") === 6);
  ck("pickWeekCount: advanced + hypertrofia → 4",
     pickWeekCount("advanced", "hypertrofia") === 4);
  ck("pickWeekCount: elite + maksimivoima → 4",
     pickWeekCount("elite", "maksimivoima") === 4);
  ck("pickWeekCount: beginner + yhdistelma → 6",
     pickWeekCount("beginner", "yhdistelma") === 6);
  ck("pickWeekCount: tuntematon → 4 fallback",
     pickWeekCount("xxx", "hypertrofia") === 4);

  // ─── 4. pickRecoveryCapacity ───────────────────────────────────────
  ck("pickRecoveryCapacity: male + CT + elite → heikko (Huiberts)",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "running", q08_selfLevel: "elite", q23_volumePref: "auto" }) === "heikko");
  ck("pickRecoveryCapacity: female + CT + elite → ei Huiberts (q23-pohjainen)",
     pickRecoveryCapacity({ q02_sex: "female", q15_aerobicModality: "running", q08_selfLevel: "elite", q23_volumePref: "MAV" }) === "keski");
  ck("pickRecoveryCapacity: male + ei CT + elite + q23=MAV → keski",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "elite", q23_volumePref: "MAV" }) === "keski");
  ck("pickRecoveryCapacity: q23=MEV → heikko",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "beginner", q23_volumePref: "MEV" }) === "heikko");
  ck("pickRecoveryCapacity: q23=MRV → hyva",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "elite", q23_volumePref: "MRV" }) === "hyva");
  ck("pickRecoveryCapacity: q23=auto + advanced → hyva",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "advanced", q23_volumePref: "auto" }) === "hyva");
  ck("pickRecoveryCapacity: q23=auto + intermediate → keski (default)",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "intermediate", q23_volumePref: "auto" }) === "keski");
  ck("pickRecoveryCapacity: male + CT + intermediate (ei advanced) → ei Huiberts → q23-pohjainen",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "running", q08_selfLevel: "intermediate", q23_volumePref: "MAV" }) === "keski");

  // ─── 2B-γ: Cut-aggressive (Helms 2018) — uudet testit ──────────────
  ck("pickRecoveryCapacity 2B-γ: q14=yes + deficitKcal=600 → heikko (cut aggressive)",
     pickRecoveryCapacity({
       q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "elite", q23_volumePref: "MAV",
       q14_cutting: "yes", q30_energyBudget: { deficitKcal: 600, proteinGPerKg: 2.0 },
     }) === "heikko");
  ck("pickRecoveryCapacity 2B-γ: q14=yes + deficitKcal=500 (raja-arvo) → heikko",
     pickRecoveryCapacity({
       q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "elite", q23_volumePref: "MAV",
       q14_cutting: "yes", q30_energyBudget: { deficitKcal: 500, proteinGPerKg: 2.0 },
     }) === "heikko");
  ck("pickRecoveryCapacity 2B-γ: q14=yes + deficitKcal=300 (mieto) → q23-pohjainen (keski)",
     pickRecoveryCapacity({
       q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "elite", q23_volumePref: "MAV",
       q14_cutting: "yes", q30_energyBudget: { deficitKcal: 300, proteinGPerKg: 2.0 },
     }) === "keski");
  ck("pickRecoveryCapacity 2B-γ: q14=no + q30 puuttuu → ei muutosta",
     pickRecoveryCapacity({
       q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "elite", q23_volumePref: "MAV",
       q14_cutting: "no",
     }) === "keski");
  ck("pickRecoveryCapacity 2B-γ: cut-aggressive prioriteetti yli Huiberts (CT+male+elite)",
     pickRecoveryCapacity({
       q02_sex: "male", q15_aerobicModality: "running", q08_selfLevel: "elite", q23_volumePref: "MAV",
       q14_cutting: "yes", q30_energyBudget: { deficitKcal: 600 },
     }) === "heikko");

  // ─── 5. pickPrimaries ──────────────────────────────────────────────
  const streetFull = pickPrimaries({ q09_sport: "streetlifting",
    q17_equipment: ["pullup_bar", "dip_station", "barbell_rack"], q11_injuries: [], q22_avoidedExercises: [] });
  ck("pickPrimaries: streetlifting + full equipment → 4 primaries",
     streetFull.length === 4);
  ck("pickPrimaries: streetlifting sis. Lisäpainoleuanveto",
     streetFull.some(p => p.name === "Lisäpainoleuanveto"));
  ck("pickPrimaries: streetlifting sis. Muscle-up",
     streetFull.some(p => p.name === "Muscle-up"));

  const streetInjuryShoulder = pickPrimaries({ q09_sport: "streetlifting",
    q17_equipment: ["pullup_bar", "dip_station", "barbell_rack"],
    q11_injuries: [{ area: "olkapää", type: "absolute" }], q22_avoidedExercises: [] });
  ck("pickPrimaries: streetlifting + olkapää-absolute → poistaa Lisäpainodipin",
     !streetInjuryShoulder.some(p => p.name === "Lisäpainodippi"));

  const streetNoEq = pickPrimaries({ q09_sport: "streetlifting",
    q17_equipment: ["pullup_bar"], q11_injuries: [], q22_avoidedExercises: [] });
  ck("pickPrimaries: streetlifting + vain leukatanko → poistaa dipin + takakyykyn",
     !streetNoEq.some(p => p.name === "Lisäpainodippi") && !streetNoEq.some(p => p.name === "Takakyykky"));

  const plFull = pickPrimaries({ q09_sport: "powerlifting",
    q17_equipment: ["barbell_rack"], q11_injuries: [], q22_avoidedExercises: [] });
  ck("pickPrimaries: powerlifting + barbell_rack → 3 primaries",
     plFull.length === 3);
  ck("pickPrimaries: powerlifting sis. Penkkipunnerrus",
     plFull.some(p => p.name === "Penkkipunnerrus"));

  const plPolvi = pickPrimaries({ q09_sport: "powerlifting",
    q17_equipment: ["barbell_rack"], q11_injuries: [{ area: "polvi", type: "absolute" }], q22_avoidedExercises: [] });
  ck("pickPrimaries: powerlifting + polvi-absolute → poistaa Takakyykky",
     !plPolvi.some(p => p.name === "Takakyykky"));

  const allRemoved = pickPrimaries({ q09_sport: "streetlifting",
    q17_equipment: [], q11_injuries: [], q22_avoidedExercises: [] });
  ck("pickPrimaries: ei kalustoa → fallback Leuanveto (kehonpaino)",
     allRemoved.length === 1 && allRemoved[0].name === "Leuanveto (kehonpaino)");

  const avoided = pickPrimaries({ q09_sport: "powerlifting",
    q17_equipment: ["barbell_rack"], q11_injuries: [],
    q22_avoidedExercises: ["maastaveto"] });
  ck("pickPrimaries: q22 'maastaveto' poistaa Maastaveto",
     !avoided.some(p => p.name === "Maastaveto"));

  // ─── 5b. Pilari 3 C0: MOVEMENT_EQUIPMENT-taulukko + heuristiikka ────
  const eqAll = new Set(["barbell_rack", "pullup_bar", "dip_station", "cable_machine", "machines", "dumbbells", "rings"]);
  const eqHome = new Set(["pullup_bar"]); // kotikuntoilija: vain leukatanko
  // Kisaliikkeet + selkeät rivit
  ck("C0: Takakyykky → barbell_rack", movementRequiredEquipment("Takakyykky").requires[0] === "barbell_rack");
  ck("C0: Lisäpainoleuanveto → pullup_bar", movementRequiredEquipment("Lisäpainoleuanveto").requires[0] === "pullup_bar");
  ck("C0: Lisäpainodippi → dip_station", movementRequiredEquipment("Lisäpainodippi").requires[0] === "dip_station");
  ck("C0: Ylätalja → cable_machine", movementRequiredEquipment("Ylätalja").requires[0] === "cable_machine");
  ck("C0: Jalkaprässi → machines", movementRequiredEquipment("Jalkaprässi").requires[0] === "machines");
  // Heuristiikka (tuntematon nimi avainsanalla)
  ck("C0 heur: 'Cable fly' → cable_machine", movementRequiredEquipment("Cable fly", "external", "horisontaalityöntö").requires[0] === "cable_machine");
  ck("C0 heur: 'Leg press kone' → machines", movementRequiredEquipment("Leg press kone", "external", "alaraaja").requires[0] === "machines");
  // requiresAny: lisäpaino DB TAI tanko
  ck("C0: Hauiskääntö = requiresAny (DB tai tanko)", movementRequiredEquipment("Hauiskääntö").any !== null);
  ck("C0: Hauiskääntö suoritettavissa pelkällä tangolla", isMovementPerformable("Hauiskääntö", "external", "hauisfleksio", new Set(["barbell_rack"])));
  // bodyweight = aina suoritettavissa (vähimmäisvaatimus ei välinettä)
  ck("C0: Bulgarian split squat = bodyweight (aina performable)", isMovementPerformable("Bulgarian split squat", "external", "alaraaja", new Set()));
  // EPÄVARMA tuntematon external → ei suodateta (inklusiivinen)
  ck("C0: tuntematon external (ei avainsanaa) → [] (älä suodata)", movementRequiredEquipment("Jokin oudoliike", "external", "muu").requires.length === 0);
  // Performability täyskalustolla = kaikki performable; kotona = Ylätalja EI performable
  ck("C0: Ylätalja EI performable kotona (vain pullup_bar)", !isMovementPerformable("Ylätalja", "external", "vertikaaliveto", eqHome));
  ck("C0: Lisäpainoleuanveto performable kotona", isMovementPerformable("Lisäpainoleuanveto", "system", "vertikaaliveto", eqHome));
  ck("C0: Takakyykky performable täyskalustolla", isMovementPerformable("Takakyykky", "external", "alaraaja", eqAll));

  // ─── 5c. Pilari 3 C1: goal-aware pickPrimaries (FIX-A) ──────────────
  const eqFull = ["barbell_rack", "pullup_bar", "dip_station", "cable_machine", "machines", "dumbbells"];
  const hasCat = (prims, cat) => prims.some(p => p.category === cat);
  const hasName = (prims, name) => prims.some(p => p.name === name);
  // hypertrophy → push/pull/legs (3 primaaria, alaraaja mukana, EI default-leuanveto-monokulttuuri)
  const hyp = pickPrimaries({ q09_sport: "hypertrophy", q12_primaryGoal: "hypertrophy", q17_equipment: eqFull });
  ck("C1: hypertrophy → 3 primaaria", hyp.length === 3);
  ck("C1: hypertrophy sis. alaraaja (#4)", hasCat(hyp, "alaraaja"));
  ck("C1: hypertrophy sis. push + pull", hasName(hyp, "Penkkipunnerrus") && hasName(hyp, "Lisäpainoleuanveto"));
  // general_strength → kyykky + penkki + leuka
  const gen = pickPrimaries({ q09_sport: "hybrid", q12_primaryGoal: "general_strength", q17_equipment: eqFull });
  ck("C1: general_strength → kyykky+penkki+leuka", hasName(gen, "Takakyykky") && hasName(gen, "Penkkipunnerrus") && hasName(gen, "Lisäpainoleuanveto"));
  ck("C1: general_strength sis. alaraaja (#4)", hasCat(gen, "alaraaja"));
  // max_1RM → tanko-big-3
  const mx = pickPrimaries({ q09_sport: "sport", q12_primaryGoal: "max_1RM", q17_equipment: eqFull });
  ck("C1: max_1RM → big-3 (kyykky+penkki+maave)", hasName(mx, "Takakyykky") && hasName(mx, "Penkkipunnerrus") && hasName(mx, "Maastaveto"));
  // KNOWN-NEG: streetlifting (spesifi) säilyy ennallaan (4-liikkeen setti, EI goal-haara)
  const str = pickPrimaries({ q09_sport: "streetlifting", q12_primaryGoal: "max_1RM", q17_equipment: eqFull });
  ck("C1 known-neg: streetlifting ennallaan (sis. Muscle-up)", hasName(str, "Muscle-up") && hasName(str, "Lisäpainoleuanveto"));

  // ─── 5d. Pilari 3 C2: applyEquipmentFilter (FIX-B) ──────────────────
  const mkWP = (accName, accCat) => [{ week: 1, days: [{ slots: [
    { role: "primary",   category: "alaraaja", defaultMovementName: "Takakyykky", sets: 5, reps: 3 },
    { role: "accessory", category: accCat,     defaultMovementName: accName,      sets: 3, reps: 10 },
  ] }] }];
  const accOf = wp => wp[0].days[0].slots.filter(s => s.role === "accessory");
  // No-op täyskalustolla: Ylätalja säilyy
  ck("C2: täyskalusto → Ylätalja säilyy (no-op)",
     accOf(applyEquipmentFilter(mkWP("Ylätalja", "vertikaaliveto"), eqFull)).some(s => s.defaultMovementName === "Ylätalja"));
  // q17 puuttuu → no-op (ei strippaa vahingossa)
  ck("C2: q17 puuttuu → no-op",
     accOf(applyEquipmentFilter(mkWP("Ylätalja", "vertikaaliveto"), null)).some(s => s.defaultMovementName === "Ylätalja"));
  // pullup_bar-only: Ylätalja (cable) EI jää → korvattu/pudotettu, korvaaja suoritettavissa
  const wpHome = applyEquipmentFilter(mkWP("Ylätalja", "vertikaaliveto"), ["pullup_bar"]);
  const homeAcc = accOf(wpHome);
  ck("C2: pullup_bar-only → Ylätalja EI jää", !homeAcc.some(s => s.defaultMovementName === "Ylätalja"));
  ck("C2: korvaaja suoritettavissa q17:llä", homeAcc.every(s => isMovementPerformable(s.defaultMovementName, null, s.category, new Set(["pullup_bar"]))));
  ck("C2: primaari Takakyykky EI kosketa (vain accessory)",
     wpHome[0].days[0].slots.some(s => s.role === "primary" && s.defaultMovementName === "Takakyykky"));
  // Korvaus säilyttää sarja/toistot
  ck("C2: korvaus säilyttää sets/reps", homeAcc.length === 0 || (homeAcc[0].sets === 3 && homeAcc[0].reps === 10));

  // ─── 5e. Pilari 3 C3: ensureLowerBody (alaraaja-invariantti) ────────
  const isLegCat = c => c === "alaraaja" || c === "lonkkahingaus";
  const legCount = wp => wp.reduce((n, w) => n + w.days.reduce((m, d) => m + d.slots.filter(s => isLegCat(s.category)).length, 0), 0);
  // Jalaton ohjelma (vain vertikaaliveto) → injektoidaan alaraaja
  const legBlank = [{ week: 1, days: [{ slots: [
    { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 3 },
    { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8 },
  ] }] }];
  const fixed = ensureLowerBody(legBlank, eqFull);
  ck("C3: jalaton ohjelma → alaraaja injektoitu", legCount(fixed) >= 1);
  ck("C3: injektoitu liike on accessory + _lowerBodyGuaranteed",
     fixed[0].days[0].slots.some(s => s._lowerBodyGuaranteed && isLegCat(s.category)));
  // Jalat jo mukana → no-op (ei lisätä toista)
  const hasLegs = [{ week: 1, days: [{ slots: [{ role: "primary", category: "alaraaja", defaultMovementName: "Takakyykky", sets: 5, reps: 3 }] }] }];
  ck("C3: jalat jo mukana → no-op (ei tuplaa)", legCount(ensureLowerBody(hasLegs, eqFull)) === 1);
  // Kehonpaino-only: injektoitu alaraaja suoritettavissa ilman välineitä
  const fixedHome = ensureLowerBody(legBlank, ["pullup_bar"]);
  const injHome = fixedHome[0].days[0].slots.find(s => s._lowerBodyGuaranteed);
  ck("C3: kehonpaino-ympäristö → injektoitu alaraaja suoritettavissa", !!injHome && isMovementPerformable(injHome.defaultMovementName, null, injHome.category, new Set(["pullup_bar"])));

  // ─── 6. pickPreferredDaysOfWeek ────────────────────────────────────
  ck("pickPreferredDaysOfWeek: 3 → [1,3,5]",
     JSON.stringify(pickPreferredDaysOfWeek({ daysPerWeek: 3 })) === JSON.stringify([1, 3, 5]));
  ck("pickPreferredDaysOfWeek: 4 → [0,2,4,5]",
     JSON.stringify(pickPreferredDaysOfWeek({ daysPerWeek: 4 })) === JSON.stringify([0, 2, 4, 5]));
  ck("pickPreferredDaysOfWeek: 7 → [0..6]",
     JSON.stringify(pickPreferredDaysOfWeek({ daysPerWeek: 7 })) === JSON.stringify([0, 1, 2, 3, 4, 5, 6]));
  ck("pickPreferredDaysOfWeek: 0 → null",
     pickPreferredDaysOfWeek({ daysPerWeek: 0 }) === null);
  ck("pickPreferredDaysOfWeek: undefined → null",
     pickPreferredDaysOfWeek(undefined) === null);

  // ─── 7. applyTargetDateAnchor ──────────────────────────────────────
  const today = _todayISO();
  const r1 = applyTargetDateAnchor(4, undefined, today);
  ck("applyTargetDateAnchor: q27=undefined → ei muutosta",
     r1.weekCount === 4 && r1.anchored === false);
  // 2 vk päästä
  const twoW = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const r2 = applyTargetDateAnchor(4, twoW, today);
  ck("applyTargetDateAnchor: q27=2 vk päästä → 2 vk (anchored)",
     r2.weekCount === 2 && r2.anchored === true);
  // 8 vk päästä
  const eightW = new Date(Date.now() + 56 * 86400000).toISOString().slice(0, 10);
  const r3 = applyTargetDateAnchor(4, eightW, today);
  ck("applyTargetDateAnchor: q27=8 vk päästä → 8 vk (anchored)",
     r3.weekCount === 8 && r3.anchored === true);
  // 20 vk päästä → cap 16
  const twentyW = new Date(Date.now() + 140 * 86400000).toISOString().slice(0, 10);
  const r4 = applyTargetDateAnchor(4, twentyW, today);
  ck("applyTargetDateAnchor: q27=20 vk päästä → cap 16",
     r4.weekCount === 16 && r4.anchored === true);
  // 10 päivän päästä → warning
  const tenD = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const r5 = applyTargetDateAnchor(4, tenD, today);
  ck("applyTargetDateAnchor: q27=10 päivän päästä → warning",
     r5.anchored === false && typeof r5.warning === "string");

  // ─── 8. validateMappingInput ───────────────────────────────────────
  const v1 = validateMappingInput(null, null);
  ck("validateMappingInput: null → invalid",
     v1.valid === false);
  const v2 = validateMappingInput({ schemaVersion: "3.2", completedAtISO: "2026-05-11", answers: {} }, null);
  ck("validateMappingInput: schemaVersion=3.2 → invalid",
     v2.valid === false && v2.errors.some(e => e.reason.includes("3.3")));
  const v3 = validateMappingInput({ schemaVersion: "3.3", completedAtISO: null, answers: {} }, null);
  ck("validateMappingInput: completedAtISO=null → invalid",
     v3.valid === false);

  // ─── 9. mapWizardToMesocycle päästä-päähän — Akseli ────────────────
  const akseliConfig = {
    wizardId: "wiz_akseli_test",
    schemaVersion: "3.3",
    completedAtISO: "2026-05-11T10:00:00Z",
    answers: {
      q01_age: 34, q02_sex: "male", q03_weight: 91,
      q06_yearsTraining: 15, q08_selfLevel: "elite", q09_sport: "streetlifting",
      q11_injuries: [], q12_primaryGoal: "streetlifting_with_explosive_components",
      q14_cutting: "no", q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station"],
      q21_splitPreference: "upper_lower",
      q22_avoidedExercises: [],
      q23_volumePref: "MAV",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 90 },
      q25_rpePrecision: "vara_calibrated",
      q29_recentBlock: "peaking",
    },
  };
  const akseliResult = mapWizardToMesocycle(akseliConfig, { canRead: true, hasMovementProgress: true, hasMesocycles: false });
  ck("Akseli mapping: goal === hypertrofia (peakingin jälkeen)",
     akseliResult.goal === "hypertrofia");
  ck("Akseli mapping: weekCount === 4 (elite-tier hypertrofia)",
     akseliResult.weekCount === 4);
  ck("Akseli mapping: 4 primaries (streetlifting)",
     akseliResult.primaries.length === 4);
  ck("Akseli mapping: daysPerWeek === 4",
     akseliResult.daysPerWeek === 4);
  ck("Akseli mapping: recoveryCapacity === keski (q23=MAV, ei CT)",
     akseliResult.recoveryCapacity === "keski");
  ck("Akseli mapping: sexModifierApplied === false (ei CT)",
     akseliResult._wizardMeta.sexModifierApplied === false);
  ck("Akseli mapping: rules array sisältää Issurin-säännön",
     akseliResult._wizardMeta.rules.some(r => r.source.includes("Issurin")));

  // ─── 10. mapWizardToMesocycle päästä-päähän — uusi käyttäjä ────────
  const newUserConfig = {
    wizardId: "wiz_new_user_test",
    schemaVersion: "3.3",
    completedAtISO: "2026-05-11T10:00:00Z",
    answers: {
      q01_age: 28, q02_sex: "female", q03_weight: 65,
      q06_yearsTraining: 1, q08_selfLevel: "beginner", q09_sport: "hypertrophy",
      q11_injuries: [],
      q12_primaryGoal: "hypertrophy", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["pullup_bar"],
      q21_splitPreference: "fullbody",
      q22_avoidedExercises: [],
      q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 60 },
      q25_rpePrecision: "vara_loose",
      q29_recentBlock: "off_program",
    },
  };
  const newUserResult = mapWizardToMesocycle(newUserConfig, null);
  ck("Uusi käyttäjä mapping: goal === hypertrofia (off_program)",
     newUserResult.goal === "hypertrofia");
  ck("Uusi käyttäjä mapping: weekCount === 8 (beginner-tier)",
     newUserResult.weekCount === 8);
  ck("Uusi käyttäjä mapping: 1 primary (vain pullup_bar)",
     newUserResult.primaries.length === 1);
  ck("Uusi käyttäjä mapping: recoveryCapacity === keski (default)",
     newUserResult.recoveryCapacity === "keski");

  // ─── 11. mapWizardToMesocycle — female-CT-skenaario (sex-modifier EI laukea) ──
  const femaleCTConfig = {
    ...akseliConfig,
    answers: { ...akseliConfig.answers, q02_sex: "female", q15_aerobicModality: "running",
               q16_aerobicVolume: { frequencyPerWeek: 3, durationMinutes: 30, sameSession: false } },
  };
  const femaleCTResult = mapWizardToMesocycle(femaleCTConfig, null);
  ck("Female + CT: sexModifierApplied === false (Huiberts ei tue naisille)",
     femaleCTResult._wizardMeta.sexModifierApplied === false);
  ck("Female + CT: recoveryCapacity ei ole 'heikko' Huibertsin takia",
     femaleCTResult.recoveryCapacity !== "heikko" || femaleCTResult.recoveryCapacity === "heikko" && akseliConfig.answers.q23_volumePref === "MEV");

  // ─── 12. mapWizardToMesocycle — male-CT-advanced (sex-modifier laukea) ──
  const maleCTAdvancedConfig = {
    ...akseliConfig,
    answers: { ...akseliConfig.answers, q15_aerobicModality: "running",
               q16_aerobicVolume: { frequencyPerWeek: 3, durationMinutes: 30, sameSession: false } },
  };
  const maleCTResult = mapWizardToMesocycle(maleCTAdvancedConfig, null);
  ck("Male + CT + elite: sexModifierApplied === true",
     maleCTResult._wizardMeta.sexModifierApplied === true);
  ck("Male + CT + elite: recoveryCapacity === heikko (Huiberts)",
     maleCTResult.recoveryCapacity === "heikko");

  // ─── 13. Deterministisyys (sama input → sama output) ───────────────
  const det1 = mapWizardToMesocycle(akseliConfig, null);
  const det2 = mapWizardToMesocycle(akseliConfig, null);
  // _wizardMeta:n rules-array on sama; startDateISO on sama päivä mutta
  // funktio kutsutaan ms-tarkkuudella → eroja voi syntyä keskiyöllä.
  // Vertaillaan pääparametrejä.
  ck("Deterministisyys: goal sama",     det1.goal === det2.goal);
  ck("Deterministisyys: weekCount sama", det1.weekCount === det2.weekCount);
  ck("Deterministisyys: primaries.length sama", det1.primaries.length === det2.primaries.length);
  ck("Deterministisyys: recoveryCapacity sama", det1.recoveryCapacity === det2.recoveryCapacity);

  // ─── 14. _wizardMeta-rakenteen täydellisyys ─────────────────────────
  ck("_wizardMeta sisältää mapperVersion (2D-gamma-v1.0)", akseliResult._wizardMeta.mapperVersion === "2D-gamma-v1.0");
  ck("_wizardMeta sisältää wizardSchemaVersion",  akseliResult._wizardMeta.wizardSchemaVersion === "3.3");
  ck("_wizardMeta sisältää rules-array",          Array.isArray(akseliResult._wizardMeta.rules) && akseliResult._wizardMeta.rules.length > 0);
  ck("_wizardMeta.rules sisältää ACSM-säännön (Nunes + ACSM 2009)",
     akseliResult._wizardMeta.rules.some(r => r.source.includes("ACSM 2009")));

  // ─── 15. Schema-invariantit (1A:n säilytys + v4.51.0 q33 lisäys) ───
  // v4.51.0 (Track B 2D-δ-C): q33_aggressivenessDefault lisätty loading-stageen
  // → totalQuestions 30 → 31. v4.51.6: q31_preferredDays → 32.
  ck("SCHEMA_INVARIANTS.totalQuestions === 32", SCHEMA_INVARIANTS.totalQuestions === 32);
  ck("SCHEMA_INVARIANTS.totalStages === 8",     SCHEMA_INVARIANTS.totalStages === 8);

  // ════════════════════════════════════════════════════════════════
  // ─── 2C-α: Multi-blokki-sekvenssi (Issurin block-malli) ────────────
  // ════════════════════════════════════════════════════════════════

  // pickBlockSequence — single-blokki-fallback-tilanteet
  ck("pickBlockSequence: ei targetia → null (fallback single)",
     pickBlockSequence({ q12_primaryGoal: "max_1RM", q29_recentBlock: "peaking" }, null) === null);
  ck("pickBlockSequence: alle 5 vk → null",
     pickBlockSequence({ q12_primaryGoal: "max_1RM", q29_recentBlock: "peaking" }, 28) === null);
  ck("pickBlockSequence: hypertrofia-tavoite → null (vain max-tavoitteille)",
     pickBlockSequence({ q12_primaryGoal: "hypertrophy", q29_recentBlock: "peaking" }, 98) === null);
  ck("pickBlockSequence: general_strength → null",
     pickBlockSequence({ q12_primaryGoal: "general_strength", q29_recentBlock: "peaking" }, 98) === null);

  // pickBlockSequence — multi-blokki-tilanteet
  const seq4 = pickBlockSequence({ q12_primaryGoal: "max_1RM", q29_recentBlock: "peaking" }, 98); // 14 vk
  ck("pickBlockSequence: 14 vk + max-tavoite + peakingista → 4 blokkia (14 vk)",
     seq4 && seq4.blocks.length === 4 && seq4.totalWeeks === 14);
  ck("pickBlockSequence: 4-block-sekvenssi alkaa hypertrofialla",
     seq4 && seq4.blocks[0].label === "hypertrofia");
  ck("pickBlockSequence: 4-block-sekvenssi päättyy peakingiin",
     seq4 && seq4.blocks[seq4.blocks.length - 1].label === "peaking");
  ck("pickBlockSequence: 4-block-sekvenssi sisältää strength + intensification",
     seq4 && seq4.blocks.map(b => b.label).join(",").includes("strength") &&
     seq4.blocks.map(b => b.label).join(",").includes("intensification"));

  // Peaking 2 vk, muut 4 vk
  ck("pickBlockSequence: peaking-blokin pituus on 2 vk, muut 4 vk",
     seq4 && seq4.blocks.every(b => b.label === "peaking" ? b.weekCount === 2 : b.weekCount === 4));

  // 3-blokki: aika riittää 10-13 vk:lle
  const seq3 = pickBlockSequence({ q12_primaryGoal: "powerlifting", q29_recentBlock: "off_program" }, 84); // 12 vk
  ck("pickBlockSequence: 12 vk → 3 blokkia (4+4+2 = 10 vk)",
     seq3 && seq3.blocks.length === 3 && seq3.totalWeeks === 10);

  // Skip-tilanteet (vain rajoitetulla ajalla, < 14 vk)
  const seqSkipHyp = pickBlockSequence({ q12_primaryGoal: "max_1RM", q29_recentBlock: "hypertrophy" }, 84); // 12 vk
  ck("pickBlockSequence (12 vk): q29=hypertrophy → ei hypertrofia-blokkia sekvenssissä",
     seqSkipHyp && !seqSkipHyp.blocks.some(b => b.label === "hypertrofia"));
  ck("pickBlockSequence (12 vk): skippedBlocks.hypertrofia = true kun q29=hypertrophy",
     seqSkipHyp && seqSkipHyp.skippedBlocks.hypertrofia === true);

  const seqSkipStr = pickBlockSequence({ q12_primaryGoal: "max_1RM", q29_recentBlock: "strength" }, 70); // 10 vk
  ck("pickBlockSequence (10 vk): q29=strength → ei hyp+str-blokkeja",
     seqSkipStr && !seqSkipStr.blocks.some(b => b.label === "hypertrofia" || b.label === "strength"));

  // 2C-δ KORJAUS: ≥14 vk käytettävissä → skip-säännöt EI laukea, täysi sykli
  const seqAmpleTime = pickBlockSequence({ q12_primaryGoal: "max_1RM", q29_recentBlock: "strength" }, 112); // 16 vk
  ck("pickBlockSequence (16 vk + q29=strength): KAIKKI 4 blokkia (skip-säännöt EI päde)",
     seqAmpleTime && seqAmpleTime.blocks.length === 4);
  ck("pickBlockSequence (16 vk): totalWeeks=14 (hyp4+str4+int4+peak2)",
     seqAmpleTime && seqAmpleTime.totalWeeks === 14);
  ck("pickBlockSequence (16 vk + q29=strength): EI skipattu, koska Issurin-residuaalit rapautuneet",
     seqAmpleTime && !seqAmpleTime.skippedBlocks.strength && !seqAmpleTime.skippedBlocks.hypertrofia);

  // mapWizardToMultiBlockMesocycle — Akselin tilanne ilman target-päivää
  const akseliNoTarget = {
    wizardId: "wiz_akseli_no_target",
    schemaVersion: "3.3",
    completedAtISO: "2026-05-11T10:00:00Z",
    answers: {
      q01_age: 34, q02_sex: "male", q03_weight: 91,
      q06_yearsTraining: 15, q08_selfLevel: "elite", q09_sport: "streetlifting",
      q11_injuries: [], q12_primaryGoal: "streetlifting_with_explosive_components",
      q14_cutting: "no", q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station"],
      q21_splitPreference: "upper_lower", q22_avoidedExercises: [],
      q23_volumePref: "MAV",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 90 },
      q25_rpePrecision: "vara_calibrated",
      q29_recentBlock: "peaking",
    },
  };
  const noTargetResult = mapWizardToMultiBlockMesocycle(akseliNoTarget, null);
  ck("mapWizardToMultiBlockMesocycle: ilman q27 → fallback single-blokki",
     !noTargetResult.isMultiBlock && typeof noTargetResult.goal === "string");

  // mapWizardToMultiBlockMesocycle — Akselin tilanne kisapäivän kanssa
  const targetDate = new Date(Date.now() + 98 * 86400000).toISOString().slice(0, 10); // 14 vk päästä
  const akseliWithTarget = {
    ...akseliNoTarget,
    wizardId: "wiz_akseli_with_target",
    answers: { ...akseliNoTarget.answers, q27_targetDate: targetDate, q28_targetType: "competition" },
  };
  const withTargetResult = mapWizardToMultiBlockMesocycle(akseliWithTarget, null);
  ck("mapWizardToMultiBlockMesocycle: q27=14vk päästä + max-tavoite → multi-blokki",
     withTargetResult.isMultiBlock === true);
  ck("mapWizardToMultiBlockMesocycle: multi-blokki sisältää blocks-arrayn",
     Array.isArray(withTargetResult.blocks) && withTargetResult.blocks.length >= 2);
  ck("mapWizardToMultiBlockMesocycle: _wizardMeta.targetDateAnchored=true",
     withTargetResult._wizardMeta.targetDateAnchored === true);
  ck("mapWizardToMultiBlockMesocycle: _wizardMeta.rules sisältää block-sekvenssin",
     withTargetResult._wizardMeta.rules.some(r => r.rule.includes("multi-blokki")));
  ck("mapWizardToMultiBlockMesocycle: 4 primaries säilyy (streetlifting)",
     withTargetResult.primaries.length === 4);

  // ════════════════════════════════════════════════════════════════
  // ─── 2C-β: Session-fokus-labelit ─────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // applySessionFocusLabels — simuloi weekPlans-rakenne pää-app:n tyyliin
  const mockWeekPlans = [
    {
      week: 1,
      days: [
        { dayOfWeek: 1, dayType: "volume", label: "Perusvoima A",
          slots: [
            { role: "primary",   defaultMovementName: "Lisäpainoleuanveto" },
            { role: "accessory", defaultMovementName: "Ylätalja" },
          ] },
        { dayOfWeek: 3, dayType: "heavy", label: "Maksimivoima",
          slots: [
            { role: "primary",   defaultMovementName: "Takakyykky" },
            { role: "accessory", defaultMovementName: "RDL" },
          ] },
        { dayOfWeek: 5, dayType: "speed", label: "Nopeusvoima",
          slots: [
            { role: "primary",   defaultMovementName: "Lisäpainodippi" },
            { role: "accessory", defaultMovementName: "Vinopenkki" },
          ] },
      ],
    },
  ];
  const focused = applySessionFocusLabels(mockWeekPlans);
  ck("applySessionFocusLabels: lisäpaino-leuka + volyymi → 'Pullup-fokus (volyymi)'",
     focused[0].days[0].label === "Pullup-fokus (volyymi)");
  ck("applySessionFocusLabels: takakyykky + heavy → 'Kyykky-fokus (raskas)'",
     focused[0].days[1].label === "Kyykky-fokus (raskas)");
  ck("applySessionFocusLabels: lisäpaino-dippi + speed → 'Dippi-fokus (nopeus)'",
     focused[0].days[2].label === "Dippi-fokus (nopeus)");
  ck("applySessionFocusLabels: originalLabel säilyy audit-jälkenä",
     focused[0].days[0].originalLabel === "Perusvoima A");
  ck("applySessionFocusLabels: sessionFocus = primary-nimi",
     focused[0].days[0].sessionFocus === "Lisäpainoleuanveto");
  ck("applySessionFocusLabels: dayType säilyy (treenin logiikka koskematon)",
     focused[0].days[0].dayType === "volume" &&
     focused[0].days[1].dayType === "heavy" &&
     focused[0].days[2].dayType === "speed");

  // Edge cases
  const noSlotsPlans = [{ week: 1, days: [{ dayOfWeek: 1, dayType: "volume", label: "X" }] }];
  const focusedNoSlots = applySessionFocusLabels(noSlotsPlans);
  ck("applySessionFocusLabels: ei slots → label säilyy ennallaan",
     focusedNoSlots[0].days[0].label === "X");

  const muscleUpPlans = [{ week: 1, days: [{ dayOfWeek: 1, dayType: "intensity", label: "X",
    slots: [{ role: "primary", defaultMovementName: "Muscle-up" }] }] }];
  ck("applySessionFocusLabels: Muscle-up → 'Muscle-up-fokus (intensiteetti)'",
     applySessionFocusLabels(muscleUpPlans)[0].days[0].label === "Muscle-up-fokus (intensiteetti)");

  const benchPlans = [{ week: 1, days: [{ dayOfWeek: 1, dayType: "heavy", label: "X",
    slots: [{ role: "primary", defaultMovementName: "Penkkipunnerrus" }] }] }];
  ck("applySessionFocusLabels: Penkkipunnerrus → 'Penkki-fokus (raskas)'",
     applySessionFocusLabels(benchPlans)[0].days[0].label === "Penkki-fokus (raskas)");

  const deadliftPlans = [{ week: 1, days: [{ dayOfWeek: 1, dayType: "volume", label: "X",
    slots: [{ role: "primary", defaultMovementName: "Maastaveto" }] }] }];
  ck("applySessionFocusLabels: Maastaveto → 'Maave-fokus (volyymi)'",
     applySessionFocusLabels(deadliftPlans)[0].days[0].label === "Maave-fokus (volyymi)");

  // ════════════════════════════════════════════════════════════════
  // ─── 2C-β2: Block-sekvenssi käyttää uusia goal-arvoja ────────────
  // ════════════════════════════════════════════════════════════════
  const seqB2 = pickBlockSequence({ q12_primaryGoal: "max_1RM", q29_recentBlock: "peaking" }, 98);
  ck("2C-β2: 4-blokin sekvenssi käyttää goal=intensifikaatio (ei yhdistelma)",
     seqB2 && seqB2.blocks.some(b => b.goal === "intensifikaatio" && b.label === "intensification"));
  ck("2C-β2: peaking-blokki käyttää goal=peaking (ei maksimivoima)",
     seqB2 && seqB2.blocks.some(b => b.goal === "peaking" && b.label === "peaking" && b.weekCount === 2));

  // ─── applySplitFilter testit ──────────────────────────────────────
  const mixedDayPlans = [{ week: 1, days: [
    { dayOfWeek: 1, dayType: "volume", label: "X",
      slots: [
        { role: "primary",   category: "alaraaja",         defaultMovementName: "Takakyykky", sets: 4, reps: 8 },
        { role: "accessory", category: "alaraaja",         defaultMovementName: "Pin squat",  sets: 3, reps: 10 },
        { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Seated row", sets: 3, reps: 8 },
        { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Chest press", sets: 3, reps: 10 },
        { role: "accessory", category: "core",             defaultMovementName: "Hanging leg raise", sets: 3, reps: 10 },
      ] },
  ]}];
  const splitUL = applySplitFilter(mixedDayPlans, "upper_lower");
  const lowerDay = splitUL[0].days[0];
  ck("applySplitFilter upper_lower: kyykky-päivä → poistaa Seated row (vetävä yläosa)",
     !lowerDay.slots.some(s => s.defaultMovementName === "Seated row"));
  ck("applySplitFilter upper_lower: kyykky-päivä → poistaa Chest press (työntävä yläosa)",
     !lowerDay.slots.some(s => s.defaultMovementName === "Chest press"));
  ck("applySplitFilter upper_lower: kyykky-päivä → SÄILYTTÄÄ Pin squat (alaraaja)",
     lowerDay.slots.some(s => s.defaultMovementName === "Pin squat"));
  ck("applySplitFilter upper_lower: kyykky-päivä → SÄILYTTÄÄ Hanging leg raise (core neutraali)",
     lowerDay.slots.some(s => s.defaultMovementName === "Hanging leg raise"));
  ck("applySplitFilter upper_lower: primary aina säilyy (Takakyykky)",
     lowerDay.slots.some(s => s.defaultMovementName === "Takakyykky" && s.role === "primary"));

  const upperDayPlans = [{ week: 1, days: [
    { dayOfWeek: 1, dayType: "volume", label: "X",
      slots: [
        { role: "primary",   category: "vertikaaliveto",     defaultMovementName: "Lisäpainoleuanveto", sets: 4, reps: 6 },
        { role: "accessory", category: "horisontaaliveto",   defaultMovementName: "Penkkiveto",        sets: 3, reps: 8 },
        { role: "accessory", category: "alaraaja",           defaultMovementName: "Walking lunge",     sets: 3, reps: 10 },
        { role: "accessory", category: "lonkkahingaus",      defaultMovementName: "RDL",               sets: 3, reps: 8 },
      ] },
  ]}];
  const splitUL2 = applySplitFilter(upperDayPlans, "upper_lower");
  const upperDay = splitUL2[0].days[0];
  ck("applySplitFilter upper_lower: pullup-päivä → poistaa Walking lunge (alaraaja)",
     !upperDay.slots.some(s => s.defaultMovementName === "Walking lunge"));
  ck("applySplitFilter upper_lower: pullup-päivä → poistaa RDL (lonkkahingaus)",
     !upperDay.slots.some(s => s.defaultMovementName === "RDL"));
  ck("applySplitFilter upper_lower: pullup-päivä → SÄILYTTÄÄ Penkkiveto (vetävä yläosa)",
     upperDay.slots.some(s => s.defaultMovementName === "Penkkiveto"));

  ck("applySplitFilter fullbody → ei suodatusta (kaikki säilyy)",
     applySplitFilter(mixedDayPlans, "fullbody")[0].days[0].slots.length === 5);

  // ─── applyVolumeCap testit ────────────────────────────────────────
  const highVolumePlans = [{ week: 1, days: [
    { dayOfWeek: 1, slots: [
      { role: "primary",   category: "vertikaaliveto", sets: 5, reps: 3 }, // ei lasketa cap:iin
      { role: "accessory", category: "vertikaaliveto", sets: 6, reps: 8 },
      { role: "accessory", category: "vertikaaliveto", sets: 6, reps: 8 },
    ]},
    { dayOfWeek: 3, slots: [
      { role: "accessory", category: "vertikaaliveto", sets: 6, reps: 8 },
    ]},
  ]}]; // accessory-yhteensä vertikaalivedolle: 6+6+6 = 18 sets/vk
  const capped = applyVolumeCap(highVolumePlans, "intensifikaatio"); // cap 8
  const totalAfter = capped[0].days.reduce((s, d) =>
    s + d.slots.filter(x => x.role === "accessory" && x.category === "vertikaaliveto")
              .reduce((ss, x) => ss + x.sets, 0), 0);
  ck("applyVolumeCap intensifikaatio cap 8: 18 set/vk → leikataan ≤ 8-9",
     totalAfter <= 9);
  ck("applyVolumeCap: primary-sarjat säilyy koskemattomina",
     capped[0].days[0].slots[0].sets === 5);

  const cappedNone = applyVolumeCap(highVolumePlans, "hypertrofia"); // cap 16
  const totalHyp = cappedNone[0].days.reduce((s, d) =>
    s + d.slots.filter(x => x.role === "accessory").reduce((ss, x) => ss + x.sets, 0), 0);
  ck("applyVolumeCap hypertrofia cap 16: 18 → ~16",
     totalHyp >= 14 && totalHyp <= 16);

  // ════════════════════════════════════════════════════════════════
  // ─── 2C-γ: Tier-progressio (kg/vk-kerroin per status) ──────────
  // ════════════════════════════════════════════════════════════════

  // Tier-kertoimet (Latella 2020 + Nuckols SBS, EMPIRINEN)
  ck("TIER_PROGRESSION_MULTIPLIERS beginner = 1.0",   TIER_PROGRESSION_MULTIPLIERS.beginner === 1.00);
  ck("TIER_PROGRESSION_MULTIPLIERS intermediate = 0.40", TIER_PROGRESSION_MULTIPLIERS.intermediate === 0.40);
  ck("TIER_PROGRESSION_MULTIPLIERS advanced = 0.15",  TIER_PROGRESSION_MULTIPLIERS.advanced === 0.15);
  ck("TIER_PROGRESSION_MULTIPLIERS elite = 0.05",     TIER_PROGRESSION_MULTIPLIERS.elite === 0.05);
  ck("SEX_PROGRESSION_MULTIPLIER_FEMALE = 0.55",       SEX_PROGRESSION_MULTIPLIER_FEMALE === 0.55);

  // applyTierProgression — pos. deltaPctBase säädetään, neg. säilyy
  const mockWeekDefs = [
    { week: 1, deltaPctBase: -0.10, label: "Akklimatisaatio" }, // SÄILY
    { week: 2, deltaPctBase: 0.025, label: "Lataus" },          // SÄÄDETÄÄN
    { week: 3, deltaPctBase: 0.05,  label: "Peak" },            // SÄÄDETÄÄN
    { week: 4, deltaPctBase: -0.25, label: "Deload" },          // SÄILY
  ];
  const eliteApplied = applyTierProgression(mockWeekDefs, "elite", "male");
  ck("applyTierProgression elite + male: vk 1 (-10%) säilyy",
     eliteApplied[0].deltaPctBase === -0.10);
  ck("applyTierProgression elite + male: vk 2 (+2.5%) × 0.05 = +0.125%",
     Math.abs(eliteApplied[1].deltaPctBase - 0.001) < 0.0005); // 0.025 * 0.05 = 0.00125
  ck("applyTierProgression elite + male: vk 4 deload (-25%) säilyy",
     eliteApplied[3].deltaPctBase === -0.25);
  ck("applyTierProgression elite + male: _originalDeltaPctBase tallessa audit-jälkenä",
     eliteApplied[1]._originalDeltaPctBase === 0.025);

  const intApplied = applyTierProgression(mockWeekDefs, "intermediate", "male");
  ck("applyTierProgression intermediate: vk 2 (+2.5%) × 0.40 = +1.0%",
     Math.abs(intApplied[1].deltaPctBase - 0.01) < 0.0005);

  const begApplied = applyTierProgression(mockWeekDefs, "beginner", "male");
  ck("applyTierProgression beginner: vk 2 (+2.5%) × 1.0 = +2.5% (nominaali säilyy)",
     Math.abs(begApplied[1].deltaPctBase - 0.025) < 0.0005);

  const femApplied = applyTierProgression(mockWeekDefs, "intermediate", "female");
  ck("applyTierProgression intermediate + female: × 0.40 × 0.55 = 0.22 → vk 2 ~+0.55%",
     Math.abs(femApplied[1].deltaPctBase - 0.0055) < 0.001);

  // Tuntematon tier → ei muutosta
  const unkApplied = applyTierProgression(mockWeekDefs, "tuntematon", "male");
  ck("applyTierProgression tuntematon tier → ei muutosta",
     unkApplied[1].deltaPctBase === 0.025);

  // Auditointi-rules: Akselin (elite, male) generoinnissa pitäisi näkyä tier-sääntö
  ck("Akselin _wizardMeta.rules sisältää tier-progressio-säännön (elite)",
     akseliResult._wizardMeta.rules.some(r => r.status === "EMPIRINEN" &&
       r.rule.includes("elite") && r.source.includes("Latella 2020")));

  // ════════════════════════════════════════════════════════════════
  // ─── 2C-δ: Isometric-pitojen e1RM-mallinnus ────────────────────
  // ════════════════════════════════════════════════════════════════

  const bw = 91; // Akselin BW

  // Front Lever -tasot (Heavyweight Cali + Frinks n=322)
  const flFull = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "Front Lever (Full)", holdSeconds: 12 }, bw);
  ck("estimateIsometricE1RM: Front Lever Full @ 91kg, 12s → ~77 kg (= 85% BW)",
     flFull && Math.abs(flFull.e1RM - 77.4) < 1.0); // 91 * 0.85 * 1.0 = 77.35
  ck("estimateIsometricE1RM: Front Lever sourceStatus = EMPIRINEN HEURISTIIKKA",
     flFull && flFull.sourceStatus === "EMPIRINEN HEURISTIIKKA");

  const flStraddle = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "Front Lever Straddle", holdSeconds: 10 }, bw);
  ck("estimateIsometricE1RM: Front Lever Straddle @ 91kg, 10s → ~50 kg (= 55% BW)",
     flStraddle && Math.abs(flStraddle.e1RM - 50.05) < 1.0);

  // Hold-keston vaikutus
  const flFullShort = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "Front Lever (Full)", holdSeconds: 3 }, bw);
  ck("estimateIsometricE1RM: Front Lever Full 3s → 0.70× kerroin",
     flFullShort && Math.abs(flFullShort.e1RM - 54.2) < 1.0); // 77.35 * 0.70 = 54.14

  const flFullLong = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "Front Lever (Full)", holdSeconds: 35 }, bw);
  ck("estimateIsometricE1RM: Front Lever Full 35s → 1.30× kerroin",
     flFullLong && Math.abs(flFullLong.e1RM - 100.6) < 1.0); // 77.35 * 1.30 = 100.55

  // Lisäpaino isometric:lle
  const flFullWeighted = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "Front Lever Full", holdSeconds: 12, addedWeightKg: 10 }, bw);
  ck("estimateIsometricE1RM: Front Lever Full + 10kg lisäpaino → 77 + 10 = ~87 kg",
     flFullWeighted && Math.abs(flFullWeighted.e1RM - 87.4) < 1.0);

  // Planche
  const planFull = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "Planche (Full)", holdSeconds: 8 }, bw);
  ck("estimateIsometricE1RM: Full Planche @ 91kg, 8s → ~77 kg (= 85% BW)",
     planFull && Math.abs(planFull.e1RM - 77.4) < 1.0);

  const planTuck = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "Tuck Planche", holdSeconds: 60 }, bw);
  ck("estimateIsometricE1RM: Tuck Planche @ 91kg, 60s (SSC) → ~24 kg (20% BW × 1.30)",
     planTuck && Math.abs(planTuck.e1RM - 23.66) < 1.0); // 91 * 0.20 * 1.30

  // HSPU
  const hspuFree = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "Free HSPU", holdSeconds: 10 }, bw);
  ck("estimateIsometricE1RM: Free HSPU @ 91kg, 10s → ~114 kg (1.25 BW)",
     hspuFree && Math.abs(hspuFree.e1RM - 113.75) < 1.0);

  // One-arm pull-up
  const oap = estimateIsometricE1RM(
    { loadType: "isometric_hold", movementName: "One-arm pull-up unassisted", holdSeconds: 10 }, bw);
  ck("estimateIsometricE1RM: OAP unassisted @ 91kg, 10s → ~91 kg (1.00 BW)",
     oap && Math.abs(oap.e1RM - 91) < 1.0);

  // Edge cases
  ck("estimateIsometricE1RM: external-PR → null (vain isometric_hold)",
     estimateIsometricE1RM({ loadType: "external", weightKg: 100, reps: 3 }, bw) === null);
  ck("estimateIsometricE1RM: tuntematon liike → null",
     estimateIsometricE1RM({ loadType: "isometric_hold", movementName: "L-sit", holdSeconds: 30 }, bw) === null);
  ck("estimateIsometricE1RM: ei bodyweight → null",
     estimateIsometricE1RM({ loadType: "isometric_hold", movementName: "Front Lever", holdSeconds: 12 }, 0) === null);

  // ════════════════════════════════════════════════════════════════
  // ─── 2D-α: mapWizardToMesocycle(opts.selectedStyleId) ────────────
  // ════════════════════════════════════════════════════════════════
  const akseliBase = {
    wizardId: "wiz_akseli_2d",
    schemaVersion: "3.3",
    completedAtISO: "2026-05-11T10:00:00Z",
    answers: {
      q01_age: 34, q02_sex: "male", q03_weight: 91,
      q06_yearsTraining: 15, q08_selfLevel: "elite", q09_sport: "streetlifting",
      q11_injuries: [], q12_primaryGoal: "max_1RM",
      q14_cutting: "no", q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station"],
      q21_splitPreference: "upper_lower", q22_avoidedExercises: [],
      q23_volumePref: "MAV",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 90 },
      q25_rpePrecision: "vara_calibrated",
      q29_recentBlock: "hypertrophy",
    },
  };

  // selectedStyleId="single-hypertrofia" → goal pakotettu hypertrofiaksi
  const forcedHyp = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-hypertrofia" });
  ck("mapWizardToMesocycle(selectedStyleId='single-hypertrofia'): goal=hypertrofia",
     forcedHyp.goal === "hypertrofia");
  ck("mapWizardToMesocycle(selectedStyleId): _wizardMeta.styleSource = käyttäjän valinta",
     typeof forcedHyp._wizardMeta.styleSource === "string" && forcedHyp._wizardMeta.styleSource.includes("käyttäjän valinta"));
  ck("mapWizardToMesocycle(selectedStyleId): _wizardMeta.selectedStyleId tallennettu",
     forcedHyp._wizardMeta.selectedStyleId === "single-hypertrofia");

  // selectedStyleId="single-siirtyma" → goal=siirtyma, weekCount=3 (natiivipituus)
  const forcedSiirt = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-siirtyma" });
  ck("mapWizardToMesocycle(selectedStyleId='single-siirtyma'): goal=siirtyma",
     forcedSiirt.goal === "siirtyma");
  ck("mapWizardToMesocycle(selectedStyleId='single-siirtyma'): weekCount=3 (natiivipituus)",
     forcedSiirt.weekCount === 3);

  // selectedStyleId="single-palautuminen" → weekCount=2
  const forcedPal = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-palautuminen" });
  ck("mapWizardToMesocycle(selectedStyleId='single-palautuminen'): goal=palautuminen + weekCount=2",
     forcedPal.goal === "palautuminen" && forcedPal.weekCount === 2);

  // selectedStyleId="single-eksentrinen" → goal=eksentrinen, weekCount=4
  const forcedEks = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-eksentrinen" });
  ck("mapWizardToMesocycle(selectedStyleId='single-eksentrinen'): goal=eksentrinen + weekCount=4",
     forcedEks.goal === "eksentrinen" && forcedEks.weekCount === 4);

  // Virheellinen styleId heittää virheen
  let threwError = false;
  try {
    mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "nonexistent-style" });
  } catch (e) {
    threwError = true;
  }
  ck("mapWizardToMesocycle(selectedStyleId='nonexistent'): heittää Error:n",
     threwError === true);

  // ── mapWizardToProgram dispatcher ──
  const dispResult1 = mapWizardToProgram(akseliBase, null);
  ck("mapWizardToProgram: ilman selectedStyleId:tä → käytetään top-1",
     typeof dispResult1.goal === "string" || dispResult1.isMultiBlock);
  ck("mapWizardToProgram: _wizardMeta.styleCandidates = top-3 listä",
     Array.isArray(dispResult1._wizardMeta.styleCandidates) && dispResult1._wizardMeta.styleCandidates.length === 3);
  ck("mapWizardToProgram: jokaisella kandidaatilla styleId, label, confidence, rationale",
     dispResult1._wizardMeta.styleCandidates.every(c =>
       typeof c.styleId === "string" && typeof c.label === "string" &&
       typeof c.confidence === "number" && Array.isArray(c.rationale)));
  ck("mapWizardToProgram: chosenStyleId tallennettu metadataan",
     typeof dispResult1._wizardMeta.chosenStyleId === "string");

  // mapWizardToProgram: pakota single-dup → goal=undulating
  const dispResult2 = mapWizardToProgram(akseliBase, null, { selectedStyleId: "single-dup" });
  ck("mapWizardToProgram(selectedStyleId='single-dup'): goal=undulating",
     dispResult2.goal === "undulating");
  ck("mapWizardToProgram(selectedStyleId): chosenStyleId vastaa pyydettyä",
     dispResult2._wizardMeta.chosenStyleId === "single-dup");

  // mapWizardToProgram: pakota multi-issurin ilman targetDateä → fallback
  const dispResult3 = mapWizardToProgram(akseliBase, null, { selectedStyleId: "multi-issurin" });
  ck("mapWizardToProgram(selectedStyleId='multi-issurin' ilman targetia): fallback single-blokkiin",
     !dispResult3.isMultiBlock);
  ck("mapWizardToProgram(multi-fallback): _wizardMeta.styleFallbackFromMulti=true",
     dispResult3._wizardMeta.styleFallbackFromMulti === true);

  // mapWizardToProgram: kisapäivä + multi-issurin → todellinen multi-blokki
  const targetDate2D = new Date(Date.now() + 98 * 86400000).toISOString().slice(0, 10);
  const akseliWithTarget2D = {
    ...akseliBase,
    answers: { ...akseliBase.answers, q27_targetDate: targetDate2D, q28_targetType: "competition" },
  };
  const dispResult4 = mapWizardToProgram(akseliWithTarget2D, null, { selectedStyleId: "multi-issurin" });
  ck("mapWizardToProgram(multi-issurin + kisapäivä 14 vk): isMultiBlock=true",
     dispResult4.isMultiBlock === true);
  ck("mapWizardToProgram(multi-issurin + kisapäivä): styleCandidates sisältää multi-issurin top-1",
     dispResult4._wizardMeta.styleCandidates[0].styleId === "multi-issurin");

  // ════════════════════════════════════════════════════════════════
  // ─── 2D-β: Klassiset voimanosto-ohjelmat (Wendler/TSB/Madcow) ────
  // ════════════════════════════════════════════════════════════════

  // pickProgramStyle: Wendler — max-tavoite + intermediate+ + kalibroitunut Vara
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "intermediate", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "auto",
      q14_cutting: "no", q25_rpePrecision: "vara_calibrated",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    });
    const wendler = cands.find(c => c.styleId === "single-wendler531");
    ck("pickProgramStyle: max + intermediate + vara_calibrated → Wendler confidence > 50",
       wendler && wendler.confidence > 50);
  }

  // pickProgramStyle: Top-set+Backoff — MEV + lyhyt sessio
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "strength", q23_volumePref: "MEV",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 45 },
    });
    const tsb = cands.find(c => c.styleId === "single-top-set-backoff");
    ck("pickProgramStyle: MEV + lyhyt sessio + advanced + max → top-set-backoff confidence > 60",
       tsb && tsb.confidence > 60);
  }

  // pickProgramStyle: Top-set+Backoff — MRV → matala confidence
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MRV",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 90 },
    });
    const tsb = cands.find(c => c.styleId === "single-top-set-backoff");
    ck("pickProgramStyle: MRV → top-set-backoff confidence pienempi (matala volyymi vs preferenssi)",
       tsb && tsb.confidence < 40);
  }

  // pickProgramStyle: Madcow 5×5 — intermediate top-1 -kandidaatissa
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "intermediate", q12_primaryGoal: "general_strength",
      q29_recentBlock: "off_program", q23_volumePref: "auto",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 75 },
    });
    const madcow = cands.find(c => c.styleId === "single-madcow-5x5");
    ck("pickProgramStyle: intermediate + general_strength + 3pv → Madcow confidence > 55",
       madcow && madcow.confidence > 55);
  }

  // pickProgramStyle: Madcow EI sovellu eliitille (advanced/elite → penalty)
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "elite", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 90 },
    });
    const madcow = cands.find(c => c.styleId === "single-madcow-5x5");
    ck("pickProgramStyle: elite + max_1RM → Madcow confidence < 35 (LP epärealistinen)",
       madcow && madcow.confidence < 35);
  }

  // mapWizardToMesocycle pakottaa Wendler531-goalin
  {
    const wendlerForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-wendler531" });
    ck("mapWizardToMesocycle(selectedStyleId='single-wendler531'): goal=wendler531",
       wendlerForced.goal === "wendler531");
    ck("mapWizardToMesocycle Wendler: weekCount=4 (kanoninen sykli)",
       wendlerForced.weekCount === 4);
  }

  // mapWizardToMesocycle pakottaa Top-set+Backoff-goalin
  {
    const tsbForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-top-set-backoff" });
    ck("mapWizardToMesocycle(selectedStyleId='single-top-set-backoff'): goal=topSetBackoff",
       tsbForced.goal === "topSetBackoff");
  }

  // mapWizardToMesocycle pakottaa Madcow-goalin (5 vk natiivi)
  {
    const madcowForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-madcow-5x5" });
    ck("mapWizardToMesocycle(selectedStyleId='single-madcow-5x5'): goal=madcow5x5",
       madcowForced.goal === "madcow5x5");
    ck("mapWizardToMesocycle Madcow: weekCount=5 (natiivipituus PR-vk5)",
       madcowForced.weekCount === 5);
  }

  // mapWizardToProgram dispatcher: kaikki 3 uutta styleId:tä
  {
    const dispWendler = mapWizardToProgram(akseliBase, null, { selectedStyleId: "single-wendler531" });
    ck("mapWizardToProgram(single-wendler531): goal=wendler531",
       dispWendler.goal === "wendler531");
    ck("mapWizardToProgram(single-wendler531): chosenStyleId tallennettu",
       dispWendler._wizardMeta.chosenStyleId === "single-wendler531");

    const dispTSB = mapWizardToProgram(akseliBase, null, { selectedStyleId: "single-top-set-backoff" });
    ck("mapWizardToProgram(single-top-set-backoff): goal=topSetBackoff",
       dispTSB.goal === "topSetBackoff");

    const dispMadcow = mapWizardToProgram(akseliBase, null, { selectedStyleId: "single-madcow-5x5" });
    ck("mapWizardToProgram(single-madcow-5x5): weekCount=5",
       dispMadcow.weekCount === 5);
  }

  // pickProgramStyle: 11 tyyliä esiintyy (ei duplikaatteja)
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "intermediate", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    });
    const styleIds = cands.map(c => c.styleId);
    const unique = new Set(styleIds);
    ck("pickProgramStyle (2D-γ): 17 tyyliä esiintyy",
       styleIds.length === 17);
    ck("pickProgramStyle (2D-γ): ei duplikaatteja",
       unique.size === styleIds.length);
  }

  // pickProgramStyle: Wendler-rationaali sisältää AMRAP-tarkennuksen kalibroitunut Vara:lle
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "strength", q23_volumePref: "MAV",
      q14_cutting: "no", q25_rpePrecision: "vara_calibrated",
    });
    const wendler = cands.find(c => c.styleId === "single-wendler531");
    ck("pickProgramStyle Wendler: kalibroitunut Vara mainitaan rationale-listässä",
       wendler && wendler.rationale.some(r => r.toLowerCase().includes("kalibr") || r.toLowerCase().includes("amrap")));
  }

  // ════════════════════════════════════════════════════════════════
  // ─── 2D-γ: Edistyneet metodologiat (6 uutta) ────────────────────
  // ════════════════════════════════════════════════════════════════

  // pickProgramStyle: Westside — advanced + max + 4 päivää → korkea confidence
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    });
    const wsbb = cands.find(c => c.styleId === "single-westside-conjugate");
    ck("pickProgramStyle Westside: advanced + max + 4pv → confidence > 50",
       wsbb && wsbb.confidence > 50);
  }

  // pickProgramStyle: Westside ei sovi aloittelijalle
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "beginner", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "off_program", q23_volumePref: "auto",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    });
    const wsbb = cands.find(c => c.styleId === "single-westside-conjugate");
    ck("pickProgramStyle Westside: beginner → confidence < 30",
       wsbb && wsbb.confidence < 30);
  }

  // pickProgramStyle: GZCL J&T 2.0 — advanced + general_strength → top-3
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "general_strength",
      q29_recentBlock: "off_program", q23_volumePref: "MAV",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    });
    const gzcl = cands.find(c => c.styleId === "single-gzcl-jt20");
    ck("pickProgramStyle GZCL J&T 2.0: advanced + general_strength + MAV → confidence > 50",
       gzcl && gzcl.confidence > 50);
  }

  // pickProgramStyle: GZCL kisapäivä < 12 vk → penalty
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no", q27_targetDate: "2026-07-01",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    }, { daysUntilTarget: 35 });
    const gzcl = cands.find(c => c.styleId === "single-gzcl-jt20");
    ck("pickProgramStyle GZCL: kisapäivä < 12 vk → confidence pienempi",
       gzcl && gzcl.confidence < 50);
  }

  // pickProgramStyle: Sheiko — powerlifting + MRV → korkea
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "powerlifting",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MRV",
      q14_cutting: "no", q09_sport: "powerlifting",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 120 },
    });
    const sheiko = cands.find(c => c.styleId === "single-sheiko-derived");
    ck("pickProgramStyle Sheiko: powerlifting + MRV → confidence > 50",
       sheiko && sheiko.confidence > 50);
  }

  // pickProgramStyle: Sheiko streetlifting → penalty
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no", q09_sport: "streetlifting",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    });
    const sheiko = cands.find(c => c.styleId === "single-sheiko-derived");
    ck("pickProgramStyle Sheiko: streetlifting-sport → rationale mainitsee SHEIKO-DERIVED",
       sheiko && sheiko.rationale.some(r => r.toLowerCase().includes("sheiko-derived") || r.toLowerCase().includes("streetlifting")));
  }

  // pickProgramStyle: RP Minimalist — hypertrofia → top-1 -ehdokas
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "intermediate", q12_primaryGoal: "hypertrophy",
      q29_recentBlock: "off_program", q23_volumePref: "MAV",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 60 },
    });
    const rp = cands.find(c => c.styleId === "single-minimalist-rp");
    ck("pickProgramStyle RP Minimalist: hypertrofia → confidence > 50",
       rp && rp.confidence > 50);
  }

  // pickProgramStyle: Smolov Jr — advanced + max → kohtuullinen, mutta beginner-cap
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "strength", q23_volumePref: "MAV",
      q14_cutting: "no",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    });
    const smolov = cands.find(c => c.styleId === "single-smolov-jr");
    ck("pickProgramStyle Smolov Jr: advanced + max → confidence > 20",
       smolov && smolov.confidence > 20);
  }

  // pickProgramStyle: Smolov Jr cut → penalty
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "max_1RM",
      q29_recentBlock: "strength", q23_volumePref: "MAV",
      q14_cutting: "yes", q30_energyBudget: { deficitKcal: 700 },
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    });
    const smolov = cands.find(c => c.styleId === "single-smolov-jr");
    ck("pickProgramStyle Smolov Jr: aggressivinen cut → confidence pienenee",
       smolov && smolov.confidence < 25);
  }

  // pickProgramStyle: Coan-Phillipi — kisapäivä ~10-11 vk → korkea match
  {
    const cands = pickProgramStyle({
      q08_selfLevel: "advanced", q12_primaryGoal: "powerlifting",
      q29_recentBlock: "hypertrophy", q23_volumePref: "MAV",
      q14_cutting: "no", q27_targetDate: "2026-07-28", q28_targetType: "competition",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
    }, { daysUntilTarget: 77 });
    const cp = cands.find(c => c.styleId === "single-coan-phillipi");
    ck("pickProgramStyle Coan-Phillipi: kisa 77 pv + powerlifting → confidence > 50",
       cp && cp.confidence > 50);
  }

  // mapWizardToMesocycle pakottaa 6 uutta goalia
  {
    const wsbbForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-westside-conjugate" });
    ck("mapWizardToMesocycle Westside: goal=westsideConjugate + weekCount=4",
       wsbbForced.goal === "westsideConjugate" && wsbbForced.weekCount === 4);

    const gzclForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-gzcl-jt20" });
    ck("mapWizardToMesocycle GZCL J&T 2.0: goal=gzclJT20 + weekCount=12 (natiivi)",
       gzclForced.goal === "gzclJT20" && gzclForced.weekCount === 12);

    const sheikoForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-sheiko-derived" });
    ck("mapWizardToMesocycle Sheiko-derived: goal=sheikoDerived + weekCount=4",
       sheikoForced.goal === "sheikoDerived" && sheikoForced.weekCount === 4);

    const rpForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-minimalist-rp" });
    ck("mapWizardToMesocycle RP Minimalist: goal=minimalistRP",
       rpForced.goal === "minimalistRP");

    const smolovForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-smolov-jr" });
    ck("mapWizardToMesocycle Smolov Jr: goal=smolovJr + weekCount=4 (3 vk + 1RM-testi)",
       smolovForced.goal === "smolovJr" && smolovForced.weekCount === 4);

    const cpForced = mapWizardToMesocycle(akseliBase, null, { selectedStyleId: "single-coan-phillipi" });
    ck("mapWizardToMesocycle Coan-Phillipi: goal=coanPhillipi + weekCount=11 (10 vk + meet)",
       cpForced.goal === "coanPhillipi" && cpForced.weekCount === 11);
  }

  // mapWizardToProgram dispatcher: kaikki 6 uutta tyyliä reitittyvät oikein
  {
    const dispWSBB = mapWizardToProgram(akseliBase, null, { selectedStyleId: "single-westside-conjugate" });
    ck("mapWizardToProgram(single-westside-conjugate): goal=westsideConjugate",
       dispWSBB.goal === "westsideConjugate");
    const dispGZCL = mapWizardToProgram(akseliBase, null, { selectedStyleId: "single-gzcl-jt20" });
    ck("mapWizardToProgram(single-gzcl-jt20): goal=gzclJT20",
       dispGZCL.goal === "gzclJT20");
    const dispCP = mapWizardToProgram(akseliBase, null, { selectedStyleId: "single-coan-phillipi" });
    ck("mapWizardToProgram(single-coan-phillipi): weekCount=11",
       dispCP.weekCount === 11);
  }

  return report;
}
