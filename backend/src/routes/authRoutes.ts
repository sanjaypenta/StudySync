import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";
import { UserStats } from "../models/UserStats.js";
import { authMiddleware, signUserToken } from "../middleware/authMiddleware.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const displayName = String(req.body?.displayName ?? "").trim();
    if (!email || !password || password.length < 8) {
      res.status(400).json({ error: "Valid email and password (8+ chars) required" });
      return;
    }
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, displayName });
    const uid = String(user._id);
    await UserProfileModel.create({ user_id: uid, onboardingComplete: false });
    await UserStats.create({ user_id: uid });
    const token = signUserToken(uid, email);
    res.status(201).json({
      token,
      user: { id: uid, email, displayName: displayName || "" },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const uid = String(user._id);
    const token = signUserToken(uid, email);
    res.json({
      token,
      user: {
        id: uid,
        email: user.email,
        displayName: user.displayName ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      user: {
        id: String(user._id),
        email: user.email,
        displayName: user.displayName ?? "",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});

authRouter.post("/forgot-password", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const newPassword = String(req.body?.newPassword ?? "");

    if (!email || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: "Valid email and password (8+ chars) required" });
      return;
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      // Security: we shouldn't necessarily expose if an email isn't registered,
      // but for this direct reset flow, returning a generic success is safer, 
      // or we can just say "If the account exists, the password was updated."
      res.json({ message: "If an account with that email exists, its password has been updated." });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    // Clear out any old tokens just in case
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "If an account with that email exists, its password has been updated." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to process password reset" });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.json({ ok: true });
});
