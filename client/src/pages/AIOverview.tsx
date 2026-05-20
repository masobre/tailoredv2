import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Cloud, Calendar, Search, Music, Newspaper, TrendingUp } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Weather & Calendar Widget
 */
function WeatherCalendarWidget() {
  const { data: dailyData, isLoading } = trpc.dashboard.getDailyData.useQuery();

  if (isLoading) return <Skeleton className="h-32 rounded-lg" />;

  const weather = dailyData?.weather;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Weather */}
      <div className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              {weather?.location || "Loading..."}
            </p>
            <p className="text-4xl font-bold text-white mt-2">{weather?.current?.temperature_2m}°</p>
            <p className="text-sm text-gray-300 mt-2">Humidity: {weather?.current?.relative_humidity_2m}%</p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-purple-400 mt-1" />
          <div>
            <p className="text-sm text-gray-400">What's Next</p>
            <p className="text-lg font-semibold text-white mt-2">Team Meeting</p>
            <p className="text-sm text-gray-300">2:00 PM - 3:00 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Search Bar
 */
function SearchBar() {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
      setQuery("");
    }
  };

  return (
    <form onSubmit={handleSearch} className="mb-6">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search Google..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-600 bg-slate-800/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>
    </form>
  );
}

/**
 * Music Carousel with Spotify Integration
 */
function MusicCarousel() {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const trackPreference = trpc.music.trackPreference.useMutation();
  const getSpotifyAuthUrl = trpc.music.getSpotifyAuthUrl.useQuery();
  const handleCallback = trpc.music.handleSpotifyCallback.useMutation();
  const fetchRecommendations = trpc.music.fetchAndSaveRecommendations.useMutation();

  // Auto-fetch recommendations when token is available
  React.useEffect(() => {
    if (!hasInitialized && spotifyConnected && spotifyAccessToken) {
      setHasInitialized(true);
      setIsLoading(true);
      setError(null);
      fetchRecommendations.mutate({ accessToken: spotifyAccessToken });
    }
  }, [hasInitialized, spotifyConnected, spotifyAccessToken]);

  const handleSpotifyConnect = async () => {
    if (!getSpotifyAuthUrl.data?.authUrl) return;

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      getSpotifyAuthUrl.data.authUrl,
      "SpotifyAuth",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for message from Spotify callback
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
        const code = event.data.code;
        setIsLoading(true);
        setError(null);
        // Exchange code for access token
        handleCallback.mutate(
          { code },
          {
            onSuccess: (data) => {
              setSpotifyConnected(true);
              setSpotifyAccessToken(data.accessToken);
              // Reset hasInitialized so useEffect triggers
              setHasInitialized(false);
            },
            onError: (err) => {
              setError("Failed to authenticate with Spotify");
              setIsLoading(false);
              console.error("Spotify auth error:", err);
            },
          }
        );
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  };

  const handleFetchRecommendations = async () => {
    if (!spotifyAccessToken) return;
    setIsLoading(true);
    fetchRecommendations.mutate({ accessToken: spotifyAccessToken });
  };

  // Handle recommendations fetch success/error
  React.useEffect(() => {
    if (fetchRecommendations.isSuccess && fetchRecommendations.data?.recommendations) {
      setRecommendations(fetchRecommendations.data.recommendations);
      setIsLoading(false);
      setError(null);
    } else if (fetchRecommendations.isError) {
      setError("Failed to fetch recommendations. Please try again.");
      setIsLoading(false);
      setRecommendations([]);
    }
  }, [fetchRecommendations.isSuccess, fetchRecommendations.isError, fetchRecommendations.data]);

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById("music-carousel");
    if (container) {
      const scrollAmount = 300;
      if (direction === "left") {
        container.scrollLeft -= scrollAmount;
        setScrollPos(container.scrollLeft - scrollAmount);
      } else {
        container.scrollLeft += scrollAmount;
        setScrollPos(container.scrollLeft + scrollAmount);
      }
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Music className="h-5 w-5 text-purple-400" />
          Recommended for You
        </h2>
        <div className="flex gap-2">
          {!spotifyConnected ? (
            <Button
              size="sm"
              onClick={handleSpotifyConnect}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Connect Spotify
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                onClick={handleFetchRecommendations}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => scroll("left")}
                className="h-8 w-8 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => scroll("right")}
                className="h-8 w-8 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-gradient-to-br from-red-500/10 to-orange-500/10 p-8 text-center">
          <Music className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Error Loading Music</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <Button
            onClick={handleSpotifyConnect}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Reconnect Spotify
          </Button>
        </div>
      ) : isLoading && recommendations.length === 0 ? (
        <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 text-center">
          <Music className="h-12 w-12 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white font-semibold mb-2">Loading your recommendations...</p>
          <p className="text-gray-400 text-sm">Analyzing your Spotify listening history</p>
        </div>
      ) : !spotifyConnected ? (
        <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 text-center">
          <Music className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Connect Spotify to Get Recommendations</p>
          <p className="text-gray-400 text-sm mb-4">
            We'll analyze your listening history and recommend songs you haven't heard yet
          </p>
          <Button
            onClick={handleSpotifyConnect}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Connect Spotify
          </Button>
        </div>
      ) : (
        <div
          id="music-carousel"
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{ scrollBehavior: "smooth" }}
        >
          {recommendations.length === 0 ? (
            <div className="w-full text-center py-8 text-gray-400">
              {isLoading ? "Loading recommendations..." : "Click Refresh to get recommendations"}
            </div>
          ) : (
            recommendations.slice(0, 20).map((track) => (
              <div
                key={track.spotifyTrackId}
                onClick={() => window.open(`https://open.spotify.com/track/${track.spotifyTrackId}`, "_blank")}
                className="flex-shrink-0 w-48 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 cursor-pointer hover:border-purple-500/50 transition-all hover:shadow-lg"
              >
                <div className="h-32 bg-gradient-to-br from-purple-600 to-pink-600 rounded-md mb-3" />
                <p className="text-sm font-medium text-white truncate">{track.trackName}</p>
                <p className="text-xs text-gray-400 truncate">{track.artistName}</p>
                <p className="text-xs text-gray-500 mt-1">Popularity: {track.popularity}%</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackPreference.mutate({ trackId: track.spotifyTrackId, preference: "like" });
                    }}
                    className="text-xs flex-1"
                  >
                    👍
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackPreference.mutate({ trackId: track.spotifyTrackId, preference: "dislike" });
                    }}
                    className="text-xs flex-1"
                  >
                    👎
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * News Feed
 */
function NewsFeed() {
  const [selectedCategory, setSelectedCategory] = useState<"school" | "state" | "world">("world");

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-blue-400" />
          News Feed
        </h2>
        <div className="flex gap-2">
          {(["school", "state", "world"] as const).map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
            <p className="text-sm font-medium text-white">Sample News Article {i}</p>
            <p className="text-xs text-gray-400 mt-2">
              This is a placeholder news article. Connect to real news sources to see actual headlines.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stocks Overview
 */
function StocksOverview() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-400" />
          Market Overview
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { symbol: "AAPL", name: "Apple", price: "$150.25", change: "+2.5%" },
          { symbol: "GOOGL", name: "Google", price: "$140.80", change: "+1.2%" },
          { symbol: "MSFT", name: "Microsoft", price: "$380.50", change: "+3.1%" },
        ].map((stock) => (
          <div key={stock.symbol} className="rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4">
            <p className="text-sm font-medium text-white">{stock.symbol}</p>
            <p className="text-xs text-gray-400">{stock.name}</p>
            <p className="text-lg font-semibold text-white mt-2">{stock.price}</p>
            <p className="text-xs text-green-400 mt-1">{stock.change}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main AI Overview Page
 */
export default function AIOverview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Welcome back, Mason</h1>
          <p className="text-gray-400 mt-2">Your personalized daily overview</p>
        </div>

        {/* Weather & Calendar */}
        <WeatherCalendarWidget />

        {/* Search */}
        <SearchBar />

        {/* Music Carousel */}
        <MusicCarousel />

        {/* News Feed */}
        <NewsFeed />

        {/* Stocks */}
        <StocksOverview />
      </div>
    </div>
  );
}
