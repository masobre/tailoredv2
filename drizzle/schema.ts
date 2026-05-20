import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // User profile & interests
  location: varchar("location", { length: 255 }), // For weather widget
  timezone: varchar("timezone", { length: 64 }).default("UTC"),
  spotifyId: varchar("spotifyId", { length: 255 }), // Spotify user ID
  spotifyAccessToken: text("spotifyAccessToken"), // Encrypted
  spotifyRefreshToken: text("spotifyRefreshToken"), // Encrypted
  githubUsername: varchar("githubUsername", { length: 255 }),
  
  // Preferences
  newsInterests: json("newsInterests").$type<string[]>().default([]), // ["school", "state", "world"]
  stockInterests: json("stockInterests").$type<string[]>().default([]), // Tracked stock symbols
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User preference scores for music and news.
 * Tracks cumulative likes/dislikes to build recommendation weights.
 */
export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Preference type: "music" or "news"
  type: mysqlEnum("type", ["music", "news"]).notNull(),
  
  // Reference ID (e.g., Spotify track ID or news article ID)
  referenceId: varchar("referenceId", { length: 255 }).notNull(),
  
  // Preference score: 1 for like, -1 for dislike, 0 for neutral
  score: int("score").default(0),
  
  // Metadata for context
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

/**
 * Music listening history from Spotify.
 * Used to filter recommendations (only suggest songs with <3 listens).
 */
export const musicHistory = mysqlTable("musicHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  spotifyTrackId: varchar("spotifyTrackId", { length: 255 }).notNull(),
  trackName: text("trackName"),
  artistName: text("artistName"),
  albumName: text("albumName"),
  
  // Listen count from Spotify
  listenCount: int("listenCount").default(1),
  
  // Last listened timestamp
  lastListenedAt: timestamp("lastListenedAt").defaultNow(),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MusicHistory = typeof musicHistory.$inferSelect;
export type InsertMusicHistory = typeof musicHistory.$inferInsert;

/**
 * Daily cached data snapshot (fetched at 7 AM UTC).
 * All widgets draw from this cache to ensure consistency.
 */
export const dailyCache = mysqlTable("dailyCache", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Cache date (YYYY-MM-DD)
  cacheDate: varchar("cacheDate", { length: 10 }).notNull(),
  
  // Weather data
  weatherData: json("weatherData").$type<Record<string, unknown>>(),
  
  // Stock data (trending/growing stocks)
  stockData: json("stockData").$type<Record<string, unknown>>(),
  
  // News headlines (market-moving)
  newsHeadlines: json("newsHeadlines").$type<Record<string, unknown>>(),
  
  // Email summaries
  emailSummaries: json("emailSummaries").$type<Record<string, unknown>>(),
  
  // Timestamp of cache refresh
  refreshedAt: timestamp("refreshedAt").defaultNow(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyCache = typeof dailyCache.$inferSelect;
export type InsertDailyCache = typeof dailyCache.$inferInsert;

/**
 * Music recommendations generated for the user.
 * Stores recommended tracks with preference scores.
 */
export const musicRecommendations = mysqlTable("musicRecommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  spotifyTrackId: varchar("spotifyTrackId", { length: 255 }).notNull(),
  trackName: text("trackName"),
  artistName: text("artistName"),
  albumName: text("albumName"),
  
  // Recommendation score (higher = better match)
  recommendationScore: decimal("recommendationScore", { precision: 5, scale: 2 }),
  
  // User's preference for this recommendation (-1, 0, 1)
  userPreference: int("userPreference").default(0),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MusicRecommendation = typeof musicRecommendations.$inferSelect;
export type InsertMusicRecommendation = typeof musicRecommendations.$inferInsert;

/**
 * News articles and preferences.
 * Tracks news items and user interactions for ranking.
 */
export const newsArticles = mysqlTable("newsArticles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // External news ID (from API)
  externalId: varchar("externalId", { length: 255 }).notNull(),
  
  // Article metadata
  title: text("title"),
  description: text("description"),
  source: varchar("source", { length: 255 }),
  url: text("url"),
  imageUrl: text("imageUrl"),
  
  // Category: "school", "state", "world"
  category: mysqlEnum("category", ["school", "state", "world"]).notNull(),
  
  // Relevance score (0-100)
  relevanceScore: int("relevanceScore").default(50),
  
  // User preference for this article (-1, 0, 1)
  userPreference: int("userPreference").default(0),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = typeof newsArticles.$inferInsert;

/**
 * Email summaries cached from Gmail.
 * Stores summarized emails for quick reference.
 */
export const emailSummaries = mysqlTable("emailSummaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Gmail message ID
  gmailMessageId: varchar("gmailMessageId", { length: 255 }).notNull(),
  
  // Email metadata
  fromAddress: varchar("fromAddress", { length: 320 }),
  subject: text("subject"),
  
  // Original email body (truncated)
  originalBody: text("originalBody"),
  
  // LLM-generated summary
  summary: text("summary"),
  
  // Importance score (0-100)
  importanceScore: int("importanceScore").default(50),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  receivedAt: timestamp("receivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSummary = typeof emailSummaries.$inferSelect;
export type InsertEmailSummary = typeof emailSummaries.$inferInsert;

/**
 * Stock market data and user interests.
 * Tracks trending/growing stocks and user preferences.
 */
export const stockData = mysqlTable("stockData", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Stock ticker symbol
  symbol: varchar("symbol", { length: 10 }).notNull(),
  
  // Current price
  price: decimal("price", { precision: 10, scale: 2 }),
  
  // Price change percentage
  changePercent: decimal("changePercent", { precision: 6, scale: 2 }),
  
  // Market cap (in billions)
  marketCap: decimal("marketCap", { precision: 15, scale: 2 }),
  
  // Trending/growing indicator
  trend: mysqlEnum("trend", ["growing", "declining", "stable"]).default("stable"),
  
  // User preference for this stock (-1, 0, 1)
  userPreference: int("userPreference").default(0),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StockData = typeof stockData.$inferSelect;
export type InsertStockData = typeof stockData.$inferInsert;

/**
 * Scheduled cron task tracking for 7 AM daily refresh.
 */
export const scheduledTasks = mysqlTable("scheduledTasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Task type: "daily_refresh", etc.
  taskType: varchar("taskType", { length: 64 }).notNull(),
  
  // Heartbeat task UID
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  
  // Cron expression
  cronExpression: varchar("cronExpression", { length: 64 }),
  
  // Is enabled
  isEnabled: boolean("isEnabled").default(true),
  
  // Last execution time
  lastExecutedAt: timestamp("lastExecutedAt"),
  
  // Next execution time
  nextExecutionAt: timestamp("nextExecutionAt"),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = typeof scheduledTasks.$inferInsert;
