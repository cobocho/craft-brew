export const config = {
	databaseUrl:
		process.env.DATABASE_URL || 'postgresql://localhost:5432/craft_brew',
	mqttBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
	mqttUsername: process.env.MQTT_USER || 'mqtt',
	mqttPassword: process.env.MQTT_PASS || 'mqtt',
};
