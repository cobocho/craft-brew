import { pgTable, serial, date, decimal, smallint } from 'drizzle-orm/pg-core';

export const dailyWeather = pgTable('daily_weather', {
	id: serial('id').primaryKey(),

	date: date('date').notNull().unique(),

	avgTemp: decimal('avg_temp', { precision: 4, scale: 1 }),
	minTemp: decimal('min_temp', { precision: 4, scale: 1 }),
	maxTemp: decimal('max_temp', { precision: 4, scale: 1 }),

	avgHumidity: decimal('avg_humidity', { precision: 4, scale: 1 }),
	minHumidity: decimal('min_humidity', { precision: 4, scale: 1 }),
	maxHumidity: decimal('max_humidity', { precision: 4, scale: 1 }),

	avgPeltierPower: smallint('avg_peltier_power'),
});
