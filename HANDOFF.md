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
> *Tämänhetkinen tila: tyhjä pohja. Seuraava handoff laaditaan erikseen.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `<H-0xx>` |
| Tyyppi | `<block-tuning \| debug \| scope-expansion \| refactor \| architecture>` |
| Laadittu | `<pvm>` / Cowork-sessio |
| Tila | `LUONNOS \| AKTIIVINEN \| VALMIS` |
| Pohja-HEAD | `<sha>` · APP_VERSION `<x.y.z>` |
| Liittyy R-sekvenssin vaiheeseen | `<esim. 18 — ks. ROADMAP.md>` |

---

## 1. Tavoite

`<lopputila, ei ratkaisua>`

## 2. Acceptance criteria

`<A1, A2, … — koneellisesti tarkistettavina (P-013 M2); known-positive + known-negative>`

## 3. Reunaehdot ja scope-aita

`<invariantit · mitä EI kosketa · valkolista · tekniset>`

## 4. Atletti-vastaukset critical questions -kysymyksiin

`<pakollinen block-tuning-tyypille ennen Code-suoritusta; muuten "Ei sovellu">`

## 5. Taustapäätökset ja hylätyt vaihtoehdot

`<lista>`

## 6. Avoimet kysymykset

`<lista tai "—">`

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook · selain-testit · pilot · LOAD-DIFF-SWEEP>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<seuraava handoff tai R-vaihe>` |
