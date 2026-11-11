import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  getRequesterDashboard,
  RequesterDashboardResponse,
  TicketStatusValue,
  Priority,
} from "../api.js";

type Status = "loading" | "ready" | "error";

interface RequesterDashboardProps {
  onCreateTicket: () => void;
  onViewTickets: (filterStatus?: TicketStatusValue) => void;
  onOpenTicket: (ticketId: number) => void;
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function statusBadgeClass(status: TicketStatusValue): string {
  switch (status) {
    case "NEW":
      return "badge border border-success text-success bg-white";
    case "OPEN":
      return "badge bg-info-subtle text-info-emphasis";
    case "IN_PROGRESS":
      return "badge bg-success-subtle text-success-emphasis";
    case "WAITING_FOR_REQUESTER":
      return "badge bg-warning-subtle text-warning-emphasis";
    case "RESOLVED":
      return "badge bg-success text-white";
    case "CLOSED":
      return "badge bg-secondary-subtle text-secondary-emphasis";
    case "REOPENED":
      return "badge bg-danger-subtle text-danger-emphasis";
    default:
      return "badge bg-secondary text-white";
  }
}

function priorityBadgeClass(priority: Priority): string {
  if (priority === "LOW") return "badge bg-success-subtle text-success-emphasis";
  if (priority === "MEDIUM") return "badge bg-warning-subtle text-warning-emphasis";
  return "badge bg-danger-subtle text-danger-emphasis";
}

export default function RequesterDashboard({
  onCreateTicket,
  onViewTickets,
  onOpenTicket,
}: RequesterDashboardProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await getRequesterDashboard();
      setData(response);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load dashboard. Please try again."
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") {
    return <div className="text-center py-5 text-muted">⏳ Loading dashboard…</div>;
  }

  if (status === "error" || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">{errorMessage}</p>
        <button className="btn btn-sm btn-outline-danger" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  const { metrics, recentTickets } = data;

  return (
    <div>
      {/* Greeting Banner */}
      <div className="mb-4">
        <h1 className="h3 mb-1">Welcome back, {user?.name ?? "Requester"}!</h1>
        <p className="text-muted">Here&apos;s what&apos;s happening with your requests today.</p>
      </div>

      {/* KPI Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <button
            type="button"
            className="card w-100 text-start border-0 shadow-sm p-3 h-100"
            style={{ backgroundColor: "#F4F9F5", cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
            onClick={() => onViewTickets()}
            aria-label="View Open Tickets"
          >
            <div className="fw-semibold text-muted small text-uppercase">Open Tickets</div>
            <div className="display-5 fw-bold text-success my-1">{metrics.openTickets}</div>
            <div className="small text-muted">Active tickets in progress</div>
          </button>
        </div>

        <div className="col-12 col-md-4">
          <button
            type="button"
            className="card w-100 text-start border-0 shadow-sm p-3 h-100"
            style={{ backgroundColor: "#FFF8E7", cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
            onClick={() => onViewTickets("WAITING_FOR_REQUESTER")}
            aria-label="View Tickets Waiting for You"
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold text-muted small text-uppercase">Waiting for You</span>
              {metrics.waitingForRequester > 0 && (
                <span className="badge bg-warning text-dark">Action Needed</span>
              )}
            </div>
            <div className="display-5 fw-bold text-warning-emphasis my-1">
              {metrics.waitingForRequester}
            </div>
            <div className="small text-muted">Awaiting your feedback or input</div>
          </button>
        </div>

        <div className="col-12 col-md-4">
          <button
            type="button"
            className="card w-100 text-start border-0 shadow-sm p-3 h-100"
            style={{ backgroundColor: "#EEF2EF", cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
            onClick={() => onViewTickets("RESOLVED")}
            aria-label="View Resolved Tickets"
          >
            <div className="fw-semibold text-muted small text-uppercase">Resolved</div>
            <div className="display-5 fw-bold text-secondary my-1">{metrics.resolvedTickets}</div>
            <div className="small text-muted">Completed & closed requests</div>
          </button>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="h6 mb-1 fw-bold">Need IT Support?</h2>
            <p className="text-muted small mb-0">Submit a new request or browse your full history.</p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-success" onClick={onCreateTicket}>
              + Create New Ticket
            </button>
            <button className="btn btn-outline-success" onClick={() => onViewTickets()}>
              View All My Tickets
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h2 className="h5 mb-0">Recent Requests</h2>
          <span className="badge bg-light text-secondary border">Latest 5</span>
        </div>
        <div className="card-body p-0">
          {recentTickets.length === 0 ? (
            <div className="text-center py-5 px-3">
              <p className="text-muted mb-3">No active requests right now. Need IT assistance?</p>
              <button className="btn btn-sm btn-success" onClick={onCreateTicket}>
                Create Ticket
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Ticket #</th>
                    <th scope="col">Summary</th>
                    <th scope="col">Status</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Updated</th>
                    <th scope="col" className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold text-success">{t.ticketNumber}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none p-0 text-start text-dark fw-semibold"
                          onClick={() => onOpenTicket(t.id)}
                        >
                          {t.summary}
                        </button>
                      </td>
                      <td>
                        <span className={statusBadgeClass(t.currentStatus)}>
                          {formatStatus(t.currentStatus)}
                        </span>
                      </td>
                      <td>
                        <span className={priorityBadgeClass(t.requestedPriority)}>
                          {t.requestedPriority}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {new Date(t.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => onOpenTicket(t.id)}
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
