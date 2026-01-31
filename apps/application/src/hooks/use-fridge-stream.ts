'use client';

import { useEffect, useState, useRef } from 'react';
import type { StatusPayload } from '@craft-brew/protocol';

interface StreamMessage {
	type: 'connected' | 'status' | 'error';
	payload?: StatusPayload;
	message?: string;
}

export function useFridgeStream() {
	const [status, setStatus] = useState<StatusPayload | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		const eventSource = new EventSource('/api/fridge/stream');
		eventSourceRef.current = eventSource;

		eventSource.onopen = () => {
			console.log('[SSE] Connection opened');
		};

		eventSource.onmessage = (event) => {
			try {
				const message: StreamMessage = JSON.parse(event.data);

				switch (message.type) {
					case 'connected':
						console.log('[SSE] Connected to MQTT');
						setIsConnected(true);
						setError(null);
						break;

					case 'status':
						if (message.payload) {
							if (message.payload.ts === 0) {
								return;
							}
							setStatus(message.payload);
							setIsConnected(true);
						}
						break;

					case 'error':
						console.error('[SSE] Error:', message.message);
						setError(message.message || 'Unknown error');
						setIsConnected(false);
						break;
				}
			} catch (err) {
				console.error('[SSE] Failed to parse message:', err);
			}
		};

		eventSource.onerror = (err) => {
			console.error('[SSE] EventSource error:', err);
			setError('Connection lost');
			setIsConnected(false);

			// 자동 재연결 (EventSource가 자동으로 재연결 시도함)
		};

		return () => {
			console.log('[SSE] Closing connection');
			eventSource.close();
			eventSourceRef.current = null;
		};
	}, []);

	return { status, isConnected, error };
}
