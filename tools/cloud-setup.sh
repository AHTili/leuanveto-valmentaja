#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# LeVe AI — pilvisandboxin setup-skripti (Claude Code on the web, Ubuntu-VM)
# ═══════════════════════════════════════════════════════════════
#
# Asentaa headless-selaintestien (Stop-hookin portti 4) tarvitseman Chromiumin
# ja normalisoi sen polkuun jonka tools/browser-test/run-browser-tests.mjs
# tuntee. Portit 1–3 (smoke, engine-pilot, wizard-pilot) ovat puhdasta Nodea
# eivätkä tarvitse tätä skriptiä.
#
# Budjetti: < 5 min (tyypillisesti < 2 min). Ei-kriittiset vaiheet failaavat
# hiljaa (|| true); kriittinen lopputulos — toimiva selainbinääri — verifioidaan
# lopussa ja sen puute palauttaa exit 1 (rehellinen signaali, ei väärää vihreää).
#
# Käyttö:  bash tools/cloud-setup.sh   (ympäristön setup-komentona)
# Dokumentaatio: docs/CLOUD_SETUP.md

set -u

if [ "$(uname -s)" != "Linux" ]; then
  echo "cloud-setup: vain Linux-ympäristölle (nyt: $(uname -s)) — ei tehty mitään."
  exit 0
fi

LINK_DIR="$HOME/.cache/leve-browser"
LINK="$LINK_DIR/chromium"

# Etsi TOIMIVA selain: pelkkä tiedoston olemassaolo ei riitä, koska Ubuntun
# chromium-browser voi olla snap-kääre joka on olemassa mutta ei käynnisty
# ilman snapd:tä → vaaditaan onnistunut --version-ajo (timeout-suojattuna).
find_browser() {
  local c
  for c in "$LINK" /usr/local/bin/chromium /usr/bin/chromium /usr/bin/chromium-browser \
           /usr/bin/google-chrome /usr/bin/google-chrome-stable \
           /opt/google/chrome/google-chrome /snap/bin/chromium; do
    if [ -x "$c" ] && timeout 10 "$c" --version >/dev/null 2>&1; then
      printf '%s\n' "$c"
      return 0
    fi
  done
  return 1
}

echo "== LeVe cloud-setup: alku $(date -u +%H:%M:%SZ) =="

# ── 1) Node-versio (portti 4 vaatii Node ≥ 22: natiivi WebSocket CDP:lle) ──
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "${NODE_MAJOR:-0}" -lt 22 ]; then
  echo "VAROITUS: Node < 22 ($(node --version 2>/dev/null || echo 'ei nodea')) — selaintestiajuri tarvitsee ≥ 22."
  # nvm on shell-funktio, ei binääri → lataa jos asennettuna, ja yritä päivittää.
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
  if command -v nvm >/dev/null 2>&1; then
    { nvm install 22 >/dev/null 2>&1 && nvm alias default 22 >/dev/null 2>&1 \
      && echo "Node päivitetty: $(node --version)"; } || true
  fi
fi

# ── 2) Chromium: nopea polku jos jo asennettuna ──
if B="$(find_browser)"; then
  echo "Selain löytyy valmiiksi: $B"
else
  echo "Selainta ei löydy — asennetaan (tikapuut: apt chromium → apt chromium-browser → Chrome .deb → headless-shell)"
  export DEBIAN_FRONTEND=noninteractive
  SUDO=""
  [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo -n"

  $SUDO apt-get update -qq || true
  # Fontit ei-kriittisenä (innerText-pohjaiset testit toimivat ilmankin).
  $SUDO apt-get install -y -qq --no-install-recommends fonts-liberation || true

  # Askel 1: 'chromium' (aito paketti Debianissa ja osassa imageja).
  $SUDO apt-get install -y -qq --no-install-recommends chromium || true
  # Askel 2: 'chromium-browser' (Ubuntu; voi olla snap-transitional → voi failata).
  find_browser >/dev/null || $SUDO apt-get install -y -qq --no-install-recommends chromium-browser || true
  # Askel 3: Google Chrome .deb suoraan (dl.google.com) — ohittaa Ubuntun snap-ansan.
  if ! find_browser >/dev/null; then
    rm -f /tmp/leve-chrome.deb
    if curl -fsSL --max-time 180 -o /tmp/leve-chrome.deb \
         https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb; then
      $SUDO apt-get install -y -qq /tmp/leve-chrome.deb || true
    fi
    rm -f /tmp/leve-chrome.deb || true
  fi
  # Askel 4: Chrome for Testing headless-shell npm-rekisterin kautta (viimeinen keino).
  if ! find_browser >/dev/null; then
    npx -y @puppeteer/browsers install chrome-headless-shell@stable --path "$LINK_DIR/cft" >/dev/null 2>&1 || true
    SHELL_BIN="$(find "$LINK_DIR/cft" -type f -name chrome-headless-shell 2>/dev/null | head -n1)"
    if [ -n "${SHELL_BIN:-}" ]; then
      mkdir -p "$LINK_DIR" && ln -sf "$SHELL_BIN" "$LINK" || true
    fi
  fi
fi

# ── 3) Normalisointi: symlink vakiopolkuun jonka testiajuri tarkistaa ensin ──
if B="$(find_browser)" && [ "$B" != "$LINK" ]; then
  { mkdir -p "$LINK_DIR" && ln -sf "$B" "$LINK"; } || true
fi

# ── 4) Kriittinen verifiointi ──
if B="$(find_browser)"; then
  echo "OK: selainbinääri: $B ($(timeout 10 "$B" --version 2>/dev/null || echo 'versio ei luettavissa'))"
  echo "== LeVe cloud-setup: valmis $(date -u +%H:%M:%SZ) =="
  exit 0
fi

echo "KRIITTINEN: Chromiumia/Chromea ei saatu asennettua — Stop-hookin portti 4 (selaintestit) ei toimi."
echo "Portit 1–3 (smoke, engine-pilot, wizard-pilot) toimivat silti. Korjaus: asenna selain käsin"
echo "ja/tai aseta LEVE_BROWSER=<binäärin polku>. Ks. docs/CLOUD_SETUP.md → Vianetsintä."
exit 1
