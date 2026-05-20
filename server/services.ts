/**
 * Backend services for fetching and processing data from external APIs.
 * These services are called by the daily 7 AM refresh job and cached for the entire day.
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";

/**
 * Weather Service
 * Fetches current weather and forecast for a given location.
 */
export async function fetchWeatherData(location: string, timezone: string) {
  try {
    // Using Open-Meteo free API (no key required)
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    const geoData = await response.json();

    if (!geoData.results || geoData.results.length === 0) {
      console.warn(`[Weather] No location found for: ${location}`);
      return null;
    }

    const { latitude, longitude } = geoData.results[0];

    // Fetch weather data
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=${encodeURIComponent(timezone)}`
    );
    const weatherData = await weatherResponse.json();

    return {
      location: geoData.results[0].name,
      country: geoData.results[0].country,
      current: weatherData.current,
      daily: weatherData.daily,
      timezone: weatherData.timezone,
    };
  } catch (error) {
    console.error("[Weather] Error fetching weather:", error);
    return null;
  }
}

/**
 * Stock Market Service
 * Fetches trending and growing stocks using the stock-analysis skill.
 */
export async function fetchTrendingStocks() {
  try {
    // This would integrate with the stock-analysis skill via MCP
    // For now, return mock data structure
    return {
      trending: [
        { symbol: "NVDA", price: 875.5, changePercent: 5.2, trend: "growing" },
        { symbol: "TSLA", price: 245.3, changePercent: 3.8, trend: "growing" },
        { symbol: "AAPL", price: 189.2, changePercent: 2.1, trend: "stable" },
      ],
      marketNews: [
        {
          title: "Fed signals potential rate cuts in 2026",
          source: "Reuters",
          url: "https://example.com/fed-rates",
        },
        {
          title: "Tech stocks rally on AI optimism",
          source: "Bloomberg",
          url: "https://example.com/tech-rally",
        },
      ],
    };
  } catch (error) {
    console.error("[Stocks] Error fetching stocks:", error);
    return null;
  }
}

/**
 * News Service
 * Fetches news articles filtered by category (school, state, world).
 */
export async function fetchNewsArticles(category: "school" | "state" | "world", userLocation?: string) {
  try {
    // Using NewsAPI or similar service
    // For now, return mock data structure
    const categoryMap = {
      school: "education",
      state: "local",
      world: "world",
    };

    return {
      category,
      articles: [
        {
          title: "Sample news article",
          description: "This is a sample news article",
          source: "News Source",
          url: "https://example.com/article",
          imageUrl: "https://example.com/image.jpg",
          publishedAt: new Date().toISOString(),
        },
      ],
    };
  } catch (error) {
    console.error("[News] Error fetching news:", error);
    return null;
  }
}

/**
 * Email Service
 * Fetches emails from Gmail and generates summaries using LLM.
 */
export async function fetchAndSummarizeEmails(userId: number, spotifyAccessToken?: string) {
  try {
    const db = await getDb();
    if (!db) return [];

    // This would integrate with Gmail API
    // For now, return mock data structure
    return [
      {
        gmailMessageId: "msg-123",
        fromAddress: "sender@example.com",
        subject: "Sample Email",
        originalBody: "This is a sample email body",
        summary: "Summary of the email",
        importanceScore: 85,
      },
    ];
  } catch (error) {
    console.error("[Email] Error fetching emails:", error);
    return [];
  }
}

/**
 * Music Recommendation Service
 * Fetches Spotify listening history and generates recommendations.
 */
export async function fetchSpotifyListeningHistory(spotifyAccessToken: string) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=50", {
      headers: {
        Authorization: `Bearer ${spotifyAccessToken}`,
      },
    });

    if (!response.ok) {
      console.warn("[Spotify] Failed to fetch listening history");
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("[Spotify] Error fetching listening history:", error);
    return [];
  }
}

/**
 * Generate Music Recommendations
 * Recommends songs based on listening history and preference algorithm.
 */
export async function generateMusicRecommendations(
  userId: number,
  listeningHistory: Array<{ id: string; name: string; artists: Array<{ name: string }> }>,
  maxListens: number = 3
) {
  try {
    const db = await getDb();
    if (!db) return [];

    // Get user's music history to filter out frequently listened tracks
    const musicHistory = await db.query.musicHistory.findMany({
      where: (history) => history.userId === userId,
    });

    // Filter tracks with fewer than maxListens
    const recommendableTrackIds = new Set(
      musicHistory.filter((h) => (h.listenCount || 0) < maxListens).map((h) => h.spotifyTrackId)
    );

    // Generate recommendations from listening history
    const recommendations = listeningHistory
      .filter((track) => recommendableTrackIds.has(track.id))
      .slice(0, 10)
      .map((track) => ({
        spotifyTrackId: track.id,
        trackName: track.name,
        artistName: track.artists[0]?.name || "Unknown Artist",
        recommendationScore: Math.random() * 100, // Placeholder scoring
      }));

    return recommendations;
  } catch (error) {
    console.error("[Music] Error generating recommendations:", error);
    return [];
  }
}

/**
 * Preference Learning Algorithm
 * Analyzes user interactions (likes/dislikes) to improve recommendations.
 */
export async function updatePreferenceScores(userId: number) {
  try {
    const db = await getDb();
    if (!db) return;

    // Fetch user's recent preferences
    const musicPrefs = await db.query.userPreferences.findMany({
      where: (pref) => pref.userId === userId && pref.type === "music",
    });

    const newsPrefs = await db.query.userPreferences.findMany({
      where: (pref) => pref.userId === userId && pref.type === "news",
    });

    // Calculate aggregate preference scores
    const musicScore = musicPrefs.reduce((sum, p) => sum + (p.score || 0), 0) / Math.max(musicPrefs.length, 1);
    const newsScore = newsPrefs.reduce((sum, p) => sum + (p.score || 0), 0) / Math.max(newsPrefs.length, 1);

    // Update music recommendations based on preference score
    if (musicScore > 0) {
      // User likes music recommendations - increase diversity
    } else if (musicScore < 0) {
      // User dislikes recommendations - adjust algorithm
    }

    console.log(`[Preferences] Updated scores for user ${userId}: music=${musicScore}, news=${newsScore}`);
  } catch (error) {
    console.error("[Preferences] Error updating preference scores:", error);
  }
}

/**
 * Generate Email Summary using LLM
 */
export async function generateEmailSummary(emailBody: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert email summarizer. Provide a concise 1-2 sentence summary of the email content, highlighting the most important information.",
        },
        {
          role: "user",
          content: `Summarize this email:\n\n${emailBody}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === "string" ? content : "Unable to summarize email";
  } catch (error) {
    console.error("[Email] Error generating summary:", error);
    return "Unable to summarize email";
  }
}
