import chalk from 'chalk';
import { StatusPayload } from '@craft-brew/protocol';
import { db, fridgeLogs } from '@craft-brew/database';
import { redis } from '../lib/redis';
import { desc, eq } from 'drizzle-orm';

const DB_SAVE_THROTTLE_MS = 1000 * 60; // 1 minute

const DB_SAVE_THROTTLE_SEC = 60;

export async function handleStatus(payload: string) {
	try {
		const status = JSON.parse(payload) as StatusPayload;
		console.log(chalk.blue('[STATUS]'), 'received', status);

		const nowSec = Math.floor(Date.now() / 1000);
		const ts = status.ts && status.ts > 0 ? status.ts : nowSec;

		await redis.setStatus({
			temp: status.temp,
			humidity: status.humidity,
			power: status.power,
			target: status.target,
			updatedAt: ts,
		});

		const lastDBSaveAt = await redis.getLastDBSaveAt();
		const untilDBSaveSeconds = ts - (lastDBSaveAt ?? 0);

		if (lastDBSaveAt && untilDBSaveSeconds < DB_SAVE_THROTTLE_SEC) {
			console.log(chalk.gray('[STATUS]'), 'db save skipped (throttled)');
			return;
		}

		if (status.temp !== null) {
			await redis.addReading(status.temp, status.humidity ?? 0);
			const beer = await redis.getBeer();

			const existedLog = await db.query.fridgeLogs.findFirst({
				where: eq(fridgeLogs.recordedAt, new Date(ts * 1000)),
			});

			if (existedLog) {
				console.log(chalk.yellow('[STATUS]'), 'log already exists');
				return;
			}

			await db.insert(fridgeLogs).values({
				recordedAt: new Date(ts * 1000),
				temperature: status.temp?.toString(),
				humidity: status.humidity?.toString(),
				peltierPower: status.power,
				targetTemp: status.target?.toString(),
				beerId: beer?.id ?? null,
			});
			await redis.setLastDBSaveAt(ts);
			console.log(chalk.green('[STATUS]'), 'saved to db');
		}
	} catch (error) {
		console.error(
			chalk.redBright('[STATUS] error:'),
			chalk.red((error as Error).message),
		);
	}
}
