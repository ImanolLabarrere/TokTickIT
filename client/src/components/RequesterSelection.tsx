import { useState } from "react";
import { useRequester } from "../context/RequesterContext.js";

export default function RequesterSelection() {
  const { requesters, loading, error, selectRequester, retry } = useRequester();
  const [selectedId, setSelectedId] = useState<string>("");

  if (loading) {
    return (
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <p className="text-muted">⏳ Loading Development Requesters…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <p className="text-danger mb-3">{error}</p>
        <button className="btn btn-outline-success" onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  if (requesters.length === 0) {
    return (
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <p className="text-muted">
          No active Development Requesters are configured. Contact an administrator.
        </p>
      </div>
    );
  }

  function handleContinue() {
    if (selectedId) selectRequester(Number(selectedId));
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="h4 mb-2">Select Development Requester</h1>
      <p className="text-muted mb-4">
        Choose a Development Requester to simulate the current requester context for Lab 2.
        This is for testing only and is not a login screen.
      </p>

      <label htmlFor="requester-select" className="form-label fw-semibold">
        Development Requester <span className="text-danger">*</span>
      </label>
      <select
        id="requester-select"
        className="form-select mb-3"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="" disabled>
          Choose a Requester…
        </option>
        {requesters.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      <div className="alert alert-success py-2 small">Only active Development Requesters are shown.</div>

      <div className="alert alert-secondary py-2 small">
        <strong>Authentication coming in Lab 3.</strong> This selection will be replaced with secure
        authentication so you can access the system with your own account.
      </div>

      <button className="btn btn-success" onClick={handleContinue} disabled={!selectedId}>
        Continue →
      </button>
    </div>
  );
}
