// Da-iCE NOW — Service Worker
// HTML とアプリ資産は network-first（更新を確実に反映）、オフライン時はキャッシュへフォールバック。
// データ(feed.json)も network-first。アイコンなどは cache-first。
const CACHE = 'da-ice-now-v3';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// network-first: 取れたらキャッシュ更新して返す。失敗時のみキャッシュ。
function networkFirst(request) {
  return fetch(request)
    .then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
      return res;
    })
    .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // HTML ナビゲーション・データ・本体資産（CSS/JS/manifest）は network-first で常に最新を反映
  const isAsset = /\.(?:html|css|js|webmanifest|json)$/.test(url.pathname);
  if (req.mode === 'navigate' || isAsset || url.pathname.endsWith('/')) {
    e.respondWith(networkFirst(req));
    return;
  }

  // アイコン等の静的ファイルは cache-first（オフライン起動を優先）
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
