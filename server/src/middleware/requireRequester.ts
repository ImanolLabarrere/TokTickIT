import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

// Extend Express's Request type so downstream handlers get requesterId for free.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requesterId?: number;
    }
  }
}

// Lab 2 — BR-19: every Requester-scoped endpoint enforces ownership server-side.
// There is no real authentication yet (BR-03), so the client sends the selected
// Requester's id in the X-Requester-Id header. This middleware validates that id
// against the database (must exist AND be active) before any handler runs.
export async function requireRequester(req: Request, res: Response, next: NextFunction) {
  const header = req.header("X-Requester-Id");
  const id = header ? Number(header) : NaN;

  if (!header || !Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Missing or invalid X-Requester-Id header" });
    return;
  }

  try {
    const requester = await getPrisma().requester.findUnique({ where: { id } });
    if (!requester || !requester.isActive) {
      res.status(400).json({ error: "Unknown or inactive Requester" });
      return;
    }
    req.requesterId = id;
    next();
  } catch (err) {
    console.error("requireRequester failed:", err);
    res.status(500).json({ error: "Unable to verify Requester" });
  }
}
