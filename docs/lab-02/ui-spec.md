# Lab 2 UI Specification (v1) — Zen Green Theme

## Color tokens (fixed, labsheet §7)
`--zg-primary #006B3C` (header/primary actions) · `--zg-secondary #0B7A46` (active tabs/focus/links) ·
`--zg-pale #EAF6EF` (selected/success/subtle emphasis) · `--zg-bg #F5F7F6` (page bg) ·
`--zg-surface #FFFFFF` (cards, subtle border+shadow) · `--zg-text` dark charcoal-green (not pure black) ·
read-only field: soft gray-green bg · `--zg-error` dark red (text+border) · `--zg-warning` amber
(genuine warnings only, never decorative) · success: green text, never color-only.
Executed with a restrained, professional feel: mostly white/`--zg-bg`, green used for emphasis rather than
covering large areas — this is allowed as a "modest aesthetic improvement" per the labsheet.

## Typography, spacing, controls (proposed)
System-ui font stack, Bootstrap's default heading scale and spacing scale (already mandated framework).
Editable = white bg + neutral border. Read-only = gray-green bg, `aria-readonly`. Invalid = error border +
message directly below the field. Disabled = ~60% opacity, not clickable. Focus = visible 2px outline,
never suppressed. Required fields: red asterisk **and** a validation message on failure.

## Buttons
Primary (solid `--zg-primary`, e.g. Submit/Continue) · Secondary (outline `--zg-secondary`, e.g.
Cancel/Clear Filters) · Destructive (outline `--zg-error`, e.g. Remove Attachment) · Disabled (grayed) ·
Busy (spinner + disabled + verb-ing label, e.g. "Submitting…").

## Screen states
Every data screen: Initial → Loading → Validation ⇄ Submitting → Success | Failure. List screens add
Empty (zero records ever) and No-results (filters yield zero of a non-zero total) as distinct states.

## App shell (fixed, §8)
"TokTickIT" title, My Tickets + Create Ticket nav, current Requester name + Change Requester action,
clear active-page indication, mobile nav collapses to a hamburger/offcanvas menu.

## Requester Selection (fixed elements, §8.1)
Title, one-line "testing only" note, dropdown (active Requesters), Continue (disabled until chosen),
loading/empty ("No active Requesters configured.")/failure (with Retry) states, keyboard-accessible
`<select>` + `<label>`.

## Create Ticket (proposed layout)
Top→bottom: read-only strip (Ticket Date, Requester) → classification row (Category, Related System,
Priority) → Summary (single line) → Description (multiline, resizable) → Attachments (browse/drop zone +
selected-file list with per-file validation) → actions (Cancel, Submit). Success replaces the form with a
confirmation showing the Ticket Number and a next-action link.

## My Tickets (proposed)
Toolbar: search, Category/Priority/Status filters, Clear Filters, Create Ticket (top-right).
Desktop/tablet: table — Ticket No., Summary, Category, Priority (badge), Status (badge), Last Updated.
Mobile (<768px): one card per ticket with the same fields stacked. Pagination: Previous/Next + page
numbers. Badges: Priority Low = pale-green pill, Medium = amber pill, High = filled red-orange pill
(visually distinct from the validation-error style so it doesn't read as "form error"); Status New =
outline pill. Empty state = illustration + "No tickets yet" + Create Ticket CTA; No-results = "No tickets
match your filters" + Clear Filters — visibly different from Empty.

## Ticket Detail (proposed)
Two distinct regions: (1) read-only Ticket info grid (all header fields), (2) Attachments panel (Add
Attachment control + list). No Comments/Notes/Actions/Event Log — out of scope. Attachment row states:
Active (filename/size/icon + Download/Remove), Uploading (spinner), Removed (grayed, "Removed" badge +
reason, no actions); a stale download link on a removed file shows "no longer available."

## Responsive (fixed, §8.7)
Desktop ≥992px: multi-column, centered, max-width ~1140px. Tablet 768-991px: two columns where practical.
Mobile <768px: fields stack, touch-friendly buttons, no horizontal scroll. All sizes: no clipping,
overlap, or hidden buttons.

## Accessibility
Every control has a real `<label>`; icon-only controls get `aria-label`+tooltip; focus order follows visual
order; priority/status never color-only (text label always present); errors use `aria-live="polite"`.

## Screenshots
Captured with Playwright (Issue 6) at desktop/tablet/mobile for all 3 screens, saved under
`artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/`.
