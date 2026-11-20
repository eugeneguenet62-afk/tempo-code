/* Tempo hors connexion : les pages et les fichiers de l'application sont gardés en cache.
   Les pages se mettent à jour dès que le réseau est là ; l'API (comptes, carnets) n'est jamais mise en cache. */
const VERSION = "tempo-v12";
const CORE = [
  "./", "index.html", "allure.html", "plan-entrainement.html", "carnet-course.html", "musculation.html", "carnet.html",
  "zones-cardiaques.html", "calories.html", "compte.html", "confidentialite.html", "mentions-legales.html", "apropos.html", "multisport.html", "404.html",
  "style.css", "journal.css", "app.js", "journal.js", "kcal.js", "exercices.js", "illustrations.js", "guides.js", "muscu-guide.js", "share.js", "gpx.js", "sport-icons.js", "sports.js", "charge.js", "multisport.js", "demo.js", "fx.js", "store.js", "firebase-config.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-48.png", "icons/logo.svg", "fonts/unbounded-latin-600-normal.woff2", "fonts/unbounded-latin-800-normal.woff2", "fonts/manrope-latin-400-normal.woff2", "fonts/manrope-latin-600-normal.woff2", "fonts/manrope-latin-800-normal.woff2", "img/home/running-main.webp", "img/home/squat-peak.webp",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "tempo-fonts").map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Polices Google : gardées une fois chargées
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open("tempo-fonts").then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req); if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // Pages : réseau d'abord, cache si hors connexion
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html") || /\.(css|js)$/.test(url.pathname)) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match(/\.(css|js)$/.test(url.pathname) ? req : "index.html")));
    return;
  }
  // Fichiers : cache tout de suite, mise à jour en arrière-plan
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
