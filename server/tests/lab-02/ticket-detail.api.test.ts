import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createLoggedInRequester } from "../helpers/auth.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
let agent: ReturnType<typeof request.agent>;
let otherAgent: ReturnType<typeof request.agent>;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;

beforeAll(async () => {
  ({ agent } = await createLoggedInRequester("ticket-detail-tests-a@example.com"));
  ({ agent: otherAgent } = await createLoggedInRequester("ticket-detail-tests-b@example.com"));

  const categories = await request(app).get("/api/categories");
  categoryId = categories.body[0].id;

  const relatedSystems = await request(app).get("/api/related-systems");
  relatedSystemId = relatedSystems.body[0].id;

  const created = await agent.post("/api/tickets").field({
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: "Ticket detail test summary",
    description: "Seeded for GET /api/tickets/:id tests.",
    requestedPriority: "LOW",
  });
  ticketId = created.body.id;
});

describe("GET /api/tickets/:id", () => {
  it("returns the full ticket with attachments and public comments for the owning Requester", async () => {
    const res = await agent.get(`/api/tickets/${ticketId}`);

    expect(res.status).toBe(200);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.category.name).toBeDefined();
    expect(res.body.relatedSystem.name).toBeDefined();
    expect(Array.isArray(res.body.attachments)).toBe(true);
    expect(Array.isArray(res.body.publicComments)).toBe(true);
    expect(res.body.requesterConfirmedResolved).toBe(false);
  });

  it("returns 404 for a Ticket owned by a different Requester", async () => {
    const res = await otherAgent.get(`/api/tickets/${ticketId}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a non-existent Ticket id", async () => {
    const res = await agent.get("/api/tickets/999999999");
    expect(res.status).toBe(404);
  });
});

// Lab 3 Issue 3 — FR-05: Public Comments + "Problem Appears Resolved".
describe("POST /api/tickets/:id/comments", () => {
  it("posts a Public Comment on the Requester's own ticket", async () => {
    const res = await agent.post(`/api/tickets/${ticketId}/comments`).send({
      content: "Just adding that this also happens on battery power.",
    });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Just adding that this also happens on battery power.");
    expect(res.body.authorName).toBeDefined();

    const detail = await agent.get(`/api/tickets/${ticketId}`);
    expect(detail.body.publicComments.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects an empty comment", async () => {
    const res = await agent.post(`/api/tickets/${ticketId}/comments`).send({ content: "   " });
    expect(res.status).toBe(400);
  });

  it("returns 404 when posting a comment on another Requester's ticket", async () => {
    const res = await otherAgent.post(`/api/tickets/${ticketId}/comments`).send({ content: "Hi" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/resolved-confirmation", () => {
  it("flags the Requester's own ticket as appearing resolved", async () => {
    const res = await agent.post(`/api/tickets/${ticketId}/resolved-confirmation`).send({});
    expect(res.status).toBe(200);
    expect(res.body.requesterConfirmedResolved).toBe(true);

    const detail = await agent.get(`/api/tickets/${ticketId}`);
    expect(detail.body.requesterConfirmedResolved).toBe(true);
  });

  it("returns 404 for another Requester's ticket", async () => {
    const res = await otherAgent.post(`/api/tickets/${ticketId}/resolved-confirmation`).send({});
    expect(res.status).toBe(404);
  });
});
