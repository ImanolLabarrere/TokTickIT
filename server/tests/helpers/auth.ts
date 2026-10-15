import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/utils/password.js";

export const TEST_PASSWORD = "Password123";

export type TestRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

// Upserts a disposable account with mustChangePassword already false (so it can
// hit protected routes immediately) and returns a supertest agent that stays
// logged in across requests (cookie jar), plus the account's id.
export async function createLoggedInUser(email: string, role: TestRole, name = "Test User") {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const user = await getPrisma().user.upsert({
    where: { email },
    update: { name, passwordHash, isActive: true, mustChangePassword: false, role },
    create: { name, email, passwordHash, isActive: true, mustChangePassword: false, role },
  });

  const agent = request.agent(app);
  const login = await agent.post("/api/auth/login").send({ email, password: TEST_PASSWORD });
  if (login.status !== 200) {
    throw new Error(`Test login failed for ${email}: ${login.status} ${JSON.stringify(login.body)}`);
  }

  return { agent, userId: user.id };
}

// Lab 3 Issue 3 helper, kept so the Lab 2 test files do not change.
export async function createLoggedInRequester(email: string, name = "Test Requester") {
  return createLoggedInUser(email, "REQUESTER", name);
}
