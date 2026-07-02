# Wizard-dumppi — 11 profiilia (KAPSTONI pilari 3, W1-standardi)

> **POST-FIX RE-DUMPPI — retroauditti K1–K6**. Generoitu 2026-07-01 · APP_VERSION 4.52.54 ·
> ohjelmien start-ankkuri 2026-06-14. Ajettu repon oikealla Wizard-mapperilla
> (`wizard/wizard-2b-mapper.js` `mapWizardToProgram`) + mesosykligeneraattorilla (`data.js`) +
> KORJATULLA post-process-pipelinella (`applySplitFilter` → `applyVolumeCap` → `applyInjuryFilter` →
> `applyEquipmentFilter` → `ensureLowerBody` → `applyHypertrophyMevFloor` → `applyTimeBudgetCap` →
> `applyStartingCapacityToSlots` → `applySessionFocusLabels` → `applyTierProgression` →
> `applyStartingCapacityDegradation`), joka replikoi index.html:n finalize-ketjun.
> Round 1: goal-aware primaarit + K kategoria-slot-täyttö + kalusto-suodatin + alaraaja-takuu + P8 kehonpaino/advisory.
> Round 2 (A–F): A aloittelija-turvaraja (freq-cap + V3-aloitus, sessiotaso) · B aikabudjetti-cap ·
> C q34-palautuminen (volyymi −30 % + intensiteetti) · D primaari-demote (ei katoa) · E Käsipainosoutu-substituutio · F vamma-modified.
> Round 3 (P2 + P6): P2 hypertrofia MEV-floor (≥10 settiä/päälihas/vk, recovery/aikabudjetti voittaa + advisory) ·
> P6 kavennettu olkapää-blocklist (penkki säilyy, vain pystypunnerrus/dippi poistuu). P3 LYKÄTTY γ/M2 (pilotti bittitarkka).
> Round 4 (P2 jakautuminen): per-(sessio×liike)-katto 6 + add-movement yksiliikkeisille (olkapää HSPU+pystypunnerrus) +
> spread (selän duplikaatti-kasauma levitetty) → yksikään liike ei kasaa >6 sarjaa/sessio. Vain hypertrofia (P2/P9).
> Round 5 (P2 kalustovirhe): GHR→machines (ei bodyweight) + Käsipainopenkki→penkki-proxy + substituutit (käsipaino-lattiapunnerrus /
> Nordic ham / käsipaino-RDL) → yksikään liike ei vaadi q17:stä puuttuvaa kalustoa. Muuttaa P2/P8/P9/P11 (kalustorajoitteiset).
> Round 5b (P8 kalustovirhe): Lisäpainoleuanveto/dippi → painolähde-proxy (leukatanko/dip + käsipaino/tanko/laite); P8 (pelkkä
> leukatanko) → Leuanveto (kehonpaino). BOUNDED SCAN: kaikkien 11 profiilin liikkeet ↔ q17 → 11/11 puhdas (ei kalustorikkomuksia).
> Retroauditti K1–K6 (pilari 3 suljettu → jälkiauditti): MEV-floor-rajaukset (spread vain accessoryihin — primaari/backoff
> koskematon; deload-kynnys −0.20; lisätty liike perii viikon Vx:n) · duplikaatti-rivien merge (equipment+injury) · MEV-advisory
> post-aktivointi-toastiksi · UUSI assertoiva wizard-pilot Stop hookiin (löysi + korjasi: splitFilter pudotti demotatun primaarin
> — P7 vk4 Maastaveto palautettu) · RDL-kerrosristiriita → OBS-044. Näkyy dumpissa: P2/P9 Vx-perintä + merge-rivit, P7 vk4.
> mapper-versio 2D-gamma-v1.0. Mainappstate = null (synteettiset personat, ei DB-dataa).
>
> **Tulos: 11/11 profiilia generoitui onnistuneesti.** (P1–P8 W2-perusprofiilit + P9–P11 pilari 3 (b) kalusto-kattavuuslisäys.)
>
> ## ⚠️ SOKKOUTUSOHJE W2-ARVIOIJALLE
> Tämä dumppi on **kolmessa erillisessä lohkossa**. Lue järjestyksessä:
> 1. **SECTION A — OHJELMAT (sokko):** lue VAIN ohjelmat. Arvioi kukin ohjelma ja **päättele itse mikä ohjelmointityyli se on** ja sopiiko se personalle. Tyylin nimeä EI ole tässä lohkossa.
> 2. **SECTION B — TYYLIVALINNAT:** vasta kun olet tehnyt sokkoarviot, lue todelliset tyylivalinnat + confidence + top-3 kandidaatit ja vertaa päätelmääsi.
> 3. **SECTION C — VEKTORIT + NEUTRAALIVALINNAT:** syöte-audit (33Q-vektorit + jokainen neutraalivalinta).
>
> Älä lue Section B ennen Section A:n arviota.

---

# SECTION A — GENEROIDUT OHJELMAT (sokko: tyyliä ei nimetty)

### P1
> Mies 28 v, <6 kk tausta, yleisvoima, täysi sali, 3 pv/vk, ei rajoitteita.

- **Liikevalinta (primaryt):** Takakyykky + Penkkipunnerrus + Lisäpainoleuanveto
- **Frekvenssi:** 3 pv/vk · **Palautumiskapasiteetti (johdettu):** keski
- **Periodisaatio:** 4 vk (materialisoitu) · mapper-aikomus 6 vk · ⚠ deklaroitu weekCount=6 ≠ materialisoitu 4

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct 0% · pää 3 × V2
  - vk 2: ΔPct 0.025% · pää 3 × V1
  - vk 3: ΔPct 0.035% · pää 2 × V1
  - vk 4: ΔPct -0.25% · pää 3 × V4

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 5×3 @ V2 (alaraaja)
      · backoff: Takakyykky — 3×5 @ V3 (alaraaja)
      · accessory: Hip thrust — 3×6 @ V3 (alaraaja)
      · accessory: Chest-supported row — 3×8 @ V3 (horisontaaliveto)
      · accessory: Pohjenosto — 3×10 @ — (alaraaja)
    Päivä (dow 3, volume) — fokus: Penkkipunnerrus:
      · primary: Penkkipunnerrus — 5×5 @ V3 (horisontaalityöntö)
      · accessory: Vinopenkkipunnerrus — 3×8 @ V3 (horisontaalityöntö)
      · accessory: T-bar row — 3×8 @ V3 (horisontaaliveto)
      · accessory: Hammer curl — 3×12 @ — (hauisfleksio)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, speed) — fokus: Lisäpainoleuanveto:
      · primary: Lisäpainoleuanveto — 6×2 @ V4 (vertikaaliveto)
      · accessory: Alatalja — 3×10 @ — (horisontaaliveto)
      · accessory: Hammer curl — 3×10 @ — (hauisfleksio)
  **Viikko 4:**
    Päivä (dow 1, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 3×3 @ V4 (alaraaja)
      · accessory: Hip thrust — 3×8 @ V4 (alaraaja)
      · accessory: Leg curl — 2×10 @ — (alaraaja)
      · accessory: Lisäpainoleuanveto — 3×6 @ V3 (vertikaaliveto)
    Päivä (dow 3, volume) — fokus: Penkkipunnerrus:
      · primary: Penkkipunnerrus — 3×5 @ V4 (horisontaalityöntö)
      · accessory: Spoto press — 3×8 @ V4 (horisontaalityöntö)
      · accessory: T-bar row — 2×8 @ V4 (horisontaaliveto)
  *(vk 2…3 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 4)*

---

### P2
> Mies 32 v, 2–3 v, hypertrofia, koti (käsipainot ≤32 kg, leuanvetotanko, kuminauhat; ei penkkiä/tankoa), 4 pv/vk.

- **Liikevalinta (primaryt):** Lisäpainoleuanveto + Käsipainolattiapunnerrus + Bulgarian split squat
- **Frekvenssi:** 4 pv/vk · **Palautumiskapasiteetti (johdettu):** keski
- **Periodisaatio:** 4 vk (materialisoitu)

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct 0% · pää 8 × V2
  - vk 2: ΔPct 0.01% · pää 8 × V2
  - vk 3: ΔPct 0.02% · pää 8 × V1
  - vk 4: ΔPct -0.25% · pää 6 × V4

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, volume) — fokus: Lisäpainoleuanveto:
      · primary: Lisäpainoleuanveto — 4×10 @ V1 (vertikaaliveto)
      · accessory: Dumbbell fly — 5×10 @ V1 (horisontaalityöntö)
      · accessory: Handstand push-up (HSPU) — 6×15 @ V1 (vertikaalityöntö)
      · accessory: Pystypunnerrus käsipainot — 4×15 @ V1 (vertikaalityöntö)
    Päivä (dow 2, volume) — fokus: Käsipainolattiapunnerrus:
      · primary: Käsipainolattiapunnerrus — 5×10 @ V1 (horisontaalityöntö)
      · accessory: Leuanveto (kehonpaino) — 3×10 @ V1 (vertikaaliveto)
      · accessory: Käsipainosoutu — 4×15 @ V1 (horisontaaliveto)
      · accessory: Hammer curl — 2×12 @ V1 (hauisfleksio)
    Päivä (dow 4, volume) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 4×8 @ V1 (alaraaja)
      · accessory: Nordic ham — 3×10 @ V1 (alaraaja)
      · accessory: Nordic ham — 3×12 @ V1 (alaraaja)
    Päivä (dow 5, volume) — fokus: Lisäpainoleuanveto:
      · primary: Lisäpainoleuanveto — 3×8 @ V1 (vertikaaliveto)
      · accessory: Käsipainosoutu — 4×10 @ V1 (horisontaaliveto)
      · accessory: Käsipainosoutu — 2×15 @ V1 (horisontaaliveto)
      · accessory: Hanging leg raise — 2×12 @ — (core)
  **Viikko 4:**
    Päivä (dow 1, volume) — fokus: Lisäpainoleuanveto:
      · primary: Lisäpainoleuanveto — 1×10 @ V4 (vertikaaliveto)
      · accessory: Dumbbell fly — 1×10 @ V4 (horisontaalityöntö)
      · accessory: Handstand push-up (HSPU) — 1×15 @ V4 (vertikaalityöntö)
    Päivä (dow 2, volume) — fokus: Käsipainolattiapunnerrus:
      · primary: Käsipainolattiapunnerrus — 1×10 @ V4 (horisontaalityöntö)
      · accessory: Leuanveto (kehonpaino) — 1×10 @ V4 (vertikaaliveto)
      · accessory: Käsipainosoutu — 1×15 @ V4 (horisontaaliveto)
      · accessory: Hauiskääntö tanko — 1×12 @ V4 (hauisfleksio)
    Päivä (dow 4, volume) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×8 @ V4 (alaraaja)
      · accessory: Nordic ham — 1×10 @ V4 (alaraaja)
      · accessory: Pohjenosto — 1×12 @ V4 (alaraaja)
    Päivä (dow 5, volume) — fokus: Lisäpainoleuanveto:
      · primary: Lisäpainoleuanveto — 1×8 @ V4 (vertikaaliveto)
      · accessory: Käsipainosoutu — 2×10 @ V4 (horisontaaliveto)
      · accessory: Käsipainosoutu — 1×15 @ V4 (horisontaaliveto)
      · accessory: Hanging leg raise — 1×12 @ — (core)
  *(vk 2…3 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 4)*

---

### P3
> Mies 27 v / 75 kg, 5+ v (2 v lajispesifistä), streetlifting (painollinen leuanveto/dippi/kyykky + muscle-up), kisa 10–12 vk päässä, sali + vyöpaino, 4–5 pv/vk, edistyneet suhteelliset voimatasot.

- **Liikevalinta (primaryt):** Lisäpainoleuanveto + Lisäpainodippi + Takakyykky + Muscle-up
- **Frekvenssi:** 4 pv/vk · **Palautumiskapasiteetti (johdettu):** hyva
- **Periodisaatio:** 6 vk (materialisoitu) · MULTI-BLOKKI (blokkiperiodisaatio)
- **Blokkisekvenssi:** intensifikaatio (vk 1–4) → peaking (vk 5–6)

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct 0.003% · pää 3 × V2
  - vk 2: ΔPct 0.006% · pää 2 × V1
  - vk 3: ΔPct 0.009% · pää 1 × V1
  - vk 4: ΔPct -0.25% · pää 3 × V4
  - vk 5: ΔPct 0.005% · pää 2 × V2
  - vk 6: ΔPct 0% · pää 1 × V1

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Lisäpainoleuanveto:
      · primary: Lisäpainoleuanveto — 4×3 @ V2 (vertikaaliveto)
      · accessory: Penkkiveto — 2×5 @ V2 (horisontaaliveto)
    Päivä (dow 2, speed) — fokus: Lisäpainodippi:
      · primary: Lisäpainodippi — 5×2 @ V4 (horisontaalityöntö)
      · accessory: Hanging leg raise — 2×8 @ — (core)
    Päivä (dow 4, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 4×3 @ V2 (alaraaja)
      · accessory: Leg curl — 2×6 @ V3 (alaraaja)
    Päivä (dow 5, speed) — fokus: Muscle-up:
      · primary: Muscle-up — 5×2 @ V4 (vertikaaliveto)
      · accessory: Hanging leg raise — 2×8 @ — (core)
  **Viikko 6:**
    Päivä (dow 1, heavy) — fokus: Lisäpainoleuanveto:
      · primary: Lisäpainoleuanveto — 2×2 @ V1 (vertikaaliveto)
    Päivä (dow 2, speed) — fokus: Lisäpainodippi:
      · primary: Lisäpainodippi — 1×2 @ V4 (horisontaalityöntö)
      · accessory: Muscle-up — 3×6 @ V3 (vertikaaliveto)
    Päivä (dow 4, speed) — fokus: Takakyykky:
      · primary: Takakyykky — 1×2 @ V4 (alaraaja)
  *(vk 2…5 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 6)*

---

### P4
> Nainen 30 v / 63 kg, ~2 v, maksimivoima, täysi sali, 3–4 pv/vk.

- **Liikevalinta (primaryt):** Takakyykky + Penkkipunnerrus + Maastaveto
- **Frekvenssi:** 4 pv/vk · **Palautumiskapasiteetti (johdettu):** keski
- **Periodisaatio:** 5 vk (materialisoitu)

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct -0.07499999999999996% · pää 5 × V2
  - vk 2: ΔPct -0.050000000000000044% · pää 5 × V2
  - vk 3: ΔPct -0.025000000000000022% · pää 5 × V2
  - vk 4: ΔPct 0% · pää 5 × V1
  - vk 5: ΔPct 0.005% · pää 3 × V1

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V2 (alaraaja)
      · primary: Takakyykky — 1×5 @ V1 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V2 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V1 (horisontaalityöntö)
      · primary: Maastaveto — 1×5 @ V4 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V3 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V3 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V2 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V1 (lonkkahingaus)
      · accessory: Ab wheel rollout — 2×10 @ V3 (core)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 2, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 4, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V2 (alaraaja)
      · primary: Takakyykky — 1×3 @ V1 (alaraaja)
      · backoff: Takakyykky — 1×8 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V2 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×3 @ V1 (horisontaalityöntö)
      · backoff: Penkkipunnerrus — 1×8 @ V3 (horisontaalityöntö)
      · primary: Maastaveto — 1×5 @ V4 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V3 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V3 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V2 (lonkkahingaus)
      · primary: Maastaveto — 1×3 @ V1 (lonkkahingaus)
      · backoff: Maastaveto — 1×8 @ V3 (lonkkahingaus)
      · accessory: Leg curl — 3×10 @ — (alaraaja)
  **Viikko 5:**
    Päivä (dow 1, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V2 (alaraaja)
      · primary: Takakyykky — 1×5 @ V1 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V2 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V1 (horisontaalityöntö)
      · primary: Maastaveto — 1×5 @ V4 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V3 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V3 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V2 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V1 (lonkkahingaus)
      · accessory: Ab wheel rollout — 2×10 @ V3 (core)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 2, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 4, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V2 (alaraaja)
      · primary: Takakyykky — 1×3 @ V1 (alaraaja)
      · backoff: Takakyykky — 1×8 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V2 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×3 @ V1 (horisontaalityöntö)
      · backoff: Penkkipunnerrus — 1×8 @ V3 (horisontaalityöntö)
      · primary: Maastaveto — 1×5 @ V4 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V3 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V3 (lonkkahingaus)
      · primary: Maastaveto — 1×5 @ V2 (lonkkahingaus)
      · primary: Maastaveto — 1×3 @ V1 (lonkkahingaus)
      · backoff: Maastaveto — 1×8 @ V3 (lonkkahingaus)
      · accessory: Leg curl — 3×10 @ — (alaraaja)
  *(vk 2…4 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 5)*

---

### P5
> Mies 56 v / 88 kg, epäsäännöllinen ~1 v (tauolla), terveys/voima/toimintakyky, täysi sali, 2–3 pv/vk, itse raportoitu palautumisrajoite (hidas palautuminen, työstressi, vaihteleva uni).

- **Liikevalinta (primaryt):** Takakyykky + Penkkipunnerrus + Lisäpainoleuanveto
- **Frekvenssi:** 2 pv/vk · **Palautumiskapasiteetti (johdettu):** heikko
- **ℹ Huomio:** Ohjelman aloitusintensiteetti ja -volyymi on madallettu raportoidun palautumisrajoitteen vuoksi — autoregulaatio nostaa kuormaa kun palautuminen sallii.
- **Periodisaatio:** 4 vk (materialisoitu) · mapper-aikomus 6 vk · ⚠ deklaroitu weekCount=6 ≠ materialisoitu 4

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct 0% · pää 3 × V3
  - vk 2: ΔPct 0.025% · pää 3 × V2
  - vk 3: ΔPct 0.035% · pää 2 × V1
  - vk 4: ΔPct -0.25% · pää 3 × V4

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 5×3 @ V3 (alaraaja)
      · backoff: Takakyykky — 3×5 @ V3 (alaraaja)
      · accessory: Hip thrust — 3×6 @ V3 (alaraaja)
      · accessory: Chest-supported row — 2×8 @ V3 (horisontaaliveto)
      · accessory: Pohjenosto — 2×10 @ — (alaraaja)
      · accessory: Lisäpainoleuanveto — 2×6 @ V3 (vertikaaliveto)
    Päivä (dow 4, volume) — fokus: Penkkipunnerrus:
      · primary: Penkkipunnerrus — 5×5 @ V4 (horisontaalityöntö)
      · accessory: Vinopenkkipunnerrus — 3×8 @ V3 (horisontaalityöntö)
      · accessory: T-bar row — 2×8 @ V3 (horisontaaliveto)
      · accessory: Hammer curl — 2×12 @ — (hauisfleksio)
      · accessory: Hanging leg raise — 2×10 @ — (core)
  **Viikko 4:**
    Päivä (dow 1, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 3×3 @ V4 (alaraaja)
      · accessory: Hip thrust — 2×8 @ V4 (alaraaja)
      · accessory: Leg curl — 1×10 @ — (alaraaja)
      · accessory: Lisäpainoleuanveto — 2×6 @ V3 (vertikaaliveto)
    Päivä (dow 4, volume) — fokus: Penkkipunnerrus:
      · primary: Penkkipunnerrus — 3×5 @ V4 (horisontaalityöntö)
      · accessory: Spoto press — 2×8 @ V4 (horisontaalityöntö)
      · accessory: T-bar row — 1×8 @ V4 (horisontaaliveto)
  *(vk 2…3 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 4)*

---

### P6
> Mies 35 v / 90 kg, 3 v, voima+massa, täysi sali, 3–4 pv/vk, krooninen olkapääkipu (kivulias kaari pystypunnerruksessa + syvässä dipissä).

- **Liikevalinta (primaryt):** Takakyykky + Penkkipunnerrus + Lisäpainoleuanveto
- **Frekvenssi:** 4 pv/vk · **Palautumiskapasiteetti (johdettu):** keski
- **Periodisaatio:** 5 vk (materialisoitu)

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct -0.07499999999999996% · pää 5 × V2
  - vk 2: ΔPct -0.050000000000000044% · pää 5 × V2
  - vk 3: ΔPct -0.025000000000000022% · pää 5 × V2
  - vk 4: ΔPct 0% · pää 5 × V1
  - vk 5: ΔPct 0.01% · pää 3 × V1

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V2 (alaraaja)
      · primary: Takakyykky — 1×5 @ V1 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V2 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V1 (horisontaalityöntö)
      · primary: Lisäpainoleuanveto — 1×5 @ V4 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V3 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V3 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V2 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V1 (vertikaaliveto)
      · accessory: Ab wheel rollout — 2×10 @ V3 (core)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 2, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 4, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V2 (alaraaja)
      · primary: Takakyykky — 1×3 @ V1 (alaraaja)
      · backoff: Takakyykky — 1×8 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V2 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×3 @ V1 (horisontaalityöntö)
      · backoff: Penkkipunnerrus — 1×8 @ V3 (horisontaalityöntö)
      · primary: Lisäpainoleuanveto — 1×5 @ V4 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V3 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V3 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V2 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×3 @ V1 (vertikaaliveto)
      · backoff: Lisäpainoleuanveto — 1×8 @ V3 (vertikaaliveto)
      · accessory: Leg curl — 3×10 @ — (alaraaja)
  **Viikko 5:**
    Päivä (dow 1, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V2 (alaraaja)
      · primary: Takakyykky — 1×5 @ V1 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V2 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V1 (horisontaalityöntö)
      · primary: Lisäpainoleuanveto — 1×5 @ V4 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V3 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V3 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V2 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V1 (vertikaaliveto)
      · accessory: Ab wheel rollout — 2×10 @ V3 (core)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 2, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 4, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, heavy) — fokus: Takakyykky:
      · primary: Takakyykky — 1×5 @ V4 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V3 (alaraaja)
      · primary: Takakyykky — 1×5 @ V2 (alaraaja)
      · primary: Takakyykky — 1×3 @ V1 (alaraaja)
      · backoff: Takakyykky — 1×8 @ V3 (alaraaja)
      · primary: Penkkipunnerrus — 1×5 @ V4 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V3 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×5 @ V2 (horisontaalityöntö)
      · primary: Penkkipunnerrus — 1×3 @ V1 (horisontaalityöntö)
      · backoff: Penkkipunnerrus — 1×8 @ V3 (horisontaalityöntö)
      · primary: Lisäpainoleuanveto — 1×5 @ V4 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V3 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V3 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×5 @ V2 (vertikaaliveto)
      · primary: Lisäpainoleuanveto — 1×3 @ V1 (vertikaaliveto)
      · backoff: Lisäpainoleuanveto — 1×8 @ V3 (vertikaaliveto)
      · accessory: Leg curl — 3×10 @ — (alaraaja)
  *(vk 2…4 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 5)*

---

### P7
> (known-negative A) Mies 19 v / 72 kg, 2 kk tausta, toive: 'maksimivoima nopeasti' + halu 6–7 pv/vk + raskaat maksiminostot, korkea motivaatio, ei rajoitteita.

- **Liikevalinta (primaryt):** Penkkipunnerrus + Takakyykky + Maastaveto
- **Frekvenssi:** 3 pv/vk · **Palautumiskapasiteetti (johdettu):** keski
- **ℹ Huomio:** Ohjelma on muokattu turvallisemmaksi: treenitausta alle 6 kk + korkea pyydetty frekvenssi → treenipäivät rajattu ja aloitusintensiteetti submaksimaalinen (tekniikka ja kudoskapasiteetti ensin, kuorma nousee asteittain).
- **Periodisaatio:** 4 vk (materialisoitu) · mapper-aikomus 6 vk · ⚠ deklaroitu weekCount=6 ≠ materialisoitu 4

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct 0% · pää 3 × V3
  - vk 2: ΔPct 0.025% · pää 3 × V3
  - vk 3: ΔPct 0.035% · pää 2 × V1
  - vk 4: ΔPct -0.25% · pää 3 × V4

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Penkkipunnerrus:
      · primary: Penkkipunnerrus — 5×3 @ V3 (horisontaalityöntö)
      · backoff: Penkkipunnerrus — 3×5 @ V3 (horisontaalityöntö)
      · accessory: Seated OHP — 3×6 @ V3 (vertikaalityöntö)
      · accessory: Tricep pushdown — 3×10 @ — (ojentajaekstensio)
    Päivä (dow 3, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 5×5 @ V3 (alaraaja)
      · accessory: Bulgarian split squat — 3×8 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, speed) — fokus: Maastaveto:
      · primary: Maastaveto — 6×2 @ V4 (lonkkahingaus)
      · accessory: Hip thrust — 3×10 @ — (alaraaja)
  **Viikko 4:**
    Päivä (dow 1, heavy) — fokus: Penkkipunnerrus:
      · primary: Penkkipunnerrus — 3×3 @ V4 (horisontaalityöntö)
      · accessory: Seated OHP — 3×8 @ V4 (vertikaalityöntö)
      · accessory: Skull crusher — 2×10 @ — (ojentajaekstensio)
      · accessory: Maastaveto — 3×6 @ V3 (lonkkahingaus)
    Päivä (dow 3, volume) — fokus: Takakyykky:
      · primary: Takakyykky — 3×5 @ V4 (alaraaja)
      · accessory: Paused squat — 3×8 @ V4 (alaraaja)
  *(vk 2…3 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 4)*

---

### P8
> (known-negative B) Nainen 41 v / 70 kg, <1 v, ristiriitainen vektori: SEKÄ kilpailutason maksimivoima ETTÄ maksimaalinen lihaskasvu nopeasti; 2 pv/vk × 30 min; ei välineitä (koti); heikko palautuminen.

- **Liikevalinta (primaryt):** Bulgarian split squat + Handstand push-up (HSPU)
- **Frekvenssi:** 2 pv/vk · **Palautumiskapasiteetti (johdettu):** heikko
- **ℹ Huomio:** Maksimivoimaa ja maksimaalista lihasmassaa ei voi optimoida samanaikaisesti. Ohjelma priorisoi maksimivoiman; hypertrofia tukee toissijaisesti. Käytettävissä oleva aika, treenipäivät tai kalusto rajoittavat tavoitteen täyttä saavuttamista — ohjelma on tiivistetty toteutettavaan minimiin. Ohjelman aloitusintensiteetti ja -volyymi on madallettu raportoidun palautumisrajoitteen vuoksi — autoregulaatio nostaa kuormaa kun palautuminen sallii.
- **Periodisaatio:** 4 vk (materialisoitu) · mapper-aikomus 6 vk · ⚠ deklaroitu weekCount=6 ≠ materialisoitu 4

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct 0% · pää 3 × V3
  - vk 2: ΔPct 0.014% · pää 3 × V2
  - vk 3: ΔPct 0.019% · pää 2 × V1
  - vk 4: ΔPct -0.25% · pää 3 × V4

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 5×3 @ V3 (alaraaja)
      · backoff: Bulgarian split squat — 3×5 @ V3 (alaraaja)
      · accessory: Nordic ham — 2×6 @ V3 (alaraaja)
    Päivä (dow 4, volume) — fokus: Handstand push-up (HSPU):
      · primary: Handstand push-up (HSPU) — 5×5 @ V4 (vertikaalityöntö)
      · accessory: Handstand push-up (HSPU) — 3×8 @ V3 (vertikaalityöntö)
      · accessory: Leuanveto (kehonpaino) — 2×8 @ V3 (vertikaaliveto)
  **Viikko 4:**
    Päivä (dow 1, heavy) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 3×3 @ V4 (alaraaja)
      · accessory: Nordic ham — 2×8 @ V4 (alaraaja)
      · accessory: Nordic ham — 1×10 @ — (alaraaja)
    Päivä (dow 4, volume) — fokus: Handstand push-up (HSPU):
      · primary: Handstand push-up (HSPU) — 3×5 @ V4 (vertikaalityöntö)
      · accessory: Handstand push-up (HSPU) — 2×8 @ V4 (vertikaalityöntö)
      · accessory: Leuanveto (kehonpaino) — 1×8 @ V4 (vertikaaliveto)
  *(vk 2…3 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 4)*

---

### P9
> Mies 30 v / 85 kg, 2 v, hypertrofia, KOTI vain käsipainot (ei leukatankoa/tankoa), 4 pv/vk.

- **Liikevalinta (primaryt):** Käsipainolattiapunnerrus + Bulgarian split squat
- **Frekvenssi:** 4 pv/vk · **Palautumiskapasiteetti (johdettu):** keski
- **ℹ Huomio:** Vetoliikkeet vaativat leukatangon, vaijerilaitteen tai tangon — valitulla kalustolla ohjelma painottuu työntö- ja jalkaliikkeisiin. Osa hypertrofia-lihasryhmistä jää tavoitevolyymin (10 sarjaa/viikko) alle käytettävissä olevan sessioajan tai liikevalikoiman vuoksi — pidennä sessioita, lisää treenipäivä tai laajenna kalustoa saavuttaaksesi täyden volyymin.
- **Periodisaatio:** 4 vk (materialisoitu)

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct 0% · pää 8 × V2
  - vk 2: ΔPct 0.01% · pää 8 × V2
  - vk 3: ΔPct 0.02% · pää 8 × V1
  - vk 4: ΔPct -0.25% · pää 6 × V4

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, volume) — fokus: Käsipainolattiapunnerrus:
      · primary: Käsipainolattiapunnerrus — 5×10 @ V1 (horisontaalityöntö)
      · accessory: Käsipainosoutu — 5×15 @ V1 (horisontaaliveto)
      · accessory: Hammer curl — 2×12 @ V1 (hauisfleksio)
    Päivä (dow 2, volume) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 2×10 @ V1 (alaraaja)
    Päivä (dow 4, volume) — fokus: Käsipainolattiapunnerrus:
      · primary: Käsipainolattiapunnerrus — 5×8 @ V1 (horisontaalityöntö)
      · accessory: Handstand push-up (HSPU) — 6×10 @ V1 (vertikaalityöntö)
      · accessory: Käsipainosoutu — 5×15 @ V1 (horisontaaliveto)
      · accessory: Skull crusher — 2×12 @ V1 (ojentajaekstensio)
      · accessory: Pystypunnerrus käsipainot — 2×10 @ V1 (vertikaalityöntö)
    Päivä (dow 5, volume) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 2×8 @ V1 (alaraaja)
      · accessory: Walking lunge — 2×10 @ V1 (alaraaja)
      · accessory: Nordic ham — 2×10 @ V1 (alaraaja)
      · accessory: Nordic ham — 2×15 @ V1 (alaraaja)
      · accessory: Hanging leg raise — 2×12 @ — (core)
  **Viikko 4:**
    Päivä (dow 1, volume) — fokus: Käsipainolattiapunnerrus:
      · primary: Käsipainolattiapunnerrus — 1×10 @ V4 (horisontaalityöntö)
      · accessory: Käsipainosoutu — 1×15 @ V4 (horisontaaliveto)
      · accessory: Hauiskääntö tanko — 1×12 @ V4 (hauisfleksio)
    Päivä (dow 2, volume) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×10 @ V4 (alaraaja)
    Päivä (dow 4, volume) — fokus: Käsipainolattiapunnerrus:
      · primary: Käsipainolattiapunnerrus — 1×8 @ V4 (horisontaalityöntö)
      · accessory: Pystypunnerrus käsipainot — 1×10 @ V4 (vertikaalityöntö)
      · accessory: Käsipainosoutu — 1×15 @ V4 (horisontaaliveto)
    Päivä (dow 5, volume) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×8 @ V4 (alaraaja)
      · accessory: Nordic ham — 2×10 @ V4 (alaraaja)
      · accessory: Nordic ham — 1×15 @ V4 (alaraaja)
      · accessory: Hanging leg raise — 1×12 @ — (core)
  *(vk 2…3 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 4)*

---

### P10
> Nainen 34 v / 64 kg, 3 v, yleisvoima, KOTI vain renkaat/TRX, 3 pv/vk.

- **Liikevalinta (primaryt):** Bulgarian split squat + Handstand push-up (HSPU)
- **Frekvenssi:** 3 pv/vk · **Palautumiskapasiteetti (johdettu):** keski
- **ℹ Huomio:** Vetoliikkeet vaativat leukatangon, vaijerilaitteen tai tangon — valitulla kalustolla ohjelma painottuu työntö- ja jalkaliikkeisiin.
- **Periodisaatio:** 5 vk (materialisoitu)

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct -0.07499999999999996% · pää 5 × V2
  - vk 2: ΔPct -0.050000000000000044% · pää 5 × V2
  - vk 3: ΔPct -0.025000000000000022% · pää 5 × V2
  - vk 4: ΔPct 0% · pää 5 × V1
  - vk 5: ΔPct 0.005% · pää 3 × V1

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V2 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V1 (alaraaja)
      · primary: Handstand push-up (HSPU) — 1×5 @ V4 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V2 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V1 (vertikaalityöntö)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V2 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V1 (alaraaja)
      · accessory: Ab wheel rollout — 1×10 @ V3 (core)
    Päivä (dow 3, volume) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Handstand push-up (HSPU) — 1×5 @ V4 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V4 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, heavy) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V2 (alaraaja)
      · primary: Bulgarian split squat — 1×3 @ V1 (alaraaja)
      · backoff: Bulgarian split squat — 1×8 @ V3 (alaraaja)
      · primary: Handstand push-up (HSPU) — 1×5 @ V4 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V2 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×3 @ V1 (vertikaalityöntö)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V2 (alaraaja)
      · primary: Bulgarian split squat — 1×3 @ V1 (alaraaja)
  **Viikko 5:**
    Päivä (dow 1, heavy) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V2 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V1 (alaraaja)
      · primary: Handstand push-up (HSPU) — 1×5 @ V4 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V2 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V1 (vertikaalityöntö)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V2 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V1 (alaraaja)
      · accessory: Ab wheel rollout — 1×10 @ V3 (core)
    Päivä (dow 3, volume) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Handstand push-up (HSPU) — 1×5 @ V4 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V4 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, heavy) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V2 (alaraaja)
      · primary: Bulgarian split squat — 1×3 @ V1 (alaraaja)
      · backoff: Bulgarian split squat — 1×8 @ V3 (alaraaja)
      · primary: Handstand push-up (HSPU) — 1×5 @ V4 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V3 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×5 @ V2 (vertikaalityöntö)
      · primary: Handstand push-up (HSPU) — 1×3 @ V1 (vertikaalityöntö)
      · primary: Bulgarian split squat — 1×5 @ V4 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V3 (alaraaja)
      · primary: Bulgarian split squat — 1×5 @ V2 (alaraaja)
      · primary: Bulgarian split squat — 1×3 @ V1 (alaraaja)
  *(vk 2…4 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 5)*

---

### P11
> Mies 25 v / 78 kg, <1 v, yleiskunto, KOTI ei välineitä (pelkkä kehonpaino), 3 pv/vk.

- **Liikevalinta (primaryt):** Bulgarian split squat + Handstand push-up (HSPU)
- **Frekvenssi:** 3 pv/vk · **Palautumiskapasiteetti (johdettu):** keski
- **ℹ Huomio:** Vetoliikkeet vaativat leukatangon, vaijerilaitteen tai tangon — valitulla kalustolla ohjelma painottuu työntö- ja jalkaliikkeisiin.
- **Periodisaatio:** 4 vk (materialisoitu) · mapper-aikomus 6 vk · ⚠ deklaroitu weekCount=6 ≠ materialisoitu 4

**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**
  - vk 1: ΔPct 0% · pää 3 × V2
  - vk 2: ΔPct 0.025% · pää 3 × V1
  - vk 3: ΔPct 0.035% · pää 2 × V1
  - vk 4: ΔPct -0.25% · pää 3 × V4

**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**
  **Viikko 1:**
    Päivä (dow 1, heavy) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 5×3 @ V2 (alaraaja)
      · backoff: Bulgarian split squat — 3×5 @ V3 (alaraaja)
      · accessory: Nordic ham — 3×6 @ V3 (alaraaja)
      · accessory: Pohjenosto — 3×10 @ — (alaraaja)
    Päivä (dow 3, volume) — fokus: Handstand push-up (HSPU):
      · primary: Handstand push-up (HSPU) — 5×5 @ V3 (vertikaalityöntö)
      · accessory: Handstand push-up (HSPU) — 3×8 @ V3 (vertikaalityöntö)
      · accessory: Hanging leg raise — 3×10 @ — (core)
    Päivä (dow 5, speed) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 6×2 @ V4 (alaraaja)
      · accessory: Nordic ham — 3×10 @ — (alaraaja)
      · accessory: Pohjenosto — 3×10 @ — (alaraaja)
  **Viikko 4:**
    Päivä (dow 1, heavy) — fokus: Bulgarian split squat:
      · primary: Bulgarian split squat — 3×3 @ V4 (alaraaja)
      · accessory: Nordic ham — 3×8 @ V4 (alaraaja)
      · accessory: Nordic ham — 2×10 @ — (alaraaja)
    Päivä (dow 3, volume) — fokus: Handstand push-up (HSPU):
      · primary: Handstand push-up (HSPU) — 3×5 @ V4 (vertikaalityöntö)
      · accessory: Handstand push-up (HSPU) — 3×8 @ V4 (vertikaalityöntö)
  *(vk 2…3 rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk 4)*


---
---

# SECTION B — WIZARDIN TYYLIVALINNAT (lue vasta Section A:n arvion jälkeen)

### P1 — Mies 28 v
- **VALITTU TYYLI:** `single-yhdistelma` — Perusjakso (Ma/Pe/No)
- **goal:** yhdistelma · **skeleton:** createDefaultMesocycle · **weekCount:** 6
- **Top-3 kandidaatit (confidence):**
    1. `single-yhdistelma` (Perusjakso (Ma/Pe/No)) — **conf 65**
        rationale: Yleinen voima ja terveys → perusjakso kattaa kaikki ominaisuudet; Aloittelijalle perusjakso on koulutuksellisesti paras (kaikki ominaisuudet kosketuksissa); Tulet pois ohjelmattomasta vaiheesta → laajapohjainen yhdistelmäjakso rakentaa kaiken pohjan
    2. `single-madcow-5x5` (Madcow 5×5) — **conf 45**
        rationale: Aloittelija → Madcow toimii LP-ohjelmana, mutta StrongLifts/Starting Strength on yleensä parempi alkuun; Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua; Tulet pois ohjelmattomasta/deloadista → Madcow:n lineaarinen progressio palauttaa pohjan; 3 päivää/vk → sopii suoraan Madcow:n Ma/Ke/Pe-rakenteeseen
    3. `single-siirtyma` (Siirtymäjakso (GPP)) — **conf 40**
        rationale: Tulet pois ohjelmattomasta vaiheesta → GPP rakentaa pohjan ennen voima/hypertrofiablokkia; Aloittelijalle GPP on koulutuksellisesti hyvä pohja
- **Viikko-labelit:** vk1: Adaptaatio · vk2: Loading · vk3: Overreach · vk4: Deload


### P2 — Mies 32 v
- **VALITTU TYYLI:** `single-minimalist-rp` — Minimalist RP (Israetel)
- **goal:** minimalistRP · **skeleton:** createMinimalistRPMesocycle · **weekCount:** 4
- **Top-3 kandidaatit (confidence):**
    1. `single-minimalist-rp` (Minimalist RP (Israetel)) — **conf 40**
        rationale: Hypertrofia-tavoite → RP volume landmarks suoraan kohdistettu
    2. `single-hypertrofia` (Hypertrofiajakso) — **conf 35**
        rationale: Päätavoite hypertrofia → hypertrofia-blokki suoraan kohdistettu; Edellinen blokki oli jo hypertrofia → seuraava luonteva askel on voima
    3. `single-dup` (DUP — undulating) — **conf 35**
        rationale: Keskitaso+ pystyy hyödyntämään päivittäin vaihtuvaa intensiteettiä; Yleinen voima / hypertrofia → DUP sopii kun haluat varioida ärsykettä; Aiempi perinteinen blokki → DUP voi tarjota variointia
- **Viikko-labelit:** vk1: RP Min vk1 (MEV) · vk2: RP Min vk2 (MEV+2 sets) · vk3: RP Min vk3 (lähellä MAV) · vk4: RP Min vk4 (deload)


### P3 — Mies 27 v / 75 kg
- **VALITTU TYYLI:** `multi-issurin` — Block-periodisaatio (Issurin)
- **goal:** multi-blokki [intensifikaatio → peaking] · **skeleton:** multi-block-chain · **weekCount:** 6
- **Top-3 kandidaatit (confidence):**
    1. `multi-issurin` (Block-periodisaatio (Issurin)) — **conf 100**
        rationale: Kisapäivä asetettu (59 pv) → riittävästi aikaa block-periodisaatiolle; Kisa-tavoite → multi-blokki on tieteellinen standardi (Issurin); Max-tavoite tukee perinteistä hyp→str→int→peak-sekvenssiä
    2. `single-westside-conjugate` (Westside Conjugate) — **conf 65**
        rationale: Max-tavoite + Westside-rotaatio sopivat klassiseen voimanostokontekstiin; Edistynyt taso vaaditaan — ME-rotaation viikoittainen vaihto + 1RM-singletkin; 4 päivää/vk → sopii suoraan ME-Lower/ME-Upper/DE-Lower/DE-Upper -jakoon
    3. `single-maksimivoima` (Maksimivoima-blokki) — **conf 58**
        rationale: Päätavoite max-voima → maksimivoima-blokki on suoraan kohdistettu; Edellinen voimablokki → max-voima on jatkumo; Edistynyt taso sietää max-blokin neurokuormaa
- **Viikko-labelit:** vk1: Intensification I · vk2: Intensification II · vk3: Intensification III · vk4: Deload · vk5: Taper · vk6: Kisaviikko


### P4 — Nainen 30 v / 63 kg
- **VALITTU TYYLI:** `single-madcow-5x5` — Madcow 5×5
- **goal:** madcow5x5 · **skeleton:** createMadcow5x5Mesocycle · **weekCount:** 5
- **Top-3 kandidaatit (confidence):**
    1. `single-madcow-5x5` (Madcow 5×5) — **conf 50**
        rationale: Keskitaso (1-3 v) → Madcow 5×5 on kohdistettu intermediate-LP:lle; Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua; Yli 3 päivää/vk → Madcow:n HLM-pattern ei laajene helposti
    2. `single-gzcl-jt20` (GZCL Jacked & Tan 2.0) — **conf 50**
        rationale: Voima/yleinen voima + 12 vk strukturoitu T1/T2/T3-tier-rakenne tukee progressiota; Keskitaso+ pystyy hyödyntämään LSAMRAP-progressiota tarkasti
    3. `single-maksimivoima` (Maksimivoima-blokki) — **conf 48**
        rationale: Päätavoite max-voima → maksimivoima-blokki on suoraan kohdistettu; Edellinen voimablokki → max-voima on jatkumo
- **Viikko-labelit:** vk1: Vk1 (92.5% 5RM) · vk2: Vk2 (95.0% 5RM) · vk3: Vk3 (97.5% 5RM) · vk4: Vk4 (100% 5RM) · vk5: Vk5 PR-yritys (102.5%+ 5RM)


### P5 — Mies 56 v / 88 kg
- **VALITTU TYYLI:** `single-yhdistelma` — Perusjakso (Ma/Pe/No)
- **goal:** yhdistelma · **skeleton:** createDefaultMesocycle · **weekCount:** 6
- **Top-3 kandidaatit (confidence):**
    1. `single-yhdistelma` (Perusjakso (Ma/Pe/No)) — **conf 65**
        rationale: Yleinen voima ja terveys → perusjakso kattaa kaikki ominaisuudet; Aloittelijalle perusjakso on koulutuksellisesti paras (kaikki ominaisuudet kosketuksissa); Tulet pois ohjelmattomasta vaiheesta → laajapohjainen yhdistelmäjakso rakentaa kaiken pohjan
    2. `single-siirtyma` (Siirtymäjakso (GPP)) — **conf 40**
        rationale: Tulet pois ohjelmattomasta vaiheesta → GPP rakentaa pohjan ennen voima/hypertrofiablokkia; Aloittelijalle GPP on koulutuksellisesti hyvä pohja
    3. `single-madcow-5x5` (Madcow 5×5) — **conf 40**
        rationale: Aloittelija → Madcow toimii LP-ohjelmana, mutta StrongLifts/Starting Strength on yleensä parempi alkuun; Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua; Tulet pois ohjelmattomasta/deloadista → Madcow:n lineaarinen progressio palauttaa pohjan
- **Viikko-labelit:** vk1: Adaptaatio · vk2: Loading · vk3: Overreach · vk4: Deload


### P6 — Mies 35 v / 90 kg
- **VALITTU TYYLI:** `single-madcow-5x5` — Madcow 5×5
- **goal:** madcow5x5 · **skeleton:** createMadcow5x5Mesocycle · **weekCount:** 5
- **Top-3 kandidaatit (confidence):**
    1. `single-madcow-5x5` (Madcow 5×5) — **conf 50**
        rationale: Keskitaso (1-3 v) → Madcow 5×5 on kohdistettu intermediate-LP:lle; Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua; Yli 3 päivää/vk → Madcow:n HLM-pattern ei laajene helposti
    2. `single-gzcl-jt20` (GZCL Jacked & Tan 2.0) — **conf 50**
        rationale: Voima/yleinen voima + 12 vk strukturoitu T1/T2/T3-tier-rakenne tukee progressiota; Keskitaso+ pystyy hyödyntämään LSAMRAP-progressiota tarkasti
    3. `single-yhdistelma` (Perusjakso (Ma/Pe/No)) — **conf 45**
        rationale: Yleinen voima ja terveys → perusjakso kattaa kaikki ominaisuudet; Keskitaso+ saa silti pohjarakennukseen perusjaksosta arvoa
- **Viikko-labelit:** vk1: Vk1 (92.5% 5RM) · vk2: Vk2 (95.0% 5RM) · vk3: Vk3 (97.5% 5RM) · vk4: Vk4 (100% 5RM) · vk5: Vk5 PR-yritys (102.5%+ 5RM)


### P7 — (known-negative A) Mies 19 v / 72 kg
- **VALITTU TYYLI:** `single-yhdistelma` — Perusjakso (Ma/Pe/No)
- **goal:** yhdistelma · **skeleton:** createDefaultMesocycle · **weekCount:** 6
- **Top-3 kandidaatit (confidence):**
    1. `single-yhdistelma` (Perusjakso (Ma/Pe/No)) — **conf 40**
        rationale: Yleisesti soveltuva — jos selvää kapeaa kohdetta ei ole, perusjakso on turvallinen valinta; Aloittelijalle perusjakso on koulutuksellisesti paras (kaikki ominaisuudet kosketuksissa); Tulet pois ohjelmattomasta vaiheesta → laajapohjainen yhdistelmäjakso rakentaa kaiken pohjan
    2. `single-siirtyma` (Siirtymäjakso (GPP)) — **conf 40**
        rationale: Tulet pois ohjelmattomasta vaiheesta → GPP rakentaa pohjan ennen voima/hypertrofiablokkia; Aloittelijalle GPP on koulutuksellisesti hyvä pohja
    3. `single-madcow-5x5` (Madcow 5×5) — **conf 35**
        rationale: Aloittelija → Madcow toimii LP-ohjelmana, mutta StrongLifts/Starting Strength on yleensä parempi alkuun; Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua; Tulet pois ohjelmattomasta/deloadista → Madcow:n lineaarinen progressio palauttaa pohjan; Yli 3 päivää/vk → Madcow:n HLM-pattern ei laajene helposti
- **Viikko-labelit:** vk1: Adaptaatio · vk2: Loading · vk3: Overreach · vk4: Deload


### P8 — (known-negative B) Nainen 41 v / 70 kg
- **VALITTU TYYLI:** `single-yhdistelma` — Perusjakso (Ma/Pe/No)
- **goal:** yhdistelma · **skeleton:** createDefaultMesocycle · **weekCount:** 6
- **Top-3 kandidaatit (confidence):**
    1. `single-yhdistelma` (Perusjakso (Ma/Pe/No)) — **conf 40**
        rationale: Yleisesti soveltuva — jos selvää kapeaa kohdetta ei ole, perusjakso on turvallinen valinta; Aloittelijalle perusjakso on koulutuksellisesti paras (kaikki ominaisuudet kosketuksissa); Tulet pois ohjelmattomasta vaiheesta → laajapohjainen yhdistelmäjakso rakentaa kaiken pohjan
    2. `single-siirtyma` (Siirtymäjakso (GPP)) — **conf 40**
        rationale: Tulet pois ohjelmattomasta vaiheesta → GPP rakentaa pohjan ennen voima/hypertrofiablokkia; Aloittelijalle GPP on koulutuksellisesti hyvä pohja
    3. `single-madcow-5x5` (Madcow 5×5) — **conf 40**
        rationale: Aloittelija → Madcow toimii LP-ohjelmana, mutta StrongLifts/Starting Strength on yleensä parempi alkuun; Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua; Tulet pois ohjelmattomasta/deloadista → Madcow:n lineaarinen progressio palauttaa pohjan
- **Viikko-labelit:** vk1: Adaptaatio · vk2: Loading · vk3: Overreach · vk4: Deload


### P9 — Mies 30 v / 85 kg
- **VALITTU TYYLI:** `single-minimalist-rp` — Minimalist RP (Israetel)
- **goal:** minimalistRP · **skeleton:** createMinimalistRPMesocycle · **weekCount:** 4
- **Top-3 kandidaatit (confidence):**
    1. `single-minimalist-rp` (Minimalist RP (Israetel)) — **conf 40**
        rationale: Hypertrofia-tavoite → RP volume landmarks suoraan kohdistettu
    2. `single-hypertrofia` (Hypertrofiajakso) — **conf 35**
        rationale: Päätavoite hypertrofia → hypertrofia-blokki suoraan kohdistettu; Edellinen blokki oli jo hypertrofia → seuraava luonteva askel on voima
    3. `single-dup` (DUP — undulating) — **conf 35**
        rationale: Keskitaso+ pystyy hyödyntämään päivittäin vaihtuvaa intensiteettiä; Yleinen voima / hypertrofia → DUP sopii kun haluat varioida ärsykettä; Aiempi perinteinen blokki → DUP voi tarjota variointia
- **Viikko-labelit:** vk1: RP Min vk1 (MEV) · vk2: RP Min vk2 (MEV+2 sets) · vk3: RP Min vk3 (lähellä MAV) · vk4: RP Min vk4 (deload)


### P10 — Nainen 34 v / 64 kg
- **VALITTU TYYLI:** `single-madcow-5x5` — Madcow 5×5
- **goal:** madcow5x5 · **skeleton:** createMadcow5x5Mesocycle · **weekCount:** 5
- **Top-3 kandidaatit (confidence):**
    1. `single-madcow-5x5` (Madcow 5×5) — **conf 70**
        rationale: Keskitaso (1-3 v) → Madcow 5×5 on kohdistettu intermediate-LP:lle; Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua; Tulet pois ohjelmattomasta/deloadista → Madcow:n lineaarinen progressio palauttaa pohjan; 3 päivää/vk → sopii suoraan Madcow:n Ma/Ke/Pe-rakenteeseen
    2. `single-gzcl-jt20` (GZCL Jacked & Tan 2.0) — **conf 60**
        rationale: Voima/yleinen voima + 12 vk strukturoitu T1/T2/T3-tier-rakenne tukee progressiota; Keskitaso+ pystyy hyödyntämään LSAMRAP-progressiota tarkasti; Tulet pois ohjelmattomasta/deloadista → J&T 2.0:n RM-target 10→1 antaa hyvän progressioväylän
    3. `single-yhdistelma` (Perusjakso (Ma/Pe/No)) — **conf 55**
        rationale: Yleinen voima ja terveys → perusjakso kattaa kaikki ominaisuudet; Keskitaso+ saa silti pohjarakennukseen perusjaksosta arvoa; Tulet pois ohjelmattomasta vaiheesta → laajapohjainen yhdistelmäjakso rakentaa kaiken pohjan
- **Viikko-labelit:** vk1: Vk1 (92.5% 5RM) · vk2: Vk2 (95.0% 5RM) · vk3: Vk3 (97.5% 5RM) · vk4: Vk4 (100% 5RM) · vk5: Vk5 PR-yritys (102.5%+ 5RM)


### P11 — Mies 25 v / 78 kg
- **VALITTU TYYLI:** `single-yhdistelma` — Perusjakso (Ma/Pe/No)
- **goal:** yhdistelma · **skeleton:** createDefaultMesocycle · **weekCount:** 6
- **Top-3 kandidaatit (confidence):**
    1. `single-yhdistelma` (Perusjakso (Ma/Pe/No)) — **conf 65**
        rationale: Yleinen voima ja terveys → perusjakso kattaa kaikki ominaisuudet; Aloittelijalle perusjakso on koulutuksellisesti paras (kaikki ominaisuudet kosketuksissa); Tulet pois ohjelmattomasta vaiheesta → laajapohjainen yhdistelmäjakso rakentaa kaiken pohjan
    2. `single-madcow-5x5` (Madcow 5×5) — **conf 45**
        rationale: Aloittelija → Madcow toimii LP-ohjelmana, mutta StrongLifts/Starting Strength on yleensä parempi alkuun; Voima/yleinen voima → Madcow:n 5×5-ramp tukee voimakasvua; Tulet pois ohjelmattomasta/deloadista → Madcow:n lineaarinen progressio palauttaa pohjan; 3 päivää/vk → sopii suoraan Madcow:n Ma/Ke/Pe-rakenteeseen
    3. `single-siirtyma` (Siirtymäjakso (GPP)) — **conf 40**
        rationale: Tulet pois ohjelmattomasta vaiheesta → GPP rakentaa pohjan ennen voima/hypertrofiablokkia; Aloittelijalle GPP on koulutuksellisesti hyvä pohja
- **Viikko-labelit:** vk1: Adaptaatio · vk2: Loading · vk3: Overreach · vk4: Deload



---
---

# SECTION C — 33Q-VEKTORIT + NEUTRAALIVALINNAT (syöte-audit)

### P1
> Mies 28 v, <6 kk tausta, yleisvoima, täysi sali, 3 pv/vk, ei rajoitteita.

**33Q-vektori:**
```json
{
 "q01_age": 28,
 "q02_sex": "male",
 "q03_weight": 80,
 "q06_yearsTraining": 0.5,
 "q07_autoregYears": 0,
 "q08_selfLevel": "beginner",
 "q09_sport": "hybrid",
 "q29_recentBlock": "off_program",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "general_strength",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "barbell_rack",
  "pullup_bar",
  "dip_station",
  "cable_machine",
  "machines",
  "dumbbells"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "fullbody",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 3,
  "sessionLengthMinutes": 60
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- q03_weight 80: paino ei annettu → tyypillinen mies
- q04/q05 (pituus/rasva-%): valinnaiset, jätetty pois
- q06 0.5: '<6 kk' → 0,5 vuotta
- q09 hybrid: 'yleisvoima' ei ole nimetty laji → hybrid (ei spesifiä lajia)
- q29 off_program: aloittelija ilman aiempaa rakenteellista blokkia
- q24 session 60 min: ei annettu → tyypillinen
- q21 fullbody: 3 pv yleisvoima → fullbody (ei-sl smartDefault-henki)
- q15/q18/q19/q20 none, q23 auto, q25 vara_loose (q07<3), q33 balanced: ei mainittu → neutraali

---

### P2
> Mies 32 v, 2–3 v, hypertrofia, koti (käsipainot ≤32 kg, leuanvetotanko, kuminauhat; ei penkkiä/tankoa), 4 pv/vk.

**33Q-vektori:**
```json
{
 "q01_age": 32,
 "q02_sex": "male",
 "q03_weight": 85,
 "q06_yearsTraining": 2.5,
 "q07_autoregYears": 0,
 "q08_selfLevel": "intermediate",
 "q09_sport": "hypertrophy",
 "q29_recentBlock": "hypertrophy",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "hypertrophy",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "dumbbells",
  "pullup_bar"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "upper_lower",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 4,
  "sessionLengthMinutes": 60
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- q03_weight 85: ei annettu → tyypillinen
- q06 2.5: '2–3 v' → keskiarvo
- q08 intermediate: 2–3 v
- q29 hypertrophy: säännöllinen hypertrofia-treenaaja → tyypillinen edellinen blokki
- q17 [dumbbells, pullup_bar]: KUMINAUHAT ei vastaa mitään equipment-koodia (barbell_rack/pullup_bar/dip_station/cable_machine/machines/dumbbells/rings) → jätetty pois; käsipainot + leuanvetotanko mukana; EI penkkiä/tankoa
- q21 upper_lower: 4 pv hypertrofia → tyypillinen jako (ei mainittu)
- q24 session 60: ei annettu
- q15/q18/q19/q20 none, q23 auto, q25 vara_loose, q33 balanced: neutraali

---

### P3
> Mies 27 v / 75 kg, 5+ v (2 v lajispesifistä), streetlifting (painollinen leuanveto/dippi/kyykky + muscle-up), kisa 10–12 vk päässä, sali + vyöpaino, 4–5 pv/vk, edistyneet suhteelliset voimatasot.

**33Q-vektori:**
```json
{
 "q01_age": 27,
 "q02_sex": "male",
 "q03_weight": 75,
 "q06_yearsTraining": 5,
 "q07_autoregYears": 2,
 "q08_selfLevel": "advanced",
 "q09_sport": "streetlifting",
 "q29_recentBlock": "strength",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "streetlifting_with_explosive_components",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q27_targetDate": "2026-08-30",
 "q28_targetType": "competition",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "barbell_rack",
  "pullup_bar",
  "dip_station",
  "cable_machine",
  "machines",
  "dumbbells"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "upper_lower",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 4,
  "sessionLengthMinutes": 90
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- q07 2: '2 v lajispesifistä' → autoregulaatiovuodet ~2
- q29 strength: kisaan 10–12 vk → edellinen blokki tyypillisesti voima/intensifikaatio ennen peakingia
- q26 []: 'edistyneet suhteelliset voimatasot' mutta EI numeroita → PR-lista tyhjä (HUOM: jotkin tyylit, esim. Wendler/Sheiko, käyttävät PR-dataa precheckissä → tyhjä vaikuttaa)
- q27 2026-08-30: 'kisa 10–12 vk' → ~11 vk startista 2026-06-14 (≈77 pv)
- q24 daysPerWeek 4: '4–5 pv' → valittu 4 (alaraja); session 90 min (advanced, ei annettu)
- q21 upper_lower: sl 4–5 pv → smartDefault-henki (ei mainittu)
- q23 auto: advanced volyymipref ei mainittu
- q25 vara_loose: q07=2<3 → sääntö antaa vara_loose (advanced kisaaja käyttäisi ehkä calibrated — neutraali rule-mukainen)
- q15/q18/q19/q20 none, q33 balanced: ei mainittu → neutraali

---

### P4
> Nainen 30 v / 63 kg, ~2 v, maksimivoima, täysi sali, 3–4 pv/vk.

**33Q-vektori:**
```json
{
 "q01_age": 30,
 "q02_sex": "female",
 "q03_weight": 63,
 "q06_yearsTraining": 2,
 "q07_autoregYears": 0,
 "q08_selfLevel": "intermediate",
 "q09_sport": "hybrid",
 "q29_recentBlock": "strength",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "max_1RM",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "barbell_rack",
  "pullup_bar",
  "dip_station",
  "cable_machine",
  "machines",
  "dumbbells"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "upper_lower",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 4,
  "sessionLengthMinutes": 75
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- q06 2: '~2 v'
- q09 hybrid: 'maksimivoima' on tavoite, ei nimetty laji → hybrid (q12=max_1RM kantaa tavoitteen)
- q29 strength: max-tavoite → edellinen blokki tyypillisesti voima
- q24 daysPerWeek 4: '3–4 pv' → valittu 4 (yläraja); session 75 (ei annettu)
- q21 upper_lower: 4 pv → tyypillinen (ei mainittu)
- q26 []: ei PR-numeroita annettu
- q15/q18/q19/q20 none, q23 auto, q25 vara_loose, q33 balanced: neutraali. HUOM q02=female → sexModifier (Huiberts 2024) voi aktivoitua mapperissa

---

### P5
> Mies 56 v / 88 kg, epäsäännöllinen ~1 v (tauolla), terveys/voima/toimintakyky, täysi sali, 2–3 pv/vk, itse raportoitu palautumisrajoite (hidas palautuminen, työstressi, vaihteleva uni).

**33Q-vektori:**
```json
{
 "q01_age": 56,
 "q02_sex": "male",
 "q03_weight": 88,
 "q06_yearsTraining": 1,
 "q07_autoregYears": 0,
 "q08_selfLevel": "beginner",
 "q09_sport": "hybrid",
 "q29_recentBlock": "off_program",
 "q10_trainingBreakMonths": 2,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "general_strength",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "barbell_rack",
  "pullup_bar",
  "dip_station",
  "cable_machine",
  "machines",
  "dumbbells"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "fullbody",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 2,
  "sessionLengthMinutes": 60
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced",
 "q34_recoveryStatus": "heikko"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- q06 1: 'epäsäännöllinen ~1 v'; q08 beginner (epäsäännöllinen ~1 v)
- q09 hybrid: terveys/toimintakyky → ei nimetty laji
- q29 off_program + q10 2 kk: 'tauolla' → ei aktiivista ohjelmaa, ~2 kk tauko
- q12 general_strength: terveys/voima/toimintakyky → yleisvoima
- q24 daysPerWeek 2: '2–3 pv' → valittu 2 (alaraja, palautumisrajoite); session 60
- q21 fullbody: 2 pv → fullbody
- ★ PALAUTUMISRAJOITE (hidas palautuminen / työstressi / vaihteleva uni) → q34_recoveryStatus='heikko' (Pilari 3 R2 lisäsi q34-palautumiskysymyksen, 33Q). pickRecoveryCapacity → 'heikko' → applyRecoveryScalar (apuliike-volyymi −30 %) + applyStartingCapacity (aloitusintensiteetti submaks.). Aiemmin (32Q) tämä captureoitui vain epäsuorasti iästä → korjattu.
- q13 none (ei mobility, vaikka 'toimintakyky' voisi viitata siihen → neutraali none); q15/q18/q19/q20 none, q23 auto, q25 vara_loose, q33 balanced: neutraali

---

### P6
> Mies 35 v / 90 kg, 3 v, voima+massa, täysi sali, 3–4 pv/vk, krooninen olkapääkipu (kivulias kaari pystypunnerruksessa + syvässä dipissä).

**33Q-vektori:**
```json
{
 "q01_age": 35,
 "q02_sex": "male",
 "q03_weight": 90,
 "q06_yearsTraining": 3,
 "q07_autoregYears": 0,
 "q08_selfLevel": "intermediate",
 "q09_sport": "hybrid",
 "q29_recentBlock": "strength",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [
  {
   "area": "olkapää",
   "type": "modified",
   "note": "krooninen kipu — kivulias kaari pystypunnerruksessa ja syvässä dipissä"
  }
 ],
 "q26_personalRecords": [],
 "q12_primaryGoal": "general_strength",
 "q13_secondaryGoal": "hypertrophy",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "barbell_rack",
  "pullup_bar",
  "dip_station",
  "cable_machine",
  "machines",
  "dumbbells"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "upper_lower",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 4,
  "sessionLengthMinutes": 75
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- q06 3; q08 intermediate (3 v)
- q09 hybrid: 'voima+massa' → ei nimetty laji
- q12 general_strength + q13 hypertrophy: 'voima+massa' → voima primary, massa secondary
- q29 strength: tyypillinen edellinen blokki
- q11 olkapää/modified: krooninen olkapääkipu kirjattu vamma-listaan (type modified, ei absolute → atletti voi treenata muokaten). Spesifit kipuliikkeet (pystypunnerrus, syvä dippi) note-kentässä
- q22 []: ei erikseen kiellettyjä liikkeitä — kipuliikkeet captureoituvat q11-vamman kautta (HUOM: vaihtoehtoisesti pystypunnerrus/dippi voisi listata q22:een; neutraali = luotetaan q11-vammalogiikkaan)
- q24 daysPerWeek 4 ('3–4' → yläraja); session 75
- q21 upper_lower (4 pv); q15/q18/q19/q20 none, q23 auto, q25 vara_loose, q33 balanced: neutraali

---

### P7
> (known-negative A) Mies 19 v / 72 kg, 2 kk tausta, toive: 'maksimivoima nopeasti' + halu 6–7 pv/vk + raskaat maksiminostot, korkea motivaatio, ei rajoitteita.

**33Q-vektori:**
```json
{
 "q01_age": 19,
 "q02_sex": "male",
 "q03_weight": 72,
 "q06_yearsTraining": 0.2,
 "q07_autoregYears": 0,
 "q08_selfLevel": "beginner",
 "q09_sport": "powerlifting",
 "q29_recentBlock": "off_program",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "max_1RM",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "barbell_rack",
  "pullup_bar",
  "dip_station",
  "cable_machine",
  "machines",
  "dumbbells"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "ppl",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 6,
  "sessionLengthMinutes": 60
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "challenging"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- q06 0.2: '2 kk' → ~0,17–0,2 v; q08 beginner
- q09 powerlifting: 'raskaat maksiminostot' + max-tavoite → max-voimalaji
- q29 off_program: 2 kk, juuri aloittanut
- q12 max_1RM: 'maksimivoima nopeasti'
- q24 daysPerWeek 6: 'halu 6–7 pv' → valittu 6 (alaraja)
- q21 ppl: 6 pv korkea frekvenssi → tyypillinen jako (ei mainittu)
- q33 challenging: 'korkea motivaatio' + 'nopeasti' + 'raskaat maksiminostot' → aggressiivinen engine-bias (persona määrittää)
- q17 full gym: 'raskaat maksiminostot' edellyttää tankoa → täysi sali (ei eksplisiittisesti annettu)
- ★ KNOWN-NEGATIVE: 2 kk aloittelija haluaa max-voimaa nopeasti + 6 pv/vk raskaita maksinostoja. W2 arvioi pidättääkö wizard (beginner-sopiva tyyli) vai myötäileekö ylimitoitettua syötettä.

---

### P8
> (known-negative B) Nainen 41 v / 70 kg, <1 v, ristiriitainen vektori: SEKÄ kilpailutason maksimivoima ETTÄ maksimaalinen lihaskasvu nopeasti; 2 pv/vk × 30 min; ei välineitä (koti); heikko palautuminen.

**33Q-vektori:**
```json
{
 "q01_age": 41,
 "q02_sex": "female",
 "q03_weight": 70,
 "q06_yearsTraining": 0.5,
 "q07_autoregYears": 0,
 "q08_selfLevel": "beginner",
 "q09_sport": "hybrid",
 "q29_recentBlock": "off_program",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "max_1RM",
 "q13_secondaryGoal": "hypertrophy",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "pullup_bar"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "fullbody",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 2,
  "sessionLengthMinutes": 30
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced",
 "q34_recoveryStatus": "heikko"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- q06 0.5: '<1 v'; q08 beginner
- q09 hybrid: ristiriitainen tavoite → ei nimetty laji
- q12 max_1RM + q13 hypertrophy: 'SEKÄ kilpailutason maksimivoima ETTÄ maksimaalinen lihaskasvu' → schema pakottaa primary/secondary-jaon (q12 single-choice) → max ensisijaiseksi, hypertrofia toissijaiseksi
- ★ q17 ['pullup_bar'] PAKOTETTU: alkuperäinen [] ('ei välineitä, koti') → wizard HYLKÄSI validoinnissa: 'q17_equipment: valitse vähintään yksi kaluston tyyppi'. DIAGNOSTINEN LÖYDÖS W2:lle: wizard EI salli tyhjää kalustoa → puhdas kehonpaino-koti ei ole ilmaistavissa. Pakotettu minimivalinta = pullup_bar (edustavin kehonpaino-koti-minimi) jotta ohjelma generoituu arvioitavaksi.
- q29 off_program: <1 v
- q24: 2 pv × 30 min (annettu)
- q21 fullbody (2 pv); q23 auto, q25 vara_loose, q33 balanced: neutraali
- ★ KNOWN-NEGATIVE: 'heikko palautuminen' → q34_recoveryStatus='heikko' (Pilari 3 R2, 33Q) → pickRecoveryCapacity 'heikko' → apuliike-volyymi −30 % + aloitusintensiteetti submaks. 2×30 min/vk + ei välineitä + beginner + ristiriitainen max+hypertrofia 'nopeasti' = realistisesti mahdoton tavoiteyhdistelmä. W2 arvioi tunnistaako/käsitteleekö wizard ristiriidan + resurssirajat.

---

### P9
> Mies 30 v / 85 kg, 2 v, hypertrofia, KOTI vain käsipainot (ei leukatankoa/tankoa), 4 pv/vk.

**33Q-vektori:**
```json
{
 "q01_age": 30,
 "q02_sex": "male",
 "q03_weight": 85,
 "q06_yearsTraining": 2,
 "q07_autoregYears": 0,
 "q08_selfLevel": "intermediate",
 "q09_sport": "hypertrophy",
 "q29_recentBlock": "hypertrophy",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "hypertrophy",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "dumbbells"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "upper_lower",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 4,
  "sessionLengthMinutes": 60
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- ★ KATTAVUUSLISÄYS (b): vain käsipainot — aiemmin ylävartalo-pyyhkiytyminen (0 push/pull). Odotus: push (käsipainopenkki) + legs (Bulgarian); veto rajoittunut → rehellinen advisory.
- q17 ['dumbbells']: ei leukatankoa eikä tankoa → veto vaatii leukatangon/renkaat (katalogissa ei käsipaino-soutua, OBS-053)
- q08 intermediate (2 v); q29 hypertrophy; q21 upper_lower; muut neutraali

---

### P10
> Nainen 34 v / 64 kg, 3 v, yleisvoima, KOTI vain renkaat/TRX, 3 pv/vk.

**33Q-vektori:**
```json
{
 "q01_age": 34,
 "q02_sex": "female",
 "q03_weight": 64,
 "q06_yearsTraining": 3,
 "q07_autoregYears": 0,
 "q08_selfLevel": "intermediate",
 "q09_sport": "hybrid",
 "q29_recentBlock": "off_program",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "general_strength",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "rings"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "fullbody",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 3,
  "sessionLengthMinutes": 50
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- ★ KATTAVUUSLISÄYS (b): vain renkaat — renkaat mahdollistaisivat veto/työnnön, mutta katalogissa ei rengasliikkeitä (OBS-053). Degradoituu kehonpaino-push (HSPU) + legs + advisory. EI keksittyä liikettä.
- q17 ['rings']: aito kalusto-vuoto-tapaus jonka adversariaali löysi
- q12 general_strength; q21 fullbody (3 pv); muut neutraali

---

### P11
> Mies 25 v / 78 kg, <1 v, yleiskunto, KOTI ei välineitä (pelkkä kehonpaino), 3 pv/vk.

**33Q-vektori:**
```json
{
 "q01_age": 25,
 "q02_sex": "male",
 "q03_weight": 78,
 "q06_yearsTraining": 0.5,
 "q07_autoregYears": 0,
 "q08_selfLevel": "beginner",
 "q09_sport": "hybrid",
 "q29_recentBlock": "off_program",
 "q10_trainingBreakMonths": 0,
 "q11_injuries": [],
 "q26_personalRecords": [],
 "q12_primaryGoal": "general_strength",
 "q13_secondaryGoal": "none",
 "q14_cutting": "no",
 "q15_aerobicModality": "none",
 "q17_equipment": [
  "bodyweight"
 ],
 "q18_hrvDevice": "none",
 "q19_vbtDevice": "none",
 "q20_sleepTracker": "none",
 "q21_splitPreference": "fullbody",
 "q22_avoidedExercises": [],
 "q23_volumePref": "auto",
 "q24_frequency": {
  "daysPerWeek": 3,
  "sessionLengthMinutes": 45
 },
 "q31_preferredDays": [],
 "q25_rpePrecision": "vara_loose",
 "q33_aggressivenessDefault": "balanced"
}
```
**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**
- ★ KATTAVUUSLISÄYS (b): 'bodyweight' (C4:n lisäämä arvo) kanonisessa käytössään — aiemmin pyyhki ylävartalon. Odotus: push (HSPU) + legs (Bulgarian) + advisory ettei veto onnistu ilman leukatankoa/renkaita.
- q17 ['bodyweight']: ei välineitä → veto vaatii leukatangon/renkaat (rehellinen advisory)
- q08 beginner (<1 v); q21 fullbody (3 pv); muut neutraali

