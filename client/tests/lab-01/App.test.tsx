import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// NOTE: Lab 1's "Check System" home screen has been superseded. In Lab 2,
// App.tsx's role changed to gating the whole app behind Development
// Requester Selection. In Lab 3 Issue 2, a real authentication gate was
// added in front of that (see client/tests/lab-03/Login.test.tsx). In Lab 3
// Issue 3 ("Requester regression"), the Development Requester selector was
// removed entirely (labsheet §8.2): an authenticated REQUESTER now goes
// straight to My Tickets. This file keeps one smoke test per gate so `App`
// itself stays covered end to end.
describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders the Login screen when no user is authenticated yet", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);

    render(<App />);

    await waitFor(() => expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument());
  });

  it("renders Change Password when the authenticated user must change it", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      role: "REQUESTER",
      mustChangePassword: true,
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText(/change your password/i)).toBeInTheDocument());
  });

  it("renders My Tickets directly once authenticated (no Requester selector)", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      role: "REQUESTER",
      mustChangePassword: false,
    });
    vi.spyOn(api, "getTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
    vi.spyOn(api, "getCategories").mockResolvedValue([]);

    render(<App />);

    await waitFor(() => expect(screen.getByText(/my tickets/i)).toBeInTheDocument());
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.queryByText(/select development requester/i)).not.toBeInTheDocument();
  });
});
