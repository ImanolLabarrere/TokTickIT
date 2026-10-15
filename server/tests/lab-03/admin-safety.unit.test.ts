import { describe, it, expect } from "vitest";
import { removesActiveAdmin } from "../../src/utils/adminSafety.js";

// BR-20 / AC-14. The route only allows an edit that removes an active
// Administrator when another active Administrator remains; this pure rule
// decides whether that check is needed at all.
describe("removesActiveAdmin", () => {
  it("is true when an active Administrator is deactivated", () => {
    expect(
      removesActiveAdmin({ role: "ADMINISTRATOR", isActive: true }, { role: "ADMINISTRATOR", isActive: false })
    ).toBe(true);
  });

  it("is true when an active Administrator is demoted", () => {
    expect(
      removesActiveAdmin({ role: "ADMINISTRATOR", isActive: true }, { role: "IT_STAFF", isActive: true })
    ).toBe(true);
  });

  it("is false when the Administrator stays an active Administrator", () => {
    expect(
      removesActiveAdmin({ role: "ADMINISTRATOR", isActive: true }, { role: "ADMINISTRATOR", isActive: true })
    ).toBe(false);
  });

  it("is false for users who are not active Administrators", () => {
    expect(removesActiveAdmin({ role: "REQUESTER", isActive: true }, { role: "REQUESTER", isActive: false })).toBe(false);
    expect(
      removesActiveAdmin({ role: "ADMINISTRATOR", isActive: false }, { role: "REQUESTER", isActive: false })
    ).toBe(false);
  });

  it("is false when promoting someone to Administrator", () => {
    expect(removesActiveAdmin({ role: "IT_STAFF", isActive: true }, { role: "ADMINISTRATOR", isActive: true })).toBe(false);
  });
});
