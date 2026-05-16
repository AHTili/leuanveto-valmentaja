# Juurisyy 1 — Akselin harjoitusteoreettinen arvostelmadata

> **Tarkoitus:** kysymyspatteri Akselille koodikontekstin kanssa. Tämä on vaiheen 1 audit-kolmiankkurin **kolmas ankkuri** (eliittikäyttäjälähtöinen 10/10-vaatimusasettelu) konkretisoituna.
>
> **Vaadittu päätös:** Akseli vastaa harjoitusteoreettisesti kohtiin (a), (b), (c). Claude Code EI suosittele yhtä — ratkaisu valitaan vastauksen mukaan.

---

## Kanoninen skenaarioesitys

**Identtinen kaava 5 default-mesocycle-profiilissa** (beginner-male-60, cut-aggressive-700kcal, returner-3mo-break, shoulder-limit-no-ohp, uncalibrated-intermediate). Ei toisteta dataa 5 kertaa — yksi taulukko:

| Skenaario | Engine ehdottaa | Tutkimusrange | Ero | Koodilogiikka joka tuottaa engine-arvon |
|---|---|---|---|---|
| default-meso **vk1 d5** (auditin "foundation"-luokitus) | **12,5 %** | 25–35 % | liian aggressiivinen | `engine.js:2914-2918` `vlCapForContext`: jos `dayType==="speed" && targetVx>=4` → `effectivePhase = "speed-strength"` → `VL_CAP_PER_BLOCK["speed-strength"] = 12,5 %`. Eli d5 = speed-day → speed-strength-cap. |
| default-meso **vk2-3 d1/d3** (auditin "intensity"-luokitus) | **30 %** | 10–15 % | liian lievä | `engine.js:2919-2921, 2960-2961` `vlCapForContext`: jos `blockPhase` ∈ ["foundation",…] → `VL_CAP_PER_BLOCK[blockPhase]`. Engine.js asettaa default-meson vk2-3:lle todennäköisesti `blockPhase="foundation"` → `30 %`. Mutta auditin `deriveBlockPhase` lukee vk-labelin (esim. "Loading"/"Overreach") ja luokittelee sen `"intensity"`-vaiheeksi. |

### Mistä ristiriita tulee

Engine.js ja audit-engine.mjs käyttävät **kahta erillistä phase-mappaustaksonomiaa**:

| Komponentti | Lähde | vk1 d5 → | vk2-3 d1/d3 → |
|---|---|---|---|
| `engine.js` `vlCapForContext` | `dayType` + `blockPhase` | `"speed-strength"` (12,5 %) | `"foundation"` (30 %) |
| `audit-engine.mjs` `deriveBlockPhase` | viikko-labelin teksti | `"foundation"` (audit-range 25–35 %) | `"intensity"` (audit-range 10–15 %) |

Eli kumpikin on **konsistentti omassa logiikassaan**, mutta ne pohjautuvat eri taksonomiaan. Kumpi on harjoitusteoreettisesti oikein default-mesossa — sitä kysymme Akselilta.

---

## Kolme hypoteesia — Akseli vastaa avoimesti

### Hypoteesi (a) — Auditin `deriveBlockPhase` on liian heuristinen

**Väite:** default-meson vk1 d5 on todellisuudessa foundation-tyyppinen päivä jonka KUULUISI noudattaa Pareja-Blanco 25–35 % VL-cappia (eikä speed-strength 12,5 %). Engine on tällöin väärässä — speed-day-detection on liian aggressiivinen default-mesossa. Audit on oikeassa, engine pitää korjata.

**Kysymys Akselille:** mitä vk1 d5:n pitäisi harjoitusteoreettisesti olla default-mesossa? Onko se aitoa speed-strength-päivää (jolloin 12,5 % on oikein), vai foundation-volyymi-päivää johon engine on virheellisesti soveltanut speed-strength-logiikkaa pelkän `dayType==="speed"` -lipun perusteella?

**Jos (a):** korjaus engine.js:ään — tarkennetaan speed-strength-aktivointi siten, että se vaatii enemmän kuin `dayType==="speed"` (esim. eksplisiittisen `skeleton.phaseHint==="speed-strength"`).

---

### Hypoteesi (b) — Engine on tarkoituksella eri, koska default-meso ei seuraa Pareja-Blanco-jakoa

**Väite:** 12,5 % / 30 % on oikea käyttäytyminen default-mesolle, koska default-meso on **yleisluontoinen voiman/hypertrofian/yhdistelmän hybridi**, joka ei seuraa puhtaita Pareja-Blanco-rangeja. Pareja-Blanco-tutkimusrangit pätevät erityisesti **erikoistuneisiin block-mesoeihin** (streetlifting_16w, hypertrofia-erikois, maksimivoima), ei yleisluontoiseen default-mesoon. Invariantti A ei sovellu default-mesoille sellaisenaan.

**Kysymys Akselille:** onko default-meso suunniteltu hybridiksi joka tarkoituksella poikkeaa Pareja-Blanco-rangeista? Mitä harjoitusteoreettista perustetta käytät tämän valinnan tueksi (esim. yleisharjoittelija ei tarvitse phase-eriytystä; tai hybridi-blokki vaatii erilaisen VL-stimulus-yhdistelmän)?

**Jos (b):** ei korjausta engine.js:ään. ENG-14:n auditInvariants haarautuu: jos `mesocycleType === "default"`, ohita VL-cap-tarkistus (mutta säilytä tier-mult, deload, slot-Vx). Vaatii eksplisiittisen `defaultMesoVlCapApplied: false`-meta-flagin tai erillisen `defaultMeso`-poikkeus-listan ENG-14:ssä.

---

### Hypoteesi (c) — Molemmat eroavat hyvällä syyllä, mutta auditin pitäisi luokitella eri tavalla

**Väite:** Sekä engine että audit ovat osittain oikeassa, mutta nykyinen ristiriita syntyy siitä että **default-mesolle ei ole omaa phase-taksonomiaa**. Default-mesolla on omat vaiheet (esim. "general_loading_d5", "general_loading_d1d3") jotka eivät ole sama asia kuin Pareja-Blanco-blokin "foundation"/"intensity". Tarvitaan oma taksonomia + omat rangit.

**Kysymys Akselille:** olisiko default-mesolle järkevää määrittää oma phase-taksonomia (esim. 3–4 vaihetta jotka eivät vastaa Pareja-Blanco-vaiheita) ja omat rangit audit-baselines.mjs:ään (`DEFAULT_MESO_VL_CAP_BASELINES`)? Mitkä olisivat kohtuulliset rangit ja perustelut?

**Jos (c):** audit-baselines.mjs:n laajennus (`DEFAULT_MESO_VL_CAP_BASELINES` per vaihe) + `audit-engine.mjs` `deriveBlockPhase` -refaktorointi default-mesoille omalla taksonomialla + ENG-14 haarautuu mesocycle-tyypin perusteella.

---

## Vastausta varten — tarvittava harjoitusteoreettinen sanasto

- **`dayType="speed"`**: engine.js triggeröi tällä speed-strength-fenomenologian (Behrmann 2025-tyyppinen räjähtävä progressio, alhainen VL-cap).
- **`blockPhase`**: engine.js infers tämän mesocyclen tyypistä ja viikko-asemoinnista. Default-mesolla todennäköisesti "foundation" vk1-3:lle ja "deload" vk4:lle.
- **`deriveBlockPhase` audit**: lukee viikko-labelin tekstin (esim. "Loading", "Overreach", "Volyymipohja") ja mappaa sen Pareja-Blanco-vaiheeseen.
- **Pareja-Blanco-blokki**: erikoistunut blokki jossa kunkin vaiheen VL-cap on tutkimusperustaisesti asetettu (foundation 30 %, strength 17,5 %, intensity 12,5 %, peaking 7,5 %).

---

## Mitä tapahtuu Akselin vastauksen jälkeen

1. **Hypoteesi (a) valittu** → engine.js korjaus (uusi /goal-kierros, koskettaa `vlCapForContext`)
2. **Hypoteesi (b) valittu** → audit-engine.mjs `auditInvariants`-laajennus joka skippaa VL-cap:in default-mesolle + meta-flagi
3. **Hypoteesi (c) valittu** → audit-baselines.mjs laajennus uudella vakioilla + `deriveBlockPhase`-refaktorointi
4. **Mikä tahansa valittu** → Akselin pilot-regressio palauttaa 0 INVARIANT_VIOLATION 8/8 profiililla, ENNEN kuin vaihe 8 (8a) saa alkaa

---

## Linkit kontekstiin

- Master-snapshot: [`docs/SESSION_CLOSE_2026-05-16.md`](SESSION_CLOSE_2026-05-16.md)
- Aiempi snapshot: [`docs/NYKYTILA_2026-05-16.md`](NYKYTILA_2026-05-16.md)
- Invariantti A (yksi totuuden lähde): [`tools/engine-pilot/lib/audit-baselines.mjs`](../tools/engine-pilot/lib/audit-baselines.mjs) → `VL_CAP_BASELINES`
- Engine.js VL-cap-logiikka: `vlCapForContext` (rivi 2906–2980)
- Audit-engine `deriveBlockPhase`: `tools/engine-pilot/lib/audit-engine.mjs` (rivi 30–80)
- Backlog: [`docs/BACKLOG_VAIHE_1_2.md`](BACKLOG_VAIHE_1_2.md) ENG-16 + ENG-17

---

**Juurisyy 2** (Akselin streetlifting_16w vk12 deload) on erillinen, kuvattu `SESSION_CLOSE_2026-05-16.md` osio 3.2. Vaatii Akselin muistitarkistuksen: tietoinen poikkeama (opt-out `deloadApplied: false`) vai unohtunut drift (sama kategoria kuin juurisyy 1).
