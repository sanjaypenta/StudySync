import { Router } from "express";
import multer from "multer";
import { extractTextFromPdfBuffer } from "../services/pdfExtract.js";
import {
  createHostKey,
  createRoom,
  generateRoomId,
} from "../studyRoom/roomStore.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export const studyRoomsRouter = Router();

function parseQuestionsCount(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

studyRoomsRouter.post(
  "/",
  (req, res, next) => {
    upload.single("pdf")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({
            error: `PDF must be ${MAX_FILE_BYTES / (1024 * 1024)}MB or smaller`,
          });
          return;
        }
      }
      if (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "Upload failed",
        });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const body = req.body as Record<string, string | undefined>;
      const topic = (body.topic ?? "").trim();
      let fileText = "";
      const buf = req.file?.buffer;
      if (buf?.length) {
        fileText = await extractTextFromPdfBuffer(buf);
      }
      const qn = parseQuestionsCount(body.questionsCount);
      if (qn === null || qn < 1 || qn > 30) {
        res.status(400).json({
          error: "questionsCount must be an integer between 1 and 30",
        });
        return;
      }
      const combined = [topic, fileText].filter(Boolean).join("\n\n");
      if (combined.trim().length < 20) {
        res.status(400).json({
          error:
            "Add a longer topic description and/or a PDF with extractable text (at least 20 characters total).",
        });
        return;
      }

      const roomId = generateRoomId();
      const hostKey = createHostKey();
      createRoom({
        roomId,
        hostKey,
        topic,
        fileText,
        questionsCount: qn,
      });

      res.status(201).json({ roomId, hostKey });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create room";
      res.status(500).json({ error: msg });
    }
  }
);
