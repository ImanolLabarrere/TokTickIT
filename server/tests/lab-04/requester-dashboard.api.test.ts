import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createLoggedInUser } from "../helpers/auth.js";

type Agent = ReturnType<typeof request.agent>;

const prefix = "req-dash-";
const tag = `DASH-${Date.now()}`;

let requesterA: Agent;
let requesterAId: number;
let requesterB: Agent;
let requesterBId: number;
let staff: Agent;
let admin: Agent;

let categoryId: number;
let relatedSystemId: number;

async function createTicketFor(
  agent: Agent,
  summary: string,
  priority = "MEDIUM"
): Promise<number> {
  const res = await agent.post("/api/tickets").field({
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: `${tag} ${summary}`,
    description: "Ticket for requester dashboard testing.",
    requestedPriority: priority,
  });
  return res.body.id as number;
}

beforeAll(async () => {
  ({ agent: requesterA, userId: requesterAId } = await createLoggedInUser(
    `${prefix}req-a@example.com`,
    "REQUESTER",
    "Dashboard Requester A"
  ));
  ({ agent: requesterB, userId: requesterBId } = await createLoggedInUser(
    `${prefix}req-b@example.com`,
    "REQUESTER",
    "Dashboard Requester B"
  ));
  ({ agent: staff } = await createLoggedInUser(
    `${prefix}staff@example.com`,
    "IT_STAFF",
    "Dashboard Staff"
  ));
  ({ agent: admin } = await createLoggedInUser(
    `${prefix}admin@example.com`,
    "ADMINISTRATOR",
    "Dashboard Admin"
  ));

  const categories = await request(app).get("/api/categories");
  const relatedSystems = await request(app).get("/api/related-systems");
  categoryId = categories.body[0].id;
  relatedSystemId = relatedSystems.body[0].id;
});

afterAll(async () => {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  const tickets = await prisma.ticket.findMany({
    where: { requesterId: { in: userIds } },
    select: { id: true },
  });
  const ticketIds = tickets.map((t) => t.id);

  await prisma.actionTaken.deleteMany({
    where: { OR: [{ ticketId: { in: ticketIds } }, { performedById: { in: userIds } }] },
  });
  await prisma.publicComment.deleteMany({
    where: { OR: [{ ticketId: { in: ticketIds } }, { authorId: { in: userIds } }] },
  });
  await prisma.internalNote.deleteMany({
    where: { OR: [{ ticketId: { in: ticketIds } }, { authorId: { in: userIds } }] },
  });
  await prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("GET /api/dashboard/requester (Lab 4 Issue 5)", () => {
  describe("Authentication and Role Enforcement (AC-11, BR-17)", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/dashboard/requester");
      expect(res.status).toBe(401);
    });

    it("rejects IT Staff callers with 403 Forbidden", async () => {
      const res = await staff.get("/api/dashboard/requester");
      expect(res.status).toBe(403);
    });

    it("rejects Administrator callers with 403 Forbidden", async () => {
      const res = await admin.get("/api/dashboard/requester");
      expect(res.status).toBe(403);
    });
  });

  describe("Empty State (BR-20)", () => {
    it("returns zero counts and empty list for a requester with no tickets", async () => {
      const res = await requesterB.get("/api/dashboard/requester");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        metrics: {
          openTickets: 0,
          waitingForRequester: 0,
          resolvedTickets: 0,
        },
        recentTickets: [],
      });
    });
  });

  describe("Metrics Scoping and Accurate Counts (BR-17, AC-09)", () => {
    it("aggregates metrics strictly for the authenticated Requester", async () => {
      const prisma = getPrisma();

      // Create tickets for Requester A across various statuses
      const t1 = await createTicketFor(requesterA, "Open Ticket 1", "HIGH");
      const t2 = await createTicketFor(requesterA, "Waiting Ticket", "MEDIUM");
      const t3 = await createTicketFor(requesterA, "Resolved Ticket", "LOW");
      const t4 = await createTicketFor(requesterA, "Cancelled Ticket", "LOW");

      // Manually set statuses to test categorization
      await prisma.ticket.update({
        where: { id: t2 },
        data: { currentStatus: "WAITING_FOR_REQUESTER" },
      });
      await prisma.ticket.update({
        where: { id: t3 },
        data: { currentStatus: "RESOLVED" },
      });
      await prisma.ticket.update({
        where: { id: t4 },
        data: { currentStatus: "CANCELLED" },
      });

      // Create a ticket for Requester B to ensure isolation
      await createTicketFor(requesterB, "Requester B Ticket", "HIGH");

      const res = await requesterA.get("/api/dashboard/requester");
      expect(res.status).toBe(200);

      // Requester A should have:
      // - openTickets: t1 (NEW) + t2 (WAITING_FOR_REQUESTER) = 2
      // - waitingForRequester: t2 = 1
      // - resolvedTickets: t3 = 1
      // - cancelled (t4) should not be counted in open or resolved
      expect(res.body.metrics.openTickets).toBe(2);
      expect(res.body.metrics.waitingForRequester).toBe(1);
      expect(res.body.metrics.resolvedTickets).toBe(1);

      // Recent tickets should only contain Requester A's tickets (4 total)
      expect(res.body.recentTickets).toHaveLength(4);
      expect(res.body.recentTickets.every((t: { id: number }) => t.id !== undefined)).toBe(true);

      const recentIds = res.body.recentTickets.map((t: { id: number }) => t.id);
      expect(recentIds).toContain(t1);
      expect(recentIds).toContain(t2);
      expect(recentIds).toContain(t3);
      expect(recentIds).toContain(t4);

      // Fields in recent ticket
      const first = res.body.recentTickets[0];
      expect(first).toHaveProperty("ticketNumber");
      expect(first).toHaveProperty("summary");
      expect(first).toHaveProperty("currentStatus");
      expect(first).toHaveProperty("requestedPriority");
      expect(first).toHaveProperty("updatedAt");
    });
  });
});
