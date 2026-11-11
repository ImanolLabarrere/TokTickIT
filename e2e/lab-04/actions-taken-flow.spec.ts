import { test, expect } from "@playwright/test";
import { signIn, signOut } from "../helpers/auth";

test.describe("Lab 4 E2E — Actions Taken Workflow (AC-01..04)", () => {
  test("IT Staff logs an action taken with follow-up, and Requester views it in read-only mode", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // 1. IT Staff signs in
    await signIn(page, "alex.thompson@tiktockit.com");

    // Open first ticket in queue
    const openTicketBtn = page.getByRole("button", { name: /^open ticket/i }).first();
    await openTicketBtn.waitFor({ state: "visible", timeout: 15_000 });
    await openTicketBtn.click();

    // Verify Actions Taken section is present
    await expect(page.getByRole("heading", { name: /actions taken/i })).toBeVisible();

    // Click "+ Record Action Taken"
    const recordBtn = page.getByRole("button", { name: /\+ record action taken/i });
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    // Fill the action form
    const actionDescInput = page.getByLabel(/action description/i);
    await actionDescInput.fill("Replaced faulty power supply and cleaned internal fans.");

    const resultInput = page.getByLabel(/^result/i);
    await resultInput.fill("System booted normally; voltage levels verified stable.");

    const followUpCheckbox = page.getByLabel(/follow-up required/i);
    await followUpCheckbox.check();

    const followUpNoteInput = page.getByLabel(/follow-up note/i);
    await followUpNoteInput.fill("Check back with user after 48 hours to confirm zero shutdowns.");

    // Submit the action
    await page.getByRole("button", { name: /^save action taken$/i }).click();

    // Confirm the action is visible in the timeline
    await expect(
      page.getByText("Replaced faulty power supply and cleaned internal fans.").first()
    ).toBeVisible();
    await expect(
      page.getByText("System booted normally; voltage levels verified stable.").first()
    ).toBeVisible();
    await expect(page.getByText("Follow-up required").first()).toBeVisible();
    await expect(
      page.getByText("Check back with user after 48 hours to confirm zero shutdowns.").first()
    ).toBeVisible();

    // Staff can edit actions (edit button visible)
    await expect(page.getByRole("button", { name: /^edit$/i }).first()).toBeVisible();

    // Sign out IT Staff
    await signOut(page);

    // 2. Requester signs in and verifies read-only access
    await signIn(page, "jennifer.anderson@example.com");

    // Open the first ticket in My Tickets
    const viewTicketBtn = page.getByRole("button", { name: /^view$/i }).first();
    if (await viewTicketBtn.isVisible()) {
      await viewTicketBtn.click();
    } else {
      await page.getByRole("button", { name: /^open ticket/i }).first().click();
    }

    // Verify Actions Taken section renders in read-only mode
    await expect(page.getByRole("heading", { name: /actions taken/i })).toBeVisible();
    // Requester cannot create or edit actions
    await expect(page.getByRole("button", { name: /\+ record action taken/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^edit$/i })).not.toBeVisible();

    await signOut(page);
  });
});

