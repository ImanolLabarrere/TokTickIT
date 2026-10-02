import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// NOTE: Lab 1's "Check System" home screen (checkSystem-driven Online/Offline +
// category list) has been superseded. In Lab 2, App.tsx's role changed to
// gating the whole app behind Development Requester Selection. In Lab 3
// Issue 2, a real authentication gate was added in front of that: App now
// shows Login first (see client/tests/lab-03/Login.test.tsx for detailed
// coverage), then the Lab 2 Requester selector once authenticated (see
// client/tests/lab-02/RequesterSelection.test.tsx). This file keeps one
// smoke test per gate so `App` itself stays covered end to end.
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

  it("renders the Requester Selection screen once authenticated with no password change required", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      role: "REQUESTER",
      mustChangePassword: false,
    });
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    ]);

    render(<App />);

    await waitFor(() => expect(screen.getByText(/select development requester/i)).toBeInTheDocument());
  });
});