import { test } from "@playwright/test";
import fs from "node:fs";
import { signIn, signOut } from "../helpers/auth";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 800 },
];

for (const viewport of VIEWPORTS) {
  test(`captures responsive views at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // Ensure output directories exist
    for (const dir of [
      "requester-dashboard",
      "staff-dashboard",
      "actions-taken",
      "resolution-dialog",
    ]) {
      fs.mkdirSync(`artifacts/lab-04/screenshots/${dir}`, { recursive: true });
    }

    // 1. Requester Dashboard
    await signIn(page, "jennifer.anderson@example.com");
    await page.getByRole("button", { name: /^dashboard$/i }).click();
    await page.waitForSelector("text=Welcome back");
    await page.screenshot({
      path: `artifacts/lab-04/screenshots/requester-dashboard/${viewport.name}.png`,
      fullPage: true,
    });

    // Requester Ticket Detail (Actions Taken read-only)
    await page.getByRole("button", { name: /^my tickets$/i }).click();
    const viewBtn = page.getByRole("button", { name: /^view$/i }).first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
    } else {
      await page.getByRole("button", { name: /^open ticket/i }).first().click();
    }
    await page.waitForSelector("text=Actions Taken");
    await page.screenshot({
      path: `artifacts/lab-04/screenshots/actions-taken/requester-${viewport.name}.png`,
      fullPage: true,
    });
    await signOut(page);

    // 2. IT Staff Dashboard & Detail
    await signIn(page, "alex.thompson@tiktockit.com");
    await page.getByRole("button", { name: /^dashboard$/i }).click();
    await page.waitForSelector("text=IT Operations Dashboard");
    await page.screenshot({
      path: `artifacts/lab-04/screenshots/staff-dashboard/${viewport.name}.png`,
      fullPage: true,
    });

    // Staff Ticket Detail (Actions Taken with record button)
    await page.getByRole("button", { name: /^my queue$/i }).click();
    const statusFilter = page.getByLabel(/^status$/i);
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption("OPEN");
    }
    await page.getByRole("button", { name: /^open ticket/i }).first().click();
    await page.waitForSelector("text=Actions Taken");
    await page.screenshot({
      path: `artifacts/lab-04/screenshots/actions-taken/staff-${viewport.name}.png`,
      fullPage: true,
    });

    // Resolution confirmation dialog (captured on desktop and mobile)
    if (viewport.name !== "tablet") {
      const claimBtn = page.getByRole("button", { name: /^claim$/i });
      if (await claimBtn.isVisible()) {
        await claimBtn.click();
      }
      const statusSelect = page.getByLabel("Change status");
      if (await statusSelect.isVisible()) {
        const optionValues = await statusSelect
          .locator("option")
          .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
        const targetOption = optionValues.includes("RESOLVED")
          ? "RESOLVED"
          : optionValues.includes("CLOSED")
          ? "CLOSED"
          : optionValues.includes("CANCELLED")
          ? "CANCELLED"
          : null;

        if (targetOption) {
          await statusSelect.selectOption(targetOption);
          await page.getByRole("button", { name: /^apply$/i }).click();
          await page.waitForSelector(".alert-warning", { timeout: 5_000 }).catch(() => undefined);
          await page.screenshot({
            path: `artifacts/lab-04/screenshots/resolution-dialog/${viewport.name}.png`,
            fullPage: false,
          });
          // Dismiss confirmation to keep current status
          const cancelBtn = page.getByRole("button", { name: /keep current status/i });
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      }
    }

    await signOut(page);
  });
}

