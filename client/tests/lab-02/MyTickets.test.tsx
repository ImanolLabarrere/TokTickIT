import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import MyTickets from "../../src/components/MyTickets.js";
import * as api from "../../src/api.js";

const STORAGE_KEY = "toktickit.selectedRequesterId";

function renderWithSelectedRequester(onCreateTicket = vi.fn()) {
  sessionStorage.setItem(STORAGE_KEY, "1");
  vi.spyOn(api, "getRequesters").mockResolvedValue([
    { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  ]);
  vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
  return render(
    <RequesterProvider>
      <MyTickets onCreateTicket={onCreateTicket} />
    </RequesterProvider>
  );
}

const SAMPLE_TICKET = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  requestedPriority: "MEDIUM" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-09-01T09:00:00.000Z",
  updatedAt: "2026-09-01T09:00:00.000Z",
  category: { id: 1, name: "Hardware" },
};

describe("MyTickets", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders the current Requester's tickets", async () => {
    vi.spyOn(api, "getTickets").mockResolvedValue({
      data: [SAMPLE_TICKET],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });

    renderWithSelectedRequester();

    await waitFor(() => expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Laptop battery drains quickly").length).toBeGreaterThan(0);
  });

  it("shows the Empty state when the Requester owns zero tickets", async () => {
    vi.spyOn(api, "getTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithSelectedRequester();

    await waitFor(() =>
      expect(screen.getByText(/haven't created any tickets yet/i)).toBeInTheDocument()
    );
  });

  it("shows a distinct No-results state when a search matches nothing", async () => {
    vi.spyOn(api, "getTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithSelectedRequester();

    await waitFor(() => expect(screen.getByLabelText(/search/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/search/i), { target: { value: "nonexistent" } });
    fireEvent.submit(screen.getByLabelText(/search/i).closest("form")!);

    await waitFor(() =>
      expect(screen.getByText(/no tickets match your filters/i)).toBeInTheDocument()
    );
    expect(screen.getAllByRole("button", { name: /clear filters/i }).length).toBeGreaterThan(0);
  });

  it("calls onCreateTicket when Create Ticket is clicked from the Empty state", async () => {
    const onCreateTicket = vi.fn();
    vi.spyOn(api, "getTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithSelectedRequester(onCreateTicket);

    await waitFor(() =>
      expect(screen.getByText(/haven't created any tickets yet/i)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /create your first ticket/i }));
    expect(onCreateTicket).toHaveBeenCalled();
  });
});
