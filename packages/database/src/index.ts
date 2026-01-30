import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

export function createDatabase(connectionString: string) {
	const client = postgres(connectionString);
	return drizzle(client, { schema });
}

export type Database = PostgresJsDatabase<typeof schema>;

export const db: Database = createDatabase(process.env.DATABASE_URL!);
