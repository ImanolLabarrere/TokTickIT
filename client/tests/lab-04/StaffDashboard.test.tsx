import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import StaffDashboard from "../../src/components/StaffDashboard.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

const MOCK_DATA: api.StaffDashboardResponse = {
  metrics: {
    unassignedCount: 4,
    myAssignedCount: 2,
    waitingForRequesterCount: 3,
    highPriorityCount: 5,
    statusCounts: {
      NEW: 2,
      OPEN: 2,
      IN_PROGRESS: 4,
      WAITING_FOR_REQUESTER: 3,
      RESOLVED: 8,
      CLOSED: 12,
      REOPENED: 1,
      CANCELLED: 2,
    },
    priorityCounts: {
      HIGH: 5,
      MEDIUM: 4,
      LOW: 2,
    },
    totalActiveUsers: 14,
  },
  recentTickets: [
    {
      id: 99,
      ticketNumber: "TKT-2026-000099",
      summary: "Database query timeout incident",
      currentStatus: "IN_PROGRESS",
      itPriority: "HIGH",
      requesterName: "Jennifer Anderson",
      ownerName: "Alex Thompson",
      updatedAt: "2026-11-04T12:00:00.000Z",
    },
    {
      id: 100,
      ticketNumber: "TKT-2026-000100",
      summary: "Printer toner replacement",
      currentStatus: "NEW",
      itPriority: "LOW",
      requesterName: "David Miller",
      ownerName: null,
      updatedAt: "2026-11-04T11:30:00.000Z",
    },
  ],
};

function renderDashboard(role: api.Role = "IT_STAFF", props = {}) {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 7,
    name: "Alex Thompson",
    email: "alex@example.com",
    role,
    mustChangePassword: false,
  });

  const defaultProps = {
    onNavigateToQueue: vi.fn(),
    onOpenTicket: vi.fn(),
    onNavigateToAdmin: vi.fn(),
  };

  return {
    ...render(
      <AuthProvider>
        <StaffDashboard {...defaultProps} {...props} />
      </AuthProvider>
    ),
    props: { ...defaultProps, ...props },
  };
}

describe("StaffDashboard Component (Lab 4 Issue 5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders 4 operational metric cards and breakdowns (UI-05)", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(MOCK_DATA);
    renderDashboard("IT_STAFF");

    expect(screen.getByText(/loading operational dashboard/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /it operations dashboard/i })).toBeInTheDocument();
    });

    // Metric counts scoped to their accessible card containers
    const unassignedBtn = screen.getByLabelText("Filter queue by Unassigned tickets");
    expect(within(unassignedBtn).getByText("4")).toBeInTheDocument();

    const myAssignedBtn = screen.getByLabelText("Filter queue by My Assigned tickets");
    expect(within(myAssignedBtn).getByText("2")).toBeInTheDocument();

    const highPriorityBtn = screen.getByLabelText("Filter queue by High Priority tickets");
    expect(within(highPriorityBtn).getByText("5")).toBeInTheDocument();

    const waitingBtn = screen.getByLabelText("Filter queue by Waiting for Requester tickets");
    expect(within(waitingBtn).getByText("3")).toBeInTheDocument();

    expect(screen.getByText("Needs Triage")).toBeInTheDocument();

    // Priority breakdown
    expect(screen.getByText("Active Priority Breakdown")).toBeInTheDocument();
    // Status distribution
    expect(screen.getByText("Active Status Distribution")).toBeInTheDocument();
  });

  it("filters the queue when operational metric cards are clicked (AC-14)", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(MOCK_DATA);
    const onNavigateToQueue = vi.fn();
    renderDashboard("IT_STAFF", { onNavigateToQueue });

    await waitFor(() => {
      expect(screen.getByLabelText("Filter queue by Unassigned tickets")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Filter queue by Unassigned tickets"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ ownerFilter: "unassigned" });

    fireEvent.click(screen.getByLabelText("Filter queue by My Assigned tickets"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ ownerFilter: "mine" });

    fireEvent.click(screen.getByLabelText("Filter queue by High Priority tickets"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ itPriority: "HIGH" });

    fireEvent.click(screen.getByLabelText("Filter queue by Waiting for Requester tickets"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ currentStatus: "WAITING_FOR_REQUESTER" });
  });

  it("reloads dashboard data when Refresh button is clicked", async () => {
    const fetchSpy = vi.spyOn(api, "getStaffDashboard").mockResolvedValue(MOCK_DATA);
    renderDashboard("IT_STAFF");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("displays platform user count and admin link for Administrator callers (BR-19)", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(MOCK_DATA);
    const onNavigateToAdmin = vi.fn();
    renderDashboard("ADMINISTRATOR", { onNavigateToAdmin });

    await waitFor(() => {
      expect(screen.getByText("Active System Users:")).toBeInTheDocument();
    });

    expect(screen.getByText("14")).toBeInTheDocument();

    const manageBtn = screen.getByRole("button", { name: /manage users →/i });
    fireEvent.click(manageBtn);
    expect(onNavigateToAdmin).toHaveBeenCalled();
  });

  it("renders recent operational activity and opens ticket detail", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(MOCK_DATA);
    const onOpenTicket = vi.fn();
    renderDashboard("IT_STAFF", { onOpenTicket });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000099")).toBeInTheDocument();
    });

    expect(screen.getByText("Database query timeout incident")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();

    expect(screen.getByText("TKT-2026-000100")).toBeInTheDocument();
    expect(screen.getByText("Printer toner replacement")).toBeInTheDocument();
    expect(screen.getByText("David Miller")).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(1);

    const viewButtons = screen.getAllByRole("button", { name: /^view$/i });
    fireEvent.click(viewButtons[0]);
    expect(onOpenTicket).toHaveBeenCalledWith(99);
  });
});
