import React, { useState, useEffect, useCallback } from "react";
import {
  ActionTaken,
  getTicketActions,
  createTicketAction,
  updateTicketAction,
  ActionApiError,
} from "../api";

interface ActionsTakenProps {
  ticketId: number;
  canManageActions: boolean; // true for IT_STAFF and ADMINISTRATOR
}

export const ActionsTaken: React.FC<ActionsTakenProps> = ({ ticketId, canManageActions }) => {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New action form state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [actionDescription, setActionDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");
  const [actionDateTime, setActionDateTime] = useState<string>("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Editing state
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editResult, setEditResult] = useState<string>("");
  const [editFollowUpRequired, setEditFollowUpRequired] = useState<boolean>(false);
  const [editFollowUpNote, setEditFollowUpNote] = useState<string>("");
  const [editAttachmentNotes, setEditAttachmentNotes] = useState<string>("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const loadActions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getTicketActions(ticketId);
      setActions(data);
    } catch (err) {
      if (err instanceof ActionApiError) {
        setLoadError(err.message);
      } else {
        setLoadError("Unable to load actions taken.");
      }
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!actionDescription.trim()) {
      errors.actionDescription = "Action description is required.";
    } else if (actionDescription.trim().length > 2000) {
      errors.actionDescription = "Action description must not exceed 2000 characters.";
    }

    if (!result.trim()) {
      errors.result = "Result is required.";
    } else if (result.trim().length > 2000) {
      errors.result = "Result must not exceed 2000 characters.";
    }

    if (followUpRequired) {
      if (!followUpNote.trim()) {
        errors.followUpNote = "Follow-up note is required when follow-up is checked.";
      } else if (followUpNote.trim().length > 1000) {
        errors.followUpNote = "Follow-up note must not exceed 1000 characters.";
      }
    }

    if (attachmentNotes.trim().length > 500) {
      errors.attachmentNotes = "Attachment notes must not exceed 500 characters.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!validateCreateForm()) return;

    setSubmitting(true);
    try {
      const created = await createTicketAction(ticketId, {
        actionDescription: actionDescription.trim(),
        result: result.trim(),
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote.trim() : null,
        attachmentNotes: attachmentNotes.trim() || null,
        actionDateTime: actionDateTime ? new Date(actionDateTime).toISOString() : undefined,
      });

      setActions((prev) => [...prev, created]);
      // Reset form
      setActionDescription("");
      setResult("");
      setFollowUpRequired(false);
      setFollowUpNote("");
      setAttachmentNotes("");
      setActionDateTime("");
      setFormErrors({});
      setIsFormOpen(false);
    } catch (err) {
      if (err instanceof ActionApiError) {
        setActionError(err.message);
        if (err.fields) {
          setFormErrors(err.fields);
        }
      } else {
        setActionError("An unexpected error occurred while saving the action.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (action: ActionTaken) => {
    setEditingActionId(action.id);
    setEditDescription(action.actionDescription);
    setEditResult(action.result);
    setEditFollowUpRequired(action.followUpRequired);
    setEditFollowUpNote(action.followUpNote ?? "");
    setEditAttachmentNotes(action.attachmentNotes ?? "");
    setEditErrors({});
  };

  const cancelEditing = () => {
    setEditingActionId(null);
    setEditErrors({});
  };

  const handleEditSubmit = async (actionId: number) => {
    const errors: Record<string, string> = {};
    if (!editDescription.trim()) {
      errors.editDescription = "Action description is required.";
    }
    if (!editResult.trim()) {
      errors.editResult = "Result is required.";
    }
    if (editFollowUpRequired && !editFollowUpNote.trim()) {
      errors.editFollowUpNote = "Follow-up note is required when follow-up is checked.";
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await updateTicketAction(actionId, {
        actionDescription: editDescription.trim(),
        result: editResult.trim(),
        followUpRequired: editFollowUpRequired,
        followUpNote: editFollowUpRequired ? editFollowUpNote.trim() : null,
        attachmentNotes: editAttachmentNotes.trim() || null,
      });

      setActions((prev) => prev.map((a) => (a.id === actionId ? updated : a)));
      setEditingActionId(null);
    } catch (err) {
      if (err instanceof ActionApiError) {
        setEditErrors(err.fields ?? { general: err.message });
      } else {
        setEditErrors({ general: "Failed to update action taken." });
      }
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="card mb-4" style={{ backgroundColor: "#F4F9F5", borderColor: "#2D6A4F" }}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h2 className="h5 mb-0 text-success-emphasis">
              Actions Taken ({actions.length})
            </h2>
            <p className="small text-muted mb-0">
              {canManageActions
                ? "Documented work units and interventions performed by IT Staff."
                : "History of actions taken by IT Staff to resolve your request."}
            </p>
          </div>
          {canManageActions && !isFormOpen && (
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              onClick={() => setIsFormOpen(true)}
            >
              + Record Action Taken
            </button>
          )}
        </div>

        {loadError && (
          <div className="alert alert-danger py-2 small" role="alert">
            {loadError}
          </div>
        )}

        {/* Create Action Taken Form */}
        {canManageActions && isFormOpen && (
          <div className="card mb-3 border-success shadow-sm">
            <div className="card-header bg-success-subtle py-2 d-flex justify-content-between align-items-center">
              <span className="fw-semibold small">New Action Taken</span>
              <button
                type="button"
                className="btn-close btn-close-white small"
                aria-label="Close"
                onClick={() => {
                  setIsFormOpen(false);
                  setFormErrors({});
                  setActionError(null);
                }}
              />
            </div>
            <div className="card-body">
              {actionError && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {actionError}
                </div>
              )}
              <form onSubmit={handleCreateSubmit}>
                <div className="row g-2 mb-2">
                  <div className="col-md-6">
                    <label htmlFor="actionDateTime" className="form-label small fw-semibold">
                      Action Date & Time (optional)
                    </label>
                    <input
                      type="datetime-local"
                      id="actionDateTime"
                      className={`form-control form-control-sm ${
                        formErrors.actionDateTime ? "is-invalid" : ""
                      }`}
                      value={actionDateTime}
                      onChange={(e) => setActionDateTime(e.target.value)}
                    />
                    {formErrors.actionDateTime && (
                      <div className="invalid-feedback">{formErrors.actionDateTime}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="attachmentNotes" className="form-label small fw-semibold">
                      Attachment Notes (optional)
                    </label>
                    <input
                      type="text"
                      id="attachmentNotes"
                      className={`form-control form-control-sm ${
                        formErrors.attachmentNotes ? "is-invalid" : ""
                      }`}
                      placeholder="e.g., config_backup.txt or error_log.png"
                      maxLength={500}
                      value={attachmentNotes}
                      onChange={(e) => setAttachmentNotes(e.target.value)}
                    />
                    {formErrors.attachmentNotes && (
                      <div className="invalid-feedback">{formErrors.attachmentNotes}</div>
                    )}
                  </div>
                </div>

                <div className="mb-2">
                  <label htmlFor="actionDescription" className="form-label small fw-semibold">
                    Action Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="actionDescription"
                    className={`form-control form-control-sm ${
                      formErrors.actionDescription ? "is-invalid" : ""
                    }`}
                    rows={2}
                    maxLength={2000}
                    placeholder="Describe the technical work or diagnostics performed..."
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                  />
                  {formErrors.actionDescription && (
                    <div className="invalid-feedback">{formErrors.actionDescription}</div>
                  )}
                </div>

                <div className="mb-2">
                  <label htmlFor="actionResult" className="form-label small fw-semibold">
                    Result / Outcome <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="actionResult"
                    className={`form-control form-control-sm ${
                      formErrors.result ? "is-invalid" : ""
                    }`}
                    rows={2}
                    maxLength={2000}
                    placeholder="Describe the outcome or diagnostic findings..."
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                  />
                  {formErrors.result && (
                    <div className="invalid-feedback">{formErrors.result}</div>
                  )}
                </div>

                <div className="form-check mb-2">
                  <input
                    type="checkbox"
                    id="followUpRequired"
                    className="form-check-input"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                  />
                  <label htmlFor="followUpRequired" className="form-check-label small fw-semibold">
                    Follow-Up Required?
                  </label>
                </div>

                {followUpRequired && (
                  <div className="mb-3 ps-3 border-start border-warning border-3">
                    <label htmlFor="followUpNote" className="form-label small fw-semibold text-warning-emphasis">
                      Follow-up Note <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="followUpNote"
                      className={`form-control form-control-sm ${
                        formErrors.followUpNote ? "is-invalid" : ""
                      }`}
                      rows={2}
                      maxLength={1000}
                      placeholder="Specify required follow-up actions or instructions..."
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                    />
                    {formErrors.followUpNote && (
                      <div className="invalid-feedback">{formErrors.followUpNote}</div>
                    )}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-sm btn-success"
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "Save Action Taken"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setIsFormOpen(false);
                      setFormErrors({});
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Actions List */}
        {loading ? (
          <p className="text-muted small">Loading actions taken…</p>
        ) : actions.length === 0 ? (
          <p className="text-muted small mb-0">No actions recorded yet.</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {actions.map((action) => {
              const isEditing = editingActionId === action.id;

              if (isEditing) {
                return (
                  <div key={action.id} className="card border-primary p-3 bg-white shadow-sm">
                    <h6 className="fw-semibold text-primary mb-2">Edit Action Taken</h6>
                    {editErrors.general && (
                      <div className="alert alert-danger py-1 small">{editErrors.general}</div>
                    )}
                    <div className="mb-2">
                      <label className="form-label small fw-semibold">Action Description</label>
                      <textarea
                        className={`form-control form-control-sm ${
                          editErrors.editDescription ? "is-invalid" : ""
                        }`}
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      {editErrors.editDescription && (
                        <div className="invalid-feedback">{editErrors.editDescription}</div>
                      )}
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-semibold">Result</label>
                      <textarea
                        className={`form-control form-control-sm ${
                          editErrors.editResult ? "is-invalid" : ""
                        }`}
                        rows={2}
                        value={editResult}
                        onChange={(e) => setEditResult(e.target.value)}
                      />
                      {editErrors.editResult && (
                        <div className="invalid-feedback">{editErrors.editResult}</div>
                      )}
                    </div>
                    <div className="form-check mb-2">
                      <input
                        type="checkbox"
                        id={`edit-followup-${action.id}`}
                        className="form-check-input"
                        checked={editFollowUpRequired}
                        onChange={(e) => setEditFollowUpRequired(e.target.checked)}
                      />
                      <label
                        htmlFor={`edit-followup-${action.id}`}
                        className="form-check-label small fw-semibold"
                      >
                        Follow-Up Required?
                      </label>
                    </div>
                    {editFollowUpRequired && (
                      <div className="mb-2 ps-3 border-start border-warning border-3">
                        <label className="form-label small fw-semibold">Follow-up Note</label>
                        <textarea
                          className={`form-control form-control-sm ${
                            editErrors.editFollowUpNote ? "is-invalid" : ""
                          }`}
                          rows={2}
                          value={editFollowUpNote}
                          onChange={(e) => setEditFollowUpNote(e.target.value)}
                        />
                        {editErrors.editFollowUpNote && (
                          <div className="invalid-feedback">{editErrors.editFollowUpNote}</div>
                        )}
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Attachment Notes</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editAttachmentNotes}
                        onChange={(e) => setEditAttachmentNotes(e.target.value)}
                      />
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleEditSubmit(action.id)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? "Saving…" : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={action.id}
                  className="card bg-white border-0 shadow-sm p-3 position-relative"
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="fw-semibold text-dark">
                        {action.performedByName}
                      </span>
                      <span className="badge bg-secondary-subtle text-secondary-emphasis ms-2 small">
                        {action.performedByRole}
                      </span>
                      <div className="text-muted small mt-1">
                        {new Date(action.actionDateTime).toLocaleString()}
                      </div>
                    </div>
                    {canManageActions && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary py-0 px-2"
                        onClick={() => startEditing(action)}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="mb-2">
                    <span className="small text-muted fw-bold d-block">Action Taken:</span>
                    <p className="mb-0 text-dark small">{action.actionDescription}</p>
                  </div>

                  <div className="mb-2">
                    <span className="small text-muted fw-bold d-block">Result:</span>
                    <p className="mb-0 text-dark small">{action.result}</p>
                  </div>

                  {action.followUpRequired && (
                    <div className="p-2 mb-2 rounded bg-warning-subtle border border-warning-subtle small">
                      <div className="fw-bold text-warning-emphasis">
                        ⚠️ Follow-Up Required:
                      </div>
                      <div className="text-dark">{action.followUpNote}</div>
                    </div>
                  )}

                  {action.attachmentNotes && (
                    <div className="text-muted small">
                      <span className="fw-semibold">📎 File reference:</span>{" "}
                      {action.attachmentNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
