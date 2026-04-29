/* BrewLog Service Worker - 一時解除版
 * 古いキャッシュを全削除し、自身も即座にアクティベートする
 * 新しいファイル構成（css/style.css, js/app.js）が安定したらPWA対応版に差し替え
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
