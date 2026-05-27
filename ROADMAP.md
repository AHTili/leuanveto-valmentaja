# ROADMAP.md — LeVe AI strateginen R-sekvenssi

> **Mikä tämä on:** LeVe AI:n strateginen kehityskaari — 20-vaiheinen R-sekvenssi v4, nykytila, reunaehdot ja aikataulu. Tämä on projektin **ainoa kanoninen vaihemalli**.
>
> **Kolmen kerroksen malli:** `CLAUDE.md` = pysyvät invariantit ja säännöt · `ROADMAP.md` (tämä) = strateginen kaari + NYT-merkki · `HANDOFF.md` = yksi aktiivinen tehtävä. Claude Code lukee kaikki kolme session alussa (`CLAUDE.md` §8).
>
> **Päivitysprotokolla:** vaiheen tila ja NYT-merkki muuttuvat **vain committilla** kun vaihe sulkeutuu — ei muistinvaraisesti. ROADMAP = mikä vaihe; HANDOFF = mikä tehtävä vaiheen sisällä.
>
> **Tilannekuva:** 27.5.2026 · HEAD `702aa63` · APP_VERSION `4.52.10`. Visuaalinen vastine: `prosessikartta-v4.html`.

---

## 1. Kunnianhimon taso — "voimaharjoittelua mullistava"

Akselin omat sanat. Tämä taso säilyy ennallaan koko prosessin ajan, reunaehtojen (a)/(b)/(c) suojaamana.

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

**NYT-merkki: vaihe 17 (Round B-α-2).**

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
| 17 | Round B-α-2 — Lähde 2 primer + K-β-primer audit | **NYT** | scope ~165–250 riviä; mahd. jako α-2.1 + α-2.2 |
| 18 | Round B-β — HRV-bias + shadow mode + K-β-HRV audit | SEURAAVA | ~135–225 riviä; alkaa kun α-2 stabiloitu ≥ 4 vk |
| 19 | Pohja-puhtaus 8/8 -verifiointi | SEURAAVA | reunaehto (a) -gate; edellyttää vaiheen 14b sulkua |
| 20 | Round B-γ — peaking | LYKÄTTY | VL-cap 20→15→10 %; aktivoidaan ~6 vk ennen kisaa |

**Vaihe 17 (NYT) lyhyesti:** Lähde 2 primer-mekanismi cal-override-patternin generalisointina — lineaarinen L-V-regressio, 3-pisteen primeri (~50/70/85 % session-1RM:stä), 5-vaiheinen validointi, `measurements`-store `type="primer"`, K-β-1/2/4/5-flagit audit-engine.mjs:ään. Tarkka scope ja acceptance criteria laaditaan vaiheen 17 `HANDOFF.md`:ssä.

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
