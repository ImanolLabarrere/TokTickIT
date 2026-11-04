# Lab 4 UI Specification

Extends the Zen Green design system established in Labs 2 and 3. This specification details the visual hierarchy, component layouts, interactions, accessibility, and responsive adaptations for Lab 4 additions:
1. Application Shell & Role-Based Navigation updates
2. Requester Dashboard
3. IT Staff & Administrator Dashboard
4. Actions Taken on Ticket Detail (Creation, Display, Edit, and Role-specific modes)
5. Ticket Workflow controls & Resolution feedback

---

## 1. Application Shell & Navigation

- **Navigation Items by Role**:
  - `REQUESTER`: **Dashboard** (new), **My Tickets**, **Create Ticket**.
  - `IT_STAFF`: **Dashboard** (new), **My Queue**.
  - `ADMINISTRATOR`: **Dashboard** (new), **My Queue**, **Admin** (User Management).
- **Active Page Indicator**: Solid pill highlight in Zen Green theme (`#2d6a4f` background or light mint accent `#d8f3dc`) with `aria-current="page"`.
- **Top Bar**: Preserves App Logo "TokTickIT", user greeting, role chip badge, and Logout button.

---

## 2. Requester Dashboard

### Visual Structure
- **Greeting Banner**: "Welcome back, {User Name}!" with contextual subtitle "Here's what's happening with your requests today."
- **KPI Metric Cards (Grid layout - 3 cards)**:
  1. **Open Tickets**: Total active tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
  2. **Waiting for You**: Tickets in `WAITING_FOR_REQUESTER` requiring user input or confirmation.
  3. **Resolved**: Successfully resolved/closed tickets.
  - *Interaction*: Each card functions as an accessible drill-down button with hover elevation and focus ring. Clicking a card navigates to `My Tickets` filtered to that status set.
- **Quick Actions Panel**:
  - `+ Create New Ticket` (primary green button)
  - `View All My Tickets` (secondary outlined button)
- **Recent Tickets Card/Table**:
  - Displays up to 5 recently updated tickets.
  - Columns / fields: Ticket #, Summary, Status Badge, Requested Priority, Last Updated, and direct click to view detail.
  - **Empty State**: Friendly illustration/icon with text "No active requests right now. Need IT assistance?" and a "Create Ticket" prompt.

---

## 3. IT Staff Dashboard

### Visual Structure
- **Header Toolbar**: "IT Operations Dashboard", current date display, and a manual "Refresh" button with loading spinner.
- **Operational Metric Cards (Grid layout - 4 cards)**:
  1. **Unassigned Tickets**: Tickets awaiting triage/ownership (`ownerId === null`). Amber highlight when > 0.
  2. **My Assigned Tickets**: Tickets currently owned by the authenticated staff member.
  3. **High Priority**: Urgent open tickets requiring immediate attention.
  4. **Waiting for Requester**: Tickets paused pending user response.
  - *Interaction*: Clicking any metric card routes to `My Queue` pre-filtered (e.g., clicking Unassigned sets Owner filter to "Unassigned").
- **Platform Overview (for Administrator role)**:
  - Concise secondary badge / count showing "Active System Users: X" with a link to User Management.
- **Recent Operational Activity**:
  - Table of the 5 most recently updated tickets across the entire organization.
  - Displays: Ticket #, Summary, Requester Name, IT Priority Badge, Status Badge, Owner Chip, and Last Updated.
- **Quick Actions**:
  - `Browse Full Queue`
  - `Claim Next Unassigned Ticket` (or view unassigned filter)

---

## 4. Actions Taken on Ticket Detail

### Location & Layout
- Integrated directly into the Ticket Detail screen, placed adjacent to or in a dedicated tab/section alongside **Public Comments** and **Internal Notes**.
- Visually distinct section header with an "Actions Taken" icon and counter badge (e.g., `Actions Taken (3)`).
- **IT Staff / Admin View**:
  - Prominent "Record Action Taken" button triggering the create form (collapsible panel or clear card).
  - Each action card displays:
    - Top row: Action Date & Time (formatted local string), Performer Chip (`Name` + `Role`), Edit button (for author or Admin).
    - Description: Clear readable text block.
    - Result: Distinct callout block indicating the outcome.
    - Follow-Up Required Badge: High-contrast amber badge `⚠️ Follow-up Needed` accompanied by the `followUpNote`.
    - Attachment Notes: Muted text block with a paperclip icon referencing attached diagnostic/config files.
- **Requester View**:
  - Clean, read-only intervention timeline.
  - Requesters can see what actions IT Staff have taken to solve their issue.
  - Creation and editing controls are completely omitted for Requesters.

### Form Fields & Validation
- **Action Date/Time**: Optional datetime picker; defaults to current local time. Rejects future dates.
- **Action Description**: Textarea, required, 1-2000 characters, character counter.
- **Result**: Textarea, required, 1-2000 characters.
- **Follow-up Required?**: Checkbox toggle.
- **Follow-up Note**: Required and visible only when the toggle is checked. Textarea (1-1000 characters). Inline error message if empty: *"Please provide follow-up instructions or details."*
- **Attachment Notes**: Text input, optional, max 500 characters. Placeholder: *"e.g., See router_config.txt or error_log.png"*.

---

## 5. Ticket Workflow & Resolution Feedback

- **Status Transition Controls**:
  - Rendered as a styled select dropdown or discrete action buttons showing **only valid next transitions** based on `currentStatus` (BR-12).
  - For `NEW` tickets: "Claim Ticket" automatically sets owner and transitions to `OPEN`.
  - For `RESOLVED` / `CLOSED`: Requires owner confirmation modal or check; blocked if unassigned.
  - Requester view: Shows read-only status badge and advisory button "Problem Appears Resolved" (toggles `requesterConfirmedResolved`).
- **Conflict & Error Handling**:
  - If another IT Staff member transitions the ticket in the background, submitting an action or status displays a non-destructive conflict banner:
    *"This ticket was updated by another team member. Please refresh the page to view current state."* with a "Refresh" button preserving user input where possible.

---

## 6. Responsive Breakpoints & Accessibility

- **Desktop (≥1024px)**:
  - Metric cards arranged in 3 or 4 columns.
  - Tables full-width with sortable headers and status chips.
  - Side-by-side or tabbed panels for Public Comments, Internal Notes, and Actions Taken.
- **Tablet (768px – 1023px)**:
  - Metric cards in 2x2 grid.
  - Tables collapse gracefully with horizontal scroll or structured card rows.
- **Mobile (≤767px)**:
  - Metric cards stack in a single column with full-width touch targets (minimum 44x44px).
  - Tables collapse into clean stacked cards.
  - Forms use native mobile inputs (`type="datetime-local"`, etc.).
  - No horizontal page overflow.
- **Accessibility (WCAG AA)**:
  - High-contrast text on all badge tokens (`Zen Green`, `Amber Alert`, `Neutral Slate`).
  - Strict semantic headings (`<h1>` through `<h3>`).
  - Visible focus rings (`2px solid #2d6a4f`, `offset 2px`) on all interactive buttons, cards, and form inputs.
  - Form validation errors announced via `aria-describedby` and `role="alert"`.
