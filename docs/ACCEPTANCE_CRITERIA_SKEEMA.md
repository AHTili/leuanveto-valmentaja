# Acceptance criteria — skeema ja vakiomalli

> **Tarkoitus (vaihe 2):** Jokainen aukko, korjaus tai uusi ominaisuus muotoillaan **testattaviksi kriteereiksi** (A1, A2, A3, …) ennen kuin /goal-kierros käynnistyy. Tämä on Stop hookin lukko: /goal ei valmistu jos AC-testit eivät passaa.
>
> **Erona vapaalle kuvaukselle:** AC on **konkreettinen, mitattava, koodista verifioitavissa**. "Engine säätää kuormaa paremmin" ei kelpaa. "Engine palauttaa `learnedVlCap.strength` joka on aina ∈ [0,15; 0,20]" kelpaa.

---

## Skeema

Jokainen /goal-kierroksen AC-tiedosto noudattaa rakennetta:

```
docs/AC_<feature>.md

# Acceptance criteria — <feature>

## Konteksti
<1-2 lausetta mitä tehdään ja miksi>

## Tutkimusinvariantit joita kunnioitetaan
<viittaa docs/TUTKIMUS_INVARIANTIT.md riviin/riveihin>

## A1: <selkeä testattava ehto>
- **Mitattu miten:** <konkreettinen testi tai trace-kysely>
- **Onnistumisen ehto:** <numeerinen tai boolean tarkkuus>
- **Lähde:** <koodi-tiedosto + rivi tai tutkimusinvariantti>

## A2: ...
## A3: ...

## Vahvistus-kysely
<komento joka ajaa testit, tuottaa pass/fail>

## Mihin /goal:iin tämä mappautuu
<viittaus moduuliin / vaiheeseen>
```

---

## Vakiosäännöt

1. **Yksi AC = yksi testattava ehto.** Älä yhdistä "engine säätää kuormaa OIKEIN ja ei kaada smoke-testiä". Erikseen: A1 (säätö invariantin sisällä), A2 (smoke-test passaa).

2. **Numeroi sekvenssinä A1, A2, A3 …** Ei alaerikoismerkintöjä (A1.1, A1.2).

3. **Mittaus konkreettinen:** komento joka tuottaa pass/fail, ei subjektiivinen arvio.

4. **Tutkimusinvariantti-viittaus pakollinen** kun AC koskettaa engine-laskentaa. Viittaa [`docs/TUTKIMUS_INVARIANTIT.md`](TUTKIMUS_INVARIANTIT.md) riviin ja statukseen (VERIFIOITU/DOKUMENTOITU).

5. **Stop hook täytyy passa** jokaisen AC:n yhteydessä (älä eksplisiittisesti listaa — se on vakio).

---

## Esimerkki: 8a-implementoinnin A1–A5 (kun α/β-tulokset palaavat)

Tämä on **luonnos-esimerkki** siitä, miltä 8a-implementoinnin AC-tiedosto näyttäisi β:n palauttua. **Ei aktivoitu** — täytetään kun tutkimustulokset palautuvat.

### Konteksti
8a-implementointi lisää oppivan parametrivektorin (`learnedVlCap.strength`, `learnedRtfSlope`, ...) engine.js:ään β-tutkimuksen tuottaman mallinnusarkkitehtuurin mukaisesti.

### Tutkimusinvariantit joita kunnioitetaan
- [TUTKIMUS_INVARIANTIT.md osio A](TUTKIMUS_INVARIANTIT.md#a--velocity-loss-cap-per-blokki-vl-cap): VL-cap-rangit per blokki
- Osio B: Rep1 MPV slope ~0,045 m/s / RIR
- Osio D: Latella tier-progression elite ≤ 0,05 ×/vk

### A1: learnedVlCap.strength pysyy aina ∈ [0,15; 0,20]
- **Mitattu miten:** `node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w` — audit-engine.mjs emittoi `INVARIANT_VIOLATION`-flagin jos arvo karkaa
- **Onnistumisen ehto:** 0 INVARIANT_VIOLATION-flagia 148 session yli
- **Lähde:** TUTKIMUS_INVARIANTIT.md A, Pareja-Blanco 2017 VERIFIOITU

### A2: Posterior-CI näkyy trace:ssä jokaiselle opittavalle parametrille
- **Mitattu miten:** smoke-test verifioi että rec.suggestionContext sisältää `learnedParamsCI`-objektin jossa per-parametri CI ∈ [0,1)
- **Onnistumisen ehto:** smoke-test PASS
- **Lähde:** β C3 (tulos), engine.js suggestionContext

### A3: Akselin pilot-regressio tuottaa identtiset arvot baseline:n kanssa nykytilassa (n < 50 sessiota)
- **Mitattu miten:** `run-pilot.mjs --profile=akseli-elite-streetlifter` vertaa baseline-snapshotia
- **Onnistumisen ehto:** 0 ERROR, kuorma-arvot bittitarkasti identtiset
- **Lähde:** β C2 (data-vaatimus n ≥ 50), tools/engine-pilot/lib/audit-baselines.mjs

### A4: Posterior-clamping aktivoituu kun arvo ylittäisi priori-rajan
- **Mitattu miten:** edge-case-testi (uusi tarvitaan, ENG-15 backlog) simuloi ekstreemi-input-sekvenssin jossa naive learning ylittäisi rajan
- **Onnistumisen ehto:** engine emittoi `LEARNED_PARAM_CLAMPED`-tracen + clamppaa arvon takaisin
- **Lähde:** CLAUDE.md osio 2, sääntö 3

### A5: Stop hook -ketju passaa
- **Mitattu miten:** `.claude/settings.json` Stop hook ajaa smoke + Akseli pilot
- **Onnistumisen ehto:** molemmat exit 0
- **Lähde:** .claude/settings.json

### Vahvistus-kysely
```bash
node tools/engine-pilot/lib/smoke-test.mjs
node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w
node tools/engine-pilot/run-pilot.mjs --profile=beginner-male-60
# + selain-testit ?test=1 manuaalisesti
```

### Mihin /goal:iin tämä mappautuu
/goal: 8a-implementointi (yksi /goal per moduuli; 8a = oppiva malli, 8b = liikevalintamoottori — erilliset)

---

## Käyttöjärjestys α/β-tulosten saavuttua

1. **Lue tutkimustulos** (α tai β)
2. **Luonnostele AC-tiedosto** (`docs/AC_<feature>.md`)
3. **Tarkista invariantti-viittaukset** — onko TUTKIMUS_INVARIANTIT.md:ssä rivit jotka AC kunnioittaa? Jos ei, lisää sinne ensin.
4. **Käynnistä /goal** AC-tiedostolla
5. **Stop hook + AC-testi** muodostavat lukon — /goal ei valmistu ennen kuin molemmat passaavat

---

## Backlog-AC:t (täytetään kun α/β-tulokset palaavat)

| Tehtävä | AC-tiedosto | Tila |
|---|---|---|
| ENG-1 CFG_DRIFT-persistointi | `docs/AC_ENG_1_cfg_drift_persist.md` | EI ALOITETTU |
| ENG-2 AGGRESSIVENESS_LEARNED_UPDATED-trace | `docs/AC_ENG_2_aggressiveness_trace.md` | EI ALOITETTU |
| ENG-3 Modified-vammat → modifikaatiot | `docs/AC_ENG_3_modified_injuries.md` | RIIPPUU α:sta |
| ENG-4 Online-oppimismalli | `docs/AC_ENG_4_online_learning.md` | RIIPPUU β:sta |
| ENG-5 FFM-mallinnus | `docs/AC_ENG_5_ffm.md` | RIIPPUU β C5:n vastauksesta |
| ENG-6 CI-propagointi UI:hin | `docs/AC_ENG_6_uncertainty_ui.md` | RIIPPUU β:sta |
| ENG-7 Käyttäjäkohtainen parametrivektori IDB | `docs/AC_ENG_7_learned_params_db.md` | RIIPPUU β C6:sta |
| ENG-8 Datavuo + RPE-kenttä | `docs/AC_ENG_8_data_flow.md` | RIIPPUU β:sta |
| ENG-9 PRESET_MOVEMENTS-tietomallin laajennus | `docs/AC_ENG_9_movement_metadata.md` | RIIPPUU α:sta |
| ENG-10 pickPrimaries → attribuuttimoottori | `docs/AC_ENG_10_selection_engine.md` | RIIPPUU α:sta |
| ENG-11 Wizard-heikkokohta | `docs/AC_ENG_11_wizard_weakpoint.md` | RIIPPUU α:sta |
| ENG-12 Factory-eriyttäminen | `docs/AC_ENG_12_factory_dispatch.md` | RIIPPUU α C3:n vastauksesta |
| ENG-13 Antagonisti-attribuutti + symmetria | `docs/AC_ENG_13_antagonist.md` | RIIPPUU α:sta |
| ENG-14 audit-engine.mjs INVARIANT_VIOLATION | `docs/AC_ENG_14_invariant_audit.md` | INSINÖÖRITYÖ (voidaan aloittaa nyt) |
| ENG-15 Edge-case-generator | `docs/AC_ENG_15_edge_case_gen.md` | INSINÖÖRITYÖ (voidaan aloittaa nyt) |
