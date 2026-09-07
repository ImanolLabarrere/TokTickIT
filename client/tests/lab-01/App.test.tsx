import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// NOTE: Lab 1's "Check System" home screen (checkSystem-driven Online/Offline +
// category list) has been superseded. In Lab 2, App.tsx's role changed to
// gating the whole app behind Development Requester Selection (see
// client/tests/lab-02/RequesterSelection.test.tsx for the equivalent, and
// more detailed, coverage). This file keeps one smoke test so `App` itself
// stays covered.
describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders the Requester Selection screen when no Requester is selected yet", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    ]);

    render(<App />);

    await waitFor(() => expect(screen.getByText(/select development requester/i)).toBeInTheDocument());
  });
});
