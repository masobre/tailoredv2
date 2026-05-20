import { eq, and, desc, lt, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userPreferences,
  musicHistory,
  musicRecommendations,
  newsArticles,
  emailSummaries,
  stockData,
  dailyCache,
  scheduledTasks,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "location", "timezone", "spotifyId", "githubUsername"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// User preferences queries
export async function trackUserPreference(userId: number, type: "music" | "news", referenceId: string, score: number) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(userPreferences)
    .where(and(eq(userPreferences.userId, userId), eq(userPreferences.type, type), eq(userPreferences.referenceId, referenceId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userPreferences)
      .set({ score, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing[0].id));
  } else {
    await db.insert(userPreferences).values({ userId, type, referenceId, score });
  }
}

export async function getUserPreferences(userId: number, type: "music" | "news") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userPreferences).where(and(eq(userPreferences.userId, userId), eq(userPreferences.type, type)));
}

// Music history queries
export async function upsertMusicHistory(
  userId: number,
  spotifyTrackId: string,
  trackName: string,
  artistName: string,
  albumName: string
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(musicHistory)
    .where(and(eq(musicHistory.userId, userId), eq(musicHistory.spotifyTrackId, spotifyTrackId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(musicHistory)
      .set({
        listenCount: (existing[0].listenCount || 1) + 1,
        lastListenedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(musicHistory.id, existing[0].id));
  } else {
    await db.insert(musicHistory).values({
      userId,
      spotifyTrackId,
      trackName,
      artistName,
      albumName,
      listenCount: 1,
    });
  }
}

export async function getMusicHistoryByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(musicHistory).where(eq(musicHistory.userId, userId));
}

export async function getUnlisteningTracks(userId: number, maxListens: number = 3) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(musicHistory).where(and(eq(musicHistory.userId, userId), lt(musicHistory.listenCount, maxListens)));
}

// Music recommendations queries
export async function saveMusicRecommendation(
  userId: number,
  spotifyTrackId: string,
  trackName: string,
  artistName: string,
  albumName: string,
  recommendationScore: number
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(musicRecommendations).values({
    userId,
    spotifyTrackId,
    trackName,
    artistName,
    albumName,
    recommendationScore,
  });
}

export async function getMusicRecommendations(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(musicRecommendations)
    .where(eq(musicRecommendations.userId, userId))
    .orderBy(desc(musicRecommendations.recommendationScore))
    .limit(limit);
}

// News articles queries
export async function saveNewsArticle(
  userId: number,
  externalId: string,
  title: string,
  description: string,
  source: string,
  url: string,
  imageUrl: string,
  category: "school" | "state" | "world",
  relevanceScore: number = 50
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(newsArticles)
    .where(and(eq(newsArticles.userId, userId), eq(newsArticles.externalId, externalId)))
    .limit(1);

  if (!existing.length) {
    await db.insert(newsArticles).values({
      userId,
      externalId,
      title,
      description,
      source,
      url,
      imageUrl,
      category,
      relevanceScore,
    });
  }
}

export async function getNewsByCategory(userId: number, category: "school" | "state" | "world", limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(newsArticles)
    .where(and(eq(newsArticles.userId, userId), eq(newsArticles.category, category)))
    .orderBy(desc(newsArticles.relevanceScore))
    .limit(limit);
}

export async function updateNewsRelevance(articleId: number, relevanceScore: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(newsArticles).set({ relevanceScore, updatedAt: new Date() }).where(eq(newsArticles.id, articleId));
}

// Email summaries queries
export async function saveEmailSummary(
  userId: number,
  gmailMessageId: string,
  fromAddress: string,
  subject: string,
  originalBody: string,
  summary: string,
  importanceScore: number = 50
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(emailSummaries)
    .where(and(eq(emailSummaries.userId, userId), eq(emailSummaries.gmailMessageId, gmailMessageId)))
    .limit(1);

  if (!existing.length) {
    await db.insert(emailSummaries).values({
      userId,
      gmailMessageId,
      fromAddress,
      subject,
      originalBody,
      summary,
      importanceScore,
    });
  }
}

export async function getEmailSummaries(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(emailSummaries)
    .where(eq(emailSummaries.userId, userId))
    .orderBy(desc(emailSummaries.importanceScore))
    .limit(limit);
}

// Stock data queries
export async function saveStockData(
  userId: number,
  symbol: string,
  price: number,
  changePercent: number,
  marketCap: number,
  trend: "growing" | "declining" | "stable" = "stable"
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(stockData)
    .where(and(eq(stockData.userId, userId), eq(stockData.symbol, symbol)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(stockData)
      .set({ price, changePercent, marketCap, trend, updatedAt: new Date() })
      .where(eq(stockData.id, existing[0].id));
  } else {
    await db.insert(stockData).values({
      userId,
      symbol,
      price,
      changePercent,
      marketCap,
      trend,
    });
  }
}

export async function getTrendingStocks(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(stockData)
    .where(and(eq(stockData.userId, userId), eq(stockData.trend, "growing")))
    .orderBy(desc(stockData.changePercent))
    .limit(limit);
}

// Daily cache queries
export async function getDailyCache(userId: number, cacheDate: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailyCache)
    .where(and(eq(dailyCache.userId, userId), eq(dailyCache.cacheDate, cacheDate)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function saveDailyCache(
  userId: number,
  cacheDate: string,
  weatherData: Record<string, unknown>,
  stockData: Record<string, unknown>,
  newsHeadlines: Record<string, unknown>,
  emailSummaries: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(dailyCache)
    .where(and(eq(dailyCache.userId, userId), eq(dailyCache.cacheDate, cacheDate)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(dailyCache)
      .set({
        weatherData,
        stockData,
        newsHeadlines,
        emailSummaries,
        refreshedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dailyCache.id, existing[0].id));
  } else {
    await db.insert(dailyCache).values({
      userId,
      cacheDate,
      weatherData,
      stockData,
      newsHeadlines,
      emailSummaries,
    });
  }
}

// Scheduled tasks queries
export async function saveScheduledTask(
  userId: number,
  taskType: string,
  scheduleCronTaskUid: string,
  cronExpression: string
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(scheduledTasks)
    .where(and(eq(scheduledTasks.userId, userId), eq(scheduledTasks.taskType, taskType)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(scheduledTasks)
      .set({
        scheduleCronTaskUid,
        cronExpression,
        updatedAt: new Date(),
      })
      .where(eq(scheduledTasks.id, existing[0].id));
  } else {
    await db.insert(scheduledTasks).values({
      userId,
      taskType,
      scheduleCronTaskUid,
      cronExpression,
    });
  }
}

export async function getScheduledTask(userId: number, taskType: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(scheduledTasks)
    .where(and(eq(scheduledTasks.userId, userId), eq(scheduledTasks.taskType, taskType)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}
