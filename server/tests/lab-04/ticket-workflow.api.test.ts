import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createLoggedInUser } from "../helpers/auth.js";

type Agent = ReturnType<typeof request.agent>;

const prefix = "wf-tests-";
const tag = `WF-${Date.now()}`;

let staff: Agent;
let staffId: number;
let admin: Agent;
let requester: Agent;
let requesterId: number;

let categoryId: number;
let relatedSystemId: number;

async function createTicket(summarySuffix: string): Promise<number> {
  const res = await requester.post("/api/tickets").field({
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: `${tag} ${summarySuffix}`,
    description: "Ticket for workflow and resolution tests.",
    requestedPriority: "MEDIUM",
  });
  return res.body.id as number;
}

beforeAll(async () => {
  ({ agent: staff, userId: staffId } = await createLoggedInUser(
    `${prefix}staff@example.com`,
    "IT_STAFF",
    "Workflow Staff"
  ));
  ({ agent: admin } = await createLoggedInUser(
    `${prefix}admin@example.com`,
    "ADMINISTRATOR",
    "Workflow Admin"
  ));
  ({ agent: requester, userId: requesterId } = await createLoggedInUser(
    `${prefix}requester@example.com`,
    "REQUESTER",
    "Workflow Requester"
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

describe("Ticket Workflow and Resolution Rules (Lab 4 Issue 4)", () => {
  describe("Role Enforcement (BR-13, AC-11)", () => {
    it("rejects unauthenticated callers with 401", async () => {
      const id = await createTicket("auth-test");
      const res = await request(app)
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "OPEN" });
      expect(res.status).toBe(401);
    });

    it("rejects Requesters with 403 Forbidden", async () => {
      const id = await createTicket("requester-forbidden");
      const res = await requester
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "OPEN" });
      expect(res.status).toBe(403);
    });

    it("allows Administrators to perform status transitions (Handout §4.3)", async () => {
      const id = await createTicket("admin-transition");
      // staff claims ticket first (OPEN); admin then changes status (§4.3)
      await staff.post(`/api/staff/tickets/${id}/claim`);
      const res = await admin
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "IN_PROGRESS" });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("IN_PROGRESS");
    });
  });

  describe("Transition Matrix Enforcement (AC-07, BR-12)", () => {
    it("follows full happy-path lifecycle: CLAIM (OPEN) -> IN_PROGRESS -> WAITING_FOR_REQUESTER -> RESOLVED -> CLOSED -> REOPENED -> CANCELLED", async () => {
      const id = await createTicket("lifecycle-flow");

      // NEW -> OPEN via Claim
      const claimRes = await staff.post(`/api/staff/tickets/${id}/claim`);
      expect(claimRes.status).toBe(200);
      expect(claimRes.body.currentStatus).toBe("OPEN");

      // OPEN -> IN_PROGRESS
      const step1 = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "IN_PROGRESS" });
      expect(step1.status).toBe(200);
      expect(step1.body.currentStatus).toBe("IN_PROGRESS");

      // IN_PROGRESS -> WAITING_FOR_REQUESTER
      const step2 = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "WAITING_FOR_REQUESTER" });
      expect(step2.status).toBe(200);
      expect(step2.body.currentStatus).toBe("WAITING_FOR_REQUESTER");

      // WAITING_FOR_REQUESTER -> RESOLVED (ticket is owned by staff)
      const step3 = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "RESOLVED" });
      expect(step3.status).toBe(200);
      expect(step3.body.currentStatus).toBe("RESOLVED");

      // RESOLVED -> CLOSED
      const step4 = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "CLOSED" });
      expect(step4.status).toBe(200);
      expect(step4.body.currentStatus).toBe("CLOSED");

      // CLOSED -> REOPENED
      const step5 = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "REOPENED" });
      expect(step5.status).toBe(200);
      expect(step5.body.currentStatus).toBe("REOPENED");

      // REOPENED -> CANCELLED
      const step6 = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "CANCELLED" });
      expect(step6.status).toBe(200);
      expect(step6.body.currentStatus).toBe("CANCELLED");
    });

    it("rejects an unlisted transition with 400 and keeps the status intact (AC-07)", async () => {
      const id = await createTicket("unlisted-transition");
      // Ticket is NEW; transition directly to RESOLVED is invalid
      const res = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "RESOLVED" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid status transition");

      const check = await staff.get(`/api/staff/tickets/${id}`);
      expect(check.body.currentStatus).toBe("NEW");
    });

    it("treats CANCELLED as a terminal state and forbids further changes", async () => {
      const id = await createTicket("cancelled-terminal");
      await staff.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "CANCELLED" });

      const attempt = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "OPEN" });
      expect(attempt.status).toBe(400);
      expect(attempt.body.error).toBe("Invalid status transition");
    });
  });

  describe("Resolution Gate (AC-08, BR-14)", () => {
    it("blocks transitioning an unassigned ticket to RESOLVED with 400", async () => {
      const id = await createTicket("unassigned-resolve");
      // Transition NEW -> OPEN explicitly without claim (leaving owner null)
      await getPrisma().ticket.update({
        where: { id },
        data: { currentStatus: "OPEN", ownerId: null },
      });

      const res = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "RESOLVED" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Cannot resolve an unassigned ticket");

      const check = await staff.get(`/api/staff/tickets/${id}`);
      expect(check.body.currentStatus).toBe("OPEN");
    });

    it("allows transitioning to RESOLVED once an owner is assigned", async () => {
      const id = await createTicket("assigned-resolve");
      await staff.post(`/api/staff/tickets/${id}/claim`); // sets owner + OPEN

      const res = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "RESOLVED" });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("RESOLVED");
    });
  });

  describe("Reset of Requester Advisory Flag (BR-15)", () => {
    it("clears requesterConfirmedResolved when status transitions", async () => {
      const id = await createTicket("flag-reset");
      await staff.post(`/api/staff/tickets/${id}/claim`); // OPEN
      await staff.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "WAITING_FOR_REQUESTER" });

      // Requester marks problem appears resolved
      await requester.post(`/api/tickets/${id}/resolved-confirmation`).send({});
      const before = await requester.get(`/api/tickets/${id}`);
      expect(before.body.requesterConfirmedResolved).toBe(true);

      // Staff changes status to IN_PROGRESS
      const change = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "IN_PROGRESS" });
      expect(change.status).toBe(200);
      expect(change.body.requesterConfirmedResolved).toBe(false);

      const after = await requester.get(`/api/tickets/${id}`);
      expect(after.body.requesterConfirmedResolved).toBe(false);
    });
  });

  describe("Stale Update and Concurrency Handling (BR-16)", () => {
    it("rejects with 409 Conflict when expectedCurrentStatus does not match database state", async () => {
      const id = await createTicket("conflict-stale");
      await staff.post(`/api/staff/tickets/${id}/claim`); // currentStatus is now OPEN

      // Another client submits expecting NEW
      const res = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "IN_PROGRESS", expectedCurrentStatus: "NEW" });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("Conflict: Ticket status was modified by another user");
      expect(res.body.currentStatus).toBe("OPEN");
    });

    it("succeeds when expectedCurrentStatus matches database state", async () => {
      const id = await createTicket("conflict-match");
      await staff.post(`/api/staff/tickets/${id}/claim`); // currentStatus is OPEN

      const res = await staff
        .patch(`/api/staff/tickets/${id}/status`)
        .send({ currentStatus: "IN_PROGRESS", expectedCurrentStatus: "OPEN" });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("IN_PROGRESS");
    });
  });
});

