import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

// Requires: server (port 3000) and client (port 5173) both running, DB
// migrated and seeded. See package.json's test:e2e script.

test.describe("Requester ticket flow — happy path (E2E-01)", () => {
  test("select Requester, create a ticket with an attachment, find it, download and remove the attachment", async ({
    page,
  }) => {
    const uniqueSummary = `E2E test ticket ${Date.now()}`;

    await page.goto("/");

    // 1. Development Requester Selection.
    await expect(
      page.getByRole("heading", { name: /select development requester/i })
    ).toBeVisible();
    await page.getByLabel(/development requester/i).selectOption({ label: "Jennifer Anderson" });
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();

    // 2. Create Ticket (nav button, not the "+ Create Ticket" toolbar one).
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^create ticket$/i })
      .click();

    await page.getByLabel(/^category/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/^summary/i).fill(uniqueSummary);
    await page.getByLabel(/^description/i).fill("Created by the Lab 2 E2E test.");
    await page.getByLabel(/requested priority/i).selectOption("MEDIUM");

    const fixturePath = path.join(process.cwd(), "e2e", "lab-02", "fixtures", "test-attachment.png");
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    if (!fs.existsSync(fixturePath)) {
      fs.writeFileSync(fixturePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    await page.locator("#attachments").setInputFiles(fixturePath);

    await page.getByRole("button", { name: /submit ticket/i }).click();
    await expect(page.getByText(/ticket created/i)).toBeVisible({ timeout: 10_000 });
    const ticketNumberText = await page.locator("strong").last().innerText();
    expect(ticketNumberText).toMatch(/^TKT-\d{4}-\d{6}$/);

    // 3. Find it in My Tickets via search.
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^my tickets$/i })
      .click();
    await page.getByLabel(/^search/i).fill(uniqueSummary);
    await page.getByRole("button", { name: /^search$/i }).click();
    await expect(page.getByText(uniqueSummary).first()).toBeVisible();

    // 4. Open Ticket Detail.
    await page.getByText(uniqueSummary).first().click();
    await expect(page.getByRole("heading", { name: /^ticket tkt-/i })).toBeVisible();

    // 5. Download the active attachment.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /^download$/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBeTruthy();

    // 6. Soft-remove it, with a required reason.
    await page.getByRole("button", { name: /^remove$/i }).click();
    await page.getByRole("button", { name: /confirm removal/i }).click();
    await expect(page.getByText(/enter a reason/i)).toBeVisible(); // blocked, no reason yet

    await page.getByLabel(/reason for removal/i).fill("Removed by the Lab 2 E2E test.");
    await page.getByRole("button", { name: /confirm removal/i }).click();
    await expect(page.getByText(/removed/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^download$/i })).toHaveCount(0);

    // 7. Reload and confirm the removed state persists (it's read from the DB, not local state).
    await page.reload();
    await expect(page.getByText(/removed/i)).toBeVisible();
  });
});

test.describe("Cross-requester isolation (E2E-02)", () => {
  test("Requester B never sees Requester A's ticket", async ({ page }) => {
    const summary = `Isolation test ${Date.now()}`;

    await page.goto("/");
    await page.getByLabel(/development requester/i).selectOption({ label: "Jennifer Anderson" });
    await page.getByRole("button", { name: /continue/i }).click();

    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^create ticket$/i })
      .click();
    await page.getByLabel(/^category/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/^summary/i).fill(summary);
    await page.getByLabel(/^description/i).fill("Created by the isolation E2E test.");
    await page.getByLabel(/requested priority/i).selectOption("LOW");
    await page.getByRole("button", { name: /submit ticket/i }).click();
    await expect(page.getByText(/ticket created/i)).toBeVisible({ timeout: 10_000 });

    // Switch to a different Requester.
    await page.getByRole("button", { name: /change requester/i }).click();
    await page.getByLabel(/development requester/i).selectOption({ label: "Michael Brown" });
    await page.getByRole("button", { name: /continue/i }).click();

    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^my tickets$/i })
      .click();
    await page.getByLabel(/^search/i).fill(summary);
    await page.getByRole("button", { name: /^search$/i }).click();
    await expect(page.getByText(/no tickets match your filters/i)).toBeVisible();
  });
});
