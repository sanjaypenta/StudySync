import { randomBytes } from "crypto";
import type {
  FeedbackPayload,
  LeaderboardRow,
  MCQ,
  StudyUser,
} from "./types.js";
import { StudyRoomModel } from "../models/StudyRoomDoc.js";

const rooms = new Map<string, RoomState>();

const ROOM_TTL_HOURS = 24;

function computeExpiry(): Date {
  return new Date(Date.now() + ROOM_TTL_HOURS * 60 * 60 * 1000);
}

export interface RoomState {
  roomId: string;
  hostKey: string;
  topic: string;
  fileText: string;
  materialSummary: string;
  questionsCount: number;
  users: Map<string, StudyUser>;
  socketToUserId: Map<string, string>;
  phase: "lobby" | "quiz" | "leaderboard" | "feedback";
  quiz: MCQ[];
  /** Per-user progress: index of current question (0-based). When >= quiz.length, user is done. */
  userQuestionIndex: Map<string, number>;
  userQuestionStartedAt: Map<string, number>;
  userQuestionTimers: Map<string, ReturnType<typeof setTimeout>>;
  questionMs: number;
  /** userId -> questionIndex -> response */
  responses: Record<
    string,
    Record<number, { answer: string; ms: number; submittedAt: number }>
  >;
  leaderboard: LeaderboardRow[];
  feedbackByUserId: Record<string, FeedbackPayload>;
  quizGenerationError?: string;
}

function randomSixDigits(): string {
  const n = 100000 + Math.floor(Math.random() * 900000);
  return String(n);
}

export function generateRoomId(): string {
  let id = randomSixDigits();
  let guard = 0;
  while (rooms.has(id) && guard < 50) {
    id = randomSixDigits();
    guard++;
  }
  return id;
}

export function createHostKey(): string {
  return randomBytes(24).toString("hex");
}

export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

/** Best-effort persistence so invite codes survive backend restarts (dev hot reload). */
export async function persistRoom(room: Pick<
  RoomState,
  "roomId" | "hostKey" | "topic" | "fileText" | "questionsCount"
>): Promise<void> {
  try {
    await StudyRoomModel.updateOne(
      { roomId: room.roomId },
      {
        $set: {
          hostKey: room.hostKey,
          topic: room.topic,
          fileText: room.fileText,
          questionsCount: room.questionsCount,
          expiresAt: computeExpiry(),
        },
      },
      { upsert: true }
    );
  } catch {
    // Ignore persistence failures: the app can still function in-memory.
  }
}

/**
 * Get room from memory; if missing, attempt to rehydrate from Mongo.
 * This prevents "Room not found" after backend restarts.
 */
export async function getOrLoadRoom(roomId: string): Promise<RoomState | undefined> {
  const existing = rooms.get(roomId);
  if (existing) return existing;

  try {
    const doc = await StudyRoomModel.findOne({ roomId }).lean();
    if (!doc) return undefined;
    const state = createRoom({
      roomId: doc.roomId,
      hostKey: doc.hostKey,
      topic: doc.topic ?? "",
      fileText: doc.fileText ?? "",
      questionsCount: doc.questionsCount,
    });
    return state;
  } catch {
    return undefined;
  }
}

export async function deletePersistedRoom(roomId: string): Promise<void> {
  try {
    await StudyRoomModel.deleteOne({ roomId });
  } catch {
    // ignore
  }
}

export function createRoom(params: {
  roomId: string;
  hostKey: string;
  topic: string;
  fileText: string;
  questionsCount: number;
}): RoomState {
  const materialSummary = [params.topic, params.fileText]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12000);
  const state: RoomState = {
    roomId: params.roomId,
    hostKey: params.hostKey,
    topic: params.topic,
    fileText: params.fileText,
    materialSummary,
    questionsCount: params.questionsCount,
    users: new Map(),
    socketToUserId: new Map(),
    phase: "lobby",
    quiz: [],
    userQuestionIndex: new Map(),
    userQuestionStartedAt: new Map(),
    userQuestionTimers: new Map(),
    questionMs: 25000,
    responses: {},
    leaderboard: [],
    feedbackByUserId: {},
  };
  rooms.set(params.roomId, state);
  return state;
}

export function deleteRoom(roomId: string): void {
  const r = rooms.get(roomId);
  if (r) clearAllUserTimers(r);
  rooms.delete(roomId);
}

export function addUser(
  room: RoomState,
  user: StudyUser
): void {
  room.users.set(user.id, user);
  room.socketToUserId.set(user.socketId, user.id);
  if (!room.responses[user.id]) room.responses[user.id] = {};
}

export function removeUserBySocket(room: RoomState, socketId: string): void {
  const uid = room.socketToUserId.get(socketId);
  if (!uid) return;
  const u = room.users.get(uid);
  if (u?.socketId === socketId) {
    room.users.delete(uid);
    room.socketToUserId.delete(socketId);
  }
}

export function getHostSocketId(room: RoomState): string | null {
  for (const u of room.users.values()) {
    if (u.isHost) return u.socketId;
  }
  return null;
}

export function clearUserTimer(room: RoomState, userId: string): void {
  const h = room.userQuestionTimers.get(userId);
  if (h) {
    clearTimeout(h);
    room.userQuestionTimers.delete(userId);
  }
}

export function clearAllUserTimers(room: RoomState): void {
  for (const h of room.userQuestionTimers.values()) {
    clearTimeout(h);
  }
  room.userQuestionTimers.clear();
}
