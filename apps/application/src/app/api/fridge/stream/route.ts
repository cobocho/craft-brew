import { NextRequest } from 'next/server';
import mqtt from 'mqtt';

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USER || 'mqtt';
const MQTT_PASSWORD = process.env.MQTT_PASS || 'mqtt';
const STATUS_TOPIC = '/homebrew/status';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			// MQTT 클라이언트 연결
			const client = mqtt.connect(MQTT_BROKER_URL, {
				username: MQTT_USERNAME,
				password: MQTT_PASSWORD,
				clean: true,
				connectTimeout: 10000,
				reconnectPeriod: 1000,
				keepalive: 60,
			});

			client.on('connect', () => {
				console.log('[SSE] MQTT Connected');

				// 연결 성공 메시지 전송
				const data = encoder.encode(
					`data: ${JSON.stringify({ type: 'connected' })}\n\n`,
				);
				controller.enqueue(data);

				// 토픽 구독
				client.subscribe(STATUS_TOPIC, { qos: 1 }, (err) => {
					if (err) {
						console.error('[SSE] Subscribe error:', err);
						const errorData = encoder.encode(
							`data: ${JSON.stringify({
								type: 'error',
								message: err.message,
							})}\n\n`,
						);
						controller.enqueue(errorData);
					} else {
						console.log('[SSE] Subscribed to', STATUS_TOPIC);
					}
				});
			});

			client.on('message', (topic, message) => {
				if (topic === STATUS_TOPIC) {
					try {
						const payload = JSON.parse(message.toString());

						const data = encoder.encode(
							`data: ${JSON.stringify({ type: 'status', payload })}\n\n`,
						);
						controller.enqueue(data);
					} catch (err) {
						console.error('[SSE] Failed to parse message:', err);
					}
				}
			});

			client.on('error', (err) => {
				console.error('[SSE] MQTT Error:', err);
				const data = encoder.encode(
					`data: ${JSON.stringify({
						type: 'error',
						message: err.message,
					})}\n\n`,
				);
				controller.enqueue(data);
			});

			// 클라이언트 연결 종료 시 정리
			request.signal.addEventListener('abort', () => {
				console.log('[SSE] Client disconnected');
				client.end();
				controller.close();
			});

			// Keep-alive: 30초마다 핑 전송
			const keepAliveInterval = setInterval(() => {
				const ping = encoder.encode(': ping\n\n');
				controller.enqueue(ping);
			}, 30000);

			request.signal.addEventListener('abort', () => {
				clearInterval(keepAliveInterval);
			});
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
}
