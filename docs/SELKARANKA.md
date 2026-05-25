# Selkäranka 1–9 — LeVe-kierroksen pakollinen kurilista

> **Tarkoitus:** Tämä on jokaisen LeVe AI -muutoskierroksen pakollinen tarkistuslista.
> `CLAUDE.md` §8 viittaa tähän — lue se session alussa. Työnjako: `CLAUDE.md` =
> pysyvät invariantit, `ROADMAP.md` = strateginen vaihe, `HANDOFF.md` = aktiivinen
> tehtävä, tämä tiedosto = **miten kierros ajetaan**.
>
> Transkriboitu LeVe AI -strategiaprosessin pohjustuksesta. Kohdat 7 ja 9 viittaavat
> kanoniseen ledgeriin, joka elää sparring-keskustelussa — ei repossa (`CLAUDE.md`
> §7, L42-ehto). Code ei kirjoita ledgeriin.

---

1. **PRE-FLIGHT + STOP.** Vahvista `git rev-parse --abbrev-ref HEAD` = odotettu
   haara, `git rev-parse HEAD` = odotettu täysi SHA, `git status --porcelain` =
   tyhjä SESSION-AIKAISISTA MUUTOKSISTA (pre-existing untracked-tiedostot kuten
   PLAN.md sallittu, jos dokumentoitu). STOP jos mikä tahansa ei täsmää — raportoi
   todellinen tila, älä jatka.

2. **PERUUTUSANKKURI.** ENNEN mitään muutosta `git branch backup-pre-<kierros>-<sha>`;
   vahvista `rev-parse` = HEAD-SHA; STOP jos ei. Kirjaa palautuskomento raporttiin.
   (Diagnostisilla vain-luku-kierroksilla peruutusankkuri ei tarpeellinen — mainitse
   raportissa eksplisiittisesti.)

3. **SCOPE-LUKKO VERIFIOITAVANA HYVÄKSYMISKRITEERINÄ.** Kierroksen sallittu
   `git diff` on valkolista (mitkä tiedostot / minkä luonteinen muutos), EI luvattu
   periaate. STOP jos diff ylittää valkolistan.

4. **DIFF-CONTROL ERILLISINÄ COMMITTEINA.** Jokainen erillinen muutoslähde = oma
   commit. Sulauta vain jos diagnoosi todistaa saman juuren — raportoi se
   löydöksenä.

5. **STOP-EHDOT EHDOTTOMINA IMPERATIIVEINA.** Jokainen STOP on pysähdys + raportoi +
   odota Akselia, ei autonomista kiertoa. Diagnostisissa kierroksissa: "raportoi,
   älä toimeenpane".

6. **MITTARI-ENSIN-TODISTUSTASO.** Gate-syöttöinen invariantti/mittari on
   todennettava ENNEN luottamusta — tunnettu-positiivinen ja tunnettu-negatiivinen,
   aritmetiikka käsin. Vasta sitten gatessa.

7. **KEVYT LEDGER-RIVI.** Jokainen polkuriippuvuus tai rakenteellinen päätös →
   ledger-rivi, rakenteellisesti näkyvä, ei muisti. Erota: L4/L5-tyyli = ratkaistu
   rajaus; L6/L7/L9/L10/L11-tyyli = tunnettu aukko / avoin / lykätty (EI sekoiteta).
   Session-close vain kolmella triggerillä (iso prosessinivel / konteksti ~80 % /
   Akseli pyytää).

8. **EI PUSHIA originiin ilman Akselin eksplisiittistä lupaa.** Rakenteelliset ja
   irreversiibelit päätökset pysähtyvät Akselille.

9. **LEDGER-IMMUTABILITEETTI.** Kanonisen ledgerin literaalit muutetaan vain Akselin
   eksplisiittisellä päätöksellä; rekonstruointi muistinvaraisesti on kielletty.
   Yhteenvedot ja avustavat dokumentit (myös tämä tiedosto) eivät korvaa kanonista
   lähdettä.
