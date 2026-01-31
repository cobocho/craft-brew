ALTER TABLE "beers" ALTER COLUMN "fermentation_start" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beers" ALTER COLUMN "fermentation_end" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beers" ALTER COLUMN "fermentation_temp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beers" ALTER COLUMN "aging_start" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beers" ALTER COLUMN "aging_end" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beers" ALTER COLUMN "aging_temp" DROP NOT NULL;