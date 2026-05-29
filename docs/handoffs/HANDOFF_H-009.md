# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täytti osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Ratifioitu Coworkissa 2026-05-29 (laadittu leve-handoff-laadinta-skillillä). Aloita §8:n session-aloitusprotokollasta + Selkäranka 1–2 ENNEN muutoksia.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-009` (P1a — coherence-patteriston ensimmäinen viipale) |
| Tyyppi | `scope-expansion` (uusi audit-kyvykkyys: detektori, ei korjaus) |
| Laadittu | 2026-05-29 / Cowork-sessio (ratifioitu) |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssiin | M1-pohja-puhtaus / vaiheen 19 (pohja-puhtaus 8/8) alustus — laajentaa audit-kanavajoukkoa. EI siirrä NYT-merkkiä (vaihe 18). |
| Pohja-HEAD | `a09fe81` · APP_VERSION `4.52.17` |

---

## 1. Tavoite

Institutionalisoi H-008-bugiluokka **koneellisesti havaittavaksi**, niin ettei mikään liike voi enää hiljaa näyttää toisen liikkeen e1RM:stä johdettua kuormaa (kuten +82 MU). Haluttu lopputila: audit-engine emittoi gate-tason flagin jos **näytetyn primary-liikkeen kuorma johdetaan eri liikkeen datasta** (pmid ≠ näytetty primary-slot-liike). Tämä on detektori — H-008:n juuri on jo korjattu (110a63d); tämä assertio olisi napannut sen automaattisesti ja estää luokan paluun riippumatta mekanismista (slot-keying / päivä-resoluutio / cfg).

Tämä on P1:n **ensimmäinen viipale**. Data-flow-field-presence-assertiot (SP-1, OBS-008/009/016) = erillinen P1b; syöteavaruus-generaattorin laajennus = erillinen P1c.

## 2. Acceptance criteria

> Tyyppi `scope-expansion`: mitattavat hyväksyntäehdot + scope-aita. Mittari-ensin (Selkäranka 6): known-positive + known-negative, aritmetiikka käsin.

- **A1 — Identity-coherence-assertio (ydin, tuning-vapaa).** Uusi assertio audit-engine.mjs:ään (esim. `PRIMARY_MOVEMENT_IDENTITY_MISMATCH`): kun e1RM / `targetExternalLoad` johdetaan movementId X:n top/cal-seteistä mutta näytetty primary-slot-liike on Y, ja **X ≠ Y** → flag. Tämä on H-008:n täsmä-invariantti, binäärinen, ei kynnystä.
- **A2 — Magnitude-plausibility (sekundaari, valinnainen).** BW-ankkuroidulle ("system") liikkeelle: näytetty external-target uskottavassa ikkunassa suhteessa liikkeen **OMAAN** e1RM-externaliin (suhteellinen, ei absoluuttinen nanny). Taso WARN. Jos A1 kattaa luokan riittävästi, A2 voidaan jättää pois — Code arvioi.
- **A3 — Mittari-ensin (known-pos + known-neg).**
  - *Known-positive:* toistettava tilanne pmid=Lisäpainoleuanveto, näytetty=Muscle-up (H-008:n pre-fix-mekanismi tai synteettinen) → A1 **laukeaa**. Aritmetiikka: external e1RM ~93 (leuanveto) vs MU oma seed ~2.5 → identity-mismatch.
  - *Known-negative:* normaali MU-päivä pmid=MU=näytetty (target ≈ 2.5) → A1 **EI laukea**.
  - Molemmat verifioitava käsin ENNEN gate-luottamusta.
- **A4 — Regressio (additiivinen).** Assertio on read-only havainto — **ei muuta kuorma-laskentaa**. Pilot bittitarkka (64/64, baseline-audit-flagit ennallaan) JA **assertio EI laukea puhtaalla baseline-ajolla** (ei false-positiveja 10 profiilissa). Jos laukeaa baselinella → logiikka/kynnys väärä, **STOP + raportoi**.
- **A5 — Gate.** Stop hook 5/5 · selain-testit (?test=1) pass · A4-regressiotesti joka lukitsee assertion (known-pos laukeaa, known-neg ei) · spec→koodi-diff scope-aidan sisällä.

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** ei kosketa VL-cap/deload/tier/e1RM-kaavoja. reunaehto (c) (BW-johdonmukaisuus) on motiivina. Assertio ei saa olla absoluuttinen nanny-cap.
- **Mitä EI kosketa (test-riippuvuus-verifioitava):**
  - Kuorma-laskenta (recommend, e1RM-kaavat engine.js) — assertio on additiivinen havainto.
  - Data-flow-field-presence-assertiot (OBS-008/009/016) → **P1b** (erillinen).
  - Syöteavaruus-generaattorin laajennus (MU-as-primary-solut) → **P1c** (erillinen). *Riippuvuus: jos generaattori ei tuota MU-as-primary-solua, A3:n known-pos vaatii synteettisen test-casen — ks. avoin kysymys 2.*
  - Kyykky +102 (cross-ref, eri juuri) → P2.
  - H-008:n korjaus (110a63d) — ei korjata uudelleen.
- **Tekniset:** vanilla JS, ES-modulit, ei uusia npm-riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** HEAD `a09fe81`, haara `main`, session-tree puhdas (pre-existing untracked PLAN.md + csv sallittu). Luo `git branch backup-pre-h009-a09fe81` ennen muutoksia.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (tyyppi `scope-expansion`).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (Akseli ratifioinut 2026-05-29; älä re-litigoi):**
- **P1 viipaloidaan:** P1a (tämä, identity-coherence) ensin; P1b (data-flow-field-presence) + P1c (generaattori-laajennus) erillisinä handoffeina. Fokusoitu aloitus = pienin riski, nopein anti-regressio.
- **Identity-pohjainen, ei nanny:** ydin-assertio on "pmid === näytetty liike" (tuning-vapaa), ei absoluuttinen kuorma-cap (CLAUDE.md §6, v4 §9.2).
- **Detektori, ei korjaus:** H-008 jo korjasi juuren (110a63d). Tämä lisää koneellisen havaitsemisen jotta luokka ei palaa.

**Hylätyt vaihtoehdot:**
- *Absoluuttinen kuorma-cap* (esim. "MU external ≤ X kg") — nanny-riski, ei falsifioitava liiketyyppi-agnostisesti.
- *Pelkkä magnitude-ratio ilman identity-tarkistusta* — ratio-kynnys vaatii virityksen ja voi jättää välistä; identity-mismatch on tarkempi ja tuning-vapaa.

**Konteksti:** H-008-juuri oli päivä-resoluution eriparisuus (pmid=dippi/leuanveto ≠ näytetty MU). Identity-assertio nappaa **koko luokan** riippumatta mekanismista (slot-keying, day-resolution, cfg-fallback). Code:n A1-diagnostiikassa MU-ratio oli ~29–31× — magnitude-signaali oli olemassa ad-hoc-dumppina, ei pysyvänä porttina; tämä handoff tekee siitä pysyvän.

## 6. Avoimet kysymykset (Code kysyy ENNEN toteutusta)

1. **Assertion taso:** ERROR/gate-blocking (Stop hook kaatuu identity-mismatchista) vai WARN? Cowork-suositus: **ERROR** A1:lle (identity-mismatch on aina bugi), **WARN** A2:lle (magnitude). Vahvista.
2. **Known-positive-repro:** tuottaako nykyinen pilot-harness MU-as-primary-solun (jossa identity voi mismatchata), vai tarvitaanko synteettinen test-case A3:n known-positiveen? (Jos generaattori ei kata, synteettinen riittää P1a:lle; täysi solukattavuus → P1c.)
3. **Sijainti:** mihin pmid===näytetty-liike -tarkistus parhaiten istuu — `audit-engine.mjs` (per-session-audit) vai `trace-capture.mjs`? Tarvitseeko se sekä pmid:n että näytetyn slot-liikkeen samaan trace-pisteeseen?

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-29 |
| Muuttuneet tiedostot | `engine.js` (detectPrimaryMovementIdentityMismatch-funktio + export + APP_VERSION-konteksti), `test-runner.js` (testPrimaryMovementIdentityMismatch + import + rekisteröinti), `sw.js` (APP_VERSION 4.52.17→4.52.18 + kommenttijono), `index.html` (meta-tag 4.52.18), `docs/backlog.md` (OBS-004 P1c). Commit: `a12e766`. |
| Tehdyt päätökset | **A1-taso: funktio (ei audit-engine-gate, ei ERROR/WARN-gate).** Poikkesin Cowork-suosituksesta (audit-engine ERROR) **ajonaikaisen A4-esteen takia**: pilot-harness scenario-runner buildCtx syöttää kiinteän catalog[0]-pmid:n → **72 identity-mismatch-solua** (harness-artefakti) → gate laukeaisi A4-false-positiveja. Akseli ratifioi **Polku 1** (funktio + synteettinen test-lukko). **Sijainti: engine.js-apufunktio** (Q3) — tuning-vapaa, ei kytketty recommend():iin eikä audit-engineen. **A2 (magnitude) jätetty pois** (Q: A1 identity kattaa H-008-luokan tuning-vapaasti, A2 olisi viritettävä → P1c-arvio). **Assertion taso (Q1): ei gate vaan testattu funktio** P1a:ssa; ERROR/gate → P1c kun harness korjattu. **Known-pos-repro (Q2): synteettinen** (pilot-solut ovat harness-artefakteja, eivät puhtaita known-positiveja). |
| Validointi | **Stop hook PASS:** (1) koodi kääntyy + smoke PASSED, (2) ?test=1 **742 passed / 3 failed** vs baseline 724/727 → **+11 PASS** (testPrimaryMovementIdentityMismatch known-pos/neg/edge), **0 uutta failia** (3 failia VBT×2 + T9 SAFE pre-existing, vahvistettu H-008 git stash -baseline-vertailussa), (3) pilot **64/64, 0 virhettä, 136 audit-flagia (🐛 84, ⚠️ 4, 💬 0, 📋 48) — bittitarkka** (A4: funktio dormantti, ei aja pilotia → 0 false-positivea), (4) A1+A3 toteutettu + mittari-ensin (known-pos laukeaa, known-neg ei, graceful edge), (5) spec→koodi-diff scope-aidan sisällä (additiivinen funktio + testi, ei recommend()/e1RM-kaava-muutosta). |
| Jäi auki | **P1c** (OBS-004): (1) scenario-runner buildCtx -fideliteetti (kiinteä→päiväkohtainen pmid), (2) identity-funktion johdotus audit-engine-gateen, (3) uusi pilot-baseline (72 solua muuttuu, intended). **Push odottaa Akselin ratifiointia.** |
| Seuraava askel | Akseli ratifioi push origin/main (`a12e766` + sulku). Sitten **P1c** (elävä gate + harness-uskollisuus), **P1b** (data-flow-field-presence-assertiot OBS-008/009/016), **P2** (Paused squat +102 cross-ref). NYT-merkki säilyy vaihe 18 (H-009 = audit-kanavajoukon laajennus, ei R-vaihe-siirto). |

---

**H-009/P1a-arc commit-ketju:**

| Commit | Kuvaus |
| --- | --- |
| `a12e766` | feat(H-009-P1a): identity-coherence-detektori (funktio + synteettinen testi, Polku 1, APP_VERSION 4.52.18) |
| *(sulku)* | docs(H-009): §7 + arkistointi + backlog OBS-004 + ROADMAP-tilannekuva |

Peruutusankkuri: `git reset --hard backup-pre-h009-a09fe81` (säilyy). Off-repo-diagnostiikka: `C:\Users\aksel\leve-test-runner\h009-pilot-mismatch.mjs` (72-mismatch-kvantifiointi, ei repossa).
