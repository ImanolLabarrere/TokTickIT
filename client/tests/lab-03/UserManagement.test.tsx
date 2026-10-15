import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserManagement from "../../src/components/UserManagement.js";
import * as api from "../../src/api.js";

const PAGINATION = { page: 1, pageSize: 10, totalItems: 3, totalPages: 1 };

const USERS: api.AdminUser[] = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER", isActive: true },
  { id: 2, name: "Alex Thompson", email: "alex.thompson@tiktockit.com", role: "IT_STAFF", isActive: true },
  { id: 3, name: "Carlos Mendes", email: "carlos.mendes@example.com", role: "REQUESTER", isActive: false },
];

function mockList() {
  return vi.spyOn(api, "getAdminUsers").mockResolvedValue({ data: USERS, pagination: PAGINATION });
}

async function renderScreen() {
  render(<UserManagement />);
  await screen.findAllByText("Jennifer Anderson");
}

describe("UserManagement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists users with name, email, role, status and an Edit action", async () => {
    mockList();
    await renderScreen();

    expect(screen.getAllByText("alex.thompson@tiktockit.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /edit jennifer anderson/i }).length).toBeGreaterThan(0);
  });

  it("searches by name or email", async () => {
    const spy = mockList();
    await renderScreen();

    fireEvent.change(screen.getByLabelText(/search users/i), { target: { value: "alex" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ search: "alex" })));
  });

  it("filters by role", async () => {
    const spy = mockList();
    await renderScreen();

    fireEvent.change(screen.getByLabelText(/filter by role/i), { target: { value: "IT_STAFF" } });

    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ role: "IT_STAFF" })));
  });

  it("creates a user with one role and a generated, policy-compliant initial password", async () => {
    mockList();
    const create = vi.spyOn(api, "createAdminUser").mockResolvedValue(USERS[1]);
    await renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alex New" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "alex.new@example.com" } });
    fireEvent.change(screen.getByLabelText(/^role/i), { target: { value: "IT_STAFF" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    const password = (screen.getByLabelText(/initial password/i) as HTMLInputElement).value;
    expect(password).toMatch(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/);

    fireEvent.click(screen.getByRole("button", { name: /save user/i }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: "Alex New",
        email: "alex.new@example.com",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: password,
      })
    );
    expect(await screen.findByText(/user created/i)).toBeInTheDocument();
  });

  it("shows a duplicate-email error under the Email field and keeps the form values", async () => {
    mockList();
    vi.spyOn(api, "createAdminUser").mockRejectedValue(
      new api.AdminApiError("Please correct the highlighted fields.", 400, {
        email: "A user with this email already exists.",
      })
    );
    await renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Duplicate Person" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "jennifer.anderson@example.com" } });
    fireEvent.change(screen.getByLabelText(/initial password/i), { target: { value: "Initial123" } });
    fireEvent.click(screen.getByRole("button", { name: /save user/i }));

    expect(await screen.findByText("A user with this email already exists.")).toBeInTheDocument();
    expect((screen.getByLabelText(/full name/i) as HTMLInputElement).value).toBe("Duplicate Person");
  });

  it("blocks an empty form on the client without calling the API", async () => {
    mockList();
    const create = vi.spyOn(api, "createAdminUser");
    await renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    fireEvent.click(screen.getByRole("button", { name: /save user/i }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("edits a user's role", async () => {
    mockList();
    const update = vi.spyOn(api, "updateAdminUser").mockResolvedValue({ ...USERS[0], role: "IT_STAFF" });
    await renderScreen();

    fireEvent.click(screen.getAllByRole("button", { name: /edit jennifer anderson/i })[0]);
    expect((screen.getByLabelText(/full name/i) as HTMLInputElement).value).toBe("Jennifer Anderson");
    fireEvent.change(screen.getByLabelText(/^role/i), { target: { value: "IT_STAFF" } });
    fireEvent.click(screen.getByRole("button", { name: /save user/i }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(1, {
        name: "Jennifer Anderson",
        email: "jennifer.anderson@example.com",
        role: "IT_STAFF",
        isActive: true,
      })
    );
    expect(await screen.findByText(/user updated/i)).toBeInTheDocument();
  });

  it("explains a blocked save (own account / last Administrator) in a banner and keeps the panel open", async () => {
    mockList();
    vi.spyOn(api, "updateAdminUser").mockRejectedValue(
      new api.AdminApiError("Cannot deactivate your own account", 400)
    );
    await renderScreen();

    fireEvent.click(screen.getAllByRole("button", { name: /edit jennifer anderson/i })[0]);
    fireEvent.click(screen.getByRole("switch", { name: /active/i }));
    fireEvent.click(screen.getByRole("button", { name: /save user/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot deactivate your own account/i);
    expect(screen.getByRole("heading", { name: /edit user/i })).toBeInTheDocument();
  });

  it("resets a password with a generated value", async () => {
    mockList();
    const reset = vi.spyOn(api, "resetAdminPassword").mockResolvedValue({ ok: true });
    await renderScreen();

    fireEvent.click(screen.getAllByRole("button", { name: /edit jennifer anderson/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm reset/i }));

    await waitFor(() =>
      expect(reset).toHaveBeenCalledWith(1, expect.stringMatching(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/))
    );
    expect(await screen.findByText(/password reset/i)).toBeInTheDocument();
  });

  it("shows the forbidden screen and no user data when the API answers 403", async () => {
    vi.spyOn(api, "getAdminUsers").mockRejectedValue(new api.AdminApiError("Forbidden", 403));

    render(<UserManagement />);

    expect(await screen.findByText(/you don't have access to this page/i)).toBeInTheDocument();
    expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
  });

  it("shows a safe failure state and recovers on Retry", async () => {
    vi.spyOn(api, "getAdminUsers")
      .mockRejectedValueOnce(new Error("Unable to load users"))
      .mockResolvedValue({ data: USERS, pagination: PAGINATION });

    render(<UserManagement />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load users/i);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect((await screen.findAllByText("Jennifer Anderson")).length).toBeGreaterThan(0);
  });
});
