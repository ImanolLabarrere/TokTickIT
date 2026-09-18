# Lab 3 Test Plan and Results

## 1. Test Strategy

Unit + API/integration tests (Vitest + Supertest) per Issue, UI component tests (Vitest +
Testing Library), a dedicated authorization pass hitting protected endpoints directly with the
wrong role/no session, a migration/regression pass confirming Lab 2 behavior still works
end-to-end under real auth, Playwright screenshots at 3 viewports for every new screen, and
E2E flows for authentication, the staff ticket lifecycle, and user administration.

## 2. Planned Tests

| Test ID | Type | AC(s) | What it tests | Test file | Final |
|---|---|---|---|---|---|
| API-01 | API | AC-01, AC-02 | Valid login; wrong password/unknown email → identical 401 | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-02 | API | AC-03 | Inactive account login → same generic 401 as AC-02 | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-03 | API | AC-04, AC-05 | `mustChangePassword` blocks other endpoints; clears on valid change | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-04 | API | AC-16 | Logout, then old cookie cleared client-side → 401 on next call | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-05 | API | AC-06, AC-07 | Session identity wins over client-supplied id; cross-Requester Ticket → 404 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-06 | API | AC-08, AC-15 | Requester → Internal Notes 403; non-Admin → `/api/admin/*` 403 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-07 | API | FR-06, AC-17 | Staff queue search/filter/sort/pagination, all roles except IT_STAFF rejected | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-08 | API | AC-09 | Claim sets owner + `NEW`→`OPEN`; claiming an already-claimed Ticket → 409 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-09 | API | AC-10 | Only matrix-listed status transitions succeed; others → 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-10 | API | BR-11 | IT Priority defaults to Requested Priority; only Staff can change it | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-11 | API | AC-11 | `requesterConfirmedResolved` resets to false on any status change | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-12 | API | BR-15/16 | Public Comment vs Internal Note visibility; empty/oversized content rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-13 | API | AC-12 | Duplicate email (case-insensitive) rejected on create and edit | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-14 | API | AC-13, AC-14 | Self-deactivation blocked; last-active-Administrator protection | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-15 | API | FR-10 | User list search + role filter; create/edit/reset-password happy paths | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| UI-01 | UI | AC-01, AC-02 | Login form: validation, busy state, generic failure banner | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-02 | UI | AC-04, AC-05 | Change Password: policy checklist, mismatch, success unlocks app | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-03 | UI | FR-06 | Staff Queue renders rows, applies filters, empty/no-results/failure states | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-04 | UI | AC-09, AC-10 | Staff Ticket Detail: claim, priority change, restricted status options | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-05 | UI | FR-10, AC-12 | User Management: list, search, create validation, edit, reset password | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| MIG-01 | Regression | AC-18 | A migrated Lab 2 Requester still owns their pre-existing Tickets after login | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| MIG-02 | Regression | DoD | All Lab 2 Ticket/Attachment tests still pass against the authenticated flow | `server/tests/lab-02/**` (re-run) | Planned |
| RESP-01 | Responsive | DoD | Desktop/tablet/mobile screenshots for Login, Staff Queue, Staff Ticket Detail, Admin | `artifacts/lab-03/screenshots/**` | Planned |
| E2E-01 | E2E | AC-01, 04, 05 | Full login → forced password change → normal app | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-02 | E2E | AC-09, 10, 11 | IT Staff: claim → set IT Priority → progress status → resolve | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-03 | E2E | FR-10, AC-12..14 | Administrator: create user, hit duplicate email, reset password, self-deactivation blocked | `e2e/lab-03/user-administration.spec.ts` | Planned |

## 3. Acceptance-Criterion Traceability

Every AC-01…AC-18 in `specification.md` maps to at least one row above (API-01/02 → AC-01–03;
API-03 → AC-04/05; API-05 → AC-06/07; API-06 → AC-08; API-08 → AC-09; API-09 → AC-10; API-11 →
AC-11; API-13/14 → AC-12–14; API-06 → AC-15; API-04 → AC-16; API-07 → AC-17; MIG-01 → AC-18).

## 4. Responsive and Visual Checklist

To be completed with real screenshots in Issue 7 (`feature/7-integration-qa`): role badge
legibility, Public Comment vs Internal Note color distinction, owner chip on mobile cards, no
horizontal scroll on the Admin two-pane→single-pane collapse, focus rings on all new
interactive controls.

## 5. Test Commands

`cd server && npm test` · `cd client && npm test` · `npx playwright test` (from repo root, once
`e2e/lab-03/*` exists).

## 6. Final Results

Not yet run — implementation starts at Issue 2. This table's "Final" column will be updated to
Pass/Fail with real terminal screenshots as each Issue is merged, and a last full pass recorded
once Issue 7 (integration QA) is done on `main`.

## 7. Known Limitations or Deferred Tests

- No automated test for JWT expiry (8h) itself — would require manipulating system time;
  documented as a manual/deferred check.
- Administrator-as-staff access is asserted as forbidden per the current Authorization Matrix;
  if that decision changes, API-06/API-07 must be updated accordingly.
