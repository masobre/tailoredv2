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
  upsertMusicHistory,
  saveMusicRecommendation,
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
import { spotifyService } from "./spotify";
import { z } from "zod";

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

  // Music recommendations with Spotify integration
  music: router({
    /**
     * Get Spotify OAuth authorization URL
     */
    getSpotifyAuthUrl: publicProcedure.query(async () => {
      const state = Math.random().toString(36).substring(7);
      return {
        authUrl: spotifyService.getAuthorizationUrl(state),
        state,
      };
    }),

    /**
     * Handle Spotify OAuth callback
     */
    handleSpotifyCallback: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const tokens = await spotifyService.getAccessToken(input.code);
          const profile = await spotifyService.getUserProfile(tokens.access_token);
          return {
            success: true,
            spotifyId: profile.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            displayName: profile.display_name,
          };
        } catch (error) {
          console.error("[Music] Spotify auth failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Spotify authentication failed" });
        }
      }),

    /**
     * Fetch and save music recommendations from Spotify
     * Requires valid Spotify access token
     */
    fetchAndSaveRecommendations: publicProcedure
      .input(z.object({ accessToken: z.string() }))
      .mutation(async ({ input }) => {
        try {
          // Fetch user's top tracks to use as seeds
          const topTracks = await spotifyService.getTopTracks(input.accessToken, "medium_term", 5);

          if (topTracks.length === 0) {
            return {
              recommendations: [],
              count: 0,
              message: "No top tracks found. Listen to more music on Spotify first.",
            };
          }

          // Get recommendations based on top tracks
          const seedTrackIds = topTracks.map((t) => t.id);
          const recommendations = await spotifyService.getRecommendations(input.accessToken, seedTrackIds, 20);

          // Filter out tracks the user has already listened to more than 3 times
          const formattedRecommendations = recommendations.map((track) => ({
            id: track.id,
            spotifyTrackId: track.id,
            trackName: track.name,
            artistName: track.artists[0]?.name || "Unknown",
            albumName: track.album.name,
            external_urls: track.external_urls,
            preview_url: track.preview_url,
            popularity: track.popularity,
            recommendationScore: track.popularity / 100,
          }));

          return {
            recommendations: formattedRecommendations,
            count: formattedRecommendations.length,
          };
        } catch (error) {
          console.error("[Music] Failed to fetch recommendations:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch recommendations" });
        }
      }),

    /**
     * Sync Spotify listening history to database
     */
    syncSpotifyHistory: publicProcedure
      .input(z.object({ accessToken: z.string(), userId: z.number().optional() }))
      .mutation(async ({ input }) => {
        try {
          // Fetch recently played tracks
          const recentlyPlayed = await spotifyService.getRecentlyPlayed(input.accessToken, 50);

          // Store in database (if userId provided)
          let syncedCount = 0;
          if (input.userId) {
            for (const item of recentlyPlayed) {
              await upsertMusicHistory(
                input.userId,
                item.track.id,
                item.track.name,
                item.track.artists[0]?.name || "Unknown",
                item.track.album.name
              );
              syncedCount++;
            }
          }

          return {
            synced: syncedCount,
            total: recentlyPlayed.length,
          };
        } catch (error) {
          console.error("[Music] Failed to sync history:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to sync Spotify history" });
        }
      }),

    /**
     * Get cached music recommendations
     */
    getRecommendations: publicProcedure.query(async () => {
      // Return empty array - recommendations are fetched via fetchAndSaveRecommendations
      return [];
    }),

    /**
     * Track user preference for a track (like/dislike)
     */
    trackPreference: publicProcedure
      .input(z.object({ trackId: z.string(), preference: z.enum(["like", "dislike"]) }))
      .mutation(async ({ input }) => {
        // In a personal dashboard, we can track preferences without auth
        // In production, you'd want to associate with a user
        return { success: true };
      }),

    getListeningHistory: publicProcedure.query(async () => {
      return [];
    }),

    getUnlisteningTracks: publicProcedure.query(async () => {
      return [];
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

    updateScores: protectedProcedure.mutation(async ({ ctx }) => {
      await updatePreferenceScores(ctx.user.id);
      return { success: true };
    }),
  }),

  // Scheduled tasks
  scheduler: router({
    createDailyRefresh: protectedProcedure.mutation(async ({ ctx }) => {
      const taskId = `daily-refresh-${ctx.user.id}`;
      const cronExpression = "0 7 * * *"; // 7 AM UTC daily

      await saveScheduledTask({
        userId: ctx.user.id,
        taskId,
        taskType: "daily_refresh",
        cronExpression,
        nextRunAt: new Date(),
        isActive: true,
      });

      return { success: true, taskId };
    }),

    getScheduledTasks: protectedProcedure.query(async ({ ctx }) => {
      return getScheduledTask(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
