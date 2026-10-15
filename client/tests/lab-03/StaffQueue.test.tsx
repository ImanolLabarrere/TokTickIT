import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffQueue from "../../src/components/StaffQueue.js";
import * as api from "../../src/api.js";

const PAGINATION = { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 };

const ITEMS: api.StaffTicketListItem[] = [
  {
    id: 1,
    ticketNumber: "TKT-2026-000001",
    summary: "Laptop battery drains quickly",
    requesterName: "Jennifer Anderson",
    categoryName: "Hardware",
    requestedPriority: "MEDIUM",
    itPriority: "HIGH",
    currentStatus: "IN_PROGRESS",
    ownerId: 7,
    ownerName: "Alex Thompson",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-02T09:00:00.000Z",
  },
  {
    id: 2,
    ticketNumber: "TKT-2026-000002",
    summary: "Campus Wi-Fi drops in the library",
    requesterName: "Michael Brown",
    categoryName: "Network",
    requestedPriority: "HIGH",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
    ownerId: null,
    ownerName: null,
    createdAt: "2026-09-03T09:00:00.000Z",
    updatedAt: "2026-09-03T09:00:00.000Z",
  },
];

const FULL = { data: ITEMS, pagination: PAGINATION };
const EMPTY = { data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } };

function mockSupportingCalls() {
  vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
  vi.spyOn(api, "getStaffOwners").mockResolvedValue([{ id: 7, name: "Alex Thompson" }]);
}

describe("StaffQueue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows tickets from every requester with status badges and an owner chip", async () => {
    mockSupportingCalls();
    vi.spyOn(api, "getStaffTickets").mockResolvedValue(FULL);

    render(<StaffQueue onOpenTicket={vi.fn()} />);

    expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("TKT-2026-000002").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alex Thompson", { selector: "span" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unassigned", { selector: "span" }).length).toBeGreaterThan(0);
  });

  it("shows the empty-queue message when there are no tickets and no filters", async () => {
    mockSupportingCalls();
    vi.spyOn(api, "getStaffTickets").mockResolvedValue(EMPTY);

    render(<StaffQueue onOpenTicket={vi.fn()} />);

    expect(await screen.findByText(/no tickets in the queue yet/i)).toBeInTheDocument();
  });

  it("sends the chosen Status filter and shows the no-results state with Clear Filters", async () => {
    mockSupportingCalls();
    const spy = vi.spyOn(api, "getStaffTickets").mockResolvedValueOnce(FULL).mockResolvedValue(EMPTY);

    render(<StaffQueue onOpenTicket={vi.fn()} />);
    await screen.findAllByText("TKT-2026-000001");

    fireEvent.change(screen.getByLabelText(/^status$/i), { target: { value: "OPEN" } });

    expect(await screen.findByText(/no tickets match your filters/i)).toBeInTheDocument();
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ currentStatus: "OPEN" }));

    fireEvent.click(screen.getAllByRole("button", { name: /clear filters/i })[0]);
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ currentStatus: undefined }))
    );
  });

  it("filters by the Unassigned owner option", async () => {
    mockSupportingCalls();
    const spy = vi.spyOn(api, "getStaffTickets").mockResolvedValue(FULL);

    render(<StaffQueue onOpenTicket={vi.fn()} />);
    await screen.findAllByText("TKT-2026-000001");

    fireEvent.change(screen.getByLabelText(/^owner$/i), { target: { value: "unassigned" } });

    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ ownerId: "unassigned" }))
    );
  });

  it("shows a safe failure state and recovers on Retry", async () => {
    mockSupportingCalls();
    vi.spyOn(api, "getStaffTickets")
      .mockRejectedValueOnce(new Error("Unable to load the queue"))
      .mockResolvedValue(FULL);

    render(<StaffQueue onOpenTicket={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load the queue/i);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);
  });

  it("opens a ticket from the queue", async () => {
    mockSupportingCalls();
    vi.spyOn(api, "getStaffTickets").mockResolvedValue(FULL);
    const onOpenTicket = vi.fn();

    render(<StaffQueue onOpenTicket={onOpenTicket} />);
    await screen.findAllByText("TKT-2026-000001");

    fireEvent.click(screen.getAllByRole("button", { name: /open ticket tkt-2026-000001/i })[0]);

    expect(onOpenTicket).toHaveBeenCalledWith(1);
  });
});
