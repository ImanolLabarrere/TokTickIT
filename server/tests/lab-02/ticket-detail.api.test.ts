import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
let requesterId: number;
let otherRequesterId: number;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;

beforeAll(async () => {
  const requesters = await request(app).get("/api/requesters");
  requesterId = requesters.body[0].id;
  otherRequesterId = requesters.body[1].id;

  const categories = await request(app).get("/api/categories");
  categoryId = categories.body[0].id;

  const relatedSystems = await request(app).get("/api/related-systems");
  relatedSystemId = relatedSystems.body[0].id;

  const created = await request(app)
    .post("/api/tickets")
    .set("X-Requester-Id", String(requesterId))
    .field({
      categoryId: String(categoryId),
      relatedSystemId: String(relatedSystemId),
      summary: "Ticket detail test summary",
      description: "Seeded for GET /api/tickets/:id tests.",
      requestedPriority: "LOW",
    });
  ticketId = created.body.id;
});

describe("GET /api/tickets/:id", () => {
  it("returns the full ticket with attachments for the owning Requester", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(200);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.category.name).toBeDefined();
    expect(res.body.relatedSystem.name).toBeDefined();
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  it("returns 404 for a Ticket owned by a different Requester", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", String(otherRequesterId));

    expect(res.status).toBe(404);
  });

  it("returns 404 for a non-existent Ticket id", async () => {
    const res = await request(app)
      .get("/api/tickets/999999999")
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(404);
  });
});
