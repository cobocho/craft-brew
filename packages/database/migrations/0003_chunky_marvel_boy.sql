CREATE TABLE IF NOT EXISTS "commands" (
	"cmd_id" varchar(100) PRIMARY KEY NOT NULL,
	"type" varchar NOT NULL,
	"ts" timestamp NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
