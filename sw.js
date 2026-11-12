/* Service worker 11Barré : pages réseau d'abord (mises à jour immédiates), cache en secours pour l'usage hors ligne. */
const V = "onzebarre-v7";
const COQUE = ["./", "index.html", "chauffeur.html", "fournisseur.html", "admin.html", "demo.html", "manifest-admin.webmanifest", "icons/admin-192.png", "icons/admin-512.png", "icons/admin-maskable-512.png", "icons/admin-apple-180.png", "manifest-fournisseur.webmanifest", "icons/fournisseur-192.png", "icons/fournisseur-512.png", "icons/fournisseur-maskable-512.png", "icons/fournisseur-apple-180.png", "commun.js", "moteur.js", "commun.css", "manifest.webmanifest", "manifest-chauffeur.webmanifest", "icons/chauffeur-192.png", "icons/chauffeur-512.png", "icons/chauffeur-maskable-512.png", "icons/chauffeur-apple-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => Promise.all(COQUE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(k => k.put(r, c)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("index.html"))));
});
