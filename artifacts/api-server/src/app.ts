import express, { type Express, static as expressStatic } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "employee-lookup", awake: true });
});

app.head("/api/health", (_req, res) => {
  res.status(200).end();
});

app.use("/api", router);

// Serve static frontend files.
const frontendDistPath = path.resolve(__dirname, "../../employee-finder/dist/public");
logger.info({ frontendDistPath }, "Serving static files from");

app.use(expressStatic(frontendDistPath));

// SPA fallback for browser routes.
// Express 5 no longer accepts the old `/:path*` catch-all pattern reliably, so
// use middleware instead. Keep API requests out of the fallback so missing API
// routes return a real 404 instead of index.html.
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    next();
    return;
  }

  res.sendFile(path.join(frontendDistPath, "index.html"), (err) => {
    if (err) {
      logger.error({ err, path: req.path }, "Error sending index.html");
      res.status(404).send("Not Found");
    }
  });
});

export default app;
