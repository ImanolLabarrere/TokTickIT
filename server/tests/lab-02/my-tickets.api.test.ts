import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
let requesterId: number;
let otherRequesterId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  const requesters = await request(app).get("/api/requesters");
  requesterId = requesters.body[0].id;
  otherRequesterId = requesters.body[1].id;

  const categories = await request(app).get("/api/categories");
  categoryId = categories.body[0].id;

  const relatedSystems = await request(app).get("/api/related-systems");
  relatedSystemId = relatedSystems.body[0].id;

  const tag = `MYTICKETS-${Date.now()}`;

  async function createTicket(requester: number, summary: string, priority: string) {
    return request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester))
      .field({
        categoryId: String(categoryId),
        relatedSystemId: String(relatedSystemId),
        summary,
        description: "Seeded for GET /api/tickets tests.",
        requestedPriority: priority,
      });
  }

  await createTicket(requesterId, `${tag} laptop battery drains quickly`, "MEDIUM");
  await createTicket(requesterId, `${tag} VPN connection drops`, "HIGH");
  await createTicket(requesterId, `${tag} printer offline`, "LOW");
  await createTicket(otherRequesterId, `${tag} a different requester's ticket`, "LOW");
});

describe("GET /api/tickets", () => {
  it("rejects a request with no X-Requester-Id header", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(400);
  });

  it("only returns the current Requester's own tickets", async () => {
    const res = await request(app).get("/api/tickets").set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(200);
    const summaries = res.body.data.map((t: { summary: string }) => t.summary);
    expect(summaries.some((s: string) => s.includes("a different requester's ticket"))).toBe(false);
  });

  it("supports search by summary", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: "VPN connection drops" })
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      res.body.data.every((t: { summary: string }) => t.summary.includes("VPN connection drops"))
    ).toBe(true);
  });

  it("supports filtering by requestedPriority", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ requestedPriority: "HIGH", pageSize: 50 })
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(200);
    expect(
      res.body.data.every((t: { requestedPriority: string }) => t.requestedPriority === "HIGH")
    ).toBe(true);
  });

  it("supports sorting by ticketNumber ascending", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ sortBy: "ticketNumber", sortDir: "asc", pageSize: 50 })
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((t: { ticketNumber: string }) => t.ticketNumber);
    expect(numbers).toEqual([...numbers].sort());
  });

  it("falls back to default paging on invalid page/pageSize", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ page: "-5", pageSize: "9999" })
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(10);
  });

  it("returns an empty array and zero totalItems when a filter matches nothing", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: "no-such-ticket-summary-xyz-123" })
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.totalItems).toBe(0);
  });
});
