const CACHE = 'myhour-v4';

// ─── 푸시 알림 수신 ─────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { /* 페이로드 없으면 기본 문구 */ }
  e.waitUntil(self.registration.showNotification(data.title || 'MYHOUR', {
    body: data.body || '지금 이 순간을 기록해볼까요? 📝',
    icon: '/myhour/icon-192.png',
    badge: '/myhour/icon-192.png',
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/myhour/')) return c.focus();
      }
      return clients.openWindow('/myhour/');
    })
  );
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/myhour/', '/myhour/index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (new URL(e.request.url).origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/myhour/index.html', copy));
        }
        return res;
      }).catch(() => caches.match('/myhour/index.html'))
    );
  }
});
