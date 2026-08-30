const CACHE_NAME = "redtoot-v4";
const CORE_ASSETS = [
    "./",
    "./index.html",
    "./all-profiles.html",
    "./add-profile.html",
    "./lookup.html",
    "./platforms.html",
    "./vip.html",
    "./login.html",
    "./register.html",
    "./forgot-password.html",
    "./trending.html",
    "./latest.html",
    "./most-viewed.html",
    "./featured.html",
    "./verified.html",
    "./celebrities.html",
    "./about.html",
    "./contact.html",
    "./faq.html",
    "./privacy.html",
    "./terms.html",
    "./offline.html",
    "./manifest.json",
    "./robots.txt",
    "./css/style.css",
    "./js/config.js",
    "./js/firebase-config.js",
    "./js/helpers.js",
    "./js/validators.js",
    "./js/AuthManager.js",
    "./js/auth.js",
    "./js/database.js",
    "./js/main.js",
    "./js/headerfooter.js"
];

const IMAGE_PATTERN = /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i;

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll())
            .then((clients) => {
                clients.forEach((client) => client.postMessage({ type: "SW_UPDATED", cacheName: CACHE_NAME }));
            })
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    if (IMAGE_PATTERN.test(new URL(request.url).pathname)) {
        event.respondWith(
            caches.match(request).then((cached) => cached || fetch(request).then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            }).catch(() => caches.match("./favicon.ico")))
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok && new URL(request.url).origin === self.location.origin) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            })
            .catch(() => caches.match(request).then((cached) => cached || caches.match("./offline.html")))
    );
});
