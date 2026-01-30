import {
	pgTable,
	varchar,
	timestamp,
	text,
	boolean,
} from 'drizzle-orm/pg-core';

export const commands = pgTable('commands', {
	cmd_id: varchar('cmd_id', { length: 100 }).primaryKey(),
	type: varchar('type', {
		enum: ['set_target', 'set_peltier', 'restart'],
	}).notNull(),
	ts: timestamp('ts', { mode: 'date' }).notNull(),
	completed: boolean('completed').notNull().default(false),
	value: text('value'),
	completed_at: timestamp('completed_at', { mode: 'date' }),
	error: text('error'),
	created_at: timestamp('created_at', { mode: 'date' }).defaultNow(),
	updated_at: timestamp('updated_at', { mode: 'date' })
		.defaultNow()
		.$onUpdate(() => new Date()),
});
