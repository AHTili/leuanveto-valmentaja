// wizard-sw.js — Wizard 3.2 Service Worker -alustus (Track B Vaihe 1A)
// LeVe AI v4.37+ — wizard-modulin offline-cache + päivitys-banneri
//
// Suunnitteluvalinta: erillinen SW-rekisteröintiskripti pää-sw.js:n rinnalla.
// Pää-sw.js (LeVe Coach v4.38.x) hoitaa pää-sovelluksen cachen. Wizard-moduli
// elää itsenäisenä alustana Track B -kehityksen aikana (oma cache-tunnus,
// oma asset-lista), joten se voidaan deployata ja päivittää erillään
// häiritsemättä päätoiminnallisuutta.
//
// Tämä tiedosto on ladattavissa kahdella tavalla:
//   1. Suoraan Service Worker -kontekstissa (importScripts tai erillinen SW-skripti
//      tulevaisuudessa kun wizardilla on oma index.html)
//   2. Pää-säikeen rekisteröinti-helperinä (registerWizardSW) joka kutsutaan
//      index.html:stä tai wizard-host -sivulta
//
// Phase 1A:ssa skripti tarjoaa rekisteröinti-helperin + päivitys-banneri-koukun.
// Itse cache-strategia (install/activate/fetch) on määritelty samassa tiedostossa
// SW-context-tunnistuksen takana — tiedosto toimii sekä page-kontekstissa että
// SW-kontekstissa, mikä on yleinen vanilla-PWA-pattern.

export const WIZARD_SW_VERSION = "3.2.0-track-b-1a";
export const WIZARD_CACHE_NAME = `leve-wizard-v${WIZARD_SW_VERSION}`;

export const WIZARD_CORE_ASSETS = [
  "./wizard/wizard-schema.js",
  "./wizard/wizard-data.js",
  "./wizard/wizard-sw.js",
];

// ── Pää-säikeen helperit ──
// registerWizardSW(): rekisteröi /sw.js:n (käyttää pää-SW:tä) — wizard-moduli
// pyörii samassa origin/scope:ssa kuin pää-app. Tämä helper:
//  - kuuntelee SW-päivityksiä (updatefound + statechange)
//  - palauttaa callback-koukun (onUpdateReady) UI:lle joka voi näyttää bannerin
//  - tarjoaa skipWaiting()-pikalatauksen jonka UI-banneri kutsuu
//
// Käyttö index.html:ssä tai erillisessä wizard-host-sivussa:
//   import { registerWizardSW } from "./wizard/wizard-sw.js";
//   registerWizardSW({ onUpdateReady: () => showBanner() });
export async function registerWizardSW(opts = {}) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("[wizard-sw] SW ei tuettu tässä selaimessa");
    return null;
  }
  const scriptPath = opts.scriptPath || "./sw.js";
  const scope      = opts.scope      || "./";
  let reg;
  try {
    reg = await navigator.serviceWorker.register(scriptPath, { scope });
  } catch (e) {
    console.error("[wizard-sw] rekisteröinti epäonnistui:", e);
    return null;
  }

  // Päivitys-detektointi (vrt. data.js v4.34.9 update-banner-pattern)
  if (reg.waiting && navigator.serviceWorker.controller) {
    if (typeof opts.onUpdateReady === "function") opts.onUpdateReady(reg);
  }
  reg.addEventListener("updatefound", () => {
    const newSW = reg.installing;
    if (!newSW) return;
    newSW.addEventListener("statechange", () => {
      if (newSW.state === "installed" && navigator.serviceWorker.controller) {
        if (typeof opts.onUpdateReady === "function") opts.onUpdateReady(reg);
      }
    });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (opts.reloadOnControllerChange !== false) {
      window.location.reload();
    }
  });

  return reg;
}

// activateWaitingWizardSW(reg): UI-bannerin "Lataa nyt" -nappi kutsuu tämän.
// Lähettää SKIP_WAITING-viestin SW:lle joka aktivoituu välittömästi.
export function activateWaitingWizardSW(reg) {
  if (!reg || !reg.waiting) return false;
  reg.waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

// ── SW-kontekstin koodit ──
// Jos tämä tiedosto ladataan SUORAAN Service Worker -kontekstissa (esim.
// importScripts("./wizard/wizard-sw.js") pää-sw.js:stä), nämä rekisteröidään.
// Tällä hetkellä pää-sw.js (LeVe AI 4.38.9) hoitaa cachen itsenäisesti, joten
// tämä lohko on dormant kunnes wizard saa oman SW-host-sivunsa Phase 1B/1C:ssä.
if (typeof self !== "undefined" && typeof self.skipWaiting === "function" && typeof window === "undefined") {
  // SW-kontekstissa: rekisteröi SKIP_WAITING-kuuntelija idempotentisti
  self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });

  // Install: pre-cache wizard-coreassetit (vain jos pää-SW ei jo ole pre-cachannut)
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(WIZARD_CACHE_NAME).then((cache) => cache.addAll(WIZARD_CORE_ASSETS)).catch(() => null)
    );
  });

  // Activate: siivoa vanhat wizard-cachet (sallii rolling-päivityksen)
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter(k => k.startsWith("leve-wizard-v") && k !== WIZARD_CACHE_NAME).map(k => caches.delete(k))
        )
      )
    );
  });
}
