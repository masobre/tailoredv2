import { useState } from "react";
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
 * Music Carousel
 */
function MusicCarousel() {
  const { data: recommendations, isLoading } = trpc.music.getRecommendations.useQuery();
  const [scrollPos, setScrollPos] = useState(0);
  const trackPreference = trpc.music.trackPreference.useMutation();

  if (isLoading) return <Skeleton className="h-40 rounded-lg" />;

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
        </div>
      </div>

      <div
        id="music-carousel"
        className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
        style={{ scrollBehavior: "smooth" }}
      >
        {recommendations?.slice(0, 10).map((track) => (
          <div
            key={track.id}
            onClick={() => window.open(`https://open.spotify.com/track/${track.spotifyTrackId}`, "_blank")}
            className="flex-shrink-0 w-48 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 cursor-pointer hover:border-purple-500/50 transition-all hover:shadow-lg"
          >
            <div className="h-32 bg-gradient-to-br from-purple-600 to-pink-600 rounded-md mb-3" />
            <p className="text-sm font-medium text-white truncate">{track.trackName}</p>
            <p className="text-xs text-gray-400 truncate">{track.artistName}</p>
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
        ))}
      </div>
    </div>
  );
}

/**
 * News Feed
 */
function NewsFeed() {
  const [category, setCategory] = useState<"school" | "state" | "world">("world");
  const { data: news, isLoading } = trpc.news.getByCategory.useQuery({ category, limit: 10 });
  const trackPreference = trpc.news.trackPreference.useMutation();

  if (isLoading) return <Skeleton className="h-64 rounded-lg" />;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-orange-400" />
          News
        </h2>
        <div className="flex gap-2">
          {(["school", "state", "world"] as const).map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? "default" : "outline"}
              onClick={() => setCategory(cat)}
              className="text-xs capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {news?.slice(0, 6).map((article) => (
          <div
            key={article.id}
            className="rounded-lg border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-yellow-500/5 p-4 hover:border-orange-500/50 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-white">{article.title}</p>
                <p className="text-sm text-gray-400 mt-1">{article.source}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => trackPreference.mutate({ articleId: article.id, preference: "like" })}
                  className="text-xs"
                >
                  👍
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => trackPreference.mutate({ articleId: article.id, preference: "dislike" })}
                  className="text-xs"
                >
                  👎
                </Button>
              </div>
            </div>
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
  const { data: stocks, isLoading } = trpc.stocks.getTrending.useQuery();

  if (isLoading) return <Skeleton className="h-40 rounded-lg" />;

  return (
    <div className="mb-24">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-green-400" />
        Market Overview
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stocks?.slice(0, 4).map((stock) => (
          <div
            key={stock.id}
            className="rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4"
          >
            <p className="font-semibold text-white">{stock.symbol}</p>
            <p className="text-2xl font-bold text-white mt-2">${stock.price}</p>
            <p className={`text-sm mt-2 ${stock.changePercent > 0 ? "text-green-400" : "text-red-400"}`}>
              {stock.changePercent > 0 ? "+" : ""}{stock.changePercent}%
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-white">Market Summary:</span> Tech stocks are leading gains today with strong earnings reports from major companies.
        </p>
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
