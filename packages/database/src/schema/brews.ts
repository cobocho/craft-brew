import { pgTable, serial, text, timestamp, real, jsonb } from 'drizzle-orm/pg-core';

export const brews = pgTable('brews', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  style: text('style'),
  targetTemp: real('target_temp').notNull(),
  currentTemp: real('current_temp'),
  status: text('status').notNull().default('idle'), // idle, brewing, fermenting, completed
  recipe: jsonb('recipe'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Brew = typeof brews.$inferSelect;
export type NewBrew = typeof brews.$inferInsert;
