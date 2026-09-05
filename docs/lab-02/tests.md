# Lab 2 Test Plan and Results
Status: Draft — no code yet (Issue 1). "Final" updates to Pass/Fail as each Issue lands.

## 1. Test Strategy
TDD: write these first (they should fail), implement, refactor to green. Levels: unit, API, UI component,
responsive/visual, E2E. Every AC below maps to at least one test.

## 2. Planned Tests
| ID | AC(s) covered | What it tests | Test file | Final |
|---|---|---|---|---|
| UNIT-01 | BR-01 | Ticket Number format `TKT-{year}-{6-digit id}` | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned |
| API-01 | AC-01, AC-02 | GET /api/requesters (active only) + related-systems/categories reference data | `server/tests/lab-02/reference-data.api.test.ts` | Planned |
| API-02 | AC-05, AC-06, AC-08 | POST /api/tickets: valid (201+number+NEW), missing fields (400), missing header (400) | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-03 | AC-04, AC-11, AC-12, AC-13 | GET /api/tickets: scoped to requester, search/filter/sort, pagination + invalid-param fallback, empty vs no-results | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-04 | AC-14, AC-15 | GET /api/tickets/:id: owned (200+attachments) vs not owned (404) | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-05 | AC-09, AC-10, AC-16, AC-17, AC-18 | Attachments: valid upload, bad type (415), oversized (413), 6th rejected (400), download active vs removed (410), soft-remove with/without reason | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| UI-01 | AC-01, AC-02, AC-03 | RequesterSelection: populated dropdown, empty state, API-failure+retry | `client/tests/lab-02/RequesterSelection.test.tsx` | Planned |
| UI-02 | AC-05, AC-06, AC-07, AC-08, AC-09 | CreateTicket: required-field messages, busy state, success shows number, API failure preserves values, invalid attachment rejected client-side | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-03 | AC-04, AC-11, AC-12, AC-13 | MyTickets: scoped list, search/filter/sort/pagination controls, Empty vs No-results | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-04 | AC-15 | RequesterTicketDetail: fields render read-only, match mocked data | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-05 | AC-16, AC-17 | AttachmentSection: active/removed rendering, remove requires a reason | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| RESP-01 | AC-19 | Desktop/tablet/mobile screenshots of all 3 screens: no clipping/overlap/h-scroll | `artifacts/lab-02/screenshots/**` | Planned |
| A11Y-01 | AC-20 | Keyboard-only pass through Requester Selection + Create Ticket | Manual checklist in `reviewer.md` | Planned |
| E2E-01 | AC-01, AC-05, AC-11, AC-15, AC-16, AC-17 | Happy path: select Requester → create ticket + attachment → find via search → open detail → download → soft-remove → reload keeps removed state | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | AC-04, AC-14 | Cross-requester isolation: A creates a ticket; switch to B; B's list excludes it; direct link to A's ticket fails safely | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

## 3. Acceptance Criteria (AC-01…AC-20)
| AC | Given / When / Then |
|---|---|
| AC-01 | Given active Requesters exist, when the app loads, then the selector lists them and Continue is disabled until one is chosen. |
| AC-02 | Given no active Requesters exist, when the app loads, then a clear empty state is shown. |
| AC-03 | Given the Requesters API is down, when the app loads, then a safe error with Retry is shown. |
| AC-04 | Given Requester A's data is shown, when the user switches to Requester B, then A's data disappears and B's own data loads. |
| AC-05 | Given valid data, when a Requester submits Create Ticket, then one Ticket is saved with status NEW and its Ticket Number is shown. |
| AC-06 | Given a required field is empty, when the Requester submits, then a field-level message appears and no API call is made. |
| AC-07 | Given a valid submission, when Submit is clicked, then it shows a busy state and is disabled until the request completes. |
| AC-08 | Given the API is down, when the Requester submits, then a safe error is shown and all entered values remain in the form. |
| AC-09 | Given a disallowed file type or a file >5MB is chosen, when it's selected, then it is rejected before any upload happens. |
| AC-10 | Given a Ticket already has 5 active attachments, when a 6th is attempted, then it is rejected and the existing 5 are unchanged. |
| AC-11 | Given a Requester has Tickets, when My Tickets is opened, then only that Requester's Tickets are listed, and search/filter/sort/pagination work correctly. |
| AC-12 | Given a Requester owns zero Tickets, when My Tickets opens, then the Empty state (not No-results) is shown. |
| AC-13 | Given filters/search match none of a Requester's existing Tickets, when applied, then the No-results state (not Empty) is shown, with a Clear Filters option. |
| AC-14 | Given Requester B is selected, when any of Requester A's Tickets/Attachments are requested directly, then the data is not returned (404). |
| AC-15 | Given a Requester opens one of their own Tickets, when Ticket Detail loads, then all header fields render read-only and match stored values. |
| AC-16 | Given a Requester on Ticket Detail, when they add a valid attachment or download an active one, then it appears as Active / the file is returned. |
| AC-17 | Given a Requester removes an attachment with a reason, when confirmed, then it becomes Removed (metadata+reason kept, no download); without a reason, removal is blocked; a removed file's download link returns 410. |
| AC-18 | Given a Ticket was saved but an attachment upload then fails, when the Requester retries from Ticket Detail, then the Ticket is intact and the retry can succeed. |
| AC-19 | Given any of the 3 screens at desktop/tablet/mobile width, when rendered, then nothing is clipped, overlapping, or causes horizontal scroll. |
| AC-20 | Given a keyboard-only user, when tabbing through Requester Selection and Create Ticket, then every control is reachable, operable, and shows visible focus. |

## 4. Test Commands
```powershell
cd server; npm test
cd client; npm test
npx playwright test e2e/lab-02   # added in Issue 6
```

## 5. Final Results
Not yet run — Issue 1 is documentation only. Updated per Issue, finalized with full terminal output in
Issue 6 for the PDF submission (labsheet §14, Part 3).

## 6. Known Limitations
AC-18 (upload retry after a mid-flow failure) is checked manually rather than automated in Lab 2, since it
needs a simulated network failure mid-sequence; may be automated later if time allows.
