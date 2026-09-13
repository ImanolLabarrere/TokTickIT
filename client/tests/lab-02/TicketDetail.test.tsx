import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import TicketDetail from "../../src/components/TicketDetail.js";
import * as api from "../../src/api.js";

const STORAGE_KEY = "toktickit.selectedRequesterId";

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
};

function renderDetail(onBack = vi.fn()) {
  sessionStorage.setItem(STORAGE_KEY, "1");
  vi.spyOn(api, "getRequesters").mockResolvedValue([
    { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  ]);
  return render(
    <RequesterProvider>
      <TicketDetail ticketId={1} onBack={onBack} />
    </RequesterProvider>
  );
}

describe("TicketDetail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
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

    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith(5, "Uploaded the wrong file.", 1));
  });
});
