import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  getStaffDashboard,
  StaffDashboardResponse,
  TicketStatusValue,
  Priority,
} from "../api.js";

type Status = "loading" | "ready" | "error";

interface StaffDashboardFilter {
  ownerFilter?: "unassigned" | "mine";
  currentStatus?: TicketStatusValue;
  itPriority?: Priority;
}

interface StaffDashboardProps {
  onNavigateToQueue: (filter?: StaffDashboardFilter) => void;
  onOpenTicket: (ticketId: number) => void;
  onNavigateToAdmin?: () => void;
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
    case "CANCELLED":
      return "badge bg-dark-subtle text-dark-emphasis";
    default:
      return "badge bg-secondary text-white";
  }
}

function priorityBadgeClass(priority: Priority): string {
  if (priority === "LOW") return "badge bg-success-subtle text-success-emphasis";
  if (priority === "MEDIUM") return "badge bg-warning-subtle text-warning-emphasis";
  return "badge bg-danger-subtle text-danger-emphasis";
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function OwnerChip({ name }: { name: string | null }) {
  if (!name) {
    return <span className="badge bg-light text-secondary border">Unassigned</span>;
  }
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <span
        className="rounded-circle d-inline-flex align-items-center justify-content-center text-white"
        style={{ width: 20, height: 20, fontSize: 10, backgroundColor: "#0B7A46" }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      <span className="small">{name}</span>
    </span>
  );
}

export default function StaffDashboard({
  onNavigateToQueue,
  onOpenTicket,
  onNavigateToAdmin,
}: StaffDashboardProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatus("loading");
    setErrorMessage("");

    try {
      const response = await getStaffDashboard();
      setData(response);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load dashboard. Please try again."
      );
      setStatus("error");
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading" && !data) {
    return <div className="text-center py-5 text-muted">⏳ Loading operational dashboard…</div>;
  }

  if (status === "error" && !data) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">{errorMessage}</p>
        <button className="btn btn-sm btn-outline-danger" onClick={() => load()}>
          Retry
        </button>
      </div>
    );
  }

  const { metrics, recentTickets } = data!;
  const isAdmin = user?.role === "ADMINISTRATOR";

  return (
    <div>
      {/* Header Toolbar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h3 mb-1">IT Operations Dashboard</h1>
          <p className="text-muted small mb-0">
            System overview and active workload · {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {isAdmin && metrics.totalActiveUsers !== undefined && (
            <div className="badge bg-light text-dark border p-2 d-flex align-items-center gap-2">
              <span>Active System Users: <strong>{metrics.totalActiveUsers}</strong></span>
              {onNavigateToAdmin && (
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 text-success text-decoration-none fw-semibold"
                  onClick={onNavigateToAdmin}
                >
                  Manage Users →
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Operational Metric Cards (4 cards) */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <button
            type="button"
            className="card w-100 text-start border-0 shadow-sm p-3 h-100"
            style={{
              backgroundColor: metrics.unassignedCount > 0 ? "#FFF4E5" : "#F8F9FA",
              borderLeft: metrics.unassignedCount > 0 ? "4px solid #FD7E14" : undefined,
              cursor: "pointer",
            }}
            onClick={() => onNavigateToQueue({ ownerFilter: "unassigned" })}
            aria-label="Filter queue by Unassigned tickets"
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold text-muted small text-uppercase">Unassigned</span>
              {metrics.unassignedCount > 0 && (
                <span className="badge bg-warning text-dark">Needs Triage</span>
              )}
            </div>
            <div className="display-6 fw-bold text-dark my-1">{metrics.unassignedCount}</div>
            <div className="small text-muted">Awaiting staff ownership</div>
          </button>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <button
            type="button"
            className="card w-100 text-start border-0 shadow-sm p-3 h-100"
            style={{ backgroundColor: "#F4F9F5", cursor: "pointer" }}
            onClick={() => onNavigateToQueue({ ownerFilter: "mine" })}
            aria-label="Filter queue by My Assigned tickets"
          >
            <div className="fw-semibold text-muted small text-uppercase">My Assigned</div>
            <div className="display-6 fw-bold text-success my-1">{metrics.myAssignedCount}</div>
            <div className="small text-muted">Currently in your queue</div>
          </button>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <button
            type="button"
            className="card w-100 text-start border-0 shadow-sm p-3 h-100"
            style={{ backgroundColor: "#FDF2F2", cursor: "pointer" }}
            onClick={() => onNavigateToQueue({ itPriority: "HIGH" })}
            aria-label="Filter queue by High Priority tickets"
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold text-muted small text-uppercase">High Priority</span>
              {metrics.highPriorityCount > 0 && (
                <span className="badge bg-danger text-white">Urgent</span>
              )}
            </div>
            <div className="display-6 fw-bold text-danger my-1">{metrics.highPriorityCount}</div>
            <div className="small text-muted">Active critical requests</div>
          </button>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <button
            type="button"
            className="card w-100 text-start border-0 shadow-sm p-3 h-100"
            style={{ backgroundColor: "#FFF8E7", cursor: "pointer" }}
            onClick={() => onNavigateToQueue({ currentStatus: "WAITING_FOR_REQUESTER" })}
            aria-label="Filter queue by Waiting for Requester tickets"
          >
            <div className="fw-semibold text-muted small text-uppercase">Waiting on User</div>
            <div className="display-6 fw-bold text-warning-emphasis my-1">
              {metrics.waitingForRequesterCount}
            </div>
            <div className="small text-muted">Awaiting requester response</div>
          </button>
        </div>
      </div>

      {/* Breakdowns & Quick Actions row */}
      <div className="row g-3 mb-4">
        {/* Status Distribution */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3 border-bottom">
              <h2 className="h6 mb-0 fw-bold">Active Status Distribution</h2>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(metrics.statusCounts).map(([st, cnt]) => (
                  <button
                    key={st}
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                    onClick={() => onNavigateToQueue({ currentStatus: st as TicketStatusValue })}
                  >
                    <span>{formatStatus(st)}</span>
                    <span className="badge bg-secondary">{cnt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Priority Breakdown & Quick Actions */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0 fw-bold">Active Priority Breakdown</h2>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => onNavigateToQueue()}
              >
                Browse Full Queue →
              </button>
            </div>
            <div className="card-body d-flex flex-column justify-content-between">
              <div className="row g-2 mb-3">
                <div className="col-4">
                  <div className="p-2 rounded bg-danger-subtle text-center">
                    <div className="small text-danger-emphasis fw-semibold">HIGH</div>
                    <div className="h4 mb-0 text-danger">{metrics.priorityCounts.HIGH ?? 0}</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded bg-warning-subtle text-center">
                    <div className="small text-warning-emphasis fw-semibold">MEDIUM</div>
                    <div className="h4 mb-0 text-warning-emphasis">{metrics.priorityCounts.MEDIUM ?? 0}</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded bg-success-subtle text-center">
                    <div className="small text-success-emphasis fw-semibold">LOW</div>
                    <div className="h4 mb-0 text-success">{metrics.priorityCounts.LOW ?? 0}</div>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning w-100"
                  onClick={() => onNavigateToQueue({ ownerFilter: "unassigned" })}
                >
                  Claim Next Unassigned
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success w-100"
                  onClick={() => onNavigateToQueue({ ownerFilter: "mine" })}
                >
                  My Worklist
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Operational Activity Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h2 className="h5 mb-0">Recent Operational Activity</h2>
          <span className="badge bg-light text-secondary border">Latest 5 System-wide</span>
        </div>
        <div className="card-body p-0">
          {recentTickets.length === 0 ? (
            <div className="text-center py-5 text-muted">No ticket activity recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Ticket #</th>
                    <th scope="col">Summary</th>
                    <th scope="col">Requester</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Owner</th>
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
                      <td>{t.requesterName}</td>
                      <td>
                        <span className={priorityBadgeClass(t.itPriority)}>
                          {t.itPriority}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadgeClass(t.currentStatus)}>
                          {formatStatus(t.currentStatus)}
                        </span>
                      </td>
                      <td>
                        <OwnerChip name={t.ownerName} />
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
                          View
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
