import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { getTickets, getCategories, Category, TicketListItem, Priority } from "../api.js";

type Status = "loading" | "ready" | "error";
type SortBy = "createdAt" | "updatedAt" | "ticketNumber";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

function priorityBadgeClass(priority: Priority): string {
  if (priority === "LOW") return "badge bg-success-subtle text-success-emphasis";
  if (priority === "MEDIUM") return "badge bg-warning-subtle text-warning-emphasis";
  return "badge bg-danger-subtle text-danger-emphasis";
}

// Lab 2 only has the NEW status; styled as an outline "secondary green" pill
// (kept as its own function so later labs can extend it per-status).
function statusBadgeClass(): string {
  return "badge border border-success text-success bg-white";
}

interface MyTicketsProps {
  onCreateTicket: () => void;
  onOpenTicket: (ticketId: number) => void;
}

export default function MyTickets({ onCreateTicket, onOpenTicket }: MyTicketsProps) {
  const { currentRequester } = useRequester();

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState<Priority | "">("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => undefined); // filter dropdown just degrades to "All Categories" on failure
  }, []);

  const load = useCallback(async () => {
    if (!currentRequester) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const result = await getTickets(
        {
          search: search || undefined,
          categoryId: categoryId ? Number(categoryId) : undefined,
          requestedPriority: requestedPriority || undefined,
          sortBy,
          sortDir,
          page,
          pageSize: PAGE_SIZE,
        },
        currentRequester.id
      );
      setTickets(result.data);
      setTotalItems(result.pagination.totalItems);
      setTotalPages(result.pagination.totalPages);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load tickets. Please try again."
      );
      setStatus("error");
    }
  }, [currentRequester, search, categoryId, requestedPriority, sortBy, sortDir, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
  }

  const filtersActive = search !== "" || categoryId !== "" || requestedPriority !== "";

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h1 className="h4 mb-0">My Tickets</h1>
          <p className="text-muted small mb-0">View and track your support requests.</p>
        </div>
        <button className="btn btn-success" onClick={onCreateTicket}>
          + Create Ticket
        </button>
      </div>

      <form className="row g-2 align-items-end mb-3" onSubmit={handleSearchSubmit}>
        <div className="col-12 col-md-4">
          <label className="form-label small fw-semibold" htmlFor="ticket-search">
            Search
          </label>
          <input
            id="ticket-search"
            type="text"
            className="form-control"
            placeholder="Ticket number or summary…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small fw-semibold" htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            className="form-select"
            value={categoryId}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small fw-semibold" htmlFor="filter-priority">
            Requested Priority
          </label>
          <select
            id="filter-priority"
            className="form-select"
            value={requestedPriority}
            onChange={(e) => {
              setPage(1);
              setRequestedPriority(e.target.value as Priority | "");
            }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-12 col-md-2">
          <button type="submit" className="btn btn-outline-success w-100">
            Search
          </button>
        </div>
      </form>

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div className="d-flex gap-2 align-items-center">
          <label className="small fw-semibold mb-0" htmlFor="sort-by">
            Sort by
          </label>
          <select
            id="sort-by"
            className="form-select form-select-sm"
            style={{ width: "auto" }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Last Updated</option>
            <option value="ticketNumber">Ticket Number</option>
          </select>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
          >
            {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>
        {filtersActive && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        )}
      </div>

      {status === "loading" && <p className="text-muted">⏳ Loading your tickets…</p>}

      {status === "error" && (
        <div>
          <p className="text-danger mb-3">{errorMessage}</p>
          <button className="btn btn-outline-success" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {status === "ready" && tickets.length === 0 && !filtersActive && (
        <div className="text-center py-5">
          <p className="text-muted mb-3">You haven't created any tickets yet.</p>
          <button className="btn btn-success" onClick={onCreateTicket}>
            Create your first ticket
          </button>
        </div>
      )}

      {status === "ready" && tickets.length === 0 && filtersActive && (
        <div className="text-center py-5">
          <p className="text-muted mb-3">No tickets match your filters.</p>
          <button className="btn btn-outline-success" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {status === "ready" && tickets.length > 0 && (
        <>
          <div className="table-responsive d-none d-md-block">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Ticket No.</th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Requested Priority</th>
                  <th>Current Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onOpenTicket(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenTicket(t.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ticket ${t.ticketNumber}`}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{t.ticketNumber}</td>
                    <td>{t.summary}</td>
                    <td>{t.category.name}</td>
                    <td>
                      <span className={priorityBadgeClass(t.requestedPriority)}>
                        {t.requestedPriority}
                      </span>
                    </td>
                    <td>
                      <span className={statusBadgeClass()}>{t.currentStatus}</span>
                    </td>
                    <td>{new Date(t.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-md-none">
            {tickets.map((t) => (
              <div
                className="card mb-2"
                key={t.id}
                onClick={() => onOpenTicket(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenTicket(t.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Open ticket ${t.ticketNumber}`}
                style={{ cursor: "pointer" }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <strong>{t.ticketNumber}</strong>
                    <span className={statusBadgeClass()}>{t.currentStatus}</span>
                  </div>
                  <p className="mb-1">{t.summary}</p>
                  <div className="d-flex gap-2 align-items-center small text-muted">
                    <span>{t.category.name}</span>
                    <span className={priorityBadgeClass(t.requestedPriority)}>
                      {t.requestedPriority}
                    </span>
                  </div>
                  <div className="small text-muted mt-1">
                    Updated {new Date(t.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              {totalItems} ticket{totalItems === 1 ? "" : "s"} — page {page} of {totalPages}
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
