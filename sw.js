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

var VERSION = "bd81411c85b8";
var SHELL = "shell-" + VERSION;
var DATA = "data-" + VERSION;
var OFFLINE = "/offline.html";

var PRECACHE = [
  OFFLINE,
  "/assets/css/styles.min.css?v=6f8697a0",
  "/assets/css/exam.min.css?v=8f4ca913",
  "/assets/js/i18n.min.js?v=5a74bc38",
  "/assets/js/site.min.js?v=d40c817c"
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

/* A cache write outlives the response it came from, so the event that asked
   for it has to be told to wait: without this the worker may be shut down
   with the write half done. */
function keep(event, promise) {
  if (event && event.waitUntil) event.waitUntil(promise);
  return promise;
}

/* Every cache write here is a promise nobody was waiting on, and a write can
   fail for a reason that has nothing to do with the response: the origin's
   quota is full. Unhandled, that surfaced as an unhandled rejection in the
   worker and, worse, the put could still be in flight when the worker was
   killed. Both are fixed by handing the write back to the caller, which
   passes it to event.waitUntil. */
function put(cacheName, request, response) {
  return caches.open(cacheName)
    .then(function (c) { return c.put(request, response); })
    .then(function () { return trim(cacheName); })
    .catch(function () { /* quota, or the cache went away mid-write */ });
}

/* The data cache had no ceiling. Every paper opened added its questions and
   its glossary and nothing ever left, and the glossary alone is 19MB across
   the corpus - enough, on a phone that is already short of space, for the
   browser to start evicting the whole origin rather than the oldest paper.
   Cache.keys() returns oldest first, so the oldest papers go. Only the data
   cache is capped: the shell is five small files and is meant to be whole. */
var DATA_MAX = 60;

function trim(cacheName) {
  if (cacheName !== DATA) return Promise.resolve();
  return caches.open(cacheName).then(function (c) {
    return c.keys().then(function (keys) {
      if (keys.length <= DATA_MAX) return;
      return Promise.all(keys.slice(0, keys.length - DATA_MAX).map(function (k) {
        return c.delete(k);
      }));
    });
  });
}

function networkFirst(request, cacheName, fallback, event) {
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
    if (res && res.ok) keep(event, put(cacheName, request, res.clone()));
    return res;
  }).catch(function () {
    return caches.match(request).then(function (hit) {
      return hit || (fallback ? caches.match(fallback) : undefined);
    });
  });
}

function staleWhileRevalidate(request, cacheName, event) {
  return caches.match(request).then(function (hit) {
    var live = fetch(request).then(function (res) {
      if (res && res.ok) keep(event, put(cacheName, request, res.clone()));
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
    event.respondWith(networkFirst(req, SHELL, OFFLINE, event));
    return;
  }

  if (url.pathname.indexOf("/data/") === 0) {
    event.respondWith(networkFirst(req, DATA, null, event));
    return;
  }

  if (/\.(css|js|woff2?|png|svg|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, SHELL, event));
  }
});
