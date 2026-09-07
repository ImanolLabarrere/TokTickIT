import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { Request, Response, NextFunction } from "express";

// BR-14: JPG/JPEG/PNG/WEBP/PDF only, 5MB max. BR-13: 5 attachments max per Ticket.
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TICKET = 5;

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_ATTACHMENTS_PER_TICKET },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

// Wraps multer so its special error shapes become the same JSON error style as
// the rest of the API, instead of leaking multer/Express internals (BR-14, FR-14).
export function attachmentsUpload(req: Request, res: Response, next: NextFunction) {
  multerUpload.array("attachments", MAX_ATTACHMENTS_PER_TICKET)(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "One or more attachments exceed the 5MB limit." });
        return;
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        res
          .status(400)
          .json({ error: `A Ticket may have at most ${MAX_ATTACHMENTS_PER_TICKET} attachments.` });
        return;
      }
    }

    if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
      res
        .status(400)
        .json({ error: "Only JPG, PNG, WEBP, and PDF files are allowed." });
      return;
    }

    console.error("Attachment upload failed:", err);
    res.status(400).json({ error: "Unable to process attachments." });
  });
}
