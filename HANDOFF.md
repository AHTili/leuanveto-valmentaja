# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`. Muisti: `docs/MEMORY.md` (konsultoi session alussa, distill lopussa).
>
> **P-013 batch-rakenne (M1–M3, ratifioitu 2026-06-10):**
> **M1 — batch-handoff.** Yksi handoff saa niputtaa **2 R-vaihetta** (skaalaus 4:ään vasta P-013-mittausdatalla). Jokaisella vaiheella **oma acceptance-rubriikki + oma scope-valkolista**; vaiheiden välissä **STOP-gate** (Code raportoi + bittitarkka pilot ajetaan ennen seuraavaa vaihetta). Per-löydös = oma commit säilyy ennallaan.
> **M2 — ajettava rubriikki.** Osion 2 A-kriteerit muotoillaan **koneellisesti tarkistettaviksi** (testi / skripti / mitattava ehto) ja ajetaan self-correction-looppina kunnes rubriikki täyttyy tai STOP-ehto laukeaa. Mittari-ensin (Selkäranka 6) säilyy: known-positive + known-negative ennen kuin kriteeriin luotetaan. Rubriikki-looppi **EI ohita** confirm-then-fix/A1-read-only-STOP-gatea (CLAUDE.md §9.3).
> **M3 — verifier-subagentti.** A-kriteerien täyttymisen verifioi **erillinen subagentti riippumattomassa kontekstissa** (ei toteuttava agentti itse) ennen STOP-raporttia. Verifierin hylkäykset kirjataan `docs/MEMORY.md`-mittauslokiin.
>
> *Tila: **H-015 — `AKTIIVINEN` (VAIHE A käynnissä)**. Siirretty Cowork-draftista (`HANDOFF_EDITABILITY_takapakki-ja-muokkaus_DRAFT-COWORK.md`, ratifioitu 2026-06-10, K1–K3 ratkaistu §6). Ankkuriviittaukset verifioitu repon koodista (§7: repo voittaa) — verifioidut täsmennykset merkitty ✏️-symbolilla. Akuutti heti-ohje (dippi-korvaus nykyversiolla) annettu Akselille erikseen 2026-06-10 — sen koodiselvitys syöttää VAIHE A:n karttaa.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-015` (editability: takapakkien huomiointi ja session muokkaus) |
| Tyyppi | `scope-expansion` (sisältää A1-confirm-vaiheen → P-013 batch=2: VAIHE A = engine-semantiikan CONFIRM + design plan-modessa → STOP-gate → VAIHE B = toteutus rubriikki-loopilla + M3-verifier) |
| Laadittu | 2026-06-10 (Cowork-draft) · siirretty repoon 2026-06-10 (Code) · Tila: **RATIFIOITU** (Akseli 2026-06-10; K1–K3 ratkaistu, ks. §6) |
| AKUUTTI KONTEKSTI (10.6.) | §1:n käyttäjätarina on TOSI ja käynnissä: rintalastavaiva 2 vk, dippi korvattu TÄLLÄ viikolla nykyversion heti-ohjeella (skip ⏩ + "Lisää liike": Close-grip bench + custom Käsipainopenkki; paluusuunnitelma vk8-deload → vk9-ramppi, cal-setti skipataan jos tuntemuksia). **Akselin todellinen paluu = A1(a):n live-known-positive.** |
| Liittyvä | editability-jono (3.6. reaalitreeni-havainto + A1 4.6.) · kytkeytyy M2-ramppiin (shipattu 4.52.35) ja F-5-completion-luokkaan (`isSlotDoneForWeek`) |
| Pohja-HEAD | `d1542d8` (origin/main) + lokaalit arkistointi/handoff-commitit · APP_VERSION `4.52.35` — vahvistettu PRE-FLIGHTissä 2026-06-10 ✏️ |
| Liittyy R-sekvenssin vaiheeseen | Ei yksittäinen R-vaihe (NYT-merkki = 18, Round B-β). H-015 = editability-milestone, ajetaan vaiheen 18 rinnalla. |

---

## 1. Tavoite (lopputila, ei ratkaisua)

Käyttäjä voi kohdata treeniarjen takapakin — esimerkkitarina: **rintalastavaiva → dippi pitää korvata rintaa kuormittavalla mutta rintalastaa säästävällä liikkeellä, osa sarjoista jää väliin** — ja sovellus käsittelee tilanteen eliittitasoisesti: skippaus ei vääristä ohjelmointia, korvaava liike saa järkevän kuorman ja blokkirampin heti, ja session sisältöä voi muokata (peruuttaa, lisätä, järjestää, jälkikorjata) ilman datariskiä tai kitkaa.

## 2. Acceptance criteria

**VAIHE A — CONFIRM (read-only, STOP-gate ennen Vaihe B:tä):**

- **A1 — Engine-semantiikan kartta (laaja sweep, ei kapea hypoteesi):** dokumentoi koodista + runtime-ajoilla:
  - (a) *Skip-semantiikka:* mitä 1 / 2 / 4 viikon skippiputki tekee liikkeen M2-rampille ja e1RM-tilalle — jatkuuko ramppimuoto oikeasta kohdasta, laukeaako regain-mekanismi, vai alkaako kalibrointi alusta? Known-positive + known-negative per blokki-tyyppi. ✏️ *Esiselvitys (heti-ohje 10.6.): ramppimuoto tulee templaatin viikosta (ei siirry skipin takia); plan-floor (`engine.js:2129` `max(planTarget, autoregTarget)`) palauttaa suoraan viikon plan-%:iin; regain (`REGAIN_THRESHOLD_FAR/NEAR 0.85/0.95 → ×2.0/×1.5`) kiihdyttää alhaalta, EI kevennä paluuta; hardCap = lastLoad × (1 + 15 %/vk × min(3, vk)). VAIHE A syventää: runtime-known-pos/neg per blokki + 1/2/4 vk putket.*
  - (b) *Substituutio-polku:* kun liike korvataan kesken syklin, mistä korvaajan aloituskuorma tulee (engine-ehdotus / kalibrointi / tyhjä?) ja perääkö se blokkirampin muodon heti? Verifioi 3.6. A1-väite "substituutio opitaan per liike" mekanismitasolle. ✏️ *Esiselvitys: 🔄-swap (`index.html:14297–14456`) vain accessoryille (primary/backoff/secondary estetty :14306, pysyvä `accessorySlotOverrides`); "+ Liike" (`:13567–13817`) = ad-hoc-lisäys, kuormaehdotus historia→katalogi→PR→default-ketjusta (`:13680`). Ad-hoc-liike EI peri slotin reps×Vx-ramppia (käyttäjä syöttää sets/reps käsin) — A1(b) verifioi tämän aukon laajuuden.*
  - (c) *Jälkimuokkauksen datavaikutus:* mitkä done-tilan/sarjadatan muutokset syöttävät engineä, mitkä eivät — missä on korruptio- tai väärä-signaali-riski? ✏️ *Esiselvitys (4.6. A1 + F-5): `set.completed` transient; historia = presence + `setRole !== "skipped"` + `reps != null`; `showEditSetModal` (`:3052`) muokkaa persistoitua settiä; empty-completion early-return (`engine.js:~1654`); done-render unifioitu (`isSlotDoneForWeek` `:5243`).*
  - **STOP + raportoi kartta Akselille. Jos (a)/(b) paljastaa että eliittitaso vaatii engine-muutoksia (ei vain UX:ää), älä laajenna scopea hiljaa — raportoi, Akseli päättää jaosta.**

**VAIHE B — Toteutus (vasta gate-vahvistuksen jälkeen; mitattavat ehdot):**

- **A2 — Liikkeen korvaus kesken syklin:** käyttäjä korvaa liikkeen (vaivan keston mittaisesti, ks. §6 K1) suoraan treeninäkymästä; korvaaja saa A1(b):n mukaisen järkevän aloituskuorman ja M2-ramppimuodon; alkuperäisen liikkeen tila säilyy palattavana. Known-positive: dippi → korvaava rintaliike; known-negative: korvaus ei muuta muiden liikkeiden kuormia (LOAD-DIFF-SWEEP).
- **A3 — Done-peruutus:** virheellisen done-merkinnän (myös tyhjä-done) voi perua; peruutus palauttaa tilan täsmälleen ennalleen (bittitarkka pilot ennen/jälkeen). Rajaton (§6 K3 — ei aikaikkunaa).
- **A4 — Session jälkimuokkaus:** liikkeen lisäys done-klikkauksen jälkeen onnistuu (3.6. estynyt polku), järjestyksen muutos onnistuu, sarjadatan jälkikorjaus onnistuu — mikään ei korruptoi engine-tilaa (A1(c)-kartan mukaisesti).
- **A5 — Skip näkyväksi oikein:** skipattu/korvattu liike ei näy "tekemättömänä" väärin missään kolmesta render-polusta (sama completion-luokka jonka F-5 yhtenäisti — **käytä `isSlotDoneForWeek`-helperiä (`index.html:~5243`), älä replikoi** ✏️ VALUE_RESOLUTION_AUDIT §4-invariantti).
- **A6 — Regressiosuoja:** pilot bittitarkka muuttumattomille poluille; selaintestit ≥ nykytaso (748/752 ✏️ vahvistettu 4 pre-existing VBT/T9); kuormalogiikkaan kosketaan vain jos A1 + Akselin gate-päätös sen salli → silloin pre-vs-post LOAD-DIFF-SWEEP on push-ehto.

## 3. Reunaehdot ja scope-aita

- **Invariantit (CLAUDE.md §2, sovellettavat):** VL-cap per blokki · Deload Δ% · Tier-progression — editability EI saa muuttaa näitä; muokkausoperaatiot eivät kosketa kuormalaskentaa (paitsi jos A1+gate-päätös sallii). Treenihistoria ei saa muuttua muutoin kuin käyttäjän eksplisiittisestä toimesta.
- **Mitä EI kosketa (oletus, A1 voi tarkentaa):** M2-ramppilogiikka (data.js weekPlan-parametrit + vReps-polku), VL-cap, PRIMER-signaali, e1RM-resoluutiopolut (M1-auditin suljettu luokka, VALUE_RESOLUTION_AUDIT §0-invariantti), velocityStop/RTF-mekanismit (K-A6D). Jos substituutio-optimaalisuus vaatii näihin kajoamista → STOP + erillinen päätös.
- **Selkäranka:** PRE-FLIGHT ✏️ (tehty: HEAD=origin/main=d1542d8, puhdas tree) · peruutusankkuri ✏️ (`backup-pre-editability-d1542d8`) · scope-aita valkolistana (Code määrittää tiedostolistan VAIHE B:n plan-modessa, Akseli näkee sen gate-raportissa) · per-löydös = oma commit + pilot · STOP imperatiiveina · EI pushia ilman lupaa.
- **Design plan-modessa** (CLAUDE.md §9.2: ei /goal avoimeen designiin); rubriikki-looppi vain A2–A6:n tarkistettaville ehdoille; M3-verifier ennen STOP-raporttia.

## 4. Atletti-vastaukset

Ei sovellu (ei block-tuning). Käyttäjätarina: ks. §1; lisäkonteksti §5.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

- **3.6. A1 (jo tehty):** data turvassa — empty-completion ei korruptoi, engine early-return 0 sarjalla, substituutio opitaan per liike. Tämä handoff EI re-litigoi datavaarallisuutta; se rakentaa puuttuvan muokkauskerroksen ja verifioi optimaalisuuden.
- **M2 shipattu velocity-agnostisena (10.6., 4.52.35):** ramppi toimii kaikille liikkeille ilman nopeusdataa → korvaava liike voi periä ramppimuodon — tämä on A1(b):n verifioitava oletus, ei fakta. ✏️ *Esiselvitys: ad-hoc-lisäys EI tällä hetkellä peri slotin reps×Vx:ää — perintä on todennäköinen VAIHE B -rakennuskohde.*
- **Käyttäjän vaatimustaso (Akseli 10.6.):** skenaario on yleinen testi ohjelmointikoneelle — "eliittitason sovellus kykenee huomioimaan takapakit". Hyväksyntärima asetetaan sen mukaan, ei minimi-UX:n.
- **Hylätty:** pelkkä UX-korjaus ilman engine-semantiikan verifiointia (riski: sulava nappi joka tuottaa epäoptimaalista ohjelmointia — kitka vain siirtyisi näkymättömäksi).
- ✏️ **Heti-ohje annettu nykyversiolla (10.6.):** skip ⏩ + "+ Liike" -polku toimii akuuttiin; kitkapisteet dokumentoitu (käsipainopenkki puuttui liikepankista → custom-luonti; 🔄-swap ei toimi primarylle; lisäysjärjestys ennen done-merkintöjä). Nämä kitkapisteet ovat VAIHE B:n UX-syötteitä.

## 6. Avoimet kysymykset — RATKAISTU ratifioinnissa 2026-06-10

- **K1 (RATKAISTU):** Korvaus on **vaivan keston mittainen, ei kertasessio** — ja siihen kuuluu **paluuprotokolla**: takaisin ei tulla suoraan ohjelman %-tasoon vaan totuttelurampilla kevyemmistä. Akselin tapaus: dippi → käsipainopenkki + kapea penkki ylläpitävät voimaa vaivan ajan; paluu ensi viikolla kevennettynä. → A1(a):n on verifioitava kattaako engine regain-/readiness-mekanismi paluurampin 2–3 vk tauon jälkeen, vai vaatiiko eliittitaso tähän lisäyksen (jos vaatii → STOP-gate-päätös, ei hiljaista laajennusta). ✏️ *Esiselvitys viittaa: EI kata (plan-floor palauttaa suoraan plan-%:iin; Akselin tapauksessa vk8-deload sattuu paikkaamaan) — VAIHE A vahvistaa runtime-ajoilla ja gate päättää lisäyksestä.*
- **K2 (RATKAISTU):** Kevyt valinnainen syy-malli — skippaus joskus aikapulaa, joskus vaivaa. **Käytettävyys ensin:** kirjaus ei saa lisätä kitkaa (esim. valinnainen yhden napautuksen tagi, ohitettavissa). Syyn ohjelmointiarvo (vaiva → engine välttää/keventää liikettä) arvioidaan A1:ssä — versio 1:ssä riittää loki, jos ohjelmointikytkentä kasvattaisi scopea.
- **K3 (RATKAISTU, Coworkin suositus hyväksytty):** Done-peruutus **rajaton** — jälkikorjaus on A4:n ydinkyky eikä aikaikkuna toisi turvaa, vain kitkaa. Turva tulee A1(c):stä: engine-vaikutusten uudelleenlaskenta verifioidaan bittitarkasti, ei kalenterirajalla.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook · selain-testit · pilot · LOAD-DIFF-SWEEP tarvittaessa>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<VAIHE B gate-vahvistuksella tai R-vaihe>` |
