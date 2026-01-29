import { pgTable, serial, integer, real, timestamp, text } from 'drizzle-orm/pg-core';
import { brews } from './brews';

export const brewLogs = pgTable('brew_logs', {
  id: serial('id').primaryKey(),
  brewId: integer('brew_id')
    .notNull()
    .references(() => brews.id, { onDelete: 'cascade' }),
  temperature: real('temperature').notNull(),
  heaterStatus: text('heater_status').notNull(), // on, off
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export type BrewLog = typeof brewLogs.$inferSelect;
export type NewBrewLog = typeof brewLogs.$inferInsert;
