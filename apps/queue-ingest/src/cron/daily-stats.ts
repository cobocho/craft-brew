import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import chalk from 'chalk';
import { sql, and, gte, lt, desc } from 'drizzle-orm';
import { db, fridgeLogs, dailyStats } from '@craft-brew/database';

dayjs.extend(utc);
dayjs.extend(timezone);

const LAST_DATE_OFFSET = 1;

const TZ = 'Asia/Seoul';

async function generateDailyStats(targetDate: dayjs.Dayjs) {
	const startOfDay = targetDate.startOf('day').toDate();
	const endOfDay = targetDate.endOf('day').toDate();
	const dateStr = targetDate.format('YYYY-MM-DD');

	const result = await db
		.select({
			avgTemp: sql<string>`avg(temperature::numeric)`,
			minTemp: sql<string>`min(temperature::numeric)`,
			maxTemp: sql<string>`max(temperature::numeric)`,
			avgHumidity: sql<string>`avg(humidity::numeric)`,
			minHumidity: sql<string>`min(humidity::numeric)`,
			maxHumidity: sql<string>`max(humidity::numeric)`,
			avgPower: sql<string>`avg(peltier_power)`,
		})
		.from(fridgeLogs)
		.where(
			and(
				gte(fridgeLogs.recordedAt, startOfDay),
				lt(fridgeLogs.recordedAt, endOfDay),
			),
		);

	const stats = result[0];

	if (!stats || !stats.avgTemp) {
		console.log(chalk.yellow('[CRON]'), 'no data for', dateStr);
		return;
	}

	const values = {
		date: dateStr,
		avgTemp: parseFloat(stats.avgTemp).toFixed(1),
		minTemp: parseFloat(stats.minTemp).toFixed(1),
		maxTemp: parseFloat(stats.maxTemp).toFixed(1),
		avgHumidity: parseFloat(stats.avgHumidity).toFixed(1),
		minHumidity: parseFloat(stats.minHumidity).toFixed(1),
		maxHumidity: parseFloat(stats.maxHumidity).toFixed(1),
		avgPeltierPower: Math.round(parseFloat(stats.avgPower) ?? 0),
	};

	await db
		.insert(dailyStats)
		.values(values)
		.onConflictDoUpdate({
			target: dailyStats.date,
			set: {
				avgTemp: values.avgTemp,
				minTemp: values.minTemp,
				maxTemp: values.maxTemp,
				avgHumidity: values.avgHumidity,
				minHumidity: values.minHumidity,
				maxHumidity: values.maxHumidity,
				avgPeltierPower: values.avgPeltierPower,
			},
		});

	console.log(chalk.green('[CRON]'), `daily stats saved for ${dateStr}`);
	console.table(values);
}

// 누락된 통계 복구
export async function recoverMissedStats() {
	console.log(chalk.cyan('[CRON]'), 'checking missed stats...');

	const lastStat = await db
		.select({ date: dailyStats.date })
		.from(dailyStats)
		.orderBy(desc(dailyStats.date))
		.limit(1);

	const lastDate = lastStat[0]
		? dayjs(lastStat[0].date).tz(TZ)
		: dayjs().tz(TZ).subtract(7, 'day');

	const yesterday = dayjs()
		.tz(TZ)
		.subtract(LAST_DATE_OFFSET, 'day')
		.startOf('day');

	let current = lastDate.add(1, 'day').startOf('day');
	while (current.isBefore(yesterday) || current.isSame(yesterday, 'day')) {
		await generateDailyStats(current);
		current = current.add(1, 'day');
	}

	console.log(chalk.green('[CRON]'), 'recovery done');
}

// 매일 00:05
cron.schedule(
	'5 0 * * *',
	async () => {
		try {
			console.log(chalk.cyan('[CRON]'), 'generating daily stats...');
			const yesterday = dayjs().tz(TZ).subtract(LAST_DATE_OFFSET, 'day');
			await generateDailyStats(yesterday);
		} catch (error) {
			console.error(chalk.redBright('[CRON] error:'), (error as Error).message);
		}
	},
	{
		timezone: TZ,
	},
);

console.log(chalk.cyan('[CRON]'), 'daily stats scheduled at 00:05');
