import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/utils/password.js";
import { createLoggedInUser, TEST_PASSWORD } from "../helpers/auth.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
// Lab 3 "authorization pass": every protected endpoint is hit directly, with no
// session and with each role, to prove the BACKEND (not the UI) enforces access.
type Agent = ReturnType<typeof request.agent>;
type Caller = "anonymous" | "requester" | "staff" | "admin";

const CALLERS: Caller[] = ["anonymous", "requester", "staff", "admin"];
const prefix = "authz-tests-";
const tag = `AUTHZ${Date.now()}`;

let agents: Record<Exclude<Caller, "anonymous">, Agent>;
let ticketId: number;

interface Endpoint {
  name: string;
  method: "get" | "post";
  path: () => string;
  body?: Record<string, unknown>;
  expected: Record<Caller, number>;
}

// Expected status per caller. 401 = no session, 403 = wrong role. The 200/201/400
// entry for the permitted role proves the route is reachable for that role.
const MATRIX: Endpoint[] = [
  { name: "GET /api/tickets", method: "get", path: () => "/api/tickets",
    expected: { anonymous: 401, requester: 200, staff: 403, admin: 403 } },
  { name: "POST /api/tickets/:id/comments", method: "post", path: () => `/api/tickets/${ticketId}/comments`,
    body: { content: "Authorization matrix comment" },
    expected: { anonymous: 401, requester: 201, staff: 201, admin: 403 } },
  { name: "POST /api/tickets/:id/resolved-confirmation", method: "post", path: () => `/api/tickets/${ticketId}/resolved-confirmation`,
    body: {}, expected: { anonymous: 401, requester: 200, staff: 403, admin: 403 } },
  { name: "GET /api/staff/tickets", method: "get", path: () => "/api/staff/tickets",
    expected: { anonymous: 401, requester: 403, staff: 200, admin: 403 } },
  { name: "GET /api/staff/owners", method: "get", path: () => "/api/staff/owners",
    expected: { anonymous: 401, requester: 403, staff: 200, admin: 403 } },
  { name: "GET /api/staff/tickets/:id", method: "get", path: () => `/api/staff/tickets/${ticketId}`,
    expected: { anonymous: 401, requester: 403, staff: 200, admin: 403 } },
  { name: "POST /api/staff/tickets/:id/claim", method: "post", path: () => `/api/staff/tickets/${ticketId}/claim`,
    body: {}, expected: { anonymous: 401, requester: 403, staff: 200, admin: 403 } },
  { name: "POST /api/staff/tickets/:id/notes", method: "post", path: () => `/api/staff/tickets/${ticketId}/notes`,
    body: { content: "Authorization matrix note" },
    expected: { anonymous: 401, requester: 403, staff: 201, admin: 403 } },
  { name: "GET /api/admin/users", method: "get", path: () => "/api/admin/users",
    expected: { anonymous: 401, requester: 403, staff: 403, admin: 200 } },
  { name: "POST /api/admin/users (empty body)", method: "post", path: () => "/api/admin/users",
    body: {}, expected: { anonymous: 401, requester: 403, staff: 403, admin: 400 } },
];

beforeAll(async () => {
  const requester = await createLoggedInUser(`${prefix}requester@example.com`, "REQUESTER", "Authz Requester");
  const staff = await createLoggedInUser(`${prefix}staff@example.com`, "IT_STAFF", "Authz Staff");
  const admin = await createLoggedInUser(`${prefix}admin@example.com`, "ADMINISTRATOR", "Authz Admin");
  agents = { requester: requester.agent, staff: staff.agent, admin: admin.agent };

  const categories = await request(app).get("/api/categories");
  const relatedSystems = await request(app).get("/api/related-systems");
  const created = await requester.agent.post("/api/tickets").field({
    categoryId: String(categories.body[0].id),
    relatedSystemId: String(relatedSystems.body[0].id),
    summary: `${tag} matrix ticket`,
    description: "Seeded for the authorization matrix.",
    requestedPriority: "LOW",
  });
  ticketId = created.body.id;
});

// Users cannot be deleted while Tickets, comments or notes reference them
// (foreign keys are RESTRICT), so remove their dependent rows first.
afterAll(async () => {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  const tickets = await prisma.ticket.findMany({ where: { requesterId: { in: userIds } }, select: { id: true } });
  const ticketIds = tickets.map((t) => t.id);

  await prisma.publicComment.deleteMany({
    where: { OR: [{ authorId: { in: userIds } }, { ticketId: { in: ticketIds } }] },
  });
  await prisma.internalNote.deleteMany({
    where: { OR: [{ authorId: { in: userIds } }, { ticketId: { in: ticketIds } }] },
  });
  await prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("authorization matrix (AC-08, AC-15)", () => {
  for (const endpoint of MATRIX) {
    for (const caller of CALLERS) {
      it(`${endpoint.name} as ${caller} -> ${endpoint.expected[caller]}`, async () => {
        const who = (caller === "anonymous" ? request(app) : agents[caller]) as unknown as {
          get(path: string): request.Test;
          post(path: string): request.Test;
        };
        let call = who[endpoint.method](endpoint.path());
        if (endpoint.body) call = call.send(endpoint.body);

        const res = await call;
        expect(res.status).toBe(endpoint.expected[caller]);
      });
    }
  }
});

describe("temporary passwords (AC-04)", () => {
  for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const) {
    it(`blocks a ${role} who still has an initial password from every protected route`, async () => {
      const email = `${prefix}gate-${role.toLowerCase()}@example.com`;
      const passwordHash = await hashPassword(TEST_PASSWORD);
      await getPrisma().user.upsert({
        where: { email },
        update: { passwordHash, isActive: true, mustChangePassword: true, role },
        create: { name: "Gate Tester", email, passwordHash, isActive: true, mustChangePassword: true, role },
      });
      const agent = request.agent(app);
      expect((await agent.post("/api/auth/login").send({ email, password: TEST_PASSWORD })).status).toBe(200);

      for (const path of ["/api/tickets", "/api/staff/tickets", "/api/admin/users"]) {
        const res = await agent.get(path);
        expect(res.status).toBe(403);
        expect(res.body.mustChangePassword).toBe(true);
      }
      const me = await agent.get("/api/auth/me");
      expect(me.status).toBe(200);
      expect(me.body.user.mustChangePassword).toBe(true);
    });
  }
});

describe("ownership comes from the session, never from the client (AC-06, AC-07)", () => {
  it("ignores a requesterId sent by the client and never reveals another Requester's data", async () => {
    const a = await createLoggedInUser(`${prefix}owner-a@example.com`, "REQUESTER", "Owner A");
    const b = await createLoggedInUser(`${prefix}owner-b@example.com`, "REQUESTER", "Owner B");
    const categories = await request(app).get("/api/categories");
    const relatedSystems = await request(app).get("/api/related-systems");
    const base = {
      categoryId: String(categories.body[0].id),
      relatedSystemId: String(relatedSystems.body[0].id),
      description: "Ownership test.",
      requestedPriority: "LOW",
    };

    // A tries to create a ticket "for" B by sending B's id.
    const forged = await a.agent.post("/api/tickets").field({
      ...base,
      summary: `${tag} forged owner`,
      requesterId: String(b.userId),
    });
    expect(forged.status).toBe(201);

    const asA = await a.agent.get(`/api/tickets/${forged.body.id}`);
    expect(asA.status).toBe(200);
    expect(asA.body.requester.id).toBe(a.userId);
    expect((await b.agent.get(`/api/tickets/${forged.body.id}`)).status).toBe(404);

    // B has a ticket of their own; A cannot list it even by passing B's id in the query.
    await b.agent.post("/api/tickets").field({ ...base, summary: `${tag} belongs to B` });
    const list = await a.agent
      .get("/api/tickets")
      .query({ requesterId: String(b.userId), search: `${tag} belongs`, pageSize: 50 });
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);
  });
});

describe("logout (AC-16)", () => {
  it("makes the old session unusable", async () => {
    const { agent } = await createLoggedInUser(`${prefix}logout@example.com`, "REQUESTER", "Logout Tester");
    expect((await agent.get("/api/tickets")).status).toBe(200);

    expect((await agent.post("/api/auth/logout")).status).toBe(200);

    expect((await agent.get("/api/tickets")).status).toBe(401);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});

describe("migration regression (AC-18)", () => {
  it("keeps pre-existing seeded Tickets owned by their migrated Requester accounts", async () => {
    const ownedByJennifer = await getPrisma().ticket.findFirst({
      where: { summary: "Laptop battery drains quickly", requester: { email: "jennifer.anderson@example.com" } },
    });
    expect(ownedByJennifer).not.toBeNull();

    // Every ticket still points at a Requester-role user.
    const orphans = await getPrisma().ticket.count({ where: { requester: { role: { not: "REQUESTER" } } } });
    expect(orphans).toBe(0);
  });
});
