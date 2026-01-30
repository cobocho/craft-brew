ALTER TABLE "temperature_logs" RENAME TO "fridge_logs";--> statement-breakpoint
ALTER TABLE "fridge_logs" DROP CONSTRAINT "temperature_logs_beer_id_beers_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fridge_logs" ADD CONSTRAINT "fridge_logs_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
