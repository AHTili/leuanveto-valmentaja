# ROADMAP.md — LeVe AI strateginen R-sekvenssi

> **Mikä tämä on:** LeVe AI:n strateginen kehityskaari — 20-vaiheinen R-sekvenssi v4, nykytila, reunaehdot ja aikataulu. Tämä on projektin **ainoa kanoninen vaihemalli**.
>
> **Kolmen kerroksen malli:** `CLAUDE.md` = pysyvät invariantit ja säännöt · `ROADMAP.md` (tämä) = strateginen kaari + NYT-merkki · `HANDOFF.md` = yksi aktiivinen tehtävä. Claude Code lukee kaikki kolme session alussa (`CLAUDE.md` §8).
>
> **Päivitysprotokolla:** vaiheen tila ja NYT-merkki muuttuvat **vain committilla** kun vaihe sulkeutuu — ei muistinvaraisesti. ROADMAP = mikä vaihe; HANDOFF = mikä tehtävä vaiheen sisällä.
>
> **Tilannekuva:** 12.7.2026 · APP_VERSION `4.57.0` (HEAD = H-019 OSA B -finale) · **NYT-merkki vaihe 20 (Round B-γ — kisa-peaking, kisa la 22.8.2026)**. Suljettu 2.6. jälkeen: OBS-022/M2 (sisä-blokki-intensifikaatio) · 8a V1 (`learnedAcrossSetFatigue`, 4.53.1) · KORI 8 (progressiotikapuut, 4.54.0) · MULL-2 volyymimaamerkit (4.55.0) + MULL-3 within-session-ennuste (4.56.0) · **H-019 OSA A** (completed-fantomikenttä — prior-näkymät + 8a-oppiminen heräsivät tuotannossa, 4.56.1; CAP_YELLOW-deload-fix 4.56.2) · **H-019 OSA B** (γ-kisatehdas + porrastetut readiness-capit + VL-viikkoleimat tutkimuskatolla + per-laji-yrityskuormat + B8-UI + B9-odottava aktivointi). γ-blokki odottaa: **aktivoituu automaattisesti ma 20.7.** — mikään ei muutu sitä ennen (pilot bit-exact). Selainsuite 1003/1003. Visuaalinen vastine: `prosessikartta-v4.html`.

---

## 1. Kunnianhimon taso — "voimaharjoittelua mullistava"

Akselin omat sanat. Tämä taso säilyy ennallaan koko prosessin ajan, reunaehtojen (a)/(b)/(c) suojaamana.

**KANONINEN MÄÄRITELMÄ (palautettu 2026-06-10, ankkuri: master-auditplan v4 FINAL §7 + §13 — goal-drift-korjaus):**

> **Mullistava = M1 ∧ M2 ∧ Kerros 3 (L3a/L3b/L3c) ∧ KAPSTONI (eliittiverdikti 3 pilarissa).**
> Mikään osakomponentti yksin EI riitä: M1 (virheetön pohja) ja M2 (sisä-blokki-äly) ovat välttämättömiä mutta eivät riittäviä ilman Kerros 3:a (L3a/L3b/L3c) ja KAPSTONI-eliittiverdiktin kolmea pilaria (1: reaaliaikainen autoregulaatio · 2–3: ks. v4 FINAL §13). Kompaktio-/tilannekuvadokumentit eivät saa supistaa tätä määritelmää (MEMORY oppi 9) — täysi muoto verifioidaan AINA v4 FINAL -ankkurista.

β-arkkitehtuurin täysimittainen lopputila tarjoaa **eliittitason VBT-autoregulaation kotioloissa** — Enode Pro + Oura Ring -kalustolla, täysin lokaalissa ympäristössä, ilman ulkopuolista kommunikaatiota.

Konkreettinen käyttökokemus lopputilassa:

> Avaa sovellus aamulla → primer-protokolla, 2–3 yritystä nousevilla kuormilla → load-velocity-suora reaaliajassa → päivän sys-1RM velocity-pohjaisesti → työsarjat target-velocityllä → velocity-stop setin sisällä → HRV-bias säätää target-RIR:ää ±0,5. Ei staattisia pct-arvoja BW-ankkuroiduille liikkeille.

Tavoitearvio: laatutaso ~7,5/10 → 9,5/10.

---

## 2. β-arkkitehtuuri lyhyesti

**Kaksi lähdettä.** Lähde 1 (aina aktiivinen, kaikille käyttäjille): V/reps → odotettu %1RM Epley-Vara-pohjaisesti, ilman ulkoista datasyötettä. Lähde 2 (vapaaehtoinen, Akselilla aktiivinen): primer-pohjainen sys-1RM-päivitys + HRV-RIR-bias, vaatii Enode-velocity- ja/tai Oura-HRV-datan.

**Kolme tasoa.** Taso 1 — täysi VBT, primer joka sessio (kyykky, lisäpainoleuanveto). Taso 2 — kalibrointi-pohjainen, blokkikohtainen primer (lisäpainodippi). Taso 3 — V/reps-tavoite ilman sys-1RM-ankkuria (muscle-up + accessoryt).

---

## 3. Kolme kovaa reunaehtoa (a)/(b)/(c)

Nämä eivät saa kadota missään vaiheessa.

**(a) Pohjan invariantti-puhtaus ennen γ:ta.** Vaihetta 20 (γ-peaking) EI aloiteta ennen kuin pohja palauttaa 0 INVARIANT_VIOLATION laajennetussa kanavajoukossa (A/C/D/G + K-A1/K-A2/K-A6D + K-β). β-arkkitehtuurin implementaatio (α-1 ✓ / α-2 / β) + DP-C-loppu (vaihe 14b) on lopullinen läpäisykynnys.

**(b) β rajattu yhteen RIR-bias-parametriin.** Ainoa adaptiivinen kerros = RIR-bias HRV-z-pohjaisesti, staattisella 5-kvantili-mappauksella (L49). Kaikki muut parametrit staattisia (MVT, tier, kuorma-cap, Plews-kynnys, fallback-puoliintumisaika, K-β-thresholds). Fatiikkidynamiikkaa, palautumis-aikavakiota, yksilöllistä optimi-VL-cappia tai MVT-arvoa EI jahdata oppivana.

**(c) BW-ankkuroitujen harjoitusteoreettinen johdonmukaisuus.** V-merkintä ei valehtele atleetille — kuorma ja V/reps-tavoite ovat yhteensopivia. Täyttyy Lähde 1 -funktiolla (Epley-Vara) kaikille käyttäjille ilman ulkoista datasyötettä; Lähde 2 -primer tarkentaa Tasoilla 1–2.

---

## 4. R-sekvenssi v4 — 20 vaihetta

**NYT-merkki: vaihe 20 (Round B-γ — kisa-peaking; kisa la 22.8.2026, γ-blokki aktivoituu ma 20.7.).**

| # | Vaihe | Tila | Huomio |
| --- | --- | --- | --- |
| 01 | Sovelluksen perustila | VALMIS | PWA, IndexedDB, foundation-data |
| 02 | ENG-14 INVARIANT_VIOLATION | VALMIS | `4386e8c` |
| 03 | ENG-15 edge-case-generator | VALMIS | `4386e8c` |
| 04 | AC-A1→A7 luokkainvariantit | VALMIS | `1c05341` |
| 05 | Juurisyy 1+2 päätöskohdat | VALMIS | `8e1587a` |
| 06 | CLAUDE.md + Stop hook + backlog | VALMIS | `6ad3224` |
| 07 | Alfa/beta-kehotteet + audit-paketit | VALMIS | `10d48c5` |
| 08 | Vaihe 8 turvaverkko | VALMIS | `aa6ec64`, PR #36 |
| 09 | LoadPct-fix L37 | VALMIS | `1c978a9` |
| 10 | sw-bump L43 (APP_VERSION 4.51.12) | VALMIS | `126caa2` |
| 11 | PWA-aktivointi puhelimessa | VALMIS | — |
| 12 | Verifiointi tuotannossa | VALMIS | LoadPct-fix vahvistettu treeneissä |
| 13 | B3-policy-päätös — P2/P4-polku | VALMIS | Lähde 1 + β-arkkitehtuuri valittu |
| 14 | DP-C A-kanava — K-A1/K-A2/K-A6D | VALMIS | `f52801f` · `81aa083` · `22a72b5` |
| 14b | DP-C-loppu — K-A1 redesign + K2 primer history | **AVOIN** | rinnakkaisrata; ei estä α-2:ta; sulku ennen vaihetta 19 |
| 15 | β Round A scoping — K1–K8 ratifioitu | VALMIS | ledger L45–L51 |
| 16 | Round B-α-1 + bug-fix-sarja α-1.6→1.11 | VALMIS | `f47ae1d` → `4252049`, APP_VERSION 4.52.5 |
| 17 | Round B-α-2 — Lähde 2 primer + K-β-primer audit | VALMIS | toteutettu H-006a (velocity-data-flow, ba63654^7..6676a86) + H-006b (primer + sys-1RM-päivitys + K-β-1/2/4/5-audit + measurements-store type='primer', 70cf681..ba63654). Atletti-realismi: 3-pisteen primer + primer-pohjainen LV-regressio torjuttiin (dippi-velocity epäluotettava); cal-pohjainen LV-regressio aktiivinen recommend():ssa. |
| 18 | Round B-β — HRV-bias + shadow mode + K-β-HRV audit | AVOIN | ~135–225 riviä; H-006a+H-006b stabiloitu; väistyi H-019/γ-kiireellisyyden tieltä (kisa 22.8.) — jatkuu kisakauden jälkeen tai rinnakkain jos tilaa |
| 19 | Pohja-puhtaus 8/8 -verifiointi | SEURAAVA | reunaehto (a) -gate; edellyttää vaiheen 14b sulkua |
| 19b | **Kerros 3 (L3a/L3b/L3c)** — ml. L3b-audit + Wizard-eliittiarvio | OSITTAIN (Wizard-materialisaatio VALMIS) | mullistava-määritelmän 3. komponentti (v4 FINAL §7); **Wizard-eliittiarvio (materialisaatio) SULJETTU 2026-07-01** → docs/handoffs/HANDOFF_wizard-pilari-3.md (6/6 + P7∧P8, pushattu 4.52.53); L3a/L3c-audit yhä avoin |
| 20 | Round B-γ — kisa-peaking | **NYT** (rakennettu 4.57.0 — H-019 OSA B) | γ-kisatehdas (5 vk: 2×intensity + 2×peaking + taper; kisapäivä 12 slottia, 3 yritystä/laji) + porrastetut readiness-capit (työviikot täysi cap-only · taper YELLOW advisory/RED aktiivinen · kisapäivä K7-6 yksin) + VL-capit viikkoleimoista tutkimuskatolla (intensity ≤15 / peaking ≤10 %) + per-laji-yrityskuormat + B8-UI + **B9-odottava aktivointi (ma 20.7.)**. Vaihe sulkeutuu kisaan 22.8. · jäljellä: γ-vk-seuranta livedatalla + Wizard-P3/peaking-lykkäyskirjaus |
| 21 | **KAPSTONI — eliittiverdikti 3 pilarissa** | AVOIN (palautettu sekvenssiin 2026-06-10) | mullistava-määritelmän 4. komponentti (v4 FINAL §13); pilari 1 = reaaliaikainen autoregulaatio — **D1-LINJAUS RATIFIOITU** (docs/OBS-038); **pilari 3 (Wizard-materialisaatio) OSOITETTU 2026-07-01** (puhdas sokea portti 6/6 + P7∧P8); verdikti annetaan vasta kun M1 ∧ M2 ∧ Kerros 3 pystyssä |

**Vaihe 17 (VALMIS, 2026-05-28)** toteutettu kapeammin kuin alkuperäinen ROADMAP-spec: H-006b A1 liike-spesifi primer-rajaus (tankoliikkeet + Lisäpainoleuanveto primerEnabled=true; Dippi+MU false atletti-realismin pohjalta), A2 yksipisteinen primer @ ~60% + sys-1RM-päivitys baseline-vertailusta ±2.5/5% (EI 3-pisteen LV-regressio), A3 K-β-1/2/4/5 audit-engine.mjs, A4 measurements-store type='primer'. 5-vaiheinen validointi: 4 K-β-flagia + LV-r²-tarkistus computeLoadVelocityProfile:ssa (engine.js:2437) — kanoninen 5-vaiheinen. Cal-pohjainen LV-regressio aktiivinen recommend():ssa (engine.js:2735, 4224).

---

## 5. Kisapäivä ja aikatauluarviot

**Kisapäivä: 22.8.2026** (streetlifting). Vaihe 20 (γ-peaking) optimoidaan tähän.

Aikatauluarviot ovat suuntaa-antavia, eivät lukittuja:

| Vaihe | Arvio | Ehto |
| --- | --- | --- |
| 17 Round B-α-2 | ~3–5 vk | suunnittelu + implementaatio + mahd. bug-fix-sarja |
| 14b DP-C-loppu | ~1–2 vk | rinnakkainen α-2:n suunnittelun kanssa |
| 18 Round B-β | ~2–4 vk | alkaa kun α-2 stabiloitu ≥ 4 vk |
| 19 Pohja-puhtaus 8/8 | testausvaihe | heinäkuu 2026; edellyttää 14b:n sulkua |
| 20 Round B-γ | heinäkuu 2026 → 22.8.2026 | aktivointi ~6 vk ennen kisaa |

Mittakaava: β Round B kerroksittain ~22 % valmis (α-1 ✓ / α-2, β, K-β, γ avoin), kokonaistyöstä infrastruktuuri mukaan lukien ~50–55 %.

---

## 6. Mitä tämä dokumentti EI ole

ROADMAP.md on **tilannekuva ja strateginen kaari — ei ledger.** Kanoninen totuus elää kahdessa paikassa: (1) git-historiassa (HEAD-SHA, commit-bodyt, backup-tagit) ja (2) Akselin kanonisessa sparring-ledgerissä, joka asuu sparring-keskustelussa — **EI repossa** (L42-ehto: "EI LEDGER-KIRJAUSTA CC:N TOIMESTA"). Ledger-rivien (L1–L53+) literaalisisältö ei kuulu tähän tiedostoon.

Ledgerin avoimet vahvistuskohdat (esim. L13, L52, L11) ratkaistaan Akselin sparring-keskustelussa, eivät tässä tiedostossa eikä Claude Coden toimesta.
