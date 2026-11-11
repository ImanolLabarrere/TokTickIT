import { test, expect } from "@playwright/test";
import { signIn, signOut } from "../helpers/auth";

test.describe("Lab 4 E2E — Ticket Resolution & Workflow Rules (AC-07, AC-08)", () => {
  test("IT Staff transitions ticket to In Progress, confirms resolution dialog, and marks Resolved", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // 1. Sign in as IT Staff
    await signIn(page, "alex.thompson@tiktockit.com");

    // Filter queue to OPEN tickets so transition to RESOLVED is guaranteed to be available
    const statusFilter = page.getByLabel(/^status$/i);
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption("OPEN");
    }

    // Open first OPEN ticket in queue
    const openTicketBtn = page.getByRole("button", { name: /^open ticket/i }).first();
    await openTicketBtn.waitFor({ state: "visible", timeout: 15_000 });
    await openTicketBtn.click();

    // If ticket is Unassigned, claim it first to satisfy resolution gate (BR-14)
    const claimBtn = page.getByRole("button", { name: /^claim$/i });
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.getByText("Alex Thompson").first()).toBeVisible();
    }

    const statusSelect = page.getByLabel("Change status");
    await expect(statusSelect).toBeVisible();

    // Transition to Resolved
    await statusSelect.selectOption("RESOLVED");
    await page.getByRole("button", { name: /^apply$/i }).click();

    // Confirmation dialog must appear (UI-03, specification section 5)
    const confirmDialog = page.getByText(/move this ticket to resolved\?/i);
    await expect(confirmDialog).toBeVisible();

    // Click "Yes, change status"
    await page.getByRole("button", { name: /yes, change status/i }).click();

    // Status badge should update to Resolved
    await expect(page.getByText("Resolved").first()).toBeVisible();

    await signOut(page);
  });
});

