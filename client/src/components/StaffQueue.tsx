import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  getStaffTickets,
  getStaffOwners,
  getCategories,
  Category,
  Priority,
  StaffOwner,
  StaffTicketListItem,
  TicketStatusValue,
} from "../api.js";

type Status = "loading" | "ready" | "error";
type SortBy = "createdAt" | "updatedAt" | "itPriority";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: TicketStatusValue[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

// "WAITING_FOR_REQUESTER" -> "Waiting For Requester"
function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function priorityBadgeClass(priority: Priority): string {
  if (priority === "LOW") return "badge bg-success-subtle text-success-emphasis";
  if (priority === "MEDIUM") return "badge bg-warning-subtle text-warning-emphasis";
  return "badge bg-danger-subtle text-danger-emphasis";
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
    case "REOPENED":
      return "badge bg-danger-subtle text-danger-emphasis";
    default:
      return "badge bg-secondary-subtle text-secondary-emphasis";
  }
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
    <span className="d-inline-flex align-items-center gap-2">
      <span
        className="rounded-circle d-inline-flex align-items-center justify-content-center text-white"
        style={{ width: 24, height: 24, fontSize: 11, backgroundColor: "#0B7A46" }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      <span>{name}</span>
    </span>
  );
}

interface StaffQueueProps {
  onOpenTicket: (ticketId: number) => void;
}

export default function StaffQueue({ onOpenTicket }: StaffQueueProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [tickets, setTickets] = useState<StaffTicketListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [owners, setOwners] = useState<StaffOwner[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [itPriority, setItPriority] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const hasFilters = Boolean(
    search || categoryId || requestedPriority || itPriority || currentStatus || ownerId
  );

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    getStaffOwners()
      .then(setOwners)
      .catch(() => setOwners([]));
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const result = await getStaffTickets({
        search: search || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        requestedPriority: (requestedPriority || undefined) as Priority | undefined,
        itPriority: (itPriority || undefined) as Priority | undefined,
        currentStatus: (currentStatus || undefined) as TicketStatusValue | undefined,
        ownerId: ownerId === "" ? undefined : ownerId === "unassigned" ? "unassigned" : Number(ownerId),
        sortBy,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      });
      setTickets(result.data);
      setTotalItems(result.pagination.totalItems);
      setTotalPages(result.pagination.totalPages);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to load the queue. Please try again.");
      setStatus("error");
    }
  }, [search, categoryId, requestedPriority, itPriority, currentStatus, ownerId, sortBy, sortDir, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setItPriority("");
    setCurrentStatus("");
    setOwnerId("");
    setPage(1);
  }

  function onFilterChange(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h1 className="h4 mb-0">My Queue</h1>
          <p className="text-muted small mb-0">Find, prioritize and open support tickets.</p>
        </div>
        {hasFilters && (
          <button className="btn btn-outline-secondary btn-sm" onClick={handleClearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      <form className="row g-2 align-items-end mb-3" onSubmit={handleSearchSubmit}>
        <div className="col-12 col-md-4">
          <label className="form-label small fw-semibold" htmlFor="queue-search">
            Search
          </label>
          <input
            id="queue-search"
            type="text"
            className="form-control"
            placeholder="Ticket number or summary…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small fw-semibold" htmlFor="queue-category">
            Category
          </label>
          <select
            id="queue-category"
            className="form-select"
            value={categoryId}
            onChange={(e) => onFilterChange(setCategoryId)(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small fw-semibold" htmlFor="queue-req-priority">
            Requested Priority
          </label>
          <select
            id="queue-req-priority"
            className="form-select"
            value={requestedPriority}
            onChange={(e) => onFilterChange(setRequestedPriority)(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small fw-semibold" htmlFor="queue-it-priority">
            IT Priority
          </label>
          <select
            id="queue-it-priority"
            className="form-select"
            value={itPriority}
            onChange={(e) => onFilterChange(setItPriority)(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small fw-semibold" htmlFor="queue-status">
            Status
          </label>
          <select
            id="queue-status"
            className="form-select"
            value={currentStatus}
            onChange={(e) => onFilterChange(setCurrentStatus)(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small fw-semibold" htmlFor="queue-owner">
            Owner
          </label>
          <select
            id="queue-owner"
            className="form-select"
            value={ownerId}
            onChange={(e) => onFilterChange(setOwnerId)(e.target.value)}
          >
            <option value="">All Owners</option>
            <option value="unassigned">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <button type="submit" className="btn btn-outline-success w-100">
            Search
          </button>
        </div>
      </form>

      <div className="d-flex gap-2 align-items-center mb-3">
        <label className="small fw-semibold mb-0" htmlFor="queue-sort-by">
          Sort by
        </label>
        <select
          id="queue-sort-by"
          className="form-select form-select-sm"
          style={{ width: "auto" }}
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortBy);
            setPage(1);
          }}
        >
          <option value="createdAt">Created Date</option>
          <option value="updatedAt">Last Updated</option>
          <option value="itPriority">IT Priority</option>
        </select>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          aria-label={sortDir === "desc" ? "Sort descending" : "Sort ascending"}
          onClick={() => {
            setSortDir((d) => (d === "desc" ? "asc" : "desc"));
            setPage(1);
          }}
        >
          {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
        </button>
      </div>

      {status === "loading" && <p className="text-muted">⏳ Loading the queue…</p>}

      {status === "error" && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{errorMessage}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {status === "ready" && tickets.length === 0 && (
        <div className="text-center py-5">
          {hasFilters ? (
            <>
              <p className="text-muted mb-3">No tickets match your filters.</p>
              <button className="btn btn-outline-success" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </>
          ) : (
            <p className="text-muted mb-0">No tickets in the queue yet.</p>
          )}
        </div>
      )}

      {status === "ready" && tickets.length > 0 && (
        <>
          <div className="d-none d-md-block table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Ticket No.</th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Req. Priority</th>
                  <th>IT Priority</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Last Updated</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="fw-semibold">{t.ticketNumber}</td>
                    <td>{t.summary}</td>
                    <td>{t.categoryName}</td>
                    <td>
                      <span className={priorityBadgeClass(t.requestedPriority)}>{t.requestedPriority}</span>
                    </td>
                    <td>
                      <span className={priorityBadgeClass(t.itPriority)}>{t.itPriority}</span>
                    </td>
                    <td>
                      <span className={statusBadgeClass(t.currentStatus)}>{formatStatus(t.currentStatus)}</span>
                    </td>
                    <td>
                      <OwnerChip name={t.ownerName} />
                    </td>
                    <td>{new Date(t.updatedAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-success"
                        aria-label={`Open ticket ${t.ticketNumber}`}
                        onClick={() => onOpenTicket(t.id)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-md-none d-flex flex-column gap-2">
            {tickets.map((t) => (
              <div key={t.id} className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <strong>{t.ticketNumber}</strong>
                    <span className={statusBadgeClass(t.currentStatus)}>{formatStatus(t.currentStatus)}</span>
                  </div>
                  <div className="my-1">{t.summary}</div>
                  <div className="d-flex flex-wrap gap-2 align-items-center small text-muted mb-2">
                    <span>{t.categoryName}</span>
                    <span className={priorityBadgeClass(t.itPriority)}>IT {t.itPriority}</span>
                    <OwnerChip name={t.ownerName} />
                  </div>
                  <button
                    className="btn btn-sm btn-outline-success"
                    aria-label={`Open ticket ${t.ticketNumber}`}
                    onClick={() => onOpenTicket(t.id)}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              {totalItems} {totalItems === 1 ? "ticket" : "tickets"} — page {page} of {totalPages}
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
