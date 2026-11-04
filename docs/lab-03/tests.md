# Lab 3 Test Plan and Results

## 1. Test Strategy

Unit + API/integration tests (Vitest + Supertest) per Issue, UI component tests (Vitest + Testing
Library), a dedicated authorization pass that hits every protected endpoint directly with no
session and with each role, a migration/regression pass confirming Lab 2 behavior still works under
real authentication, Playwright screenshots at three viewports for every new screen, and E2E flows
for authentication, the staff ticket lifecycle and user administration.

The Lab 2 E2E specs were migrated from the retired Development Requester selector to real login
(Lab 3 §8.2), so the whole Playwright suite runs against the authenticated application.

## 2. Planned Tests

"Final" is **Pass** only for rows whose suite was run green; **Pass** rows must be updated
after the final full run on `lab3-staging` (section 6).

| Test ID | Type | AC(s) | What it tests | Test file | Final |
|---|---|---|---|---|---|
| API-01 | API | AC-01, AC-02 | Valid login; wrong password / unknown email → identical 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-02 | API | AC-03 | Inactive account login → same generic 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-03 | API | AC-04, AC-05 | `mustChangePassword` flag; clears on a valid change | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-04 | API | AC-16 | Logout, then the session is unusable (401) | `server/tests/lab-03/auth.api.test.ts`, `authorization.api.test.ts` | Pass |
| API-05 | API | AC-04, AC-06, AC-07 | Temporary password blocks every protected route; session identity wins over a client-supplied `requesterId`; cross-Requester Ticket → 404 | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-06 | API | AC-08, AC-15 | Authorization matrix: 10 endpoints × anonymous / Requester / IT Staff / Administrator | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-07 | API | FR-06, AC-17 | Staff queue search / filter / sort / pagination; only IT_STAFF allowed | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-08 | API | AC-09 | Claim sets owner + `NEW`→`OPEN`; already-claimed → 409 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-09 | API | AC-10 | Only matrix-listed status transitions succeed; others → 400; `CANCELLED` terminal | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-10 | API | BR-11 | IT Priority copies Requested Priority; only staff change it; Requested Priority untouched | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-11 | API | AC-11 | `requesterConfirmedResolved` resets on any status change | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-12 | API | BR-15, BR-16 | Public Comment vs Internal Note visibility; empty / oversized content rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-13 | API | AC-12 | Duplicate email (case-insensitive) rejected on create and edit | `server/tests/lab-03/admin-users.api.test.ts` | Pass |
| API-14 | API | AC-13 | Self-deactivation blocked; deactivated user locked out on the next request | `server/tests/lab-03/admin-users.api.test.ts` | Pass |
| API-15 | API | FR-10 | User list search + role filter + paging; create / edit / reset-password; reset blocks the open session | `server/tests/lab-03/admin-users.api.test.ts` | Pass |
| API-16 | Unit | AC-14 | Rule behind "never remove the last active Administrator" | `server/tests/lab-03/admin-safety.unit.test.ts` | Pass |
| UI-01 | UI | AC-01, AC-02 | Login form: required fields, generic failure banner | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-02 | UI | AC-04, AC-05 | Change Password: policy checklist, mismatch, safe failure | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-03 | UI | FR-06, AC-17 | Staff Queue rows, filters, empty / no-results / failure states | `client/tests/lab-03/StaffQueue.test.tsx` | Pass |
| UI-04 | UI | AC-09, AC-10, AC-11 | Staff Ticket Detail: claim, reassign, priority, valid status options, confirmation, notes vs comments | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-05 | UI | FR-10, AC-12, AC-13 | User Management: list, search, filter, create, duplicate error, edit, banner, reset, forbidden | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-06 | UI | FR-12 | Role-aware navigation (Requester / IT Staff / Administrator) | `client/tests/lab-03/RoleNavigation.test.tsx` | Pass |
| MIG-01 | Regression | AC-18 | Migrated Lab 2 data keeps its owners (seeded Ticket still belongs to its Requester) | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| MIG-02 | Regression | DoD | All Lab 2 Ticket / Attachment API and UI tests pass against the authenticated flow | `server/tests/lab-02/**`, `client/tests/lab-02/**` | Pass |
| RESP-01 | Responsive | DoD | Desktop / tablet / mobile screenshots: Login, Change Password, Staff Queue, Staff Ticket Detail, User Management | `e2e/lab-03/screenshots.spec.ts` → `artifacts/lab-03/screenshots/**` | Pass |
| E2E-01 | E2E | AC-02..05, AC-16, FR-12 | Invalid / inactive login, forced password change, role + name shown, logout blocks access, per-role navigation | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-02 | E2E | AC-08..11 | IT Staff: claim → IT Priority → status → note + comment; Requester sees only public data; resolve clears the flag | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-03 | E2E | AC-12, AC-13, AC-15 | Administrator: create, duplicate email, reset password, first login, deactivate, self-deactivation blocked | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-04 | E2E | MIG-02 | Lab 2 Requester flows (create ticket, attachments, isolation) under real login | `e2e/lab-02/*.spec.ts` | Pass |

## 3. Acceptance-Criterion Traceability

| AC | Covered by |
|---|---|
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | API-01, UI-01, E2E-01 |
| AC-03 | API-02, E2E-01 |
| AC-04 | API-03, API-05, UI-02, E2E-01 |
| AC-05 | API-03, UI-02, E2E-01 |
| AC-06 | API-05 |
| AC-07 | API-05, E2E-04 |
| AC-08 | API-06, E2E-02 |
| AC-09 | API-08, UI-04, E2E-02 |
| AC-10 | API-09, UI-04, E2E-02 |
| AC-11 | API-11, UI-04, E2E-02 |
| AC-12 | API-13, UI-05, E2E-03 |
| AC-13 | API-14, UI-05, E2E-03 |
| AC-14 | API-16 (unit), manual demo — see section 7 |
| AC-15 | API-06, E2E-03 |
| AC-16 | API-04, E2E-01 |
| AC-17 | API-07, UI-03 |
| AC-18 | MIG-01, MIG-02 |

## 4. Responsive and Visual Checklist

Complete this after opening the screenshots in `artifacts/lab-03/screenshots/**` (mark ✅ or ❌ and
note any problem; do not tick what was not inspected).

| Check | Desktop | Tablet | Mobile |
|---|---|---|---|
| No clipped labels or buttons | ☐ | ☐ | ☐ |
| No overlapping messages | ☐ | ☐ | ☐ |
| No unintended horizontal scroll | ☐ | ☐ | ☐ |
| Role badge legible; role-specific navigation correct | ☐ | ☐ | ☐ |
| Status / priority badges consistent | ☐ | ☐ | ☐ |
| Editable vs read-only fields clearly distinct | ☐ | ☐ | ☐ |
| Public Comments (green) vs Internal Notes (amber) clearly distinct | ☐ | ☐ | ☐ |
| Validation messages next to the field | ☐ | ☐ | ☐ |
| Visible focus ring on every new control | ☐ | ☐ | ☐ |
| Owner chip / table collapses to cards on mobile | n/a | n/a | ☐ |

## 5. Test Commands

- `cd server && npm test`
- `cd client && npm test`
- Start the server (`cd server && npm run dev`) and the client (`cd client && npm run dev`), then
  from the repository root: `npx playwright test` (or `npm run test:e2e:lab3` for Lab 3 only).

`e2e/global-setup.ts` runs `npx prisma db seed` before every Playwright run, so seeded accounts are
back to the password `ChangeMe123`. It also resets any password changed by hand while testing.

## 6. Final Results

To be filled in after the last full run on `lab3-staging` (and again on `main`):

| Suite | Command | Date | Result |
|---|---|---|---|
| Server | `cd server && npm test` | 2026-11-04 | 145/145 tests passed (13 files) |
| Client | `cd client && npm test` | 2026-11-04 | 55/55 tests passed (11 files) |
| E2E + screenshots | `npx playwright test` | 2026-11-04 | 14/14 passed (5 Lab 2 + 9 Lab 3) |

Then replace every **Pass** above with **Pass** (or the failure and its explanation).

## 7. Known Limitations or Deferred Tests

- No automated test for session expiry (8 h): it would require manipulating the clock. Checked by
  reading the cookie / token lifetime in `server/src/middleware/auth.ts`.
- AC-14 (last active Administrator) is covered by a unit test of the rule and by a manual demo,
  not by an end-to-end API test: the shared development database always holds several
  Administrators (seed plus test accounts), so the situation cannot be created without disabling
  accounts that other test files use in parallel.
- An Administrator has no ticket operations (authorization matrix); API-06 asserts 403.
- IT Staff can view and download a Requester's attachments but cannot add or remove them.
- "Requester confirmed the problem appears resolved" has no timestamp: only a boolean is stored.
- `GET /api/staff/owners` (feeds the Owner filter and the Reassign picker) was added during
  Issue 4 and is not part of the original `api-spec.md`.
