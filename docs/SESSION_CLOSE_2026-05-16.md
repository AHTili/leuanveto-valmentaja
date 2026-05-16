# Session-sulku 2026-05-16 — vaiheen 8 turvaverkko valmis + kriittinen löydös

> **Tarkoitus:** itsekantava session-sulkudokumentti, jonka seuraava Claude Code -sessio (tai uusi Claude-instanssi) lukee ja jatkaa saumattomasti. EI vaadi tämän keskustelun käsiksipääsyä.
>
> **Tämä on viimeinen ajo sessiossa** — konteksti täyttyy. Tärkein tuotos on tämä sulkudokumentti + sen koodi-commitit.
>
> **Lue rinnan:** [`docs/NYKYTILA_2026-05-16.md`](NYKYTILA_2026-05-16.md) sisältää aiemman snapshot:in vaiheen 8 strategisesta prosessista. Tämä dokumentti **täydentää** sen muutoksilla, ei toista sisältöä.

---

## 1. TEHTY tässä sessiossa

### Turvaverkko valmis — kaksi paikallista committia

**`7b6832e`** — *infra(vaihe-8-turvaverkko): CLAUDE.md + invariantit + Stop hook + AC-skeema + backlog*
Sisältö:
- `CLAUDE.md` (114 r) — repon spec-ankkuri jokaiselle Claude-sessiolle (vaihe 4)
- `docs/TUTKIMUS_INVARIANTIT.md` (alkuperäinen versio) — invarianttitaulukko (vaihe 3)
- `.claude/settings.json` (15 r) — Stop hook joka ajaa smoke + Akselin pilot-regressio (vaihe 6)
- `docs/ACCEPTANCE_CRITERIA_SKEEMA.md` (133 r) — AC-formaatti (vaihe 2)
- `docs/BACKLOG_VAIHE_1_2.md` (118 r, laajennettu) — ENG-1 … ENG-15
- `.gitignore` (`.claude/*` + `!.claude/settings.json` -syntaksi)

**`2beddb4`** — *infra(vaihe-8-turvaverkko): ENG-14 INVARIANT_VIOLATION + ENG-15 edge-case-generator*
Sisältö:
- `tools/engine-pilot/lib/audit-baselines.mjs` — lisätty kolme invarianttia:
  - `TIER_PROGRESSION_MULT_BASELINES` (Latella 2020)
  - `FAILURE_DROP_BASELINE` (Refalo 2023)
  - `REP1_MPV_SLOPE_BASELINE` (Sánchez-Moreno 2017 + Jukic 2024)
- `tools/engine-pilot/lib/audit-engine.mjs` — uusi `auditInvariants()` -funktio, integroitu `auditTrace()`:iin. Kattaa A (VL-cap), C (Deload Δ%), D (Tier-mult), G (Slot-Vx). EI INVARIANTTIKATETTA: B, E, F, H — listattu eksplisiittisesti header-kommentissa.
- `tools/engine-pilot/lib/edge-case-generator.mjs` — 55 case-yhdistelmää 6 invariantille
- `docs/TUTKIMUS_INVARIANTIT.md` — refaktoroitu drift-vapaaksi: numerot poistettu, vakioviittaukset audit-baselines.mjs:ään

### Päätös A-päätös (yksi totuuden lähde -konflikti)

`audit-baselines.mjs` on kanoninen lähde kaikille invarianteille. `TUTKIMUS_INVARIANTIT.md` on ihmislukija-dokumentaatio joka VIITTAA siihen (ei toista numeroita). grep-verifiointi: 0 numeerista arvoa jäljellä vakioviittausten vieressä — drift eliminoitu rakenteellisesti.

### Tila

- Branch: `claude/serene-morse-a5b3f8`
- HEAD: `2beddb4`
- **EI pushattu** mainiin
- 5 untracked-tiedostoa paikallisesti: `SYVATUTKIMUS_ALPHA_*`, `SYVATUTKIMUS_BETA_*`, `VAIHE_8_AUDIT_JA_AUKOT.md`, `VAIHE_8_TAYDELLINEN_PAKETTI.md`, `NYKYTILA_2026-05-16.md`

---

## 2. KRIITTINEN LÖYDÖS — ENG-14 havaintotesti = KYLLÄ

ENG-14 emittoi INVARIANT_VIOLATION-flageja **jo nykykoodilla**, ennen mitään β-implementointia. **6/8 pilot-profiilissa** esiintyy rajaylityksiä.

### Profiilikohtainen rajaylitystaulukko

| Profiili | Määrä | Invariantit | Yhteinen kaava |
|---|---|---|---|
| akseli-elite-streetlifter | 4 | C × 4 | streetlifting_16w vk 12 deload Δ% = −12% ja −13,5% (vaadittu ≤ −15%) |
| beginner-male-60 | 5 | A × 5 | default-mesocycle: vk1 d5 foundation VL-cap = 12,5% (vaadittu ≥ 25%) + vk2-3 d1/d3 intensity VL-cap = 30% (vaadittu ≤ 15%) |
| cut-aggressive-700kcal | 6 | A × 5, C × 1 | sama default-kaava + vk4 d5 deload Δ% = −14,23% |
| returner-3mo-break | 6 | A × 5, C × 1 | sama default-kaava + vk4 d5 deload Δ% = −9,5% |
| shoulder-limit-no-ohp | 5 | A × 5 | sama default-mesocycle kaava |
| uncalibrated-intermediate | 5 | A × 5 | sama default-mesocycle kaava |
| elite-female-hypertrophy-60 | 0 | — | puhdas |
| pl-advanced-male-75 | 0 | — | puhdas |

### Juurisyy 1 — Default-mesocyclen phase ↔ VL-cap -ristiriita (5/6 profiilissa)

Kaava on **identtinen** kaikissa 5 default-mesocycle-profiilissa:

| Skenaario | Engine ehdottaa | Tutkimusrange | Ero |
|---|---|---|---|
| default-meso vk1 d5 (auditin "foundation"-luokitus) | 12,5 % | 25–35 % | liian aggressiivinen |
| default-meso vk2–3 d1/d3 (auditin "intensity"-luokitus) | 30 % | 10–15 % | liian lievä |

**Hypoteesi:** engine.js:n VL-cap-päätös pohjautuu eri logiikkaan kuin auditin `deriveBlockPhase`. dayType (esim. d5 = "speed" tyypillisesti) + viikkolabel + säätökoodi yhdessä tuottavat arvoja jotka eivät vastaa puhdasta Pareja-Blanco-phase-jakoa. Yksityiskohdat juurisyy 1 -arvostelmadata-osiossa ([alla osio 3.1](#31-juurisyy-1-akselin-harjoitusteoreettinen-arvostelmadata)).

### Juurisyy 2 — Akselin streetlifting_16w vk12 deload (vain Akselilla)

| Skenaario | Engine antaa | Helms 2018 -range | Ero |
|---|---|---|---|
| streetlifting_16w vk12 deload | Δ% = −12 % ja −13,5 % (4 päivää) | ≥ −15 % (alueessa [−30%, −15%]) | leikkaus liian pieni |

Vaihtoehdot ratkaisuun: korjata preset, lisätä `deloadApplied: false`-tyyppinen meta-opt-out (samalla logiikalla kuin `tierProgressionApplied: false`), tai siirtää tämä juurisyy 1:n kanssa samaan "tuntematon drift" -kategoriaan. Päätös Akselin muistitarkistuksen jälkeen.

---

## 3. AVOIMET PÄÄTÖSKOHDAT — Akselin ratkaistavissa ennen jatkoa

### 3.1 Juurisyy 1: Akselin harjoitusteoreettinen arvostelmadata

Kanoninen esitys yllä osiossa 2. Kolme hypoteesia eroteltuna, kukin harjoitusteoreettisena kysymyksenä — **Akseli vastaa avoimesti, Claude Code EI suosittele yhtä**:

**(a) Auditin `deriveBlockPhase` liian heuristinen default-mesoille?**
Onko default-meson vk1 d5 todellisuudessa foundation-tyyppinen päivä jonka KUULUISI noudattaa 25–35 % VL-cappia, jolloin engine on väärässä? Mitä vk1 d5:n pitäisi harjoitusteoreettisesti olla default-mesossa?

**(b) Engine.js:n VL-cap-mapping default-mesoissa tarkoituksella eri?**
Onko 12,5 % / 30 % oikea käyttäytyminen jostain harjoitusteoreettisesta syystä jonka vain Akseli tietää (esim. default-meso on yleisluontoisen voiman-/hypertrofian/yhdistelmän hybridi joka ei seuraa puhdasta Pareja-Blanco-phase-jakoa), jolloin invariantti ei sovellu default-mesoihin sellaisenaan?

**(c) Molemmat eroavat hyvällä syyllä, mutta auditin pitäisi luokitella default-meson skenaariot eri tavalla?**
Eli default-mesolle oma phase-taksonomia (esim. "general_loading_d5" ≠ "foundation", "general_loading_d1d3" ≠ "intensity"), joka mappaa eri rangeihin tai jolla ei ole tutkimusrangea lainkaan?

Tämä Akselin vastaus on **eliittikäyttäjälähtöinen 10/10-vaatimusankkuri konkretisoituna** — vaiheen 1 audit-kolmiankkuroitu jonka kolmas ankkuri on tämä.

### 3.2 Juurisyy 2: Akselin muistitarkistus

Onko Akselin streetlifting_16w vk12 deload Δ% = −12…−13,5 % **tietoinen poikkeama** Helms 2018 -rangesta?

- **Jos tietoinen** → opt-out-merkintä mesometaaan (esim. `deloadApplied: false` samalla logiikalla kuin `tierProgressionApplied: false`). Tämä on saman luokituksen poikkeus kuin tier-progression Akselin presetissä.
- **Jos Akseli ei muista perustetta** → siirtyy juurisyy 1:n kanssa samaan "tuntematon drift" -kategoriaan ja vaatii saman arvostelmaratkaisun.

Claude Code EI ratkaise tätä eikä suosittele kumpaakaan.

### 3.3 ENG-14:n behavior (riippuu juurisyy 1:n ratkaisusta)

Kun juurisyy 1 ratkeaa, päätetään myös ENG-14:n strategia:
- **Pidetään tiukkana** (nykyinen) — jokainen rajaylitys laukaisee INVARIANT_VIOLATION:n, käyttäjä korjaa pohjan.
- **Opt-out default-mesoille** — esim. jos `mesocycleType === "default"`, tarkista vain tier-mult ja deload-syvyys, mutta jätä VL-cap pois. Vaatii eksplisiittisen `defaultMesoVlCapApplied: false`-meta-opt-out:n.
- **Default-meson oma taksonomia** (vaihtoehto 3.1c) — uusi `DEFAULT_MESO_VL_CAP_BASELINES`-vakio audit-baselines.mjs:ään, joka kuvaa default-meson omat (todennäköisesti suotuisammat) rangit.

---

## 4. SEURAAVAT ASKELEET JÄRJESTYKSESSÄ

> **KRIITTINEN PERIAATE:** 8a:ta EI saa aloittaa ennen kuin nykypohja on invarianttien sisällä. Oppivan mallin rakentaminen invariantteja rikkovan pohjan päälle on koko prosessin estämä vikatila — naiivi posterior-päivitys ottaisi vääriltä rajoilta lähtien biased priorit ja terävöityisi väärään suuntaan.

1. **Akseli antaa juurisyy 1 -arvostelmadatan** (3.1: a/b/c) **+ juurisyy 2 -muistivahvistuksen** (3.2).
2. **Juurisyy 1 + 2 ratkaistaan** Akselin vastausten mukaan:
   - Koodikorjaus (engine.js VL-cap-logiikka tai deload-preset), TAI
   - Eksplisiittinen opt-out (mesometa-flagi + ENG-14:n haarautuminen sen perusteella), TAI
   - Default-meson oma taksonomia (audit-baselines.mjs-laajennus + ENG-14:n haarautuminen).
3. **Nykypohja saatetaan invarianttien sisään** TAI poikkeamat opt-outataan tiedostettuina. Akselin pilot-regressio palauttaa 0 INVARIANT_VIOLATION:ia kun tämä on tehty.
4. **VASTA SITTEN** arvioidaan α/β-tulokset (jotka palaavat ulkoisista kanavista omalla aikataulullaan).
5. **VASTA SITTEN** vaihe 8 (8a oppiva malli + 8b liikevalintamoottori) erillisinä /goal-kierroksina. Kumpikin erillisillä regressio-tarkistuksilla.

---

## 5. α/β -tila

Kehotteet pyörivät ulkoisissa kanavissa (Perplexity / ChatGPT Deep Research / Claude.ai web-haulla). Tämä on **rinnakkainen, EI estävä** työvirta — ei vaadi toimia ennen kuin tulokset palaavat. Akselin juurisyy 1/2 -ratkaisu ei riipu α/β:sta eikä päinvastoin.

Kehotetiedostot paikallisesti:
- `docs/SYVATUTKIMUS_ALPHA_liikevalintamoottori.md` (hiottu, kopioitu ulkoiseen kanavaan)
- `docs/SYVATUTKIMUS_BETA_adaptiivinen_oppimismalli.md` (hiottu, kopioitu ulkoiseen kanavaan)

---

## 6. Käynnistysohje seuraavalle Claude Code -sessiolle

Uuden Claude Code -session (tai uuden Claude-instanssin) **ensimmäinen toimi:**

1. **Lue tämä tiedosto** kokonaan + `docs/NYKYTILA_2026-05-16.md` + `CLAUDE.md`. Nämä kolme antavat kaiken tarvittavan kontekstin ilman tätä keskustelua.
2. **Lue commitin viestit** `7b6832e` ja `2beddb4` — niissä on tarkat sisältökuvaukset ja päätökset.
3. **Tarkista Akselin vastaus** kohtiin 3.1 (juurisyy 1 -arvostelmadata a/b/c) ja 3.2 (juurisyy 2 -muistivahvistus). **EI TOIMI ENNEN TÄTÄ.**
4. **Akselin vastauksen mukaan:**
   - Jos 3.1 = (a) → engine.js VL-cap-logiikan tutkinta + korjaus (uusi /goal-kierros)
   - Jos 3.1 = (b) → audit-baselines.mjs:n `DEFAULT_MESO_VL_CAP_BASELINES` -laajennus + ENG-14 haarautuu
   - Jos 3.1 = (c) → audit-engine.mjs `deriveBlockPhase` -refaktorointi default-mesoille omalla taksonomialla
   - Jos 3.2 = "tietoinen" → mesometaaan `deloadApplied: false`-flagi + ENG-14 haarautuu samalla logiikalla kuin tierProgressionApplied
   - Jos 3.2 = "en muista" → sama luokitus kuin juurisyy 1
5. **Aja Akselin pilot-regressio** ratkaisun jälkeen. Vaatimus: 0 INVARIANT_VIOLATION-flagia 8/8 profiililla.
6. **Vasta sitten** alkaa α/β-tulosten implementointi (jos ne ovat palanneet) tai odotetaan niitä.

---

## 7. Liite: paikalliset tiedostot tämän session jälkeen

### Committed (paikallisesti, EI pushattu)

| Commit | Sisältö |
|---|---|
| `2beddb4` | ENG-14 + ENG-15 + audit-baselines.mjs 3 uutta + TUTKIMUS_INVARIANTIT.md drift-vapaa |
| `7b6832e` | Turvaverkko-pohja (CLAUDE.md + invariantit + Stop hook + AC + backlog + .gitignore) |
| `985da4e` ja aiemmat | v4.51.x (esittely.html, q31_preferredDays, …) |

### Untracked (paikalliset työtiedostot)

| Tiedosto | Tarkoitus |
|---|---|
| `docs/SYVATUTKIMUS_ALPHA_liikevalintamoottori.md` | α-kehote ulkoiseen tutkimukseen, kopioitu kanavaan |
| `docs/SYVATUTKIMUS_BETA_adaptiivinen_oppimismalli.md` | β-kehote, kopioitu kanavaan |
| `docs/VAIHE_8_AUDIT_JA_AUKOT.md` | Auditdokumentti (Askel A + B), sisäinen viite |
| `docs/VAIHE_8_TAYDELLINEN_PAKETTI.md` | Master-dokumentti (kokoaa α/β/audit yhteen) |
| `docs/NYKYTILA_2026-05-16.md` | Aiempi snapshot (lue tämän rinnalla) |
| `docs/SESSION_CLOSE_2026-05-16.md` | **Tämä dokumentti** |

### Tärkeät pysyvät dokumentit (committed)

| Tiedosto | Tarkoitus |
|---|---|
| `CLAUDE.md` | Repon spec-ankkuri jokaiselle Claude-sessiolle |
| `docs/TUTKIMUS_INVARIANTIT.md` | Ihmislukija-doc, viittaa audit-baselines.mjs:ään |
| `tools/engine-pilot/lib/audit-baselines.mjs` | **Yksi totuuden lähde** kaikille invarianteille |
| `tools/engine-pilot/lib/audit-engine.mjs` | Sisältää `auditInvariants()` ENG-14 |
| `tools/engine-pilot/lib/edge-case-generator.mjs` | ENG-15, 55 boundary-case |
| `.claude/settings.json` | Stop hook (smoke + Akseli pilot) |
| `docs/ACCEPTANCE_CRITERIA_SKEEMA.md` | AC-formaatti tulevia /goal-kierroksia varten |
| `docs/BACKLOG_VAIHE_1_2.md` | ENG-1 … ENG-15 + osittaiset vaiheet 1–7 |

---

**Tämä session-sulku on viimeinen aktiivinen ajo tässä Claude Code -sessiossa.** Pysyvä tila on commit-historiassa ja docs/-tiedostoissa. Seuraava sessio jatkaa kohdasta 6 yllä.
