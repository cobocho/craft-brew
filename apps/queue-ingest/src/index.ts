import chalk from 'chalk';

import { connectMqtt } from './mqtt-client';
import { config } from './config';
import { TOPICS } from './topics';
import { handleStatus } from './handlers/status';
import { handleAck } from './handlers/ack';

const mqttClient = connectMqtt({
	brokerUrl: config.mqttBrokerUrl,
	username: config.mqttUsername,
	password: config.mqttPassword,
});

const tag = chalk.bold.gray('[MQTT]');

mqttClient.on('connect', (connack) => {
	console.log(
		`${tag} ${chalk.greenBright('connected')} ${chalk.gray(
			JSON.stringify(connack),
		)}`,
	);

	mqttClient.subscribe([TOPICS.STATUS], { qos: 1 }, (err) => {
		if (err) {
			console.error(
				`${tag} ${chalk.redBright('subscribe error:')} ${chalk.red(
					err.message,
				)}`,
			);
			return;
		}
		console.log(
			`${tag} ${chalk.cyanBright('subscribed to topics')} ${chalk.gray(
				TOPICS.STATUS,
			)}`,
		);
	});

	mqttClient.subscribe([TOPICS.ACK], { qos: 2 }, (err) => {
		if (err) {
			console.error(
				`${tag} ${chalk.redBright('subscribe error:')} ${chalk.red(
					err.message,
				)}`,
			);
			return;
		}
		console.log(
			`${tag} ${chalk.cyanBright('subscribed to topics')} ${chalk.gray(
				TOPICS.ACK,
			)}`,
		);
	});
});

mqttClient.on('message', (topic, message) => {
	const payload = message.toString();

	switch (topic) {
		case TOPICS.STATUS:
			handleStatus(payload);
			break;
		case TOPICS.ACK:
			handleAck(payload);
			break;
	}
});

mqttClient.on('reconnect', () => {
	console.log(`${tag} ${chalk.yellow('reconnecting...')}`);
});

mqttClient.on('close', () => {
	console.log(`${tag} ${chalk.gray('connection closed')}`);
});

mqttClient.on('offline', () => {
	console.log(`${tag} ${chalk.red('offline')}`);
});

mqttClient.on('error', (err) => {
	console.error(
		`${tag} ${chalk.bgRed.whiteBright(' ERROR ')} ${chalk.red(err.message)}`,
	);
});

mqttClient.on('end', () => {
	console.log(`${tag} ${chalk.gray('end')}`);
});

process.on('SIGINT', () => {
	console.log(`\n${chalk.yellowBright('Shutting down gracefully...')}`);
	mqttClient.end();
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log(`\n${chalk.yellowBright('Shutting down gracefully...')}`);
	mqttClient.end();
	process.exit(0);
});
