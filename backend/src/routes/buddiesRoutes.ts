import { Router } from "express";
import { UserProfileModel, type SubjectMastery } from "../models/UserProfileDoc.js";
import { UserConnection } from "../models/UserConnection.js";
import { ChatMessage, conversationId } from "../models/ChatMessage.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const buddiesRouter = Router();
buddiesRouter.use(authMiddleware);

export type BuddyRecommendation = {
  userId: string;
  matchScore: number;
  matchReason: string;
  theyCanHelpYouWith: string[];
  youCanHelpThemWith: string[];
};

buddiesRouter.get("/recommend", async (req, res) => {
  try {
    const userId = req.userId!;
    const myProfile = await UserProfileModel.findOne({ user_id: userId }).lean();

    if (!myProfile || !myProfile.isLookingForBuddy) {
      res.status(403).json({ error: "You must opt into Buddy Search from your Profile page first." });
      return;
    }

    const mySubjects = new Map<string, number>();
    (myProfile.subjectMastery || []).forEach((m: SubjectMastery) => mySubjects.set(m.subject, m.currentLevel));

    // Exclude already connected/pending users
    const existingConnections = await UserConnection.find({
      $or: [{ requester_id: userId }, { recipient_id: userId }]
    }).lean();
    
    const excludedIds = new Set(existingConnections.map(c => 
      c.requester_id === userId ? c.recipient_id : c.requester_id
    ));
    excludedIds.add(userId);

    const candidates = await UserProfileModel.find({
      isLookingForBuddy: true,
      user_id: { $nin: Array.from(excludedIds) }
    }).lean();

    const recommendations: BuddyRecommendation[] = [];

    for (const c of candidates) {
      let score = 0;
      const theyCanHelpYouWith: string[] = [];
      const youCanHelpThemWith: string[] = [];

      const theirSubjects = new Map<string, number>();
      (c.subjectMastery || []).forEach((m: SubjectMastery) => theirSubjects.set(m.subject, m.currentLevel));

      for (const [subject, theirLevel] of theirSubjects.entries()) {
        const myLevel = mySubjects.get(subject) || 0;
        if (theirLevel >= myLevel + 2 && theirLevel >= 3) {
          score += (theirLevel - myLevel) * 5;
          theyCanHelpYouWith.push(subject);
        }
      }

      for (const [subject, myLevel] of mySubjects.entries()) {
        const theirLevel = theirSubjects.get(subject) || 0;
        if (myLevel >= theirLevel + 2 && myLevel >= 3) {
          score += (myLevel - theirLevel) * 5;
          youCanHelpThemWith.push(subject);
        }
      }

      if (theyCanHelpYouWith.length > 0 && youCanHelpThemWith.length > 0) {
        score = Math.round(score * 1.5);
      }

      for (const subject of mySubjects.keys()) {
        if (theirSubjects.has(subject)) score += 2;
      }

      let matchReason = "";
      if (theyCanHelpYouWith.length > 0 && youCanHelpThemWith.length > 0) {
        matchReason = `Perfect synergy! They excel at ${theyCanHelpYouWith[0]} while you rock at ${youCanHelpThemWith[0]}.`;
      } else if (theyCanHelpYouWith.length > 0) {
        matchReason = `Great mentor for ${theyCanHelpYouWith[0]}.`;
      } else if (youCanHelpThemWith.length > 0) {
        matchReason = `They could really use your help with ${youCanHelpThemWith[0]}.`;
      } else if (score > 0) {
        matchReason = `You both study similar subjects.`;
      }

      if (score > 0) {
        recommendations.push({
          userId: c.user_id,
          matchScore: score,
          matchReason,
          theyCanHelpYouWith,
          youCanHelpThemWith
        });
      }
    }

    recommendations.sort((a, b) => b.matchScore - a.matchScore);
    res.json({ recommendations: recommendations.slice(0, 20) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch buddy recommendations" });
  }
});

// Search by full user_id
buddiesRouter.get("/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json({ results: [] });
    
    // For MVP, unique code is user_id
    const user = await UserProfileModel.findOne({ user_id: q }).lean();
    if (!user) return res.json({ results: [] });
    
    res.json({
      results: [{
        userId: user.user_id,
        companionType: user.companion_type,
        streak: user.study_streak
      }]
    });
  } catch (e) {
    res.status(500).json({ error: "Search failed" });
  }
});

buddiesRouter.post("/request/:targetId", async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.userId!;
    
    if (userId === targetId) return res.status(400).json({ error: "Cannot add yourself" });

    const existing = await UserConnection.findOne({
      $or: [
        { requester_id: userId, recipient_id: targetId },
        { requester_id: targetId, recipient_id: userId }
      ]
    });

    if (existing) {
      if (existing.status === 'pending' && existing.recipient_id === userId) {
        // Auto accept if they already requested you
        existing.status = 'accepted';
        await existing.save();
        return res.json({ status: "accepted" });
      }
      return res.status(400).json({ error: "Connection already exists or is pending" });
    }

    await UserConnection.create({
      requester_id: userId,
      recipient_id: targetId,
      status: "pending"
    });

    res.json({ status: "pending" });
  } catch (e) {
    res.status(500).json({ error: "Failed to send request" });
  }
});

buddiesRouter.post("/accept/:targetId", async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.userId!;
    
    const existing = await UserConnection.findOneAndUpdate(
      { requester_id: targetId, recipient_id: userId, status: "pending" },
      { $set: { status: "accepted" } },
      { new: true }
    );
    
    if (!existing) return res.status(404).json({ error: "Request not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to accept" });
  }
});

buddiesRouter.get("/connections", async (req, res) => {
  try {
    const userId = req.userId!;
    
    const connections = await UserConnection.find({
      $or: [{ requester_id: userId }, { recipient_id: userId }]
    }).lean();

    const result = connections.map(c => {
      const isRequester = c.requester_id === userId;
      return {
        id: c._id,
        buddyId: isRequester ? c.recipient_id : c.requester_id,
        status: c.status,
        isIncomingRequest: !isRequester && c.status === 'pending'
      }
    });

    res.json({ connections: result });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

// ── Chat (MongoDB-backed) ──────────────────────────────────

/** GET /api/buddies/chat/:buddyId — fetch last 100 messages */
buddiesRouter.get("/chat/:buddyId", async (req, res) => {
  try {
    const userId = req.userId!;
    const { buddyId } = req.params;

    // Verify they are connected
    const conn = await UserConnection.findOne({
      $or: [
        { requester_id: userId, recipient_id: buddyId, status: "accepted" },
        { requester_id: buddyId, recipient_id: userId, status: "accepted" },
      ],
    }).lean();
    if (!conn) {
      res.status(403).json({ error: "Not connected to this user" });
      return;
    }

    const cid = conversationId(userId, buddyId);
    const messages = await ChatMessage.find({ conversation_id: cid })
      .sort({ created_at: 1 })
      .limit(100)
      .lean();

    res.json({ messages });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/** POST /api/buddies/chat/:buddyId — send a message */
buddiesRouter.post("/chat/:buddyId", async (req, res) => {
  try {
    const userId = req.userId!;
    const { buddyId } = req.params;
    const { text } = req.body as { text: string };

    if (!text?.trim()) {
      res.status(400).json({ error: "Message cannot be empty" });
      return;
    }

    const conn = await UserConnection.findOne({
      $or: [
        { requester_id: userId, recipient_id: buddyId, status: "accepted" },
        { requester_id: buddyId, recipient_id: userId, status: "accepted" },
      ],
    }).lean();
    if (!conn) {
      res.status(403).json({ error: "Not connected to this user" });
      return;
    }

    const msg = await ChatMessage.create({
      conversation_id: conversationId(userId, buddyId),
      sender_id: userId,
      recipient_id: buddyId,
      text: text.trim(),
    });

    res.json({ message: msg });
  } catch (e) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

