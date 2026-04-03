import { Router } from "express";
import mongoose from "mongoose";
import { Todo, type ITodo } from "../models/Todo.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { recordMeaningfulActivity } from "../services/gamification.js";
import { applyDailyPrioritization } from "../services/dailyPrioritize.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { runAutoRescue } from "../services/autoRescue.js";

export const todosRouter = Router();
todosRouter.use(authMiddleware);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

todosRouter.post("/rescue", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const rawH = req.body?.horizonDays;
    const horizonDays =
      typeof rawH === "number" && Number.isFinite(rawH)
        ? rawH
        : 14;
    const result = await runAutoRescue(userId, horizonDays);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Rescue failed" });
  }
});

todosRouter.post("/prioritize", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const { from, to } = req.body ?? {};
    if (typeof from !== "string" || typeof to !== "string" || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      res.status(400).json({ error: "from and to (YYYY-MM-DD) required" });
      return;
    }
    const todos = await Todo.find({
      user_id: userId,
      date: { $gte: from, $lte: to },
    }).sort({ date: 1, sort_order: 1 });

    const today = new Date().toISOString().slice(0, 10);
    const y = new Date(today + "T12:00:00Z");
    y.setUTCDate(y.getUTCDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    const prev = await BurnoutDaily.findOne({
      user_id: userId,
      date: yStr,
    });
    let maxPerDay = 6;
    if (prev?.state === "red") maxPerDay = 2;
    else if (prev?.state === "yellow") maxPerDay = 4;

    applyDailyPrioritization(todos, { maxPerDay });
    await Promise.all(todos.map((t) => t.save()));
    res.json({ todos: serializeTodos(todos) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Prioritize failed" });
  }
});

todosRouter.post("/rebalance", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const { date, orderedIds } = req.body ?? {};
    if (typeof date !== "string" || !DATE_RE.test(date)) {
      res.status(400).json({ error: "date (YYYY-MM-DD) required" });
      return;
    }
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      res.status(400).json({ error: "orderedIds required" });
      return;
    }
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid orderedIds" });
        return;
      }
      await Todo.updateOne(
        { _id: id, user_id: userId, date },
        { $set: { sort_order: i } }
      );
    }
    const list = await Todo.find({ user_id: userId, date }).sort({
      sort_order: 1,
    });
    res.json({ todos: serializeTodos(list) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Rebalance failed" });
  }
});

todosRouter.post("/bulk", async (req, res) => {
  try {
    const { todos } = req.body ?? {};
    if (!Array.isArray(todos) || todos.length === 0) {
      res.status(400).json({ error: "todos array required" });
      return;
    }

    const userId = req.userId!;
    const docs = todos.map((t: Record<string, unknown>) => ({
      user_id: userId,
      task_title: String(t.task_title ?? ""),
      subject: String(t.subject ?? ""),
      date: String(t.date ?? ""),
      hours: Number(t.hours),
      status: "pending" as const,
      priority_tag: "suggested" as const,
      sort_order: 0,
      slot_start: "",
      slot_end: "",
    }));

    for (const d of docs) {
      if (!d.task_title || !d.date || !Number.isFinite(d.hours)) {
        res.status(400).json({ error: "Invalid todo item" });
        return;
      }
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        error:
          "Database not connected. Start MongoDB and set MONGO_URI or MONGODB_URI in backend/.env (e.g. mongodb://127.0.0.1:27017/studysync).",
      });
      return;
    }

    const created = await Todo.insertMany(docs);
    res.status(201).json({
      todos: serializeTodos(created as ITodo[]),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Bulk create failed" });
  }
});

todosRouter.get("/", async (req, res) => {
  try {
    const userId = req.userId!;
    const { from, to, date } = req.query;

    if (typeof date === "string" && DATE_RE.test(date)) {
      const list = await Todo.find({ user_id: userId, date }).sort({
        sort_order: 1,
        hours: -1,
      });
      res.json({ todos: serializeTodos(list) });
      return;
    }

    if (
      typeof from === "string" &&
      typeof to === "string" &&
      DATE_RE.test(from) &&
      DATE_RE.test(to)
    ) {
      const list = await Todo.find({
        user_id: userId,
        date: { $gte: from, $lte: to },
      }).sort({ date: 1, sort_order: 1 });
      res.json({ todos: serializeTodos(list) });
      return;
    }

    res.status(400).json({ error: "Provide date=YYYY-MM-DD or from&to" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "List failed" });
  }
});

function serializeTodos(list: ITodo[]): Array<{
  id: string;
  user_id: string;
  task_title: string;
  subject: string;
  date: string;
  hours: number;
  status: string;
  priority_tag: string;
  sort_order: number;
  slot_start: string;
  slot_end: string;
}> {
  return list.map((c) => ({
    id: String(c._id),
    user_id: c.user_id,
    task_title: c.task_title,
    subject: c.subject,
    date: c.date,
    hours: c.hours,
    status: c.status,
    priority_tag: c.priority_tag ?? "suggested",
    sort_order: c.sort_order ?? 0,
    slot_start: c.slot_start ?? "",
    slot_end: c.slot_end ?? "",
    is_boss: c.is_boss ?? false,
    boss_hp: c.boss_hp ?? 0,
    current_hp: c.current_hp ?? 0,
  }));
}

todosRouter.patch("/:id", async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const updates: Record<string, unknown> = {};
    const {
      hours,
      date,
      subject,
      task_title,
      status,
      priority_tag,
      sort_order,
      slot_start,
      slot_end,
      is_boss,
      boss_hp,
      current_hp,
    } = req.body ?? {};

    if (hours !== undefined) {
      if (typeof hours !== "number" || !Number.isFinite(hours)) {
        res.status(400).json({ error: "Invalid hours" });
        return;
      }
      updates.hours = hours;
    }
    if (date !== undefined) {
      if (typeof date !== "string" || !DATE_RE.test(date)) {
        res.status(400).json({ error: "Invalid date" });
        return;
      }
      updates.date = date;
    }
    if (subject !== undefined) {
      if (typeof subject !== "string") {
        res.status(400).json({ error: "Invalid subject" });
        return;
      }
      updates.subject = subject;
    }
    if (task_title !== undefined) {
      if (typeof task_title !== "string") {
        res.status(400).json({ error: "Invalid task_title" });
        return;
      }
      updates.task_title = task_title;
    }
    if (status !== undefined) {
      if (
        status !== "pending" &&
        status !== "completed" &&
        status !== "skipped"
      ) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      updates.status = status;
    }
    if (priority_tag !== undefined) {
      if (
        priority_tag !== "must_do" &&
        priority_tag !== "suggested" &&
        priority_tag !== "flexible"
      ) {
        res.status(400).json({ error: "Invalid priority_tag" });
        return;
      }
      updates.priority_tag = priority_tag;
    }
    if (sort_order !== undefined) {
      if (typeof sort_order !== "number" || !Number.isFinite(sort_order)) {
        res.status(400).json({ error: "Invalid sort_order" });
        return;
      }
      updates.sort_order = sort_order;
    }
    if (slot_start !== undefined) {
      if (typeof slot_start !== "string") {
        res.status(400).json({ error: "Invalid slot_start" });
        return;
      }
      updates.slot_start = slot_start;
    }
    if (slot_end !== undefined) {
      if (typeof slot_end !== "string") {
        res.status(400).json({ error: "Invalid slot_end" });
        return;
      }
      updates.slot_end = slot_end;
    }
    if (is_boss !== undefined) {
      updates.is_boss = Boolean(is_boss);
    }
    if (boss_hp !== undefined) {
      if (typeof boss_hp !== "number" || !Number.isFinite(boss_hp)) {
        res.status(400).json({ error: "Invalid boss_hp" });
        return;
      }
      updates.boss_hp = boss_hp;
    }
    if (current_hp !== undefined) {
      if (typeof current_hp !== "number" || !Number.isFinite(current_hp)) {
        res.status(400).json({ error: "Invalid current_hp" });
        return;
      }
      updates.current_hp = current_hp;
    }


    const prev = await Todo.findOne({ _id: id, user_id: userId });
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No updates" });
      return;
    }

    const doc = await Todo.findOneAndUpdate(
      { _id: id, user_id: userId },
      { $set: updates },
      { new: true }
    );

    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    let reward = undefined;
    if (
      prev &&
      prev.status !== "completed" &&
      doc.status === "completed"
    ) {
      reward = await recordMeaningfulActivity(userId, 5);
    }

    res.json({
      todo: serializeTodos([doc])[0],
      reward,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Update failed" });
  }
});

todosRouter.delete("/:id", async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const result = await Todo.deleteOne({ _id: id, user_id: userId });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Delete failed" });
  }
});
