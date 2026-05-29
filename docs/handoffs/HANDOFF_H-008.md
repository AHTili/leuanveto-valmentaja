# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täytti osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Ratifioitu Coworkissa 2026-05-29. Aloita §8:n session-aloitusprotokollasta + Selkäranka 1–2 (PRE-FLIGHT + peruutusankkuri) ENNEN mitään muutosta.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-008` |
| Tyyppi | `debug` (confirm-then-fix; korjaus on kohdennettu refactor baseline-keyingissä) |
| Laadittu | 2026-05-29 / Cowork-sessio (ratifioitu) |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssiin | M1-pohja-puhtaus (reunaehto (a) -alustus); EI siirrä NYT-merkkiä (vaihe 18 säilyy) |
| Pohja-HEAD | `7023313` · APP_VERSION `4.52.16` |

**Tyyppiperuste:** `debug` — acceptance muodossa "toistettava repro → odotettu vs. todettu käytös". Korjaus (A2) on kohdennettu refactor (e1RM-baselinen avain), mutta työ käynnistyy juurisyyn **vahvistuksesta**, ei oletuksesta.

---

## 1. Tavoite

Ankkuroidut liikkeet (erit. Muscle-up) eivät saa näyttää atleetille **perittyä, fyysisesti absurdia ulkoista kuormaa**. Kuvassa (2026-05-29, Koti-näkymä) Muscle-up ⭐ näytti `+82 kg` työkuormana 3×1 V2 — fyysisesti mahdoton MU:lle; samaan aikaan Sykli-näkymä näytti saman MU:n oikein (`seed 2.5 kg`). Haluttu lopputila: kun näytetty primary-liike on Muscle-up, sen e1RM ja `targetExternalLoad` perustuvat **kyseisen liikkeen** dataan, ei toisen liikkeen (Lisäpainoleuanveto) baselineen; jos omaa luotettavaa baselinea ei ole, näyttö degradoituu siististi (ei perittyä numeroa).

Tämä korjaa **juuren**. Koneellinen detektori samalle bugiluokalle (load-coherence -auditkanava) on erillinen handoff H-009/P1 — EI tässä.

---

## 2. Acceptance criteria

> Muoto: repro → odotettu vs. todettu. A1 on **STOP-gate**: vahvistus ENNEN korjausta (Selkäranka 5–6).

**A1 — VAHVISTA juurisyy (read-only, STOP-gate).** Toista tilanne jossa Muscle-up näkyy ⭐-primaryna `+82 kg`:lla (Akselin IndexedDB-export TAI uusi pilot-cell joka asettaa MU:n primary-slottiin). Dumppaa kyseiselle laskennalle:
- `primarySlotMeta.defaultMovementName` ja `primaryMovementId` (engine.js:3880, 3877)
- `getCfgBaselineForMovement()`-tulos: `movName`, `source`, `value` (engine.js:657–678, kutsu 4181)
- `E1RM_COMPUTED`-trace: `source`, `e1rmExternal`, `e1rmSystem` (engine.js:4316)
- `ceilingSource` (engine.js:4215/4242) + lopullinen `targetExternalLoad` (engine.js:4577/4689)

**Odotettu (hypoteesi):** jokin näistä paljastaa että e1RM resolvoituu **Lisäpainoleuanvedon** baselineen (`leukaExtKg` ~85–95 tai leuanveto-historia) vaikka näytetty liike on Muscle-up → `external = systemTarget − bw ≈ +82`. *Aritmetiikka: +82 → systemTarget 173 → e1RM_system ≈190 → e1RM_external ≈99 = painollisen leuanvedon suuruusluokka.* **Todettu:** raportoi tarkat arvot. **Jos juurisyy ≠ tämä (esim. MU:lla on oma slotti + oma ohut historia joka infloituu) → STOP, älä korjaa, raportoi todellinen mekanismi.**

**A1b — Kyykky-ristiintarkistus (read-only).** Dumppaa sama Paused squat (`+102 kg`) -laskennalle. Vahvista että juuri on **eri** (external-liike, ei BW-additio; epäilyt: deload/readiness-`deltaPct` tai Epley-aliarvio engine.js:4257). **Älä korjaa kyykkyä tässä handoffissa** — kirjaa löydös P2/H-009:ää varten (docs/backlog.md).

**A2 — KORJAA (vasta A1-vahvistuksen jälkeen).** e1RM-baseline ja `targetExternalLoad` keyataan **resolvoituun/näytettyyn primary-liikkeeseen** (movementId + nimi joka tosiasiassa renderöidään), ei mismatchattuun `slot.defaultMovementName`:hen. Jos resolvoidulla liikkeellä ei ole omaa luotettavaa baselinea (cfg puuttuu + historia < kynnys) → **graceful degradation**: ei kuorma-badgea / "kalibroi"-tila, EI toisen liikkeen perittyä arvoa.

**A3 — Regressio-odotus (eksplisiittinen, Selkäranka 6).** Korjaus saa muuttaa **vain MU-as-primary -kuormia** (tarkoitettu muutos). **Kaikkien muiden liikkeiden ja kaikkien 10 pilot-profiilin on pysyttävä bittitarkkoina.** Verifioi pilot-diff: jos mikä tahansa MUU liike kuin resolvoitu-MU-primary muuttuu → **STOP** (blast radius liian laaja, keying-fix vuotaa). *Huom: akseli-elite-streetlifter-profiilin primary vertikaaliveto on Lisäpainoleuanveto — jos MU ei esiinny pilotissa primaryna, odotettu pilot-diff = 0 muutosta; tämä on vahvistettava, ei oletettava.*

**A4 — Institutionalisoi.** Lisää minimaalinen deterministinen regressio-testi/scenario joka toistaa "MU-as-primary"-solun ja assertoi että näytetty kuorma on joko (a) MU:n omasta datasta johdettu uskottava arvo tai (b) degradoitu — EI peritty leuanveto-arvo. Estää regression (bugfix-hygienia; ei korvaa H-009/P1:n laajaa coherence-kattavuutta).

**A5 — Gate.** Stop hook 5/5 (smoke + bittitarkka pilot) · selain-testit (?test=1) pass · spec→koodi-diff scope-aidan (osio 3) sisällä · A1-raportti + A3-pilot-diff dokumentoitu osioon 7.

---

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** e1RM-laskenta (`e1rmSystem`/`e1rmExternal`, engine.js:227/238) säilyy ennallaan — korjaus koskee vain **mitä baselinea käytetään**, ei laskukaavaa. reunaehto (c) (BW-johdonmukaisuus) on motiivina. Ei kosketa VL-cap / deload / tier -invariantteja.
- **Mitä EI kosketa (test-riippuvuus-verifioitava ennen lukitusta):**
  - Load-coherence -auditkanava → H-009/P1 (tämä korjaa juuren, ei lisää detektoria).
  - `SYSTEM_LOAD_NAMES` / `isSystemLoadMovement` (engine.js:328–348) — luokitus on oikein, MU kuuluu "system":iin.
  - Paused squat `+102` -korjaus → P2/H-009 (eri juuri; A1b vain vahvistaa).
  - HRV-/primer-mekanismit, mikä tahansa muu liike kuin resolvoitu-primary-keying.
  - β-feature-mekanismit (vaiheet 18/20).
- **Tekniset:** vanilla JS, ES-modulit, ei uusia npm-riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** vahvista `git rev-parse HEAD` = `7023313`, haara `main`, session-tree puhdas (pre-existing untracked PLAN.md / CRLF-kohina sallittu, dokumentoi). Luo `git branch backup-pre-h008-7023313` ennen muutoksia. **Diagnostinen A1 on read-only** — peruutusankkuri tarvitaan vasta ennen A2:ta.

---

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (tyyppi `debug`, ei `block-tuning`).

---

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (Akseli ratifioinut 2026-05-29; älä re-litigoi):**
- **Confirm-then-fix:** A1 STOP-gate ennen A2 — juurisyy vahvistetaan ajonaikaisesti, ei korjata staattisen hypoteesin varassa.
- **Vain MU tässä:** kyykky +102 ja muut löydökset → P2/H-009.
- **Detektori erikseen:** load-coherence -auditkanava on H-009/P1. H-008 korjaa juuren; H-009 lisää koneellisen havaitsemisen.
- **M2 etenee rinnakkain** (vaiheet 18/20 oma rata) — ei tämän handoffin asia.

**Hylätyt vaihtoehdot:**
- *Absoluuttinen plausibility-clamp outputissa* (esim. "MU external ≤ X kg") — hylätty: nanny-riski (CLAUDE.md §6 "atletti = valmentaja, ei nanny"); korjaa oiretta ei juurta. Coherence-rajat (H-009) tehdään suhteellisina, liiketyyppi+cfg-ankkuroituina.
- *Korjaus ennen A1-vahvistusta* — hylätty (Selkäranka 5–6).

**Konteksti (verifioitu backup-datasta 2026-05-29):** Akselin bw = 89 kg (settings; calibration.bwKg=91 on kalibrointiankkuri). MU ei ole streetlifting-meson primary vertikaaliveto-slotissa (se on Lisäpainoleuanveto, engine.js:3439) → MU-as-primary syntyy LA-päivän / peaking-kontekstissa; A1 vahvistaa tarkan reitin.

---

## 6. Avoimet kysymykset (Code kysyy ENNEN toteutusta — ei arvaa)

1. **A1-repro:** Akselin IndexedDB-export vai uusi pilot-cell? (Jos export tarpeen, Akseli toimittaa. Mieti kumpi tuottaa luotettavamman repron MU-as-⭐-primary-tilasta.)
2. **A2-korjaussuunta riippuu A1:stä:** jos MU ON oma primary-slotti omalla ohuella historialla → fix = "MU oma cfg-baseline" vai "graceful degradation kunnes kalibroitu"? Päätä A1-löydöksen perusteella, raportoi valinta ennen toteutusta.
3. **Onko muita liikkeitä** joiden `slot.defaultMovementName` ≠ näytetty liike (sama keying-mismatch)? A1:n yhteydessä halpa tarkistus — jos on, kirjaa docs/backlog.md:hen (älä laajenna scopea ilman Akselin lupaa).

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-29 |
| A1-vahvistus | **Juurisyy ≠ alkuperäinen hypoteesi (cfg-baseline), raportoitu A1:ssä.** Todellinen mekanismi ajonaikaisesti vahvistettu Akselin backupista (`leve-coach-backup-2026-05-29.json`, aktiivinen meso `ce71a280` streetlifting_16w): **päivä-resoluution eriparisuus** index.html `getStreetliftingPrimaryMovement` (days.reduce, lähin-kumpaan-tahansa) vs engine.js `getTodayPlan` (forward-first). Perjantai 2026-05-29 (laitteen todayISO, dow5, ei omaa dayPlania vk5:ssä): getStreetlifting→Lisäpainodippi(TO), getTodayPlan→Muscle-up(LA) → primaryMovementId=dippi ≠ näytetty MU-slot → MU näytti dipin e1RM:n (101.8) → target 86.5 kg (Akselin kuvassa +82, ero=YELLOW vs GREEN). `source=median`, e1rmExternal=101.8 (dippi), ceilingSource ei aktivoitunut. getCfgBaselineForMovement EI ollut juuri (palauttaa MU:lle TASO 3 null). MU-historia: "Muscle-up eksentrinen" 15 settiä (vk1-4), "Muscle-up" 0 settiä (vk5+). |
| Muuttuneet tiedostot | `index.html` (getStreetliftingPrimaryMovement → getTodayPlan-resoluutio + APP_VERSION meta 4.52.17), `test-runner.js` (getTodayPlan-import + testGetTodayPlanForwardFirst + rekisteröinti), `sw.js` (APP_VERSION 4.52.16→4.52.17 + kommenttijono), `docs/backlog.md` (OBS-003: A1b + Q3 + H-009). Commit: `110a63d` (A2-korjaus + A4-testi). |
| Tehdyt päätökset | A2-korjaussuunta: getStreetliftingPrimaryMovement käyttää engine `getTodayPlan(mesocycle, weekNum, dow)` -resoluutiota oman days.find/reduce-logiikan sijaan → **yksi totuuslähde** → primaryMovementId === recommend():n renderöimä primary-slot kaikkina päivinä. **Korjauksen lokus index.html-only** (EI engine.js) → A3-blast-radius nolla (pilot ei käytä getStreetliftingPrimaryMovement-reittiä). Akselin ratifioima "lähde + olemassa olevat" tarkentui: (b) consumption-resoluutio riittää oireen korjaukseen; (a) slot.movementId-populointi jätettiin pois (olisi koskenut pilotia → A3-riski, eikä tarpeen koska getTodayPlan resolvoi nimellä). |
| Validointi | **Stop hook PASS:** (1) koodi kääntyy + smoke PASSED, (2) ?test=1 **731 passed / 3 failed** vs baseline **724/727** (git stash -vertailu HEAD 7023313) → **+7 PASS** (testGetTodayPlanForwardFirst), **0 uutta failia**; 3 failia (VBT 10 ankkuria, VBT promoted, T9 SAFE) ovat **pre-existing** (failaavat myös puhtaalla baselinella), (3) pilot **64/64 päivää, 0 virhettä, 136 audit-flagia (🐛 84, ⚠️ 4, 💬 0, 📋 48) — bittitarkka baseline** (A3 vahvistettu: engine.js koskematon → ei-MU-liikkeet ja kaikki 10 profiilia ennallaan), (4) A1-A4 toteutettu + ajonaikaisesti vahvistettu (pe→MU 2.5 kg, eksaktit ennallaan), (5) spec→koodi-diff scope-aidan sisällä. |
| Jäi auki | A1b (Paused squat +102, eri juuri = cross-ref) ja H-009/P1 (load-coherence-detektori) → kirjattu `docs/backlog.md` OBS-003. **Push odottaa Akselin ratifiointia** (HANDOFF: EI push autonomisesti). |
| Seuraava askel | Akseli ratifioi push origin/main (1 commit `110a63d` + sulku). Akseli verifioi puhelimella: SW päivittyy 4.52.17 → avaa perjantain (tai muun ei-eksakti-päivän) → MU näyttää 2.5 kg (ei +82). Sitten H-009/P1 (coherence-detektori) + P2 (Paused squat cross-ref). NYT-merkki ROADMAP säilyy vaihe 18 (H-008 ei R-vaihe-siirto). |

---

**H-008-arc commit-ketju:**

| Commit | Kuvaus |
| --- | --- |
| `110a63d` | fix(H-008-A2): getStreetliftingPrimaryMovement → getTodayPlan-resoluutio (korjaa MU +82, A4-testi, APP_VERSION 4.52.17) |
| *(sulku)* | docs(H-008): §7 + arkistointi + backlog OBS-003 + ROADMAP-tilannekuva |

Peruutusankkuri: `git reset --hard backup-pre-h008-7023313` (säilyy). Off-repo-diagnostiikka: `C:\Users\aksel\leve-test-runner\h008-*.mjs` (ei repossa).
