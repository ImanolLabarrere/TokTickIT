import { test } from "@playwright/test";
import fs from "node:fs";
import { signIn, signOut, SEED_PASSWORD } from "../helpers/auth";

// Lab 3 responsive evidence: desktop, tablet and mobile screenshots of every
// new screen, saved under artifacts/lab-03/screenshots/<screen>/.
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 900, height: 1000 },
  { name: "mobile", width: 375, height: 800 },
];

for (const viewport of VIEWPORTS) {
  test(`captures Login, Change Password, Staff Queue, Staff Ticket Detail and User Management at ${viewport.name}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const dir of ["authentication", "staff-queue", "staff-ticket-detail", "user-management"]) {
      fs.mkdirSync(`artifacts/lab-03/screenshots/${dir}`, { recursive: true });
    }
    const listSelector = viewport.width < 768 ? ".d-md-none .card" : ".table-responsive table";

    // Login, then the mandatory Change Password screen. The password is NOT
    // changed here, so david.lee stays in the seeded state for every viewport.
    await page.goto("/");
    await page.screenshot({ path: `artifacts/lab-03/screenshots/authentication/login-${viewport.name}.png`, fullPage: true });
    await page.getByLabel(/email address/i).fill("david.lee@example.com");
    await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.getByRole("heading", { name: /change your password/i }).waitFor();
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/authentication/change-password-${viewport.name}.png`,
      fullPage: true,
    });

    // Leave the forced-change screen without changing anything ("Log out instead").
    await page.getByRole("button", { name: /log out instead/i }).click();
    await page.getByRole("heading", { name: /sign in to your account/i }).waitFor();

    // IT Staff: queue, then ticket detail.
    await signIn(page, "alex.thompson@tiktockit.com");
    await page.waitForSelector(listSelector);
    await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-queue/${viewport.name}.png`, fullPage: true });
    await page.getByRole("button", { name: /^open ticket/i }).first().click();
    await page.waitForSelector("text=Internal Notes");
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/staff-ticket-detail/${viewport.name}.png`,
      fullPage: true,
    });
    await signOut(page);

    // Administrator: user list, then the create panel.
    await signIn(page, "admin@tiktockit.com");
    await page.waitForSelector(listSelector);
    await page.screenshot({ path: `artifacts/lab-03/screenshots/user-management/${viewport.name}.png`, fullPage: true });
    await page.getByRole("button", { name: /create user/i }).click();
    await page.getByRole("heading", { name: /create new user/i }).waitFor();
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/user-management/${viewport.name}-create.png`,
      fullPage: true,
    });
  });
}
