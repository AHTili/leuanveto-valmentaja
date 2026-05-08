// sw.js — Service Worker (offline-first, network-first navigation, cache-first assets)
// LeVe AI v4.35.1 — Edistyminen-välilehden e1RM yhtenäistetty recommend()-funktion
// kanssa. Atletin palaute 2026-05-08: e1RM näytti 170.8 (median) Edistyminen-
// näkymässä mutta 184.9 (PLAN_BASED) recommend-tracessa → epäjohdonmukainen.
// Korjaus: uusi computeMovementE1RMBest-funktio joka käyttää SAMAA priorisointia
// kuin recommend() (cal → plan-based → median). Edistyminen-välilehti kutsuu nyt
// tätä, joten kaikkialla näkyy sama luku. Ei muuta progressio-target-laskentaa.
//
// v4.35.0 — ELIITTITASON PROGRESSIO-MALLI (Helms 2018, Cumming 2024,
// Issurin 2010): refaktoroitu rikkinäinen cap-only-pohja tutkimuspohjaiseksi.
//
// Yhdenseuraussessio (2026-05-08): atletin palaute "kymmeniä auditointeja ja silti
// ohjelma on lapsen kengissä — miksi?". Vastaus: pohja-algoritmi (loadPct ×
// baseline + adhoc-capit) ei ollut tutkimukseen perustuva. Refaktorointi:
//   • PROGRESSION_CONFIG-vakio (engine.js:52-110) — magic numbers yhteen paikkaan
//   • computeProgressionTarget-funktio (engine.js:1847-2010) — yksi keskitetty
//     päätös progressiolle: regain-multiplier (Cumming 2024 retraining ~33-50%
//     nopeampi), Helms 2018 Vx-mismatch-säätö (1Vx = 2% session-välillä),
//     viikoittainen baseline +2.5%/vk (Helms 2018 + RP), V0-grindi-suoja,
//     yliajot cal/deload/speed-päivissä
//   • Integroitu primary-haaraan + cross-reference-haaraan (sama logiikka molemmille)
//   • 12 yksikkötestiä eristyksessä (E1-E12, regain FAR/NEAR, PR-vaihe, V0-fail,
//     deload, speed, no-history, no-plan, Helms Vx-adj, PLAN_BASED-harmonisointi,
//     multi-week, hard-cap)
//   • 304 testiä OK, ei regressiota nykyisiin 281+ testiin
//
// ATLETIN ESIMERKKI (vk 1 LA Takakyykky 120 kg V4 helposti, cfg 185):
//   ratio 0.65 < 0.85 → REGAIN_FAR (×2.0). weekly = 0.025 × 2.0 × 1 = 5%.
//   Autoreg = 120 × 1.05 = 126 kg V4. Plan-floor 102. Hard-cap 138. Final 126.
//   → osuu atletin odotukseen 126-132 kg (eliittitasoinen progressio regainissa).
//
// Lisäksi korjattu sw.js:n APP_VERSION-uudelleenmääritysbugi: aiemmissa versioissa
// jokainen const APP_VERSION = "..." -bumppi jätti vanhat määritykset aktiivisina
// → SyntaxError SW:n parserissa. Nyt vain yksi aktiivinen, vanhat historiana
// kommenteissa.
//
// v4.34.50 — PROGRESSION_FLOOR_CAP_CROSSREF (regression-suoja
// secondary-sloteille, atletin 2. palaute 2026-05-08):
//
// Atletti suoraan: "Jos olen tehnyt secondary kyykyn 120 kg viime lauantaina,
// et voi laskea 102 kg seuraavalle. Jokin on pahasti pielessä."
//
// JUURISYY: Primary-slotille on ollut PROGRESSION_FLOOR_CAP (engine.js:3131)
// joka estää kuorman laskun viime sessiosta — mutta cross-reference-haara
// (engine.js:3300+, secondary-slotit kuten LA Takakyykky streetlifting_16w:ssä)
// ei tunnistanut tätä suojaa. v4.34.49:n cfg-floor parani tilannetta vain
// osittain (94 → 102 kg), mutta atletin todellinen suoritus 120 kg jäi alaksi.
//
// KORJAUS engine.js:3370 (kun PROGRESSION_RATE_LIMIT_CROSSREF on käsitelty):
// Lisätty PROGRESSION_FLOOR_CAP_CROSSREF samoilla säännöillä kuin primary:
//   - useLastAnchor (uusi Vx >= viim. Vx)
//   - !lastSession.isCalibration
//   - weekDef.deltaPctBase >= 0
//   - dayPlan.dayType !== "speed"
// Floor: lastSession.medianLoad SUORAAN (ei -2.5%). Atletti pystyi tähän
// kuormaan viim. session targetin Vx:llä → seuraavan sessio sama-Vx target
// ei saa olla pienempi.
//
// VAIKUTUS ATLETIN VK 2 LA -SESSIOON
// - Ennen v4.34.49: 94 kg (= 0.55 × 170 historia)
// - v4.34.49 (cfg-floor): 102 kg (= 0.55 × 185 cfg)
// - v4.34.50 (floor-cap): 120 kg (= viime suorituksen taso)
// Atletti voi tehdä 130 V4 → engine oppii ja vk 3 LA target on >= 130 kg.

const APP_VERSION = "4.35.1";

// v4.34.50 oli aiempi APP_VERSION (= "4.34.50") tässä kohdassa.
// v4.34.49 muutoshistoria:
// (1) MU eksentrinen näytti "+64.5 kg" skill-vaiheessa (vk 1-4) vaikka slot on
//     BW + kuminauha (suggestedLoadKg=0). Syy: UI:n primary-slot-rendering käytti
//     rec.targetExternalLoad fallbackia kun aktiivisen liikkeen e1RM=0, mikä
//     vuoti Lisäpainoleuanveto-targetin (0.55 × leuka-e1RM ≈ 64.5) MU-rivillä.
//     KORJAUS index.html:2655 — jos slot.suggestedLoadKg===0 tai muSkillPhase===true,
//     näytä "BW" (ei rec.targetExternalLoad). Vaikuttaa MU eksentrinen vk 1-4.
// (2) Vk 2 LA Takakyykky näytti 94 kg (= 0.55 × 170 historia-mediani) vaikka
//     atletin Asetuksissa cfg.kyykkyExtKg = 185 (= 102 kg). Syy: cross-reference-
//     haara engine.js:3300 käytti pelkkää historia-mediania ja ohitti cfg-arvon.
//     KORJAUS: cfg-floor — käytä max(historia-mediani, cfg-arvo) × loadPct.
//     Säilyttää konservatismin (cfg ei voi LASKEA kuormaa), mutta atletin
//     intentionaalinen cfg-arvo toimii alarajana. Jos historia > cfg, historia
//     voittaa kuten ennen. Uusi trace CFG_FLOOR_APPLIED audit-trailiin.
// 276/276 OK, ei regressiota. Streetlifting_16w-meson rakenne ennallaan.

// v4.34.49 oli aiempi APP_VERSION tässä kohdassa.
// v4.34.48 muutoshistoria:
// generateBlockTuningPackage on hardkoodattu streetlifting_16w-mesolle (foundation/
// strength/intensity/peaking-blokit, kisaliikkeet, vk 4/8/12 deload-mappi).
// Atletti: "Olisi tärkeää että AI-block-tuning toimisi muillekin mesotyypeille
// jotta sovellus on 9/10 koko järjestelmänä." Uusi yleinen versio:
//   - generateGenericBlockTuningPackage: deload-tunnistus weekDef.deltaPctBase < 0
//   - Etsii primary-liikkeet weekPlans:sta dynaamisesti (ei hardkoodattuja)
//   - Käyttää movementCfg:tä jos olemassa (v4.34.44 yleistys)
//   - Sama markdown + json + AI-prompt -output kuin streetlifting-versio
// UI-kytkentä: btn-generate-block-tuning käyttää nyt streetlifting_16w:lle
// alkuperäistä funktiota, muille mesoille uutta yleistä versiota.
// 4 uutta testiä test-runneriin (276/276), mukaan lukien KAVERI-FIXTURE
// (Maija: penkki+mave, ei velocity-mittaria, 1RM-kalibroitu) joka todistaa
// että koko Vaihe 1-3 -ketju toimii kuvitteelliselle uudelle käyttäjälle.
//
// v4.34.47 (edellinen) — LIIKEPANKKI-MODAALI WIZARDIIN (Vaihe 2-Lite):
// Wizardin Päälikkeet-valinta tarjosi vain 8 hardkoodattua liikettä — 122
// liikepankin liikettä jäi piiloon. Lisätty "+ Lisää muu liike" -chip joka
// avaa showMovementBankModal:in. Modaalissa: tekstihaku + kategoria-suodatus
// (9 kategoriaa) + lista (max 80 näkyvää, lisää-vinkki jos enemmän).
// Klikkaus liikkeelle lisää sen wizardin extraPrimaries-listaan + valinnan-
// listaan. Säilyttää max-3-päälike-rajan. State.movements luetaan suoraan
// (122 liikettä, IDB-pohjainen).
// 260/260 testiä OK, ei regressiota.
//
// v4.34.46 (edellinen) — OHJELMAT-NÄKYMÄN PIKAKORJAUKSET (Vaihe 1.6/3):
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

// v4.34.46 oli aiempi APP_VERSION tässä kohdassa.
// (Aktiivinen APP_VERSION-määritys löytyy ylhäältä.)
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
