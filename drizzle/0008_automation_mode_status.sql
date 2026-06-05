ALTER TABLE automations ADD COLUMN mode TEXT NOT NULL DEFAULT 'manual';
--> statement-breakpoint
ALTER TABLE automations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
