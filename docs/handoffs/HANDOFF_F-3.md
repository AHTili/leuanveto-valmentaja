# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Laadittu 2026-05-31 (value-resolution-audit F-3). e1RM-source-of-truth-konsolidointi. Lähde: `docs/VALUE_RESOLUTION_AUDIT.md` §F-3. A1 = READ-ONLY confirm ENNEN mahdollista fixiä (confirm-then-fix).*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `F-3` (e1RM-persistenssi / source-of-truth-konsolidointi; value-resolution-audit) |
| Tyyppi | `debug` (confirm-then-fix; A1 read-only ENNEN fixiä) |
| Laadittu | 2026-05-31 / value-resolution-audit |
| Tila | `VALMIS (audit-confirmed segregated, 2026-05-31)` |
| Liittyy R-sekvenssin vaiheeseen | Value-resolution-audit -sulku (F-3). **EI siirrä NYT-merkkiä** (vaihe 18). |
| Pohja-HEAD | `4e1ee11` · APP_VERSION `4.52.29` |

---

## 1. Tavoite

Yksi e1RM-totuuslähde liikettä kohti: persistenssistoret (`MovementProgress.currentE1RM`, `movementCfg.e1rmExternal`, `peakingConfig.e1rmExternal`) eivät tuota käyttäjälle näkyvää/käytettävää arvoa joka erkanee kanonisesta (`computeMovementE1RMBest` UI / `currentE1RMSystem` recommend). Haluttu lopputila: vahvistettu segregaatio (tai konsolidointi jos aito divergenssi löytyy).

## 2. Acceptance criteria

> Tyyppi `debug`: A1 = read-only confirm (mitkä storet luetaan minne; aito vs vestigiaali divergenssi). A2 = fix VAIN jos A1 paljastaa aidon käyttäjä-näkyvän divergenssin. Invariantit `CLAUDE.md` §2 ennallaan.

- **A1 — CONFIRM (READ-ONLY, STOP-gate).** Enumeroi jokaisen e1RM-storen luku- ja kirjoituspolut. Vahvista per store: onko se (a) kanoninen, (b) tarkoitus-segregoitu eri käyttöön (stagnaatio/historia/lattia/fallback), vai (c) aito käyttäjä-näkyvä divergenssi kanonisesta. **STOP + raportoi. ÄLÄ korjaa.**
- **A2 — FIX (vain jos A1 löytää aidon divergenssin, luvan jälkeen).** Reititä divergoiva luku kanoniseen lähteeseen TAI synkronoi store. Minimaalinen scope.
- **A3 — UUSI BASELINE (jos A2 muuttaa kuormia).** Per-solu-diff + ratifiointi. Jos A2 = vain doc/invariantti → ei baseline-muutosta.
- **A4 — Regressio + invariantti.** Dokumentoi invariantti: kanoninen e1RM VAIN `computeMovementE1RMBest`/`currentE1RMSystem`:stä; `MovementProgress.currentE1RM` ei koskaan näyttöön/kuormaan. Selain-testit + pilot ennallaan.

## 3. Reunaehdot ja scope-aita

- **EI kosketa:** recommend()-e1RM-ketju (cal→primer→plan→VBT-cap→floor → `currentE1RMSystem`) ennallaan. `computeMovementE1RMBest`-logiikka ennallaan. Accessory-progression-malli (`lastLoadKg`+Vx) ennallaan (legitiimisti eri-liike-apuliikkeille). F-1 (jo korjattu) ei re-litigoida.
- **Muutosalue (jos A2):** divergoivan luku-polun reititys kanoniseen, TAI store-synkronointi. + dokumentaatio-invariantti.
- **PRE-FLIGHT + ankkuri:** HEAD `4e1ee11`, ankkuri `backup-pre-F3-4e1ee11`. A1 read-only.

## 4. Atletti-vastaukset

Ei sovellu (`debug`).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

- **F-3 priorisoitu ennen F-2:ta** (Akseli 2026-05-31): sulkee F-1:n taustasyyn rakenteellisesti; F-2:n a/b/c-valmennuspäätös vasta F-3:n jälkeen.
- **Lähde:** `docs/VALUE_RESOLUTION_AUDIT.md` §F-3 (audit kehysti laajaksi konsolidoinniksi; A1 tarkentaa todellisen laajuuden).

## 6. Avoimet kysymykset (A1 vastaa READ-ONLY)

1. Onko jokin e1RM-store luettu **käyttäjä-näkyvään** arvoon (näyttö tai kuorma) divergoiden kanonisesta — F-1:n (jo korjattu) lisäksi?
2. Jos kaikki muut ovat tarkoitus-segregoituja (stagnaatio/historia/lattia/fallback) → riittääkö **vahvistus + invariantti-dokumentaatio** (ei koodimuutosta), vai onko pieni kovennus tarpeen?

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-31 |
| Muuttuneet tiedostot | `CLAUDE.md` (arvo-resoluutio-invariantti §1) · `docs/VALUE_RESOLUTION_AUDIT.md` (§0 invariantti + F-3 RATKAISTU) · `test-runner.js` (`testKotiEqualsLiveAccessory`). **EI** engine/data/index/sw — ei runtime-muutosta. |
| Tehdyt päätökset | **F-3 audit-confirmed segregated.** A1: e1RM-storet tarkoitus-segregoituja (ei laajaa konsolidointia; audit yli-kehysti). `MovementProgress.currentE1RM`=stagnaatio/historia, `movementCfg`=cross-ref-lattia, `peakingConfig`=fallback; kanoninen näyttö/kuorma = `computeMovementE1RMBest`/`currentE1RMSystem`. A2: invariantti (CLAUDE.md + audit-doc) + Koti=live-assertio (test-runner.js, recurrence-vartija F-1-luokalle). **Ei segregaatio-koodimuutosta** (jo oikein). |
| Validointi | node --check OK · Koti=live-assertio-logiikka **PASS** (apuliike 46,5 = kanoninen e1RM × loadPct − bw) · Smoke PASS · **pilot 138 muuttumaton** (engine/data koskematon). |
| Jäi auki | **F-2** (rate-limit×back-off, valmennuspäätös a/b/c, `stash@{0}`) · **F-4** (variantLoadModifier-suunta, pieni). |
| Seuraava askel | F-2 (a/b/c-päätös) + F-4. ROADMAP NYT-merkki ennallaan (vaihe 18). |
