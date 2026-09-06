# Lab 2 Sprint Engineering Specification
Status: Draft v1 — approve or correct before Issue 2. Branch: `feature/1-lab2-specification`

## 1. Sprint Goal
A Requester picks a temporary Development Requester identity, creates a ticket with attachments, finds
it again in My Tickets (search/filter/sort/paginate), and views/manages it in a read-only Ticket Detail
screen — with strict ownership isolation between Requesters.

## 2. Stakeholder Request Interpretation
Login doesn't exist until Lab 3, so a Development Requester selector simulates "who is logged in." Every
ticket/attachment action is scoped to whichever Requester is currently selected.

## 3. Scope
**Included:** Requester Selection screen, Create Ticket, My Tickets, Ticket Detail, attachment lifecycle
(upload/download/soft-remove), ownership enforcement, Zen Green theme.
**Excluded (labsheet §4.2):** authentication, IT Staff workflow, Comments/Notes/Actions Taken, any status
beyond `NEW`, Administration. Note: the labsheet's Figure 1 is the *final* (Lab 1-4) screen — Lab 2's
Ticket Detail has no comment/notes/event-log tabs and no Resolution Summary (nothing is resolved yet).

## 4. Functional Requirements
| ID | Requirement |
|---|---|
| FR-01 | Load active Categories, active Related Systems, and active Requesters from the DB. |
| FR-02 | Let the user select a Requester and continue; persist it as the session context, shown in the app shell with a Change Requester action, reloading data on change. |
| FR-03 | Let the current Requester submit a Ticket (category, related system, summary, description, priority) and receive a backend-generated Ticket Number. |
| FR-04 | Let the current Requester attach 0-5 files to a Ticket, at creation or afterwards, validated by type and size. |
| FR-05 | List only the current Requester's own Tickets, with search, filter, sort, and pagination. |
| FR-06 | Let the current Requester open Ticket Detail for one of their own Tickets, showing all fields read-only. |
| FR-07 | Show active and removed attachments on Ticket Detail; allow downloading active ones and soft-removing owned ones with a reason. |
| FR-08 | Reject any access to a Ticket/Attachment the current Requester doesn't own. |
| FR-09 | Show loading, empty, no-results, validation, and failure states on every data screen. |

## 5. Business Rules
| ID | Rule |
|---|---|
| BR-01 | Ticket Number is backend-generated and unique: `TKT-{year}-{6-digit ticket id}`. |
| BR-02 | A new Ticket starts with Current Status `NEW`. |
| BR-03 | The Requester selector is a testing-only mechanism, not authentication; replaced in Lab 3. |
| BR-04 | Only active Requesters appear in the selector. |
| BR-05 | Switching Requester immediately changes ownership context; no stale data is shown. |
| BR-06 | Every Ticket/Attachment request carries the current Requester's id (`X-Requester-Id` header); missing → 400, unresolvable/inactive → 404 and the UI returns to Selection. |
| BR-07 | A Requester may only view/modify their own Tickets/Attachments; others return `404` (never reveal existence). |
| BR-08 | Summary (1-120 chars), Description (1-2000 chars), Category, Related System, and Requested Priority (LOW/MEDIUM/HIGH) are required on every Ticket. |
| BR-09 | Submit is disabled while a creation request is in flight (no duplicate submits); a failed creation saves nothing and keeps the form's values. |
| BR-10 | A successful Ticket is never rolled back if a later attachment upload fails; the Requester can retry the upload. |
| BR-11 | Attachments: JPG/JPEG/PNG/WEBP/PDF only, ≤5MB, ≤5 active per Ticket. |
| BR-12 | Removal is soft: the file becomes undownloadable but its metadata (incl. a required 3-200 char reason) stays visible; cannot be restored in Lab 2. |
| BR-13 | My Tickets: search matches Ticket Number/Summary (case-insensitive substring); filters by Category/Priority/Status combine; default sort is Created Date desc; pagination defaults to 10/page (max 50), invalid values fall back to defaults. |
| BR-14 | Show a distinct Empty state (zero Tickets ever) vs No-results state (filters yield zero of a non-zero total). |
| BR-15 | Every screen degrades safely when the API is down, preserving in-progress input. |
| BR-16 | Lab 2 filters every requester-scoped query by a single `requesterId`, so Lab 3 can swap in the authenticated identity with minimal rework. |

## 6. UI Specification Summary
See `ui-spec.md`: Zen Green tokens, app shell/nav, Requester Selection, Create Ticket, My Tickets
(table/cards), Ticket Detail + Attachments — each with loading/empty/no-results/validation/success/failure
states and desktop/tablet/mobile behavior.

## 7. Data Changes
New Prisma models (`Category` from Lab 1 is unchanged):

| Model | Key fields |
|---|---|
| `Requester` | id, name, email (unique), isActive (default true), createdAt |
| `RelatedSystem` | id, name (unique), createdAt |
| `Ticket` | id, ticketNumber (unique), requesterId/categoryId/relatedSystemId (FK), summary, description, requestedPriority (enum), currentStatus (enum, default NEW), createdAt, updatedAt |
| `Attachment` | id, ticketId (FK), originalFilename, storedFilename, mimeType, sizeBytes, uploadedAt, removedAt (nullable), removedReason (nullable) |

Enums: `RequestedPriority { LOW MEDIUM HIGH }`, `TicketStatus { NEW }` (extended in later labs).
Indexes: unique `ticketNumber`, unique `Requester.email`, index on `Ticket.requesterId` (+`createdAt`),
index on `Attachment.ticketId`. Files stored on disk at `server/uploads/` (gitignored), DB keeps the
original filename.

## 8. API Contract
See `api-spec.md`. Endpoints: `GET /api/requesters`, `GET /api/categories` (existing),
`GET /api/related-systems`, `POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`,
`POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, `PATCH /api/attachments/:id/remove`.

## 9. Acceptance Criteria
See `tests.md` for the full list (AC-01…AC-20) and traceability to planned tests.

## 10. Definition of Done
**Product:** all FR/BR implemented; every AC has passing, traceable tests (none skipped); UI/API match
this contract; success/failure/boundary cases handled; README updated; `npm test` passes on `main`;
Playwright screenshots exist for all 3 screens × 3 viewports.
**Delivery:** Issues + feature branches, PRs through `lab2-staging`, peer review given/received,
`reviewer.md`/`ai-use.md` complete, PDF submission assembled per labsheet §14.

## 11. Assumptions and Decisions
1. Attachment upload is a separate call from ticket creation (create ticket first, then upload each file).
2. Ownership travels as an `X-Requester-Id` header on every requester-scoped call.
3. Not-owned and not-found both return `404` (never `403`) to avoid revealing existence.
4. Only `Requester` has an `isActive` flag; Category/RelatedSystem don't (matches Lab 1 behavior).
5. Ticket Number = `TKT-{year}-{6-digit id}`, derived from the autoincrement id.
6. Attachments are stored on local disk, not cloud storage.
7. Priority/status badge colors (in `ui-spec.md`) are proposed, not literally specified by the labsheet.
