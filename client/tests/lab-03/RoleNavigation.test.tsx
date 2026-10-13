import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

function signInAs(role: api.Role, name: string) {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 1,
    name,
    email: "someone@example.com",
    role,
    mustChangePassword: false,
  });
}

describe("Role-aware navigation (FR-12)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gives IT Staff My Queue only — no My Tickets or Create Ticket", async () => {
    signInAs("IT_STAFF", "Alex Thompson");
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getStaffOwners").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    render(<App />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /my queue/i })).toBeInTheDocument());
    expect(screen.getByText("IT Staff")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^my tickets$/i })).not.toBeInTheDocument();
  });

  it("gives Administrators the Admin destination only", async () => {
    signInAs("ADMINISTRATOR", "Admin User");

    render(<App />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /user management/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^admin$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /my queue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create ticket/i })).not.toBeInTheDocument();
  });
});
