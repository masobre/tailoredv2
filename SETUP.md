# Tailored — Setup & Deployment Guide

## Overview

Tailored is a personalized daily dashboard that updates every morning at 7 AM UTC with weather, stock market data, music recommendations, news, and email summaries. The app learns your preferences over time and continuously refines recommendations.

## Architecture

### Database Schema
- **users**: Core user table with Spotify/Gmail integration fields
- **userPreferences**: Tracks likes/dislikes for music and news
- **musicHistory**: Spotify listening history with listen counts
- **musicRecommendations**: Generated recommendations filtered by <3 listens
- **newsArticles**: News items with category (school/state/world) and relevance scores
- **emailSummaries**: Cached email summaries from Gmail
- **stockData**: Trending/growing stocks with user preferences
- **dailyCache**: Daily snapshot of all data (weather, stocks, news, emails)
- **scheduledTasks**: Heartbeat cron job tracking

### Backend Services
- **Weather**: Open-Meteo API (free, no key required)
- **Stocks**: Stock-analysis skill via MCP (requires integration)
- **News**: NewsAPI or similar (requires API key)
- **Email**: Gmail API with OAuth
- **Music**: Spotify API with OAuth
- **LLM**: Built-in Manus LLM for email summarization

### Frontend
- **Home**: Landing page with login
- **Dashboard**: Main hub with weather, stocks, music, news, email widgets
- **Onboarding**: Location, timezone, interests, and service connections
- **Dark Theme**: OKLCH color space with glowing blue accents

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the project root:

```env
# Database (auto-configured by Manus)
DATABASE_URL=mysql://user:password@host/database

# OAuth (auto-configured by Manus)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth

# External APIs
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/oauth/spotify

GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=https://your-domain.com/api/oauth/gmail

NEWS_API_KEY=your_newsapi_key

# LLM (auto-configured by Manus)
BUILT_IN_FORGE_API_KEY=your_forge_key
BUILT_IN_FORGE_API_URL=https://api.manus.im
```

### 2. Database Setup

The database schema is already applied. To verify:

```bash
pnpm drizzle-kit migrate
```

### 3. Spotify Integration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app and get Client ID/Secret
3. Set Redirect URI to `https://your-domain.com/api/oauth/spotify`
4. Add credentials to environment variables
5. User connects via onboarding flow

### 4. Gmail Integration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Set Redirect URI to `https://your-domain.com/api/oauth/gmail`
4. Add credentials to environment variables
5. User grants permission via onboarding flow

### 5. Daily 7 AM Refresh

The scheduler is set up via the `scheduler.setupDailyRefresh` tRPC mutation:

```typescript
// Called during onboarding
const result = await trpc.scheduler.setupDailyRefresh.mutate();
// Returns: { success: true, taskUid: "...", nextExecutionAt: "..." }
```

This creates a Heartbeat cron job with:
- **Cron**: `0 0 7 * * *` (7 AM UTC daily)
- **Endpoint**: `/api/scheduled/dailyRefresh`
- **Payload**: `{ userId }`

## Preference Learning Algorithm

### How It Works

1. **Preference Tracking**: User interactions (thumbs up/down) are stored in `userPreferences`
2. **Scoring**: Each preference gets a score (+1 for like, -1 for dislike)
3. **Aggregation**: Scores are aggregated per feature (music/news)
4. **Ranking**: Items are ranked by relevance score + user preference score
5. **Continuous Update**: `updatePreferenceScores()` runs after each interaction

### Music Recommendations

- Filters songs with <3 listens from Spotify history
- Ranks by recommendation score + user preference
- Thumbs up/down updates preference weights
- Cross-feature signals: music mood affects news tone

### News Recommendations

- Filters by user interests (school/state/world)
- Ranks by relevance score + user preference
- Thumbs up/down updates ranking
- Continuous learning refines category weights

## Deployment

### Manus Hosting (Built-in)

1. Create a checkpoint: `webdev_save_checkpoint`
2. Click "Publish" in the Management UI
3. Get live URL: `https://tailored-xxx.manus.space`
4. Custom domain support available in Settings

### External Hosting (Optional)

If deploying to Railway, Render, Vercel, etc.:

```bash
# Build
pnpm build

# Start
pnpm start
```

Requires:
- Node.js 18+
- MySQL/TiDB database
- Environment variables configured
- OAuth redirect URIs updated

## API Integrations

### Spotify API

```typescript
// Fetch user's top tracks
const response = await fetch("https://api.spotify.com/v1/me/top/tracks", {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

### Gmail API

```typescript
// Fetch recent emails
const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages", {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

### Weather (Open-Meteo)

```typescript
// Free API, no key required
const response = await fetch(
  "https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m"
);
```

## Troubleshooting

### Daily Refresh Not Triggering

1. Check `scheduledTasks` table for the cron job
2. Verify `isEnabled = true`
3. Check `/api/scheduled/dailyRefresh` endpoint logs
4. Confirm Heartbeat job exists: `manus-heartbeat list`

### Spotify/Gmail Not Connecting

1. Verify OAuth credentials in environment
2. Check redirect URIs match exactly
3. Ensure user grants permission in browser
4. Check access token expiration and refresh logic

### Recommendations Not Updating

1. Verify preferences are being tracked: `userPreferences` table
2. Check `updatePreferenceScores()` is called after interactions
3. Verify `recommendationScore` is calculated correctly
4. Check music history has <3 listen tracks

## Development

```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm check

# Format code
pnpm format
```

## Next Steps

1. Connect Spotify and Gmail via onboarding
2. Set location and timezone
3. Select news interests (school/state/world)
4. Enable daily 7 AM refresh
5. Start liking/disliking content to train the algorithm
6. Check back tomorrow at 7 AM for your first dashboard update!

## Support

For issues or feature requests, open an issue on the GitHub repository or contact the development team.
