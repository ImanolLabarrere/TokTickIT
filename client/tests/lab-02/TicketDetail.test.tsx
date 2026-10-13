import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TicketDetail from "../../src/components/TicketDetail.js";
import * as api from "../../src/api.js";

const SAMPLE_TICKET = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  description: "Drains fast even when idle.",
  requestedPriority: "MEDIUM" as const,
  currentStatus: "NEW" as const,
  createdAt: "2026-09-01T09:00:00.000Z",
  updatedAt: "2026-09-01T09:00:00.000Z",
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Corporate Laptop" },
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
  // Lab 3 Issue 3 — Public Comments + "Problem Appears Resolved".
  publicComments: [] as api.PublicComment[],
  requesterConfirmedResolved: false,
};

function renderDetail(onBack = vi.fn()) {
  return render(<TicketDetail ticketId={1} onBack={onBack} />);
}

describe("TicketDetail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the ticket header fields as read-only", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(SAMPLE_TICKET);

    renderDetail();

    await waitFor(() => expect(screen.getByText("Ticket TKT-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    expect(screen.getByText("battery-report.pdf", { exact: false })).toBeInTheDocument();
  });

  it("shows a safe error and a way back when the ticket can't be loaded", async () => {
    vi.spyOn(api, "getTicketDetail").mockRejectedValue(new Error("Ticket not found."));
    const onBack = vi.fn();

    renderDetail(onBack);

    await waitFor(() => expect(screen.getByText("Ticket not found.")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /back to my tickets/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("blocks removal without a reason and then removes with one", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(SAMPLE_TICKET);
    const removeSpy = vi.spyOn(api, "removeAttachment").mockResolvedValue({
      ...SAMPLE_TICKET.attachments[0],
      isRemoved: true,
      removedAt: "2026-09-01T10:00:00.000Z",
      removalReason: "Uploaded the wrong file.",
    });

    renderDetail();

    await waitFor(() => expect(screen.getByText(/battery-report\.pdf/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm removal/i }));

    expect(await screen.findByText(/enter a reason/i)).toBeInTheDocument();
    expect(removeSpy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/reason for removal/i), {
      target: { value: "Uploaded the wrong file." },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm removal/i }));

    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith(5, "Uploaded the wrong file."));
  });

  it("posts a Public Comment and shows it in the list", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(SAMPLE_TICKET);
    const commentSpy = vi.spyOn(api, "postComment").mockResolvedValue({
      id: 1,
      content: "Still happening today.",
      authorId: 1,
      authorName: "Jennifer Anderson",
      createdAt: "2026-09-02T09:00:00.000Z",
    });

    renderDetail();

    await waitFor(() => expect(screen.getByText("Ticket TKT-2026-000001")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/add a comment/i), {
      target: { value: "Still happening today." },
    });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() => expect(commentSpy).toHaveBeenCalledWith(1, "Still happening today."));
    expect(await screen.findByText("Still happening today.")).toBeInTheDocument();
  });

  it("marks the problem as appearing resolved", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(SAMPLE_TICKET);
    const resolveSpy = vi.spyOn(api, "markProblemAppearsResolved").mockResolvedValue(undefined);

    renderDetail();

    await waitFor(() => expect(screen.getByText("Ticket TKT-2026-000001")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /problem appears resolved/i }));

    await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith(1));
    expect(await screen.findByText(/you marked this as appearing resolved/i)).toBeInTheDocument();
  });
});
