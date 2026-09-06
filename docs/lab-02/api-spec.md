# Lab 2 API Contract (v1)
Convention: requester-scoped endpoints require header `X-Requester-Id: <id>` (missing → 400; unresolvable/
inactive → 404). Errors: `{ "error": "<safe message>" }`, never internal detail.

## Reference data
- `GET /api/requesters` → `200 [{ "id": 1, "name": "Jennifer Anderson", "email": "..." }]` — active only, no header needed.
- `GET /api/categories` → existing Lab 1 endpoint, unchanged.
- `GET /api/related-systems` → `200 [{ "id": 1, "name": "Email" }]`, ordered by id.

## Tickets
**`POST /api/tickets`** — body `{ categoryId, relatedSystemId, summary, description, requestedPriority }`
→ `201` with the saved Ticket incl. `ticketNumber` and `currentStatus: "NEW"`.
Validation → `400 { "error": "Validation failed", "fields": { "summary": "Summary is required." } }`
(BR-08: required categoryId/relatedSystemId must reference real rows; requestedPriority ∈ LOW/MEDIUM/HIGH).

**`GET /api/tickets`** — query params:
| Param | Default | Notes |
|---|---|---|
| `search` | — | matches ticketNumber/summary, case-insensitive |
| `categoryId`, `requestedPriority`, `status` | — | exact-match filters |
| `sortBy` | `createdAt` | or `ticketNumber`, `updatedAt`; invalid → default |
| `sortDir` | `desc` | or `asc`; invalid → default |
| `page` / `pageSize` | 1 / 10 (max 50) | invalid/out-of-range → default |

→ `200 { "data": [...tickets], "pagination": { "page", "pageSize", "totalItems", "totalPages" } }`.
Always scoped to the current Requester.

**`GET /api/tickets/:id`** → `200` full Ticket incl. `attachments: [...]` (active and removed, with
metadata). Not found or not owned → `404 { "error": "Ticket not found." }`.

## Attachments
**`POST /api/tickets/:id/attachments`** — `multipart/form-data`, field `file` → `201` attachment metadata.
Errors: ticket not found/owned → `404`; bad type → `415`; >5MB → `413`; already 5 active → `400`.

**`GET /api/attachments/:id/download`** — active + owned → `200` file stream; not found/owned → `404`;
removed → `410 { "error": "This attachment has been removed and is no longer available." }`.

**`PATCH /api/attachments/:id/remove`** — body `{ "reason": "..." }` (3-200 chars, required) → `200`
updated metadata with `removedAt`/`removedReason` set. Missing/short reason → `400`; not found/owned →
`404`; already removed → `400`.

## Status summary
| Status | Meaning |
|---|---|
| 200 / 201 | Success / created |
| 400 | Validation failure, missing header, max attachments, already removed |
| 404 | Missing or not owned (never distinguished) |
| 410 | Exists but soft-removed |
| 413 / 415 | File too large / wrong type |
| 500 | Unexpected error, generic message, logged server-side |
