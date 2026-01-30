CREATE TABLE IF NOT EXISTS "daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"avg_temp" numeric(4, 1),
	"min_temp" numeric(4, 1),
	"max_temp" numeric(4, 1),
	"avg_humidity" numeric(4, 1),
	"min_humidity" numeric(4, 1),
	"max_humidity" numeric(4, 1),
	"avg_peltier_power" smallint,
	CONSTRAINT "daily_stats_date_unique" UNIQUE("date")
);
