import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequesterDashboard from "../../src/components/RequesterDashboard.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

const MOCK_DATA: api.RequesterDashboardResponse = {
  metrics: {
    openTickets: 3,
    waitingForRequester: 1,
    resolvedTickets: 5,
  },
  recentTickets: [
    {
      id: 42,
      ticketNumber: "TKT-2026-000042",
      summary: "VPN authentication timeout",
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "HIGH",
      updatedAt: "2026-11-04T12:00:00.000Z",
    },
    {
      id: 43,
      ticketNumber: "TKT-2026-000043",
      summary: "Monitor display flickering",
      currentStatus: "IN_PROGRESS",
      requestedPriority: "MEDIUM",
      updatedAt: "2026-11-03T10:00:00.000Z",
    },
  ],
};

function renderDashboard(props = {}) {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer@example.com",
    role: "REQUESTER",
    mustChangePassword: false,
  });

  const defaultProps = {
    onCreateTicket: vi.fn(),
    onViewTickets: vi.fn(),
    onOpenTicket: vi.fn(),
  };

  return {
    ...render(
      <AuthProvider>
        <RequesterDashboard {...defaultProps} {...props} />
      </AuthProvider>
    ),
    props: { ...defaultProps, ...props },
  };
}

describe("RequesterDashboard Component (Lab 4 Issue 5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders metric cards and greeting after loading (UI-04)", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(MOCK_DATA);
    renderDashboard();

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/welcome back, jennifer anderson!/i)).toBeInTheDocument();
    });

    expect(screen.getByText("3")).toBeInTheDocument(); // Open Tickets
    expect(screen.getByText("1")).toBeInTheDocument(); // Waiting for you
    expect(screen.getByText("5")).toBeInTheDocument(); // Resolved
    expect(screen.getByText("Action Needed")).toBeInTheDocument();
  });

  it("navigates to corresponding filters when metric cards are clicked (AC-13)", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(MOCK_DATA);
    const onViewTickets = vi.fn();
    renderDashboard({ onViewTickets });

    await waitFor(() => {
      expect(screen.getByLabelText("View Open Tickets")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("View Open Tickets"));
    expect(onViewTickets).toHaveBeenCalledWith();

    fireEvent.click(screen.getByLabelText("View Tickets Waiting for You"));
    expect(onViewTickets).toHaveBeenCalledWith("WAITING_FOR_REQUESTER");

    fireEvent.click(screen.getByLabelText("View Resolved Tickets"));
    expect(onViewTickets).toHaveBeenCalledWith("RESOLVED");
  });

  it("triggers onCreateTicket from quick action panel and empty state", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(MOCK_DATA);
    const onCreateTicket = vi.fn();
    renderDashboard({ onCreateTicket });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ create new ticket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ create new ticket/i }));
    expect(onCreateTicket).toHaveBeenCalled();
  });

  it("renders recent requests and opens ticket details on click", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(MOCK_DATA);
    const onOpenTicket = vi.fn();
    renderDashboard({ onOpenTicket });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
    });

    expect(screen.getByText("VPN authentication timeout")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000043")).toBeInTheDocument();

    const viewButtons = screen.getAllByRole("button", { name: /view detail/i });
    fireEvent.click(viewButtons[0]);
    expect(onOpenTicket).toHaveBeenCalledWith(42);
  });

  it("renders friendly empty state when there are no requests (BR-20)", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue({
      metrics: { openTickets: 0, waitingForRequester: 0, resolvedTickets: 0 },
      recentTickets: [],
    });
    const onCreateTicket = vi.fn();
    renderDashboard({ onCreateTicket });

    await waitFor(() => {
      expect(
        screen.getByText(/no active requests right now\. need it assistance\?/i)
      ).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /^create ticket$/i });
    fireEvent.click(createBtn);
    expect(onCreateTicket).toHaveBeenCalled();
  });
});
