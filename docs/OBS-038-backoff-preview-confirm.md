# OBS-038 — Back-off-johdannon confirm (I1–I3), READ-ONLY

> 2026-06-10, APP_VERSION 4.52.37, HEAD a2e8e71. Runtime-first: engine-funktiot ajettu Nodessa Akselin 10.6.-backupia vasten + preview-kaava verifioitu koodista + aritmetiikka täsmäytetty havaittuihin lukuihin. EI korjauksia tässä ajossa.

## Per instanssi: mistä näytetty luku tuli

### I1 — Sykli Ma 22.6. leuka: pää ~55,5 / back-off ~58 (INVERSIO) — VAHVISTETTU, preview-fragmentaatio
- **Back-off 58,0 kg = täsmälleen** flat-kaava: `vReps(4+3)=81,1 % × computeMovementE1RMBest(183,6 sys) − 91 = 58,0` ([index.html:8021-8031](../index.html) `_syRenderComputeKg` — vReps-polku myös back-offille, e1RM = **täysi kanoninen**, ei suppressiota).
- **Pää 55,5 = recommend()-totuus** async-hybrid-cachesta (`applySykliHybridToDOM` korvaa vain primary-solut `data-sy-cell`-avaimilla; rate-limit/regain suppressoi flat-66,5 → 55,5).
- **Miksi P4-clamp ei pure:** `_p4ClampSameMov` (8230+) ajaa **sync-renderissä**; `_p4CachePrimaryKg` on cold-startissa null → clamp no-op → flat jää. Async-hybrid päivittää MYÖHEMMIN vain pään DOM-solun — back-offia ei re-clampata. = F-2 PATH 4:n dokumentoitu cold-start-rajoitus, joka osoittautuu pysyväksi samalla käynnillä (async-päivitys ei re-renderöi).
- **Logiikka rikkoutuu:** kaksi totuuslähdettä samassa kortissa → designed-lighter back-off (reps+Vx 7 > pää 5) näkyy raskaampana. Enginen OMA odotus: back-off = 81,1/85,7 = **94,6 % pään näytetystä** (~52,5 kg) — täsmää Coworkin odotukseen.

### I2 — Sykli Ti 23.6. kyykky: pää ~151 / back-off ~147 (97 %) — SAMA JUURI, lievempi oire
- Back-off 147,0 = täsmälleen flat 81,1 % × 181,3 (ext). Flat-pää 155,5 → hybrid näytti 151 → suhde 97,3 % (po. 94,6 % → ~143). Ei inversiota, mutta +3 pp:n vino samasta fragmentaatiosta — suppression suuruus määrää oireen.

### I3 — LIVE 10.6. kyykky: pääsarjat TEHTY 155×3 V1 (itse kevennetty), back-off tarjosi 158,5×4 V2 — BY-DESIGN nykyarkkitehtuurissa, design-kysymys
- Live-polku (engine Branch A, [engine.js:4929-4974](../engine.js)) on **aritmeettisesti oikein ja intensiteetti-clampattu suunniteltua päätä vasten**: `sessionEffectiveE1RM` johdetaan recommend()-ajossa pään **suunnitellusta** targetista (ROOT-A), back-off = 83,3 % siitä, F-2-clamp sitoo ≤ suunniteltu pää.
- **Mutta:** recommend() ajetaan kerran ennen treeniä. Kun atletti kirjaa pääsarjat kevyemmiksi (155 < suunniteltu), saman session back-off-resoluutio **ei päivity** — `sessionEffectiveE1RM` ja `slot.resolvedLoadKg` on jo lukittu. → back-off voi tarjota enemmän kuin juuri tehdyt pääsarjat, useammalla toistolla, väsyneenä.
- **Verdikti C:** by-design (e1RM/targetit päivittyvät session tallennuksen jälkeen — dokumentoitu arkkitehtuurivalinta), MUTTA eliittikriteeri (reaaliaikainen autoregulaatio, KAPSTONI pilari 1) edellyttäisi intra-session-reaktiota. **Design-päätös Akselille — ei korjattu, ei scope-laajennettu.**

## Juurisyyt (2 kpl + 1 design-kysymys)

1. **OBS-038 (preview-fragmentaatio, F-1/H-014-luokka):** "Seuraavat 14 pv" -kortissa pää = async-recommend-totuus, back-off = sync-flat täydestä e1RM:stä → eri totuuslähteet → inversio/vino kun rate-limit/regain suppressoi pään. Ainoa `_syRenderComputeKg`-kutsupolku (8309/8346) — viikkokortti (cv-week-card) ei näytä kg-lukuja, joten I1/I2 ovat tästä kortista.
2. **OBS-039 (P4-clampin järjestysrajoitus):** clamp sync ennen async-hybridiä + ei re-clampia populaation jälkeen → ei koskaan sido samalla käynnillä.
3. **DESIGN-D1 (I3):** intra-session back-off-autoregulaatio puuttuu — KAPSTONI-pilari-1-kysymys.

## Korjausvaihtoehdot (Akseli päättää)

| # | Mitä | Koko | Huom |
|---|---|---|---|
| K1 | **Suhde-projektio:** back-off-preview = pään näytetty luku × (vReps_bo % / vReps_pää %) — sama lähde kuin pää, suppressio periytyy automaattisesti | ~10–15 riviä (preview) | Sulkee OBS-038+039 kerralla; live-polkua ei kosketa |
| K2 | Hybrid-cache laajennetaan back-off-sloteille + async-re-clamp | ~40–60 riviä | Raskaampi; kattaa myös accessoryt |
| K3 | DESIGN-D1: intra-session re-resolve (kirjauksen jälkeen back-off-target lasketaan uudelleen tehdystä) | engine-muutos, oma handoff | KAPSTONI-pilari 1; kytkeytyy paluuramppi-handoffiin |

**Suositus:** K1 erillisenä pikakorjauksena (oppi 8 -porteilla); K3 omaksi design-handoffiksi Cowork-kierroksen kautta.
