import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/utils/password.js";

export const TEST_PASSWORD = "Password123";

// Lab 3 Issue 3 — Lab 2's test files authenticated via the X-Requester-Id
// header. Now that requireRequester reads the session cookie instead, tests
// need a real logged-in agent. This upserts a disposable REQUESTER account
// with mustChangePassword already false (so it can hit protected routes
// immediately) and returns a supertest agent that stays logged in across
// requests (cookie jar), plus the created user's id.
export async function createLoggedInRequester(email: string, name = "Test Requester") {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const user = await getPrisma().user.upsert({
    where: { email },
    update: { name, passwordHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
    create: { name, email, passwordHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
  });

  const agent = request.agent(app);
  const login = await agent.post("/api/auth/login").send({ email, password: TEST_PASSWORD });
  if (login.status !== 200) {
    throw new Error(`Test login failed for ${email}: ${login.status} ${JSON.stringify(login.body)}`);
  }

  return { agent, userId: user.id };
}
