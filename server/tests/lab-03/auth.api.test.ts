import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/utils/password.js";

const ACTIVE_EMAIL = "auth.active@example.com";
const INACTIVE_EMAIL = "auth.inactive@example.com";
const PASSWORD = "Password123";

async function upsertTestUser(email: string, isActive: boolean, mustChangePassword: boolean) {
  const passwordHash = await hashPassword(PASSWORD);
  return getPrisma().user.upsert({
    where: { email },
    update: { passwordHash, isActive, mustChangePassword, role: "REQUESTER" },
    create: { name: "Auth Test User", email, passwordHash, isActive, mustChangePassword, role: "REQUESTER" },
  });
}

describe("Authentication (Lab 3, Issue 2)", () => {
  beforeAll(async () => {
    await upsertTestUser(ACTIVE_EMAIL, true, false);
    await upsertTestUser(INACTIVE_EMAIL, false, false);
  });

  afterAll(async () => {
    await getPrisma().user.deleteMany({ where: { email: { in: [ACTIVE_EMAIL, INACTIVE_EMAIL] } } });
  });

  it("logs in with valid credentials and sets a session cookie", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ACTIVE_EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ACTIVE_EMAIL);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects an unknown email with the generic message", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "whatever123" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
  });

  it("rejects a wrong password with the same generic message", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ACTIVE_EMAIL, password: "WrongPassword1" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
  });

  it("rejects an inactive account with the same generic message (never reveals it exists)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: INACTIVE_EMAIL, password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
  });

  it("returns the current user from /me after login, and 401 before login", async () => {
    const agent = request.agent(app);
    const before = await agent.get("/api/auth/me");
    expect(before.status).toBe(401);

    await agent.post("/api/auth/login").send({ email: ACTIVE_EMAIL, password: PASSWORD });
    const after = await agent.get("/api/auth/me");
    expect(after.status).toBe(200);
    expect(after.body.user.email).toBe(ACTIVE_EMAIL);
  });

  it("logs out and then /me is 401 again", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: ACTIVE_EMAIL, password: PASSWORD });
    expect((await agent.get("/api/auth/me")).status).toBe(200);

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(200);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("requires a password change before mustChangePassword clears, then allows it", async () => {
    const email = "auth.mustchange@example.com";
    await upsertTestUser(email, true, true);
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email, password: PASSWORD });

    const me1 = await agent.get("/api/auth/me");
    expect(me1.body.user.mustChangePassword).toBe(true);

    const bad = await agent.post("/api/auth/change-password").send({ currentPassword: "WrongCurrent1", newPassword: "NewPassword123" });
    expect(bad.status).toBe(403);

    const weak = await agent.post("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: "short1" });
    expect(weak.status).toBe(400);

    const ok = await agent.post("/api/auth/change-password").send({ currentPassword: PASSWORD, newPassword: "NewPassword123" });
    expect(ok.status).toBe(200);

    const me2 = await agent.get("/api/auth/me");
    expect(me2.body.user.mustChangePassword).toBe(false);

    await getPrisma().user.delete({ where: { email } });
  });
});