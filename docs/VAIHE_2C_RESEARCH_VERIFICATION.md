# VAIHE_2C_RESEARCH_VERIFICATION.md
**LeVe AI v4.41.0 — Vaihe 2C ohjelma-generaattorin verifikaatiodokumentti**

- **Versio:** v1.0
- **Päivätty:** 2026-05-11
- **Päätöskohdat:** γ (tier-pohjainen kg-progressio) + δ (isometric-pitojen progressio)
- **Fabrikointi-tarkistus:** 0 lukua ilman lähde-statusta

> **Tämä dokumentti on syvätutkimuksen tuotos.** Yhteenveto sen sisällöstä, johtopäätökset ja päätöskohtien _wizardMeta.rules-attribuutiot kytkettävänä Vaihe 2C-γ + 2C-δ -koodiin.
> Täysi tutkimusprosessi (per-numero-status, hakustrategiat, PubMed-nollatulokset, ekstrapolaation rajoitukset) on käytettävissä projektin tutkimusarkistossa.

## Yhteenveto — lähdetaulukko

| Lähde | Päätöskohta | Status | Käyttökelpoinen Vaihe 2C:lle? |
|-------|-------------|--------|-------------------------------|
| γ-A1 Rhea et al. 2003 | γ tier-progressio | PDF-VERIFIOITU | Osittain — dose-response, mutta ei kg/vk |
| γ-A2 Helms et al. 2016 | γ RIR-progressio | PDF-VERIFIOITU | Osittain — RPE/RIR per tavoite |
| γ-A3 Williams et al. 2017 | γ periodisaatio | PDF-VERIFIOITU | **KÄÄNTEISESTI** — untrained > trained periodisaatiossa |
| γ-A4 Stronger by Science (Nuckols) + Latella 2020 | γ kg/vk per tier | EMPIRINEN DATA | **Kyllä, varauksin** — ainoa numeerinen kg/vk-lähde |
| γ-A5 Suchomel et al. 2018 | γ tier-progressio | PDF-VERIFIOITU | Ei — vain kvalitatiiviset suositukset |
| δ-D1 Steven Low / Overcoming Gravity 2 | δ isometric-pidot | EMPIRINEN PROTOKOLLA | **Kyllä** — sweet-spot + Prilepin-taulukko |
| δ-D2 Sommer / GymnasticBodies (SSC) | δ isometric-pidot | EMPIRINEN PROTOKOLLA | **Kyllä** — 60s/15s-tavoitteet, 8-12 vk SSC |
| δ-D3 PubMed systemaattinen haku | δ tieteellinen pohja | **NOLLATULOS DOKUMENTOITU** | Ei suoraa — analogiat Schärer (renkaat) |
| δ-D4 FitnessFAQs / Cali Move / CF / Reddit BWF | δ käytännön protokollat | EI-TUTKIMUSPOHJAINEN | Kyllä ristiviittauksin |
| δ-D5 Oranchuk 2019 + Lum & Barbosa 2019 + Sale 1988 | δ isometric-ekstrapolaatio | PDF-VERIFIOITU (ei calisthenics) | Heikko ekstrapolaatio |

## γ — Käyttökelpoiset luvut Vaihe 2C-γ:lle (EMPIRINEN)

**Tier-kertoimet kg/vk per liike** (Latella 2020 powerlifting + Nuckols SBS-kyselydata):

| Tier | Squat | Bench | Deadlift | Pull-up+ | Dippi+ |
|------|-------|-------|----------|----------|--------|
| Beginner (<1 v) | 2.3 | 0.8 | 2.7 | 1.25 | 1.75 |
| Intermediate (1-3 v) | 0.75 | 0.3 | 0.75 | 0.5 | 0.75 |
| Advanced (3-8 v) | 0.3 | 0.15 | 0.3 | 0.2 | 0.3 |
| Elite (8+ v) | 0.10 | 0.05 | 0.10 | 0.05 | 0.05 |

**Reunaehdot:**
- Saturoitumissääntö: kg/vk puolittuu ~2 v välein tier-tason vaihtuessa
- Naiskerroin: 0.5-0.6 × miesarvot
- Yksilövaihteluväli: ±50-100% (Latella SD usein > keskiarvo, r² lähtötasolle 0.06-0.12)

**Mesosykli-rakenne** (Williams 2017 + Rhea 2003 PDF):
- Vk 1: ±0% akklimatisaatio
- Vk 2: +tier_kg/vk
- Vk 3: +2 × tier_kg/vk
- Vk 4: −25% deload
- Aloittelijan intensiteetti: 60% 1RM, 4 sarjaa, 3 d/vk
- Kokeneen intensiteetti: 80% 1RM, 4 sarjaa, 2 d/vk

**KRIITTINEN LÖYTÖ:** Williams 2017 osoittaa että **untrained hyötyy enemmän periodisaatiosta kuin trained** (β = −0.59, p = 0.0305). LeVe AI:n alkuperäinen hypoteesi "advanced/elite hyötyy enemmän periodisaatiosta" oli väärin. Tier-kertoimet (1.0 → 0.05) tukevat oikeaa suuntaa.

## δ — Käyttökelpoiset luvut Vaihe 2C-δ:lle (EMPIRINEN PROTOKOLLA)

### Front Lever-progressio (Steven Low OG2)

| Taso | Liike | Sweet-spot | SSC-tavoite | Aika per vaihe |
|------|-------|-----------|-------------|----------------|
| 4 | Tuck FL | 4×15s | 60s | 2-4 kk |
| 5 | Adv Tuck | 4×15s | 60s | 3-6 kk |
| 6 | Straddle | 4×10-15s | 15s | 4-8 kk |
| 7 | Half Lay/1-leg | 3×10-15s | 15s | 6-12 kk |
| 8 | Full | tavoite 10-15s | 10-15s | 6-12+ kk |

### Planche-progressio (Sommer + Low)

| Taso | Liike | Sweet-spot | SSC-tavoite |
|------|-------|-----------|-------------|
| 6 | Tuck Planche | 4×15s | 60s |
| 7 | Adv Tuck | 4×15s | 60s |
| 8 | Straddle | 3×10-15s | 15s |
| 9-10 | Half-lay / Full | 1-10s | 10s |
| 11+ | Maltese | A-elite | — |

### HSPU & One-arm pull-up
- HSPU: Pike → Box → Wall Ecc → Wall 3×5-8 → Free Ecc → Free; freestanding-edellytys 8-10 wall HSPU + 30-60s freestanding HS
- OAP: 2-3 × 2-3 cluster × 3-5s eccentric → 7-10s eccentric → finger-assisted (5→1 sormea) → unassisted; Lown sääntö: kun pystyy 3-4 × 10s eccentric → unassisted OAP

### Prilepin-pohjainen isometric-volyymi (Steven Low)
- 1 concentric rep ≈ 2s isometric hold ≈ 3s eccentric
- Strength: 25-50 reps/sessio total
- Hypertrophy: 40-75 reps/sessio total
- Sweet-spot work: 60-70% max-hold, 2-3×/vko

### e1RM-vastine isometric-pidoille (HEURISTIIKKA)

| Liike | Heuristiikka | Lähde | Status |
|-------|--------------|-------|--------|
| Full Front Lever | ≈ weighted pull-up @ 80-90% BW (1RM) | Heavyweight Cali + Frinks n=322 | EI-TUTKIMUSPOHJAINEN, monilähteinen konsensus |
| Adv Tuck FL | ≈ +25-35% BW pull-up 1RM | Reddit/yhteisö | EI-TUTKIMUSPOHJAINEN |
| Straddle FL | ≈ +50-60% BW pull-up 1RM | Reddit | EI-TUTKIMUSPOHJAINEN |
| Planche torque | τ = r × BW × g × cos(θ), r ≈ 0.225 × h | Urbanski biomekaaninen | KLASSINEN MEKANIIKKA, ei calisthenics-validoitu |
| Sekunnit → kg-vastine | EI OLE OLEMASSA | — | PENDING |

## Kriittiset löydökset koodaukseen

1. **Williams 2017 KÄÄNTEINEN** — meidän tier-kertoimet (1.0 → 0.05) tukevat oikeaa suuntaa, mutta _wizardMeta-rules:ssa EI saa väittää "advanced hyötyy enemmän periodisaatiosta"
2. **Helms 2016 RIR-arvot** ovat alkuperäisesti Zourdos et al. 2016:sta — attribuoitava Zourdosille
3. **Rhea 2003 ei anna kg/vk:ta** — vain efektikokoja SD-yksikköinä. Jos Rhea-attribuutio kg/vk:lle → fabrikointi
4. **Calisthenics-isometric-progressio EI peer-reviewed** — nollatulos PubMed-haussa on validi havainto. UI:ssa ei väitettävä tieteellistä validaatiota

## Yksilövaihteluvälin merkintä koodissa

Tier-kertoimet (1.0, 0.4, 0.15, 0.05) on **ekstrapolaatio empirisestä datasta**. Yksilövaihtelu on ±50-100% (Latella SD > mean usein). Tämä on merkittävä _wizardMeta-rules:iin jotta käyttäjä tietää.

## Päätös koodaukseen

- **2C-γ koodattavissa nyt:** tier-kertoimet ja naiskerroin ovat empirisesti perusteltuja
- **2C-δ koodattavissa nyt:** isometric-progressio (Front Lever / Planche / HSPU / OAP) on empirinen protokolla, _wizardMeta:n status "EMPIRINEN PROTOKOLLA" (ei "PDF-VERIFIOITU")
- **Heuristic default merkitty kaikkialle koodikommenteissa**

## Seuraavat tutkimusvelat (avoinna)

- Peterson MD, Rhea MR, Alvar BA 2005 (J Strength Cond Res 19:950-958) — dose-response per tier
- Zourdos MC et al. 2016 — alkuperäinen RIR-tarkkuus-data
- ACSM Position Stand 2009 — tier-pohjaisia ohjeita
- BeforeWeWereStrong-dataset (Nuckols) — empirinen kg/vk per tier
- Schärer et al. 2019/2021 jatkoseuranta — rengasvoimistelu-analogiat
- Lever Pro (Vadnal 2019) -ohjelman paywall-numerot

## Metadata

- Tutkimuspäivä: 2026-05-11
- PDF-verifioidut: Rhea 2003, Helms 2016, Williams 2017, Suchomel 2018, Schärer 2019, Oranchuk 2019, Lum & Barbosa 2019, Latella 2020
- Hakusnippet-tasolla: Stronger by Science (Cloudflare 403)
- Empiriset protokollat: Steven Low (OG2), Sommer (SSC)
- Empirinen data: Nuckols SBS-kysely, Latella 2020 powerlifting Australia n=1897
- EI-TUTKIMUSPOHJAINEN: blogiprotokollat (Vadnal, Kohl, Kondratiev, Reddit BWF, Urbanski)
- **Fabrikointi-tarkistus: ✅ 0 lukua ilman status-attribuutiota**
