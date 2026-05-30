# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täytti osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Ratifioitu Coworkissa 2026-05-30 (leve-handoff-laadinta-skill §5b). Aloita §8 + Selkäranka 1–2 ENNEN muutoksia. A1 on STOP-gate — raportoi view/real-verdikti ennen A2:ta.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-013` (OBS-007/004 — AI-block-tuning-completion VALMIS-1 prioriteetti-1) |
| Tyyppi | `debug` (confirm-then-fix; **runtime-/datariippuvainen → A1 = LAAJA sweep**, skill §5b) |
| Laadittu | 2026-05-30 / Cowork-sessio (ratifioitu) |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssiin | M1-pohja-puhtaus / ohjelma-oikeellisuus (VALMIS-1). EI siirrä NYT-merkkiä (vaihe 18). |
| Pohja-HEAD | `336b958` · APP_VERSION `4.52.19` → bump jos tuotantokoodi muuttuu |

---

## 1. Tavoite

Näytetty kuorma etenee nousevan %:n mukana, ja otsikon @X % vastaa todellista kuormaa (@X % ≡ kuorma/e1RM). Haluttu lopputila: kisaliike saa **progressiivisen ylikuorman** strength-blokin yli. Verifioitu oire (kuva 30.5., tuotanto 4.52.19, Sykli 14 pv): **kyykky vk6 @78 % = vk7 @82 % = ~151 kg** (identtinen); leuka 62/62, dippi 71/71 — kuorma ei seuraa %:a. *Aritmetiikka: 151 @78 % ⟹ e1RM 194; 151 @82 % ⟹ e1RM 184 → sama kuorma kahdella %:lla = % irti kuormasta.*

## 2. Acceptance criteria

> A1 on **STOP-gate** + **laaja sweep** (skill §5b). Mittari-ensin (Selkäranka 6).

- **A1 — LAAJA runtime-sweep (read-only, STOP-gate).** Dumppaa kisaliikkeille (Takakyykky, Lisäpainoleuanveto, Lisäpainodippi) × viikko (vk5–7) **kahdesta polusta**:
  - **(i) 14 pv -projektio-näkymä** (`getFutureWorkouts` index.html:5142/7788; renderöinti ~8212+) — mistä se johtaa per-päivä-kuorman; soveltaako se viikon %:a e1RM:ään?
  - **(ii) todellinen `recommend()`** per-päivä (vk6/vk7 kyykky) — mikä kuorma siellä?
  Per solu: **(e1RM käytetty, viikon %, näytetty kuorma)**. **RATKAISE: onko flat-load vain 14 pv -projektiossa (i) vai myös recommend():ssä (ii)?** — määrää akuuttiuden (view-only = harhaanjohtava mutta treeni etenee; molemmat = aito ei-progressio). + **mistä % decouplaa kuormasta** (eri laskentapolku, kuten H-008:n päivä-resoluutio). **STOP + raportoi sweep-taulukko + view/real-verdikti ennen korjausta.**
- **A2 — Korjaa (vasta A1:n jälkeen).** Korjaa se polku (tai polut) jossa flat-load esiintyy niin että **näytetty kuorma etenee monotonisesti nousevan %:n mukana** ja **@X % ≡ kuorma/e1RM**. Jos useita e1RM/load-polkuja eriparistuu → yksi totuuslähde (kuten H-010 teki päivä-resoluutiolle).
- **A3 — Known-pos/neg.** Known-pos: nykyinen kyykky vk6=vk7=151 → korjattuna **etenee** (esim. 78 %→82 % ⟹ ~151→~158). Known-neg: liike jolla % ei nouse → kuorma ei muutu. Aritmetiikka käsin.
- **A4 — Regressio.** recommend()-kuormalaskenta säilyy bittitarkkana niiltä osin kuin A1 osoittaa sen oikeaksi (pilot 138-baseline); jos korjaus koskee recommend():ä → odotettu muutos eksplisiittisesti (vain progressio-korjaus). Identity-gate 0.
- **A5 — Gate.** Stop hook 5/5 · selain-testit · APP_VERSION-bump jos tuotantokoodi (index.html/engine.js) · osio 7. **Puhelinverifiointi:** Sykli 14 pv → kyykky vk6 < vk7 (etenee).

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** e1RM-kaavat ennallaan — korjaus koskee **%:n soveltamista kuormaan / näyttöä**, ei e1RM-laskentaa eikä VL-cap/deload/tier-invariantteja.
- **Mitä EI kosketa (test-riippuvuus-verifioitava):**
  - e1RM-laskenta itse (computeMovementE1RM*, e1rmSystem) — vain %→kuorma-polku.
  - OBS-021 (paketin ikkuna-aukko), OBS-018, OBS-010, H-012 → erilliset (completion-spec §1).
  - Identity-gate (H-010), data-flow (H-011) — ennallaan.
- **Tekniset:** vanilla JS, ES-modulit, ei uusia riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** HEAD `336b958`, main, puhdas. `git branch backup-pre-h013-336b958`. A1 read-only → ankkuri ennen A2:ta.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (tyyppi `debug`).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (älä re-litigoi):**
- **VALMIS-1 prioriteetti-1** (completion-spec): progressio on lattia jolle eliittikerros (VALMIS-2/M2) rakentuu — korjataan ensin. (Rehellisesti: tämä EI ole "mullistava" vaan sen edellytys.)
- **Runtime-first A1 (§5b):** flat-load-mekanismi datariippuvainen (eri laskentapolut) → laaja sweep, ei kapea staattinen hypoteesi.
- **View-only vs real -erottelu pakollinen** ennen korjausta (akuuttius + scope riippuu siitä).

**Hylätyt vaihtoehdot:**
- *Oletus että flat-load on aito ei-progressio* — A1 voi paljastaa sen olevan vain 14 pv -projektio-näkymän artefakti (recommend() etenee oikein). Älä oleta.
- *Korjaus ennen A1-view/real-verdiktiä* (Selkäranka 5–6).

**Konteksti:** havaittu Sykli 14 pv -näkymässä (4.52.19). Cowork lokalisoi pinnan: useita e1RM/load-polkuja (recommend, getFutureWorkouts, renderPerLiftAutoregStatus index.html:8235) — sama "monta totuuslähdettä" -riski kuin H-008:n päivä-resoluutiossa. recommend() käyttää tuoretta e1RM:ää (vk6 kyykky 151 ⟹ ~194), joten e1RM ei ole liian matala — kyse on %:n soveltamisesta/projektiosta.

## 6. Avoimet kysymykset (Code kysyy ENNEN toteutusta)

1. **View-only vs real:** A1:n ensisijainen tulos — onko flat-load vain 14 pv -projektiossa vai myös recommend():ssä? Ohjaa A2:n scopen + akuuttiuden.
2. **Yksi totuuslähde:** jos useita load-polkuja eriparistuu, kannattaako %→kuorma keskittää yhteen funktioon (kuten H-010 getTodayPlan)?
3. **A1-datalähde:** Akselin backup/live — vk5–7 kyykky/leuka/dippi.

---

## 7. Session-tulos *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-30 |
| A1-sweep + view/real-verdikti | **Flat-load AITO MOLEMMISSA poluissa** (ei view-only-artefakti). Sweep (Akselin backup, vk5-7): kaikki kisaliikkeet 4×4 V2 → maxReps=6 → **vReps% = 83.3% AINA** (loadPct 75/78/82% EI vaikuta tier 1/2/3:lla). (i) Sykli 14pv: kyykky **151/151/151**, leuka 62/62/62, dippi 71/71/71 (täysin flat). (ii) recommend(): kyykky **157.5/157.5/157.5** (flat); leuka/dippi pientä vaihtelua (progression-anchor), ei monotonista @%-mukaista. **% decouplaa:** tier-override (usedVReps) korvaa slot.loadPct:n vRepsToExpectedPct(reps+vx):llä; otsikon @X% (day.label-string data.js) ei käytetä kuormaan. |
| Muuttuneet tiedostot | `index.html` (honestifyLoadLabel-helper rivi 1674 + 3 sovellusta: Sykli 14pv 8106, cv-day 7975, renderWeekPlanDays 8244 + APP_VERSION meta), `sw.js` (APP_VERSION 4.52.19→4.52.20). Commit: `8edb426`. |
| Tehdyt päätökset | **Suunta C (Akseli ratifioinut): rehellinen otsikko, ei kuorma-muutosta.** honestifyLoadLabel korvaa day-label @X%:n todellisella vReps-%:lla (@~83%) tier 1/2/3 -liikkeille → @X% ≡ kuorma/e1RM. **EI yksi-totuuslähde-refaktoria** (B-progressio = OBS-022/M2). Kattavuus: 3 sykli-näkymä-polkua (Sykli/14pv + cv-day + viikkoplan). Workout-näkymä ei näytä @%-day-labelia (kuorma-pohjainen). Paketti-@% = OBS-021 (scope-aita). |
| Validointi | **Stop hook PASS:** smoke ✅ + pilot **64/64, 0 virhettä, 138 audit-flagia (🐛 84, ⚠️ 6, 💬 0, 📋 48) — BITTITARKKA** (engine.js/recommend() koskematon → kuormat ennallaan, vain label). **A3 known-pos:** "TI — Kyykky 4×4 @78%" → "@~83 %"; vk5/6/7 kaikki @~83% (rehellinen flat). **?test=1: 741/745 = baseline** (git stash -vertailu HEAD 336b958: sama 741/745 puhtaalla → 4 failia VBT×3 + T9 SAFE **pre-existing flaky**, 0 uutta). spec→koodi-diff scope-aidan sisällä (label-only). |
| Jäi auki | **B-progressio (todellinen %-nouseva ylikuorma)** = OBS-022/VALMIS-2/M2 (rep-scheme/vx-redesign tai loadPct→kuorma-ohjaus). **Paketti-@%** (AI-Block-Tuning prescribed) = OBS-021. **Push odottaa erillistä lupaa.** |
| Seuraava askel | Akseli ratifioi push (`8edb426` + sulku). **Puhelinverifiointi:** Sykli 14 pv → kyykky vk5/6/7 otsikko @~83% (ei enää @75/78/82% joka valehteli) — otsikko ≡ kuorma. Sitten **OBS-021** (paketti) / **H-012** (presence-detektori) / **OBS-022 M2** (todellinen progressio). NYT-merkki säilyy vaihe 18. |

---

**H-013-arc commit-ketju:**

| Commit | Kuvaus |
| --- | --- |
| `8edb426` | fix(H-013-OBS-007): day-label @X% rehellistys (suunta C, APP_VERSION 4.52.20) |
| *(sulku)* | docs(H-013): §7 + A1-sweep-verdikti + arkistointi + ROADMAP |

Peruutusankkuri: `git reset --hard backup-pre-h013-336b958` (säilyy). Off-repo-diagnostiikka: `C:\Users\aksel\leve-test-runner\h013-sweep.mjs` (A1-flat-load-todiste, ei repossa).
