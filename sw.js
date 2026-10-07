/* =====================================================================
   GAMBIT JACKPOT - sw.js (Service Worker)
   Speichert alle Spieldateien auf dem Gerät, damit die App offline läuft.
   Bei einem Update: VERSION erhöhen, dann holen sich alle Geräte die neuen Dateien.
   ===================================================================== */
const VERSION = 'gambit-jackpot-v2.0.0';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/config.js',
  'js/icons.js',
  'js/pieces.js',
  'js/engine.js',
  'js/ai.js',
  'js/save.js',
  'js/audio.js',
  'js/fx.js',
  'js/ui-board.js',
  'js/match.js',
  'js/deck.js',
  'js/slot.js',
  'js/ui-screens.js',
  'js/training.js',
  'js/main.js',
  'fonts/EricaOne-Regular.ttf',
  'fonts/NationalPark-Bold.ttf',
  'fonts/NationalPark-Regular.ttf',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Erst aus dem Gerätespeicher, im Hintergrund aktualisieren
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(VERSION).then(cache => cache.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) cache.put(e.request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    }))
  );
});
