// Service Worker para Notificações Push do FerreiraDash

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "FerreiraDash";
    const options = {
      body: data.body || "Atualização no seu painel financeiro.",
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [200, 100, 200],
      data: {
        url: data.url || "/historico",
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Erro ao processar notificação push recebida:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/historico";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Se já houver uma aba aberta com o site, foca nela
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova aba
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
