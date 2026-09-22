const CACHE = "vks-dansu-app-v20260922b";
const PRECACHE = [
  "./",
  "./index.html",
  "./login.html",
  "./cai_dat.html",
  "./static/theme.css",
  "./static/logo_moi.png",
  "./static/tru-so-vksnd.jpg",
  "./static/rbac.js",
  "./static/pwa.js",
  "./static/icon-192.png",
  "./static/icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = req.url || "";
  const isHtml = req.mode === "navigate" || /\.html(\?|$)/.test(url);
  if (isHtml) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) { return cached || caches.match("./login.html"); });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(function (cached) {
      const fetched = fetch(req).then(function (res) {
        if (res && res.status === 200 && req.url.indexOf("http") === 0) {
          const copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached || caches.match("./login.html"); });
      return cached || fetched;
    })
  );
});
