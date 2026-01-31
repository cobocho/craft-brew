'use server';

import { HomebrewRedis } from '@craft-brew/redis';
import mqtt from 'mqtt';
import { and, desc, gte, lte } from 'drizzle-orm';
import { db, commands, fridgeLogs } from '@craft-brew/database';
import type { Command } from '@craft-brew/protocol';

const redis = new HomebrewRedis();
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USER || 'mqtt';
const MQTT_PASSWORD = process.env.MQTT_PASS || 'mqtt';
const COMMAND_TOPIC = '/homebrew/cmd';

const COMMANDS: Command[] = ['set_target', 'set_peltier', 'restart'];

function isCommand(value: unknown): value is Command {
	return typeof value === 'string' && COMMANDS.includes(value as Command);
}

function publishCommand(payload: {
	qos: 2;
	id: string;
	cmd: Command;
	value: number | null;
	ts: number;
}) {
	return new Promise<void>((resolve, reject) => {
		const client = mqtt.connect(MQTT_BROKER_URL, {
			username: MQTT_USERNAME,
			password: MQTT_PASSWORD,
			clean: true,
			connectTimeout: 10000,
			reconnectPeriod: 0,
			keepalive: 60,
		});

		const timeout = setTimeout(() => {
			client.end(true);
			reject(new Error('MQTT publish timeout'));
		}, 8000);

		client.on('error', (error) => {
			clearTimeout(timeout);
			client.end(true);
			reject(error);
		});

		client.on('connect', () => {
			client.publish(
				COMMAND_TOPIC,
				JSON.stringify(payload),
				{ qos: 2, retain: false },
				(error) => {
					clearTimeout(timeout);
					client.end();
					if (error) {
						reject(error);
						return;
					}
					resolve();
				},
			);
		});
	});
}

export async function getFridgeStatus() {
	try {
		const [status, isOnline, avg24h, beer] = await Promise.all([
			redis.getStatus(),
			redis.isOnline(),
			redis.getAverage24h(),
			redis.getBeer(),
		]);

		if (!status) {
			return {
				success: false,
				error: 'Fridge status not found',
			};
		}

		return {
			success: true,
			data: {
				status,
				isOnline,
				avg24h,
				beer,
			},
		};
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function setFridgeTarget(temp: number | null) {
	try {
		await redis.setTarget(temp);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function sendFridgeCommand(cmd: Command, value?: number | boolean | null) {
	try {
		if (!isCommand(cmd)) {
			return { success: false, error: 'invalid_cmd' };
		}

		let commandValue: number | null = null;
		let valueText: string | null = null;

		if (cmd === 'set_target') {
			if (value === null || value === undefined) {
				commandValue = null;
				valueText = null;
			} else if (typeof value === 'number' && Number.isFinite(value)) {
				commandValue = value;
				valueText = value.toString();
			} else {
				return { success: false, error: 'invalid_value' };
			}
		}

		if (cmd === 'set_peltier') {
			if (typeof value !== 'boolean') {
				return { success: false, error: 'invalid_value' };
			}
			commandValue = value ? 1 : 0;
			valueText = value ? 'true' : 'false';
		}

		if (cmd === 'restart') {
			commandValue = null;
			valueText = null;
		}

		const id = crypto.randomUUID();
		const ts = Math.floor(Date.now() / 1000);

		await publishCommand({
			qos: 2,
			id,
			cmd,
			value: commandValue,
			ts,
		});

		await db.insert(commands).values({
			cmd_id: id,
			type: cmd,
			ts: new Date(ts * 1000),
			completed: false,
			value: valueText,
		});

		return { success: true, id };
	} catch (error) {
		return { success: false, error: (error as Error).message };
	}
}

export async function getFridgeLogs({
	start,
	end,
}: {
	start: string;
	end: string;
}) {
	try {
		const startDate = new Date(start);
		const endDate = new Date(end);

		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			return { success: false, error: 'invalid_date' };
		}

		if (startDate > endDate) {
			return { success: false, error: 'invalid_range' };
		}

		const logs = await db
			.select()
			.from(fridgeLogs)
			.where(
				and(
					gte(fridgeLogs.recordedAt, startDate),
					lte(fridgeLogs.recordedAt, endDate),
				),
			)
			.orderBy(desc(fridgeLogs.recordedAt));

		return {
			success: true,
			data: logs.map((log) => ({
				recordedAt: log.recordedAt.toISOString(),
				temperature: Number(log.temperature),
				humidity: log.humidity ? Number(log.humidity) : null,
				targetTemp: log.targetTemp ? Number(log.targetTemp) : null,
				peltierPower: log.peltierPower,
				beerId: log.beerId,
			})),
		};
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}
