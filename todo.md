# Tailored — Project TODO

## Phase 1: Project Setup & Architecture
- [x] Initialize GitHub repository "tailored" and configure git integration
- [x] Set up database schema for users, preferences, music history, news preferences, and email summaries
- [x] Create backend service architecture for weather, stocks, news, email, and music APIs
- [x] Set up scheduled 7 AM daily refresh job using Heartbeat

## Phase 2: Backend Services
- [x] Weather API integration (fetch current conditions and forecast for user location)
- [x] Stock market API integration (trending/growing stocks and market-moving news)
- [x] Email integration (Gmail API to fetch latest emails)
- [x] LLM email summarization service
- [x] News API integration (world, state/country, school-related news sources)
- [x] Spotify API integration (fetch user listening history and track metadata)
- [x] Create daily cache system to store 7 AM snapshot for all data sources

## Phase 3: Music Recommendation Algorithm
- [x] Spotify authentication and profile onboarding flow
- [x] Music history ingestion (fetch user's Spotify listening history)
- [x] Recommendation engine that filters songs with <3 listens
- [x] Thumbs up/down preference tracking for music
- [x] Music preference learning algorithm integrated with global preference system

## Phase 4: Preference Learning Algorithm
- [x] User preference database schema (music likes/dislikes, news likes/dislikes)
- [x] Preference tracking system for music interactions (thumbs up/down)
- [x] Preference tracking system for news interactions (likes/dislikes)
- [x] Continuous learning algorithm that updates recommendation weights
- [x] Cross-feature preference signals (e.g., music mood preferences affecting news tone)

## Phase 5: News Recommendation System
- [x] News API integration with category filtering (school, state/country, world)
- [x] News preference tracking and ranking algorithm
- [x] Interest onboarding for news categories
- [x] News feed filtering based on user interests and learned preferences
- [x] News ranking by relevance and user preference score

## Phase 6: Email Summary Widget
- [x] Gmail API integration with OAuth
- [x] Email fetching and filtering (latest important emails)
- [x] LLM-powered email summarization service
- [x] Email summary caching (7 AM daily refresh)
- [x] Email widget UI component

## Phase 7: Frontend UI & Components
- [x] Dark dashboard layout with sidebar navigation
- [x] Card-based widget grid system
- [x] Weather widget component (current conditions + forecast)
- [x] Stock market widget component (trending stocks + market news)
- [x] Music recommendation widget component (with thumbs up/down controls)
- [x] News feed widget component (with category filtering and preference tracking)
- [x] Email summary widget component
- [x] Interests onboarding modal (Spotify, GitHub, interests)
- [x] User profile/settings page
- [x] Glowing accent colors and dark theme styling

## Phase 8: Integration & Scheduling
- [x] Wire frontend to backend APIs
- [x] Implement 7 AM daily refresh scheduler using Heartbeat
- [x] Cache management and invalidation strategy
- [x] Real-time preference updates across all widgets
- [x] Error handling and fallback UI for failed data fetches

## Phase 9: GitHub Integration & Deployment
- [x] Configure GitHub repository push automation
- [x] Set up GitHub Actions for CI/CD (optional)
- [x] Push all source code to GitHub "tailored" repository
- [x] Document setup and deployment instructions

## Phase 10: Testing & Refinement
- [x] Unit tests for preference algorithm
- [x] Integration tests for API services
- [x] UI/UX testing and refinement
- [x] Performance optimization for daily refresh
- [x] User onboarding flow testing

## Phase 11: Delivery & Documentation
- [x] Final code review and cleanup
- [x] Create comprehensive README with setup instructions
- [x] Document API integrations and credentials needed
- [x] Provide Spotify/GitHub onboarding guide
- [x] Deliver live URL and GitHub repository link to user
