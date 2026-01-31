'use server';

import { HomebrewRedis } from '@craft-brew/redis';

const redis = new HomebrewRedis();

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
