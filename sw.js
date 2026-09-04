/* Service worker: make the site usable without a connection.

   The version string is rewritten by tools/build_static.py from a hash of the
   assets it covers, so a deploy that changes nothing leaves the cache alone
   and a deploy that changes CSS or JS invalidates it exactly once.

   The strategies differ per kind of request, and the reason is always the
   same question: what is the cost of serving this stale?

     documents   network first. A stale page is the failure mode that makes
                 people hate service workers - the site that will not update
                 however hard you reload. The network is always tried first
                 and the cache is only the fallback, so being offline costs a
                 timeout and being online costs nothing.

     assets      stale while revalidate. CSS, JS and the language tables are
                 versioned by the cache name, so serving yesterday's copy for
                 one paint while today's downloads is safe and instant.

     data        network first, like documents. Exam and word data changes
                 when papers are rebuilt, and a learner who opened a paper
                 yesterday should get today's corrections. Cached so a paper
                 you have already opened still opens on a train.

   Cross-origin is never touched: the exam figures come from web.archive.org
   and the listening player from Google Drive, and neither is ours to store.
   Opaque responses also cost far more quota than their size suggests. */

var VERSION = "15c3cf8fc71b";
var SHELL = "shell-" + VERSION;
var DATA = "data-" + VERSION;
var OFFLINE = "/offline.html";

var PRECACHE = [
  OFFLINE,
  "/assets/css/styles.css?v=0d11fd0b",
  "/assets/css/exam.css?v=99699569",
  "/assets/js/i18n.js?v=b87e0299",
  "/assets/js/site.js?v=cd4ad3e4"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL)
      .then(function (c) { return c.addAll(PRECACHE); })
      /* One missing file must not stop the worker installing; the fetch
         handler copes with a cold cache anyway. */
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== DATA) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* An update is only ever one message away: the page can tell a waiting
   worker to take over rather than waiting for every tab to close. */
self.addEventListener("message", function (event) {
  if (event.data === "skip-waiting") self.skipWaiting();
});

function networkFirst(request, cacheName, fallback) {
  /* A plain fetch, deliberately, rather than forcing {cache:"no-cache"}.

     A worker's own fetch does go through the HTTP cache, so "network first"
     is only as fresh as the host's headers allow - worth checking rather than
     assuming. This host sends `cache-control: public, max-age=0,
     must-revalidate` with an ETag on documents and assets alike, so every
     fetch revalidates and network-first means what it says. Tested the way it
     should be: warm a page into the cache, edit it on disk, revisit - the
     edit lands. Forcing no-cache was tried and changed nothing, so it is not
     carried. If the host's caching ever changes, this is the line to revisit. */
  return fetch(request).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(cacheName).then(function (c) { c.put(request, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(request).then(function (hit) {
      return hit || (fallback ? caches.match(fallback) : undefined);
    });
  });
}

function staleWhileRevalidate(request, cacheName) {
  return caches.match(request).then(function (hit) {
    var live = fetch(request).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(cacheName).then(function (c) { c.put(request, copy); });
      }
      return res;
    }).catch(function () { return hit; });
    return hit || live;
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  /* Range requests are for media and must reach the network intact. */
  if (req.headers.has("range")) return;

  if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1) {
    event.respondWith(networkFirst(req, SHELL, OFFLINE));
    return;
  }

  if (url.pathname.indexOf("/data/") === 0) {
    event.respondWith(networkFirst(req, DATA));
    return;
  }

  if (/\.(css|js|woff2?|png|svg|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, SHELL));
  }
});
