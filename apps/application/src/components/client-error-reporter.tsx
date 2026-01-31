'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'craftbrew:last_client_error';
const RELOAD_KEY = 'craftbrew:server_action_reload';

const maybeReloadForServerActionError = (message: string | null | undefined) => {
	if (!message) {
		return;
	}
	if (!message.includes('Failed to find Server Action')) {
		return;
	}
	if (typeof window === 'undefined') {
		return;
	}
	if (sessionStorage.getItem(RELOAD_KEY)) {
		return;
	}
	sessionStorage.setItem(RELOAD_KEY, '1');
	window.location.reload();
};

const sendError = async (payload: Record<string, unknown>) => {
	try {
		await fetch('/api/client-error', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	} catch {
		// ignore
	}
};

export function ClientErrorReporter() {
	useEffect(() => {
		const handleError = (event: ErrorEvent) => {
			const payload = {
				type: 'error',
				message: event.message,
				stack: event.error?.stack ?? null,
				source: event.filename,
				line: event.lineno,
				column: event.colno,
				url: window.location.href,
				userAgent: navigator.userAgent,
				ts: new Date().toISOString(),
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			sendError(payload);
			maybeReloadForServerActionError(event.message);
		};

		const handleRejection = (event: PromiseRejectionEvent) => {
			const payload = {
				type: 'unhandledrejection',
				message: String(event.reason?.message ?? event.reason ?? 'unknown'),
				stack: event.reason?.stack ?? null,
				url: window.location.href,
				userAgent: navigator.userAgent,
				ts: new Date().toISOString(),
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			sendError(payload);
			maybeReloadForServerActionError(
				String(event.reason?.message ?? event.reason ?? ''),
			);
		};

		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleRejection);
		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleRejection);
		};
	}, []);

	return null;
}

export function getLastClientError(): string | null {
	if (typeof window === 'undefined') {
		return null;
	}
	return localStorage.getItem(STORAGE_KEY);
}
