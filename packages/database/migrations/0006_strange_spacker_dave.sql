ALTER TABLE "daily_stats" DROP CONSTRAINT IF EXISTS "daily_stats_date_unique";--> statement-breakpoint

-- 기존 PK (대부분 daily_stats_pkey)
ALTER TABLE "daily_stats" DROP CONSTRAINT IF EXISTS "daily_stats_pkey";--> statement-breakpoint

ALTER TABLE "daily_stats" ADD PRIMARY KEY ("date");--> statement-breakpoint
ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "id";
