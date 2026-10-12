import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getPrisma } from "../prisma.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: {
        id: number;
        name: string;
        email: string;
        role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
        mustChangePassword: boolean;
      };
    }
  }
}

export const SESSION_COOKIE = "toktickit_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours (specification.md §10)

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Copy server/.env.example to server/.env.");
  }
  return secret;
}

export function signSessionToken(userId: number): string {
  return jwt.sign({ userId }, getSecret(), { expiresIn: SESSION_TTL_SECONDS });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE);
}

// BR-02/BR-06: loads the current user from the session cookie on every request
// (not just at login), so a deactivation takes effect on the user's very next call.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  let payload: { userId: number };
  try {
    payload = jwt.verify(token, getSecret()) as { userId: number };
  } catch {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const user = await getPrisma().user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    req.authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch (err) {
    console.error("requireAuth failed:", err);
    res.status(500).json({ error: "Unable to verify session" });
  }
}

// Will be applied to every authenticated route from Issue 3 onward, EXCEPT the
// auth router's own endpoints (login is public; logout/me/change-password
// intentionally bypass this gate — change-password IS how mustChangePassword
// gets cleared, and me/logout must keep working so the frontend can read the
// flag and sign the user out).
export function blockIfMustChangePassword(req: Request, res: Response, next: NextFunction) {
  if (req.authUser?.mustChangePassword) {
    res.status(403).json({ error: "Password change required", mustChangePassword: true });
    return;
  }
  next();
}

export function requireRole(...roles: Array<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}