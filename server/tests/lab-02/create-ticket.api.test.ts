import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
let requesterId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  const requesters = await request(app).get("/api/requesters");
  requesterId = requesters.body[0].id;

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
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requesterId))
      .field(validPayload());

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
  });

  // BR-19
  it("rejects a request with no X-Requester-Id header", async () => {
    const res = await request(app).post("/api/tickets").field(validPayload());
    expect(res.status).toBe(400);
  });

  // BR-19
  it("rejects an unknown Requester id", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "999999")
      .field(validPayload());
    expect(res.status).toBe(400);
  });

  // AC-04 / BR-07
  it("rejects a missing Summary with a field-level error", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requesterId))
      .field({ ...validPayload(), summary: "" });

    expect(res.status).toBe(400);
    expect(res.body.fields.summary).toBeDefined();
  });

  // BR-10
  it("rejects an unknown categoryId", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requesterId))
      .field({ ...validPayload(), categoryId: "999999" });

    expect(res.status).toBe(400);
    expect(res.body.fields.categoryId).toBeDefined();
  });

  // AC-11
  it("accepts a valid PNG attachment", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requesterId))
      .field(validPayload())
      .attach("attachments", Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: "screenshot.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(201);
  });

  // AC-12 / BR-14
  it("rejects a disallowed attachment type", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requesterId))
      .field(validPayload())
      .attach("attachments", Buffer.from("not an image"), {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(400);
  });
});
