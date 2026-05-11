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

app.use("/api", router);

// Serve static frontend files
const frontendDistPath = path.join(__dirname, "..", "..", "employee-finder", "dist", "public");
app.use(expressStatic(frontendDistPath));

// Catch-all to serve index.html for SPA routing
app.get("/*", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

export default app;
