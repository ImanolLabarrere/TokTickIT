import { test, expect } from "@playwright/test";
import { signIn, signOut } from "../helpers/auth";

test.describe("Lab 4 E2E — Role-Based Dashboards & Drill-down Navigation (AC-09..14)", () => {
  test("Requester views dashboard metrics and navigates to My Tickets and Create Ticket (AC-13)", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // Sign in as Requester
    await signIn(page, "jennifer.anderson@example.com");

    // Click "Dashboard" in navigation
    await page.getByRole("button", { name: /^dashboard$/i }).click();

    // Verify Greeting and KPI cards
    await expect(page.getByRole("heading", { name: /welcome back, jennifer anderson!/i })).toBeVisible();
    await expect(page.getByLabel("View Open Tickets")).toBeVisible();
    await expect(page.getByLabel("View Tickets Waiting for You")).toBeVisible();
    await expect(page.getByLabel("View Resolved Tickets")).toBeVisible();

    // Click "Open Tickets" card -> navigates to My Tickets
    await page.getByLabel("View Open Tickets").click();
    await expect(page.getByRole("heading", { name: /my tickets/i })).toBeVisible();

    // Return to Dashboard
    await page.getByRole("button", { name: /^dashboard$/i }).click();

    // Click "+ Create New Ticket" -> navigates to Create Ticket
    await page.getByRole("button", { name: /\+ create new ticket/i }).click();
    await expect(page.getByRole("heading", { name: /^create ticket$/i })).toBeVisible();

    await signOut(page);
  });

  test("IT Staff views operational metrics and drills down to queue (AC-14)", async ({ page }) => {
    test.setTimeout(90_000);

    // Sign in as IT Staff
    await signIn(page, "alex.thompson@tiktockit.com");

    // Navigate to Dashboard
    await page.getByRole("button", { name: /^dashboard$/i }).click();

    // Verify IT Operations Dashboard header
    await expect(page.getByRole("heading", { name: /it operations dashboard/i })).toBeVisible();

    // Operational cards
    await expect(page.getByLabel("Filter queue by Unassigned tickets")).toBeVisible();
    await expect(page.getByLabel("Filter queue by My Assigned tickets")).toBeVisible();
    await expect(page.getByLabel("Filter queue by High Priority tickets")).toBeVisible();
    await expect(page.getByLabel("Filter queue by Waiting for Requester tickets")).toBeVisible();

    // Click Refresh button
    const refreshBtn = page.getByRole("button", { name: /refresh/i });
    await refreshBtn.click();
    await expect(page.getByRole("heading", { name: /it operations dashboard/i })).toBeVisible();

    // Drill down: Click Unassigned tickets card -> navigates to queue
    await page.getByLabel("Filter queue by Unassigned tickets").click();
    await expect(page.getByRole("heading", { name: /my queue/i })).toBeVisible();

    await signOut(page);
  });

  test("Administrator accesses platform overview and user management (BR-19)", async ({ page }) => {
    test.setTimeout(90_000);

    // Sign in as Administrator
    await signIn(page, "admin@tiktockit.com");

    // Navigate to Dashboard
    await page.getByRole("button", { name: /^dashboard$/i }).click();

    // Verify Active System Users badge
    await expect(page.getByText(/active system users:/i)).toBeVisible();

    // Click "Manage Users →"
    await page.getByRole("button", { name: /manage users →/i }).click();

    // Should navigate to User Management
    await expect(page.getByRole("heading", { name: /user management/i })).toBeVisible();

    await signOut(page);
  });
});

