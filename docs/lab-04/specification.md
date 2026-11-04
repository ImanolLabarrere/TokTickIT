# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal

Complete the core TokTickIT service-desk workflow by adding Actions Taken (multi-line intervention log) on Tickets, enforcing final Ticket status and resolution rules, delivering role-appropriate operational dashboards for Requesters and IT Staff/Administrators, and performing comprehensive regression testing, hardening, and accessibility verification across the entire application built in Labs 1 to 3.

## 2. Stakeholder Request Interpretation

The service desk can receive tickets, manage queues, and communicate through public comments and internal notes, but lacks a reliable mechanism to plan, execute, and track concrete units of work performed. 

Lab 4 introduces **Actions Taken** under each Ticket:
- Each action captures the date/time, description of work, result, person who performed it (automatically attributed to the active user), follow-up indicator with mandatory follow-up note if needed, and reference notes on attachments.
- Multiple IT Staff members may record actions on a single ticket even while one primary Ticket Owner coordinates overall responsibility.
- Requesters can view the actions taken on their tickets to stay informed on technical progress, while creation and edition remain restricted to IT Staff and Administrators.
- Ticket status transitions and formal resolution are strictly controlled: a Requester's "Problem Appears Resolved" flag remains advisory, and only IT Staff/Administrators can formally resolve tickets.
- Concise operational dashboards summarize real-time metrics and provide direct drill-down navigation to detailed views for both Requesters and IT Staff.
- All capabilities from Labs 1–3 must continue to work without regression under the Zen Green design system.

## 3. Scope

### Included
- **Actions Taken**:
  - Prisma data model `ActionTaken` related to `Ticket` (1:N) and `User` (author/performer).
  - Backend REST API endpoints to list, create, and update Actions Taken with strict authorization.
  - Ticket Detail UI extension: Actions Taken history list, creation form, edit mode, follow-up flags, and attachment notes.
  - Read-only viewing of Actions Taken for Requesters on their own tickets; full create/update for IT Staff and Administrators.
- **Ticket Workflow & Resolution Rules**:
  - Definitive status transition matrix enforced by the backend.
  - Formal resolution gate: only IT Staff / Administrators can set status to `RESOLVED` or `CLOSED`.
  - Stale update and conflict handling (preventing blind overwrites of ticket status or actions).
- **Role-Based Dashboards**:
  - Requester Dashboard: summary cards (Open Tickets, Waiting for Requester, Recently Resolved), list of recent tickets, quick links to Create Ticket and My Tickets with drill-down query parameters.
  - IT Staff Dashboard (reused by Administrators): summary cards (Unassigned Tickets, My Assigned Tickets, Tickets by Status/Priority), list of recent tickets, quick links to Staff Queue with drill-down filters.
  - Dedicated backend endpoints `/api/dashboard/requester` and `/api/dashboard/staff` returning authoritative metric calculations.
- **Product Hardening & Final Regression**:
  - Seamless navigation updates with active-route indication.
  - Error recovery, accessible focus rings, responsive layouts (mobile, tablet, desktop).
  - Full automated coverage: unit, API integration, UI component, authorization matrix, and end-to-end Playwright tests.

### Explicitly Excluded
- Automatic SLA clocks, escalation engines, on-call scheduling, and breach notifications.
- External notifications (Email, SMS, LINE, Push).
- Inventory consumption, spare-parts management, purchasing, or cost accounting.
- Timesheet billing, payroll, or labor-cost calculations.
- Multi-level approval workflows and electronic signatures.
- Advanced business intelligence tools, custom report builders, or data export warehouses.
- Multi-tenant organizations and production cloud deployments.

## 4. Functional Requirements

- **FR-01** IT Staff and Administrators can create an Action Taken line on any accessible Ticket with date/time, description, result, follow-up requirement, follow-up note (if required), and attachment notes.
- **FR-02** The author of an Action Taken (`performedBy`) is automatically recorded from the authenticated session and cannot be spoofed by client payload.
- **FR-03** Multiple distinct Actions Taken can be recorded under a single Ticket by different IT Staff members, preserving the primary Ticket Owner.
- **FR-04** IT Staff and Administrators can update an existing Action Taken record.
- **FR-05** Requesters can view all Actions Taken on Tickets they own, but are blocked from creating or modifying Actions Taken.
- **FR-06** The backend enforces the definitive Ticket status transition matrix; any invalid transition returns HTTP 400.
- **FR-07** Only IT Staff and Administrators can transition a Ticket to `RESOLVED` or `CLOSED`. A Requester's "Appears Resolved" action remains an advisory indicator (`requesterConfirmedResolved = true`) and does not transition status.
- **FR-08** Stale updates or race conditions during Ticket status transitions return HTTP 409 Conflict if the ticket state changed since last read.
- **FR-09** The backend provides a Requester Dashboard endpoint returning authoritative counts: total open tickets, tickets waiting for requester, recently resolved tickets, and a list of the 5 most recently updated tickets.
- **FR-10** The backend provides an IT Staff Dashboard endpoint returning authoritative counts: unassigned tickets, tickets assigned to the logged-in user, counts grouped by status, counts grouped by IT Priority, and a list of the 5 most recently updated tickets.
- **FR-11** The frontend provides role-tailored Dashboard screens with accessible metric cards, clickable drill-downs to filtered queue/ticket lists, and quick action buttons.
- **FR-12** The application shell provides role-appropriate Dashboard navigation (Dashboard link for Requester and IT Staff/Admin) while preserving all Lab 1–3 navigation and security policies.

## 5. Business Rules

### Actions Taken Rules
- **BR-01** Every `ActionTaken` record belongs to exactly one `Ticket` (foreign key `ticketId`).
- **BR-02** Any active IT Staff member or Administrator can record an Action Taken on a Ticket, regardless of whether they are the designated Ticket Owner.
- **BR-03** `performedById` is set strictly by the server to `req.user.id`. Client-supplied user IDs in payload are ignored.
- **BR-04** `actionDateTime` is required. If omitted in create payload, the server defaults to current timestamp (`now()`). Future dates beyond a 5-minute clock drift window are rejected with 400.
- **BR-05** `actionDescription` is mandatory, trimmed, non-empty, and limited to 2,000 characters.
- **BR-06** `result` is mandatory, trimmed, non-empty, and limited to 2,000 characters.
- **BR-07** `followUpRequired` is a boolean (default `false`). If `followUpRequired === true`, `followUpNote` is mandatory, trimmed, non-empty, and limited to 1,000 characters. If `followUpRequired === false`, `followUpNote` is stored as `null`.
- **BR-08** `attachmentNotes` is optional, trimmed, and limited to 500 characters. It references filename or visual content without requiring binary upload.
- **BR-09** Requesters can only read Actions Taken on their own tickets. Attempting to access Actions Taken on another user's ticket returns 404. Attempting to create or edit an Action Taken returns 403 Forbidden.
- **BR-10** Actions Taken can only be edited by an active IT Staff member or Administrator. Editing preserves `createdAt` and updates `updatedAt`.

### Ticket Status & Workflow Rules
- **BR-11** Ticket statuses remain: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
- **BR-12** Permitted Status Transitions:
  - `NEW` → `OPEN` (via Claim or explicit transition), `CANCELLED`
  - `OPEN` → `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `IN_PROGRESS` → `OPEN`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `WAITING_FOR_REQUESTER` → `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `RESOLVED` → `CLOSED`, `REOPENED`
  - `CLOSED` → `REOPENED`
  - `REOPENED` → `OPEN`, `IN_PROGRESS`, `CANCELLED`
  - `CANCELLED` → (Terminal state; no outgoing transitions permitted)
- **BR-13** Only IT Staff and Administrators may perform status transitions. Requesters attempting to change `currentStatus` receive 403 Forbidden.
- **BR-14** Transition to `RESOLVED` or `CLOSED` requires that the Ticket has an assigned owner (`ownerId !== null`). Attempting to resolve an unassigned ticket returns 400.
- **BR-15** When a Ticket status changes to anything other than `WAITING_FOR_REQUESTER`, `requesterConfirmedResolved` is automatically reset to `false`.
- **BR-16** Stale update detection: Status transition endpoint accepts optional `expectedCurrentStatus` or validates against existing status; if there is a mismatch with the database state, return HTTP 409 Conflict.

### Dashboard Calculation Rules
- **BR-17** Requester Dashboard metrics are strictly scoped to `requesterId === req.user.id`:
  - `openTickets`: count of tickets with status in (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
  - `waitingForRequester`: count of tickets with status `WAITING_FOR_REQUESTER`.
  - `resolvedTickets`: count of tickets with status in (`RESOLVED`, `CLOSED`).
  - `recentTickets`: latest 5 tickets ordered by `updatedAt DESC`, containing `id`, `ticketNumber`, `summary`, `currentStatus`, `requestedPriority`, `updatedAt`.
- **BR-18** IT Staff Dashboard metrics are calculated globally across all service tickets:
  - `unassignedCount`: count of tickets where `ownerId === null` and status not in (`RESOLVED`, `CLOSED`, `CANCELLED`).
  - `myAssignedCount`: count of tickets where `ownerId === req.user.id` and status not in (`RESOLVED`, `CLOSED`, `CANCELLED`).
  - `statusBreakdown`: map/object of active ticket counts grouped by each status.
  - `priorityBreakdown`: map/object of open tickets grouped by `itPriority` (`HIGH`, `MEDIUM`, `LOW`).
  - `recentTickets`: latest 5 tickets ordered by `updatedAt DESC`, containing `id`, `ticketNumber`, `summary`, `currentStatus`, `itPriority`, `requesterName`, `ownerName`, `updatedAt`.
- **BR-19** Administrators reuse the IT Staff dashboard and receive additional platform metric `totalActiveUsers`.
- **BR-20** Empty states: When counts are 0 or list is empty, return structured response with count 0 and empty array `[]` (never 404 or null).

## 6. Authorization Matrix

| Action | Requester | IT Staff | Administrator |
|---|---|---|---|
| View own Tickets / Attachments / Comments / Actions Taken | ✅ (own only) | — | — |
| Create Ticket / Upload Attachment / Post Public Comment | ✅ | — | — |
| Toggle "Problem Appears Resolved" on own Ticket | ✅ (own only) | — | — |
| View IT Staff Ticket Queue & IT Staff Ticket Detail | ❌ | ✅ | ✅ |
| Claim / Reassign Ticket Owner | ❌ | ✅ | ✅ |
| Change Ticket Status / Update IT Priority | ❌ | ✅ | ✅ |
| Post Public Comment / Post Internal Note on any Ticket | ❌ | ✅ | ✅ |
| **View Actions Taken on any Ticket** | ❌ | ✅ | ✅ |
| **Create Action Taken on accessible Ticket** | ❌ | ✅ | ✅ |
| **Edit Action Taken on accessible Ticket** | ❌ | ✅ | ✅ |
| **Access Requester Dashboard** (`/api/dashboard/requester`) | ✅ | ❌ | ❌ |
| **Access IT Staff Dashboard** (`/api/dashboard/staff`) | ❌ | ✅ | ✅ |
| User Management (`/api/admin/users`) | ❌ | ❌ | ✅ |

*Note: In Lab 4, Administrators can also perform IT Staff ticket operations for support, testing, and oversight as permitted by Lab 4 handout Section 4.3.*

## 7. Status Transition Matrix

```
+------------------------+-------------------------------------------------------+
| Current Status         | Permitted Next Statuses                              |
+------------------------+-------------------------------------------------------+
| NEW                    | OPEN (via claim or update), CANCELLED                |
| OPEN                   | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED|
| IN_PROGRESS            | OPEN, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED      |
| WAITING_FOR_REQUESTER  | OPEN, IN_PROGRESS, RESOLVED, CANCELLED                |
| RESOLVED               | CLOSED, REOPENED                                      |
| CLOSED                 | REOPENED                                              |
| REOPENED               | OPEN, IN_PROGRESS, CANCELLED                          |
| CANCELLED              | (Terminal state - no transitions allowed)             |
+------------------------+-------------------------------------------------------+
```

## 8. UI Specification Summary

Full visual design, interaction patterns, and responsive breakpoints are detailed in `ui-spec.md`. Summary:
- **App Navigation**:
  - Requester: `Dashboard`, `My Tickets`, `Create Ticket`, User profile pill, Logout.
  - IT Staff: `Dashboard`, `My Queue`, User profile pill, Logout.
  - Administrator: `Dashboard`, `My Queue`, `User Management`, User profile pill, Logout.
- **Requester Dashboard**:
  - Greeting banner with user's name and quick status.
  - 3 metric cards with icon and badge: `Open Tickets`, `Action Required (Waiting)`, `Resolved`.
  - Clicking a metric card navigates to `My Tickets` pre-filtered by that status.
  - Quick actions panel (`Create Ticket`, `View All Tickets`).
  - Recent Tickets table / card list with direct click-through to Ticket Detail.
- **IT Staff Dashboard**:
  - Operational overview with refresh button and date display.
  - Key metric cards: `Unassigned Tickets`, `My Assigned Tickets`, `High Priority Tickets`, `Waiting for Requester`.
  - Clicking a card navigates to `My Queue` with matching filter applied (e.g. Unassigned, My tickets).
  - Urgent/Recent Tickets table with status badge, priority badge, and requester name.
  - Quick action links to claim next unassigned ticket or browse queue.
- **Ticket Detail - Actions Taken Section**:
  - Positioned cleanly alongside/below Comments and Notes.
  - Card-based or timeline list of recorded actions showing: date/time, performed by, description, result, follow-up badge (amber if required), attachment notes.
  - IT Staff/Admin: "Add Action Taken" button opening modal/inline form; "Edit" action on existing items.
  - Requesters: Clean, read-only audit log of actions taken on their ticket.
  - Form validation: inline errors for empty description/result or missing follow-up note when checked.

## 9. Data Changes

### Prisma Model: `ActionTaken`
```prisma
model ActionTaken {
  id                Int       @id @default(autoincrement())
  ticketId          Int
  ticket            Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedById     Int
  performedBy       User      @relation(fields: [performedById], references: [id])
  actionDateTime    DateTime  @default(now())
  actionDescription String
  result            String
  followUpRequired  Boolean   @default(false)
  followUpNote      String?
  attachmentNotes   String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([ticketId])
  @@index([performedById])
  @@index([actionDateTime])
}
```

### Database Design Decisions
1. **Parent-Child Cascade & Indexing**: An index on `ticketId` ensures sub-millisecond retrieval of all actions for a ticket. Foreign key relationship to `Ticket` ensures integrity; `ActionTaken` rows remain tied strictly to their parent ticket.
2. **Explicit Attributed Performer vs Current Owner**: `performedById` references `User`, allowing any IT Staff member to log an intervention without altering the ticket's primary owner (`ownerId`), directly satisfying BR-02 and BR-03.
3. **Optimistic Workflow Validation**: Rather than heavy locking, status and action modifications use state checks and timestamp validations to reject stale writes with 409 Conflict.

## 10. REST API Contract Summary

Full details in `api-spec.md`. Summary of new/updated endpoints:
- `GET /api/tickets/:id/actions` — List actions taken for a ticket (Requester: own only; Staff/Admin: any).
- `POST /api/tickets/:id/actions` — Create action taken (Staff/Admin only).
- `PATCH /api/actions/:id` — Update action taken (Staff/Admin only).
- `PATCH /api/staff/tickets/:id/status` — Enhanced status transition with transition rules and conflict check.
- `GET /api/dashboard/requester` — Metrics and recent tickets for authenticated Requester.
- `GET /api/dashboard/staff` — Metrics and recent tickets for IT Staff and Administrator.

## 11. Acceptance Criteria

- **AC-01** Given an authenticated IT Staff user, when posting valid action data to `POST /api/tickets/:id/actions`, an `ActionTaken` record is created, tied to the ticket, with `performedById` set to the caller.
- **AC-02** Given an authenticated Requester, when attempting to `POST` or `PATCH` an `ActionTaken`, the server responds with 403 Forbidden.
- **AC-03** Given an authenticated Requester, when retrieving `GET /api/tickets/:id/actions` for their own ticket, all recorded actions are returned.
- **AC-04** Given an authenticated Requester, when attempting to retrieve actions for another user's ticket, the server responds with 404 Not Found.
- **AC-05** Given `followUpRequired: true`, when creating or updating an `ActionTaken` without a `followUpNote`, the server rejects with 400 Bad Request.
- **AC-06** Given `followUpRequired: false`, any provided `followUpNote` is ignored or set to null.
- **AC-07** Given an IT Staff user submitting an unlisted status transition, the server responds with 400 Bad Request and the ticket status remains unchanged.
- **AC-08** Given an unassigned ticket, attempting to transition to `RESOLVED` returns 400 Bad Request indicating an owner is required.
- **AC-09** Given an authenticated Requester calling `GET /api/dashboard/requester`, returned metrics and recent tickets strictly reflect tickets owned by that Requester.
- **AC-10** Given an authenticated IT Staff user calling `GET /api/dashboard/staff`, returned metrics accurately reflect system-wide unassigned tickets, user-assigned tickets, and status/priority aggregations.
- **AC-11** Given an unauthenticated caller hitting any dashboard or action endpoint, the server responds with 401 Unauthorized.
- **AC-12** Given an Action Taken creation in the UI, client-side validation prevents submission if description or result is blank, or if follow-up is checked without a follow-up note.
- **AC-13** Clicking a metric card on the Requester Dashboard navigates to `My Tickets` filtered to the corresponding ticket subset.
- **AC-14** Clicking a metric card on the IT Staff Dashboard navigates to `My Queue` filtered to the corresponding ticket subset.
- **AC-15** The entire test suite from Labs 1 to 3 passes without regressions after all migrations and schema updates.

## 12. Product Definition of Done (DoD)

- [ ] All database migrations applied without data loss and Prisma client regenerated.
- [ ] Database seed contains realistic tickets with zero, one, and multiple Actions Taken across various statuses and priorities.
- [ ] Backend routes for Actions Taken, status workflow, and role dashboards implemented and verified with automated tests.
- [ ] UI components for Actions Taken and Dashboards integrated cleanly into Zen Green theme.
- [ ] Responsive layouts verified across desktop (1280px+), tablet (768px-1024px), and mobile (375px-480px).
- [ ] Keyboard navigation, semantic forms, and focus rings conform to accessibility standards.
- [ ] 100% of unit, integration, and E2E test suites pass cleanly.
- [ ] Documentation (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md`) complete and updated.
