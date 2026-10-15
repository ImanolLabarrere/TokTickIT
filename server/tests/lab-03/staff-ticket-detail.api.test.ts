import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createLoggedInUser } from "../helpers/auth.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
type Agent = ReturnType<typeof request.agent>;

let staffA: Agent;
let staffAId: number;
let staffB: Agent;
let staffBId: number;
let requester: Agent;
let requesterId: number;
let otherRequester: Agent;
let admin: Agent;
let inactiveStaffId: number;
let categoryId: number;
let relatedSystemId: number;
const tag = `STAFFD-${Date.now()}`;

async function newTicket(label: string): Promise<number> {
  const res = await requester.post("/api/tickets").field({
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: `${tag} ${label}`,
    description: "Seeded for the staff ticket detail tests.",
    requestedPriority: "MEDIUM",
  });
  return res.body.id as number;
}

beforeAll(async () => {
  ({ agent: staffA, userId: staffAId } = await createLoggedInUser("staff-detail-tests-a@example.com", "IT_STAFF", "Staff Alpha"));
  ({ agent: staffB, userId: staffBId } = await createLoggedInUser("staff-detail-tests-b@example.com", "IT_STAFF", "Staff Bravo"));
  ({ agent: requester, userId: requesterId } = await createLoggedInUser("staff-detail-tests-req@example.com", "REQUESTER", "Detail Requester"));
  ({ agent: otherRequester } = await createLoggedInUser("staff-detail-tests-req2@example.com", "REQUESTER", "Other Requester"));
  ({ agent: admin } = await createLoggedInUser("staff-detail-tests-admin@example.com", "ADMINISTRATOR", "Detail Admin"));

  const inactive = await getPrisma().user.upsert({
    where: { email: "staff-detail-tests-inactive@example.com" },
    update: { isActive: false, role: "IT_STAFF" },
    create: {
      name: "Inactive Staff",
      email: "staff-detail-tests-inactive@example.com",
      passwordHash: "not-a-real-hash",
      isActive: false,
      mustChangePassword: false,
      role: "IT_STAFF",
    },
  });
  inactiveStaffId = inactive.id;

  const categories = await request(app).get("/api/categories");
  const relatedSystems = await request(app).get("/api/related-systems");
  categoryId = categories.body[0].id;
  relatedSystemId = relatedSystems.body[0].id;
});

describe("authorization of staff ticket operations", () => {
  let ticketId: number;
  beforeAll(async () => {
    ticketId = await newTicket("authz");
  });

  it("rejects unauthenticated callers with 401", async () => {
    expect((await request(app).get(`/api/staff/tickets/${ticketId}`)).status).toBe(401);
    expect((await request(app).post(`/api/staff/tickets/${ticketId}/claim`)).status).toBe(401);
  });

  it("rejects a Requester on every staff route with 403 and no note content (AC-08)", async () => {
    const detail = await requester.get(`/api/staff/tickets/${ticketId}`);
    expect(detail.status).toBe(403);
    expect(detail.body.internalNotes).toBeUndefined();
    expect((await requester.post(`/api/staff/tickets/${ticketId}/notes`).send({ content: "x" })).status).toBe(403);
    expect((await requester.post(`/api/staff/tickets/${ticketId}/claim`)).status).toBe(403);
    expect((await requester.patch(`/api/staff/tickets/${ticketId}/status`).send({ currentStatus: "OPEN" })).status).toBe(403);
    expect((await requester.patch(`/api/staff/tickets/${ticketId}/priority`).send({ itPriority: "LOW" })).status).toBe(403);
  });

  it("rejects an Administrator on staff routes with 403 (matrix: no ticket operations)", async () => {
    expect((await admin.get(`/api/staff/tickets/${ticketId}`)).status).toBe(403);
    expect((await admin.post(`/api/staff/tickets/${ticketId}/claim`)).status).toBe(403);
    expect((await admin.post(`/api/tickets/${ticketId}/comments`).send({ content: "hi" })).status).toBe(403);
  });
});

describe("GET /api/staff/tickets/:id", () => {
  it("returns the full ticket with attachments, public comments and internal notes", async () => {
    const id = await newTicket("detail");
    await staffA.post(`/api/staff/tickets/${id}/notes`).send({ content: "Private staff note" });
    await staffA.post(`/api/tickets/${id}/comments`).send({ content: "Public staff reply" });

    const res = await staffA.get(`/api/staff/tickets/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.requester.name).toBe("Detail Requester");
    expect(Array.isArray(res.body.attachments)).toBe(true);
    expect(res.body.internalNotes[0].content).toBe("Private staff note");
    expect(res.body.internalNotes[0].authorRole).toBe("IT_STAFF");
    expect(res.body.publicComments[0].content).toBe("Public staff reply");
  });

  it("returns 404 for an unknown ticket", async () => {
    expect((await staffA.get("/api/staff/tickets/999999999")).status).toBe(404);
  });
});

describe("claim (FR-07, BR-09)", () => {
  it("makes the caller the owner and moves a NEW ticket to OPEN (AC-09)", async () => {
    const id = await newTicket("claim");
    const res = await staffA.post(`/api/staff/tickets/${id}/claim`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ownerId: staffAId, ownerName: "Staff Alpha", currentStatus: "OPEN" });
  });

  it("returns 409 when someone else already owns the ticket, and is idempotent for the owner", async () => {
    const id = await newTicket("claim-conflict");
    await staffA.post(`/api/staff/tickets/${id}/claim`);

    expect((await staffB.post(`/api/staff/tickets/${id}/claim`)).status).toBe(409);
    expect((await staffA.post(`/api/staff/tickets/${id}/claim`)).status).toBe(200);
  });
});

describe("assign (FR-07, BR-08, BR-10)", () => {
  let id: number;
  beforeAll(async () => {
    id = await newTicket("assign");
  });

  it("reassigns to another active IT Staff member", async () => {
    const res = await staffA.post(`/api/staff/tickets/${id}/assign`).send({ ownerId: staffBId });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ownerId: staffBId, ownerName: "Staff Bravo" });
  });

  it("rejects a Requester, an inactive user and an unknown user as owner with 400", async () => {
    expect((await staffA.post(`/api/staff/tickets/${id}/assign`).send({ ownerId: requesterId })).status).toBe(400);
    expect((await staffA.post(`/api/staff/tickets/${id}/assign`).send({ ownerId: inactiveStaffId })).status).toBe(400);
    expect((await staffA.post(`/api/staff/tickets/${id}/assign`).send({ ownerId: 999999999 })).status).toBe(400);
  });

  it("returns 404 for an unknown ticket", async () => {
    expect((await staffA.post("/api/staff/tickets/999999999/assign").send({ ownerId: staffBId })).status).toBe(404);
  });
});

describe("IT Priority (FR-08, BR-11)", () => {
  it("updates the IT Priority but never the Requested Priority", async () => {
    const id = await newTicket("priority");
    const res = await staffA.patch(`/api/staff/tickets/${id}/priority`).send({ itPriority: "HIGH" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itPriority: "HIGH" });

    const detail = await staffA.get(`/api/staff/tickets/${id}`);
    expect(detail.body.itPriority).toBe("HIGH");
    expect(detail.body.requestedPriority).toBe("MEDIUM");
  });

  it("rejects an invalid priority with 400", async () => {
    const id = await newTicket("priority-invalid");
    expect((await staffA.patch(`/api/staff/tickets/${id}/priority`).send({ itPriority: "URGENT" })).status).toBe(400);
  });
});

describe("status transitions (FR-08, BR-12, BR-14)", () => {
  it("allows a listed transition", async () => {
    const id = await newTicket("status-ok");
    await staffA.post(`/api/staff/tickets/${id}/claim`); // NEW -> OPEN
    const res = await staffA.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "IN_PROGRESS" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentStatus: "IN_PROGRESS" });
  });

  it("rejects an unlisted transition with 400 and leaves the status unchanged (AC-10)", async () => {
    const id = await newTicket("status-bad");
    const res = await staffA.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "RESOLVED" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: "Invalid status transition", from: "NEW", to: "RESOLVED" });
    const detail = await staffA.get(`/api/staff/tickets/${id}`);
    expect(detail.body.currentStatus).toBe("NEW");
  });

  it("treats CANCELLED as terminal", async () => {
    const id = await newTicket("status-cancelled");
    expect((await staffA.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "CANCELLED" })).status).toBe(200);
    expect((await staffA.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "OPEN" })).status).toBe(400);
  });

  it("rejects an unknown status value with 400", async () => {
    const id = await newTicket("status-unknown");
    expect((await staffA.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "DONE" })).status).toBe(400);
  });

  it("clears the Requester's 'appears resolved' flag when the status changes (AC-11)", async () => {
    const id = await newTicket("flag-reset");
    await staffA.post(`/api/staff/tickets/${id}/claim`);
    await requester.post(`/api/tickets/${id}/resolved-confirmation`).send({});
    expect((await requester.get(`/api/tickets/${id}`)).body.requesterConfirmedResolved).toBe(true);

    await staffA.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "IN_PROGRESS" });

    expect((await requester.get(`/api/tickets/${id}`)).body.requesterConfirmedResolved).toBe(false);
  });
});

describe("Internal Notes (FR-09, BR-15, BR-16)", () => {
  it("lets IT Staff post a note and returns it with the author", async () => {
    const id = await newTicket("notes");
    const res = await staffA.post(`/api/staff/tickets/${id}/notes`).send({ content: "  Checked the logs.  " });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ content: "Checked the logs.", authorName: "Staff Alpha", authorRole: "IT_STAFF" });
  });

  it("rejects empty and over-long notes with 400", async () => {
    const id = await newTicket("notes-invalid");
    expect((await staffA.post(`/api/staff/tickets/${id}/notes`).send({ content: "   " })).status).toBe(400);
    expect((await staffA.post(`/api/staff/tickets/${id}/notes`).send({ content: "x".repeat(2001) })).status).toBe(400);
  });

  it("never exposes Internal Notes to the Requester", async () => {
    const id = await newTicket("notes-private");
    await staffA.post(`/api/staff/tickets/${id}/notes`).send({ content: "Do not show the requester" });

    const res = await requester.get(`/api/tickets/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.internalNotes).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("Do not show the requester");
  });
});

describe("Public Comments by IT Staff (FR-09)", () => {
  it("lets IT Staff comment on any ticket and the Requester sees the staff role", async () => {
    const id = await newTicket("staff-comment");
    const res = await staffA.post(`/api/tickets/${id}/comments`).send({ content: "We are on it." });
    expect(res.status).toBe(201);
    expect(res.body.authorRole).toBe("IT_STAFF");

    const detail = await requester.get(`/api/tickets/${id}`);
    expect(detail.body.publicComments[0]).toMatchObject({ content: "We are on it.", authorRole: "IT_STAFF" });
  });

  it("still returns 404 when a Requester comments on someone else's ticket", async () => {
    const id = await newTicket("comment-other");
    expect((await otherRequester.post(`/api/tickets/${id}/comments`).send({ content: "Hi" })).status).toBe(404);
  });
});
