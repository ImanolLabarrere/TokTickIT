import { test, expect } from "@playwright/test";
import { apiStatus, signIn, signOut, NEW_PASSWORD } from "../helpers/auth";

// Requires: server (port 3000) and client (port 5173) running, DB migrated.

test.describe("User administration (E2E-03)", () => {
  test("create, duplicate email, reset password, first login, deactivate, self-deactivation blocked", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const name = `E2E Staff ${stamp}`;
    const email = `e2e.staff.${stamp}@example.com`;
    const nav = page.getByRole("navigation");

    await signIn(page, "admin@tiktockit.com");
    await nav.getByRole("button", { name: /^admin$/i }).click();
    await expect(page.getByRole("heading", { name: /user management/i })).toBeVisible();

    // 1. Create a user with one role and a generated initial password.
    await page.getByRole("button", { name: /create user/i }).click();
    await page.locator("#um-name").fill(name);
    await page.locator("#um-email").fill(email);
    await page.locator("#um-role").selectOption("IT_STAFF");
    await page.getByRole("button", { name: /generate/i }).click();
    expect(await page.locator("#um-password").inputValue()).toMatch(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/);
    await page.getByRole("button", { name: /save user/i }).click();
    await expect(page.getByText(/user created/i)).toBeVisible();

    // 2. Search finds it.
    await page.getByLabel(/search users/i).fill(email);
    await page.getByRole("button", { name: /^search$/i }).click();
    await expect(page.getByText(email).first()).toBeVisible();

    // 3. The same email again — in capitals — is rejected under the Email field, values kept (AC-12).
    await page.getByRole("button", { name: /create user/i }).click();
    await page.locator("#um-name").fill("Duplicate Person");
    await page.locator("#um-email").fill(email.toUpperCase());
    await page.locator("#um-password").fill("Initial123");
    await page.getByRole("button", { name: /save user/i }).click();
    await expect(page.getByText("A user with this email already exists.")).toBeVisible();
    await expect(page.locator("#um-name")).toHaveValue("Duplicate Person");
    await page.getByRole("button", { name: /^cancel$/i }).click();

    // 4. Reset the password to a new generated value.
    await page.getByRole("button", { name: `Edit ${name}` }).first().click();
    await page.getByRole("button", { name: /reset password/i }).click();
    await page.getByRole("button", { name: /generate/i }).click();
    const resetPassword = await page.locator("#um-new-password").inputValue();
    await page.getByRole("button", { name: /confirm reset/i }).click();
    await expect(page.getByText(/password reset/i)).toBeVisible();
    await signOut(page);

    // 5. The new user must change the temporary password at first login, then lands in the staff queue.
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/^password$/i).fill(resetPassword);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByRole("heading", { name: /change your password/i })).toBeVisible();
    await page.getByLabel(/current \(temporary\) password/i).fill(resetPassword);
    await page.getByLabel(/^new password$/i).fill(NEW_PASSWORD);
    await page.getByLabel(/confirm new password/i).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.locator("header")).toContainText("IT Staff");
    await expect(nav.getByRole("button", { name: /my queue/i })).toBeVisible();
    await signOut(page);

    // 6. The Administrator deactivates the user; the user can no longer sign in.
    await signIn(page, "admin@tiktockit.com");
    await page.getByLabel(/search users/i).fill(email);
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.getByRole("button", { name: `Edit ${name}` }).first().click();
    await page.locator("#um-active").uncheck();
    await page.getByRole("button", { name: /save user/i }).click();
    await expect(page.getByText(/user updated/i)).toBeVisible();
    await expect(page.getByText("Inactive", { exact: true }).first()).toBeVisible();

    // 7. An Administrator cannot deactivate their own account (AC-13).
    await page.getByLabel(/search users/i).fill("admin@tiktockit.com");
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.getByRole("button", { name: /^edit admin user$/i }).first().click();
    await page.locator("#um-active").uncheck();
    await page.getByRole("button", { name: /save user/i }).click();
    await expect(page.getByRole("alert")).toHaveText(/cannot deactivate your own account/i);
    await signOut(page);

    // 8. The deactivated user is refused with the generic message.
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/^password$/i).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByRole("alert")).toHaveText(/invalid email or password/i);
  });

  test("non-Administrators are forbidden from the admin API", async ({ page }) => {
    await signIn(page, "michael.brown@example.com");
    expect(await apiStatus(page, "/api/admin/users")).toBe(403);
    await signOut(page);

    await signIn(page, "priya.nair@tiktockit.com");
    expect(await apiStatus(page, "/api/admin/users")).toBe(403);
  });
});
