import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from "react";
import {
  getTicketDetail,
  addAttachment,
  removeAttachment,
  downloadAttachment,
  postComment,
  markProblemAppearsResolved,
  TicketDetailResponse,
  AttachmentItem,
} from "../api.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

type Status = "loading" | "ready" | "error";

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export default function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [ticket, setTicket] = useState<TicketDetailResponse | null>(null);

  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);

  const [downloadError, setDownloadError] = useState("");

  // Lab 3 Issue 3 — FR-05: Public Comments + "Problem Appears Resolved".
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [resolvingError, setResolvingError] = useState("");
  const [markingResolved, setMarkingResolved] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const result = await getTicketDetail(ticketId);
      setTicket(result);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to load ticket. Please try again."
      );
      setStatus("error");
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = ticket ? ticket.attachments.filter((a) => !a.isRemoved).length : 0;

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPG, PNG, WEBP, and PDF files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("Files must be 5MB or smaller.");
      return;
    }
    if (activeCount >= MAX_ATTACHMENTS) {
      setUploadError(`This ticket already has the maximum of ${MAX_ATTACHMENTS} attachments.`);
      return;
    }

    setUploading(true);
    try {
      const attachments = await addAttachment(ticketId, file);
      setTicket((prev) => (prev ? { ...prev, attachments } : prev));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload attachment.");
    } finally {
      setUploading(false);
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

  function startRemove(attachmentId: number) {
    setRemovingId(attachmentId);
    setRemoveReason("");
    setRemoveError("");
  }

  function cancelRemove() {
    setRemovingId(null);
    setRemoveReason("");
    setRemoveError("");
  }

  async function confirmRemove() {
    if (removingId === null) return;
    const reason = removeReason.trim();
    if (reason.length < 3 || reason.length > 200) {
      setRemoveError("Enter a reason (3-200 characters).");
      return;
    }
    setRemoving(true);
    try {
      const updated = await removeAttachment(removingId, reason);
      setTicket((prev) =>
        prev
          ? { ...prev, attachments: prev.attachments.map((a) => (a.id === updated.id ? updated : a)) }
          : prev
      );
      setRemovingId(null);
      setRemoveReason("");
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Unable to remove attachment.");
    } finally {
      setRemoving(false);
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
      setTicket((prev) =>
        prev ? { ...prev, publicComments: [...prev.publicComments, comment] } : prev
      );
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Unable to post comment.");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleMarkResolved() {
    setResolvingError("");
    setMarkingResolved(true);
    try {
      await markProblemAppearsResolved(ticketId);
      setTicket((prev) => (prev ? { ...prev, requesterConfirmedResolved: true } : prev));
    } catch (err) {
      setResolvingError(err instanceof Error ? err.message : "Unable to update the ticket.");
    } finally {
      setMarkingResolved(false);
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
          ← Back to My Tickets
        </button>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-sm btn-outline-secondary mb-3" onClick={onBack}>
        ← Back to My Tickets
      </button>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <h1 className="h4 mb-0">Ticket {ticket.ticketNumber}</h1>
            {ticket.requesterConfirmedResolved ? (
              <span className="badge bg-success-subtle text-success-emphasis">
                You marked this as appearing resolved
              </span>
            ) : (
              <button
                className="btn btn-sm btn-outline-success"
                onClick={handleMarkResolved}
                disabled={markingResolved}
              >
                {markingResolved ? "Saving…" : "Problem Appears Resolved"}
              </button>
            )}
          </div>
          {resolvingError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {resolvingError}
            </div>
          )}
          <div className="row g-3">
            <ReadOnlyField label="Ticket Date" value={new Date(ticket.createdAt).toLocaleString()} />
            <ReadOnlyField label="Requester" value={ticket.requester.name} />
            <ReadOnlyField label="Category" value={ticket.category.name} />
            <ReadOnlyField label="Related System" value={ticket.relatedSystem.name} />
            <ReadOnlyField label="Requested Priority" value={ticket.requestedPriority} />
            <ReadOnlyField label="Current Status" value={ticket.currentStatus} />
          </div>
          <div className="mt-3">
            <div className="fw-semibold small text-muted mb-1">Summary</div>
            <div className="p-2 rounded" style={{ backgroundColor: "#EEF2EF" }}>
              {ticket.summary}
            </div>
          </div>
          <div className="mt-3">
            <div className="fw-semibold small text-muted mb-1">Description</div>
            <div
              className="p-2 rounded"
              style={{ backgroundColor: "#EEF2EF", whiteSpace: "pre-wrap" }}
            >
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Public Comments</h2>

          {ticket.publicComments.length === 0 ? (
            <p className="text-muted">No comments yet.</p>
          ) : (
            <ul className="list-group mb-3">
              {ticket.publicComments.map((c) => (
                <li key={c.id} className="list-group-item">
                  <div className="d-flex justify-content-between">
                    <strong>{c.authorName}</strong>
                    <span className="text-muted small">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handlePostComment}>
            <label className="form-label small fw-semibold" htmlFor="new-comment">
              Add a comment
            </label>
            <textarea
              id="new-comment"
              className={`form-control ${commentError ? "is-invalid" : ""}`}
              rows={3}
              maxLength={2000}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            {commentError && <div className="invalid-feedback">{commentError}</div>}
            <button
              type="submit"
              className="btn btn-sm btn-success mt-2"
              disabled={postingComment}
            >
              {postingComment ? "Posting…" : "Post Comment"}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 mb-0">Attachments</h2>
            <div>
              <label htmlFor="add-attachment" className="btn btn-sm btn-success mb-0">
                {uploading ? "Uploading…" : "+ Add Attachment"}
              </label>
              <input
                id="add-attachment"
                type="file"
                className="visually-hidden"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                disabled={uploading || activeCount >= MAX_ATTACHMENTS}
              />
            </div>
          </div>

          {uploadError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {uploadError}
            </div>
          )}
          {downloadError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {downloadError}
            </div>
          )}

          {ticket.attachments.length === 0 ? (
            <p className="text-muted mb-0">No attachments yet.</p>
          ) : (
            <ul className="list-group">
              {ticket.attachments.map((a) => (
                <li key={a.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <div className={a.isRemoved ? "text-muted text-decoration-line-through" : ""}>
                        {a.fileName}{" "}
                        <span className="text-muted small">
                          ({(a.sizeBytes / 1024).toFixed(0)} KB)
                        </span>
                        {a.isRemoved && (
                          <span className="badge bg-secondary-subtle text-secondary-emphasis ms-2">
                            Removed
                          </span>
                        )}
                      </div>
                      {a.isRemoved ? (
                        <div className="small text-muted">
                          Removed {a.removedAt ? new Date(a.removedAt).toLocaleString() : ""} —{" "}
                          {a.removalReason}
                        </div>
                      ) : (
                        <div className="small text-muted">
                          Uploaded {new Date(a.uploadedAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {!a.isRemoved && (
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => handleDownload(a)}
                        >
                          Download
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => startRemove(a.id)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {removingId === a.id && (
                    <div className="mt-2 p-2 border rounded">
                      <label className="form-label small fw-semibold" htmlFor={`reason-${a.id}`}>
                        Reason for removal <span className="text-danger">*</span>
                      </label>
                      <input
                        id={`reason-${a.id}`}
                        type="text"
                        className={`form-control form-control-sm ${removeError ? "is-invalid" : ""}`}
                        value={removeReason}
                        onChange={(e) => setRemoveReason(e.target.value)}
                        maxLength={200}
                      />
                      {removeError && <div className="invalid-feedback">{removeError}</div>}
                      <div className="d-flex gap-2 mt-2">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={confirmRemove}
                          disabled={removing}
                        >
                          {removing ? "Removing…" : "Confirm Removal"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={cancelRemove}
                          disabled={removing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
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
