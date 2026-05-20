# Tailored — Personal Daily Dashboard

A dark-themed, card-based web app that automatically fetches and surfaces personalized information every morning at 7 AM. Features include weather, stock market data, music recommendations, news, and email summaries — all tailored to your interests and continuously learning from your preferences.

## Features

### Core Functionality

- **Daily 7 AM Refresh**: Automatic data fetch and cache for all widgets
- **Weather Widget**: Current conditions and forecast for your location
- **Stock Market Widget**: Trending and growing stocks with market-moving news
- **Music Recommendations**: Spotify integration with thumbs up/down preference tracking
- **News Feed**: Personalized news filtered by school/state/country/world categories
- **Email Summary**: Gmail integration with LLM-powered email summarization
- **Preference Learning**: Continuous algorithm that learns your likes/dislikes

### Technical Highlights

- **Dark Dashboard UI**: Sidebar navigation, card-based grid, glowing blue accents
- **Real-time Preference Tracking**: Thumbs up/down on music and news
- **Cross-feature Learning**: Music mood preferences affect news tone recommendations
- **Secure OAuth**: Spotify and Gmail integration with encrypted token storage
- **Scheduled Jobs**: Heartbeat cron for reliable 7 AM daily refresh
- **Responsive Design**: Mobile-friendly dark theme with Tailwind CSS

## Architecture

### Stack

- **Frontend**: React 19 + Tailwind CSS 4 + Vite
- **Backend**: Express 4 + tRPC 11 + Drizzle ORM
- **Database**: MySQL/TiDB with 9 tables
- **Auth**: Manus OAuth + Spotify/Gmail OAuth
- **Scheduling**: Heartbeat (HTTP cron)
- **LLM**: Built-in Manus LLM for email summarization

### Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles with Spotify/Gmail tokens |
| `userPreferences` | Likes/dislikes for music and news |
| `musicHistory` | Spotify listening history with counts |
| `musicRecommendations` | Generated recommendations (<3 listens) |
| `newsArticles` | News items with categories and scores |
| `emailSummaries` | Cached email summaries |
| `stockData` | Trending stocks with user preferences |
| `dailyCache` | Daily snapshot of all data |
| `scheduledTasks` | Heartbeat cron job tracking |

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL/TiDB database
- Spotify Developer account (optional)
- Google Cloud account for Gmail (optional)

### Installation

```bash
# Install dependencies
pnpm install

# Set up database
pnpm drizzle-kit migrate

# Start dev server
pnpm dev
```

### First Time Setup

1. **Sign in** with Manus OAuth
2. **Onboarding flow**:
   - Enter location and timezone
   - Select news interests (school/state/world)
   - Connect Spotify (optional, for music recommendations)
   - Connect Gmail (optional, for email summaries)
3. **Enable daily refresh** at 7 AM UTC
4. **Start interacting** — like/dislike music and news to train the algorithm

## API Integrations

### Spotify

Fetches user's top tracks and listening history. Recommends songs with <3 listens. Tracks preferences via thumbs up/down.

**Setup**: [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

### Gmail

Fetches recent emails and generates summaries using LLM. Filters by importance score.

**Setup**: [Google Cloud Console](https://console.cloud.google.com)

### Weather

Uses free Open-Meteo API (no key required). Fetches current conditions and 7-day forecast.

### Stock Market

Integrates with stock-analysis skill for trending/growing stocks and market news.

### News

Fetches news by category (school/state/world) from configured news sources.

## Preference Learning Algorithm

### How It Works

1. **Capture**: User interactions (thumbs up/down) stored in `userPreferences`
2. **Score**: Each preference gets +1 (like) or -1 (dislike)
3. **Aggregate**: Scores summed per feature and normalized
4. **Rank**: Items ranked by relevance + preference score
5. **Update**: Recommendations regenerated after each interaction

### Music Learning

- Filters recommendations to songs with <3 listens
- Ranks by Spotify popularity + user preference
- Thumbs up increases weight for similar artists/genres
- Thumbs down decreases weight

### News Learning

- Filters by user's selected categories
- Ranks by relevance score + user preference
- Thumbs up increases weight for similar topics/sources
- Thumbs down decreases weight

## Daily Refresh (7 AM UTC)

The `scheduler.setupDailyRefresh` mutation creates a Heartbeat cron job:

```
Cron: 0 0 7 * * *  (6-field UTC format)
Endpoint: POST /api/scheduled/dailyRefresh
Payload: { userId }
```

The handler:
1. Fetches weather for user's location
2. Fetches trending stocks
3. Fetches news by user's interests
4. Fetches and summarizes emails
5. Caches all data in `dailyCache` table
6. All widgets draw from cache for consistency

## File Structure

```
tailored/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx           # Landing page
│   │   │   ├── Dashboard.tsx      # Main dashboard
│   │   │   └── Onboarding.tsx     # Setup flow
│   │   ├── components/
│   │   │   └── DashboardLayout.tsx # Sidebar + nav
│   │   ├── lib/
│   │   │   └── trpc.ts            # tRPC client
│   │   └── App.tsx                # Routes
│   └── index.html
├── server/
│   ├── routers.ts                 # tRPC procedures
│   ├── services.ts                # API integrations
│   ├── db.ts                       # Database helpers
│   └── _core/
│       ├── index.ts               # Express setup
│       ├── heartbeat.ts           # Scheduler SDK
│       └── llm.ts                 # LLM integration
├── drizzle/
│   ├── schema.ts                  # Database schema
│   └── migrations/                # SQL migrations
├── shared/
│   └── const.ts                   # Shared constants
└── package.json
```

## Development

### Add a New Widget

1. Create component in `client/src/pages/Dashboard.tsx`
2. Add tRPC procedure in `server/routers.ts`
3. Add database helper in `server/db.ts`
4. Add service in `server/services.ts` if needed
5. Wire frontend to backend via `trpc.*.useQuery/useMutation`

### Add a New API Integration

1. Create service function in `server/services.ts`
2. Add tRPC procedure in `server/routers.ts`
3. Add database schema if needed in `drizzle/schema.ts`
4. Run `pnpm drizzle-kit generate` and apply migration
5. Wire frontend component to new procedure

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

## Deployment

### Manus Hosting (Recommended)

1. Save checkpoint: `webdev_save_checkpoint`
2. Click "Publish" in Management UI
3. Get live URL: `https://tailored-xxx.manus.space`
4. Custom domain support available

### External Hosting

```bash
pnpm build
pnpm start
```

Requires Node.js 18+, MySQL, and environment variables configured.

## Troubleshooting

### Daily Refresh Not Triggering

- Check `scheduledTasks` table for cron job
- Verify `isEnabled = true`
- Check `/api/scheduled/dailyRefresh` logs
- Run `manus-heartbeat list` to verify job exists

### Spotify/Gmail Not Connecting

- Verify OAuth credentials in `.env.local`
- Check redirect URIs match exactly
- Ensure user grants permission
- Check token expiration and refresh

### Recommendations Not Updating

- Verify preferences in `userPreferences` table
- Check `updatePreferenceScores()` is called
- Verify recommendation score calculation
- Check music history has <3 listen tracks

## Performance

- **Daily Cache**: All data fetched once at 7 AM, cached for 24 hours
- **Lazy Loading**: Widgets load independently with skeleton states
- **Optimistic Updates**: Preference tracking updates UI immediately
- **Database Indexes**: Indexed on userId, type, and category

## Security

- **OAuth Tokens**: Encrypted in database
- **Session Cookies**: Secure, HttpOnly, SameSite
- **CORS**: Restricted to trusted origins
- **SQL Injection**: Protected via Drizzle ORM
- **XSS**: Protected via React's built-in escaping

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test
4. Submit a pull request

## License

MIT

## Support

For issues or questions, open an issue on GitHub or contact the development team.

---

**Built with ❤️ by the Tailored team**
