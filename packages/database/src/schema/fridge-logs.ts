import {
	pgTable,
	timestamp,
	decimal,
	smallint,
	integer,
} from 'drizzle-orm/pg-core';
import { beers } from './beers'; // beers 테이블 export 경로에 맞게 수정

export const fridgeLogs = pgTable('fridge_logs', {
	recordedAt: timestamp('recorded_at', { mode: 'date' }).primaryKey(), // TIMESTAMP PRIMARY KEY

	temperature: decimal('temperature', { precision: 4, scale: 1 }).notNull(), // DECIMAL(4,1) NOT NULL
	humidity: decimal('humidity', { precision: 4, scale: 1 }), // DECIMAL(4,1) nullable

	peltierPower: smallint('peltier_power').notNull(), // SMALLINT NOT NULL (0~100)
	targetTemp: decimal('target_temp', { precision: 3, scale: 1 }), // DECIMAL(3,1) nullable

	beerId: integer('beer_id').references(() => beers.id), // INTEGER REFERENCES beers(id)
});

export type FridgeLog = typeof fridgeLogs.$inferSelect;

export type InsertFridgeLog = typeof fridgeLogs.$inferInsert;
