# Lab 3 UI Specification

Extends the Lab 2 Zen Green system (colors, spacing, field states, button hierarchy,
responsive breakpoints — unchanged, see `docs/lab-02/ui-spec.md`). This file covers only what
Lab 3 adds or changes.

## 1. Application Shell

- The Development Requester display and "Change Requester" button are removed entirely.
- Header right side now shows: authenticated user's name, a small role badge (`Requester` /
  `IT Staff` / `Administrator`, each a distinct pale badge color reusing the Zen Green
  palette), and a **Logout** button.
- Navigation is role-aware — only the destinations a role may use are rendered at all (not
  just disabled):
  - Requester: My Tickets, Create Ticket.
  - IT Staff: My Queue.
  - Administrator: Admin.
- Active-page indication (light background pill) carried over unchanged from Lab 2.

## 2. Login

- Centered card, max-width ~420px, Zen Green primary header bar with app name/logo.
- Fields: Email, Password (with show/hide toggle), both required, inline validation.
- Primary button "Sign In," busy label "Signing in…", disabled while in flight.
- Failure: a single alert-danger banner above the form: "Invalid email or password." — never
  field-specific, so it can't reveal which part was wrong (BR-01/02).
- No "Forgot your password" flow is implemented in Lab 3 (excluded scope) — if shown per the
  reference mockup, it is disabled/hidden rather than linking to a non-existent screen.

## 3. Change Password (mandatory)

- Shown instead of any other screen whenever `mustChangePassword` is true — the app shell's
  navigation does not even render until this is cleared.
- Fields: Current (temporary) password, New password, Confirm new password.
- Live checklist below New password: "≥ 8 characters," "at least one letter," "at least one
  digit" — each item turns from neutral to success-green as satisfied.
- "Confirm new password" must match; mismatch shows inline error, submit stays disabled.
- Primary button "Continue," busy state, safe failure banner on API error (e.g. wrong current
  password) without leaving the screen.

## 4. IT Staff Ticket Queue

- Page header "My Queue" + short subtitle, no "Create Ticket" action here (Requester-only).
- Toolbar: search box (ticket number or summary), filter button/panel (Category, Requested
  Priority, IT Priority, Status, Owner — including an "Unassigned" owner option), Clear
  Filters.
- Desktop table columns: Ticket No., Summary, Category, Req. Priority, IT Priority, Status,
  Owner, Last Updated. Priority/Status use the same badge component as Lab 2's My Tickets, plus
  a new Owner "chip" (avatar initials + name, or "Unassigned" in muted gray-green).
- Sortable column headers (same caret pattern as Lab 2).
- Mobile: table becomes stacked cards (same pattern as Lab 2 My Tickets), each card showing
  ticket number, summary, and the same badges/owner chip.
- States: loading, empty ("No tickets in the queue yet" — realistically rare given seed data),
  no-results (filtered to zero), and a safe failure state with Retry.
- Clicking a row opens IT Staff Ticket Detail.

## 5. IT Staff Ticket Detail

- Extends the Lab 2 Ticket Detail layout: same read-only header block (Ticket No., Category,
  Related System, Requester, Requested Priority, Created date), plus new **editable** controls
  clearly distinguished by the standard editable-field style:
  - **Owner**: a select/button — "Claim" if unassigned, else shows current owner with a
    "Reassign" action opening a picker of active IT Staff.
  - **IT Priority**: select, editable, badge preview next to it.
  - **Status**: select constrained to the current status's valid transitions only (others not
    shown as options at all, not just disabled) + a confirmation step for terminal-ish moves
    (Resolved, Closed, Cancelled).
  - A small "Requester confirmed problem resolved" indicator (green check + timestamp) appears
    when `requesterConfirmedResolved` is true — informational only, does not gate anything.
- Tabs/panels below, reusing Lab 2's Attachments panel unchanged, plus two new panels:
  - **Public Comments** — pale-green card background, visible note "Visible to the Requester."
  - **Internal Notes** — distinct color (e.g. amber-tinted card) with a visible "Staff only —
    never shown to the Requester" label, so no one mistakes one panel for the other.
- Each Comment/Note shows author name, role badge, and timestamp; newest last (chat-like), with
  a simple textarea + "Post" button at the bottom of each panel (append-only, no edit/delete UI).

## 6. Requester Ticket Detail (Lab 3 additions)

- Same read-only layout as Lab 2, plus:
  - A **Public Comments** panel (same visual style as staff's, since it's the same data) with
    a "Post Comment" box.
  - A **"Mark problem as resolved"** button/checkbox above or near Resolution Summary; once
    confirmed, shows a small "You confirmed this is resolved" badge until it resets (BR-14).
- No Internal Notes panel is rendered for the Requester role at all (not hidden — absent).

## 7. Administrator User Management

- Single screen, two-pane layout on desktop (list left/center, create-or-edit panel as a
  slide-over on the right — matching the reference mockup), stacked full-width panel on mobile.
- List: Name, Email, Role (badge), Status (Active/Inactive badge), Edit action per row.
- Toolbar: search (name/email), role filter dropdown, "Create User" primary button.
- Create/Edit panel fields: Full Name, Email, Role (select), Active (toggle), and — create
  only — Initial Password (plus a "Generate" helper button that fills a random compliant
  password the admin can copy). Edit panel instead shows a separate "Reset Password" action
  opening a small confirm dialog for a new initial password.
- Validation: duplicate email shown inline under Email; self-deactivation and
  last-active-Administrator attempts show a single alert-danger banner explaining why the save
  was blocked, form values preserved.
- States: loading, empty (no users match search — rare), validation, saving (busy button),
  success (toast or inline confirmation), forbidden (only reachable if a non-Administrator
  somehow lands here — shows a plain "You don't have access to this page" screen, no data
  fetched).

## 8. Component and State Rules Carried Over

Unchanged from Lab 2: label placement, required-field asterisk + adjacent message, one input
height, disabled-control styling, visible focus rings, busy submit buttons, validation
messages next to their field. New role/status/owner badges reuse the existing badge component
with new color/label pairs (documented as CSS class variants, not one-off inline styles).

## 9. Responsive Requirements

Same breakpoints as Lab 2 (§8.7: Desktop ≥992px, Tablet 768–991px, Mobile <768px). The
Administrator two-pane layout collapses to a single full-width panel below 992px (the edit
panel replaces the list view rather than sitting beside it). The Staff Queue table converts to
cards on mobile exactly like Lab 2's My Tickets.
