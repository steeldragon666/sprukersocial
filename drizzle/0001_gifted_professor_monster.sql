CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int,
	`action_type` varchar(50) NOT NULL,
	`action_details` text,
	`status` enum('success','failed') NOT NULL DEFAULT 'success',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`likes` int NOT NULL DEFAULT 0,
	`comments` int NOT NULL DEFAULT 0,
	`reach` int NOT NULL DEFAULT 0,
	`impressions` int NOT NULL DEFAULT 0,
	`engagement_rate` varchar(10) DEFAULT '0',
	`fetched_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_settings_setting_key_unique` UNIQUE(`setting_key`)
);
--> statement-breakpoint
CREATE TABLE `followed_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int NOT NULL,
	`username` varchar(255) NOT NULL,
	`instagram_user_id` varchar(255),
	`followed_at` timestamp NOT NULL DEFAULT (now()),
	`unfollowed_at` timestamp,
	`status` enum('following','unfollowed') NOT NULL DEFAULT 'following',
	CONSTRAINT `followed_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hashtag_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`hashtags` text NOT NULL,
	`category` varchar(100),
	`is_active` int unsigned NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hashtag_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `instagram_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`session_data` text,
	`is_active` int unsigned NOT NULL DEFAULT 1,
	`last_post_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `instagram_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int NOT NULL,
	`content` text NOT NULL,
	`image_url` text,
	`hashtags` text,
	`status` enum('draft','scheduled','posted','failed') NOT NULL DEFAULT 'draft',
	`scheduled_for` timestamp,
	`posted_at` timestamp,
	`instagram_media_id` varchar(255),
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
