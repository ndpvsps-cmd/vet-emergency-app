// Service worker for Vetเพื่อนยาก — caches the app shell so calculators keep working
// without a signal (relevant for an emergency tool). Uses stale-while-revalidate: every
// request is answered from cache instantly when available, while a network fetch runs in
// the background to refresh the cache for next time. Bump CACHE_NAME to force every client
// to drop old cached files on next load.
const CACHE_NAME = "vet-peuan-yak-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./app.js",
  "./nav.js",
  "./nutrition.js",
  "./potassium-calc.js",
  "./sodium-calc.js",
  "./cri-calc.js",
  "./se-calc.js",
  "./apple-score-calc.js",
  "./mgcs-calc.js",
  "./att-score-calc.js",
  "./anemia-calc.js",
  "./sodium-bicarb-calc.js",
  "./anaphylaxis-calc.js",
  "./feline-ckd-calc.js",
  "./feline-dm-calc.js",
  "./rehydration-calc.js",
  "./mascot.js",
  "./sparkle-fx.js",
  "./data/drugs.js",
  "./data/diets.js",
  "./data/potassium.js",
  "./data/sodium.js",
  "./data/cri-drugs.js",
  "./data/status-epilepticus.js",
  "./data/apple-score.js",
  "./data/mgcs-score.js",
  "./data/att-score.js",
  "./data/anemia-score.js",
  "./data/sodium-bicarbonate.js",
  "./data/anaphylaxis.js",
  "./data/feline-ckd.js",
  "./data/feline-dm.js",
  "./assets/tarp-mascot.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Only manage same-origin requests — let cross-origin ones (Google Fonts, etc.) pass
  // through to the browser's own cache untouched.
  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
