import axios from "axios";
import { ENV } from "./_core/env";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string };
  external_urls: { spotify: string };
  preview_url: string | null;
  popularity: number;
}

export interface SpotifyPlaylistItem {
  track: SpotifyTrack;
  played_at: string;
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3000/api/spotify/callback";
  }

  /**
   * Get authorization URL for Spotify OAuth
   */
  getAuthorizationUrl(state: string): string {
    const scopes = [
      "user-read-private",
      "user-read-email",
      "user-read-recently-played",
      "user-top-read",
      "user-library-read",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: scopes,
      state,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return response.data;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return response.data;
  }

  /**
   * Get user's recently played tracks
   */
  async getRecentlyPlayed(accessToken: string, limit = 50): Promise<SpotifyPlaylistItem[]> {
    try {
      const response = await axios.get(`${SPOTIFY_API_BASE}/me/player/recently_played`, {
        params: { limit },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data.items || [];
    } catch (error) {
      console.error("[Spotify] Failed to fetch recently played:", error);
      return [];
    }
  }

  /**
   * Get user's top tracks
   */
  async getTopTracks(
    accessToken: string,
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit = 50
  ): Promise<SpotifyTrack[]> {
    try {
      const response = await axios.get(`${SPOTIFY_API_BASE}/me/top/tracks`, {
        params: { time_range: timeRange, limit },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data.items || [];
    } catch (error) {
      console.error("[Spotify] Failed to fetch top tracks:", error);
      return [];
    }
  }

  /**
   * Get recommendations based on seed tracks
   */
  async getRecommendations(
    accessToken: string,
    seedTrackIds: string[],
    limit = 20
  ): Promise<SpotifyTrack[]> {
    try {
      const response = await axios.get(`${SPOTIFY_API_BASE}/recommendations`, {
        params: {
          seed_tracks: seedTrackIds.slice(0, 5).join(","),
          limit,
          market: "US",
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data.tracks || [];
    } catch (error) {
      console.error("[Spotify] Failed to fetch recommendations:", error);
      return [];
    }
  }

  /**
   * Get audio features for tracks (for filtering)
   */
  async getAudioFeatures(accessToken: string, trackIds: string[]): Promise<Record<string, any>> {
    try {
      const response = await axios.get(`${SPOTIFY_API_BASE}/audio-features`, {
        params: { ids: trackIds.slice(0, 100).join(",") },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const features: Record<string, any> = {};
      response.data.audio_features?.forEach((feature: any) => {
        if (feature) features[feature.id] = feature;
      });

      return features;
    } catch (error) {
      console.error("[Spotify] Failed to fetch audio features:", error);
      return {};
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(accessToken: string): Promise<{ id: string; display_name: string; email: string }> {
    try {
      const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data;
    } catch (error) {
      console.error("[Spotify] Failed to fetch user profile:", error);
      throw error;
    }
  }
}

export const spotifyService = new SpotifyService();
