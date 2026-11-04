import { test, expect } from "@playwright/test";
import { apiStatus, jsonPost, signIn, signOut } from "../helpers/auth";

// Requires: server (port 3000) and client (port 5173) running, DB migrated.
// Requester sarah.johnson raises a ticket; IT Staff alex.thompson handles it.

test.describe("IT Staff ticket flow (E2E-02)", () => {
  test("claim, prioritise, progress, communicate, resolve — with the Requester seeing only public data", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const summary = `Staff flow ticket ${Date.now()}`;
    const publicReply = `Public reply ${Date.now()}`;
    const privateNote = `Private note ${Date.now()}`;
    const nav = page.getByRole("navigation");

    // 1. The Requester creates a ticket.
    await signIn(page, "sarah.johnson@example.com");
    await nav.getByRole("button", { name: /^create ticket$/i }).click();
    await page.getByLabel(/^category/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/^summary/i).fill(summary);
    await page.getByLabel(/^description/i).fill("Created by the Lab 3 staff-flow E2E test.");
    await page.getByLabel(/requested priority/i).selectOption("MEDIUM");
    await page.getByRole("button", { name: /submit ticket/i }).click();
    await expect(page.getByText(/ticket created/i)).toBeVisible({ timeout: 10_000 });
    await signOut(page);

    // 2. IT Staff finds it in the queue and opens it.
    await signIn(page, "alex.thompson@tiktockit.com");
    await page.getByLabel(/^search$/i).fill(summary);
    await page.getByRole("button", { name: /^search$/i }).click();
    await expect(page.getByText(summary).first()).toBeVisible();
    await page.getByRole("button", { name: /^open ticket/i }).first().click();
    await expect(page.getByRole("heading", { name: /^ticket tkt-/i })).toBeVisible();

    // 3. Claim: the owner is set and the ticket becomes Open.
    await expect(page.getByText("Unassigned", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^claim$/i }).click();
    await expect(page.getByRole("button", { name: /^reassign$/i })).toBeVisible();
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();

    // 4. IT Priority changes; Requested Priority does not.
    await page.getByLabel(/^it priority$/i).selectOption("HIGH");
    await expect(page.getByText("HIGH", { exact: true })).toBeVisible();
    await expect(page.getByText("MEDIUM", { exact: true })).toBeVisible();

    // 5. Only valid transitions are offered: Open -> Closed is not one of them.
    const statusSelect = page.getByLabel(/change status/i);
    await expect(statusSelect.locator("option", { hasText: "Closed" })).toHaveCount(0);
    await statusSelect.selectOption("IN_PROGRESS");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page.getByText("In Progress", { exact: true }).first()).toBeVisible();

    // 6. A private Internal Note and a Public Comment.
    await page.getByLabel(/add an internal note/i).fill(privateNote);
    await page.getByRole("button", { name: /post note/i }).click();
    await expect(page.getByText(privateNote)).toBeVisible();
    await page.getByLabel(/add a public comment/i).fill(publicReply);
    await page.getByRole("button", { name: /post comment/i }).click();
    await expect(page.getByText(publicReply)).toBeVisible();
    await signOut(page);

    // 7. The Requester sees the staff reply (with a role badge) but never the note.
    await signIn(page, "sarah.johnson@example.com");
    await page.getByLabel(/^search/i).fill(summary);
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.getByText(summary).first().click();
    await expect(page.getByRole("heading", { name: /^ticket tkt-/i })).toBeVisible();
    await expect(page.getByText(publicReply)).toBeVisible();
    await expect(page.getByText("IT Staff", { exact: true })).toBeVisible();
    await expect(page.getByText(privateNote)).toHaveCount(0);

    // Direct API calls with a Requester session are rejected by the backend (AC-08).
    expect(await apiStatus(page, "/api/staff/tickets")).toBe(403);
    expect(await apiStatus(page, "/api/staff/tickets/1/notes", jsonPost({ content: "x" }))).toBe(403);

    // 8. The Requester flags the problem as appearing resolved.
    await page.getByRole("button", { name: /problem appears resolved/i }).click();
    await expect(page.getByText(/you marked this as appearing resolved/i)).toBeVisible();
    await signOut(page);

    // 9. IT Staff sees the indicator, resolves with a confirmation, and the indicator clears (AC-11).
    await signIn(page, "alex.thompson@tiktockit.com");
    await page.getByLabel(/^search$/i).fill(summary);
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.getByRole("button", { name: /^open ticket/i }).first().click();
    await expect(page.getByText(/requester confirmed the problem appears resolved/i)).toBeVisible();

    await page.getByLabel(/change status/i).selectOption("RESOLVED");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page.getByText(/move this ticket to resolved/i)).toBeVisible();
    await page.getByRole("button", { name: /yes, change status/i }).click();

    await expect(page.getByText(/requester confirmed the problem appears resolved/i)).toHaveCount(0);
    await expect(page.getByText("Resolved", { exact: true }).first()).toBeVisible();
  });
});
