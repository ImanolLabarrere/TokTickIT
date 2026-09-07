import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import RequesterSelection from "../../src/components/RequesterSelection.js";
import * as api from "../../src/api.js";

function renderWithProvider() {
  return render(
    <RequesterProvider>
      <RequesterSelection />
    </RequesterProvider>
  );
}

describe("RequesterSelection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders active requesters and enables Continue once one is chosen", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
      { id: 2, name: "Michael Brown", email: "michael.brown@example.com" },
    ]);

    renderWithProvider();

    await waitFor(() => expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument());

    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/development requester/i), { target: { value: "1" } });
    expect(continueButton).not.toBeDisabled();
  });

  it("shows an empty state when there are no active requesters", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([]);

    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByText(/no active development requesters/i)).toBeInTheDocument()
    );
  });

  it("shows a safe error with retry when the API fails", async () => {
    vi.spyOn(api, "getRequesters").mockRejectedValue(new Error("Unable to load Development Requesters."));

    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByText(/unable to load development requesters/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
