import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createLoggedInUser } from "../helpers/auth.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
// The dev DB also holds seeded demo tickets, so every assertion below is
// scoped to a unique tag in the summary instead of assuming an empty table.
type Agent = ReturnType<typeof request.agent>;

let staff: Agent;
let staffId: number;
let requesterA: Agent;
let requesterB: Agent;
let admin: Agent;
const tag = `STAFFQ-${Date.now()}`;

async function createTicket(agent: Agent, categoryId: number, relatedSystemId: number, label: string, priority: string) {
  const res = await agent.post("/api/tickets").field({
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: `${tag} ${label}`,
    description: "Seeded for the staff queue tests.",
    requestedPriority: priority,
  });
  return res.body.id as number;
}

beforeAll(async () => {
  ({ agent: staff, userId: staffId } = await createLoggedInUser("staff-queue-tests-staff@example.com", "IT_STAFF", "Queue Tester"));
  ({ agent: requesterA } = await createLoggedInUser("staff-queue-tests-a@example.com", "REQUESTER", "Queue Requester A"));
  ({ agent: requesterB } = await createLoggedInUser("staff-queue-tests-b@example.com", "REQUESTER", "Queue Requester B"));
  ({ agent: admin } = await createLoggedInUser("staff-queue-tests-admin@example.com", "ADMINISTRATOR"));

  const categories = await request(app).get("/api/categories");
  const relatedSystems = await request(app).get("/api/related-systems");
  const categoryId = categories.body[0].id;
  const relatedSystemId = relatedSystems.body[0].id;

  const t1 = await createTicket(requesterA, categoryId, relatedSystemId, "alpha", "LOW");
  await createTicket(requesterA, categoryId, relatedSystemId, "bravo", "MEDIUM");
  const t3 = await createTicket(requesterB, categoryId, relatedSystemId, "charlie", "HIGH");
  await createTicket(requesterB, categoryId, relatedSystemId, "delta", "LOW");

  // alpha: owned + OPEN; charlie: owned + IN_PROGRESS with a raised IT Priority.
  await getPrisma().ticket.update({ where: { id: t1 }, data: { ownerId: staffId, currentStatus: "OPEN" } });
  await getPrisma().ticket.update({
    where: { id: t3 },
    data: { ownerId: staffId, currentStatus: "IN_PROGRESS", itPriority: "HIGH" },
  });
});

describe("GET /api/staff/tickets", () => {
  it("rejects an unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/staff/tickets");
    expect(res.status).toBe(401);
  });

  it("rejects a Requester with 403", async () => {
    const res = await requesterA.get("/api/staff/tickets");
    expect(res.status).toBe(403);
  });

  it("rejects an Administrator with 403 (Admins do not get ticket operations in Lab 3)", async () => {
    const res = await admin.get("/api/staff/tickets");
    expect(res.status).toBe(403);
  });

  it("returns tickets from ALL Requesters, not just one", async () => {
    const res = await staff.get("/api/staff/tickets").query({ search: tag, pageSize: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    const names = res.body.data.map((t: { requesterName: string }) => t.requesterName);
    expect(new Set(names).size).toBe(2);
  });

  it("returns the documented row shape, with a null owner for unassigned tickets", async () => {
    const res = await staff.get("/api/staff/tickets").query({ search: `${tag} bravo` });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const row = res.body.data[0];
    expect(row.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(row.categoryName).toBeDefined();
    expect(row.itPriority).toBe("MEDIUM"); // copied from requestedPriority at creation
    expect(row.currentStatus).toBe("NEW");
    expect(row.ownerName).toBeNull();
  });

  it("filters by currentStatus", async () => {
    const res = await staff.get("/api/staff/tickets").query({ search: tag, currentStatus: "OPEN" });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].summary).toContain("alpha");
  });

  it("filters by itPriority", async () => {
    const res = await staff.get("/api/staff/tickets").query({ search: tag, itPriority: "HIGH" });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].summary).toContain("charlie");
  });

  it("filters unassigned tickets", async () => {
    const res = await staff.get("/api/staff/tickets").query({ search: tag, ownerId: "unassigned" });

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((t: { ownerName: string | null }) => t.ownerName === null)).toBe(true);
  });

  it("filters by a specific owner", async () => {
    const res = await staff.get("/api/staff/tickets").query({ search: tag, ownerId: String(staffId) });

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((t: { ownerName: string }) => t.ownerName === "Queue Tester")).toBe(true);
  });

  it("paginates and only returns the matching combination (AC-17)", async () => {
    const page1 = await staff.get("/api/staff/tickets").query({ search: tag, pageSize: 3, page: 1 });
    const page2 = await staff.get("/api/staff/tickets").query({ search: tag, pageSize: 3, page: 2 });

    expect(page1.body.data).toHaveLength(3);
    expect(page2.body.data).toHaveLength(1);
    expect(page1.body.pagination.totalItems).toBe(4);
    expect(page1.body.pagination.totalPages).toBe(2);
  });

  it("sorts by itPriority descending (HIGH first)", async () => {
    const res = await staff.get("/api/staff/tickets").query({ search: tag, sortBy: "itPriority", sortDir: "desc" });

    expect(res.body.data[0].itPriority).toBe("HIGH");
  });

  it("falls back to default paging on invalid page/pageSize", async () => {
    const res = await staff.get("/api/staff/tickets").query({ page: "-5", pageSize: "9999" });

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(10);
  });

  it("returns an empty list when nothing matches", async () => {
    const res = await staff.get("/api/staff/tickets").query({ search: "no-such-ticket-xyz-987" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.totalItems).toBe(0);
  });
});

describe("GET /api/staff/owners", () => {
  it("lists active IT Staff for the Owner filter", async () => {
    const res = await staff.get("/api/staff/owners");

    expect(res.status).toBe(200);
    expect(res.body.some((o: { id: number }) => o.id === staffId)).toBe(true);
  });

  it("rejects a Requester with 403", async () => {
    const res = await requesterA.get("/api/staff/owners");
    expect(res.status).toBe(403);
  });
});
