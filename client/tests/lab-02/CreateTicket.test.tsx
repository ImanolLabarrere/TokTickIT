import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import CreateTicket from "../../src/components/CreateTicket.js";
import * as api from "../../src/api.js";

const STORAGE_KEY = "toktickit.selectedRequesterId";

function renderWithSelectedRequester() {
  // Pre-select a Requester (id 1) so CreateTicket's submit handler is active,
  // mirroring what RequesterSelection would have already done.
  sessionStorage.setItem(STORAGE_KEY, "1");
  vi.spyOn(api, "getRequesters").mockResolvedValue([
    { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  ]);
  return render(
    <RequesterProvider>
      <CreateTicket />
    </RequesterProvider>
  );
}

describe("CreateTicket", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders the form once reference data loads", async () => {
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);

    renderWithSelectedRequester();

    await waitFor(() => expect(screen.getByLabelText(/summary/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
  });

  // AC-04
  it("shows field-level errors returned by the API", async () => {
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);
    vi.spyOn(api, "createTicket").mockRejectedValue(
      new api.ValidationError({ summary: "Summary must be between 5 and 150 characters." })
    );

    renderWithSelectedRequester();
    await waitFor(() => expect(screen.getByLabelText(/summary/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => expect(screen.getByText(/summary must be between/i)).toBeInTheDocument());
  });

  // AC-01
  it("shows the generated Ticket Number on success", async () => {
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);
    vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      currentStatus: "NEW",
      createdAt: new Date().toISOString(),
    });

    renderWithSelectedRequester();
    await waitFor(() => expect(screen.getByLabelText(/summary/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());
  });

  // AC-06
  it("shows a safe error message when the API is unreachable", async () => {
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to connect to TokTickIT API"));

    renderWithSelectedRequester();
    await waitFor(() => expect(screen.getByLabelText(/summary/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() =>
      expect(screen.getByText(/unable to connect to toktickit api/i)).toBeInTheDocument()
    );
  });
});
