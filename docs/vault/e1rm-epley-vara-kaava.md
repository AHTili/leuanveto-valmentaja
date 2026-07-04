# Epley+Vara-kaava (system vs accessory)

**Status:** TOTEUTETTU-HEURISTIIKKA
**Lähteet:** Epley 1985 (alkuperäiskaava); DiStasio 2014, Reynolds 2006 (kaavatarkkuus paras 1–5 toistolla); Zourdos 2016 / Helms 2018 (RIR-asteikon validiteetti — Vx = RIR-identiteetti)
**Koodiankkurit:** engine.js:227 (`e1rmSystem`), engine.js:238 (`e1rmExternal`), engine.js:249 (`e1rmAccessory`), engine.js:270 (`vRepsToExpectedPct`), test-runner.js:200, test-runner.js:318

LeVe:n koko e1RM-estimointi lepää yhdellä kaavaperheellä: Epley laajennettuna Varalla (Vx). Efektiiviset toistot = tehdyt toistot + varassa olleet toistot, eli kaava ekstrapoloi failure-pisteeseen jota atletti ei koskaan tehnyt:

- **System-kuormaiset liikkeet** (Lisäpainoleuanveto, dippi, MU): `e1RM_sys = (BW + lisäpaino) × (1 + (reps + Vx) / 30)` — keho on osa siirrettyä massaa, joten BW lisätään ennen kaavaa ja vähennetään external-arvoa näytettäessä (`e1rmExternal`).
- **Tanko- ja aidot apuliikkeet** (Takakyykky, soudut, käännöt): `e1RM = kuorma × (1 + (reps + Vx) / 30)` ilman BW-additiota (`e1rmAccessory`).

Haaran valinta kulkee keskitetyn `isSystemLoadMovement`-totuuslähteen kautta (engine.js:7060–7062) — boolean-arvaus signature-tasolla oli aiemmin bugilähde (test-runner.js:4604: `e1rmSystem(91, 125, 6, 5) = 295,2` kyykylle oli väärin).

**Vara-defaultit eroavat haarojen välillä tarkoituksella:** `e1rmSystem` käyttää `vara ?? 1` (atletilla grinding-taipumus — tyhjä raportointi tarkoittaa tyypillisesti V0–V1, engine.js:230–231), `e1rmAccessory` käyttää `vara ?? 0` (puhdas Epley). Kalibrointisarjoilla vanha AMRAP-data (`actualVx === 0`) redusoituu puhtaaksi Epleyksi ilman Vx-biasta (engine.js:4464–4466).

**Käänteissuunta** on sama kaava peilattuna: `vRepsToExpectedPct(maxReps) = 1 / (1 + maxReps/30)` antaa odotetun %1RM:n kun tiedetään reps + Vx (L46 "A puhtaana" -päätös: EI tier-parametria, Brzycki ja conservative-cross-check rajattu pois — sisäinen konsistenssi ennen kaavakirjoa). Tätä käyttävät kuormaresoluutio (engine.js:5198–5205) ja PLAN_BASED_E1RM-gate.

**Tunnetut rajat:** Epley+Vara aliarvioi e1RM:n korkeilla toistoilla ~10–15 % (4×6 V3 @120 → 156 vs todellinen ~175; engine.js:4611–4614) ja voi yliarvioida V3+-sarjoista (+20 % seedistä; engine.js:4757–4758). Nämä kompensoidaan rakenteellisesti: PLAN_BASED_E1RM ohittaa kaavan perfect executionilla, inflaatio/deflaatio-capit rajaa molemmat suunnat, kalibrointiprotokolla mittaa kaavan tarkkuusalueella (2–3 toistoa). K3-1-laajennus lisää sarjapositio-krediitin (+0,5 eff-toistoa/positio, cap 2,5 — engine.js:289–305): väsyneenä tehty myöhäinen sarja todistaa korkeamman tuoreen kapasiteetin.

**8a-prior:** Kandidaatti `learnedEpleyDivisor` (jakaja 30). Prior = 30. Tutkimusrajaa EI ole vielä ankkuroitu — kaavavertailukirjallisuus (Epley vs Brzycki vs Wathan, DiStasio 2014) tukee jakajan yksilövariaatiota mutta ±2 SD -range vaatii oman syvätutkimuskierroksen ennen 8a-toteutusta. Toinen kandidaatti: system-haaran Vx-default (`?? 1`) on atletti-spesifi raportointibias-prior, luonteva opittava per-atletti [0; 1,5] -välillä.

**Linkit:** [[progressio-computeprogressiontarget]], [[progressio-across-set-vasymysmalli]], [[progressio-heavy-first-reankkurointi]], [[readiness-vara-kanava]]
