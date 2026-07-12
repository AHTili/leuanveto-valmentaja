# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`. Muisti: `docs/MEMORY.md` (konsultoi session alussa, distill lopussa). Post-Fable-operointi: `CLAUDE.md` §10.
>
> **P-013 batch-rakenne (M1–M3, ratifioitu 2026-06-10):**
> **M1 — batch-handoff.** Yksi handoff saa niputtaa **2 R-vaihetta**. Jokaisella vaiheella **oma acceptance-rubriikki + oma scope-valkolista**; vaiheiden välissä **STOP-gate** (Code raportoi + bittitarkka pilot ennen seuraavaa vaihetta). Per-löydös = oma commit.
> **M2 — ajettava rubriikki.** A-kriteerit **koneellisesti tarkistettaviksi**; mittari-ensin (Selkäranka 6): known-positive + known-negative. Rubriikki-looppi **EI ohita** A1-read-only-STOP-gatea (CLAUDE.md §9.3).
> **M3 — verifier-subagentti.** A-kriteerien täyttymisen verifioi **erillinen subagentti riippumattomassa kontekstissa**. **Post-Fable-kiristys (12.7.2026, CLAUDE.md §10): verifier JOKAISEEN kuormia muuttavaan kierrokseen**, ei vain STOP-raportteihin. UI-poluissa verifier AJAA polun itse (oppi 8). Hylkäykset → `docs/MEMORY.md`-mittausloki.
>
> *Tila: **EI AKTIIVISTA HANDOFFIA.** Edellinen: **H-019** (OSA A OBS-044-heal/completed-fantomikenttä + OSA B γ-kisa-peaking) suljettu, arkistoitu ja pushattu 2026-07-12 → `docs/handoffs/HANDOFF_H-019.md` (APP_VERSION 4.57.0, origin/main `7270ec4`). γ-blokki odottaa: **aktivoituu automaattisesti ma 20.7.** — mikään ei muutu sitä ennen (pilot bit-exact).*

---

## ⛔ SEURAAVA TYÖ — H-020-KANDIDAATTI (Akselin STOP-ehto 12.7.2026)

**Yritysstrategian %-semantiikka on verifioitava ja todennäköisesti korjattava ENNEN kuin kisapäiväkoodin varaan lasketaan.**

**Havaittu ongelma (Akselin analyysi 12.7., H-019-päätöksen yhteydessä):** kisapäivän openerit resolvoituvat nyt **ulkoisen kuorman** prosentteina (`loadPctE1RM × e1rmExternal`), mikä tuottaa ~96–99 % **systeemi-intensiteetin** openerit BW-ankkuroiduilla liikkeillä:

- Lisäpainoleuanveto: opener 72,5 kg @ BW ~85 → (72,5+85)/(79+85) = **96 % sys** — "92 %:n opener" on fysiologisesti lähes maksimiyritys
- Muscle-up: opener 4 kg → (4+85)/(4,5+85) = **99 % sys** = **bomb-out-riski avausyrityksessä**

**Vaadittu toimitus (STOP-raporttina — EI toteutusta ilman ratifiointia):**

1. **Trace-dump %-perustasta per laji:** mistä kukin opener/attempt-kuorma numeerisesti johdetaan (näytä data, älä väitä — CLAUDE.md §10 kohta 3).
2. **Per-liike-semantiikkaehdotus:** systeemi-% käännettynä ulkoiseksi missä mahdollista (`ext = pct × (e1RMext + BW) − BW`); **MU:lle erillinen matala-external-käsittely** (systeemi-käännös tuottaa negatiivisen ulkoisen kuorman → esim. BW-only-opener / minimi-inkrementti-porrastus — vaihtoehdot esitetään, ei valita autonomisesti).

**Scope-huomio (rajaa H-020-draftia):** %-semantiikka koskee vain kisapäivän slotteja (opener/attempt/warmup `loadPctE1RM`) + B8-modaalin strategia-%-näyttöä. γ-työviikot ja taper resolvoituvat Vx-pohjaisesti normaalia recommend()-polkua — **20.7.-aktivointi ei riipu tästä.** Aikaikkuna: ennen taper-viikkoa (ma 17.8.); modaalin %-näyttö näkyy atleetille jo luontivaiheessa.

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | — |
| Tyyppi | — |
| Laadittu | — |
| Tila | **TYHJÄ POHJA** |
| Pohja-HEAD | — |
| Liittyy R-sekvenssin vaiheeseen | — |

---

## 1. Tavoite

—

---

## 2. Acceptance criteria

—

---

## 3. Reunaehdot ja scope-aita

—

---

## 4. Atletti-vastaukset

—

---

## 5. Taustapäätökset ja hylätyt vaihtoehdot

—

---

## 6. Avoimet kysymykset (Code kysyy ENNEN toteutusta — ei arvata)

—

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | — |
| Muuttuneet tiedostot | — |
| Tehdyt päätökset | — |
| Validointi | — |
| Jäi auki | — |
| Seuraava askel | — |
