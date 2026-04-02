import type { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import {
  addUser,
  clearAllUserTimers,
  clearUserTimer,
  getRoom,
  removeUserBySocket,
  type RoomState,
} from "./roomStore.js";
import { generateQuizMcqs } from "./generateQuiz.js";
import { generateUserFeedback } from "./generateFeedback.js";
import { computeLeaderboard } from "./scoreRoom.js";
import type { StudyUser } from "./types.js";

const QUESTION_MS = 25000;

function emitLobby(io: Server, room: RoomState): void {
  const users = Array.from(room.users.values()).map((u) => ({
    id: u.id,
    displayName: u.displayName,
    isHost: u.isHost,
  }));
  io.to(room.roomId).emit("lobby_update", { users });
}

export function registerStudyRoomSockets(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.on(
      "join_room",
      (payload: {
        roomId?: string;
        username?: string;
        hostKey?: string;
      }) => {
        const roomId = payload.roomId?.trim();
        const username = payload.username?.trim();
        if (!roomId || !username) {
          socket.emit("study_error", { message: "roomId and username required" });
          return;
        }
        const room = getRoom(roomId);
        if (!room) {
          socket.emit("study_error", { message: "Room not found" });
          return;
        }
        if (room.phase !== "lobby") {
          socket.emit("study_error", {
            message: "Quiz already started or finished",
          });
          return;
        }

        const hasHost = Array.from(room.users.values()).some((u) => u.isHost);
        let isHost = false;
        if (payload.hostKey && payload.hostKey === room.hostKey && !hasHost) {
          isHost = true;
        }

        for (const r of Array.from(socket.rooms)) {
          if (r !== socket.id) socket.leave(r);
        }
        socket.join(roomId);

        const user: StudyUser = {
          id: randomUUID(),
          displayName: username,
          socketId: socket.id,
          isHost,
        };

        removeUserBySocket(room, socket.id);
        addUser(room, user);

        socket.data.studyRoomId = roomId;
        socket.data.studyUserId = user.id;

        socket.emit("room_joined", { userId: user.id, isHost: user.isHost });
        emitLobby(io, room);
      }
    );

    socket.on("start_quiz", async (payload: { roomId?: string }) => {
      const roomId = payload.roomId?.trim();
      if (!roomId) {
        socket.emit("study_error", { message: "roomId required" });
        return;
      }
      const room = getRoom(roomId);
      if (!room) {
        socket.emit("study_error", { message: "Room not found" });
        return;
      }
      const uid = room.socketToUserId.get(socket.id);
      const me = uid ? room.users.get(uid) : undefined;
      if (!me?.isHost) {
        socket.emit("study_error", { message: "Only the host can start the quiz" });
        return;
      }
      if (room.phase !== "lobby") {
        socket.emit("study_error", { message: "Quiz already started" });
        return;
      }
      if (room.users.size < 1) {
        socket.emit("study_error", { message: "No participants in room" });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      try {
        room.quiz = await generateQuizMcqs(
          room.materialSummary,
          room.questionsCount,
          apiKey
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Quiz generation failed";
        socket.emit("study_error", { message: msg });
        return;
      }

      room.phase = "quiz";
      room.questionMs = QUESTION_MS;
      room.userQuestionIndex.clear();
      room.userQuestionStartedAt.clear();
      clearAllUserTimers(room);
      room.responses = {};
      for (const id of room.users.keys()) {
        room.responses[id] = {};
        room.userQuestionIndex.set(id, 0);
      }

      io.to(roomId).emit("quiz_started", {
        totalQuestions: room.quiz.length,
      });

      for (const id of room.users.keys()) {
        sendQuestionToUser(io, room, id);
      }
    });

    socket.on(
      "submit_answer",
      (payload: {
        roomId?: string;
        questionIndex?: number;
        answer?: string;
      }) => {
        const roomId = payload.roomId?.trim();
        const qIdx = payload.questionIndex;
        const answer =
          typeof payload.answer === "string" ? payload.answer.trim() : "";
        if (!roomId || typeof qIdx !== "number") {
          return;
        }
        const room = getRoom(roomId);
        if (!room || room.phase !== "quiz") return;

        const uid = room.socketToUserId.get(socket.id);
        if (!uid) return;

        const myIdx = room.userQuestionIndex.get(uid);
        if (myIdx !== qIdx) return;

        advanceUser(io, room, uid, answer);
      }
    );

    socket.on("disconnect", () => {
      const roomId = socket.data.studyRoomId as string | undefined;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const uid = room.socketToUserId.get(socket.id);
      if (uid && room.phase === "quiz") {
        clearUserTimer(room, uid);
      }
      removeUserBySocket(room, socket.id);
      if (room.phase === "lobby") emitLobby(io, room);
      if (room.phase === "quiz") {
        void maybeFinishQuiz(io, room);
      }
    });
  });
}

function sendQuestionToUser(io: Server, room: RoomState, userId: string): void {
  const u = room.users.get(userId);
  if (!u) return;

  const idx = room.userQuestionIndex.get(userId) ?? 0;
  if (idx >= room.quiz.length) {
    io.to(u.socketId).emit("quiz_waiting_others", { done: true });
    void maybeFinishQuiz(io, room);
    return;
  }

  const q = room.quiz[idx];
  const started = Date.now();
  room.userQuestionStartedAt.set(userId, started);
  const endsAt = started + room.questionMs;

  clearUserTimer(room, userId);

  const timerHandle = setTimeout(() => {
    if (room.responses[userId]?.[idx]) return;
    advanceUser(io, room, userId, "");
  }, room.questionMs);
  room.userQuestionTimers.set(userId, timerHandle);

  io.to(u.socketId).emit("question", {
    index: idx,
    question: q.question,
    options: q.options,
    endsAt,
    total: room.quiz.length,
  });
}

function advanceUser(
  io: Server,
  room: RoomState,
  userId: string,
  answer: string
): void {
  const u = room.users.get(userId);
  if (!u || room.phase !== "quiz") return;

  const idx = room.userQuestionIndex.get(userId);
  if (idx === undefined || idx >= room.quiz.length) return;

  if (room.responses[userId]?.[idx]) return;

  const now = Date.now();
  const started = room.userQuestionStartedAt.get(userId) ?? now;
  const ms = Math.min(
    room.questionMs,
    Math.max(0, now - started)
  );

  room.responses[userId][idx] = {
    answer,
    ms,
    submittedAt: now,
  };

  clearUserTimer(room, userId);

  const q = room.quiz[idx];
  io.to(u.socketId).emit("question_closed", {
    index: idx,
    correctAnswer: q?.answer,
  });

  const nextIdx = idx + 1;
  room.userQuestionIndex.set(userId, nextIdx);

  if (nextIdx >= room.quiz.length) {
    io.to(u.socketId).emit("quiz_waiting_others", { done: true });
    void maybeFinishQuiz(io, room);
    return;
  }

  sendQuestionToUser(io, room, userId);
}

function maybeFinishQuiz(io: Server, room: RoomState): void {
  if (room.phase !== "quiz") return;
  if (room.users.size === 0) return;
  for (const uid of room.users.keys()) {
    const idx = room.userQuestionIndex.get(uid) ?? 0;
    if (idx < room.quiz.length) return;
  }
  void finishQuiz(io, room);
}

async function finishQuiz(io: Server, room: RoomState): Promise<void> {
  clearAllUserTimers(room);
  room.phase = "leaderboard";
  room.leaderboard = computeLeaderboard(room);
  io.to(room.roomId).emit("quiz_end", {});
  io.to(room.roomId).emit("leaderboard", { rows: room.leaderboard });

  room.phase = "feedback";
  const apiKey = process.env.GEMINI_API_KEY;
  const topic =
    room.topic.trim() ||
    room.fileText.slice(0, 200) ||
    "Study quiz";

  const tasks = Array.from(room.users.values()).map(async (u) => {
    const fb = await generateUserFeedback(
      topic,
      room.quiz,
      room.responses[u.id] ?? {},
      u.displayName,
      apiKey
    );
    room.feedbackByUserId[u.id] = fb;
    io.to(u.socketId).emit("feedback", { feedback: fb });
  });

  await Promise.all(tasks);
}
