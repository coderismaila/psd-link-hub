CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'neutral' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`category_id` integer NOT NULL,
	`period_type` text NOT NULL,
	`period_year` integer NOT NULL,
	`period_month` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`archived_at` integer,
	`archived_by` text,
	`archived_by_user_id` integer,
	`created_by` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`archived_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `links_status_idx` ON `links` (`status`);--> statement-breakpoint
CREATE INDEX `links_category_idx` ON `links` (`category_id`);--> statement-breakpoint
CREATE INDEX `links_period_idx` ON `links` (`period_year`,`period_month`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_link_prefs` (
	`user_id` integer NOT NULL,
	`link_id` integer NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`favorite_order` integer,
	`is_archived` integer DEFAULT false NOT NULL,
	`archived_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `link_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prefs_user_fav_idx` ON `user_link_prefs` (`user_id`,`is_favorite`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);