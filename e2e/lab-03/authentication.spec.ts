import { test, expect } from "@playwright/test";
import { apiStatus, signIn, signOut, NEW_PASSWORD, SEED_PASSWORD } from "../helpers/auth";

// Requires: server (port 3000) and client (port 5173) running, DB migrated.
// global-setup.ts re-seeds first, so these accounts start with ChangeMe123.

test.describe("Authentication (E2E-01)", () => {
  test("invalid logins, including an inactive account, show the same safe message", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel(/email address/i).fill("emma.wilson@example.com");
    await page.getByLabel(/^password$/i).fill("WrongPassword1");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByRole("alert")).toHaveText(/invalid email or password/i);

    // carlos.mendes is seeded as an inactive Requester: same message, no hint it exists.
    await page.getByLabel(/email address/i).fill("carlos.mendes@example.com");
    await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByRole("alert")).toHaveText(/invalid email or password/i);
    await expect(page.getByRole("button", { name: /^logout$/i })).toHaveCount(0);
  });

  test("first login forces a password change, then shows name and role; logout blocks access", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel(/email address/i).fill("emma.wilson@example.com");
    await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // The normal application is unavailable until a valid new password is saved (AC-04).
    await expect(page.getByRole("heading", { name: /change your password/i })).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);

    const continueButton = page.getByRole("button", { name: /^continue$/i });
    await page.getByLabel(/current \(temporary\) password/i).fill(SEED_PASSWORD);
    await page.getByLabel(/^new password$/i).fill("short");
    await page.getByLabel(/confirm new password/i).fill("short");
    await expect(continueButton).toBeDisabled();

    await page.getByLabel(/^new password$/i).fill(NEW_PASSWORD);
    await page.getByLabel(/confirm new password/i).fill(NEW_PASSWORD);
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    // Authenticated shell shows the current user and role (FR-12).
    await expect(page.getByRole("button", { name: /^logout$/i })).toBeVisible();
    await expect(page.locator("header")).toContainText("Emma Wilson");
    await expect(page.locator("header")).toContainText("Requester");

    // The session survives a reload.
    await page.reload();
    await expect(page.getByRole("button", { name: /^logout$/i })).toBeVisible();

    // Logout removes access: the UI returns to Login and the API answers 401 (AC-16).
    await signOut(page);
    expect(await apiStatus(page, "/api/auth/me")).toBe(401);
    expect(await apiStatus(page, "/api/tickets")).toBe(401);
    await page.reload();
    await expect(page.getByRole("heading", { name: /sign in to your account/i })).toBeVisible();
  });

  test("each role only sees its own navigation", async ({ page }) => {
    const nav = page.getByRole("navigation");

    await signIn(page, "sarah.johnson@example.com");
    await expect(nav.getByRole("button", { name: /^my tickets$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^create ticket$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /my queue/i })).toHaveCount(0);
    await signOut(page);

    await signIn(page, "alex.thompson@tiktockit.com");
    await expect(page.locator("header")).toContainText("IT Staff");
    await expect(nav.getByRole("button", { name: /my queue/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /create ticket/i })).toHaveCount(0);
    await signOut(page);

    await signIn(page, "admin@tiktockit.com");
    await expect(page.locator("header")).toContainText("Administrator");
    await expect(nav.getByRole("button", { name: /^admin$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /my queue/i })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /my tickets/i })).toHaveCount(0);
  });
});
