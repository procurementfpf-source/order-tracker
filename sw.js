/* Order Tracker — offline shell.

   Strategy: network first, cache as fallback.
   - Online  : you always get the newest version you have published.
   - Offline : you get the last copy that loaded successfully.

   Only the app shell is cached. Your data never comes through here —
   it lives in localStorage on the device and syncs to Google Sheets
   separately, so the app is fully usable with no connection.

   Bump CACHE when you publish a new version of index.html. */

const CACHE = 'order-tracker-v51-1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // never touch sync POSTs

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // let CDN requests fail on their own

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit =>
          hit || caches.match('./index.html') || new Response(
            '<h1>Offline</h1><p>This page has not been loaded on this device yet, so there is nothing cached to show. Connect once and it will work offline after that.</p>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        )
      )
  );
});
