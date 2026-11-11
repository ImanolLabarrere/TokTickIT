import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";
import * as api from "../../src/api.js";

const BASE: api.StaffTicketDetailResponse = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  description: "Drains fast even when idle.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  requesterConfirmedResolved: true,
  createdAt: "2026-09-01T09:00:00.000Z",
  updatedAt: "2026-09-02T09:00:00.000Z",
  requester: { id: 3, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Corporate Laptop" },
  ownerId: 7,
  owner: { id: 7, name: "Alex Thompson" },
  attachments: [],
  publicComments: [],
  internalNotes: [],
};

function mockDetail(overrides: Partial<api.StaffTicketDetailResponse> = {}) {
  vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue({ ...BASE, ...overrides });
  vi.spyOn(api, "getStaffOwners").mockResolvedValue([
    { id: 7, name: "Alex Thompson" },
    { id: 8, name: "Priya Nair" },
  ]);
  vi.spyOn(api, "getTicketActions").mockResolvedValue([]);
}

describe("Ticket Workflow and Resolution Rules UI (Lab 4 Issue 4)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays Lab 4 transition options for IN_PROGRESS status (including Cancelled)", async () => {
    mockDetail({ currentStatus: "IN_PROGRESS" });
    render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Ticket TKT-2026-000001" });

    const select = screen.getByLabelText("Change status") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);

    expect(optionValues).toEqual([
      "",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "OPEN",
      "CANCELLED",
    ]);
  });

  it("requires confirmation dialog when transitioning to RESOLVED", async () => {
    mockDetail({ currentStatus: "IN_PROGRESS" });
    const setStatusSpy = vi.spyOn(api, "setTicketStatus").mockResolvedValue({
      currentStatus: "RESOLVED",
      requesterConfirmedResolved: false,
    });

    render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Ticket TKT-2026-000001" });

    const select = screen.getByLabelText("Change status");
    fireEvent.change(select, { target: { value: "RESOLVED" } });

    const applyBtn = screen.getByRole("button", { name: "Apply" });
    fireEvent.click(applyBtn);

    // Confirmation dialog should appear
    expect(screen.getByText("Move this ticket to Resolved?")).toBeInTheDocument();
    expect(setStatusSpy).not.toHaveBeenCalled();

    // Confirm the transition
    const confirmBtn = screen.getByRole("button", { name: "Yes, change status" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(setStatusSpy).toHaveBeenCalledWith(1, "RESOLVED", "IN_PROGRESS");
    });
  });

  it("cancels confirmation and keeps current status when dismissed", async () => {
    mockDetail({ currentStatus: "IN_PROGRESS" });
    const setStatusSpy = vi.spyOn(api, "setTicketStatus");

    render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Ticket TKT-2026-000001" });

    const select = screen.getByLabelText("Change status");
    fireEvent.change(select, { target: { value: "RESOLVED" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByText("Move this ticket to Resolved?")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "Keep current status" });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText("Move this ticket to Resolved?")).not.toBeInTheDocument();
    expect(setStatusSpy).not.toHaveBeenCalled();
  });

  it("displays conflict error banner when concurrent update occurs (409)", async () => {
    mockDetail({ currentStatus: "OPEN" });
    vi.spyOn(api, "setTicketStatus").mockRejectedValue(
      new Error("Conflict: Ticket status was modified by another user.")
    );

    render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Ticket TKT-2026-000001" });

    const select = screen.getByLabelText("Change status");
    fireEvent.change(select, { target: { value: "IN_PROGRESS" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(
        screen.getByText("Conflict: Ticket status was modified by another user.")
      ).toBeInTheDocument();
    });
  });

  it("displays resolution gate error when unassigned ticket cannot be resolved (BR-14)", async () => {
    mockDetail({ currentStatus: "OPEN", ownerId: null, owner: null });
    vi.spyOn(api, "setTicketStatus").mockRejectedValue(
      new Error("Cannot resolve an unassigned ticket. Please assign an owner first.")
    );

    render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Ticket TKT-2026-000001" });

    const select = screen.getByLabelText("Change status");
    fireEvent.change(select, { target: { value: "RESOLVED" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const confirmBtn = screen.getByRole("button", { name: "Yes, change status" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Cannot resolve an unassigned ticket. Please assign an owner first.")
      ).toBeInTheDocument();
    });
  });
});
