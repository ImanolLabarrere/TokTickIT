import { Request, Response, NextFunction } from "express";
import { requireAuth, blockIfMustChangePassword } from "./auth.js";

// Extend Express's Request type so downstream handlers get requesterId for free
// (unchanged from Lab 2 — every existing handler keeps working as-is).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requesterId?: number;
    }
  }
}

// Lab 3 Issue 3 — BR-03: ownership now comes from the authenticated session
// (never from client-supplied input). This composes requireAuth (valid
// session + active-user check, re-verified on every request per BR-02/BR-06)
// with a REQUESTER-role check, and still sets req.requesterId so every
// existing Lab 2 handler (`req.requesterId as number`) needs zero changes.
//
// api-spec.md: "The X-Requester-Id header is removed; the authenticated
// session's user id is used instead." A user who still has
// mustChangePassword=true is blocked here too (they must finish the forced
// password change before touching any Ticket data).
export function requireRequester(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    blockIfMustChangePassword(req, res, () => {
      if (!req.authUser || req.authUser.role !== "REQUESTER") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      req.requesterId = req.authUser.id;
      next();
    });
  });
}
