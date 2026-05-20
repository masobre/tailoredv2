import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Music, Mail, MapPin, Zap } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    location: "",
    timezone: "UTC",
    newsInterests: [] as string[],
    spotifyConnected: false,
    gmailConnected: false,
  });

  const updateProfile = trpc.user.updateProfile.useMutation();
  const connectSpotify = trpc.user.connectSpotify.useMutation();
  const connectGmail = trpc.user.connectGmail.useMutation();

  const handleNewsInterestChange = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      newsInterests: prev.newsInterests.includes(interest)
        ? prev.newsInterests.filter((i) => i !== interest)
        : [...prev.newsInterests, interest],
    }));
  };

  const handleContinue = async () => {
    if (step === 1) {
      await updateProfile.mutateAsync({
        location: formData.location,
        timezone: formData.timezone,
        newsInterests: formData.newsInterests as ["school" | "state" | "world"],
      });
      setStep(2);
    } else if (step === 2) {
      // Redirect to dashboard
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">Welcome to Tailored</h1>
          <p className="mt-2 text-gray-400">Let's personalize your dashboard</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`h-2 w-12 rounded ${step >= 1 ? "bg-blue-500" : "bg-gray-700"}`} />
          <div className={`h-2 w-12 rounded ${step >= 2 ? "bg-blue-500" : "bg-gray-700"}`} />
        </div>

        {/* Step 1: Location & Interests */}
        {step === 1 && (
          <Card className="border-blue-500/20 bg-slate-800/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Your Location & Interests</CardTitle>
              <CardDescription>Help us personalize your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Location */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-200">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <Input
                  placeholder="e.g., New York, USA"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="border-gray-600 bg-slate-900 text-white placeholder-gray-500"
                />
              </div>

              {/* Timezone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full rounded border border-gray-600 bg-slate-900 px-3 py-2 text-white"
                >
                  <option>UTC</option>
                  <option>EST</option>
                  <option>CST</option>
                  <option>MST</option>
                  <option>PST</option>
                </select>
              </div>

              {/* News Interests */}
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-200">News Interests</label>
                <div className="space-y-2">
                  {["school", "state", "world"].map((interest) => (
                    <div key={interest} className="flex items-center gap-2">
                      <Checkbox
                        id={interest}
                        checked={formData.newsInterests.includes(interest)}
                        onCheckedChange={() => handleNewsInterestChange(interest)}
                        className="border-gray-500"
                      />
                      <label htmlFor={interest} className="text-sm text-gray-300 capitalize">
                        {interest} News
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleContinue} className="w-full bg-blue-600 hover:bg-blue-700">
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Integrations */}
        {step === 2 && (
          <Card className="border-purple-500/20 bg-slate-800/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Connect Your Services</CardTitle>
              <CardDescription>Optional: Connect Spotify and Gmail for enhanced features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Spotify */}
              <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                <div className="flex items-center gap-3">
                  <Music className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="font-medium text-white">Spotify</p>
                    <p className="text-xs text-gray-400">Get music recommendations</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => connectSpotify.mutate({ accessToken: "", refreshToken: "" })}
                  disabled={formData.spotifyConnected}
                  className={formData.spotifyConnected ? "bg-gray-600" : "bg-green-600 hover:bg-green-700"}
                >
                  {formData.spotifyConnected ? "Connected" : "Connect"}
                </Button>
              </div>

              {/* Gmail */}
              <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="font-medium text-white">Gmail</p>
                    <p className="text-xs text-gray-400">Get email summaries</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => connectGmail.mutate()}
                  disabled={formData.gmailConnected}
                  className={formData.gmailConnected ? "bg-gray-600" : "bg-red-600 hover:bg-red-700"}
                >
                  {formData.gmailConnected ? "Connected" : "Connect"}
                </Button>
              </div>

              {/* Daily Refresh Setup */}
              <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="font-medium text-white">Daily Refresh</p>
                    <p className="text-xs text-gray-400">7 AM UTC daily</p>
                  </div>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Enable
                </Button>
              </div>

              <Button onClick={handleContinue} className="w-full bg-blue-600 hover:bg-blue-700">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
