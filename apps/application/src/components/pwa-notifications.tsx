'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

const urlBase64ToUint8Array = (base64String: string) => {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export function PwaNotifications() {
	const [isSupported, setIsSupported] = useState(false);
	const [permission, setPermission] = useState<NotificationPermission>('default');
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(
		null,
	);

	useEffect(() => {
		const supported =
			'serviceWorker' in navigator &&
			'PushManager' in window &&
			typeof Notification !== 'undefined';
		setIsSupported(supported);
		if (typeof Notification !== 'undefined') {
			setPermission(Notification.permission);
		}

		if (!supported) {
			return;
		}

		const init = async () => {
			const reg = await navigator.serviceWorker.register('/sw.js');
			setRegistration(reg);
			const sub = await reg.pushManager.getSubscription();
			setIsSubscribed(Boolean(sub));
		};

		init().catch(() => {
			setIsSupported(false);
		});
	}, []);

	const handleEnable = async () => {
		if (!registration) {
			return;
		}

		setIsLoading(true);
		try {
			const nextPermission = await Notification.requestPermission();
			setPermission(nextPermission);
			if (nextPermission !== 'granted') {
				return;
			}

			const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
			if (!publicKey) {
				return;
			}

			const sub = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(publicKey),
			});

			await fetch('/api/notifications/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ subscription: sub.toJSON() }),
			});

			setIsSubscribed(true);
		} finally {
			setIsLoading(false);
		}
	};

	if (!isSupported || permission === 'denied' || isSubscribed) {
		return null;
	}

	return (
		<Button
			size="sm"
			variant="outline"
			onClick={handleEnable}
			disabled={isLoading}
			className="gap-2"
		>
			<Bell className="size-4" />
			알림 켜기
		</Button>
	);
}
