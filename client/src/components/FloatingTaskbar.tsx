import { useLocation } from "wouter";
import { Cloud, Music, Newspaper, TrendingUp, Brain, Settings, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const taskbarItems = [
  { icon: Home, label: "Overview", path: "/" },
  { icon: Cloud, label: "Weather", path: "/weather" },
  { icon: Music, label: "Music", path: "/music" },
  { icon: Newspaper, label: "News", path: "/news" },
  { icon: TrendingUp, label: "Stocks", path: "/stocks" },
  { icon: Brain, label: "AI Overview", path: "/ai" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function FloatingTaskbar() {
  const [location, setLocation] = useLocation();

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-blue-500/20 rounded-full px-4 py-3 shadow-2xl">
        {taskbarItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => setLocation(item.path)}
                  className={`rounded-full h-10 w-10 transition-all ${
                    isActive
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "hover:bg-slate-800 text-gray-400 hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-800 border-slate-700">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
