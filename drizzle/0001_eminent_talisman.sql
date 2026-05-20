CREATE TABLE `dailyCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cacheDate` varchar(10) NOT NULL,
	`weatherData` json,
	`stockData` json,
	`newsHeadlines` json,
	`emailSummaries` json,
	`refreshedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyCache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailSummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gmailMessageId` varchar(255) NOT NULL,
	`fromAddress` varchar(320),
	`subject` text,
	`originalBody` text,
	`summary` text,
	`importanceScore` int DEFAULT 50,
	`metadata` json,
	`receivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailSummaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `musicHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`spotifyTrackId` varchar(255) NOT NULL,
	`trackName` text,
	`artistName` text,
	`albumName` text,
	`listenCount` int DEFAULT 1,
	`lastListenedAt` timestamp DEFAULT (now()),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `musicHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `musicRecommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`spotifyTrackId` varchar(255) NOT NULL,
	`trackName` text,
	`artistName` text,
	`albumName` text,
	`recommendationScore` decimal(5,2),
	`userPreference` int DEFAULT 0,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `musicRecommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsArticles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`title` text,
	`description` text,
	`source` varchar(255),
	`url` text,
	`imageUrl` text,
	`category` enum('school','state','world') NOT NULL,
	`relevanceScore` int DEFAULT 50,
	`userPreference` int DEFAULT 0,
	`metadata` json,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsArticles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduledTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskType` varchar(64) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64),
	`isEnabled` boolean DEFAULT true,
	`lastExecutedAt` timestamp,
	`nextExecutionAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduledTasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduledTasks_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE TABLE `stockData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(10) NOT NULL,
	`price` decimal(10,2),
	`changePercent` decimal(6,2),
	`marketCap` decimal(15,2),
	`trend` enum('growing','declining','stable') DEFAULT 'stable',
	`userPreference` int DEFAULT 0,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stockData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('music','news') NOT NULL,
	`referenceId` varchar(255) NOT NULL,
	`score` int DEFAULT 0,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `location` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` varchar(64) DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE `users` ADD `spotifyId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `spotifyAccessToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `spotifyRefreshToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `githubUsername` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `newsInterests` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `users` ADD `stockInterests` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `dailyCache` ADD CONSTRAINT `dailyCache_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailSummaries` ADD CONSTRAINT `emailSummaries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicHistory` ADD CONSTRAINT `musicHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicRecommendations` ADD CONSTRAINT `musicRecommendations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `newsArticles` ADD CONSTRAINT `newsArticles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduledTasks` ADD CONSTRAINT `scheduledTasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockData` ADD CONSTRAINT `stockData_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userPreferences` ADD CONSTRAINT `userPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;