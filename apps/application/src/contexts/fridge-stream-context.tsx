'use client';

import {
	createContext,
	useContext,
	useEffect,
	useState,
	useRef,
	type ReactNode,
} from 'react';
import type { StatusPayload } from '@craft-brew/protocol';

interface FridgeStreamState {
	status: StatusPayload | null;
	isConnected: boolean;
	error: string | null;
}

const FridgeStreamContext = createContext<FridgeStreamState>({
	status: null,
	isConnected: false,
	error: null,
});

const MAX_RETRIES = 5;
const BASE_DELAY = 2000;

export function FridgeStreamProvider({ children }: { children: ReactNode }) {
	const [status, setStatus] = useState<StatusPayload | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const retryCount = useRef(0);
	const eventSourceRef = useRef<EventSource | null>(null);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const connect = () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}

			const es = new EventSource('/api/fridge/stream');
			eventSourceRef.current = es;

			es.onopen = () => {
				retryCount.current = 0;
				setError(null);
			};

			es.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);

					switch (message.type) {
						case 'connected':
							setIsConnected(true);
							setError(null);
							break;
						case 'status':
							if (message.payload && message.payload.ts !== 0) {
								setStatus(message.payload);
								setIsConnected(true);
							}
							break;
						case 'error':
							setError(message.message || 'Unknown error');
							setIsConnected(false);
							break;
					}
				} catch {
					// ignore parse errors
				}
			};

			es.onerror = () => {
				es.close();
				eventSourceRef.current = null;
				setIsConnected(false);
				setError('Connection lost');

				if (retryCount.current < MAX_RETRIES) {
					const delay = BASE_DELAY * 2 ** retryCount.current;
					retryCount.current += 1;
					retryTimerRef.current = setTimeout(connect, delay);
				}
			};
		};

		connect();

		return () => {
			eventSourceRef.current?.close();
			eventSourceRef.current = null;
			if (retryTimerRef.current) {
				clearTimeout(retryTimerRef.current);
			}
		};
	}, []);

	return (
		<FridgeStreamContext.Provider value={{ status, isConnected, error }}>
			{children}
		</FridgeStreamContext.Provider>
	);
}

export function useFridgeStream() {
	return useContext(FridgeStreamContext);
}
