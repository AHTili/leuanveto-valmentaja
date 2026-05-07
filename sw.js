// sw.js — Service Worker (offline-first, network-first navigation, cache-first assets)
// LeVe AI v4.34.46 — OHJELMAT-NÄKYMÄN PIKAKORJAUKSET (Vaihe 1.6/3):
// Atletin palaute v4.34.45-pushin jälkeen: "1) miksi liikepankin historia-nappi
// ei toimi? 2) perusjaksot (44 kpl) on tyhjiä ja turhia ohjelmia."
// (1) Liikepankin 📊-painike avasi detail-kortin sivun pohjalle piiloon
// liikelistan alle — käyttäjä luuli ettei nappi tee mitään. KORJAUS:
// scrollIntoView({ behavior: 'smooth', block: 'start' }) detail-divin avauksen
// jälkeen, viewporttiin nyt automaattisesti.
// (2) 44 autocreated default-mesoa olivat kerääntyneet aikojen saatossa init-
// vaiheen sivuvaikutuksena (createDefaultMesocycle joka init jossa active=null
// → save). Vain "Vaihda ohjelma" -toiminto siivosi orphanit. Aiemmin nämä
// olivat näkymättömissä, mutta v4.34.45:n Ohjelmat-sektio paljasti kaikki.
// KORJAUKSET 1.6b-d: (b) Ohjelmat-näkymä suodattaa orphan-mesot pois
// oletuksena (näytä vain merkitykselliset). (c) "🧹 Siivoa tyhjät" -nappi
// jolla atletti voi puhdistaa orphanit yhdellä klikkauksella + vahvistus.
// (d) Init-vaiheessa autocreated default aktivoidaan heti setActiveMesocycle:lla
// → estää uuden orphan-tilanteen kerääntymisen tulevaisuudessa.

const APP_VERSION = "4.34.46";
const CACHE_NAME = `leve-ai-v${APP_VERSION}`;

// v4.34.9: Kuuntele SKIP_WAITING-message-eventtia, jolla pää-säie voi pakottaa
// uuden SW:n aktivoitumisen heti (update-bannerin "Lataa nyt" -nappi käyttää tätä).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./engine.js",
  "./data.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: navigation network-first (3s timeout), assets stale-while-revalidate, others cache-first
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // v4.34.37: navigation-pyynnöt (= index.html) → network-first 3 s timeout, fallback cache.
  // Tämä takaa että käyttäjä saa AINA uusimman index.html:n + script-viittaukset
  // kun online. Aiempi stale-while-revalidate palveli vanhan HTML:n joka viittasi
  // vanhoihin engine.js + data.js -tiedostoihin → automaattinen päivitys ei toiminut.
  if (event.request.mode === "navigate") {
    event.respondWith(
      Promise.race([
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return response;
        }),
        new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).then(async (networkResponse) => {
        if (networkResponse) return networkResponse;
        // Timeout tai fail → fallback cache
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request) || await cache.match("./index.html");
        return cached || new Response("Offline", { status: 503 });
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request) || await cache.match("./index.html");
        return cached || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  const isCoreAsset = CORE_ASSETS.some(a => url.pathname.endsWith(a.replace("./", "/")));

  if (isCoreAsset) {
    // Stale-while-revalidate: serve cache immediately, update in background
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => null);

        return cached || fetchPromise || new Response("Offline", { status: 503 });
      })
    );
  } else {
    // Non-core assets: cache-first, network fallback
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response("Offline", { status: 503 }));
      })
    );
  }
});
