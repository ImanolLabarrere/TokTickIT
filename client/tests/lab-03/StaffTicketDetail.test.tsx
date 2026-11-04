import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";
import * as api from "../../src/api.js";

const BASE: api.StaffTicketDetailResponse = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  description: "Drains fast even when idle.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "OPEN",
  requesterConfirmedResolved: false,
  createdAt: "2026-09-01T09:00:00.000Z",
  updatedAt: "2026-09-02T09:00:00.000Z",
  requester: { id: 3, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Corporate Laptop" },
  ownerId: 7,
  owner: { id: 7, name: "Alex Thompson" },
  attachments: [
    {
      id: 5,
      fileName: "battery-report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 204800,
      uploadedAt: "2026-09-01T09:05:00.000Z",
      isRemoved: false,
      removedAt: null,
      removalReason: null,
    },
  ],
  publicComments: [
    {
      id: 1,
      content: "Thanks for the report.",
      authorId: 7,
      authorName: "Alex Thompson",
      authorRole: "IT_STAFF",
      createdAt: "2026-09-02T09:00:00.000Z",
    },
  ],
  internalNotes: [
    {
      id: 1,
      content: "Battery wear looks high.",
      authorId: 7,
      authorName: "Alex Thompson",
      authorRole: "IT_STAFF",
      createdAt: "2026-09-02T10:00:00.000Z",
    },
  ],
};

function mockDetail(overrides: Partial<api.StaffTicketDetailResponse> = {}) {
  vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue({ ...BASE, ...overrides });
  vi.spyOn(api, "getStaffOwners").mockResolvedValue([
    { id: 7, name: "Alex Thompson" },
    { id: 8, name: "Priya Nair" },
  ]);
}

async function renderDetail(onBack = vi.fn()) {
  render(<StaffTicketDetail ticketId={1} onBack={onBack} />);
  await screen.findByRole("heading", { name: "Ticket TKT-2026-000001" });
}

describe("StaffTicketDetail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the ticket and keeps Public Comments and Internal Notes visibly distinct", async () => {
    mockDetail();
    await renderDetail();

    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    expect(screen.getByText("Visible to the Requester.")).toBeInTheDocument();
    expect(screen.getByText(/staff only — never shown to the requester/i)).toBeInTheDocument();
    expect(screen.getByText("Thanks for the report.")).toBeInTheDocument();
    expect(screen.getByText("Battery wear looks high.")).toBeInTheDocument();
    expect(screen.getByText("battery-report.pdf", { exact: false })).toBeInTheDocument();
  });

  it("claims an unassigned ticket and then shows the owner", async () => {
    mockDetail({ ownerId: null, owner: null, currentStatus: "NEW" });
    const claim = vi
      .spyOn(api, "claimTicket")
      .mockResolvedValue({ ownerId: 7, ownerName: "Alex Thompson", currentStatus: "OPEN" });
    await renderDetail();

    fireEvent.click(screen.getByRole("button", { name: /^claim$/i }));

    await waitFor(() => expect(claim).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText("Unassigned")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /^claim$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reassign$/i })).toBeInTheDocument();
  });

  it("reassigns to another IT Staff member", async () => {
    mockDetail();
    const assign = vi.spyOn(api, "assignTicket").mockResolvedValue({ ownerId: 8, ownerName: "Priya Nair" });
    await renderDetail();

    fireEvent.click(screen.getByRole("button", { name: /^reassign$/i }));
    fireEvent.change(screen.getByLabelText(/reassign to/i), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm reassign/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(1, 8));
    expect(await screen.findByText("Priya Nair")).toBeInTheDocument();
  });

  it("changes the IT Priority", async () => {
    mockDetail();
    const setPriority = vi.spyOn(api, "setItPriority").mockResolvedValue({ itPriority: "LOW" });
    await renderDetail();

    fireEvent.change(screen.getByLabelText(/^it priority$/i), { target: { value: "LOW" } });

    await waitFor(() => expect(setPriority).toHaveBeenCalledWith(1, "LOW"));
  });

  it("only offers the valid next statuses for the current status", async () => {
    mockDetail({ currentStatus: "OPEN" });
    await renderDetail();

    const select = screen.getByLabelText(/change status/i);
    const labels = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent);

    expect(labels).toEqual(["Select new status…", "In Progress", "Waiting For Requester", "Resolved", "Cancelled"]);
    expect(within(select).queryByRole("option", { name: "Closed" })).not.toBeInTheDocument();
  });

  it("applies a normal status change immediately", async () => {
    mockDetail({ currentStatus: "OPEN" });
    const setStatus = vi.spyOn(api, "setTicketStatus").mockResolvedValue({ currentStatus: "IN_PROGRESS" });
    await renderDetail();

    fireEvent.change(screen.getByLabelText(/change status/i), { target: { value: "IN_PROGRESS" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    await waitFor(() => expect(setStatus).toHaveBeenCalledWith(1, "IN_PROGRESS"));
  });

  it("asks for confirmation before Resolved, and clears the 'appears resolved' indicator", async () => {
    mockDetail({ currentStatus: "OPEN", requesterConfirmedResolved: true });
    const setStatus = vi.spyOn(api, "setTicketStatus").mockResolvedValue({ currentStatus: "RESOLVED" });
    await renderDetail();
    expect(screen.getByText(/requester confirmed the problem appears resolved/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/change status/i), { target: { value: "RESOLVED" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByText(/move this ticket to resolved/i)).toBeInTheDocument();
    expect(setStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /yes, change status/i }));

    await waitFor(() => expect(setStatus).toHaveBeenCalledWith(1, "RESOLVED"));
    await waitFor(() =>
      expect(screen.queryByText(/requester confirmed the problem appears resolved/i)).not.toBeInTheDocument()
    );
  });

  it("shows a safe error when a status change is rejected", async () => {
    mockDetail({ currentStatus: "OPEN" });
    vi.spyOn(api, "setTicketStatus").mockRejectedValue(new Error("Invalid status transition"));
    await renderDetail();

    fireEvent.change(screen.getByLabelText(/change status/i), { target: { value: "IN_PROGRESS" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid status transition/i);
  });

  it("posts an Internal Note and a Public Comment separately", async () => {
    mockDetail();
    const note = vi.spyOn(api, "postInternalNote").mockResolvedValue({
      id: 2,
      content: "Replacement part ordered.",
      authorId: 7,
      authorName: "Alex Thompson",
      authorRole: "IT_STAFF",
      createdAt: "2026-09-03T09:00:00.000Z",
    });
    const comment = vi.spyOn(api, "postComment").mockResolvedValue({
      id: 2,
      content: "A technician will contact you.",
      authorId: 7,
      authorName: "Alex Thompson",
      authorRole: "IT_STAFF",
      createdAt: "2026-09-03T09:30:00.000Z",
    });
    await renderDetail();

    fireEvent.change(screen.getByLabelText(/add an internal note/i), { target: { value: "Replacement part ordered." } });
    fireEvent.click(screen.getByRole("button", { name: /post note/i }));
    await waitFor(() => expect(note).toHaveBeenCalledWith(1, "Replacement part ordered."));
    expect(await screen.findByText("Replacement part ordered.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/add a public comment/i), {
      target: { value: "A technician will contact you." },
    });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));
    await waitFor(() => expect(comment).toHaveBeenCalledWith(1, "A technician will contact you."));
    expect(await screen.findByText("A technician will contact you.")).toBeInTheDocument();
  });

  it("rejects a blank note without calling the API", async () => {
    mockDetail();
    const note = vi.spyOn(api, "postInternalNote");
    await renderDetail();

    fireEvent.change(screen.getByLabelText(/add an internal note/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /post note/i }));

    expect(await screen.findByText(/note must be between 1 and 2000 characters/i)).toBeInTheDocument();
    expect(note).not.toHaveBeenCalled();
  });

  it("shows a safe error and a way back when the ticket can't be loaded", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockRejectedValue(new Error("Ticket not found."));
    vi.spyOn(api, "getStaffOwners").mockResolvedValue([]);
    const onBack = vi.fn();

    render(<StaffTicketDetail ticketId={1} onBack={onBack} />);

    expect(await screen.findByText("Ticket not found.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back to queue/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
