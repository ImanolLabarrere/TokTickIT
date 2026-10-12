import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext.js";

function checklist(password: string) {
  return {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    digit: /[0-9]/.test(password),
  };
}

export default function ChangePassword() {
  const { changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = checklist(newPassword);
  const allChecksPass = checks.length && checks.letter && checks.digit;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit = allChecksPass && !mismatch && currentPassword.length > 0 && !busy;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <div className="card shadow-sm" style={{ maxWidth: 420, width: "100%" }}>
        <div className="card-body p-4">
          <h1 className="h5">Change Your Password</h1>
          <p className="text-muted small">You must change your password to continue.</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="current-password" className="form-label">Current (temporary) password</label>
              <input
                id="current-password"
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="new-password" className="form-label">New password</label>
              <input
                id="new-password"
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="confirm-password" className="form-label">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {mismatch && <div className="text-danger small mt-1">Passwords do not match.</div>}
            </div>

            <ul className="list-unstyled small mb-3">
              <li className={checks.length ? "text-success" : "text-muted"}>{checks.length ? "✓" : "○"} Be at least 8 characters</li>
              <li className={checks.letter ? "text-success" : "text-muted"}>{checks.letter ? "✓" : "○"} Include at least one letter</li>
              <li className={checks.digit ? "text-success" : "text-muted"}>{checks.digit ? "✓" : "○"} Include at least one digit</li>
            </ul>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn w-100 text-white"
              style={{ backgroundColor: "#006B3C" }}
              disabled={!canSubmit}
            >
              {busy ? "Saving…" : "Continue"}
            </button>
          </form>
          <button className="btn btn-link btn-sm mt-2" onClick={() => logout()} type="button">
            Log out instead
          </button>
        </div>
      </div>
    </div>
  );
}