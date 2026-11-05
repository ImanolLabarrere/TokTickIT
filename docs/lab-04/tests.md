# Lab 4 Test Plan and Traceability

## 1. Test Strategy

Lab 4 completes the verification matrix with end-to-end coverage across all new increments while maintaining 100% regression stability for Labs 1 to 3:
- **API Integration Tests** (Vitest + Supertest):
  - `actions-taken.api.test.ts`: CRUD for Actions Taken, server-stamped performer, mandatory follow-up notes, foreign ticket isolation, role boundaries.
  - `ticket-workflow.api.test.ts`: Status transition matrix enforcement, resolution gating (owner required), stale-update conflict detection (`409 Conflict`), reset of `requesterConfirmedResolved`.
  - `requester-dashboard.api.test.ts`: Requester metrics aggregation, strict user scoping, recent tickets query.
  - `staff-dashboard.api.test.ts`: IT Staff & Admin operational metrics, unassigned ticket counts, status/priority groupings, recent tickets query.
- **UI Component Tests** (Vitest + React Testing Library):
  - `ActionsTaken.test.tsx`: List rendering, validation of description and follow-up notes, role-based controls (hidden for Requesters, active for Staff).
  - `TicketWorkflow.test.tsx`: Permitted transition dropdown, resolution confirmation flow, conflict banner.
  - `RequesterDashboard.test.tsx`: Metric card rendering, zero-state behavior, drill-down link parameters.
  - `StaffDashboard.test.tsx`: Staff metric cards, priority breakdown, refresh action, drill-down to queue filters.
- **End-to-End & Responsive Tests** (Playwright):
  - `actions-taken-flow.spec.ts`: Full lifecycle of logging and viewing actions taken across roles.
  - `ticket-resolution.spec.ts`: End-to-end progression from New -> Open -> In Progress -> Resolved, with advisory confirmation and formal resolution.
  - `dashboards.spec.ts`: Metric verification, drill-down navigation, responsive verification.
  - Responsive visual captures at 3 viewports: Desktop (1280px), Tablet (768px), Mobile (375px) stored in `artifacts/lab-04/screenshots/`.

---

## 2. Planned Tests & Traceability Matrix

| Test ID | Type | AC(s) | What it tests | Test file | Final |
|---|---|---|---|---|---|
| API-01 | API | AC-01, AC-02 | IT Staff creates valid Action Taken; performer is server-assigned; Requester is blocked (403) | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-02 | API | AC-03, AC-04 | Requester views actions on own ticket; returns 404 for foreign ticket | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-03 | API | AC-05, AC-06 | Validation: empty description/result rejected (400); follow-up required requires follow-up note | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-04 | API | BR-02, BR-10 | Any IT Staff can log action on non-owned ticket; edit action persists updates | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-05 | API | AC-07, BR-12 | Transition matrix enforcement: valid transitions pass; unlisted transitions rejected (400) | `server/tests/lab-04/ticket-workflow.api.test.ts` | To confirm |
| API-06 | API | AC-08, BR-14 | Resolution gate: resolving an unassigned ticket fails (400); owner required | `server/tests/lab-04/ticket-workflow.api.test.ts` | To confirm |
| API-07 | API | BR-15, BR-16 | Flag reset on status change; stale-update conflict returns 409 | `server/tests/lab-04/ticket-workflow.api.test.ts` | To confirm |
| API-08 | API | AC-09, BR-17 | Requester dashboard metrics strictly scoped to caller; recent 5 tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | To confirm |
| API-09 | API | AC-10, BR-18 | Staff dashboard metrics: unassigned count, assigned-to-me count, status & priority counts | `server/tests/lab-04/staff-dashboard.api.test.ts` | To confirm |
| API-10 | API | AC-11, BR-19 | Auth enforcement: anonymous 401; Requester blocked from staff dashboard (403) | `server/tests/lab-04/staff-dashboard.api.test.ts` | To confirm |
| UI-01 | UI | AC-01, AC-12 | Actions Taken form: validation, character limits, follow-up note conditional display | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-02 | UI \| AC-03, FR-05 | Requester view: clean read-only display of actions taken, no edit/create buttons | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-03 | UI | AC-07, AC-08 | Ticket workflow: status dropdown shows only permitted transitions; resolution confirmation | `client/tests/lab-04/TicketWorkflow.test.tsx` | To confirm |
| UI-04 | UI | AC-13, BR-17 | Requester Dashboard: metric cards render, zero-states, drill-down to My Tickets | `client/tests/lab-04/RequesterDashboard.test.tsx` | To confirm |
| UI-05 | UI | AC-14, BR-18 | Staff Dashboard: operational cards, quick actions, drill-down to My Queue | `client/tests/lab-04/StaffDashboard.test.tsx` | To confirm |
| REG-01 | Regr. | AC-15, DoD | All Lab 1, 2, and 3 Server test suites pass without regression (145 tests) | `server/tests/lab-01/**`, `lab-02/**`, `lab-03/**` | Pass |
| REG-02 | Regr. | AC-15, DoD | All Lab 1, 2, and 3 Client test suites pass without regression (55 tests) | `client/tests/lab-01/**`, `lab-02/**`, `lab-03/**` | Pass |
| E2E-01 | E2E | AC-01..04 | Actions Taken flow: IT Staff adds action, Requester reviews action on ticket detail | `e2e/lab-04/actions-taken-flow.spec.ts` | To confirm |
| E2E-02 | E2E | AC-07, AC-08 | Ticket resolution workflow: claim -> progress -> advisory flag -> formal resolution | `e2e/lab-04/ticket-resolution.spec.ts` | To confirm |
| E2E-03 | E2E | AC-09..14 | Dashboard navigation, metric accuracy, drill-down click-throughs across roles | `e2e/lab-04/dashboards.spec.ts` | To confirm |
| RESP-01 | Visual | DoD | Responsive screenshot captures (Desktop, Tablet, Mobile) for all new Lab 4 views | `artifacts/lab-04/screenshots/**` | To confirm |

---

## 3. Responsive and Visual Checklist

| Check | Desktop | Tablet | Mobile |
|---|---|---|---|
| Dashboard metric cards properly aligned without overflow | ☐ | ☐ | ☐ |
| Actions Taken timeline cards legible and readable | ☐ | ☐ | ☐ |
| Follow-up amber badges visually distinct | ☐ | ☐ | ☐ |
| Status transition controls easy to operate | ☐ | ☐ | ☐ |
| No horizontal scroll on mobile viewport (375px) | n/a | n/a | ☐ |
| Focus rings clearly visible on all buttons and metric links | ☐ | ☐ | ☐ |
| Validation error messages adjacent to inputs | ☐ | ☐ | ☐ |

---

## 4. Test Execution Commands

- Server Tests: `cd server && npm test`
- Client Tests: `cd client && npm test`
- End-to-End Tests: `npx playwright test e2e/lab-04`
- Full Regression: `npx playwright test`

---

## 5. Final Results

*(To be updated after all Issue implementation and execution runs)*

| Suite | Command | Date | Result |
|---|---|---|---|
| Server Unit & API | `cd server && npm test` | | |
| Client UI Components | `cd client && npm test` | | |
| Playwright E2E Lab 4 | `npx playwright test e2e/lab-04` | | |
| Complete Playwright E2E | `npx playwright test` | | |
