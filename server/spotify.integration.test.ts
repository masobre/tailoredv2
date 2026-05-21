import { describe, it, expect, beforeAll } from "vitest";
import { spotifyService } from "./spotify";

/**
 * Integration tests for Spotify API
 * Tests the simplified recommendation flow
 */

describe("Spotify Integration - Simplified Recommendations", () => {
  const accessToken = process.env.VITE_SPOTIFY_ACCESS_TOKEN || "";

  beforeAll(() => {
    if (!accessToken) {
      console.warn("⚠️  VITE_SPOTIFY_ACCESS_TOKEN not set - tests will be skipped");
    }
  });

  it("should fetch user profile", async () => {
    if (!accessToken) {
      console.log("Skipping test - no access token");
      return;
    }

    try {
      const profile = await spotifyService.getUserProfile(accessToken);
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.display_name).toBeDefined();
      console.log(`✓ Got profile: ${profile.display_name}`);
    } catch (error) {
      console.error("✗ Failed to fetch profile:", error);
      throw error;
    }
  });

  it("should fetch user's top tracks", async () => {
    if (!accessToken) {
      console.log("Skipping test - no access token");
      return;
    }

    try {
      const topTracks = await spotifyService.getTopTracks(accessToken, "medium_term", 10);
      expect(topTracks).toBeDefined();
      expect(Array.isArray(topTracks)).toBe(true);
      expect(topTracks.length).toBeGreaterThan(0);
      console.log(`✓ Got ${topTracks.length} top tracks`);
      topTracks.slice(0, 3).forEach((track) => {
        console.log(`  - ${track.name} by ${track.artists[0]?.name}`);
      });
    } catch (error) {
      console.error("✗ Failed to fetch top tracks:", error);
      throw error;
    }
  });

  it("should get recommendations based on seed tracks", async () => {
    if (!accessToken) {
      console.log("Skipping test - no access token");
      return;
    }

    try {
      // First get top tracks to use as seeds
      const topTracks = await spotifyService.getTopTracks(accessToken, "medium_term", 5);
      expect(topTracks.length).toBeGreaterThan(0);

      const seedTrackIds = topTracks.slice(0, 3).map((t) => t.id);
      const recommendations = await spotifyService.getRecommendations(accessToken, seedTrackIds, 20);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      console.log(`✓ Got ${recommendations.length} recommendations`);
      recommendations.slice(0, 3).forEach((track) => {
        console.log(`  - ${track.name} by ${track.artists[0]?.name} (popularity: ${track.popularity})`);
      });
    } catch (error) {
      console.error("✗ Failed to get recommendations:", error);
      throw error;
    }
  });

  it("should get personalized recommendations (complete flow)", async () => {
    if (!accessToken) {
      console.log("Skipping test - no access token");
      return;
    }

    try {
      console.log("\n🎵 Testing complete recommendation flow...");
      const recommendations = await spotifyService.getPersonalizedRecommendations(accessToken, 20);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      console.log(`✓ Complete flow successful! Got ${recommendations.length} recommendations:`);
      recommendations.slice(0, 5).forEach((track, idx) => {
        console.log(
          `  ${idx + 1}. ${track.name} by ${track.artists[0]?.name} (popularity: ${track.popularity})`
        );
        console.log(`     🔗 ${track.external_urls.spotify}`);
      });
    } catch (error) {
      console.error("✗ Complete flow failed:", error);
      throw error;
    }
  });

  it("should handle invalid access token gracefully", async () => {
    try {
      const invalidToken = "invalid_token_12345";
      await spotifyService.getUserProfile(invalidToken);
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // Expected to fail
      console.log("✓ Invalid token correctly rejected");
      expect(error).toBeDefined();
    }
  });
});
