// Flip-O service worker: makes the game work offline once installed.
// Bump CACHE_VERSION every time you change any game file.
const CACHE_VERSION = 'flipo-v1';

const APP_SHELL = [
  './',
  'index.html',
  'puzzle1-1.html',
  'puzzle1-2.html',
  'puzzle1-3.html',
  'style.css',
  'desktop.css',
  'script.js',
  'progress.js',
  'game2.js',
  'splash.jpg',
  'favicon.ico',
  'manifest.webmanifest',
  'icon-192.png',
  'icon.png',
  'bong.ogg',
  'win.wav'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // allSettled: one missing file must not break the whole install
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly, refresh in the background.
// Also covers Google Fonts after the first online visit.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: sameOrigin });
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
