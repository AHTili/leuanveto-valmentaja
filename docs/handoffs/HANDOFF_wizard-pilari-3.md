# HANDOFF (arkisto) — Wizard-materialisaatio, KAPSTONI pilari 3

> **Tila: SULJETTU + pushattu 2026-07-01 (APP_VERSION 4.52.53, origin/main `4c3766d`).** Cowork(a)→Code(b)-relay-kaari; repo-`HANDOFF.md` pysyi tyhjänä pohjana (työ ajettiin erillisinä relay-viesteinä). Tämä arkisto tiivistää kaaren.

## Tavoite
Wizard-generaattorin **materialisaatiokerros** (kysymys-vastaus → ohjelma) eliittitasolle: 11 synteettistä profiilia (P1–P11) läpäisevät sokkoutetun eliittiarvion. Osa KAPSTONI-eliittiverdiktin **pilari 3:a**. Pilotti (akseli-elite-streetlifter, recommend()-kuormapolku) **bittitarkka koko kaaren** — Akselin oma 22.8.-ohjelma ei muutu.

## Verdikti (puhdas sokea portti, ei kontaminaatiota)
**6/6 (P1–P6) + P7 ∧ P8 = KAPSTONI pilari 3 KYLLÄ.** P6 hyväksytty EI aiemmin (kontaminoitu käännös hylätty); lopullinen puhdas portti antoi 6/6 + P7, P8 kaatui vain yhteen liikkeeseen (korjattu R5b, verifioitu sessiotasolla). P3/peaking **lykätty γ/M2:een** (koskettaa Akselin omaa kisapeakia — erillinen koherentti remontti).

## Kierrokset (relay-kaari)
- **R1 (C0–C5):** MOVEMENT_EQUIPMENT-taulukko + goal→primary-resolveri + K kategoria-slot-täyttö + applyEquipmentFilter + ensureLowerBody + q17-bodyweight + goalConflictAdvisory. Ylävartalo-pyyhkiytymisen korjaus (FIX-B).
- **R2 (A–F):** A aloittelija-turvaraja (freq-cap 3pv + V3-aloitus, sessiotaso) · B aikabudjetti-cap · C q34-palautumiskysymys (invariant 32→33) · D primaari-demote (ei katoavaa) · E Käsipainosoutu-substituutio (OBS-053) · F vamma-modified. + Cowork-re-arvio AUKKO 1/2: q34 persooniin + intensiteetti-degradaation sessiotaso-propagaatio (slot.targetVx, ei vain weekDef — F-3-luokka).
- **R3:** P2 hypertrofia MEV-floor (≥10 settiä/päälihas/vk, komposiitti C+B) + P6 kavennettu olkapää-blocklist (penkki säilyy).
- **R4:** MEV-floor jakautuminen — per-(sessio×liike)-katto 6 + add-movement + spread (P2 olkapää HSPU 10×15 → HSPU+pystypunnerrus).
- **R5:** P2 kalustovirhe — GHR→machines (kumosi C0:n väärän bodyweight-ratifioinnin) + Käsipainopenkki→penkki-proxy + substituutit (lattiapunnerrus/Nordic ham/käsipaino-RDL).
- **R5b:** P8 kalustovirhe — Lisäpainoleuanveto/dippi → painolähde-proxy. **Bounded completeness-scan: 11/11 puhdas** (ei muita kalustorikkomuksia).

## Keskeiset opit (→ docs/MEMORY.md)
- **Acceptance sessiotasolla, ei summaryssa** (slot.targetVx ≠ weekDef.heavyTargetVx).
- **Kalustometatieto missaa toistuvasti toissijaisen vaatimuksen** (penkki/laite/painolähde) → bounded scan nimi-implikoidulla tosi-vaatimuksella ennen re-dumppia.
- **Yleissääntö korjaa myös nimeämättömät latentit viat** (aja per-profiili-diff + flagaa).

## Avoimet / lykätyt (backlog)
- **P3/peaking** → γ-peaking-lane (M2, ~11.7.); kisaviikon kisaliikkeet huippuintensiteettiin day-type-labelista riippumatta.
- **P6 = EI** (hyväksytty; ei gating-ehto).
- Dump-harness countdown-drift (P3 "kisapäivä X pv" reaali-tästä-päivästä, ei GEN_DATE:sta) → γ/M2.
- q17 "penkki"-tyyppi (nyt penkki-proxy rack/machines) — erillinen skeemamuutos jos halutaan eksplisiittinen.
- OBS-053 (katalogilaajennus: rengasvariantit), OBS-055 (_INJURY_BLOCKLIST "maavet"≠"maastaveto" → F back-inertti).

## Committi-kaari
origin 4.52.46 (`e598d94`) → **4.52.53 (`4c3766d`)**, 32 committia. Pilotti 64/64 bittitarkka joka välissä; LOAD-DIFF vahvistaa vain rikkinäisten/kalustorajoitteisten profiilien muutokset, ei-rajoitteiset bit-exact.
