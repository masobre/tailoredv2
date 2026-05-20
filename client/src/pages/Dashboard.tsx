import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CloudRain, TrendingUp, Mail, Music, Newspaper, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/**
 * Weather Widget
 */
function WeatherWidget() {
  const { data: dailyData, isLoading } = trpc.dashboard.getDailyData.useQuery();

  if (isLoading) return <Skeleton className="h-48 rounded-lg" />;

  const weather = dailyData?.weather;
  if (!weather) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
        <AlertCircle className="mb-2 h-4 w-4" />
        <p className="text-sm">Weather data unavailable</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{weather.location}</p>
          <p className="text-4xl font-bold text-white">{weather.current?.temperature_2m}°</p>
          <p className="mt-2 text-sm text-gray-300">Humidity: {weather.current?.relative_humidity_2m}%</p>
        </div>
        <CloudRain className="h-12 w-12 text-blue-400" />
      </div>
    </div>
  );
}

/**
 * Stock Market Widget
 */
function StockWidget() {
  const { data: stocks, isLoading } = trpc.stocks.getTrending.useQuery();

  if (isLoading) return <Skeleton className="h-48 rounded-lg" />;

  return (
    <div className="rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-400" />
        <h3 className="font-semibold text-white">Trending Stocks</h3>
      </div>
      <div className="space-y-3">
        {stocks?.slice(0, 3).map((stock) => (
          <div key={stock.id} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-200">{stock.symbol}</span>
            <div className="text-right">
              <p className="text-sm text-white">${stock.price}</p>
              <p className={`text-xs ${stock.changePercent > 0 ? "text-green-400" : "text-red-400"}`}>
                {stock.changePercent > 0 ? "+" : ""}{stock.changePercent}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Music Recommendations Widget
 */
function MusicWidget() {
  const { data: recommendations, isLoading } = trpc.music.getRecommendations.useQuery();
  const trackPreference = trpc.music.trackPreference.useMutation();

  if (isLoading) return <Skeleton className="h-48 rounded-lg" />;

  return (
    <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Music className="h-5 w-5 text-purple-400" />
        <h3 className="font-semibold text-white">Recommended Music</h3>
      </div>
      <div className="space-y-3">
        {recommendations?.slice(0, 3).map((track) => (
          <div key={track.id} className="flex items-center justify-between rounded bg-white/5 p-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200">{track.trackName}</p>
              <p className="text-xs text-gray-400">{track.artistName}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => trackPreference.mutate({ trackId: track.spotifyTrackId, preference: "like" })}
                className="text-xs"
              >
                👍
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => trackPreference.mutate({ trackId: track.spotifyTrackId, preference: "dislike" })}
                className="text-xs"
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
 * News Feed Widget
 */
function NewsWidget() {
  const [category, setCategory] = useState<"school" | "state" | "world">("world");
  const { data: news, isLoading } = trpc.news.getByCategory.useQuery({ category, limit: 5 });
  const trackPreference = trpc.news.trackPreference.useMutation();

  if (isLoading) return <Skeleton className="h-48 rounded-lg" />;

  return (
    <div className="rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-orange-400" />
          <h3 className="font-semibold text-white">News</h3>
        </div>
        <div className="flex gap-2">
          {(["school", "state", "world"] as const).map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? "default" : "outline"}
              onClick={() => setCategory(cat)}
              className="text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {news?.slice(0, 3).map((article) => (
          <div key={article.id} className="rounded bg-white/5 p-2">
            <p className="text-sm font-medium text-gray-200">{article.title}</p>
            <p className="mt-1 text-xs text-gray-400">{article.source}</p>
            <div className="mt-2 flex gap-2">
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
        ))}
      </div>
    </div>
  );
}

/**
 * Email Summary Widget
 */
function EmailWidget() {
  const { data: emails, isLoading } = trpc.email.getSummaries.useQuery();

  if (isLoading) return <Skeleton className="h-48 rounded-lg" />;

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-5 w-5 text-indigo-400" />
        <h3 className="font-semibold text-white">Email Summary</h3>
      </div>
      <div className="space-y-3">
        {emails?.slice(0, 3).map((email) => (
          <div key={email.id} className="rounded bg-white/5 p-2">
            <p className="text-xs font-medium text-gray-300">{email.fromAddress}</p>
            <p className="mt-1 text-xs text-gray-200">{email.subject}</p>
            <p className="mt-2 text-xs text-gray-400">{email.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Dashboard Page
 */
export default function Dashboard() {
  const { user, loading } = useAuth();
  const refreshData = trpc.dashboard.refreshData.useMutation();

  if (loading) return <DashboardLayout><Skeleton className="h-96" /></DashboardLayout>;

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, {user.name}</h1>
            <p className="mt-1 text-gray-400">Your personalized daily dashboard</p>
          </div>
          <Button onClick={() => refreshData.mutate()} disabled={refreshData.isPending}>
            {refreshData.isPending ? "Refreshing..." : "Refresh Now"}
          </Button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeatherWidget />
          <StockWidget />
          <MusicWidget />
          <NewsWidget />
          <EmailWidget />
        </div>
      </div>
    </DashboardLayout>
  );
}
