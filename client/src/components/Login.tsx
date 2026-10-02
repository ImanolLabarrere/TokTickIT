import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <div className="card shadow-sm" style={{ maxWidth: 420, width: "100%" }}>
        <div className="text-white text-center py-3" style={{ backgroundColor: "#006B3C" }}>
          <strong>TokTickIT</strong>
        </div>
        <div className="card-body p-4">
          <h1 className="h5 mb-3">Sign in to your account</h1>
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label">Email address</label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="login-password" className="form-label">Password</label>
              <div className="input-group">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn w-100 text-white"
              style={{ backgroundColor: "#006B3C" }}
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}