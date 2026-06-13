# H-016-ramppisimulaatio — paluuramppi × OBS-040/042-lukupolku (2026-06-13)

> Relay-deliverable (2026-06-12, kohta 3): "H-016-ramppisimulaation arvo riippuu OBS-042-median-määritelmästä; simulaatio ajetaan yhä: dipin ramppi tuottaa todellisia kevyitä sessioita vk 25–26." Ajettu tuoretta backupia vasten (`12.6. 19:00`, 424 settiä). Engine: HEAD `f215258`.

## Kysymys

Vk 25–26 dippipaluu tuottaa **todellisia kevyitä paluusessioita** (reload-target 63,8 → 75 kg). Heiluttaako tämä (a) reload-targetia itseään tai (b) liike-detalji-modalin trendikorttia (OBS-040-fix + OBS-042-avoin)?

## Tulokset

**A3-ankkuri (tuore data):** dipin viimeisin top-työsarja 27.5. = 75 kg × 3 V1. Tauko 27.5. → 16.6. = 20 pv (≥14 → reload laukeaa).

| Vaihe | reload-target | trendikortti (Best) |
| --- | --- | --- |
| ennen 1. paluuta (16.6.) | **63,8 kg** (first-return 1/3, −15 % ankkurista 75) | 194,4 (cal) |
| + kevyt paluusessio 63,75 kg (19.6.) | **69,4 kg** (ramp 2/3, toteumasta) | 194,4 (cal) |
| + kevyt paluusessio 69,5 kg (23.6.) | **75,0 kg** (ramp 3/3 = ankkuri) | 194,4 (cal) |

## Johtopäätös (3 immuniteettia)

1. **Trendikortti immuuni:** dipin `computeMovementE1RMBest` = **cal-lähteestä** (194,4) — cal voittaa fallback-medianin, joten OBS-042:n `slice(-6)`-median-vinouma EI osu dippiin. Kevyet paluusessiot eivät romahduta korttia. *(Liike jolla EI ole cal-lähdettä JA saa kevyitä paluusessioita olisi altis — mutta dippi on cal-ankkuroitu; OBS-042-handoff kattaa yleisen tapauksen.)*
2. **Reload-target Best-riippumaton:** target seuraa A3-ankkuria (top+kuorma>0, = 75) + toteuma-portaita, EI Bestiä → Best-heilunta ei vaikuta ramppiin millään tavalla.
3. **min-precedence-suoja:** `targetExternalLoad = min(normaali, reload)` — vaikka Best (ja sen kautta normaali-target) laskisi, reload pysyy konservatiivisena, ramppi ei nouse ennenaikaisesti.

**Verdikti:** OBS-040-fix (kortti → kanoninen) ja OBS-042 (Best-fallback-median avoin) **eivät vaaranna H-016-paluuramppia.** Reload on rakenteellisesti eristetty trendikortin lukupolusta. OBS-042:n korjaus voi edetä omassa tahdissaan (LOAD-DIFF-SWEEP-luokka) ilman vk 25 -aikatauluppainetta dipin osalta.
