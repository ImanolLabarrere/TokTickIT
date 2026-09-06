import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Requires the DB to be migrated and seeded first (see prisma/seed.ts).
describe("GET /api/requesters", () => {
  it("returns only active requesters", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    const names = res.body.map((r: { name: string }) => r.name);
    expect(names).toContain("Jennifer Anderson");
    expect(names).not.toContain("Carlos Mendes"); // seeded inactive, must be excluded
  });
});

describe("GET /api/related-systems", () => {
  it("returns the seeded related systems in id order", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(6);

    const ids = res.body.map((s: { id: number }) => s.id);
    expect(ids).toEqual([...ids].sort((a: number, b: number) => a - b));
  });
});
