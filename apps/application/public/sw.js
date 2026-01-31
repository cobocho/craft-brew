self.addEventListener('push', (event) => {
	const data = event.data ? event.data.json() : {};
	const title = data.title || 'Craft Brew';
	const body = data.body || '';
	const url = data.url || '/fridge';
	const options = {
		body,
		icon: '/icons/icon.png',
		badge: '/icons/icon.png',
		data: { url },
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url || '/fridge';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
			(clients) => {
				for (const client of clients) {
					if (client.url.includes(url) && 'focus' in client) {
						return client.focus();
					}
				}
				if (self.clients.openWindow) {
					return self.clients.openWindow(url);
				}
			},
		),
	);
});
