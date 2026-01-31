'use server';

import { HomebrewRedis } from '@craft-brew/redis';
import mqtt from 'mqtt';
import { and, desc, gte, lte, eq, count, isNotNull, sql } from 'drizzle-orm';
import { db, commands, fridgeLogs, beers } from '@craft-brew/database';
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

export async function setFridgeBeer(beerId: number) {
	try {
		const beer = await db
			.select()
			.from(beers)
			.where(eq(beers.id, beerId))
			.limit(1);

		const selectedBeer = beer[0];
		if (!selectedBeer) {
			return { success: false, error: 'not_found' };
		}

		let fermentationStart = selectedBeer.fermentationStart;
		if (!fermentationStart) {
			const updated = await db
				.update(beers)
				.set({ fermentationStart: new Date() })
				.where(eq(beers.id, beerId))
				.returning();
			fermentationStart = updated[0]?.fermentationStart ?? new Date();
		}

		await redis.setBeer({
			id: selectedBeer.id,
			name: selectedBeer.name,
			type: selectedBeer.type,
			status: 'fermentation',
			fermentationStart: fermentationStart
				? fermentationStart.toISOString()
				: null,
			fermentationEnd: selectedBeer.fermentationEnd
				? selectedBeer.fermentationEnd.toISOString()
				: null,
			agingStart: selectedBeer.agingStart
				? selectedBeer.agingStart.toISOString()
				: null,
			agingEnd: selectedBeer.agingEnd
				? selectedBeer.agingEnd.toISOString()
				: null,
		});

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function startFridgeBeerAging({
	days,
	fg,
}: {
	days: number;
	fg?: string | null;
}) {
	try {
		if (!Number.isFinite(days) || days <= 0) {
			return { success: false, error: 'invalid_days' };
		}

		if (fg && Number.isNaN(Number(fg))) {
			return { success: false, error: 'invalid_fg' };
		}

		const currentBeer = await redis.getBeer();
		if (!currentBeer) {
			return { success: false, error: 'not_found' };
		}

		const beerRows = await db
			.select()
			.from(beers)
			.where(eq(beers.id, currentBeer.id))
			.limit(1);

		const beer = beerRows[0];
		if (!beer) {
			return { success: false, error: 'not_found' };
		}

		const now = new Date();
		const agingStart = now;
		const agingEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
		const fgValue = fg && fg.trim() !== '' ? fg.trim() : null;
		const fermentationStart = beer.fermentationStart ?? now;
		const fermentationEnd = beer.fermentationEnd ?? now;

		const [avgResult] = await db
			.select({
				avgTemp: sql<number>`avg(${fridgeLogs.temperature})`,
				avgHumidity: sql<number>`avg(${fridgeLogs.humidity})`,
			})
			.from(fridgeLogs)
			.where(
				and(
					gte(fridgeLogs.recordedAt, fermentationStart),
					lte(fridgeLogs.recordedAt, fermentationEnd),
				),
			);

		const avgTemp =
			avgResult?.avgTemp !== null && avgResult?.avgTemp !== undefined
				? Number(avgResult.avgTemp)
				: null;
		const avgHumidity =
			avgResult?.avgHumidity !== null && avgResult?.avgHumidity !== undefined
				? Number(avgResult.avgHumidity)
				: null;

		const updated = await db
			.update(beers)
			.set({
				agingStart,
				agingEnd,
				fg: fgValue,
				fermentationEnd,
				fermentationActualTemp: avgTemp !== null ? avgTemp.toFixed(1) : null,
				fermentationActualHumidity:
					avgHumidity !== null ? avgHumidity.toFixed(1) : null,
			})
			.where(eq(beers.id, currentBeer.id))
			.returning();

		const updatedBeer = updated[0];
		if (!updatedBeer) {
			return { success: false, error: 'not_found' };
		}

		await redis.setBeer({
			id: updatedBeer.id,
			name: updatedBeer.name,
			type: updatedBeer.type,
			status: 'aging',
			fermentationStart: updatedBeer.fermentationStart
				? updatedBeer.fermentationStart.toISOString()
				: null,
			fermentationEnd: updatedBeer.fermentationEnd
				? updatedBeer.fermentationEnd.toISOString()
				: null,
			agingStart: updatedBeer.agingStart
				? updatedBeer.agingStart.toISOString()
				: null,
			agingEnd: updatedBeer.agingEnd
				? updatedBeer.agingEnd.toISOString()
				: null,
		});

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function clearFridgeBeer() {
	try {
		await redis.clearBeer();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function finishFridgeBeer() {
	try {
		const currentBeer = await redis.getBeer();
		if (!currentBeer) {
			return { success: false, error: 'not_found' };
		}

		const beerRows = await db
			.select()
			.from(beers)
			.where(eq(beers.id, currentBeer.id))
			.limit(1);

		const beer = beerRows[0];
		if (!beer) {
			return { success: false, error: 'not_found' };
		}

		const now = new Date();
		const agingStart = beer.agingStart ?? now;
		const agingEnd = beer.agingEnd ?? now;

		const [avgResult] = await db
			.select({
				avgTemp: sql<number>`avg(${fridgeLogs.temperature})`,
				avgHumidity: sql<number>`avg(${fridgeLogs.humidity})`,
			})
			.from(fridgeLogs)
			.where(
				and(
					gte(fridgeLogs.recordedAt, agingStart),
					lte(fridgeLogs.recordedAt, agingEnd),
				),
			);

		const avgTemp =
			avgResult?.avgTemp !== null && avgResult?.avgTemp !== undefined
				? Number(avgResult.avgTemp)
				: null;
		const avgHumidity =
			avgResult?.avgHumidity !== null && avgResult?.avgHumidity !== undefined
				? Number(avgResult.avgHumidity)
				: null;

		await db
			.update(beers)
			.set({
				agingEnd,
				agingActualTemp: avgTemp !== null ? avgTemp.toFixed(1) : null,
				agingActualHumidity:
					avgHumidity !== null ? avgHumidity.toFixed(1) : null,
			})
			.where(eq(beers.id, beer.id));

		await redis.clearBeer();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function sendFridgeCommand(
	cmd: Command,
	value?: number | boolean | null,
) {
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

export async function getCommandLogs({
	start,
	end,
	status,
}: {
	start: string;
	end: string;
	status: 'all' | 'success' | 'failed';
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

		const rangeFilter = and(
			gte(commands.ts, startDate),
			lte(commands.ts, endDate),
		);

		const [totalResult, successResult, failedResult] = await Promise.all([
			db.select({ count: count() }).from(commands).where(rangeFilter),
			db
				.select({ count: count() })
				.from(commands)
				.where(and(rangeFilter, eq(commands.completed, true))),
			db
				.select({ count: count() })
				.from(commands)
				.where(
					and(
						rangeFilter,
						eq(commands.completed, false),
						isNotNull(commands.error),
					),
				),
		]);

		let statusFilter = rangeFilter;
		if (status === 'success') {
			statusFilter = and(rangeFilter, eq(commands.completed, true));
		}
		if (status === 'failed') {
			statusFilter = and(
				rangeFilter,
				eq(commands.completed, false),
				isNotNull(commands.error),
			);
		}

		const logs = await db
			.select()
			.from(commands)
			.where(statusFilter)
			.orderBy(desc(commands.ts));

		const total = totalResult[0]?.count ?? 0;
		const success = successResult[0]?.count ?? 0;
		const failed = failedResult[0]?.count ?? 0;
		const pending = Math.max(0, total - success - failed);

		return {
			success: true,
			data: logs.map((log) => ({
				id: log.cmd_id,
				cmd: log.type,
				value: log.value,
				completed: log.completed,
				error: log.error,
				ts: log.ts.toISOString(),
				completedAt: log.completed_at ? log.completed_at.toISOString() : null,
			})),
			summary: { total, success, failed, pending },
		};
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}
