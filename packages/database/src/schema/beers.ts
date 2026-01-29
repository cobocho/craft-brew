import {
	pgTable,
	serial,
	varchar,
	text,
	decimal,
	date,
	timestamp,
} from 'drizzle-orm/pg-core';

export const beers = pgTable('beers', {
	id: serial('id').primaryKey(), // SERIAL PRIMARY KEY

	name: varchar('name', { length: 100 }).notNull(), // VARCHAR(100) NOT NULL
	type: varchar('type', { length: 50 }).notNull(), // VARCHAR(50) NOT NULL

	malt: text('malt'), // TEXT (nullable)
	hop: text('hop'), // TEXT (nullable)
	water: text('water'), // TEXT (nullable)
	yeast: varchar('yeast', { length: 100 }), // VARCHAR(100) (nullable)
	additives: text('additives'), // TEXT (nullable)

	volume: decimal('volume', { precision: 5, scale: 1 }).notNull(), // DECIMAL(5,1) NOT NULL
	og: decimal('og', { precision: 4, scale: 3 }), // DECIMAL(4,3) (nullable)
	fg: decimal('fg', { precision: 4, scale: 3 }), // DECIMAL(4,3) (nullable)

	memo: text('memo'), // TEXT (nullable)

	fermentationStart: date('fermentation_start').notNull(), // DATE NOT NULL
	fermentationEnd: date('fermentation_end').notNull(), // DATE NOT NULL
	fermentationTemp: decimal('fermentation_temp', {
		precision: 3,
		scale: 1,
	}).notNull(), // DECIMAL(3,1) NOT NULL
	fermentationActualTemp: decimal('fermentation_actual_temp', {
		precision: 3,
		scale: 1,
	}), // DECIMAL(3,1)
	fermentationActualHumidity: decimal('fermentation_actual_humidity', {
		precision: 3,
		scale: 1,
	}), // DECIMAL(3,1)

	agingStart: date('aging_start').notNull(), // DATE NOT NULL
	agingEnd: date('aging_end').notNull(), // DATE NOT NULL
	agingTemp: decimal('aging_temp', { precision: 3, scale: 1 }).notNull(), // DECIMAL(3,1) NOT NULL
	agingActualTemp: decimal('aging_actual_temp', { precision: 3, scale: 1 }), // DECIMAL(3,1)
	agingActualHumidity: decimal('aging_actual_humidity', {
		precision: 3,
		scale: 1,
	}), // DECIMAL(3,1)

	createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(), // TIMESTAMP DEFAULT NOW()
	updatedAt: timestamp('updated_at', { mode: 'date' })
		.defaultNow()
		.$onUpdate(() => new Date()), // 업데이트 시 자동 갱신
});

export type Beer = typeof beers.$inferSelect;

export type InsertBeer = typeof beers.$inferInsert;
