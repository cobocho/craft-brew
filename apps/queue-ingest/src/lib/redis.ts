// lib/redis.ts
import { HomebrewRedis } from '@craft-brew/redis';

export const redis = new HomebrewRedis(process.env.REDIS_URL);
