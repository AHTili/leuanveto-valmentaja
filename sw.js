// sw.js — Service Worker (offline-first, network-first navigation, cache-first assets)
// LeVe AI v4.34.43 — CFG-DRIFT (mestarillinen ohjelmointikone):
// Engine OPPII cfg-baseline-arvon atletin todellisesta suoriutumisesta.
// Kaksi signaalia: SIGNAL B (priority) = primer-velocity-trend (objektiivinen,
// vaatii n>=5 mittausta), SIGNAL A (fallback) = vx-overshoot (Vx-arviolta).
// Drift max +5%/blokki (velocity) tai +10%/blokki (vx). Reset: cal-päivä,
// V0-fail, RED readiness. CFG-DRIFT-historia integroitu AI-block-tuningiin.
//
// Atletin palaute 2026-05-07: "Toivoin, että sovellus on niin mestarillinen
// että se kykenee tunnistamaan potentiaalini." Tämä versio toteuttaa sen.

const APP_VERSION = "4.34.43";
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
