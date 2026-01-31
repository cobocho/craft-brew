import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import chalk from 'chalk';
import webpush from 'web-push';
import { redis } from '../lib/redis';
import type { PushSubscriptionData } from '@craft-brew/redis';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Seoul';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT =
	process.env.VAPID_SUBJECT || 'mailto:admin@craft-brew.local';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
	webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const minuteKey = (date: dayjs.Dayjs) => date.format('YYYY-MM-DD HH:mm');

async function sendAlert(title: string, body: string) {
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
		console.log(chalk.yellow('[CRON]'), 'VAPID keys missing, skip push');
		return;
	}

	const subscriptions = await redis.getPushSubscriptions();
	if (subscriptions.length === 0) {
		return;
	}

	await Promise.all(
		subscriptions.map(async (sub: PushSubscriptionData) => {
			try {
				await webpush.sendNotification(
					sub,
					JSON.stringify({
						title,
						body,
						url: '/fridge',
					}),
				);
			} catch (error) {
				console.error(
					chalk.redBright('[CRON] push error:'),
					(error as Error).message,
				);
				if ((error as { statusCode?: number }).statusCode === 410) {
					await redis.removePushSubscription(sub.endpoint);
				}
			}
		}),
	);
}

async function checkFridgeAlerts() {
	try {
		const beer = await redis.getBeer();

		console.log(chalk.yellow('[Alerts]'), 'checking alerts for beer:', beer);

		if (!beer) {
			console.log(chalk.yellow('[Alerts]'), 'no beer found');
			return;
		}

		const now = dayjs().tz(TZ);
		const nowMinute = minuteKey(now);

		const beerKey = `${beer.id}`;
		const tasks: Array<{ key: string; title: string; body: string }> = [];

		if (beer.fermentationEnd) {
			const target = dayjs(beer.fermentationEnd).tz(TZ);
			if (minuteKey(target) === nowMinute) {
				tasks.push({
					key: `fridge:alert:${beerKey}:fermentation:${nowMinute}`,
					title: '발효가 완료되었어요!',
					body: `${beer.name} 발효가 완료되었습니다.`,
				});
			}
		}

		if (beer.agingEnd) {
			const target = dayjs(beer.agingEnd).tz(TZ);
			if (minuteKey(target) === nowMinute) {
				tasks.push({
					key: `fridge:alert:${beerKey}:aging:${nowMinute}`,
					title: '숙성이 완료 되었어요!',
					body: `${beer.name} 숙성이 완료되었습니다.`,
				});
			}
		}

		if (tasks.length === 0) {
			return;
		}

		const client = redis.getClient();
		for (const task of tasks) {
			const wasSent = await client.set(task.key, '1', 'EX', 60 * 60, 'NX');
			if (wasSent) {
				await sendAlert(task.title, task.body);
				console.log(chalk.green('[CRON]'), task.title);
			}
		}
	} catch (error) {
		console.error(chalk.redBright('[CRON] error:'), (error as Error).message);
	}
}

cron.schedule(
	'* * * * *',
	async () => {
		await checkFridgeAlerts();
	},
	{ timezone: TZ },
);

console.log(chalk.cyan('[CRON]'), 'fridge alerts scheduled every minute');
