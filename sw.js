const CACHE_NAME = 'flexible-work-hour-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.png',
  '/og_image.png',
  '/manifest.json'
];

// Service Worker 설치 및 캐시 생성
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('캐시 생성 완료');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 기존 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
  // 오프라인 상태에서도 앱 동작 가능하도록 캐시 우선 전략 사용
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 찾은 경우 캐시된 응답 반환
        if (response) {
          return response;
        }

        // 캐시에 없는 경우 네트워크 요청
        return fetch(event.request).then(networkResponse => {
          // 중요: 복제본을 캐시에 저장 (원본 응답은 스트림으로 한 번만 사용 가능)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // 오프라인이고 요청이 페이지에 대한 것인 경우 캐시된 홈페이지 제공
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return null;
        });
      })
  );
});