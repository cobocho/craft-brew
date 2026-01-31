'use client';

import { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';
import type { StatusPayload } from '@craft-brew/protocol';

const MQTT_BROKER_URL =
	process.env.NEXT_PUBLIC_MQTT_WS_URL || 'ws://localhost:8083/mqtt';
const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USER || 'mqtt';
const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASS || 'mqtt';
const STATUS_TOPIC = '/homebrew/status';

export function useMqttStatus() {
	const [status, setStatus] = useState<StatusPayload | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const clientRef = useRef<mqtt.MqttClient | null>(null);

	useEffect(() => {
		try {
			const client = mqtt.connect(MQTT_BROKER_URL, {
				username: MQTT_USERNAME,
				password: MQTT_PASSWORD,
				clean: true,
				connectTimeout: 10000,
				reconnectPeriod: 1000,
				keepalive: 60,
			});

			clientRef.current = client;

			client.on('connect', () => {
				console.log('[MQTT] Connected');
				setIsConnected(true);
				setError(null);

				client.subscribe(STATUS_TOPIC, { qos: 1 }, (err) => {
					if (err) {
						console.error('[MQTT] Subscribe error:', err);
						setError('Failed to subscribe to status topic');
					} else {
						console.log('[MQTT] Subscribed to', STATUS_TOPIC);
					}
				});
			});

			client.on('message', (topic, message) => {
				if (topic === STATUS_TOPIC) {
					try {
						const payload = JSON.parse(message.toString()) as StatusPayload;
						console.log('[MQTT] Status received:', payload);
						setStatus(payload);
					} catch (err) {
						console.error('[MQTT] Failed to parse message:', err);
					}
				}
			});

			client.on('error', (err) => {
				console.error('[MQTT] Error:', err);
				setError(err.message);
			});

			client.on('disconnect', () => {
				console.log('[MQTT] Disconnected');
				setIsConnected(false);
			});

			client.on('offline', () => {
				console.log('[MQTT] Offline');
				setIsConnected(false);
			});

			client.on('reconnect', () => {
				console.log('[MQTT] Reconnecting...');
			});

			return () => {
				if (clientRef.current) {
					clientRef.current.end();
					clientRef.current = null;
				}
			};
		} catch (err) {
			console.error('[MQTT] Connection error:', err);
			setError((err as Error).message);
			return () => {};
		}
	}, []);

	return { status, isConnected, error };
}
