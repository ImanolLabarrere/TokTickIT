import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  getCategories,
  getRelatedSystems,
  createTicket,
  ValidationError,
  Category,
  RelatedSystem,
  Priority,
} from "../api.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;

type Status = "loadingRefs" | "refError" | "ready" | "submitting" | "success";

export default function CreateTicket() {
  const { currentRequester } = useRequester();

  const [status, setStatus] = useState<Status>("loadingRefs");
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  useEffect(() => {
    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadReferenceData() {
    setStatus("loadingRefs");
    try {
      const [cats, systems] = await Promise.all([getCategories(), getRelatedSystems()]);
      setCategories(cats);
      setRelatedSystems(systems);
      setStatus("ready");
    } catch {
      setStatus("refError");
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);

    if (selected.length > MAX_FILES) {
      setFileError(`You can attach at most ${MAX_FILES} files.`);
      setFiles([]);
      return;
    }
    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError(`"${file.name}" is not an allowed type (JPG, PNG, WEBP, PDF only).`);
        setFiles([]);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setFileError(`"${file.name}" is larger than 5MB.`);
        setFiles([]);
        return;
      }
    }
    setFileError("");
    setFiles(selected);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentRequester || status === "submitting") return;

    setFieldErrors({});
    setSubmitError("");
    setStatus("submitting");

    try {
      const result = await createTicket(
        {
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          summary,
          description,
          requestedPriority: priority as Priority,
          attachments: files,
        },
        currentRequester.id
      );
      setTicketNumber(result.ticketNumber);
      setStatus("success");
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(err.fields);
      } else {
        setSubmitError(
          err instanceof Error ? err.message : "Unable to create the ticket. Please try again."
        );
      }
      setStatus("ready");
    }
  }

  function handleCreateAnother() {
    setCategoryId("");
    setRelatedSystemId("");
    setSummary("");
    setDescription("");
    setPriority("");
    setFiles([]);
    setFileError("");
    setFieldErrors({});
    setSubmitError("");
    setTicketNumber("");
    setStatus("ready");
  }

  if (status === "loadingRefs") {
    return <p className="text-muted">⏳ Loading form data…</p>;
  }

  if (status === "refError") {
    return (
      <div>
        <p className="text-danger mb-3">Unable to load Categories and Related Systems.</p>
        <button className="btn btn-outline-success" onClick={loadReferenceData}>
          Retry
        </button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="alert alert-success" role="status">
        <h2 className="h5">Ticket created</h2>
        <p className="mb-3">
          Your Ticket Number is <strong>{ticketNumber}</strong>.
        </p>
        <button className="btn btn-success" onClick={handleCreateAnother}>
          Create another ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="h4 mb-4">Create Ticket</h1>

      {submitError && (
        <div className="alert alert-danger" role="alert">
          {submitError}
        </div>
      )}

      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor="category">
          Category <span className="text-danger">*</span>
        </label>
        <select
          id="category"
          className={`form-select ${fieldErrors.categoryId ? "is-invalid" : ""}`}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="" disabled>
            Select a category…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && <div className="invalid-feedback">{fieldErrors.categoryId}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor="relatedSystem">
          Related System <span className="text-danger">*</span>
        </label>
        <select
          id="relatedSystem"
          className={`form-select ${fieldErrors.relatedSystemId ? "is-invalid" : ""}`}
          value={relatedSystemId}
          onChange={(e) => setRelatedSystemId(e.target.value)}
        >
          <option value="" disabled>
            Select a related system…
          </option>
          {relatedSystems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {fieldErrors.relatedSystemId && (
          <div className="invalid-feedback">{fieldErrors.relatedSystemId}</div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor="summary">
          Summary <span className="text-danger">*</span>
        </label>
        <input
          id="summary"
          type="text"
          className={`form-control ${fieldErrors.summary ? "is-invalid" : ""}`}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={150}
        />
        {fieldErrors.summary && <div className="invalid-feedback">{fieldErrors.summary}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor="description">
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          id="description"
          className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
        {fieldErrors.description && (
          <div className="invalid-feedback">{fieldErrors.description}</div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor="priority">
          Requested Priority <span className="text-danger">*</span>
        </label>
        <select
          id="priority"
          className={`form-select ${fieldErrors.requestedPriority ? "is-invalid" : ""}`}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          <option value="" disabled>
            Select a priority…
          </option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        {fieldErrors.requestedPriority && (
          <div className="invalid-feedback">{fieldErrors.requestedPriority}</div>
        )}
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold" htmlFor="attachments">
          Attachments (optional, up to {MAX_FILES}, JPG/PNG/WEBP/PDF, 5MB max each)
        </label>
        <input
          id="attachments"
          type="file"
          className="form-control"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFileChange}
        />
        {fileError && (
          <div className="text-danger small mt-1" role="alert">
            {fileError}
          </div>
        )}
        {files.length > 0 && !fileError && (
          <ul className="small text-muted mt-1 mb-0">
            {files.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" className="btn btn-success" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit Ticket"}
      </button>
    </form>
  );
}
