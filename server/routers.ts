import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  getUserById,
  trackUserPreference,
  getUserPreferences,
  getMusicHistoryByUserId,
  getUnlisteningTracks,
  getMusicRecommendations,
  getNewsByCategory,
  updateNewsRelevance,
  getEmailSummaries,
  getTrendingStocks,
  getDailyCache,
  getScheduledTask,
  saveScheduledTask,
} from "./db";
import {
  fetchWeatherData,
  fetchTrendingStocks,
  fetchNewsArticles,
  fetchAndSummarizeEmails,
  fetchSpotifyListeningHistory,
  generateMusicRecommendations,
  updatePreferenceScores,
} from "./services";
import { createHeartbeatJob } from "./_core/heartbeat";
import { parse as parseCookie } from "cookie";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // User profile and onboarding
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return user;
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          location: z.string().optional(),
          timezone: z.string().optional(),
          newsInterests: z.array(z.enum(["school", "state", "world"])).optional(),
          stockInterests: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Update user profile in database
        // This is a placeholder - actual implementation would update the users table
        return { success: true };
      }),

    connectSpotify: protectedProcedure
      .input(z.object({ accessToken: z.string(), refreshToken: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Store encrypted Spotify tokens
        return { success: true };
      }),

    connectGmail: protectedProcedure.mutation(async ({ ctx }) => {
      // Initiate Gmail OAuth flow
      return { authUrl: "https://accounts.google.com/o/oauth2/v2/auth" };
    }),
  }),

  // Dashboard data
  dashboard: router({
    getDailyData: protectedProcedure.query(async ({ ctx }) => {
      const today = new Date().toISOString().split("T")[0];
      const cache = await getDailyCache(ctx.user.id, today);

      if (cache) {
        return {
          weather: cache.weatherData,
          stocks: cache.stockData,
          news: cache.newsHeadlines,
          emails: cache.emailSummaries,
          cachedAt: cache.refreshedAt,
        };
      }

      return null;
    }),

    refreshData: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      // Fetch fresh data from all services
      const weatherData = await fetchWeatherData(user.location || "New York", user.timezone || "UTC");
      const stockData = await fetchTrendingStocks();
      const newsHeadlines = await fetchNewsArticles("world");
      const emailSummaries = await fetchAndSummarizeEmails(ctx.user.id);

      return {
        weather: weatherData,
        stocks: stockData,
        news: newsHeadlines,
        emails: emailSummaries,
      };
    }),
  }),

  // Music recommendations
  music: router({
    getRecommendations: protectedProcedure.query(async ({ ctx }) => {
      return getMusicRecommendations(ctx.user.id, 10);
    }),

    getListeningHistory: protectedProcedure.query(async ({ ctx }) => {
      return getMusicHistoryByUserId(ctx.user.id);
    }),

    getUnlisteningTracks: protectedProcedure.query(async ({ ctx }) => {
      return getUnlisteningTracks(ctx.user.id, 3);
    }),

    trackPreference: protectedProcedure
      .input(z.object({ trackId: z.string(), preference: z.enum(["like", "dislike"]) }))
      .mutation(async ({ ctx, input }) => {
        const score = input.preference === "like" ? 1 : -1;
        await trackUserPreference(ctx.user.id, "music", input.trackId, score);
        return { success: true };
      }),

    syncSpotifyHistory: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user?.spotifyAccessToken) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Spotify not connected" });
      }

      const history = await fetchSpotifyListeningHistory(user.spotifyAccessToken);
      return { synced: history.length };
    }),
  }),

  // News feed
  news: router({
    getByCategory: protectedProcedure
      .input(z.object({ category: z.enum(["school", "state", "world"]), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return getNewsByCategory(ctx.user.id, input.category, input.limit || 10);
      }),

    trackPreference: protectedProcedure
      .input(z.object({ articleId: z.number(), preference: z.enum(["like", "dislike"]) }))
      .mutation(async ({ ctx, input }) => {
        const score = input.preference === "like" ? 1 : -1;
        await trackUserPreference(ctx.user.id, "news", input.articleId.toString(), score);
        return { success: true };
      }),
  }),

  // Email summaries
  email: router({
    getSummaries: protectedProcedure.query(async ({ ctx }) => {
      return getEmailSummaries(ctx.user.id, 10);
    }),

    syncGmail: protectedProcedure.mutation(async ({ ctx }) => {
      // Fetch and summarize emails from Gmail
      return { synced: 0 };
    }),
  }),

  // Stock market data
  stocks: router({
    getTrending: protectedProcedure.query(async ({ ctx }) => {
      return getTrendingStocks(ctx.user.id, 10);
    }),

    trackInterest: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Add stock to user's interests
        return { success: true };
      }),
  }),

  // Preferences and learning
  preferences: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const musicPrefs = await getUserPreferences(ctx.user.id, "music");
      const newsPrefs = await getUserPreferences(ctx.user.id, "news");
      return { music: musicPrefs, news: newsPrefs };
    }),

    updateLearning: protectedProcedure.mutation(async ({ ctx }) => {
      await updatePreferenceScores(ctx.user.id);
      return { success: true };
    }),
  }),

  // Scheduled tasks
  scheduler: router({
    setupDailyRefresh: protectedProcedure.mutation(async ({ ctx }) => {
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";

      try {
        const job = await createHeartbeatJob(
          {
            name: `daily-refresh-${ctx.user.id}`,
            cron: "0 0 7 * * *", // 6-field UTC: sec min hour dom mon dow - 7 AM UTC daily
            path: "/api/scheduled/dailyRefresh",
            payload: { userId: ctx.user.id },
            description: `Daily 7 AM UTC refresh for user ${ctx.user.id}`,
          },
          sessionToken
        );

        await saveScheduledTask(ctx.user.id, "daily_refresh", job.taskUid, "0 0 7 * * *");

        return { success: true, taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt };
      } catch (error) {
        console.error("[Scheduler] Error setting up daily refresh:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to set up scheduler" });
      }
    }),

    getScheduledTasks: protectedProcedure.query(async ({ ctx }) => {
      const task = await getScheduledTask(ctx.user.id, "daily_refresh");
      return task ? [task] : [];
    }),
  }),
});

export type AppRouter = typeof appRouter;
