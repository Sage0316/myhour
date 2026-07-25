const CACHE = 'hakku-shell-v1';
const SHELL = ['/myhour/', '/myhour/index.html', '/myhour/manifest.json', '/myhour/favicon.svg'];

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* use defaults */ }
  event.waitUntil(self.registration.showNotification(data.title || '하꾸', {
    body: data.body || '지금 한 시간을 기록해볼까요? 📸',
    icon: '/myhour/icon-192.png',
    badge: '/myhour/icon-192.png',
    data: { url: '/myhour/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.includes('/myhour/'));
    return existing ? existing.focus() : clients.openWindow(event.notification.data?.url || '/myhour/');
  }));
});

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request)
      .then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put('/myhour/index.html', response.clone()));
        return response;
      })
      .catch(() => caches.match('/myhour/index.html')));
    return;
  }
  const url = new URL(event.request.url);
  // BGM은 설치 시 precache하지 않는다. 실제 선택/재생 요청이 발생한 파일만 런타임 캐시에 넣는다.
  if (url.pathname.includes('/assets/') || /\.(?:png|svg|ttf|mp3)$/.test(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    })));
  }
});
