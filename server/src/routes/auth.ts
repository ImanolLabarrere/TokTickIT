import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  normalizeEmail,
} from "../utils/password.js";
import { requireAuth, signSessionToken, setSessionCookie, clearSessionCookie } from "../middleware/auth.js";

const router = Router();

function toSafeUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

// BR-01/BR-02: identical generic error for unknown email, wrong password, AND
// inactive account — never reveals which reason applied.
const INVALID_CREDENTIALS = { error: "Invalid email or password" };

router.post("/login", async (req: Request, res: Response) => {
  const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    const user = await getPrisma().user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(401).json(INVALID_CREDENTIALS);
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json(INVALID_CREDENTIALS);
      return;
    }

    const token = signSessionToken(user.id);
    setSessionCookie(res, token);
    res.status(200).json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    res.status(500).json({ error: "Unable to sign in. Please try again." });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

router.get("/me", requireAuth, (req: Request, res: Response) => {
  res.status(200).json({ user: toSafeUser(req.authUser!) });
});

router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) {
    res.status(400).json({ error: policyError, fields: { newPassword: policyError } });
    return;
  }

  try {
    const user = await getPrisma().user.findUnique({ where: { id: req.authUser!.id } });
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(403).json({ error: "Current password is incorrect." });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await getPrisma().user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/change-password failed:", err);
    res.status(500).json({ error: "Unable to change password. Please try again." });
  }
});

export default router;