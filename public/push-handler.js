self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "MediURG";
  const options = {
    body: payload.body || "Nouvelle notification MediURG.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-64x64.png",
    tag: payload.tag || "mediurg-access-request",
    renotify: true,
    data: {
      url: payload.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const sameOrigin = clients.find(
        (client) => new URL(client.url).origin === self.location.origin
      );
      if (sameOrigin) {
        return sameOrigin.focus().then((client) => client.navigate(targetUrl));
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
