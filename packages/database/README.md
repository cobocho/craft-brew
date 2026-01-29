# @craft-brew/database

Shared database schema and migrations for Craft Brew project using Drizzle ORM.

## Setup

1. Set environment variable:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/craft_brew"
```

2. Generate migrations:
```bash
bun run db:generate
```

3. Apply migrations:
```bash
bun run db:migrate
```

## Usage in other packages/apps

```typescript
import { createDatabase, brews, brewLogs } from '@craft-brew/database';

const db = createDatabase(process.env.DATABASE_URL!);

// Query example
const allBrews = await db.select().from(brews);
```

## Available Scripts

- `db:generate` - Generate migrations from schema changes
- `db:migrate` - Apply migrations to database
- `db:push` - Push schema changes directly (dev only)
- `db:studio` - Open Drizzle Studio GUI

## Schema

### brews
Main table for tracking brew batches.

### brew_logs
Temperature and heater status logs for each brew.
