import { Router } from "express";
import mongoose from "mongoose";
import { Todo } from "../models/Todo.js";
import { StudySession } from "../models/StudySession.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { recordMeaningfulActivity } from "../services/gamification.js";
import { generateBurnoutSessionTip } from "../services/burnoutTip.js";

export const sessionsRouter = Router();
sessionsRouter.use(authMiddleware);

const DAY_MS = 86400000;

sessionsRouter.get("/active", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const since = new Date(Date.now() - DAY_MS);
    const doc = await StudySession.findOne({
      user_id: userId,
      outcome: "pending",
      started_at: { $gte: since },
    }).sort({ started_at: -1 });
    if (!doc) {
      res.json({ session: null });
      return;
    }
    res.json({
      session: {
        id: String(doc._id),
        started_at: doc.started_at.toISOString(),
        todo_ids: doc.todo_ids,
        outcome: doc.outcome,
        session_mood: doc.session_mood ?? null,
        pauses: doc.pauses ?? [],
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});

sessionsRouter.post("/start", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const todoIds = Array.isArray(req.body?.todoIds)
      ? (req.body.todoIds as unknown[]).map((x) => String(x))
      : [];

    const rawMood = req.body?.mood;
    const session_mood =
      rawMood === "tired" || rawMood === "normal" || rawMood === "motivated"
        ? rawMood
        : undefined;

    const doc = await StudySession.create({
      user_id: userId,
      started_at: new Date(),
      ended_at: null,
      todo_ids: todoIds,
      outcome: "pending",
      ...(session_mood ? { session_mood } : {}),
    });

    res.status(201).json({
      session: {
        id: String(doc._id),
        started_at: doc.started_at.toISOString(),
        todo_ids: doc.todo_ids,
        outcome: doc.outcome,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to start session" });
  }
});

sessionsRouter.post("/:id/pause", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const doc = await StudySession.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId, outcome: "pending" },
      { $push: { pauses: { started_at: new Date(), ended_at: null } } },
      { new: true }
    );
    if (!doc) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to pause session" });
  }
});

sessionsRouter.post("/:id/resume", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const doc = await StudySession.findOne({ 
      _id: req.params.id, 
      user_id: req.userId, 
      outcome: "pending" 
    });
    if (!doc) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (doc.pauses && doc.pauses.length > 0) {
      const lastPause = doc.pauses[doc.pauses.length - 1];
      if (!lastPause.ended_at) {
        lastPause.ended_at = new Date();
        await doc.save();
      }
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to resume session" });
  }
});
sessionsRouter.patch("/:id/end", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const outcome = req.body?.outcome;
    if (
      outcome !== "completed" &&
      outcome !== "skipped" &&
      outcome !== "abandoned"
    ) {
      res.status(400).json({ error: "outcome required" });
      return;
    }

    const doc = await StudySession.findOneAndUpdate(
      { _id: id, user_id: userId },
      { $set: { ended_at: new Date(), outcome } },
      { new: true }
    );

    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    let reward = undefined;

    if (outcome === "completed") {
      reward = await recordMeaningfulActivity(userId, 10);
    }

    res.json({
      session: {
        id: String(doc._id),
        started_at: doc.started_at.toISOString(),
        ended_at: doc.ended_at?.toISOString() ?? null,
        outcome: doc.outcome,
      },
      reward,
      burnoutTip: null,
    });

    if (outcome === "completed") {
      const sessionDoc = doc;
      void (async () => {
        try {
          const minutes = Math.max(
            1,
            Math.round(
              (sessionDoc.ended_at!.getTime() - sessionDoc.started_at.getTime()) /
                60000
            )
          );
          const profile = await UserProfileModel.findOne({ user_id: userId });
          const today = new Date().toISOString().slice(0, 10);
          const bd = await BurnoutDaily.findOne({ user_id: userId, date: today });
          let taskTitle = "General focus";
          let subject = "Study";
          if (sessionDoc.todo_ids?.length) {
            const td = await Todo.findOne({
              _id: sessionDoc.todo_ids[0],
              user_id: userId,
            });
            if (td) {
              taskTitle = td.task_title;
              subject = td.subject;
            }
          }
          const tip = await generateBurnoutSessionTip({
            taskTitle,
            subject,
            minutes,
            burnoutLevel: profile?.burnoutLevel ?? "medium",
            burnoutScore: bd?.score,
            apiKey: process.env.GEMINI_API_KEY,
          });
          if (tip && profile) {
            profile.lastBurnoutTip = tip;
            await profile.save();
          }
        } catch (e) {
          console.error(e);
        }
      })();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to end session" });
  }
});
