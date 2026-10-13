import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createLoggedInRequester } from "../helpers/auth.js";

let agent: ReturnType<typeof request.agent>;
let otherAgent: ReturnType<typeof request.agent>;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;

beforeAll(async () => {
  ({ agent } = await createLoggedInRequester("attachments-tests-a@example.com"));
  ({ agent: otherAgent } = await createLoggedInRequester("attachments-tests-b@example.com"));

  const categories = await request(app).get("/api/categories");
  categoryId = categories.body[0].id;

  const relatedSystems = await request(app).get("/api/related-systems");
  relatedSystemId = relatedSystems.body[0].id;

  const created = await agent.post("/api/tickets").field({
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
    const res = await agent
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("attachments", png(), { filename: "extra.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    expect(res.body.attachments.length).toBeGreaterThan(0);
  });

  it("rejects adding an attachment to a Ticket owned by another Requester", async () => {
    const res = await otherAgent
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("attachments", png(), { filename: "extra.png", contentType: "image/png" });

    expect(res.status).toBe(404);
  });
});

describe("attachment download and soft removal", () => {
  let attachmentId: number;

  beforeAll(async () => {
    const detail = await agent.get(`/api/tickets/${ticketId}`);
    attachmentId = detail.body.attachments[0].id;
  });

  it("downloads an active attachment", async () => {
    const res = await agent.get(`/api/attachments/${attachmentId}/download`);
    expect(res.status).toBe(200);
  });

  it("rejects removal without a reason", async () => {
    const res = await agent.patch(`/api/attachments/${attachmentId}/remove`).send({ reason: "" });
    expect(res.status).toBe(400);
  });

  it("soft-removes an attachment with a valid reason", async () => {
    const res = await agent
      .patch(`/api/attachments/${attachmentId}/remove`)
      .send({ reason: "Uploaded the wrong file." });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
  });

  it("blocks downloading a removed attachment with 410", async () => {
    const res = await agent.get(`/api/attachments/${attachmentId}/download`);
    expect(res.status).toBe(410);
  });

  it("rejects removing an already-removed attachment", async () => {
    const res = await agent
      .patch(`/api/attachments/${attachmentId}/remove`)
      .send({ reason: "Trying again." });
    expect(res.status).toBe(400);
  });
});
