import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  AdminApiError,
  AdminUser,
  Role,
  createAdminUser,
  getAdminUsers,
  resetAdminPassword,
  updateAdminUser,
} from "../api.js";

type Status = "loading" | "ready" | "error" | "forbidden";
type Panel = null | { mode: "create" } | { mode: "edit"; user: AdminUser };

const PAGE_SIZE = 10;

const ROLE_LABELS: Record<Role, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
};

function roleBadgeClass(role: Role): string {
  if (role === "ADMINISTRATOR") return "badge bg-success text-white";
  if (role === "IT_STAFF") return "badge bg-info-subtle text-info-emphasis";
  return "badge bg-light text-secondary border";
}

function statusBadgeClass(isActive: boolean): string {
  return isActive
    ? "badge bg-success-subtle text-success-emphasis"
    : "badge bg-danger-subtle text-danger-emphasis";
}

function randomInt(max: number): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

// Fills a random password that satisfies the policy (>= 8 chars, a letter and a digit).
function generatePassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = lower + upper + digits;
  const chars = [lower, upper, digits].map((set) => set[randomInt(set.length)]);
  while (chars.length < 12) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function FieldError({ message }: { message?: string }) {
  return message ? <div className="text-danger small mt-1">{message}</div> : null;
}

export default function UserManagement() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("REQUESTER");
  const [isActive, setIsActive] = useState(true);
  const [initialPassword, setInitialPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const result = await getAdminUsers({
        search: search || undefined,
        role: (roleFilter || undefined) as Role | undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setUsers(result.data);
      setTotalItems(result.pagination.totalItems);
      setTotalPages(result.pagination.totalPages);
      setStatus("ready");
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 403) {
        setStatus("forbidden");
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Unable to load users. Please try again.");
      setStatus("error");
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setName("");
    setEmail("");
    setRole("REQUESTER");
    setIsActive(true);
    setInitialPassword("");
    setFieldErrors({});
    setFormError("");
    setResetting(false);
    setNewPassword("");
    setResetError("");
  }

  function openCreate() {
    resetForm();
    setNotice("");
    setPanel({ mode: "create" });
  }

  function openEdit(user: AdminUser) {
    resetForm();
    setNotice("");
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setIsActive(user.isActive);
    setPanel({ mode: "edit", user });
  }

  function closePanel() {
    resetForm();
    setPanel(null);
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function showSaveError(err: unknown) {
    if (err instanceof AdminApiError && Object.keys(err.fields).length > 0) {
      setFieldErrors(err.fields);
    } else {
      setFormError(err instanceof Error ? err.message : "Unable to save. Please try again.");
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!panel) return;

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    if (panel.mode === "create" && !initialPassword) errors.initialPassword = "Initial password is required.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (panel.mode === "create") {
        await createAdminUser({ name, email, role, isActive, initialPassword });
        setNotice("User created. They must choose a new password at first login.");
      } else {
        await updateAdminUser(panel.user.id, { name, email, role, isActive });
        setNotice("User updated.");
      }
      closePanel();
      await load();
    } catch (err) {
      showSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!panel || panel.mode !== "edit") return;
    if (!newPassword) {
      setResetError("Enter a new initial password.");
      return;
    }
    setResetError("");
    setResetSaving(true);
    try {
      await resetAdminPassword(panel.user.id, newPassword);
      setNotice("Password reset. The user must choose a new password at next login.");
      closePanel();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Unable to reset the password.");
    } finally {
      setResetSaving(false);
    }
  }

  if (status === "forbidden") {
    return (
      <div>
        <h1 className="h4">User Management</h1>
        <p className="text-muted">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h1 className="h4 mb-0">User Management</h1>
          <p className="text-muted small mb-0">Create accounts, assign one role and control access.</p>
        </div>
        <button className="btn btn-success" onClick={openCreate}>
          + Create User
        </button>
      </div>

      {notice && (
        <div className="alert alert-success py-2" role="status">
          {notice}
        </div>
      )}

      <div className="row g-4">
        <div className={panel ? "col-12 col-lg-8" : "col-12"}>
          <form className="row g-2 align-items-end mb-3" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold" htmlFor="user-search">
                Search users
              </label>
              <input
                id="user-search"
                type="text"
                className="form-control"
                placeholder="Name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold" htmlFor="user-role-filter">
                Filter by role
              </label>
              <select
                id="user-role-filter"
                className="form-select"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <button type="submit" className="btn btn-outline-success w-100">
                Search
              </button>
            </div>
          </form>

          {status === "loading" && <p className="text-muted">⏳ Loading users…</p>}

          {status === "error" && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{errorMessage}</span>
              <button className="btn btn-sm btn-outline-danger" onClick={load}>
                Retry
              </button>
            </div>
          )}

          {status === "ready" && users.length === 0 && (
            <p className="text-muted text-center py-4">No users match your search.</p>
          )}

          {status === "ready" && users.length > 0 && (
            <>
              <div className="d-none d-md-block table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="fw-semibold">{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={roleBadgeClass(u.role)}>{ROLE_LABELS[u.role]}</span>
                        </td>
                        <td>
                          <span className={statusBadgeClass(u.isActive)}>{u.isActive ? "Active" : "Inactive"}</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-success"
                            aria-label={`Edit ${u.name}`}
                            onClick={() => openEdit(u)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-md-none d-flex flex-column gap-2">
                {users.map((u) => (
                  <div key={u.id} className="card">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <strong>{u.name}</strong>
                        <span className={statusBadgeClass(u.isActive)}>{u.isActive ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="small text-muted my-1">{u.email}</div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className={roleBadgeClass(u.role)}>{ROLE_LABELS[u.role]}</span>
                        <button
                          className="btn btn-sm btn-outline-success"
                          aria-label={`Edit ${u.name}`}
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3">
                <span className="text-muted small">
                  {totalItems} {totalItems === 1 ? "user" : "users"} — page {page} of {totalPages}
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

        {panel && (
          <div className="col-12 col-lg-4">
            <form className="card" onSubmit={handleSave} noValidate>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0">{panel.mode === "create" ? "Create New User" : "Edit User"}</h2>
                  <button type="button" className="btn-close" aria-label="Close panel" onClick={closePanel} />
                </div>

                {formError && (
                  <div className="alert alert-danger py-2 small" role="alert">
                    {formError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-semibold" htmlFor="um-name">
                    Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="um-name"
                    className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                  />
                  <FieldError message={fieldErrors.name} />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold" htmlFor="um-email">
                    Email Address <span className="text-danger">*</span>
                  </label>
                  <input
                    id="um-email"
                    type="email"
                    className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <FieldError message={fieldErrors.email} />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold" htmlFor="um-role">
                    Role <span className="text-danger">*</span>
                  </label>
                  <select
                    id="um-role"
                    className={`form-select ${fieldErrors.role ? "is-invalid" : ""}`}
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    <option value="REQUESTER">Requester</option>
                    <option value="IT_STAFF">IT Staff</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                  </select>
                  <FieldError message={fieldErrors.role} />
                </div>

                <div className="form-check form-switch mb-3">
                  <input
                    id="um-active"
                    type="checkbox"
                    role="switch"
                    className="form-check-input"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label className="form-check-label small fw-semibold" htmlFor="um-active">
                    Active
                  </label>
                </div>

                {panel.mode === "create" && (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold" htmlFor="um-password">
                      Initial Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        id="um-password"
                        type="text"
                        autoComplete="off"
                        className={`form-control ${fieldErrors.initialPassword ? "is-invalid" : ""}`}
                        value={initialPassword}
                        onChange={(e) => setInitialPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setInitialPassword(generatePassword())}
                      >
                        Generate
                      </button>
                    </div>
                    <FieldError message={fieldErrors.initialPassword} />
                    <div className="form-text">The user must change it at first login.</div>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? "Saving…" : "Save User"}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={closePanel} disabled={saving}>
                    Cancel
                  </button>
                </div>

                {panel.mode === "edit" && (
                  <div className="border-top mt-3 pt-3">
                    {!resetting ? (
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setResetting(true)}>
                        Reset Password
                      </button>
                    ) : (
                      <div>
                        <label className="form-label small fw-semibold" htmlFor="um-new-password">
                          New initial password
                        </label>
                        <div className="input-group">
                          <input
                            id="um-new-password"
                            type="text"
                            autoComplete="off"
                            className={`form-control ${resetError ? "is-invalid" : ""}`}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setNewPassword(generatePassword())}
                          >
                            Generate
                          </button>
                        </div>
                        <FieldError message={resetError} />
                        <div className="form-text">The user must change it at their next login.</div>
                        <div className="d-flex gap-2 mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={handleResetPassword}
                            disabled={resetSaving}
                          >
                            {resetSaving ? "Resetting…" : "Confirm reset"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              setResetting(false);
                              setNewPassword("");
                              setResetError("");
                            }}
                            disabled={resetSaving}
                          >
                            Cancel reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
