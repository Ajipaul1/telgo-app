// Telgo service worker: push notifications, opening them, and a plain "no signal" page.
// It never keeps database answers (RULES.md section 5: no stale data), so every screen is fresh.
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("telgo-offline-v1").then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== "telgo-offline-v1").map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// a page that can't load because there is no signal shows the offline page (never an old copy of the app)
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "Telgo", body: e.data ? e.data.text() : "" }; }
  e.waitUntil((async () => {
    // the app is open on screen: its own banner shows it, the phone's copy isn't needed (a test always shows)
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visible = wins.some((w) => w.visibilityState === "visible" && w.focused);
    wins.forEach((w) => w.postMessage({ type: "telgo:push", data: d }));
    if (visible && d.topic !== "test") return;
    await self.registration.showNotification(d.title || "Telgo", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: d.id || undefined,
      data: { link: d.link || "/app/notifications", id: d.id || null },
      vibrate: [120, 60, 120],
    });
    if (self.navigator.setAppBadge) self.navigator.setAppBadge().catch(() => {});
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "/app/notifications";
  const url = new URL(link, self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        w.postMessage({ type: "telgo:open", link });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
