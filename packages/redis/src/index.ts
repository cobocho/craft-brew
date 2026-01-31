import Redis from 'ioredis';

export interface FridgeStatus {
	temp: number | null;
	humidity: number | null;
	power: number;
	target: number | null;
	updatedAt: number;
}

export type FridgeBeerStatus = 'fermentation' | 'aging';

export interface FridgeBeer {
	id: number;
	name: string;
	type: string;
	status: FridgeBeerStatus;
	fermentationStart: string | null;
	fermentationEnd: string | null;
	agingStart: string | null;
	agingEnd: string | null;
}

export interface Average24h {
	temp: number | null;
	humidity: number | null;
	count: number;
}

export interface DailyStats {
	date: string;
	avgTemp: number | null;
	avgHumidity: number | null;
	avgPeltierPower: number | null;
}

export class HomebrewRedis {
	private redis: Redis;

	private readonly keys = {
		status: 'fridge:status',
		beer: 'fridge:beer',
		avg24h: 'fridge:24h',
		avg24hVals: 'fridge:24h:vals',
		lastDBSaveAt: 'fridge:last_db_save_at',
	};

	private readonly ttl = {
		status: 600,
	};

	private readonly maxVals = 60 * 60 * 24;

	constructor(url?: string) {
		this.redis = new Redis(
			url || process.env.REDIS_URL || 'redis://localhost:6379',
		);
	}

	getClient(): Redis {
		return this.redis;
	}

	async disconnect(): Promise<void> {
		await this.redis.quit();
	}

	async healthCheck(): Promise<boolean> {
		try {
			const pong = await this.redis.ping();
			return pong === 'PONG';
		} catch {
			return false;
		}
	}

	async setLastDBSaveAt(ts: number): Promise<void> {
		await this.redis.set(this.keys.lastDBSaveAt, ts.toString());
	}

	async getLastDBSaveAt(): Promise<number | null> {
		const lastDBSaveAt = await this.redis.get(this.keys.lastDBSaveAt);
		return lastDBSaveAt ? parseInt(lastDBSaveAt) : null;
	}

	async setStatus(status: FridgeStatus): Promise<void> {
		await this.redis.hset(this.keys.status, {
			temp: status.temp?.toString() ?? '',
			humidity: status.humidity?.toString() ?? '',
			power: status.power.toString(),
			target: status.target?.toString() ?? '',
			updated_at: status.updatedAt.toString(),
		});
		await this.redis.expire(this.keys.status, this.ttl.status);
	}

	async getStatus(): Promise<FridgeStatus | null> {
		const data = await this.redis.hgetall(this.keys.status);

		if (!data || Object.keys(data).length === 0) {
			return null;
		}

		return {
			temp: data.temp ? parseFloat(data.temp) : null,
			humidity: data.humidity ? parseFloat(data.humidity) : null,
			power: parseInt(data.power) || 0,
			target: data.target ? parseFloat(data.target) : null,
			updatedAt: parseInt(data.updated_at) || 0,
		};
	}

	async isOnline(): Promise<boolean> {
		const exists = await this.redis.exists(this.keys.status);
		return exists === 1;
	}

	async setTarget(temp: number | null): Promise<void> {
		if (temp === null) {
			await this.redis.hdel(this.keys.status, 'target');
		} else {
			await this.redis.hset(this.keys.status, 'target', temp.toString());
		}
	}

	async getTarget(): Promise<number | null> {
		const target = await this.redis.hget(this.keys.status, 'target');
		return target ? parseFloat(target) : null;
	}

	async setBeer(beer: FridgeBeer): Promise<void> {
		await this.redis.hset(this.keys.beer, {
			id: beer.id.toString(),
			name: beer.name,
			type: beer.type,
			status: beer.status,
			fermentation_start: beer.fermentationStart ?? '',
			fermentation_end: beer.fermentationEnd ?? '',
			aging_start: beer.agingStart ?? '',
			aging_end: beer.agingEnd ?? '',
		});
	}

	async getBeer(): Promise<FridgeBeer | null> {
		const data = await this.redis.hgetall(this.keys.beer);

		if (!data || Object.keys(data).length === 0) {
			return null;
		}

		const readDate = (value?: string) => (value ? value : null);

		const fermentationStart = readDate(
			data.fermentation_start ?? data.start_date,
		);
		const fermentationEnd = readDate(data.fermentation_end ?? data.end_date);

		const status =
			data.status === 'aging' || data.status === 'fermentation'
				? data.status
				: 'fermentation';

		return {
			id: parseInt(data.id),
			name: data.name,
			type: data.type,
			status,
			fermentationStart,
			fermentationEnd,
			agingStart: readDate(data.aging_start),
			agingEnd: readDate(data.aging_end),
		};
	}

	async clearBeer(): Promise<void> {
		await this.redis.del(this.keys.beer);
	}

	async addReading(temp: number, humidity: number): Promise<void> {
		const val = `${temp}:${humidity}`;

		await this.redis
			.multi()
			.lpush(this.keys.avg24hVals, val)
			.hincrbyfloat(this.keys.avg24h, 'temp_sum', temp)
			.hincrbyfloat(this.keys.avg24h, 'humidity_sum', humidity)
			.hincrby(this.keys.avg24h, 'count', 1)
			.exec();

		const len = await this.redis.llen(this.keys.avg24hVals);
		if (len > this.maxVals) {
			const old = await this.redis.rpop(this.keys.avg24hVals);
			if (old) {
				const [oldTemp, oldHumidity] = old.split(':').map(Number);
				await this.redis
					.multi()
					.hincrbyfloat(this.keys.avg24h, 'temp_sum', -oldTemp)
					.hincrbyfloat(this.keys.avg24h, 'humidity_sum', -oldHumidity)
					.hincrby(this.keys.avg24h, 'count', -1)
					.exec();
			}
		}
	}

	async getAverage24h(): Promise<Average24h> {
		const data = await this.redis.hgetall(this.keys.avg24h);

		if (!data || !data.count || parseInt(data.count) === 0) {
			return { temp: null, humidity: null, count: 0 };
		}

		const count = parseInt(data.count);
		const tempSum = parseFloat(data.temp_sum) || 0;
		const humiditySum = parseFloat(data.humidity_sum) || 0;

		return {
			temp: Math.round((tempSum / count) * 10) / 10,
			humidity: Math.round((humiditySum / count) * 10) / 10,
			count,
		};
	}

	async clearAll(): Promise<void> {
		await this.redis.del(
			this.keys.status,
			this.keys.beer,
			this.keys.avg24h,
			this.keys.avg24hVals,
		);
	}
}
