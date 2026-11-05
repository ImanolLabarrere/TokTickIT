import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActionsTaken } from "../../src/components/ActionsTaken.js";
import * as api from "../../src/api.js";

const MOCK_ACTIONS: api.ActionTaken[] = [
  {
    id: 1,
    ticketId: 10,
    performedById: 3,
    performedByName: "Alex Thompson",
    performedByRole: "IT_STAFF",
    actionDateTime: "2026-11-04T10:00:00.000Z",
    actionDescription: "Cleaned print heads and ran nozzle alignment.",
    result: "Test print passed without streaking.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: "test_print_scan.png",
    createdAt: "2026-11-04T10:05:00.000Z",
    updatedAt: "2026-11-04T10:05:00.000Z",
  },
  {
    id: 2,
    ticketId: 10,
    performedById: 4,
    performedByName: "Priya Nair",
    performedByRole: "IT_STAFF",
    actionDateTime: "2026-11-04T14:30:00.000Z",
    actionDescription: "Replaced degraded network patch cable.",
    result: "Network connectivity restored at 1 Gbps.",
    followUpRequired: true,
    followUpNote: "Check switch port error counters tomorrow morning.",
    attachmentNotes: null,
    createdAt: "2026-11-04T14:35:00.000Z",
    updatedAt: "2026-11-04T14:35:00.000Z",
  },
];

describe("ActionsTaken Component (Lab 4 Issue 3)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders existing actions with description, result, follow-up, and attachments (UI-01)", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValueOnce(MOCK_ACTIONS);

    render(<ActionsTaken ticketId={10} canManageActions={true} />);

    await waitFor(() => {
      expect(screen.getByText("Actions Taken (2)")).toBeInTheDocument();
    });

    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    expect(screen.getByText("Cleaned print heads and ran nozzle alignment.")).toBeInTheDocument();
    expect(screen.getByText("Test print passed without streaking.")).toBeInTheDocument();
    expect(screen.getByText(/test_print_scan\.png/)).toBeInTheDocument();

    expect(screen.getByText("Priya Nair")).toBeInTheDocument();
    expect(screen.getByText("Replaced degraded network patch cable.")).toBeInTheDocument();
    expect(screen.getByText(/Follow-Up Required:/i)).toBeInTheDocument();
    expect(screen.getByText("Check switch port error counters tomorrow morning.")).toBeInTheDocument();
  });

  it("renders clean read-only view for Requesters without manage controls (AC-03, UI-02)", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValueOnce(MOCK_ACTIONS);

    render(<ActionsTaken ticketId={10} canManageActions={false} />);

    await waitFor(() => {
      expect(screen.getByText("Actions Taken (2)")).toBeInTheDocument();
    });

    expect(screen.getByText(/History of actions taken by IT Staff/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+ Record Action Taken/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
  });

  it("shows empty state when no actions exist", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValueOnce([]);

    render(<ActionsTaken ticketId={10} canManageActions={true} />);

    await waitFor(() => {
      expect(screen.getByText("Actions Taken (0)")).toBeInTheDocument();
    });

    expect(screen.getByText("No actions recorded yet.")).toBeInTheDocument();
  });

  it("validates mandatory fields on create and rejects submission if empty (AC-12, UI-01)", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValueOnce([]);
    const createSpy = vi.spyOn(api, "createTicketAction");

    render(<ActionsTaken ticketId={10} canManageActions={true} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Record Action Taken/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Record Action Taken/i }));

    const saveButton = screen.getByRole("button", { name: /Save Action Taken/i });
    fireEvent.click(saveButton);

    expect(createSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Action description is required.")).toBeInTheDocument();
    expect(screen.getByText("Result is required.")).toBeInTheDocument();
  });

  it("enforces follow-up note requirement when follow-up checkbox is checked (AC-05, UI-01)", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValueOnce([]);
    const createSpy = vi.spyOn(api, "createTicketAction");

    render(<ActionsTaken ticketId={10} canManageActions={true} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Record Action Taken/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Record Action Taken/i }));

    fireEvent.change(screen.getByLabelText(/Action Description/i), {
      target: { value: "Rebooted router" },
    });
    fireEvent.change(screen.getByLabelText(/Result \/ Outcome/i), {
      target: { value: "Pings returning" },
    });

    const checkbox = screen.getByLabelText(/Follow-Up Required\?/i);
    fireEvent.click(checkbox);

    // Follow-up note input appears
    expect(screen.getByLabelText(/Follow-up Note/i)).toBeInTheDocument();

    // Click submit without entering note
    fireEvent.click(screen.getByRole("button", { name: /Save Action Taken/i }));

    expect(createSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Follow-up note is required when follow-up is checked/i)).toBeInTheDocument();
  });

  it("creates an Action Taken when valid and appends to the list (AC-01)", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValueOnce([]);
    const newAction: api.ActionTaken = {
      id: 99,
      ticketId: 10,
      performedById: 1,
      performedByName: "Wattana Srisuk",
      performedByRole: "IT_STAFF",
      actionDateTime: "2026-11-05T10:00:00.000Z",
      actionDescription: "Flushed DNS cache on DNS server.",
      result: "Resolution time dropped to 12ms.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      createdAt: "2026-11-05T10:00:00.000Z",
      updatedAt: "2026-11-05T10:00:00.000Z",
    };
    const createSpy = vi.spyOn(api, "createTicketAction").mockResolvedValueOnce(newAction);

    render(<ActionsTaken ticketId={10} canManageActions={true} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Record Action Taken/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Record Action Taken/i }));

    fireEvent.change(screen.getByLabelText(/Action Description/i), {
      target: { value: "Flushed DNS cache on DNS server." },
    });
    fireEvent.change(screen.getByLabelText(/Result \/ Outcome/i), {
      target: { value: "Resolution time dropped to 12ms." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Action Taken/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(10, {
        actionDescription: "Flushed DNS cache on DNS server.",
        result: "Resolution time dropped to 12ms.",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        actionDateTime: undefined,
      });
    });

    expect(await screen.findByText("Wattana Srisuk")).toBeInTheDocument();
    expect(screen.getByText("Flushed DNS cache on DNS server.")).toBeInTheDocument();
  });

  it("allows IT Staff to edit an existing Action Taken (BR-10)", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValueOnce([MOCK_ACTIONS[0]]);
    const updatedAction: api.ActionTaken = {
      ...MOCK_ACTIONS[0],
      result: "Updated: Nozzle alignment verified 100% clean.",
    };
    const updateSpy = vi.spyOn(api, "updateTicketAction").mockResolvedValueOnce(updatedAction);

    render(<ActionsTaken ticketId={10} canManageActions={true} />);

    await waitFor(() => {
      expect(screen.getByText("Cleaned print heads and ran nozzle alignment.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Edit$/i }));

    expect(screen.getByText("Edit Action Taken")).toBeInTheDocument();

    const resultInput = screen.getByDisplayValue("Test print passed without streaking.");
    fireEvent.change(resultInput, {
      target: { value: "Updated: Nozzle alignment verified 100% clean." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(1, {
        actionDescription: "Cleaned print heads and ran nozzle alignment.",
        result: "Updated: Nozzle alignment verified 100% clean.",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: "test_print_scan.png",
      });
    });

    expect(await screen.findByText("Updated: Nozzle alignment verified 100% clean.")).toBeInTheDocument();
  });
});
