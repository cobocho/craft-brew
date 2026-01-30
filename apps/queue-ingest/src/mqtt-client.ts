import mqtt from 'mqtt';

interface MqttClientOptions {
	brokerUrl: string;
	username: string;
	password: string;
}

export function connectMqtt({
	brokerUrl,
	username,
	password,
}: MqttClientOptions) {
	const client = mqtt.connect(brokerUrl, {
		username,
		password,
		clean: true,
		connectTimeout: 1000 * 10,
		reconnectPeriod: 1000,
		keepalive: 60,
	});

	return client;
}
