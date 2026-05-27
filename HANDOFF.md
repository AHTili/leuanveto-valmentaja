# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8.
>
> *Tämänhetkinen tila: tyhjä pohja. Ensimmäinen varsinainen handoff laaditaan erikseen.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `<H-001>` |
| Tyyppi | `<block-tuning \| debug \| scope-expansion \| refactor \| architecture>` |
| Laadittu | `<pvm>` / Cowork-sessio |
| Tila | `LUONNOS \| AKTIIVINEN \| VALMIS` |
| Liittyy R-sekvenssin vaiheeseen | `<esim. 17 — ks. ROADMAP.md>` |

**Tyyppi määrää acceptance criteria -muodon (osio 2):**

- **`block-tuning`** — A-kriteerit invarianttipohjaisina rajoina (esim. `learnedVlCap.strength ∈ [0,15; 0,20]`). **Vaatii lisäksi osion 4 (atletti-vastaukset) täytettynä ENNEN Code-suoritusta.**
- **`debug`** — A-kriteerit muodossa "toistettava repro → odotettu vs. todettu käytös".
- **`scope-expansion`** — A-kriteerit uuden ominaisuuden mitattavina hyväksyntäehtoina + eksplisiittinen scope-aita (osio 3).
- **`refactor`** — pääkriteeri: käytös muuttumaton (regressio-pilot bittitarkka), vain rakenne muuttuu.
- **`architecture`** — A-kriteerit suunnittelupäätöksinä ja niiden verifiointitapana; voi tuottaa seuraavan handoffin sen sijaan että muuttaa koodia suoraan.

---

## 1. Tavoite

`<1–3 lausetta: mitä ja miksi. Ei ratkaisua — haluttu lopputila.>`

## 2. Acceptance criteria

`<A1, A2, … osion 0 tyypin mukaisessa muodossa. Skeema: docs/ACCEPTANCE_CRITERIA_SKEEMA.md.>`

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit:** `<CLAUDE.md §2 -rivit jotka koskevat tätä työtä>`
- **Mitä EI kosketa:** `<tiedostot / moduulit / funktiot scope-aidan ulkopuolella>`
- **Tekniset reunaehdot:** `<esim. ei uusia npm-riippuvuuksia, vanilla JS, ES-modulit>`

## 4. Atletti-vastaukset critical questions -kysymyksiin

> Pakollinen vain tyypille `block-tuning`. Muut tyypit: merkitse "Ei sovellu".
> Code **ei aloita** block-tuning-suoritusta ennen kuin tämä osio on täytetty.

`<Kysymys → atletin vastaus.>`

## 5. Taustapäätökset ja hylätyt vaihtoehdot

`<Jo tehdyt päätökset (ettei Code re-litigoi) + hylätyt vaihtoehdot perusteluineen.>`

## 6. Avoimet kysymykset

`<Mitä Code kysyy ENNEN toteutusta — ei arvaa. Tyhjä = ei avoimia kysymyksiä.>`

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook pass/fail · selain-testit · regressio-pilot>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `
