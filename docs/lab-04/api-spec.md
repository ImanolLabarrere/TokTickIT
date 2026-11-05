# Lab 4 API Specification

Session: JWT in an httpOnly, SameSite=Lax cookie named `toktickit_session`, 8-hour expiry.
All endpoints require a valid, active authenticated session with `mustChangePassword === false`.
Safe-error rule: never leak the existence of another user's Ticket to a Requester (always respond 404, never 403, for foreign ticket queries).

---

## 1. Actions Taken Endpoints

### `GET /api/tickets/:id/actions`
Retrieves all Actions Taken logged under ticket `:id`.
- **Authorization**:
  - `REQUESTER`: Permitted only if the caller owns the ticket (`requesterId === req.user.id`). Foreign tickets return `404`.
  - `IT_STAFF`, `ADMINISTRATOR`: Permitted for any ticket. Non-existent ticket returns `404`.
- **Response**: `200 OK`
```json
[
  {
    "id": 12,
    "ticketId": 5,
    "performedById": 3,
    "performedByName": "Alex Thompson",
    "performedByRole": "IT_STAFF",
    "actionDateTime": "2026-11-04T10:30:00.000Z",
    "actionDescription": "Replaced RAM module on user laptop and ran diagnostic test suite.",
    "result": "Diagnostics passed cleanly, 16GB RAM detected with zero parity errors.",
    "followUpRequired": true,
    "followUpNote": "Check back with user tomorrow to verify no blue screens occur.",
    "attachmentNotes": "diagnostic_log_20261104.png",
    "createdAt": "2026-11-04T10:35:00.000Z",
    "updatedAt": "2026-11-04T10:35:00.000Z"
  }
]
```
- **Error Codes**:
  - `401 Unauthorized`: No session / inactive account / password change required.
  - `404 Not Found`: Ticket does not exist or caller is Requester who does not own it.

---

### `POST /api/tickets/:id/actions`
Creates a new Action Taken line under ticket `:id`.
- **Authorization**: `IT_STAFF`, `ADMINISTRATOR` only. (Requesters receive `403 Forbidden`).
- **Body**:
```json
{
  "actionDateTime": "2026-11-04T10:30:00.000Z", // optional; defaults to server now()
  "actionDescription": "Inspected VPN gateway configuration.", // required, 1-2000 chars
  "result": "Resolved routing table conflict.", // required, 1-2000 chars
  "followUpRequired": false, // boolean, default false
  "followUpNote": null, // required if followUpRequired is true (1-1000 chars)
  "attachmentNotes": "vpn_route_screenshot.png" // optional, max 500 chars
}
```
- **Response**: `201 Created`
```json
{
  "id": 13,
  "ticketId": 5,
  "performedById": 3,
  "performedByName": "Alex Thompson",
  "performedByRole": "IT_STAFF",
  "actionDateTime": "2026-11-04T10:30:00.000Z",
  "actionDescription": "Inspected VPN gateway configuration.",
  "result": "Resolved routing table conflict.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "vpn_route_screenshot.png",
  "createdAt": "2026-11-04T10:35:12.000Z",
  "updatedAt": "2026-11-04T10:35:12.000Z"
}
```
- **Error Codes**:
  - `400 Bad Request`: Validation failure (empty description or result; `followUpRequired` is true but `followUpNote` is empty/missing; future `actionDateTime`).
  - `401 Unauthorized`: Missing/expired session.
  - `403 Forbidden`: Authenticated user is not IT Staff or Administrator.
  - `404 Not Found`: Ticket `:id` does not exist.

---

### `PATCH /api/actions/:id`
Updates an existing Action Taken record.
- **Authorization**: `IT_STAFF`, `ADMINISTRATOR` only.
- **Body**: (all fields optional, but at least one must be provided)
```json
{
  "actionDescription": "Updated action description...",
  "result": "Updated result...",
  "followUpRequired": true,
  "followUpNote": "Updated mandatory follow-up note...",
  "attachmentNotes": "notes.png"
}
```
- **Response**: `200 OK` (returns updated Action Taken object).
- **Error Codes**:
  - `400 Bad Request`: Validation failure (empty fields, missing note when followUpRequired is true).
  - `401 Unauthorized`: Missing/expired session.
  - `403 Forbidden`: Authenticated user is not IT Staff or Administrator.
  - `404 Not Found`: Action Taken `:id` does not exist.

---

## 2. Ticket Status & Workflow Endpoints

### `PATCH /api/staff/tickets/:id/status`
Updates the ticket status adhering to the definitive transition matrix.
- **Authorization**: `IT_STAFF`, `ADMINISTRATOR` only.
- **Body**:
```json
{
  "currentStatus": "RESOLVED",
  "expectedCurrentStatus": "IN_PROGRESS" // optional, for stale-update detection
}
```
- **Business Validations**:
  - Permitted transition check according to BR-12. Unlisted transition returns 400.
  - Transition to `RESOLVED` or `CLOSED` requires an assigned owner (`ownerId !== null`). Unassigned ticket returns `400`.
  - Stale update check: if `expectedCurrentStatus` is passed and does not match database status, return `409 Conflict`.
  - Automatic flag reset: resets `requesterConfirmedResolved = false` if transitioning away from `WAITING_FOR_REQUESTER`.
- **Response**: `200 OK`
```json
{
  "currentStatus": "RESOLVED",
  "requesterConfirmedResolved": false
}
```
- **Error Codes**:
  - `400 Bad Request`: Invalid transition, unknown status, or attempting to resolve unassigned ticket.
  - `401 Unauthorized`: Missing session.
  - `403 Forbidden`: Caller is not IT Staff or Administrator.
  - `404 Not Found`: Ticket not found.
  - `409 Conflict`: Stale update detected.

---

## 3. Role Dashboard Endpoints

### `GET /api/dashboard/requester`
Returns authoritative dashboard metrics and recent tickets for the authenticated Requester.
- **Authorization**: `REQUESTER` only.
- **Response**: `200 OK`
```json
{
  "metrics": {
    "openTickets": 4,
    "waitingForRequester": 1,
    "resolvedTickets": 7
  },
  "recentTickets": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-00101",
      "summary": "Cannot connect to office Wi-Fi",
      "currentStatus": "WAITING_FOR_REQUESTER",
      "requestedPriority": "HIGH",
      "updatedAt": "2026-11-04T12:00:00.000Z"
    }
  ]
}
```
- **Error Codes**:
  - `401 Unauthorized`: No session / inactive.
  - `403 Forbidden`: Non-requester role.

---

### `GET /api/dashboard/staff`
Returns authoritative operational dashboard metrics and recent tickets across all tickets.
- **Authorization**: `IT_STAFF`, `ADMINISTRATOR`.
- **Response**: `200 OK`
```json
{
  "metrics": {
    "unassignedCount": 5,
    "myAssignedCount": 3,
    "waitingForRequesterCount": 2,
    "highPriorityCount": 4,
    "statusCounts": {
      "NEW": 2,
      "OPEN": 3,
      "IN_PROGRESS": 4,
      "WAITING_FOR_REQUESTER": 2,
      "RESOLVED": 8,
      "CLOSED": 15,
      "REOPENED": 1,
      "CANCELLED": 2
    },
    "priorityCounts": {
      "HIGH": 4,
      "MEDIUM": 6,
      "LOW": 2
    },
    "totalActiveUsers": 12 // included for Administrator callers
  },
  "recentTickets": [
    {
      "id": 105,
      "ticketNumber": "TKT-2026-00105",
      "summary": "Database backup latency alert",
      "currentStatus": "IN_PROGRESS",
      "itPriority": "HIGH",
      "requesterName": "Jennifer Anderson",
      "ownerName": "Alex Thompson",
      "updatedAt": "2026-11-04T12:15:00.000Z"
    }
  ]
}
```
- **Error Codes**:
  - `401 Unauthorized`: No session.
  - `403 Forbidden`: Caller is Requester.
