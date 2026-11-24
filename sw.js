/* Client Studio's service worker. Some Android browsers only offer "Install" when a page has one.
   It keeps nothing and changes nothing: every request goes to the network exactly as before. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) {
  // pass-through: no respondWith, so the browser fetches as normal and nothing is stored
  if (e.request.method !== "GET") return;
});
