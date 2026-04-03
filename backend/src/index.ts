import { config as loadEnv } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import cors from "cors";

const backendRoot = dirname(fileURLToPath(import.meta.url));
// Allow real environment variables (e.g., from hosting or CI) to take precedence over backend/.env.
loadEnv({ path: join(backendRoot, "../.env"), override: false });
import express from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { plansRouter } from "./routes/plansRoutes.js";
import { todosRouter } from "./routes/todosRoutes.js";
import { studyRoomsRouter } from "./routes/studyRoomsRoutes.js";
import { profileRouter } from "./routes/profileRoutes.js";
import { sessionsRouter } from "./routes/sessionsRoutes.js";
import { wellbeingRouter } from "./routes/wellbeingRoutes.js";
import { registerStudyRoomSockets } from "./studyRoom/socketHandlers.js";
import { authRouter } from "./routes/authRoutes.js";
import { progressRouter } from "./routes/progressRoutes.js";
import { gamificationRouter } from "./routes/gamificationRoutes.js";
import { studyDnaRouter } from "./routes/studyDnaRoutes.js";
import { burnoutPredictionRouter } from "./routes/burnoutPredictionRoutes.js";

const PORT = Number(process.env.PORT) || 4000;

/** Supports `MONGODB_URI` or `MONGO_URI`; optional `DB_NAME` inserts into Atlas-style `...mongodb.net/?...`. */
function resolveMongoUri(): string {
  const explicit =
    process.env.MONGODB_URI?.trim() || process.env.MONGO_URI?.trim();
  const fallback = "mongodb://127.0.0.1:27017/studysync";
  if (!explicit) return fallback;

  const dbName = process.env.DB_NAME?.trim();
  if (!dbName) return explicit;

  if (/\.mongodb\.net\/[^/?]+(\?|$)/.test(explicit)) {
    return explicit;
  }
  if (/\.mongodb\.net\?/.test(explicit)) {
    return explicit.replace(/\.mongodb\.net\?/, `.mongodb.net/${dbName}?`);
  }
  if (/\.mongodb\.net$/i.test(explicit)) {
    return `${explicit}/${dbName}`;
  }
  return explicit;
}

const MONGODB_URI = resolveMongoUri();

const mongoHostFromUri = MONGODB_URI.match(/@([^/?]+)/)?.[1];
if (mongoHostFromUri) {
  console.log(`MongoDB URI host: ${mongoHostFromUri}`);
}
if (mongoHostFromUri === "cluster.mongodb.net") {
  console.warn(
    "Replace cluster.mongodb.net in your .env with your real Atlas host (e.g. cluster0.xxxxx.mongodb.net) from Atlas -> Connect."
  );
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

function healthPayload() {
  const mongoOk = mongoose.connection.readyState === 1;
  return {
    ok: true,
    mongo: mongoOk ? "connected" : "disconnected",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  };
}

app.get("/health", (_req, res) => {
  res.json(healthPayload());
});

/** Same as /health but under /api so Vite dev proxy forwards it */
app.get("/api/health", (_req, res) => {
  res.json(healthPayload());
});

app.use("/api/plans", plansRouter);
app.use("/api/todos", todosRouter);
app.use("/api/profile", profileRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/wellbeing", wellbeingRouter);
app.use("/api/auth", authRouter);
app.use("/api/progress", progressRouter);
app.use("/api/gamification", gamificationRouter);
app.use("/api/study-dna", studyDnaRouter);
app.use("/api/burnout-prediction", burnoutPredictionRouter);
app.use("/api/study-rooms", studyRoomsRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});
registerStudyRoomSockets(io);

function main() {
  httpServer.listen(PORT, () => {
    console.log(`API http://localhost:${PORT}`);
    console.log(
      `Health (mongo + Gemini key status): http://localhost:${PORT}/health`
    );
  });

  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log("MongoDB connected");
    })
    .catch((e: Error) => {
      console.error(
        "MongoDB connection failed — plan generation still works; fix MONGO_URI or MONGODB_URI in backend/.env for todos:",
        e.message
      );
    });
}

main();
