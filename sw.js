/* ビーチボールバレー 副審判補助アプリ：オフライン対応（サービスワーカー）
   ・インターネットにつながるとき：GitHub の最新版を読み込む（読み込んだものをスマホに保存）
   ・つながらないとき：スマホに保存してある前回の版で動く
   アプリを更新したら、下の CACHE の番号も変えると古い保存データが消える */
const CACHE = 'bbv-cache-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192-v4.png',
  './icon-512-v4.png',
  './apple-touch-icon-v4.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(CORE.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // アプリ本体（HTML）：まずネットから最新版、だめなら保存してある版
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // アイコン・設定ファイル・文字フォント：保存してあればそれを使い、なければネットから取って保存
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === location.origin || isFont) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
