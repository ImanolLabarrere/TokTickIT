import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createLoggedInRequester } from "../helpers/auth.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
// Lab 3 Issue 3: identity now comes from an authenticated session (cookie),
// not the retired X-Requester-Id header — see server/tests/helpers/auth.ts.
let agent: ReturnType<typeof request.agent>;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  ({ agent } = await createLoggedInRequester("create-ticket-tests@example.com"));

  const categories = await request(app).get("/api/categories");
  categoryId = categories.body[0].id;

  const relatedSystems = await request(app).get("/api/related-systems");
  relatedSystemId = relatedSystems.body[0].id;
});

function validPayload() {
  return {
    categoryId: String(categoryId),
    relatedSystemId: String(relatedSystemId),
    summary: "Laptop battery drains quickly",
    description: "The battery drains much faster than usual, even when the laptop is idle.",
    requestedPriority: "MEDIUM",
  };
}

describe("POST /api/tickets", () => {
  // AC-01
  it("creates a ticket and returns a backend-generated ticket number", async () => {
    const res = await agent.post("/api/tickets").field(validPayload());

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
  });

  // BR-03 — ownership now comes from the session, not client input.
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/tickets").field(validPayload());
    expect(res.status).toBe(401);
  });

  // AC-04 / BR-07
  it("rejects a missing Summary with a field-level error", async () => {
    const res = await agent.post("/api/tickets").field({ ...validPayload(), summary: "" });

    expect(res.status).toBe(400);
    expect(res.body.fields.summary).toBeDefined();
  });

  // BR-10
  it("rejects an unknown categoryId", async () => {
    const res = await agent.post("/api/tickets").field({ ...validPayload(), categoryId: "999999" });

    expect(res.status).toBe(400);
    expect(res.body.fields.categoryId).toBeDefined();
  });

  // AC-11
  it("accepts a valid PNG attachment", async () => {
    const res = await agent
      .post("/api/tickets")
      .field(validPayload())
      .attach("attachments", Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: "screenshot.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(201);
  });

  // AC-12 / BR-14
  it("rejects a disallowed attachment type", async () => {
    const res = await agent
      .post("/api/tickets")
      .field(validPayload())
      .attach("attachments", Buffer.from("not an image"), {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(400);
  });
});
