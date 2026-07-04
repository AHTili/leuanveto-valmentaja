# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`. Muisti: `docs/MEMORY.md` (konsultoi session alussa, distill lopussa).
>
> **P-013 batch-rakenne (M1–M3, ratifioitu 2026-06-10):**
> **M1 — batch-handoff.** Yksi handoff saa niputtaa **2 R-vaihetta**. Jokaisella vaiheella **oma acceptance-rubriikki + oma scope-valkolista**; vaiheiden välissä **STOP-gate** (Code raportoi + bittitarkka pilot ennen seuraavaa vaihetta). Per-löydös = oma commit.
> **M2 — ajettava rubriikki.** A-kriteerit **koneellisesti tarkistettaviksi**; mittari-ensin (Selkäranka 6): known-positive + known-negative. Rubriikki-looppi **EI ohita** A1-read-only-STOP-gatea (CLAUDE.md §9.3).
> **M3 — verifier-subagentti.** A-kriteerien täyttymisen verifioi **erillinen subagentti riippumattomassa kontekstissa** ennen STOP-raporttia. UI-poluissa verifier AJAA polun itse (oppi 8). Hylkäykset → `docs/MEMORY.md`-mittausloki.
>
> *Tila: **tyhjä pohja.** Rinnalla chat-ratifioituna (EI handoff-muotoisena): **Ohjelmointikone KORI 1–4 + known-fails-ratifiointi** valmis ja **pushattu 2026-07-04** (origin/main `17e19a8`, APP_VERSION 4.52.57, 20 committia): KORI 1+2 = 4.52.55 (E1–E5 + K2a/K2b/K2c), KORI 3+4 = 4.52.56 (K3-1 across-set-väsymysmalli + kestävyys-katto · K3-4 historia-tietoinen VAROVAINEN · K3-3 D1-v2 · K3-2 ykkös-re-ankkurointi · K4-1 viikkovolyymikortti · K4-2 cold-start-UX), known-fails = 4.52.57 (VBT-trio FIXTURE_DRIFT/todayISO-pinnaus · T9 TEST_STALE/K-A2-re-baseline · **S10 CODE_BUG**: PLAN_BASED-inversio migroitiin 1c978a9:n system-%-kontraktiin 4 lokuksessa jaetulla planBasedInvertE1RM-helperillä + uusi F-3-lukkotesti S10b). Selaintestit **854/854 täysvihreä** (ensimmäistä kertaa). LOAD-DIFF (S10): 10/64 pilot-päivää, e1RM-korjaus ylös → kuormat +0,5…+6,5 kg PLAN_BASED-kohdissa — raportoitu Akselille. **A6-puhelinverifiointi odottaa** (PWA-banneri 4.52.57). Edellinen (**Wizard-materialisaatio, KAPSTONI pilari 3**) suljettu + arkistoitu + **pushattu 2026-07-01** (APP_VERSION 4.52.53, origin/main `4c3766d`, → docs/handoffs/HANDOFF_wizard-pilari-3.md): puhdas sokea portti 6/6 (P1–P6) + P7∧P8 = KYLLÄ; pilotti bittitarkka koko kaaren. Sitä edeltävä (**H-017 D1**, intra-session-autoregulaatio v1 alaspäin) suljettu + arkistoitu 2026-06-14 (→ docs/handoffs/HANDOFF_H-017.md); A6 puhelinverifioitu → **KAPSTONI pilari 1:n ensimmäinen elävä todiste**. Seuraava: **γ-peaking** (R1 OSA 1) ~11.7. erillisenä handoffina (sisältää P3/peaking-lykkäyksen + kisaviikon kisaliike-intensiteetin). Rinnalla parkissa: **H-016** (paluuramppi, toteutettu+dormantti, odottaa vk 25 dippipaluun live-porttia → arkistointi sen jälkeen, `git show 3bad610:HANDOFF.md`). Backlog: OBS-042 (apuliike-median), OBS-043 (lista-render-viive), OBS-044 (2 katalogi-duplikaattia + heal-migraatio), OBS-045/046/047 (H-017 D1 -latentit: cold-start-lattia / live-BW-floor / variant-swap-attribuutio).*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `<H-0xx>` |
| Tyyppi | `<block-tuning \| debug \| scope-expansion \| refactor \| architecture>` |
| Laadittu | `<pvm>` / Cowork-sessio |
| Tila | `LUONNOS \| AKTIIVINEN \| VALMIS` |
| Pohja-HEAD | `<sha>` · APP_VERSION `<x.y.z>` |
| Liittyy R-sekvenssin vaiheeseen | `<ks. ROADMAP.md>` |

---

## 1. Tavoite

`<lopputila, ei ratkaisua>`

## 2. Acceptance criteria

`<A1, A2, … — koneellisesti tarkistettavina (P-013 M2); known-positive + known-negative; UI-poluille oppi 8 (e2e render-tasolla); kuormamuutos → LOAD-DIFF-SWEEP push-ehto>`

## 3. Reunaehdot ja scope-aita

`<invariantit · mitä EI kosketa (test-riippuvuus verifioitava) · valkolista · tekniset>`

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
| Validointi | `<Stop hook · selain-testit · pilot · LOAD-DIFF-SWEEP tarvittaessa · oppi 8 -e2e UI-poluille>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<seuraava handoff tai R-vaihe>` |
