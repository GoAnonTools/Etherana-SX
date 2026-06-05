ALTER TABLE automations ADD COLUMN scheduleType TEXT NOT NULL DEFAULT 'manual';
--> statement-breakpoint
ALTER TABLE automations ADD COLUMN scheduleTime TEXT;
--> statement-breakpoint
ALTER TABLE automations ADD COLUMN scheduleDays TEXT DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE automations ADD COLUMN scheduleDayOfMonth INTEGER;
--> statement-breakpoint
ALTER TABLE automations ADD COLUMN nextRunAt TEXT;
--> statement-breakpoint
ALTER TABLE automations ADD COLUMN lastRunAt TEXT;
