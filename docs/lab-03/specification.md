# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal

Replace the Lab 2 Development Requester selector with real authentication, and introduce the
IT Staff and Administrator roles: IT Staff can find, claim, prioritize, and work tickets
through a shared queue; Administrators can manage user accounts through a minimalist screen.
Every Lab 2 Requester capability keeps working, now driven by the authenticated identity
instead of a client-supplied id.

## 2. Stakeholder Request Interpretation

The temporary selector was fine for development but the system now needs real users. Replace
it with secure login and a mandatory password change on first use. Give Administrators a
simple way to create/edit/deactivate accounts and assign one role. Give IT Staff a proper
queue to find and work tickets — claim ownership, set IT Priority, communicate with the
Requester, keep private notes, and move the ticket through its status lifecycle. Requesters
can flag that a problem looks fixed, but only IT Staff formally resolves or closes a ticket.
Every protected action must be enforced by the backend, not just hidden in the UI.

## 3. Scope

### Included
- Email/password authentication, password hashing, mandatory first-login password change,
  current-user retrieval, logout.
- Server-side role-based authorization for Requester, IT Staff, and Administrator.
- Migration of Lab 2 Development Requester records into the new `User` model, preserving
  existing Ticket ownership.
- Requester regression: all Lab 2 Ticket/Attachment functions, now scoped to the authenticated
  user; plus Public Comments and a "Problem Appears Resolved" action.
- IT Staff Ticket Queue (search/filter/sort/paginate) and Ticket Detail (claim/reassign, IT
  Priority, status transitions, Public Comments, Internal Notes).
- Administrator User Management: list/search/filter, create, edit, activate/deactivate, reset
  initial password.
- Zen Green UI extensions: role-aware app shell, new screens, consistent badges.

### Excluded
- Password-reset email, MFA, social login, SSO, self-registration.
- Actions Taken (Lab 4), SLA/escalation, notifications, dashboards/KPIs beyond queue counts.
- Multi-tenant orgs, user deletion, bulk operations, multiple roles per user, account history.
- Advanced identity-management (unlocking, approval workflows), production deployment changes.

## 4. Functional Requirements

- **FR-01** A user authenticates with email + password; the backend issues an authenticated
  session and returns the user's id, name, role, and `mustChangePassword` flag.
- **FR-02** A user whose account requires a password change cannot reach any other screen
  until a new valid password is saved.
- **FR-03** The backend exposes a current-user endpoint so the frontend can restore session
  state on reload, and a logout endpoint that ends the session.
- **FR-04** All Lab 2 Ticket/Attachment endpoints authorize using the authenticated user's id,
  ignoring any client-supplied requester id.
- **FR-05** A Requester can post a Public Comment on their own Ticket and mark it as
  "Problem Appears Resolved" (a flag, not a status change).
- **FR-06** IT Staff can retrieve a paginated, searchable, filterable, sortable Ticket Queue
  covering all Tickets (not scoped to one Requester).
- **FR-07** IT Staff can claim an unassigned Ticket or reassign an already-owned Ticket to
  themselves or another active IT Staff member.
- **FR-08** IT Staff can set IT Priority and move a Ticket through a permitted status
  transition.
- **FR-09** IT Staff can post Public Comments (visible to the Requester) and Internal Notes
  (visible only to IT Staff/Administrator) on any Ticket.
- **FR-10** An Administrator can list, search, and role-filter users; create a user with one
  role and an initial password; edit name/email/role/active state; and set a new initial
  password that forces a change at next login.
- **FR-11** The system prevents an Administrator from deactivating their own account or
  removing the last active Administrator.
- **FR-12** Every screen shows only the navigation and actions permitted for the current role;
  every protected backend endpoint independently re-checks that permission.

## 5. Business Rules

- **BR-01** Only an active user with a matching email + password may authenticate; the error
  for "unknown email" and "wrong password" is identical ("Invalid email or password").
- **BR-02** An inactive user cannot authenticate, even with correct credentials; the response
  is the same generic invalid-credentials message (BR-01) — it never reveals that the account
  exists but is inactive.
- **BR-03** Passwords are hashed with bcrypt before storage; plaintext passwords are never
  logged, returned by any API, or committed to the repository.
- **BR-04** A user created or reset by an Administrator has `mustChangePassword = true`; login
  succeeds, but every other endpoint returns 403 until the password is changed.
- **BR-05** Changing a password requires the current password and a new password meeting the
  policy (≥8 characters, at least one letter and one digit); on success `mustChangePassword`
  becomes `false`.
- **BR-06** The authenticated identity from the session — never a client-supplied id — decides
  ownership for every Requester, IT Staff, or Administrator operation.
- **BR-07** A Requester may only view/modify their own Tickets and Attachments; any other
  Ticket id returns 404 (existence of other users' Tickets is never revealed).
- **BR-08** Only IT Staff and Administrator identities are valid Ticket Owners; the Requester
  role can never be assigned as owner.
- **BR-09** Claiming an unassigned Ticket sets its owner to the acting IT Staff member and, if
  the Ticket is still `NEW`, also moves it to `OPEN`.
- **BR-10** Reassigning an already-owned Ticket is allowed for any active IT Staff or
  Administrator acting as IT Staff, to any other active IT Staff member.
- **BR-11** Requested Priority is fixed at creation (Requester-supplied). IT Priority starts
  equal to Requested Priority and can only be changed afterward by IT Staff/Administrator.
- **BR-12** Ticket status only moves along the permitted transition matrix (Section "Status
  Transition Matrix" below); an unlisted transition is rejected with 400.
- **BR-13** Only IT Staff/Administrator can change Ticket status; a Requester can only set the
  `requesterConfirmedResolved` flag, which never changes status by itself.
- **BR-14** `requesterConfirmedResolved` resets to `false` whenever the Ticket status changes
  away from the state it was flagged in, so a stale confirmation can't mislead IT Staff later.
- **BR-15** Public Comments are visible to the Requester, IT Staff, and Administrator; Internal
  Notes are visible only to IT Staff and Administrator. A Requester's direct request for
  Internal Notes returns 403 without leaking note content or count.
- **BR-16** Comments and Notes are append-only in Lab 3 (no edit/delete); empty or
  whitespace-only content is rejected; content is limited to 2000 characters.
- **BR-17** An Administrator creates a user with exactly one role, a name, a unique email
  (case-insensitive), an initial password, and an active/inactive state.
- **BR-18** Duplicate email addresses (case-insensitive) are rejected with a field-level 400 on
  both create and edit.
- **BR-19** An Administrator cannot deactivate their own account.
- **BR-20** The system always keeps at least one active Administrator; an edit that would
  deactivate or demote the last active Administrator is rejected with 400.
- **BR-21** Setting a new initial password for a user sets `mustChangePassword = true` for that
  user; it never logs them out of an already-open session (Lab 3 keeps this simple — the next
  authenticated request after the reset is rejected with 403 requiring a password change,
  consistent with BR-04).
- **BR-22** Migrated Lab 2 Development Requesters keep their original `id` and existing Ticket
  ownership; each receives role `REQUESTER`, `isActive` carried over as-is, and
  `mustChangePassword = true` with a documented seeded initial password (local dev only).

## 6. Authorization Matrix

| Action | Requester | IT Staff | Administrator |
|---|---|---|---|
| Create / view / manage own Tickets & Attachments | ✅ (own only) | — | — |
| Post Public Comment on own Ticket; flag "appears resolved" | ✅ (own only) | — | — |
| View IT Staff Ticket Queue | ❌ | ✅ | ❌ |
| Open any Ticket, post Public Comment, write Internal Note | ❌ | ✅ | ❌ |
| Claim / reassign Ticket owner | ❌ | ✅ | ❌ |
| Set IT Priority / change Ticket status | ❌ | ✅ | ❌ |
| View/search users, create/edit user, set role, activate/deactivate, reset password | ❌ | ❌ | ✅ |

Administrators are intentionally **not** granted IT Staff ticket operations in Lab 3 (labsheet
§4.3: "An Administrator does not automatically need to perform IT Staff Ticket operations
unless the approved authorization matrix explicitly permits it") — the two responsibilities
stay separate. Every row above is enforced by backend middleware keyed on the session's role,
independent of what the frontend shows.

## 7. Status Transition Matrix

```
NEW        → OPEN (claim), CANCELLED
OPEN       → IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
IN_PROGRESS→ WAITING_FOR_REQUESTER, RESOLVED, OPEN
WAITING_FOR_REQUESTER → IN_PROGRESS, OPEN, RESOLVED
RESOLVED   → CLOSED, REOPENED
CLOSED     → REOPENED
REOPENED   → OPEN, IN_PROGRESS
CANCELLED  → (terminal — no further transitions)
```

All transitions are performed by IT Staff or Administrator-acting-as-IT-Staff (BR-13). Claiming
a `NEW` Ticket auto-transitions it to `OPEN` (BR-09); all other transitions are explicit status
changes from Ticket Detail.

## 8. UI Specification Summary

Full detail in `ui-spec.md`. Summary:
- **App shell**: authenticated user's name + role badge replace the Development Requester
  display; Logout action; role-aware navigation (Requester → My Tickets/Create Ticket; IT
  Staff → My Queue/Create Ticket*; Administrator → Admin). *IT Staff can still use the
  Requester Create Ticket flow only if they also hold Requester capability — out of scope in
  Lab 3; IT Staff see only My Queue.
- **Login**: email/password, validation, busy state, generic invalid-credentials failure.
- **Change Password** (mandatory when flagged): current + new + confirm, policy checklist,
  blocks the rest of the app until saved.
- **IT Staff Ticket Queue**: search, Category/Priority/Status/Owner filters, sortable columns,
  pagination, badges for status/priority/owner, empty/no-results/failure states.
- **IT Staff Ticket Detail**: extends the Lab 2 Requester Ticket Detail with Owner, IT Priority,
  status control, Public Comments + Internal Notes shown in visually distinct panels/colors so
  a note can never be mistaken for a public comment.
- **Administrator User Management**: single screen, user table (Name/Email/Role/Status/Edit),
  search + role filter, create/edit side panel, reset-password action, safe validation and
  failure feedback.
- Zen Green tokens, responsive breakpoints, and component states carried over unchanged from
  Lab 2 (`ui-spec.md` §Lab 2, still authoritative for shared rules).

## 9. Data Changes

- **User** (evolved from Lab 2's `Requester` model via a Prisma-detected rename — preserves
  existing rows and every `Ticket.requesterId` foreign key with no data loss): `id`, `name`,
  `email` (unique, case-insensitive), `passwordHash`, `role` (enum `REQUESTER`/`IT_STAFF`/
  `ADMINISTRATOR`), `isActive`, `mustChangePassword`, `createdAt`, `updatedAt`.
- **RelatedSystem**, **Category** — unchanged from Lab 2.
- **Ticket** — adds `ownerId Int?` (FK → User, nullable), `itPriority Priority` (defaults to
  `requestedPriority` at creation), extends `currentStatus` to the full `TicketStatus` enum
  (`NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/RESOLVED/CLOSED/REOPENED/CANCELLED`), adds
  `requesterConfirmedResolved Boolean` (default false). Existing columns/relations unchanged.
- **Attachment** — unchanged from Lab 2.
- **PublicComment** (new): `id`, `ticketId` (FK), `authorId` (FK → User), `content`,
  `createdAt`.
- **InternalNote** (new): `id`, `ticketId` (FK), `authorId` (FK → User), `content`,
  `createdAt`.

Migration strategy: run `prisma migrate dev` interactively so Prisma detects the
`Requester` → `User` model rename (confirm the rename prompt rather than letting it drop and
recreate the table) in the same migration that adds `role`, `passwordHash`, and
`mustChangePassword`. A second migration then adds `ownerId`/`itPriority`/
`requesterConfirmedResolved` to `Ticket` and creates `PublicComment`/`InternalNote`. The seed
becomes idempotent for the new fields (upsert by email) and adds IT Staff/Administrator
accounts plus richer, status-varied Tickets.

## 10. API Contract

Full detail in `api-spec.md`. Endpoints:

- `POST /api/auth/login` — email + password → sets session cookie, returns user + role +
  `mustChangePassword`.
- `POST /api/auth/logout` — clears the session.
- `GET /api/auth/me` — current authenticated user, or 401.
- `POST /api/auth/change-password` — current + new password; clears `mustChangePassword`.
- `GET/POST /api/tickets`, `GET /api/tickets/:id`, attachment endpoints — same paths as Lab 2,
  now authorizing via session instead of `X-Requester-Id`.
- `POST /api/tickets/:id/comments` — Public Comment (Requester-own or any-IT Staff).
- `POST /api/tickets/:id/resolved-confirmation` — Requester flags "appears resolved".
- `GET /api/staff/tickets` — IT Staff queue (search/filter/sort/paginate).
- `POST /api/staff/tickets/:id/claim`, `POST /api/staff/tickets/:id/assign` — ownership.
- `PATCH /api/staff/tickets/:id/priority`, `PATCH /api/staff/tickets/:id/status`.
- `POST /api/staff/tickets/:id/notes` — Internal Note (IT Staff/Administrator only).
- `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`,
  `POST /api/admin/users/:id/reset-password`.

Session strategy: a signed JWT (`userId`, `role`) stored in an **httpOnly, SameSite=Lax**
cookie, 8-hour expiry, verified by a single `requireAuth` middleware that loads the current
user and rejects inactive accounts on every request (so a deactivation takes effect on the
user's very next call, not just at their next login). Logout clears the cookie; because the
token is stateless, a stolen-but-unexpired token remains technically valid until expiry — an
accepted, documented trade-off for this course's local-dev scope (`api-spec.md` records the
justification and the alternative considered — a DB-backed session table — as future work).

## 11. Acceptance Criteria

- **AC-01** Given an active user with valid credentials, when they log in, then the backend
  returns the authenticated identity, role, and `mustChangePassword`, and sets a session cookie.
- **AC-02** Given wrong credentials or an unknown email, when logging in, then the same
  generic "Invalid email or password" message is shown, with no hint which part was wrong.
- **AC-03** Given an inactive account with correct credentials, when logging in, then the
  response is the same generic invalid-credentials message as AC-02.
- **AC-04** Given `mustChangePassword = true`, when the user tries any other authenticated
  endpoint, then it is rejected until a valid password change is saved.
- **AC-05** Given a valid password change, when saved, then `mustChangePassword` becomes false
  and the normal application becomes reachable.
- **AC-06** Given an authenticated Requester, when they supply a different `requesterId` in
  any request body/header, then the backend still uses their own session identity.
- **AC-07** Given Requester B is authenticated, when they request Requester A's Ticket by id,
  then it is rejected with 404.
- **AC-08** Given a Requester requests any Internal Note endpoint, then it is rejected with
  403 and no note content or count is returned.
- **AC-09** Given an unassigned Ticket, when IT Staff claims it, then they become the owner and
  a `NEW` Ticket also moves to `OPEN`.
- **AC-10** Given a status not listed as a valid transition from the current status, when IT
  Staff attempts it, then the API rejects it with 400 and the status is unchanged.
- **AC-11** Given a Requester posts "Problem Appears Resolved," when the Ticket's status later
  changes, then the flag resets to false.
- **AC-12** Given an Administrator creates a user with an email that already exists
  (case-insensitive), then the request is rejected with a field-level 400.
- **AC-13** Given an Administrator tries to deactivate their own account, then it is rejected.
- **AC-14** Given only one active Administrator exists, when an edit would deactivate or
  demote them, then it is rejected.
- **AC-15** Given a non-Administrator calls any `/api/admin/*` endpoint, then it is rejected
  with 403.
- **AC-16** Given a user logs out, when they call any authenticated endpoint afterward with
  the old cookie cleared client-side, then they receive 401.
- **AC-17** Given the IT Staff queue has more results than one page, when IT Staff changes
  filters/sort/page, then only matching results for that combination are returned.
- **AC-18** Given a migrated Lab 2 Requester, when they log in with their seeded initial
  password, then their pre-existing Tickets are still listed under their account.

## 12. Definition of Done

- All Functional Requirements, Business Rules, the Authorization Matrix, and the Status
  Transition Matrix above are implemented and enforced server-side, with every Acceptance
  Criterion covered by at least one passing, traceable test on the final `main` branch.
- No protected action relies on the frontend alone; direct API calls from a disallowed role
  are independently tested and rejected.
- All Lab 2 Requester functionality passes its existing tests, unmodified in behavior, now
  running against the authenticated flow instead of the Development Requester selector.
- Loading, empty, no-results, validation, forbidden, not-found, conflict, and safe-failure
  states are implemented and tested for every new screen.
- Desktop/tablet/mobile screenshots exist for Login/Change Password, Staff Queue, Staff Ticket
  Detail, and Admin User Management, consistent with the Zen Green visual checklist.
- README, `.env.example` (including the new `JWT_SECRET` placeholder), and seed documentation
  are current; no real secret is committed.
- Each Issue ships through its own feature branch and peer-reviewed PR into `lab3-staging`;
  the Kanban card only moves to Done after merge.

## 13. Assumptions and Decisions

Choices made here that the handout leaves open — flag anything you want changed before Issue 2
starts:

1. **Session mechanism**: JWT in an httpOnly cookie (not a DB session table) — simplest choice
   that still keeps the secret off the client; documented trade-off (no true server-side
   revocation before expiry) accepted for course scope.
2. **Password policy**: ≥8 characters, at least one letter and one digit (matches the labsheet
   mockup's checklist style without over-specifying).
3. **Migration mechanic**: Prisma-detected model rename `Requester → User` in one interactive
   migration, not a hand-written data-copy script — simpler and zero data loss for a dev DB.
4. **IT Priority default**: exactly equals Requested Priority at ticket creation time (a plain
   copy, not a computed/weighted value).
5. **Administrators excluded from ticket operations** by default, per labsheet's explicit
   "conceptually separate" guidance — can be revisited if an instructor clarifies otherwise.
6. **"Appears resolved" is a flag, not a status** — kept fully separate from `currentStatus` so
   it can never accidentally auto-close a Ticket.
7. **Seeded initial passwords**: documented in `docs/lab-03/README-seed-credentials.md` (local
   dev only, never a production secret) rather than emailed, since email delivery is excluded.
