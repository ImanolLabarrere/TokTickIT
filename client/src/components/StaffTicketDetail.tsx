import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  getStaffTicketDetail,
  getStaffOwners,
  claimTicket,
  assignTicket,
  setItPriority,
  setTicketStatus,
  postComment,
  postInternalNote,
  downloadAttachment,
  AttachmentItem,
  InternalNote,
  Priority,
  PublicComment,
  Role,
  StaffOwner,
  StaffTicketDetailResponse,
  TicketStatusValue,
} from "../api.js";

type Status = "loading" | "ready" | "error";

// Mirrors specification.md section 7. This only decides which options to SHOW;
// the server enforces the matrix and rejects anything else with 400.
const TRANSITIONS: Record<TicketStatusValue, TicketStatusValue[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "OPEN"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "OPEN", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS"],
  CANCELLED: [],
};

// Moves that need an explicit confirmation step (ui-spec.md section 5).
const NEEDS_CONFIRMATION: TicketStatusValue[] = ["RESOLVED", "CLOSED", "CANCELLED"];

const ROLE_LABELS: Record<Role, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
};

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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-12 col-md-4">
      <div className="fw-semibold small text-muted">{label}</div>
      <div className="p-2 rounded" style={{ backgroundColor: "#EEF2EF" }} aria-readonly="true">
        {value}
      </div>
    </div>
  );
}

function Entry({ entry }: { entry: PublicComment | InternalNote }) {
  return (
    <li className="list-group-item bg-transparent">
      <div className="d-flex justify-content-between flex-wrap gap-1">
        <span>
          <strong>{entry.authorName}</strong>
          {entry.authorRole && (
            <span className="badge bg-light text-secondary border ms-2">{ROLE_LABELS[entry.authorRole]}</span>
          )}
        </span>
        <span className="text-muted small">{new Date(entry.createdAt).toLocaleString()}</span>
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>{entry.content}</div>
    </li>
  );
}

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export default function StaffTicketDetail({ ticketId, onBack }: StaffTicketDetailProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [ticket, setTicket] = useState<StaffTicketDetailResponse | null>(null);
  const [owners, setOwners] = useState<StaffOwner[]>([]);

  const [actionError, setActionError] = useState("");
  const [claiming, setClaiming] = useState(false);

  const [reassigning, setReassigning] = useState(false);
  const [reassignTo, setReassignTo] = useState("");

  const [nextStatus, setNextStatus] = useState("");
  const [confirmingStatus, setConfirmingStatus] = useState<TicketStatusValue | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  const [downloadError, setDownloadError] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      setTicket(await getStaffTicketDetail(ticketId));
      setStatus("ready");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to load ticket. Please try again.");
      setStatus("error");
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getStaffOwners()
      .then(setOwners)
      .catch(() => setOwners([]));
  }, []);

  function patchTicket(patch: Partial<StaffTicketDetailResponse>) {
    setTicket((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function handleClaim() {
    setActionError("");
    setClaiming(true);
    try {
      const result = await claimTicket(ticketId);
      patchTicket({
        ownerId: result.ownerId,
        owner: { id: result.ownerId, name: result.ownerName },
        currentStatus: result.currentStatus,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to claim the ticket.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleReassign() {
    if (!reassignTo) return;
    setActionError("");
    try {
      const result = await assignTicket(ticketId, Number(reassignTo));
      patchTicket({ ownerId: result.ownerId, owner: { id: result.ownerId, name: result.ownerName } });
      setReassigning(false);
      setReassignTo("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to reassign the ticket.");
    }
  }

  async function handlePriorityChange(value: string) {
    setActionError("");
    try {
      const result = await setItPriority(ticketId, value as Priority);
      patchTicket({ itPriority: result.itPriority });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update the priority.");
    }
  }

  async function applyStatus(target: TicketStatusValue) {
    setActionError("");
    setSavingStatus(true);
    try {
      const result = await setTicketStatus(ticketId, target);
      // BR-14: a status change clears the Requester's "appears resolved" flag.
      patchTicket({ currentStatus: result.currentStatus, requesterConfirmedResolved: false });
      setNextStatus("");
      setConfirmingStatus(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update the status.");
      setConfirmingStatus(null);
    } finally {
      setSavingStatus(false);
    }
  }

  function handleApplyStatus() {
    if (!nextStatus) return;
    const target = nextStatus as TicketStatusValue;
    if (NEEDS_CONFIRMATION.includes(target)) {
      setConfirmingStatus(target);
    } else {
      applyStatus(target);
    }
  }

  async function handlePostComment(e: FormEvent) {
    e.preventDefault();
    const content = commentText.trim();
    if (content.length < 1 || content.length > 2000) {
      setCommentError("Comment must be between 1 and 2000 characters.");
      return;
    }
    setCommentError("");
    setPostingComment(true);
    try {
      const comment = await postComment(ticketId, content);
      setTicket((prev) => (prev ? { ...prev, publicComments: [...prev.publicComments, comment] } : prev));
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Unable to post comment.");
    } finally {
      setPostingComment(false);
    }
  }

  async function handlePostNote(e: FormEvent) {
    e.preventDefault();
    const content = noteText.trim();
    if (content.length < 1 || content.length > 2000) {
      setNoteError("Note must be between 1 and 2000 characters.");
      return;
    }
    setNoteError("");
    setPostingNote(true);
    try {
      const note = await postInternalNote(ticketId, content);
      setTicket((prev) => (prev ? { ...prev, internalNotes: [...prev.internalNotes, note] } : prev));
      setNoteText("");
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Unable to save the note.");
    } finally {
      setPostingNote(false);
    }
  }

  async function handleDownload(attachment: AttachmentItem) {
    setDownloadError("");
    try {
      await downloadAttachment(attachment.id, attachment.fileName);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Unable to download attachment.");
    }
  }

  if (status === "loading") {
    return <p className="text-muted">⏳ Loading ticket…</p>;
  }

  if (status === "error" || !ticket) {
    return (
      <div>
        <p className="text-danger mb-3">{errorMessage}</p>
        <button className="btn btn-outline-success" onClick={onBack}>
          ← Back to Queue
        </button>
      </div>
    );
  }

  const validNext = TRANSITIONS[ticket.currentStatus];
  const reassignChoices = owners.filter((o) => o.id !== ticket.ownerId);

  return (
    <div>
      <button className="btn btn-sm btn-outline-secondary mb-3" onClick={onBack}>
        ← Back to Queue
      </button>

      <div className="card mb-4">
        <div className="card-body">
          <h1 className="h4 mb-3">Ticket {ticket.ticketNumber}</h1>

          {ticket.requesterConfirmedResolved && (
            <div className="alert alert-success py-2 small" role="status">
              ✓ Requester confirmed the problem appears resolved
            </div>
          )}

          <div className="row g-3">
            <ReadOnlyField label="Ticket Date" value={new Date(ticket.createdAt).toLocaleString()} />
            <ReadOnlyField label="Requester" value={ticket.requester.name} />
            <ReadOnlyField label="Category" value={ticket.category.name} />
            <ReadOnlyField label="Related System" value={ticket.relatedSystem.name} />
            <ReadOnlyField label="Requested Priority" value={ticket.requestedPriority} />
            <ReadOnlyField label="Current Status" value={formatStatus(ticket.currentStatus)} />
          </div>

          <div className="mt-3">
            <div className="fw-semibold small text-muted mb-1">Summary</div>
            <div className="p-2 rounded" style={{ backgroundColor: "#EEF2EF" }}>
              {ticket.summary}
            </div>
          </div>
          <div className="mt-3">
            <div className="fw-semibold small text-muted mb-1">Description</div>
            <div className="p-2 rounded" style={{ backgroundColor: "#EEF2EF", whiteSpace: "pre-wrap" }}>
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Ticket handling</h2>

          {actionError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {actionError}
            </div>
          )}

          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="fw-semibold small mb-1">Owner</div>
              {ticket.owner ? (
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span>{ticket.owner.name}</span>
                  {!reassigning && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setReassigning(true)}>
                      Reassign
                    </button>
                  )}
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="badge bg-light text-secondary border">Unassigned</span>
                  <button className="btn btn-sm btn-success" onClick={handleClaim} disabled={claiming}>
                    {claiming ? "Claiming…" : "Claim"}
                  </button>
                </div>
              )}
              {reassigning && (
                <div className="mt-2">
                  <label className="form-label small fw-semibold" htmlFor="reassign-to">
                    Reassign to
                  </label>
                  <select
                    id="reassign-to"
                    className="form-select form-select-sm"
                    value={reassignTo}
                    onChange={(e) => setReassignTo(e.target.value)}
                  >
                    <option value="">Select an IT Staff member…</option>
                    {reassignChoices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-sm btn-success" onClick={handleReassign} disabled={!reassignTo}>
                      Confirm reassign
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setReassigning(false);
                        setReassignTo("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="col-12 col-md-4">
              <label className="fw-semibold small mb-1" htmlFor="it-priority">
                IT Priority
              </label>
              <div className="d-flex align-items-center gap-2">
                <select
                  id="it-priority"
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={ticket.itPriority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
                <span className={priorityBadgeClass(ticket.itPriority)}>{ticket.itPriority}</span>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="fw-semibold small mb-1" htmlFor="next-status">
                Change status
              </label>
              {validNext.length === 0 ? (
                <p className="text-muted small mb-0">No further status changes are possible.</p>
              ) : (
                <div className="d-flex gap-2">
                  <select
                    id="next-status"
                    className="form-select form-select-sm"
                    value={nextStatus}
                    onChange={(e) => {
                      setNextStatus(e.target.value);
                      setConfirmingStatus(null);
                    }}
                  >
                    <option value="">Select new status…</option>
                    {validNext.map((s) => (
                      <option key={s} value={s}>
                        {formatStatus(s)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={handleApplyStatus}
                    disabled={!nextStatus || savingStatus}
                  >
                    Apply
                  </button>
                </div>
              )}
              {confirmingStatus && (
                <div className="alert alert-warning py-2 small mt-2 mb-0" role="alert">
                  <div className="mb-2">Move this ticket to {formatStatus(confirmingStatus)}?</div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => applyStatus(confirmingStatus)}
                      disabled={savingStatus}
                    >
                      Yes, change status
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setConfirmingStatus(null)}
                      disabled={savingStatus}
                    >
                      Keep current status
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4" style={{ backgroundColor: "#EAF6EF" }}>
        <div className="card-body">
          <h2 className="h5 mb-1">Public Comments</h2>
          <p className="small text-muted">Visible to the Requester.</p>

          {ticket.publicComments.length === 0 ? (
            <p className="text-muted">No comments yet.</p>
          ) : (
            <ul className="list-group list-group-flush mb-3">
              {ticket.publicComments.map((c) => (
                <Entry key={c.id} entry={c} />
              ))}
            </ul>
          )}

          <form onSubmit={handlePostComment}>
            <label className="form-label small fw-semibold" htmlFor="staff-comment">
              Add a public comment
            </label>
            <textarea
              id="staff-comment"
              className={`form-control ${commentError ? "is-invalid" : ""}`}
              rows={3}
              maxLength={2000}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            {commentError && <div className="invalid-feedback">{commentError}</div>}
            <button type="submit" className="btn btn-sm btn-success mt-2" disabled={postingComment}>
              {postingComment ? "Posting…" : "Post Comment"}
            </button>
          </form>
        </div>
      </div>

      <div className="card mb-4" style={{ backgroundColor: "#FFF4DB", borderColor: "#E0A800" }}>
        <div className="card-body">
          <h2 className="h5 mb-1">Internal Notes</h2>
          <p className="small fw-semibold" style={{ color: "#8A6100" }}>
            Staff only — never shown to the Requester
          </p>

          {ticket.internalNotes.length === 0 ? (
            <p className="text-muted">No internal notes yet.</p>
          ) : (
            <ul className="list-group list-group-flush mb-3">
              {ticket.internalNotes.map((n) => (
                <Entry key={n.id} entry={n} />
              ))}
            </ul>
          )}

          <form onSubmit={handlePostNote}>
            <label className="form-label small fw-semibold" htmlFor="staff-note">
              Add an internal note
            </label>
            <textarea
              id="staff-note"
              className={`form-control ${noteError ? "is-invalid" : ""}`}
              rows={3}
              maxLength={2000}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            {noteError && <div className="invalid-feedback">{noteError}</div>}
            <button type="submit" className="btn btn-sm btn-warning mt-2" disabled={postingNote}>
              {postingNote ? "Saving…" : "Post Note"}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Attachments</h2>
          {downloadError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {downloadError}
            </div>
          )}
          {ticket.attachments.length === 0 ? (
            <p className="text-muted mb-0">No attachments.</p>
          ) : (
            <ul className="list-group">
              {ticket.attachments.map((a) => (
                <li key={a.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <div className={a.isRemoved ? "text-muted text-decoration-line-through" : ""}>
                        {a.fileName} <span className="text-muted small">({(a.sizeBytes / 1024).toFixed(0)} KB)</span>
                        {a.isRemoved && (
                          <span className="badge bg-secondary-subtle text-secondary-emphasis ms-2">Removed</span>
                        )}
                      </div>
                      {a.isRemoved && (
                        <div className="small text-muted">Removal reason: {a.removalReason}</div>
                      )}
                    </div>
                    {!a.isRemoved && (
                      <button className="btn btn-sm btn-outline-success" onClick={() => handleDownload(a)}>
                        Download
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
