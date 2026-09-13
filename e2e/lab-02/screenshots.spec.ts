import { test } from "@playwright/test";
import fs from "node:fs";

// Lab 2 §8.8 UI Style Checking — Playwright screenshots at desktop, tablet,
// and mobile viewport sizes, saved where the labsheet's required repository
// structure expects them (artifacts/lab-02/screenshots/<screen>/<size>.png).
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 900, height: 1000 },
  { name: "mobile", width: 375, height: 800 },
];

for (const viewport of VIEWPORTS) {
  test(`captures Create Ticket, My Tickets, and Ticket Detail at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await page.getByLabel(/development requester/i).selectOption({ label: "Jennifer Anderson" });
    await page.getByRole("button", { name: /continue/i }).click();

    for (const dir of ["my-tickets", "create-ticket", "ticket-detail"]) {
      fs.mkdirSync(`artifacts/lab-02/screenshots/${dir}`, { recursive: true });
    }

    // Create Ticket, filled in (so validation/read-only styling is visible),
    // then submitted — this also guarantees a Ticket exists for the Ticket
    // Detail screenshot below, regardless of run order.
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^create ticket$/i })
      .click();
    await page.getByLabel(/^category/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/^summary/i).fill(`Screenshot ticket ${viewport.name} ${Date.now()}`);
    await page.getByLabel(/^description/i).fill("Created for the Lab 2 responsive screenshots.");
    await page.getByLabel(/requested priority/i).selectOption("LOW");

    await page.screenshot({
      path: `artifacts/lab-02/screenshots/create-ticket/${viewport.name}.png`,
      fullPage: true,
    });

    await page.getByRole("button", { name: /submit ticket/i }).click();
    await page.getByText(/ticket created/i).waitFor();

    // My Tickets.
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /^my tickets$/i })
      .click();
    await page.waitForSelector("table, .card");
    await page.screenshot({
      path: `artifacts/lab-02/screenshots/my-tickets/${viewport.name}.png`,
      fullPage: true,
    });

    // Ticket Detail.
    await page.getByRole("button", { name: /^open ticket/i }).first().click();
    await page.waitForSelector("text=Attachments");
    await page.screenshot({
      path: `artifacts/lab-02/screenshots/ticket-detail/${viewport.name}.png`,
      fullPage: true,
    });
  });
}
