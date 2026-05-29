# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täytti osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Ratifioitu Coworkissa 2026-05-29 (leve-handoff-laadinta-skill, §5b runtime-first). Aja H-010-pushin jälkeen. Aloita §8 + Selkäranka 1–2 ENNEN muutoksia.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-011` (P1b — SP-1 datavirta AI-pakettiin) |
| Tyyppi | `debug` (confirm-then-fix; **runtime-/datariippuvainen → A1 = LAAJA sweep**, skill §5b) |
| Laadittu | 2026-05-29 / Cowork-sessio (ratifioitu) |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssiin | M1-pohja-puhtaus (SP-1) · **suoraan mullistava-relevantti** (visio: AI hyödyntää kaikkea dataa). EI siirrä NYT-merkkiä (vaihe 18). |
| Pohja-HEAD | `701bd7b` (post-H-010-push) · APP_VERSION `4.52.18` → bumpataan (koskettaa engine.js:ää) |

**Tyyppiperuste:** mekanismi riippuu ajonaikaisesta tilasta (mitä storea/kenttää/ikkunaa aggregaatio lukee Akselin datalla) → **A1 ei ole kapea staattinen hypoteesi vaan laaja per-metriikka runtime-sweep** (skill §5b). Confirm-then-fix.

---

## 1. Tavoite

AI Block Tuning -paketti hyödyntää **KAIKKEA kirjattua dataa** joka on olemassa prev-block-ikkunassa — ei raportoi "ei havaintoja" kun dataa tosiasiassa on. Verifioitu oire (OBS-008): foundation-ikkunassa (30.4.–13.5.) on **43 bodyweight-mittausta + 11 velocity-settiä**, mutta paketti raportoi e1RM-trendit / velocity / MPV / bodyweight kaikki "empty". Tämä on **SP-1:n ydin ja suoraan visiosi unlock** ("AI optimoi reflektiivisesti kaikella datalla"): eliittimallit ovat jo koodissa, mutta paketti ajaa tyhjällä syötteellä.

## 2. Acceptance criteria

> Mittari-ensin (Selkäranka 6). A1 on **STOP-gate** + **laaja sweep** (skill §5b), ei kapean hypoteesin testi.

- **A1 — LAAJA runtime-sweep (read-only, STOP-gate).** Aja `generateBlockTuningPackage` Akselin **backup-datalla** (foundation-ikkuna — 2026-05-29-backup KATTAA sen, huhti–touko). Dumppaa **per metriikka** (e1RM-trends, velocity, MPV, bodyweight): kuinka monta datapistettä **EXISTOI** relevantissa storessa+ikkunassa (sessions / sets / **measurements**) vs kuinka monta paketin filtteri/kenttä-luku **KAAPPAA**. Gap-per-metriikka paljastaa minkä storen/kentän/filtterin luku tiputtaa datan. **STOP + raportoi gap-taulukko ennen korjausta.**
  - *Tunnetut epäilyt (lokalisoitu, EI lukittu — vahvista sweepillä):* (a) **bodyweight** on `measurements`-storessa (50 kpl), mutta `generateBlockTuningPackage` (engine.js:7008 `prevBlockSessions`) katsoo vain sessioita → ei lue measurements-storea? (b) **velocity/MPV**: `velocityMs` 0/332, data `velocityMean`/`mvReps`-kentissä (OBS-009); (c) **e1RM-trends** (7073): "ei kisaliike-settejä ≥ 2 datapointilla" — filtteri liian kapea (setRole/movementId)?
- **A2 — Korjaa per vahvistettu gap (vasta A1:n jälkeen).** Aggregoi kukin metriikka oikeasta storesta/kentästä/ikkunasta: bodyweight `measurements`-storesta, velocity `velocityMean`/`mvReps`:stä, e1RM-trendit oikeasta kisaliike-setti-joukosta. Älä korjaa ennen A1-gap-vahvistusta.
- **A3 — Verifiointi Akselin datalla (known-pos).** Korjattu paketti raportoi foundation-ikkunan **43 bw + 11 velocity** (ei "ei havaintoja"). Aritmetiikka: dumppaa korjatut trend-arvot vs raaka data.
- **A4 — Regressio.** `recommend()`-**kuormalaskenta muuttumaton** → pilot bittitarkka (138-flagi-baseline ennallaan). Paketti-**output rikastuu** (ei bittitarkka paketille — tarkoitettu); verifioi: (i) pilot-loads bittitarkka, (ii) paketti-rikastus oikein, (iii) identity-gate 0 flagia ennallaan.
- **A5 — Gate.** Stop hook 5/5 · selain-testit · A3-known-pos · APP_VERSION-bump (koskettaa engine.js) · osio 7.

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** ei muuta VL-cap/deload/tier/e1RM-kaavoja eikä `recommend()`-kuormalaskentaa — vain paketin **syöte-aggregaatio** rikastuu.
- **Mitä EI kosketa (test-riippuvuus-verifioitava):**
  - `recommend()` / kuormalaskenta (vain generateBlockTuningPackage + generateGenericBlockTuningPackage aggregaatio).
  - Data-flow-presence **detektori-assertio** (institutionalisointi) → erillinen **H-012** (kuten H-009 oli H-008:lle). Tämä handoff korjaa juuren; detektori erikseen.
  - Kyykky +102 / dippi-fideliteetti (OBS-020) → P2.
  - HRV (Akseli ei käytä Ouraa → "empty" on HRV:lle oikein; älä pakota).
- **Tekniset:** vanilla JS, ES-modulit, ei uusia riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** HEAD `701bd7b`, main, puhdas. `git branch backup-pre-h011-701bd7b`. A1 read-only → ankkuri ennen A2:ta.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (tyyppi `debug`).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (älä re-litigoi):**
- **Fix ennen detektoria:** H-011 korjaa onton paketin (juuri); data-flow-presence-detektori-assertio = H-012 (sama kaava kuin H-008→H-009).
- **Runtime-first A1 (skill §5b):** ontto-paketti-mekanismi on datariippuvainen → laaja per-metriikka existing-vs-captured -sweep, ei kapea staattinen hypoteesi (H-008-oppi: staattinen = oikea perhe, väärä mekanismi).
- **HRV jätetään "empty":ksi** (Akseli ei käytä Ouraa — oikein).

**Hylätyt vaihtoehdot:**
- *Korjaa vain bodyweight* (ilmeisin) — A1-sweep voi paljastaa useamman gapin (velocity-kenttä, e1RM-filtteri); älä oleta yhtä.
- *Korjaus ennen A1-gap-vahvistusta* (Selkäranka 5–6).

**Konteksti (verifioitu Akselin backupista):** foundation-ikkuna 43 bw-mittausta + 11 velocity-settiä; paketti raportoi kaikki "empty". `velocityMs` 0/332 (data velocityMean/mvReps). Bodyweight measurements-storessa (50 kpl), ei seteissä. Tämä on M1→mullistava-kuilun ydin: "eliittitiede paperilla, inertti käytännössä".

## 6. Avoimet kysymykset (Code kysyy ENNEN toteutusta)

1. **A1-datalähde:** Akselin 2026-05-29-backup KATTAA foundation-ikkunan (huhti–touko) → käytä sitä A1-sweepiin (ei tarvita uutta exportia). Vahvista että backup on saatavilla Code-sessiolle, vai toimittaako Akseli.
2. **Bodyweight-lähde paketissa:** lukeeko generateBlockTuningPackage `measurements`-storea lainkaan, vai vain sessioita/settejä? (A1 paljastaa; ohjaa A2:n laajuuden.)
3. **Paketti-output ei bittitarkka (A4):** miten verifioidaan että rikastus on *oikein* eikä riko mitään — vertaa korjatut trend-arvot raakaan dataan + varmista recommend()-loads ennallaan.

---

## 7. Session-tulos *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-29 |
| A1-gap-taulukko | **2 juurisyytä, vahvistettu Akselin backupista (foundation vk1-3):** (1) **set.movementName puuttuu (0/332)** — setit kantavat movementId (UUID), paketin e1RM-trend-filtteri `set.movementName === liftName` (7052) + slot-nimet → **107 kisaliike-settiä** (leuka 28 + dippi 32 + kyykky 47) raportoitu "empty". (2) **bodyweight `m.bodyweightKg` vs `m.value`** — paketti luki olematonta kenttää (7091), data type="bodyweight"/value → **44 mittausta** "empty". **MPV: 0 measurements → empty OIKEIN** (ei gap, Akseli ei kirjaa MPV). velocity-slots: velocityMean-fallback (7037) toimi, mutta slot.movementName=undefined → nimettömät. |
| Muuttuneet tiedostot | `engine.js` (JS1 _movName-resoluutio 3 funktiota: generateBlockTuningPackage + Generic + EndOfCycle, slots + e1RM-trend-filtteri; JS2 bodyweight-kanoninen-kuvio 3 paikkaa ml. computePeakingDecisionTreeCard; +51/-15), `index.html` (ctx.movements 2 kutsua + APP_VERSION meta), `sw.js` (APP_VERSION 4.52.18→4.52.19). Commit: `e151863`. |
| Tehdyt päätökset | **JS1:** idToName-map (ctx.movements UI:lta) → `_movName(set) = set.movementName ?? idToName[set.movementId]` (graceful fallback). Resolvoi slots + e1RM-trend-filtteri 3 paketti-funktiossa. **JS2:** kanoninen `m.type === "bodyweight" && m.value` (sama kuin H-007 m.hrv). Halpa-sweep löysi 3. bodyweight-luvun (7091, 8063, **2719 computePeakingDecisionTreeCard vk14-kortti**) → korjattu kaikki kanoniseen kuvioon (Akselin lupa). **MPV jätetty empty** (oikein). MPV-luvut (7090/8062/2715) koskemattomat. |
| Validointi | **Stop hook PASS:** smoke T8 ✅ + pilot **64/64, 0 virhettä, 138 audit-flagia (🐛 84, ⚠️ 6, 💬 0, 📋 48) — BITTITARKKA H-010-baseline** (recommend()-loads muuttumaton, vain paketti-aggregaatio). **identity-gate 0 flagia.** **A3 known-pos** (Akselin backup): paketti raportoi nyt **48 bw** (91→89 kg) + **3 e1RM-trendiä** (leuka +4.1%, dippi +1.1%, kyykky −2.5%, 12 datapistettä kukin) + **249/260 nimettyä slottia** (oli 0) — ei "ei havaintoja". **?test=1: 742/745 ennallaan** (block-tuning-testit eivät rikkoutuneet; 3 pre-existing VBT×2 + T9 SAFE). spec→koodi-diff scope-aidan sisällä. |
| Jäi auki | **H-012** data-flow-presence-detektori (institutionalisointi, sama kaava kuin H-008→H-009). MU e1RM-trend puuttuu (0 MU-settiä — oikein, ei dataa). **Push odottaa erillistä lupaa** (H-010 jo pushattu erikseen; H-011 omana). |
| Seuraava askel | Akseli ratifioi push origin/main (`e151863` + sulku). Puhelinverifiointi: SW 4.52.19 → AI-Block-Tuning-paketti vk4/5 deload → bodyweight-trendi + e1RM-trendit + nimetyt slotit näkyvät (ei "ei havaintoja"). Sitten **H-012** (detektori) / **P2** (kyykky+dippi OBS-020). NYT-merkki säilyy vaihe 18. |

---

**H-011/P1b-arc commit-ketju:**

| Commit | Kuvaus |
| --- | --- |
| `e151863` | fix(H-011-P1b): AI Block Tuning datavirta — movementName-resoluutio + bodyweight-kenttä (APP_VERSION 4.52.19) |
| *(sulku)* | docs(H-011): §7 + arkistointi + ROADMAP-tilannekuva |

Peruutusankkuri: `git reset --hard backup-pre-h011-701bd7b` (säilyy). Off-repo-diagnostiikka: `C:\Users\aksel\leve-test-runner\h011-sweep.mjs` (A1-gap-todiste, ei repossa).
