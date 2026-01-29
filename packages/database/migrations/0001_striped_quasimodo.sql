CREATE TABLE IF NOT EXISTS "temperature_logs" (
	"recorded_at" timestamp PRIMARY KEY NOT NULL,
	"temperature" numeric(4, 1) NOT NULL,
	"humidity" numeric(4, 1),
	"peltier_power" smallint NOT NULL,
	"target_temp" numeric(3, 1),
	"beer_id" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
