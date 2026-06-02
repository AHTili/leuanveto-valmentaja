# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Tila: **K-A6D — `AKTIIVINEN`**. M2 (OBS-022) **GATED + säilytetty** git-committissa `f53428b` (sekvenssi a ratifioitu 2026-06-02: K-A6D ensin → M2-ship; M2 palautetaan HANDOFF.md:hen K-A6D:n shipattua: `git show f53428b:HANDOFF.md`). DRAFT-COWORK ratifioitu: VELOCITY_VX_RECONCILE, RTF-gated, suppress-when-unreliable (i). A1-broad-sweep TEHTY (juuri lokalisoitu). Code formalisoi ratifioidusta suunnasta — verifioitu repon koodista (§7: repo voittaa).*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `K-A6D` (velocity-stop ↔ Vx-tavoite -reconcile) |
| Tyyppi | `debug` (confirm-then-fix + §5b laaja-A1: A1 tehty → A2 FIX). Muuttaa velocityStop-johdannan (staattinen → RTF-gated); **kuorma-neutraali** (velocityStop on UI-varoituskynnys, ei recommend()-kuormainput). |
| Laadittu | 2026-06-02 / Cowork (DRAFT-COWORK ratifioitu) · Code formalisoi |
| Tila | `AKTIIVINEN` (A2-FIX-vaihe) |
| Pohja-HEAD | `f53428b` (= `76d5aa5` + M2/ROADMAP-docit, kuorma-neutraali → koodipohja identtinen 76d5aa5:n kanssa) · APP_VERSION `4.52.32` |
| Liittyy R-sekvenssin vaiheeseen | γ-gate (vaihe 19, reunaehto a) hallitseva este: **70 INVARIANT_VIOLATION_K_A6D** pilotissa. Myös M2:n portti (sekvenssi a). |

---

## 1. Tavoite

velocity-stop ↔ Vx-tavoite -ristiriita pois: `slot.velocityStop` **reconciloitu targetVx:ään liike-spesifisti RTF-mallilla** (kun luotettava), tai **vaiennettu** (kun ei). A1-nykytila: velocityStop = absoluuttinen kalibroimaton kynnys (data.js — primary vx-ämpäri 6014 `vx≤1?0,45:vx≤2?0,50:0,60`, backoff/secondary style-vakio 0,40–0,55) → UI-varoitus ("harkitse kuorman laskua / sarjan lopettamista", index.html:13466) voi laueta kun Vx-vara ≥2 (atletilla yhä reilu vara). 70 K-A6D-flagia.

## 2. Acceptance criteria

> A1 = CONFIRM (TEHTY, read-only laaja-sweep): juuri = velocityStop ei RTF-reconcile'd — staattinen arvaus velocity-at-targetVx:stä, ei liike-spesifi `velocityAtTargetRir`. A2 = FIX.

**A2a — velocityStop ← velocityAtTargetRir (RTF-johdettu).** Kun liikkeen RTF luotettava (`computeRtfVelocityModel` status `reliable`, r² ≥ 0,85 — sama promootio-portti kuin VBT-autoregulaatiolla): `velocityStop = rtfModel.intercept + rtfModel.slope × slot.targetVx` (= velocity targetVx-varalla). Kaava jo olemassa (3245/3416).

**A2b — suppress-when-unreliable (päätös i).** RTF EI luotettava (ml. dippi/ei-VBT/riittämätön data) → `velocityStop = null` (UI-varoitus ei laukea; detektori ohittaa).

**A2c — poista staattinen data.js-velocityStop.** 6014 (vx-ämpäri) + style-vakiot (`SQUAT/PULL/DIP_BACKOFF_STYLES`) → engine RTF-gated **single source** (value-resolution-audit-oppi: ei dead divergenttiä signaalia).

**A2d — K-A6D 70→0 AIDOSTI** (ei detektoria vaimentamalla): RTF-epäluotettava→vaiennettu→flag selviää (velocityStop null); RTF-luotettava→velocityStop=velocityAtTargetRir (vastaa targetVx-varaa → ei ennenaikaista laukaisua → ei aito konflikti; jos detektori vaatii reconciled-tunnistuksen, korjaa ehto vastaamaan AITOA invarianttia, ei mute). known-neg: cal V1/accessory/Intensity-Peaking-primary-V1 ENNALLAAN. per-liike gating: kyykky/leuka promotoitavissa, dippi ei.

**A2e — push-ehto.** Pre-vs-post **LOAD-DIFF-SWEEP** (odotus ~0: velocityStop ei suoraan recommend()-kuormassa; vaikuttaa vain UI-varoitukseen + live-velocity→Vx-kirjaus→vxAdj-ketjuun). pilot 64/64 0 virhettä. Backup-ankkuri. per-löydös-committi. **STOP push-portille.**

## 3. Reunaehdot ja scope-aita

- **Invariantit (`CLAUDE.md` §2):** VL-cap ENNALLAAN — `resolveVlCap` on **eri mekanismi** (velocity-LOSS-cap %, jo RTF-reconcile'd `velocityAtTargetRir`-individual-haarassa 3416). Ei kosketa.
- **Mitä EI kosketa:** `resolveVlCap` (VL-cap) · `computeRtfVelocityModel` (RTF-malli itse) · slot-resolveri / sweep-invariantit (F-2: Branch A/15c/Branch B + SP-2/Koti=live-vartijat) · makro/deload/regain.
- **Lokus:** velocityStop-johdanta — poista data.js (6014 + styles), laske recommend() slot-finalisoinnissa RTF-gated. UI-varoitus (index.html:13466) lukee `slot.velocityStop`:n — **logiikkaa ei muuteta, vain syöte.** Mahd. K-A6D-detektori (audit-engine.mjs:892) jos reconciled-tunnistus tarvitaan (Q1).
- **Tekniset:** vanilla JS, ei npm, ES-modulit, Stop-hook-yhteensopiva.

## 4. Atletti-vastaukset critical questions -kysymyksiin

**Ei sovellu** — tyyppi `debug` (ei `block-tuning`).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

1. **VELOCITY_VX_RECONCILE:** velocityStop johdetaan `velocityAtTargetRir`:stä (RTF-gated), ei staattisesta arvauksesta. Reconcile-kaava jo olemassa (vlCapFromRtfModel:3245, resolveVlCap:3416).
2. **RTF-gate r² ≥ 0,85** — sama promootio-portti kuin VBT-autoregulaatiolla (`RTF_R2_THRESHOLD_RELIABLE`) → yhtenäisyys.
3. **Suppress-when-unreliable (i):** RTF ei luotettava (ml. dippi/ei-VBT) → velocityStop null. Perustelu (A1b): dippi/apuliikkeet eivät VBT-luotettavia → epäluotettava mittaus ei saa ajaa varoitusta. Hylätty: MVT-fallback-estimaatti (jättäisi kalibroimattoman kynnyksen — sama juuriongelma).
4. **Single-source:** poista staattinen data.js-velocityStop → engine RTF-gated ainoa lähde.
5. **VL-cap erillinen, ei kosketa:** resolveVlCap (velocity-LOSS-cap) on eri mekanismi + jo RTF-reconcile'd.

## 6. Avoimet kysymykset (Code selvittää A2:ssa, raportoi)

- **Q1:** Onko pilotissa (akseli-elite-streetlifter) luotettavaa RTF:ää? **Ei** → suppression yksin vie K-A6D 70→0 (ei detektori-muutosta). **Kyllä** → reconciled velocityStop (>0) + targetVx≥2 → detektorin tunnistettava reconcile (korjaa ehto AITOON invarianttiin, ei mute).
- **Q2:** Per-slot-RTF (`computeRtfVelocityModel` per `slot.movementId`) vs primary-only? Per-slot = oikein päätös (i):lle (per-liike gating). Code valitsee + raportoi.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook · selain-testit · pilot · LOAD-DIFF-SWEEP · K-A6D 70→0>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<M2 un-gate (restore f53428b) tai R-vaihe>` |
