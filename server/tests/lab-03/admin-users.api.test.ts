import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createLoggedInUser, TEST_PASSWORD } from "../helpers/auth.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
// Everything created here uses the "admin-users-test-" email prefix and is
// removed afterwards. BR-20 (last active Administrator) is covered by the pure
// rule in admin-safety.unit.test.ts, because the shared dev database always
// holds several Administrators.
type Agent = ReturnType<typeof request.agent>;

const prefix = "admin-users-test-";
const tag = `ADMUSR${Date.now()}`;
let admin: Agent;
let adminId: number;
let staff: Agent;
let requester: Agent;
let existingUserId: number;

function validBody(label: string, overrides: Record<string, unknown> = {}) {
  return {
    name: `${tag} ${label}`,
    email: `${prefix}${label}-${Date.now()}@example.com`,
    role: "REQUESTER",
    isActive: true,
    initialPassword: "Initial123",
    ...overrides,
  };
}

beforeAll(async () => {
  ({ agent: admin, userId: adminId } = await createLoggedInUser(`${prefix}admin@example.com`, "ADMINISTRATOR", "Users Admin"));
  ({ agent: staff } = await createLoggedInUser(`${prefix}staff@example.com`, "IT_STAFF", "Users Staff"));
  ({ agent: requester } = await createLoggedInUser(`${prefix}requester@example.com`, "REQUESTER", "Users Requester"));

  const created = await admin.post("/api/admin/users").send(validBody("existing"));
  existingUserId = created.body.id;
});

afterAll(async () => {
  await getPrisma().user.deleteMany({ where: { email: { startsWith: prefix } } });
});

describe("authorization of /api/admin/*", () => {
  it("rejects unauthenticated callers with 401", async () => {
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
  });

  it("rejects IT Staff and Requesters with 403 on every admin route (AC-15)", async () => {
    for (const agent of [staff, requester]) {
      expect((await agent.get("/api/admin/users")).status).toBe(403);
      expect((await agent.post("/api/admin/users").send(validBody("denied"))).status).toBe(403);
      expect((await agent.patch(`/api/admin/users/${existingUserId}`).send({ name: "x" })).status).toBe(403);
      expect(
        (await agent.post(`/api/admin/users/${existingUserId}/reset-password`).send({ newInitialPassword: "Another123" })).status
      ).toBe(403);
    }
  });
});

describe("GET /api/admin/users", () => {
  it("lists users without exposing password data", async () => {
    const res = await admin.get("/api/admin/users").query({ search: tag });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const user = res.body.data[0];
    expect(Object.keys(user).sort()).toEqual(["email", "id", "isActive", "name", "role"]);
  });

  it("searches by name or email, case-insensitively and partially", async () => {
    const byName = await admin.get("/api/admin/users").query({ search: tag.toLowerCase() });
    expect(byName.body.data.some((u: { id: number }) => u.id === existingUserId)).toBe(true);

    const byEmail = await admin.get("/api/admin/users").query({ search: `${prefix}EXISTING`.toUpperCase() });
    expect(byEmail.body.data.some((u: { id: number }) => u.id === existingUserId)).toBe(true);
  });

  it("filters by role", async () => {
    const res = await admin.get("/api/admin/users").query({ search: prefix, role: "IT_STAFF" });

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((u: { role: string }) => u.role === "IT_STAFF")).toBe(true);
  });

  it("paginates and falls back to defaults on invalid paging", async () => {
    const paged = await admin.get("/api/admin/users").query({ search: prefix, pageSize: 2, page: 1 });
    expect(paged.body.data).toHaveLength(2);
    expect(paged.body.pagination.pageSize).toBe(2);

    const invalid = await admin.get("/api/admin/users").query({ page: "-4", pageSize: "9999" });
    expect(invalid.body.pagination.page).toBe(1);
    expect(invalid.body.pagination.pageSize).toBe(10);
  });
});

describe("POST /api/admin/users", () => {
  it("creates a user who must change the initial password at first login (BR-17)", async () => {
    const body = validBody("created", { role: "IT_STAFF" });
    const res = await admin.post("/api/admin/users").send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: body.name, email: body.email, role: "IT_STAFF", isActive: true });
    expect(res.body.passwordHash).toBeUndefined();

    const login = request.agent(app);
    expect((await login.post("/api/auth/login").send({ email: body.email, password: "Initial123" })).status).toBe(200);
    expect((await login.get("/api/auth/me")).body.user.mustChangePassword).toBe(true);
  });

  it("rejects a duplicate email, case-insensitively, with a field-level 400 (AC-12)", async () => {
    const body = validBody("dup");
    expect((await admin.post("/api/admin/users").send(body)).status).toBe(201);

    const exact = await admin.post("/api/admin/users").send(validBody("dup2", { email: body.email }));
    expect(exact.status).toBe(400);
    expect(exact.body.fields.email).toMatch(/already exists/i);

    const shouting = await admin.post("/api/admin/users").send(validBody("dup3", { email: body.email.toUpperCase() }));
    expect(shouting.status).toBe(400);
    expect(shouting.body.fields.email).toMatch(/already exists/i);
  });

  it("rejects invalid input with field-level errors", async () => {
    const res = await admin.post("/api/admin/users").send({
      name: "   ",
      email: "not-an-email",
      role: "SUPERUSER",
      initialPassword: "short",
    });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(["email", "initialPassword", "name", "role"]);
  });
});

describe("PATCH /api/admin/users/:id", () => {
  it("edits name, email, role and activation state", async () => {
    const created = await admin.post("/api/admin/users").send(validBody("edit"));
    const id = created.body.id;
    const newEmail = `${prefix}edited-${Date.now()}@example.com`;

    const res = await admin
      .patch(`/api/admin/users/${id}`)
      .send({ name: `${tag} Edited`, email: newEmail.toUpperCase(), role: "IT_STAFF", isActive: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, name: `${tag} Edited`, email: newEmail, role: "IT_STAFF", isActive: false });
  });

  it("rejects an email that belongs to another user, but allows keeping your own", async () => {
    const other = await admin.post("/api/admin/users").send(validBody("other"));
    const mine = await admin.post("/api/admin/users").send(validBody("mine"));

    const clash = await admin.patch(`/api/admin/users/${mine.body.id}`).send({ email: other.body.email });
    expect(clash.status).toBe(400);
    expect(clash.body.fields.email).toMatch(/already exists/i);

    const same = await admin.patch(`/api/admin/users/${mine.body.id}`).send({ email: mine.body.email.toUpperCase() });
    expect(same.status).toBe(200);
  });

  it("refuses to deactivate the Administrator's own account (BR-19, AC-13)", async () => {
    const res = await admin.patch(`/api/admin/users/${adminId}`).send({ isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot deactivate your own account");
    const still = await admin.get("/api/auth/me");
    expect(still.status).toBe(200);
  });

  it("allows deactivating a different Administrator while another stays active", async () => {
    const second = await admin.post("/api/admin/users").send(validBody("second-admin", { role: "ADMINISTRATOR" }));

    const res = await admin.patch(`/api/admin/users/${second.body.id}`).send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it("takes effect on the user's very next request (inactive accounts are locked out)", async () => {
    const { agent: target, userId } = await createLoggedInUser(`${prefix}locked@example.com`, "REQUESTER", "Locked Out");
    expect((await target.get("/api/auth/me")).status).toBe(200);

    await admin.patch(`/api/admin/users/${userId}`).send({ isActive: false });

    expect((await target.get("/api/auth/me")).status).toBe(401);
  });

  it("returns 404 for an unknown user and 400 when nothing is sent", async () => {
    expect((await admin.patch("/api/admin/users/999999999").send({ name: "x" })).status).toBe(404);
    expect((await admin.patch(`/api/admin/users/${existingUserId}`).send({})).status).toBe(400);
  });
});

describe("POST /api/admin/users/:id/reset-password", () => {
  it("sets a new initial password that must be changed at next login (BR-21)", async () => {
    const { userId } = await createLoggedInUser(`${prefix}reset@example.com`, "REQUESTER", "Reset Target");

    const res = await admin.post(`/api/admin/users/${userId}/reset-password`).send({ newInitialPassword: "Fresh1234" });
    expect(res.status).toBe(200);

    const old = await request(app).post("/api/auth/login").send({ email: `${prefix}reset@example.com`, password: TEST_PASSWORD });
    expect(old.status).toBe(401);

    const fresh = request.agent(app);
    await fresh.post("/api/auth/login").send({ email: `${prefix}reset@example.com`, password: "Fresh1234" });
    expect((await fresh.get("/api/auth/me")).body.user.mustChangePassword).toBe(true);
  });

  it("blocks the target's already-open session until they change the password", async () => {
    const { agent: target, userId } = await createLoggedInUser(`${prefix}open@example.com`, "REQUESTER", "Open Session");
    expect((await target.get("/api/tickets")).status).toBe(200);

    await admin.post(`/api/admin/users/${userId}/reset-password`).send({ newInitialPassword: "Fresh1234" });

    const blocked = await target.get("/api/tickets");
    expect(blocked.status).toBe(403);
    expect(blocked.body.mustChangePassword).toBe(true);
  });

  it("rejects a weak password with 400 and an unknown user with 404", async () => {
    const weak = await admin.post(`/api/admin/users/${existingUserId}/reset-password`).send({ newInitialPassword: "weak" });
    expect(weak.status).toBe(400);
    expect(weak.body.fields.newInitialPassword).toBeDefined();

    const missing = await admin.post("/api/admin/users/999999999/reset-password").send({ newInitialPassword: "Fresh1234" });
    expect(missing.status).toBe(404);
  });
});
