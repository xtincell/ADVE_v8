// Service worker minimal : réception des push web (VAPID) — La Fusée.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = { title: "La Fusée", body: "", href: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body || undefined,
      icon: "/icon.svg",
      data: { href: payload.href || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/";
  event.waitUntil(clients.openWindow(href));
});
