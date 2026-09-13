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
      summary: "Attachment lifecycle test",
      description: "Seeded for attachment lifecycle tests.",
      requestedPriority: "LOW",
    });
  ticketId = created.body.id;
});

function png() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47]);
}

describe("POST /api/tickets/:id/attachments", () => {
  it("adds a valid attachment to an existing ticket", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterId))
      .attach("attachments", png(), { filename: "extra.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    expect(res.body.attachments.length).toBeGreaterThan(0);
  });

  it("rejects adding an attachment to a Ticket owned by another Requester", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(otherRequesterId))
      .attach("attachments", png(), { filename: "extra.png", contentType: "image/png" });

    expect(res.status).toBe(404);
  });
});

describe("attachment download and soft removal", () => {
  let attachmentId: number;

  beforeAll(async () => {
    const detail = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", String(requesterId));
    attachmentId = detail.body.attachments[0].id;
  });

  it("downloads an active attachment", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(200);
  });

  it("rejects removal without a reason", async () => {
    const res = await request(app)
      .patch(`/api/attachments/${attachmentId}/remove`)
      .set("X-Requester-Id", String(requesterId))
      .send({ reason: "" });

    expect(res.status).toBe(400);
  });

  it("soft-removes an attachment with a valid reason", async () => {
    const res = await request(app)
      .patch(`/api/attachments/${attachmentId}/remove`)
      .set("X-Requester-Id", String(requesterId))
      .send({ reason: "Uploaded the wrong file." });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
  });

  it("blocks downloading a removed attachment with 410", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requesterId));

    expect(res.status).toBe(410);
  });

  it("rejects removing an already-removed attachment", async () => {
    const res = await request(app)
      .patch(`/api/attachments/${attachmentId}/remove`)
      .set("X-Requester-Id", String(requesterId))
      .send({ reason: "Trying again." });

    expect(res.status).toBe(400);
  });
});
