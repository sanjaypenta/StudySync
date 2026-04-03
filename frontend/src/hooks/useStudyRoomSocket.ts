import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type LobbyUser = {
  id: string;
  displayName: string;
  isHost: boolean;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  totalMs: number;
  isTop: boolean;
};

export type MistakeItem = {
  question: string;
  your_answer: string;
  correct_answer: string;
  explanation: string;
};

export type FeedbackPayload = {
  score: string;
  strengths: string;
  weakness: string;
  tips: string;
  mistakes: MistakeItem[];
};

type QuestionPayload = {
  index: number;
  question: string;
  options: string[];
  endsAt: number;
  total: number;
};

export type StudyPhase = "lobby" | "quiz" | "quiz_waiting" | "results";

export function useStudyRoomSocket(
  roomId: string | undefined,
  username: string | undefined,
  hostKey: string | null
) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [lobbyUsers, setLobbyUsers] = useState<LobbyUser[]>([]);
  const [phase, setPhase] = useState<StudyPhase>("lobby");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(
    null
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);

  const socketBaseUrl = (() => {
    const fromEnv = (import.meta as any).env?.VITE_BACKEND_URL as
      | string
      | undefined;
    if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();

    // In dev, prefer hitting the backend directly (avoids flaky WS proxy issues,
    // and allows joining from another device on the LAN when using host IP).
    if ((import.meta as any).env?.DEV && typeof window !== "undefined") {
      const proto = window.location.protocol;
      const host = window.location.hostname;
      return `${proto}//${host}:4000`;
    }

    // In prod (or unknown env), default to same-origin.
    return undefined;
  })();

  useEffect(() => {
    if (!roomId?.trim() || !username?.trim()) return;

    const socket = io(socketBaseUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setError(null);
      socket.emit("join_room", {
        roomId: roomId.trim(),
        username: username.trim(),
        hostKey: hostKey ?? undefined,
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", () => setConnected(false));

    socket.on("connect_error", () => {
      setConnected(false);
      setError(
        "Could not connect to the study server. Make sure the backend is running and reachable."
      );
    });

    socket.on("study_error", (p: { message?: string }) => {
      setError(p?.message ?? "Something went wrong");
    });

    socket.on(
      "room_joined",
      (p: { userId?: string; isHost?: boolean }) => {
        if (p.userId) setMyUserId(p.userId);
        setIsHost(Boolean(p.isHost));
      }
    );

    socket.on("lobby_update", (p: { users?: LobbyUser[] }) => {
      setLobbyUsers(p.users ?? []);
    });

    socket.on("quiz_started", (p: { totalQuestions?: number }) => {
      setPhase("quiz");
      setTotalQuestions(p.totalQuestions ?? 0);
      setCurrentQuestion(null);
      setFeedback(null);
    });

    socket.on(
      "question",
      (p: {
        index?: number;
        question?: string;
        options?: string[];
        endsAt?: number;
        total?: number;
      }) => {
        if (
          typeof p.index !== "number" ||
          typeof p.question !== "string" ||
          !Array.isArray(p.options)
        )
          return;
        setPhase("quiz");
        setCurrentQuestion({
          index: p.index,
          question: p.question,
          options: p.options,
          endsAt: p.endsAt ?? Date.now() + 25_000,
          total: p.total ?? 0,
        });
      }
    );

    socket.on("quiz_waiting_others", () => {
      setPhase("quiz_waiting");
      setCurrentQuestion(null);
    });

    socket.on("quiz_end", () => {
      setPhase("results");
      setCurrentQuestion(null);
    });

    socket.on("leaderboard", (p: { rows?: LeaderboardRow[] }) => {
      setLeaderboard(p.rows ?? []);
    });

    socket.on("feedback", (p: { feedback?: FeedbackPayload }) => {
      if (p.feedback) setFeedback(p.feedback);
    });

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, username, hostKey, socketBaseUrl]);

  const startQuiz = useCallback(() => {
    if (!roomId?.trim()) return;
    socketRef.current?.emit("start_quiz", { roomId: roomId.trim() });
  }, [roomId]);

  /** Submit answer for your current question and move to your next question (others unchanged). */
  const submitAnswer = useCallback(
    (answer: string) => {
      if (!roomId?.trim() || !currentQuestion) return;
      socketRef.current?.emit("submit_answer", {
        roomId: roomId.trim(),
        questionIndex: currentQuestion.index,
        answer,
      });
    },
    [roomId, currentQuestion]
  );

  return {
    connected,
    error,
    myUserId,
    isHost,
    lobbyUsers,
    phase,
    totalQuestions,
    currentQuestion,
    leaderboard,
    feedback,
    startQuiz,
    submitAnswer,
  };
}
