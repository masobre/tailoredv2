import { describe, it, expect } from "vitest";
import { spotifyService } from "./spotify";

describe("Spotify Service", () => {
  it("should generate a valid authorization URL", () => {
    const state = "test-state-123";
    const authUrl = spotifyService.getAuthorizationUrl(state);

    expect(authUrl).toContain("https://accounts.spotify.com/authorize");
    expect(authUrl).toContain("client_id=");
    expect(authUrl).toContain("redirect_uri=");
    expect(authUrl).toContain("scope=");
    expect(authUrl).toContain("state=test-state-123");
  });

  it("should have valid Spotify credentials configured", () => {
    // Check that environment variables are set
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    expect(clientId).toBeDefined();
    expect(clientSecret).toBeDefined();
    expect(redirectUri).toBeDefined();

    // Verify they're not empty
    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();
    expect(redirectUri).toBeTruthy();

    // Verify format
    expect(clientId).toHaveLength(32); // Spotify client IDs are 32 chars
    expect(clientSecret).toHaveLength(32); // Spotify client secrets are 32 chars
    expect(redirectUri).toContain("callback");
  });

  it("should have correct redirect URI format", () => {
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    expect(redirectUri).toMatch(/^https?:\/\/.+\/callback\/?$/);
  });
});
