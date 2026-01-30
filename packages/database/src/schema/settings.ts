import { pgTable, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { beers } from './beers';

export const settings = pgTable('settings', {
	currentBeerId: integer('current_beer_id')
		.references(() => beers.id)
		.notNull(),
	targetTemp: decimal('target_temp', { precision: 3, scale: 1 }).notNull(),
	createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date' })
		.defaultNow()
		.$onUpdate(() => new Date()),
});
