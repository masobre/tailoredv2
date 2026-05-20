import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";
import { getDailyCache, saveDailyCache, getUserById } from "../db";
import { fetchWeatherData, fetchTrendingStocks, fetchNewsArticles, fetchAndSummarizeEmails } from "../services";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Spotify OAuth callback handler
  app.get("/api/spotify/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Missing authorization code" });
      }

      // Send success message back to parent window
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Spotify Authorization</title></head>
          <body>
            <script>
              window.opener.postMessage({
                type: 'SPOTIFY_AUTH_SUCCESS',
                code: '${code}',
                state: '${state}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `;
      res.send(html);
    } catch (error) {
      console.error("[Spotify Callback] Error:", error);
      res.status(500).json({ error: "Authorization failed" });
    }
  });

  // Daily refresh scheduled endpoint
  app.post("/api/scheduled/dailyRefresh", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      const dbUser = await getUserById(user.id);
      if (!dbUser) {
        return res.json({ ok: true, skipped: "user-not-found" });
      }

      const today = new Date().toISOString().split("T")[0];

      // Fetch fresh data from all services
      const weatherData = await fetchWeatherData(dbUser.location || "New York", dbUser.timezone || "UTC");
      const stockData = await fetchTrendingStocks();
      const newsHeadlines = await fetchNewsArticles("world");
      const emailSummaries = await fetchAndSummarizeEmails(user.id, dbUser.spotifyAccessToken || undefined);

      // Cache the data
      await saveDailyCache(
        user.id,
        today,
        weatherData || {},
        stockData || {},
        newsHeadlines || {},
        { summaries: emailSummaries }
      );

      res.json({ ok: true, cached: true });
    } catch (error) {
      console.error("[DailyRefresh] Error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        context: { url: req.url, taskUid: (await sdk.authenticateRequest(req)).taskUid },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
