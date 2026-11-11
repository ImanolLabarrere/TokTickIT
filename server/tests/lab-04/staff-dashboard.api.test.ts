import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createLoggedInUser } from "../helpers/auth.js";

type Agent = ReturnType<typeof request.agent>;

const prefix = "stf-dash-";
const tag = `SDASH-${Date.now()}`;

let staffA: Agent;
let staffAId: number;
let staffB: Agent;
let staffBId: number;
let admin: Agent;
let adminId: number;
let requester: Agent;
let requesterId: number;

let categoryId: number;
let relatedSystemId: number;

async function createTicket(
  summary: string,
  itPriority = "MEDIUM"
): Promise<number> {
  const res = await requester.post("/api/tickets").field({
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: `${tag} ${summary}`,
    description: "Ticket for staff dashboard testing.",
    requestedPriority: "MEDIUM",
  });
  const id = res.body.id as number;
  if (itPriority !== "MEDIUM") {
    await getPrisma().ticket.update({
      where: { id },
      data: { itPriority: itPriority as "LOW" | "MEDIUM" | "HIGH" },
    });
  }
  return id;
}

beforeAll(async () => {
  ({ agent: staffA, userId: staffAId } = await createLoggedInUser(
    `${prefix}staff-a@example.com`,
    "IT_STAFF",
    "Staff Dashboard A"
  ));
  ({ agent: staffB, userId: staffBId } = await createLoggedInUser(
    `${prefix}staff-b@example.com`,
    "IT_STAFF",
    "Staff Dashboard B"
  ));
  ({ agent: admin, userId: adminId } = await createLoggedInUser(
    `${prefix}admin@example.com`,
    "ADMINISTRATOR",
    "Staff Dashboard Admin"
  ));
  ({ agent: requester, userId: requesterId } = await createLoggedInUser(
    `${prefix}req@example.com`,
    "REQUESTER",
    "Staff Dashboard Requester"
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

describe("GET /api/dashboard/staff (Lab 4 Issue 5)", () => {
  describe("Authentication and Role Enforcement (AC-11, BR-18)", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/dashboard/staff");
      expect(res.status).toBe(401);
    });

    it("rejects Requester callers with 403 Forbidden", async () => {
      const res = await requester.get("/api/dashboard/staff");
      expect(res.status).toBe(403);
    });

    it("allows IT Staff callers with 200 OK", async () => {
      const res = await staffA.get("/api/dashboard/staff");
      expect(res.status).toBe(200);
    });

    it("allows Administrator callers with 200 OK", async () => {
      const res = await admin.get("/api/dashboard/staff");
      expect(res.status).toBe(200);
    });
  });

  describe("IT Staff Operational Metrics (BR-18, AC-10)", () => {
    it("returns operational counts, breakdowns, and recent activity for IT Staff", async () => {
      const prisma = getPrisma();

      // Create known tickets
      const tUnassigned = await createTicket("Unassigned High Priority", "HIGH");
      const tAssignedA = await createTicket("Assigned to Staff A", "MEDIUM");
      const tAssignedB = await createTicket("Assigned to Staff B", "LOW");
      const tWaiting = await createTicket("Waiting Ticket", "MEDIUM");
      const tResolved = await createTicket("Resolved Ticket", "HIGH");

      await prisma.ticket.update({
        where: { id: tAssignedA },
        data: { ownerId: staffAId, currentStatus: "IN_PROGRESS" },
      });
      await prisma.ticket.update({
        where: { id: tAssignedB },
        data: { ownerId: staffBId, currentStatus: "OPEN" },
      });
      await prisma.ticket.update({
        where: { id: tWaiting },
        data: { ownerId: staffAId, currentStatus: "WAITING_FOR_REQUESTER" },
      });
      await prisma.ticket.update({
        where: { id: tResolved },
        data: { ownerId: staffAId, currentStatus: "RESOLVED" },
      });

      const res = await staffA.get("/api/dashboard/staff");
      expect(res.status).toBe(200);

      const { metrics, recentTickets } = res.body;

      // Status breakdowns should contain all valid statuses
      expect(metrics.statusCounts).toBeDefined();
      expect(metrics.statusCounts).toHaveProperty("NEW");
      expect(metrics.statusCounts).toHaveProperty("OPEN");
      expect(metrics.statusCounts).toHaveProperty("IN_PROGRESS");
      expect(metrics.statusCounts).toHaveProperty("WAITING_FOR_REQUESTER");
      expect(metrics.statusCounts).toHaveProperty("RESOLVED");
      expect(metrics.statusCounts).toHaveProperty("CLOSED");
      expect(metrics.statusCounts).toHaveProperty("REOPENED");
      expect(metrics.statusCounts).toHaveProperty("CANCELLED");

      // Priority breakdowns
      expect(metrics.priorityCounts).toBeDefined();
      expect(metrics.priorityCounts).toHaveProperty("HIGH");
      expect(metrics.priorityCounts).toHaveProperty("MEDIUM");
      expect(metrics.priorityCounts).toHaveProperty("LOW");

      // Staff A assigned count includes tAssignedA (IN_PROGRESS) + tWaiting (WAITING_FOR_REQUESTER)
      // but NOT tResolved (RESOLVED is excluded from active assigned)
      expect(metrics.myAssignedCount).toBeGreaterThanOrEqual(2);

      // Unassigned count includes tUnassigned (NEW)
      expect(metrics.unassignedCount).toBeGreaterThanOrEqual(1);

      // Waiting for requester count includes tWaiting
      expect(metrics.waitingForRequesterCount).toBeGreaterThanOrEqual(1);

      // High priority count includes tUnassigned (active HIGH)
      expect(metrics.highPriorityCount).toBeGreaterThanOrEqual(1);

      // IT Staff should NOT see totalActiveUsers
      expect(metrics.totalActiveUsers).toBeUndefined();

      // Recent tickets
      expect(Array.isArray(recentTickets)).toBe(true);
      expect(recentTickets.length).toBeLessThanOrEqual(5);
      const recent = recentTickets[0];
      expect(recent).toHaveProperty("id");
      expect(recent).toHaveProperty("ticketNumber");
      expect(recent).toHaveProperty("summary");
      expect(recent).toHaveProperty("currentStatus");
      expect(recent).toHaveProperty("itPriority");
      expect(recent).toHaveProperty("requesterName");
      expect(recent).toHaveProperty("ownerName");
      expect(recent).toHaveProperty("updatedAt");
    });
  });

  describe("Administrator Platform Overview (BR-19)", () => {
    it("includes totalActiveUsers in metrics for Administrator callers", async () => {
      const res = await admin.get("/api/dashboard/staff");
      expect(res.status).toBe(200);

      expect(res.body.metrics.totalActiveUsers).toBeDefined();
      expect(typeof res.body.metrics.totalActiveUsers).toBe("number");
      expect(res.body.metrics.totalActiveUsers).toBeGreaterThanOrEqual(4); // the 4 users created in beforeAll
    });
  });
});
