import { Router } from "express";
import multer from "multer";
import { generatePlanWithGemini } from "../services/gemini.js";
import {
  mergeNotesAndPdfText,
  truncateContext,
  truncateForMetaPreview,
} from "../services/contextMerge.js";
import { extractTextFromPdfBuffer } from "../services/pdfExtract.js";
import type { BurnoutLevel, GoalType } from "../services/planDistributor.js";

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

export const plansRouter = Router();

function parseNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseGoalType(v: unknown): GoalType {
  if (v === "assignment" || v === "quiz_exam" || v === "other") return v;
  return "other";
}

/** Integer 1–20; default 3 for syllabus batching. */
function parseTopicsPerDay(v: unknown): number {
  const n = parseNum(v);
  if (n === null || !Number.isFinite(n)) return 3;
  const i = Math.floor(n);
  if (i < 1) return 3;
  return Math.min(20, i);
}

plansRouter.post(
  "/generate",
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
      const taskTitle = body.taskTitle?.trim();
      const subject = body.subject?.trim();
      const deadline = body.deadline?.trim();
      const today = body.today?.trim();
      const totalHours = parseNum(body.totalHours);
      const dailyLimit = parseNum(body.dailyLimit);
      const burnoutLevel = body.burnoutLevel;
      const preferredStudyStyle = body.preferredStudyStyle;
      const goalType = parseGoalType(body.goalType);
      const topics = (body.topics ?? "").trim();
      const pdfNotes = (body.pdfNotes ?? "").trim();

      if (
        !taskTitle ||
        !subject ||
        !deadline ||
        !today ||
        totalHours === null ||
        dailyLimit === null
      ) {
        res.status(400).json({ error: "Missing or invalid required fields" });
        return;
      }

      let extractedPdf = "";
      const file = req.file;
      if (file?.buffer) {
        try {
          extractedPdf = await extractTextFromPdfBuffer(file.buffer);
        } catch (e) {
          console.error(e);
          res.status(400).json({
            error:
              "Could not read PDF text. Try a different file or paste notes instead.",
          });
          return;
        }
      }

      const merged = mergeNotesAndPdfText(
        pdfNotes || undefined,
        extractedPdf || undefined
      );
      const contextText = truncateContext(merged);

      const burnout: BurnoutLevel = ["low", "medium", "high"].includes(
        String(burnoutLevel)
      )
        ? (burnoutLevel as BurnoutLevel)
        : "medium";
      const style: "light" | "intense" =
        preferredStudyStyle === "intense" ? "intense" : "light";
      const topicsPerDay = parseTopicsPerDay(body.topicsPerDay);

      const { plan, effectiveTopics } = await generatePlanWithGemini(
        {
          taskTitle,
          subject,
          totalHours,
          deadline,
          today,
          dailyLimit,
          burnoutLevel: burnout,
          preferredStudyStyle: style,
          goalType,
          topics,
          contextText,
          topicsPerDay,
        },
        process.env.GEMINI_API_KEY
      );

      const pdfChars = extractedPdf.length;
      let pdfNote: string | undefined;
      if (file?.buffer && pdfChars === 0) {
        pdfNote =
          "A PDF was uploaded but no text was extracted (common for scanned PDFs). Paste key notes or use a text-based PDF.";
      } else if (!file && !pdfNotes && contextText.trim().length < 50) {
        pdfNote =
          "Add a PDF or paste notes so the planner can see your syllabus.";
      }

      res.json({
        plan,
        meta: {
          pdfUploaded: Boolean(file?.buffer),
          pdfCharsExtracted: pdfChars,
          contextChars: contextText.length,
          pdfNote,
          materialTextPreview: truncateForMetaPreview(contextText),
          effectiveTopics,
        },
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Plan generation failed" });
    }
  }
);

/** Quick PDF text preview after file pick (same extraction as plan generation). */
plansRouter.post(
  "/extract-preview",
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
      const file = req.file;
      if (!file?.buffer?.length) {
        res.status(400).json({ error: "Upload a PDF file" });
        return;
      }
      let text: string;
      try {
        text = await extractTextFromPdfBuffer(file.buffer);
      } catch (e) {
        console.error(e);
        res.status(400).json({
          error:
            "Could not read PDF text. Try a different file or paste notes instead.",
        });
        return;
      }
      res.json({
        charCount: text.length,
        preview: truncateForMetaPreview(text, 8000),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Extract failed" });
    }
  }
);
