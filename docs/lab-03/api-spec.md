# Lab 3 API Specification

Session: JWT in an httpOnly, SameSite=Lax cookie named `toktickit_session`, 8-hour expiry.
Every endpoint below except `POST /api/auth/login` requires a valid, non-expired session
belonging to an **active** user (checked on every request, not just at login). Unless noted,
responses are JSON. Safe-error rule: never reveal whether a resource exists if the caller
isn't allowed to know (respond 404, not 403, for ownership failures on Requester-scoped data).

## Authentication

### `POST /api/auth/login`
Body: `{ email: string, password: string }`
- `200` `{ user: { id, name, email, role, mustChangePassword } }` + sets session cookie.
- `400` invalid body shape.
- `401` `{ error: "Invalid email or password" }` — used for unknown email, wrong password,
  AND inactive account (BR-01/BR-02: identical response, never distinguishes the reason).

### `POST /api/auth/logout`
- `200` `{ ok: true }`, clears the session cookie. Idempotent (200 even if not logged in).

### `GET /api/auth/me`
- `200` `{ user: { id, name, email, role, mustChangePassword } }`
- `401` no/expired/invalid session, or the user is no longer active.

### `POST /api/auth/change-password`
Body: `{ currentPassword: string, newPassword: string }`
- `200` `{ ok: true }`, clears `mustChangePassword`.
- `400` `{ error, fields: { newPassword? } }` — policy failure (<8 chars, missing letter/digit).
- `401` current session invalid.
- `403` `{ error: "Current password is incorrect" }`.
- Available even while `mustChangePassword` is true — it's the one endpoint that bypasses the
  "must change password" gate, since it's how the gate gets cleared.

### Global gate: `mustChangePassword`
Every other authenticated endpoint (all routes below) responds `403
{ error: "Password change required", mustChangePassword: true }` if the session's user still
has `mustChangePassword = true`.

## Requester (Lab 2 endpoints, now session-scoped)

Same paths as Lab 2 (`GET/POST /api/tickets`, `GET /api/tickets/:id`,
`POST /api/tickets/:id/attachments`, `GET /api/attachments/:id`,
`GET /api/attachments/:id/download`, `DELETE /api/attachments/:id`). The `X-Requester-Id`
header is removed; the authenticated session's user id is used instead. Any Ticket/Attachment
not owned by the caller returns `404` (BR-07). Role required: `REQUESTER` for creating a
Ticket; any role may hold Requester-owned data only if they are that Ticket's requester (in
practice only `REQUESTER` accounts create Tickets in Lab 3).

### `POST /api/tickets/:id/comments`
Body: `{ content: string }` (1–2000 chars, trimmed, non-blank).
- `201` `{ id, content, authorId, authorName, createdAt }`.
- `400` empty/too long.
- `404` Ticket not owned by caller (Requester) and caller is not IT Staff/Administrator.
- Allowed roles: `REQUESTER` (own Ticket only), `IT_STAFF`, `ADMINISTRATOR` (any Ticket, but
  see Authorization Matrix — Administrator is not granted Staff ticket operations in Lab 3, so
  in practice only `REQUESTER` and `IT_STAFF` use this in the UI).

### `POST /api/tickets/:id/resolved-confirmation`
Body: `{}`
- `200` `{ requesterConfirmedResolved: true }`.
- `404` not the caller's Ticket.
- Role required: `REQUESTER`, own Ticket only.

## IT Staff

All routes below require role `IT_STAFF` (or `ADMINISTRATOR` acting as staff is **not**
granted per the Authorization Matrix — these return `403` for `ADMINISTRATOR` too, unless a
future decision changes that). `403 { error: "Forbidden" }` for any other role.

### `GET /api/staff/tickets`
Query: `search, categoryId, requestedPriority, itPriority, currentStatus, ownerId ("unassigned"
| userId), sortBy (createdAt|updatedAt|itPriority), sortDir, page, pageSize`. Same
clamping/defaults pattern as Lab 2's `GET /api/tickets` (BR-13 in `specification.md`).
- `200` `{ data: [{ id, ticketNumber, summary, requesterName, categoryName, requestedPriority,
  itPriority, currentStatus, ownerName, createdAt, updatedAt }], pagination }`.

### `GET /api/staff/tickets/:id`
- `200` full Ticket detail including Attachments, Public Comments, Internal Notes.
- `404` unknown id.

### `POST /api/staff/tickets/:id/claim`
- `200` `{ ownerId, ownerName, currentStatus }` — sets owner to caller; `NEW` → `OPEN` (BR-09).
- `409` already claimed by someone else (use `/assign` instead).

### `POST /api/staff/tickets/:id/assign`
Body: `{ ownerId: number }` (must be an active IT Staff/Administrator user).
- `200` `{ ownerId, ownerName }`.
- `400` target user invalid, inactive, or not IT Staff/Administrator.

### `PATCH /api/staff/tickets/:id/priority`
Body: `{ itPriority: "LOW"|"MEDIUM"|"HIGH" }`
- `200` `{ itPriority }`.

### `PATCH /api/staff/tickets/:id/status`
Body: `{ currentStatus: <TicketStatus> }`
- `200` `{ currentStatus }`; also resets `requesterConfirmedResolved` to false (BR-14).
- `400` `{ error: "Invalid status transition", from, to }` if not in the transition matrix
  (`specification.md` §7).

### `POST /api/staff/tickets/:id/notes`
Body: `{ content: string }` (1–2000 chars).
- `201` `{ id, content, authorId, authorName, createdAt }`.
- `400` empty/too long.

## Administrator

All routes require role `ADMINISTRATOR`. `403` otherwise.

### `GET /api/admin/users`
Query: `search (name or email, partial, case-insensitive), role (optional filter), page,
pageSize` (defaults 10; no mandatory multi-sort per labsheet §4.2 exclusions).
- `200` `{ data: [{ id, name, email, role, isActive }], pagination }`.

### `POST /api/admin/users`
Body: `{ name, email, role, isActive, initialPassword }`
- `201` `{ id, name, email, role, isActive }`.
- `400` `{ error, fields: { email? } }` — duplicate email (case-insensitive, BR-18), invalid
  role, weak initial password (same policy as change-password).
- Created user gets `mustChangePassword = true`.

### `PATCH /api/admin/users/:id`
Body: subset of `{ name, email, role, isActive }`.
- `200` updated user.
- `400` duplicate email.
- `400` `{ error: "Cannot deactivate your own account" }` (BR-19, self-targeted `isActive:
  false`).
- `400` `{ error: "At least one active Administrator is required" }` (BR-20, would deactivate
  or demote the last active Administrator).

### `POST /api/admin/users/:id/reset-password`
Body: `{ newInitialPassword: string }`
- `200` `{ ok: true }`; sets `mustChangePassword = true` for that user.
- `400` weak password.

## HTTP status summary

| Status | Meaning in this API |
|---|---|
| 200 | Successful read/update |
| 201 | Resource created (Ticket, Comment, Note, User) |
| 400 | Validation failure, invalid transition, duplicate email |
| 401 | No/expired/invalid session |
| 403 | Authenticated but forbidden (wrong role, `mustChangePassword` gate, wrong password) |
| 404 | Unknown id, or a Requester-owned resource that isn't the caller's (never 403 here) |
| 409 | Conflicting state (Ticket already claimed) |
| 500 | Unexpected server error (safe generic message, no internals) |
