import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createLoggedInUser } from "../helpers/auth.js";

type Agent = ReturnType<typeof request.agent>;

const prefix = "act-tests-";
const tag = `ACT-${Date.now()}`;

let staffA: Agent;
let staffAId: number;
let staffB: Agent;
let staffBId: number;
let admin: Agent;
let requesterA: Agent;
let requesterAId: number;
let requesterB: Agent;
let requesterBId: number;

let categoryId: number;
let relatedSystemId: number;
let ticketAId: number;
let ticketBId: number;

beforeAll(async () => {
  ({ agent: staffA, userId: staffAId } = await createLoggedInUser(
    `${prefix}staff-a@example.com`,
    "IT_STAFF",
    "Actions Staff A"
  ));
  ({ agent: staffB, userId: staffBId } = await createLoggedInUser(
    `${prefix}staff-b@example.com`,
    "IT_STAFF",
    "Actions Staff B"
  ));
  ({ agent: admin } = await createLoggedInUser(
    `${prefix}admin@example.com`,
    "ADMINISTRATOR",
    "Actions Admin"
  ));
  ({ agent: requesterA, userId: requesterAId } = await createLoggedInUser(
    `${prefix}requester-a@example.com`,
    "REQUESTER",
    "Actions Requester A"
  ));
  ({ agent: requesterB, userId: requesterBId } = await createLoggedInUser(
    `${prefix}requester-b@example.com`,
    "REQUESTER",
    "Actions Requester B"
  ));

  const categories = await request(app).get("/api/categories");
  const relatedSystems = await request(app).get("/api/related-systems");
  categoryId = categories.body[0].id;
  relatedSystemId = relatedSystems.body[0].id;

  const resA = await requesterA.post("/api/tickets").field({
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: `${tag} Ticket Requester A`,
    description: "Ticket for actions taken test suite.",
    requestedPriority: "MEDIUM",
  });
  ticketAId = resA.body.id;

  const resB = await requesterB.post("/api/tickets").field({
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: `${tag} Ticket Requester B`,
    description: "Ticket for isolation test suite.",
    requestedPriority: "LOW",
  });
  ticketBId = resB.body.id;
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

describe("Actions Taken API (Lab 4 Issue 2)", () => {
  describe("Authentication and Role Restrictions (AC-01, AC-02, AC-11)", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const getRes = await request(app).get(`/api/tickets/${ticketAId}/actions`);
      expect(getRes.status).toBe(401);

      const postRes = await request(app)
        .post(`/api/tickets/${ticketAId}/actions`)
        .send({ actionDescription: "Test", result: "Done" });
      expect(postRes.status).toBe(401);

      const patchRes = await request(app)
        .patch("/api/actions/1")
        .send({ result: "Done" });
      expect(patchRes.status).toBe(401);
    });

    it("rejects a Requester attempting to create an Action Taken with 403 (AC-02)", async () => {
      const res = await requesterA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Requester trying to add action",
        result: "Should fail",
      });
      expect(res.status).toBe(403);
    });

    it("rejects a Requester attempting to patch an Action Taken with 403 (AC-02)", async () => {
      const res = await requesterA.patch("/api/actions/1").send({
        result: "Modified by requester",
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Creation and Attribution (AC-01, BR-01, BR-02, BR-03)", () => {
    it("lets IT Staff create an Action Taken, stamping performedBy automatically (AC-01, BR-03)", async () => {
      const payload = {
        actionDescription: "Replaced faulty network cable on desk 4.",
        result: "Gigabit link established without dropped packets.",
        followUpRequired: false,
        attachmentNotes: "cable_tester_output.png",
        performedById: 999999, // Should be safely ignored
      };

      const res = await staffA.post(`/api/tickets/${ticketAId}/actions`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.ticketId).toBe(ticketAId);
      expect(res.body.actionDescription).toBe(payload.actionDescription);
      expect(res.body.result).toBe(payload.result);
      expect(res.body.followUpRequired).toBe(false);
      expect(res.body.followUpNote).toBeNull();
      expect(res.body.attachmentNotes).toBe(payload.attachmentNotes);
      // Performer verified from session
      expect(res.body.performedById).toBe(staffAId);
      expect(res.body.performedByName).toBe("Actions Staff A");
      expect(res.body.performedByRole).toBe("IT_STAFF");
    });

    it("allows a different IT Staff member to log an action on the same ticket (BR-02)", async () => {
      const res = await staffB.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Assisted with switchport VLAN configuration.",
        result: "VLAN 20 tagged correctly.",
        followUpRequired: false,
      });

      expect(res.status).toBe(201);
      expect(res.body.performedById).toBe(staffBId);
      expect(res.body.performedByName).toBe("Actions Staff B");
    });

    it("allows an Administrator to create an Action Taken (Handout §4.3)", async () => {
      const res = await admin.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Admin oversight review.",
        result: "Approved network patch.",
      });

      expect(res.status).toBe(201);
      expect(res.body.performedByRole).toBe("ADMINISTRATOR");
    });

    it("returns 404 for an unknown ticket", async () => {
      const res = await staffA.post("/api/tickets/999999999/actions").send({
        actionDescription: "Non-existent ticket",
        result: "Failed",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("Validation Rules (AC-05, AC-06, BR-04, BR-05, BR-06, BR-07, BR-08)", () => {
    it("rejects empty description or empty result with 400", async () => {
      const res1 = await staffA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "   ",
        result: "Valid result",
      });
      expect(res1.status).toBe(400);
      expect(res1.body.fields.actionDescription).toBeDefined();

      const res2 = await staffA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Valid description",
        result: "",
      });
      expect(res2.status).toBe(400);
      expect(res2.body.fields.result).toBeDefined();
    });

    it("requires a follow-up note when followUpRequired is true (AC-05, BR-07)", async () => {
      const res = await staffA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Temporary workaround applied.",
        result: "Service restored temporarily.",
        followUpRequired: true,
        // followUpNote missing
      });

      expect(res.status).toBe(400);
      expect(res.body.fields.followUpNote).toBeDefined();
    });

    it("accepts valid follow-up note when followUpRequired is true", async () => {
      const res = await staffA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Temporary workaround applied.",
        result: "Service restored temporarily.",
        followUpRequired: true,
        followUpNote: "Permanent fix scheduled for next maintenance window.",
      });

      expect(res.status).toBe(201);
      expect(res.body.followUpRequired).toBe(true);
      expect(res.body.followUpNote).toBe("Permanent fix scheduled for next maintenance window.");
    });

    it("sets followUpNote to null when followUpRequired is false (AC-06)", async () => {
      const res = await staffA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Complete resolution.",
        result: "Fixed.",
        followUpRequired: false,
        followUpNote: "This note should be ignored",
      });

      expect(res.status).toBe(201);
      expect(res.body.followUpRequired).toBe(false);
      expect(res.body.followUpNote).toBeNull();
    });

    it("rejects actionDateTime in the future (BR-04)", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await staffA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDateTime: futureDate,
        actionDescription: "Future time test",
        result: "Should fail",
      });

      expect(res.status).toBe(400);
      expect(res.body.fields.actionDateTime).toBeDefined();
    });
  });

  describe("Retrieval and Requester Isolation (AC-03, AC-04, BR-09)", () => {
    it("allows a Requester to view Actions Taken on their own ticket (AC-03)", async () => {
      const res = await requesterA.get(`/api/tickets/${ticketAId}/actions`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].ticketId).toBe(ticketAId);
      expect(res.body[0].performedByName).toBeDefined();
    });

    it("returns 404 when a Requester queries actions for another user's ticket (AC-04, BR-09)", async () => {
      // Requester B tries to read actions on Requester A's ticket
      const res = await requesterB.get(`/api/tickets/${ticketAId}/actions`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Ticket not found.");
    });

    it("allows IT Staff to view actions on any ticket", async () => {
      const res = await staffA.get(`/api/tickets/${ticketBId}/actions`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Action Taken Update (BR-10)", () => {
    it("allows IT Staff to update an existing Action Taken", async () => {
      const created = await staffA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Initial observation",
        result: "Pending diagnostics",
      });
      const actionId = created.body.id;

      const updateRes = await staffA.patch(`/api/actions/${actionId}`).send({
        result: "Updated: diagnostics completed successfully",
        followUpRequired: true,
        followUpNote: "Schedule follow-up call with vendor",
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.id).toBe(actionId);
      expect(updateRes.body.result).toBe("Updated: diagnostics completed successfully");
      expect(updateRes.body.followUpRequired).toBe(true);
      expect(updateRes.body.followUpNote).toBe("Schedule follow-up call with vendor");
    });

    it("rejects an invalid update with 400", async () => {
      const created = await staffA.post(`/api/tickets/${ticketAId}/actions`).send({
        actionDescription: "Action for bad patch",
        result: "Good",
      });
      const actionId = created.body.id;

      const res = await staffA.patch(`/api/actions/${actionId}`).send({
        actionDescription: "   ",
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 for an unknown action id", async () => {
      const res = await staffA.patch("/api/actions/999999999").send({
        result: "Something",
      });
      expect(res.status).toBe(404);
    });
  });
});
