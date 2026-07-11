# CLOUD_SETUP.md — LeVe AI Claude Code on the web -pilvisandboxissa

> **Tarkoitus:** miten repo ajetaan claude.ai/code-pilvisandboxissa (Ubuntu-VM) niin, että kaikki neljä Stop-hookin laatuporttia toimivat. Laadittu 11.7.2026 (infra-kierros: ei muutoksia engineen, dataan, UI:hin eikä Stop-hookin portteihin).

---

## 1. Yhteenveto

- Repo on vanilla JS PWA **ilman npm-buildia ja ilman ulkoisia ajonaikaisia riippuvuuksia** — sovellus ja testit eivät lataa verkosta mitään.
- Stop-hookin portit 1–3 (smoke, engine-pilot, wizard-pilot) ovat puhdasta Nodea → toimivat Ubuntu-VM:ssä sellaisenaan.
- Portti 4 (headless-selaintestit) tarvitsee **Chromium-binäärin** ja **Node ≥ 22** -version (natiivi WebSocket CDP-yhteyteen). Nämä hoitaa `tools/cloud-setup.sh`.
- Testiajuri `tools/browser-test/run-browser-tests.mjs` tuntee Linux-selainpolut ja lisää Linuxilla kontti-liput (`--no-sandbox`, `--disable-dev-shm-usage`, …) automaattisesti. Windows-/macOS-käytös on bitilleen ennallaan.

## 2. Ympäristön luonti (claude.ai/code)

1. Luo ympäristö repolle `AHTili/leuanveto-valmentaja`.
2. Setup-komennoksi: `bash tools/cloud-setup.sh` — budjetti alle 5 min, tyypillisesti alle 2 min.
3. Verkkoyhteys: **Trusted riittää.** Ainoa verkkotarve on setup-skriptin kertaluonteinen Chromium-asennus (apt-arkistot → dl.google.com → npm-rekisteri). Ajon aikana mihinkään ei oteta yhteyttä — testiserveri on paikallinen `127.0.0.1`.

## 3. Mitä setup-skripti tekee

1. Tarkistaa Node-version; jos < 22, yrittää päivittää nvm:llä (ei-kriittinen, varoittaa).
2. Etsii toimivan selaimen valmiista poluista. Toimivuus verifioidaan `--version`-ajolla — pelkkä tiedoston olemassaolo ei riitä, koska Ubuntun `chromium-browser` voi olla snap-kääre, joka ei käynnisty sandboxissa.
3. Jos selainta ei ole, asentaa tikapuina: `apt-get install chromium` → `chromium-browser` → Google Chrome `.deb` (dl.google.com) → Chrome for Testing headless-shell (npm-rekisteri). Jokainen porras failaa hiljaa seuraavalle (`|| true`).
4. Normalisoi löydetyn binäärin symlinkiksi `~/.cache/leve-browser/chromium` — testiajurin ensisijainen Linux-polku.
5. Exit 0 vain, jos toimiva selain löytyy; muuten exit 1 selkeällä virheviestillä (ei väärää vihreää). Muissa käyttöjärjestelmissä skripti on no-op (exit 0).

## 4. Laatuportit sandboxissa

| # | Komento | Cloud-vaatimus |
| --- | --- | --- |
| 1 | `node tools/engine-pilot/lib/smoke-test.mjs` | vain Node |
| 2 | `node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w` | vain Node |
| 3 | `node tools/wizard-pilot.mjs` | vain Node |
| 4 | `node tools/browser-test/run-browser-tests.mjs` | Chromium + Node ≥ 22 |

Stop-hook (`.claude/settings.json`) ajaa kaikki neljä ja kirjoittaa lokit polkuihin `/tmp/leve-*.log` — Ubuntussa nämä toimivat natiivisti.

## 5. Vianetsintä

- **"Selainta ei löydy"** → aja `bash tools/cloud-setup.sh` uudelleen; jos asensit selaimen käsin epätyypilliseen polkuun, aseta `LEVE_BROWSER=<binäärin polku>`.
- **"DevToolsActivePort ei ilmestynyt"** → selain ei käynnisty. Varmista, ettei `LEVE_BROWSER_SANDBOX=1` ole asetettuna kontissa (lippu säilyttää Chromiumin oman hiekkalaatikon, joka ei toimi konteissa). Jos asetit `LEVE_BROWSER`in käsin, varmista `--version`-ajolla, että binääri oikeasti käynnistyy (snap-kääre ei käynnisty).
- **Node < 22** → `nvm install 22 && nvm use 22`.
- **Setup ylitti aikabudjetin** → apt-peili hidas; aja setup uudelleen (valmiiksi asentunut selain löytyy heti, skripti on idempotentti).

## 6. Rajaukset ja tunnettu jäännösriski

- Skripti ei muuta Stop-hookin portteja eikä sovelluskoodia; se vain valmistelee ympäristön.
- Laadittu ja verifioitu Windows-ympäristössä: kaikki 4 porttia vihreitä muutosten jälkeen, ja skriptin ei-Linux-haara (no-op, exit 0) testattu. **Ensimmäinen aito Ubuntu-ajo on vielä verifioimatta** — jos jokin tikapuiden porras ei toimi Trusted-verkkolistan takia, portaat 1–2 (apt) ovat todennäköisimmät onnistujat ja virheviesti kertoo jatko-ohjeen.
