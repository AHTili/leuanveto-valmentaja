# Progressio-monipuolisuus-tikapuut (KORI 8)

**Status:** TOTEUTETTU-HEURISTIIKKA (valmentajakäytäntö-synteesi; ei yksittäistä RCT-lähdettä — double progression, DUP, tempo/pause ja tiheysprogressio ovat vakiintuneita voimavalmennus-työkaluja)
**Lähteet:** double progression (RP / Helms käytäntö), tempo/pause strength-quality (yleinen valmennus), tiheysprogressio (density, work-rest-manipulaatio); MRV-landmark [[volyymi-mrv-kategoriakohtainen]]
**Koodiankkurit:** engine.js (`PROGRESSION_TOOLS`, `suggestProgressionTool` — checkStagnation:in jälkeen), test-runner.js (`test8bProgressionVariety`), index.html (`_rrAlt` 🧭-lohkossa)

Ennen KORI 8:aa engine kohteli jumitusta **binäärisenä**: joko progressio kuormalla, tai `checkStagnation` (≥3 vk) → *"harkitse liikkeen vaihtoa"* + variant-swap. Väliltä puuttui koko valmentajan työkalupakki — juuri Akselin huomio #6 (*"ainoa ohje on +2,5 kg, ei sarjoja lisää yms muita keinoja tulla vahvemmaksi"*).

`suggestProgressionTool(ctx)` on **deterministinen advisory-ladder** (ei opittava parametri — tietoinen valinta: kompoundautumaton, turvallinen, ei feedaa `recommend()`-kuormaan). Ensimmäinen sopiva työkalu voittaa:

| Ehto | Työkalu | Idea |
| --- | --- | --- |
| Voimaliike (`targetReps ≤ 5`) + primary | **tempo/pause** | kovenna suoritusta samalla kuormalla (ei jahdata toistoja voimaliikkeessä) |
| …+ tempo jo käytössä | **microload** | pienempi hyppy (+1,25 kg) |
| Varaa (`lastMedianVx ≥ targetVx+1`) + `reps < 12` | **reps** | double progression (K6-4 nyt tämän osana) |
| Toistot katossa (`≥12`) tai ei-varaa + `volumeBand ≠ korkea` | **sets** | volyymi kasvun ajurina |
| Toistot katossa + `volumeBand = korkea` (MRV) | **density** | sama työ lyhyemmällä tauolla |
| `stagnationWeeks ≥ 6` | + liite | "…harkitse variantin vaihtoa" (nykyinen viimesija säilyy) |

**Reuse:** K6-4-headroom-signaali (`lastMedianVx ≥ targetVx+1`), K4-1 `volumeBand` (matala/kehittävä/korkea = MRV-tila), `checkStagnation`-kynnykset (≥3/≥6 säilyvät viimesijana).

**UI-trigger (index.html `_rrAlt`):** näytetään vain **TASANNE**-tilassa ("Ylläpito →" = `|kuorma − viime raskain| ≤ 0,25`). Tämä sulkee pois sekä progression (kuorma nousi) ETTÄ deload/cal (kuorma laski tarkoituksella) → työkalua ei tyrkytetä väärässä kontekstissa. Näkyy 🧭 "Miksi tämä paino?" -lohkossa kaikille rooleille.

**8a-prior:** ei suoraan opittava tässä muodossa. Mahdollinen tuleva 8a-laajennus: oppia atletin **suosituin/tehokkain työkalu** (mikä menetelmä on historiassa purkanut jumituksia hänelle) — vaatii per-työkalu-outcome-seurannan; ei V1:ssä.

**Linkit:** [[progressio-computeprogressiontarget]], [[progressio-suggestion-tierit]], [[volyymi-mrv-kategoriakohtainen]], [[volyymi-viikkovolyymi-lihasryhmittain]]
