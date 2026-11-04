import { Page, expect } from "@playwright/test";

export const API_URL = "http://localhost:3000";
// Every seeded account starts with this password and mustChangePassword=true
// (see docs/lab-03/README-seed-credentials.md). global-setup.ts re-seeds before
// each run, so a run always starts from this known state.
export const SEED_PASSWORD = "ChangeMe123";
// The password the E2E tests choose when the forced password change appears.
export const NEW_PASSWORD = "E2eNewPass1";

// Signs in from the logged-out Login screen. Works whatever the account's
// state is within one run: first login with the seed password (completes the
// mandatory password change), or a later login with the password chosen by an
// earlier test.
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/");

  const changeHeading = page.getByRole("heading", { name: /change your password/i });
  const logoutButton = page.getByRole("button", { name: /^logout$/i });
  const errorAlert = page.getByRole("alert");

  for (const password of [SEED_PASSWORD, NEW_PASSWORD]) {
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(changeHeading.or(logoutButton).or(errorAlert)).toBeVisible({ timeout: 10_000 });
    if (await errorAlert.isVisible()) continue; // wrong password for this state: try the next one

    if (await changeHeading.isVisible()) {
      await page.getByLabel(/current \(temporary\) password/i).fill(password);
      await page.getByLabel(/^new password$/i).fill(NEW_PASSWORD);
      await page.getByLabel(/confirm new password/i).fill(NEW_PASSWORD);
      await page.getByRole("button", { name: /^continue$/i }).click();
    }
    await expect(logoutButton).toBeVisible({ timeout: 10_000 });
    return;
  }
  throw new Error(`Could not sign in as ${email} with the seed or the E2E password`);
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^logout$/i }).click();
  await expect(page.getByRole("heading", { name: /sign in to your account/i })).toBeVisible();
}

// Calls the API directly from the browser page (so it carries the page's
// session cookie) and returns only the HTTP status — used to prove the
// backend, not the UI, enforces authorization.
export async function apiStatus(
  page: Page,
  path: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<number> {
  return page.evaluate(
    async ({ url, init }) => {
      const res = await fetch(url, { credentials: "include", ...init });
      return res.status;
    },
    { url: `${API_URL}${path}`, init }
  );
}

export function jsonPost(body: unknown) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
