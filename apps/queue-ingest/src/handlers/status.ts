import chalk from 'chalk';
import { StatusPayload } from '@craft-brew/protocol';
import { db, fridgeLogs } from '@craft-brew/database';
import { redis } from '../lib/redis';
import { eq } from 'drizzle-orm';

const DB_SAVE_THROTTLE_MS = 1000 * 60; // 1 minute

const DB_SAVE_THROTTLE_SEC = 60;

export async function handleStatus(payload: string) {
	try {
		const status = JSON.parse(payload) as StatusPayload;
		console.log(chalk.blue('[STATUS]'), 'received', status);

		const currentStatus = await redis.getStatus();

		await redis.setStatus({
			temp: status.temp,
			humidity: status.humidity,
			power: status.power,
			target: status.target,
			updatedAt: status.ts,
		});

		const skipDBSave =
			currentStatus &&
			status.ts - currentStatus.updatedAt < DB_SAVE_THROTTLE_SEC;

		if (skipDBSave) {
			console.log(chalk.gray('[STATUS]'), 'db save skipped (throttled)');
			return;
		}

		if (status.temp !== null) {
			const beer = await redis.getBeer();

			const existedLog = await db.query.fridgeLogs.findFirst({
				where: eq(fridgeLogs.recordedAt, new Date(status.ts * 1000)),
			});

			if (existedLog) {
				console.log(chalk.yellow('[STATUS]'), 'log already exists');
				return;
			}

			await redis.addReading(status.temp, status.humidity ?? 0);

			await db.insert(fridgeLogs).values({
				recordedAt: new Date(status.ts * 1000),
				temperature: status.temp?.toString(),
				humidity: status.humidity?.toString(),
				peltierPower: status.power,
				targetTemp: status.target?.toString(),
				beerId: beer?.id ?? null,
			});
		}

		console.log(chalk.green('[STATUS]'), 'saved');
	} catch (error) {
		console.error(
			chalk.redBright('[STATUS] error:'),
			chalk.red((error as Error).message),
		);
	}
}
