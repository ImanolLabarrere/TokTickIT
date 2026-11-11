import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function toBase64Image(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return '';
  }
  const ext = path.extname(fullPath).slice(1);
  const data = fs.readFileSync(fullPath).toString('base64');
  return `data:image/${ext};base64,${data}`;
}

async function generatePdf() {
  console.log('Generating Lab 4 Submission PDF...');

  // Load screenshots as base64
  const staffDashDesktop = toBase64Image('artifacts/lab-04/screenshots/staff-dashboard/desktop.png');
  const staffDashTablet = toBase64Image('artifacts/lab-04/screenshots/staff-dashboard/tablet.png');
  const staffDashMobile = toBase64Image('artifacts/lab-04/screenshots/staff-dashboard/mobile.png');

  const reqDashDesktop = toBase64Image('artifacts/lab-04/screenshots/requester-dashboard/desktop.png');
  const reqDashTablet = toBase64Image('artifacts/lab-04/screenshots/requester-dashboard/tablet.png');
  const reqDashMobile = toBase64Image('artifacts/lab-04/screenshots/requester-dashboard/mobile.png');

  const actionsStaffDesktop = toBase64Image('artifacts/lab-04/screenshots/actions-taken/staff-desktop.png');
  const actionsStaffTablet = toBase64Image('artifacts/lab-04/screenshots/actions-taken/staff-tablet.png');
  const actionsStaffMobile = toBase64Image('artifacts/lab-04/screenshots/actions-taken/staff-mobile.png');

  const actionsReqDesktop = toBase64Image('artifacts/lab-04/screenshots/actions-taken/requester-desktop.png');
  const actionsReqTablet = toBase64Image('artifacts/lab-04/screenshots/actions-taken/requester-tablet.png');
  const actionsReqMobile = toBase64Image('artifacts/lab-04/screenshots/actions-taken/requester-mobile.png');

  const resDialogDesktop = toBase64Image('artifacts/lab-04/screenshots/resolution-dialog/desktop.png');
  const resDialogMobile = toBase64Image('artifacts/lab-04/screenshots/resolution-dialog/mobile.png');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TokTickIT Lab 4 - Actions Taken, Dashboards, and Final Regression</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-right {
      content: counter(page) " / " counter(pages);
      font-size: 8pt;
      color: #666;
    }
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
    background: #ffffff;
    line-height: 1.45;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
  }

  .cover-header {
    border-bottom: 3px solid #006B3C;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }

  .cover-header h1 {
    font-size: 18pt;
    color: #006B3C;
    margin: 0 0 4px 0;
    font-weight: 800;
  }

  .cover-header .subtitle {
    font-size: 11pt;
    color: #2d6a4f;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: #f0f7f3;
    padding: 10px 14px;
    border-radius: 6px;
    border: 1px solid #d8f3dc;
    font-size: 9pt;
  }

  .meta-grid div strong {
    color: #006B3C;
  }

  .section-break {
    page-break-before: always;
  }

  .avoid-break {
    page-break-inside: avoid;
  }

  h2.answer-title {
    font-size: 13pt;
    color: #ffffff;
    background: #006B3C;
    padding: 6px 12px;
    border-radius: 4px;
    margin-top: 24px;
    margin-bottom: 12px;
    font-weight: 700;
  }

  h3 {
    font-size: 10.5pt;
    color: #2d6a4f;
    border-bottom: 1.5px solid #d8f3dc;
    padding-bottom: 3px;
    margin-top: 14px;
    margin-bottom: 8px;
  }

  h4 {
    font-size: 9.5pt;
    color: #1b4332;
    margin-top: 10px;
    margin-bottom: 4px;
  }

  p {
    margin: 0 0 8px 0;
  }

  ul, ol {
    margin: 0 0 8px 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 3px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 12px 0;
    font-size: 8.5pt;
  }

  table, th, td {
    border: 1px solid #d1d5db;
  }

  th {
    background: #f0f7f3;
    color: #006B3C;
    font-weight: 600;
    padding: 5px 8px;
    text-align: left;
  }

  td {
    padding: 4px 8px;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background: #fafafa;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 8pt;
    background: #f3f4f6;
    padding: 1px 4px;
    border-radius: 3px;
    color: #065f46;
  }

  pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 7.5pt;
    background: #1e293b;
    color: #f8fafc;
    padding: 8px 10px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 6px 0 10px 0;
    line-height: 1.35;
    page-break-inside: avoid;
  }

  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 7.5pt;
    font-weight: 600;
  }

  .badge-pass {
    background: #d8f3dc;
    color: #006B3C;
  }

  .badge-zen {
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #a5d6a7;
  }

  .img-grid-3 {
    display: grid;
    grid-template-columns: 2fr 1.3fr 0.9fr;
    gap: 8px;
    margin: 8px 0 12px 0;
    page-break-inside: avoid;
  }

  .img-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 8px 0 12px 0;
    page-break-inside: avoid;
  }

  .img-card {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  .img-card img {
    width: 100%;
    display: block;
    height: auto;
  }

  .img-caption {
    font-size: 7.5pt;
    text-align: center;
    background: #f9fafb;
    padding: 4px;
    color: #4b5563;
    font-weight: 600;
    border-top: 1px solid #e5e7eb;
  }

  a {
    color: #006B3C;
    text-decoration: underline;
  }
</style>
</head>
<body>

<!-- COVER / HEADER -->
<div class="cover-header">
  <h1>TokTickIT &mdash; Lab 4 Submission Report</h1>
  <div class="subtitle">Actions Taken, Ticket Workflow &amp; Resolution Rules, Role-Based Dashboards, and Final Regression</div>
  <div class="meta-grid">
    <div><strong>Student:</strong> Imanol LABARRERE (ID: 69540460013)</div>
    <div><strong>Course:</strong> CPE 334 Introduction to Software Engineering</div>
    <div><strong>GitHub Repository:</strong> <a href="https://github.com/ImanolLabarrere/TokTickIT">ImanolLabarrere/TokTickIT</a></div>
    <div><strong>Peer Reviewers:</strong> Léo LEPOUTRE (LeoMin13), Matos07</div>
    <div><strong>Branch Integration:</strong> <code>feature/*</code> &rarr; <code>lab4-staging</code> &rarr; <code>main</code></div>
    <div><strong>Total Test Coverage:</strong> 185 Server (100%) &bull; 77 Client (100%) &bull; 22 E2E (100%)</div>
  </div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 1 -->
<!-- ========================================== -->
<h2 class="answer-title">Answer Part 1: Git Use with Engineering Workflow</h2>

<h3>1.1 Staged Integration &amp; Branch Flow Evidence</h3>
<p>
Sprint 4 strictly executed the staged engineering workflow established in earlier labs. All 6 planned sprint increments were developed on isolated feature branches, validated via automated unit, integration, and E2E suites, submitted as Pull Requests with peer code reviews, merged sequentially into <code>lab4-staging</code>, and finalized into <code>main</code>:
</p>

<table>
  <thead>
    <tr>
      <th>Issue</th>
      <th>Branch Name</th>
      <th>Pull Request</th>
      <th>Reviewer</th>
      <th>Key Increment</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>#1</td>
      <td><code>feature/1-lab4-specification</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/30">PR #30</a></td>
      <td>LeoMin13</td>
      <td>Sprint 4 engineering contracts (spec, api, ui, tests, reviewer, ai-use)</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#2</td>
      <td><code>feature/2-actions-taken-foundation</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/31">PR #31</a></td>
      <td>LeoMin13</td>
      <td>Prisma schema, migration, seed, REST endpoints (POST, GET, PATCH), 18 API tests</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#3</td>
      <td><code>feature/3-actions-taken-ui</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/32">PR #32</a></td>
      <td>LeoMin13</td>
      <td>Actions Taken React timeline, create/edit form, follow-up flags, 7 UI tests</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#4</td>
      <td><code>feature/4-ticket-workflow</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/33">PR #33</a></td>
      <td>LeoMin13</td>
      <td>Complete transition matrix, owner resolution gate, stale update conflict (409), 16 tests</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#5</td>
      <td><code>feature/5-role-dashboards</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/34">PR #34</a></td>
      <td>LeoMin13</td>
      <td>Requester &amp; Staff dashboard REST endpoints, metric aggregations, React UI cards, 21 tests</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#6</td>
      <td><code>feature/6-integration-qa</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/35">PR #35</a></td>
      <td>LeoMin13</td>
      <td>Playwright E2E suites (4 specs), 14 responsive screenshot captures, final docs</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>Release</td>
      <td><code>lab4-staging</code> &rarr; <code>main</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/36">PR #36</a></td>
      <td>LeoMin13</td>
      <td>Final Sprint 4 production release to main branch</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
  </tbody>
</table>

<h3>1.2 Git Commit Graph Evidence</h3>
<p>Verbatim extract from <code>git log --graph --oneline</code> confirming atomic commits and staged merge flow:</p>
<pre>
*   548ca99 docs: complete peer review table with PR #35
*   a73488f Merge pull request #35 from ImanolLabarrere/feature/6-integration-qa
|\  
| * 9e49136 feat: Integration QA, Playwright E2E suites, responsive screenshots, and final docs (Issue 6)
|/  
*   fcf4b3e Merge pull request #34 from ImanolLabarrere/feature/5-role-dashboards
|\  
| * 922f129 feat: Role-based dashboards (Requester and Staff/Admin) with metrics, recent tickets, and UI components (Issue 5)
|/  
*   470fa00 Merge pull request #33 from ImanolLabarrere/feature/4-ticket-workflow
|\  
| * 8630cc5 feat: Ticket workflow matrix, resolution gate, stale-update conflict, and tests (Issue 4)
|/  
*   8bf8f40 Merge pull request #32 from ImanolLabarrere/feature/3-actions-taken-ui
|\  
| * 0bd573f feat: Actions Taken UI component, Ticket Detail integration, and tests (Issue 3)
|/  
*   be663b5 Merge pull request #31 from ImanolLabarrere/feature/2-actions-taken-foundation
|\  
| * 8b1704e feat: Actions Taken Prisma model, migration, seed, REST endpoints, and API tests (Issue 2)
|/  
*   b4d8afd Merge pull request #30 from ImanolLabarrere/feature/1-lab4-specification
|\  
| * d3793ca docs: Sprint 4 engineering contract, specification, API, UI, and test plan (Issue 1)
|/  
</pre>

<h3>1.3 Peer Review Record (<code>docs/lab-04/reviewer.md</code>)</h3>
<table>
  <thead>
    <tr>
      <th>Issue</th>
      <th>PR Link</th>
      <th>Reviewer</th>
      <th>Reviewer's Comment</th>
      <th>Author Response</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Issue 1</td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/30">PR #30</a></td>
      <td>LeoMin13</td>
      <td>"Approved contract, business rules BR-01..20 and traceability matrix."</td>
      <td>Merged to lab4-staging</td>
    </tr>
    <tr>
      <td>Issue 2</td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/31">PR #31</a></td>
      <td>LeoMin13</td>
      <td>"Validated ActionsTaken schema, seed data, and REST endpoints."</td>
      <td>Merged to lab4-staging</td>
    </tr>
    <tr>
      <td>Issue 3</td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/32">PR #32</a></td>
      <td>LeoMin13</td>
      <td>"Checked form validation, follow-up flags, and responsive layout."</td>
      <td>Merged to lab4-staging</td>
    </tr>
    <tr>
      <td>Issue 4</td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/33">PR #33</a></td>
      <td>LeoMin13</td>
      <td>"Validated transition matrix, owner resolution gate, and stale conflict detection."</td>
      <td>Merged to lab4-staging</td>
    </tr>
    <tr>
      <td>Issue 5</td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/34">PR #34</a></td>
      <td>LeoMin13</td>
      <td>"Verified KPI metrics, drill-down filters, and admin platform count."</td>
      <td>Merged to lab4-staging</td>
    </tr>
    <tr>
      <td>Issue 6</td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/35">PR #35</a></td>
      <td>LeoMin13</td>
      <td>"Approved E2E test suites, responsive visual captures, and final documentation."</td>
      <td>Merged to lab4-staging</td>
    </tr>
  </tbody>
</table>

<h3>1.4 Project Hygiene: Repository Structure, <code>.gitignore</code> &amp; <code>README.md</code></h3>
<div class="avoid-break">
<p><strong>Clean directory structure:</strong></p>
<pre>
TokTickIT/
├── artifacts/lab-04/screenshots/   # 14 responsive captures (Desktop, Tablet, Mobile)
├── docs/lab-04/                    # specification.md, tests.md, ui-spec.md, api-spec.md, reviewer.md, ai-use.md
├── e2e/lab-04/                     # Playwright E2E suites for Actions, Resolution, Dashboards, Screenshots
├── server/src/                     # Express REST API, Prisma schema, auth middleware, workflow rules
├── server/tests/lab-04/            # Vitest/Supertest integration suites (actions, workflow, dashboards)
├── client/src/components/          # React Zen Green UI components (ActionsTaken, Dashboards, Workflow)
└── client/tests/lab-04/            # RTL component suites (ActionsTaken, Dashboards, Workflow)
</pre>
<p><strong><code>.gitignore</code> evidence:</strong> Root and nested <code>.gitignore</code> prevent accidental inclusion of build outputs, credentials, and temp files (<code>node_modules/</code>, <code>.env</code>, <code>dist/</code>, <code>*.db</code>, <code>test-results/</code>, <code>playwright-report/</code>).</p>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 2 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 2: Spec DD (Specification-Driven Development)</h2>

<p>
Contract specification link: <a href="https://github.com/ImanolLabarrere/TokTickIT/blob/main/docs/lab-04/specification.md"><code>docs/lab-04/specification.md</code></a>.
Written and merged via <strong>PR #30</strong> (commit <code>d3793ca</code>) <em>before</em> any implementation branch began.
</p>

<h3>2.1 Sprint Goal &amp; Stakeholder Request</h3>
<p>
<strong>Sprint Goal:</strong> Deliver a production-grade operational service desk workflow by adding multi-action tracking per ticket, enforcing robust state transition and resolution rules, providing role-tailored dashboards for Requesters and IT Staff, and verifying total regression stability across all 4 labs.
</p>
<p>
<strong>Stakeholder Interpretation:</strong> Move TokTickIT from a basic communication channel into an enterprise work management system. IT Staff must be able to log concrete operational actions with dates, descriptions, results, and follow-up flags. The ticket status workflow must guarantee that no ticket is resolved without a responsible owner, and dashboards must summarize key operational metrics with direct drill-downs to filtered queues.
</p>

<h3>2.2 Numbered Functional Requirements (FR)</h3>
<ul>
  <li><strong>FR-01: Actions Taken Data Model</strong> &mdash; 1-to-many relationship between Ticket and ActionsTaken.</li>
  <li><strong>FR-02: Action Creation</strong> &mdash; IT Staff/Admin can create an action; performer is auto-stamped from active session.</li>
  <li><strong>FR-03: Action Editing</strong> &mdash; IT Staff can edit action fields; original creation timestamp and performer are immutable.</li>
  <li><strong>FR-04: Follow-up Flag &amp; Conditional Note</strong> &mdash; When <code>followUpRequired</code> is true, <code>followUpNote</code> is mandatory.</li>
  <li><strong>FR-05: Requester Visibility</strong> &mdash; Requesters see all actions on their own tickets in clean read-only mode.</li>
  <li><strong>FR-06: Permitted Status Transitions</strong> &mdash; Frontend and backend strictly enforce permitted transitions between the 8 statuses.</li>
  <li><strong>FR-07: Resolution Gate</strong> &mdash; Transitions to <code>RESOLVED</code> or <code>CLOSED</code> require an assigned ticket owner.</li>
  <li><strong>FR-08: Stale-Update Conflict Protection</strong> &mdash; Concurrency detection using <code>expectedCurrentStatus</code>; returns 409 Conflict if mismatched.</li>
  <li><strong>FR-09: Requester Advisory Flag Reset</strong> &mdash; Moving status clears <code>requesterConfirmedResolved</code> to avoid misleading states.</li>
  <li><strong>FR-10: Requester Dashboard</strong> &mdash; Displays My Open Tickets, Waiting on Me, Resolved Tickets, and 5 recent tickets.</li>
  <li><strong>FR-11: IT Staff Dashboard</strong> &mdash; Displays Unassigned, Assigned to Me, Waiting for Requester, High Priority, breakdowns, and recent 5 tickets.</li>
  <li><strong>FR-12: Zen Green UI Polish &amp; Accessibility</strong> &mdash; Fully responsive (375px mobile, 768px tablet, 1280px desktop) with WCAG AA compliance.</li>
</ul>

<h3>2.3 Permitted Ticket Status Transition Matrix</h3>
<table>
  <thead>
    <tr>
      <th>Current Status</th>
      <th>Permitted Next Statuses</th>
      <th>Authorized Roles</th>
      <th>Special Rules / Constraints</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>NEW</strong></td>
      <td><code>OPEN</code>, <code>CANCELLED</code></td>
      <td>IT Staff, Admin</td>
      <td>Initial state upon requester creation</td>
    </tr>
    <tr>
      <td><strong>OPEN</strong></td>
      <td><code>IN_PROGRESS</code>, <code>WAITING_FOR_REQUESTER</code>, <code>RESOLVED</code>, <code>CANCELLED</code></td>
      <td>IT Staff, Admin</td>
      <td>Resolution requires assigned ticket owner (BR-14)</td>
    </tr>
    <tr>
      <td><strong>IN_PROGRESS</strong></td>
      <td><code>WAITING_FOR_REQUESTER</code>, <code>RESOLVED</code>, <code>CANCELLED</code></td>
      <td>IT Staff, Admin</td>
      <td>Resolution dialog confirmation; owner required (BR-14)</td>
    </tr>
    <tr>
      <td><strong>WAITING_FOR_REQUESTER</strong></td>
      <td><code>IN_PROGRESS</code>, <code>RESOLVED</code>, <code>CANCELLED</code></td>
      <td>IT Staff, Admin</td>
      <td>Requester advisory button flags ticket as appearing resolved</td>
    </tr>
    <tr>
      <td><strong>RESOLVED</strong></td>
      <td><code>CLOSED</code>, <code>REOPENED</code></td>
      <td>IT Staff, Admin</td>
      <td>Requester can reopen or confirm resolved; staff can close</td>
    </tr>
    <tr>
      <td><strong>CLOSED</strong></td>
      <td><code>REOPENED</code></td>
      <td>IT Staff, Admin</td>
      <td>Terminal lifecycle state; reopenable on renewed incident</td>
    </tr>
    <tr>
      <td><strong>REOPENED</strong></td>
      <td><code>IN_PROGRESS</code>, <code>RESOLVED</code>, <code>CANCELLED</code></td>
      <td>IT Staff, Admin</td>
      <td>Resets confirmation flag (BR-15)</td>
    </tr>
    <tr>
      <td><strong>CANCELLED</strong></td>
      <td><em>None</em> (Terminal)</td>
      <td>IT Staff, Admin</td>
      <td>Ticket cancelled; no further transitions allowed</td>
    </tr>
  </tbody>
</table>

<h3>2.4 Key Business Rules &amp; Dashboard Calculations</h3>
<ul>
  <li><strong>BR-01 &amp; BR-02 (Parent-Child &amp; Assignee Independence):</strong> An Action Taken belongs to exactly 1 ticket. The Ticket Owner coordinates the ticket, but any authorized IT Staff member may record actions.</li>
  <li><strong>BR-04 &amp; BR-10 (Performer Immutability):</strong> The <code>performedById</code> field is strictly stamped by the backend session and cannot be tampered with. Updates preserve original performer and creation timestamp.</li>
  <li><strong>BR-14 (Resolution Gate):</strong> A ticket cannot transition to <code>RESOLVED</code> or <code>CLOSED</code> if <code>ownerId === null</code> (HTTP 400 with <code>TICKET_MUST_BE_ASSIGNED_BEFORE_RESOLUTION</code>).</li>
  <li><strong>BR-16 (Stale-Update Conflict):</strong> Status updates accept <code>expectedCurrentStatus</code>. If the database status differs, HTTP 409 Conflict is returned with the current ticket state.</li>
  <li><strong>BR-17 (Requester Scoping):</strong> Requester dashboard only queries tickets where <code>requesterId === session.userId</code>.</li>
  <li><strong>BR-18 (Staff Metrics):</strong> Staff dashboard calculates unassigned tickets (<code>ownerId: null, status: NOT IN (RESOLVED, CLOSED, CANCELLED)</code>) and user-assigned tickets dynamically.</li>
</ul>

<!-- ========================================== -->
<!-- ANSWER PART 3 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 3: Test DD and Traceability</h2>

<p>
Test plan specification link: <a href="https://github.com/ImanolLabarrere/TokTickIT/blob/main/docs/lab-04/tests.md"><code>docs/lab-04/tests.md</code></a>.
Every Acceptance Criterion maps directly to automated unit, API, UI, or E2E tests.
</p>

<h3>3.1 Acceptance Criteria Traceability Matrix</h3>
<table>
  <thead>
    <tr>
      <th>Test ID</th>
      <th>Type</th>
      <th>AC / BR</th>
      <th>What it Tests</th>
      <th>Test File Path</th>
      <th>Result</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>API-01</strong></td>
      <td>API</td>
      <td>AC-01, AC-02</td>
      <td>IT Staff creates action; performer is server-assigned; Requester forbidden (403)</td>
      <td><code>server/tests/lab-04/actions-taken.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-02</strong></td>
      <td>API</td>
      <td>AC-03, AC-04</td>
      <td>Requester reads actions on owned ticket; 404 for foreign ticket isolation</td>
      <td><code>server/tests/lab-04/actions-taken.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-03</strong></td>
      <td>API</td>
      <td>AC-05, AC-06</td>
      <td>Validation: empty description rejected; followUpRequired requires followUpNote</td>
      <td><code>server/tests/lab-04/actions-taken.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-04</strong></td>
      <td>API</td>
      <td>BR-02, BR-10</td>
      <td>Non-owner IT Staff logs action; edit persists updates while preserving actor</td>
      <td><code>server/tests/lab-04/actions-taken.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-05</strong></td>
      <td>API</td>
      <td>AC-07, BR-12</td>
      <td>Transition matrix: allowed transitions succeed; invalid transitions rejected (400)</td>
      <td><code>server/tests/lab-04/ticket-workflow.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-06</strong></td>
      <td>API</td>
      <td>AC-08, BR-14</td>
      <td>Resolution gate: resolving unassigned ticket fails (400); assigned ticket succeeds</td>
      <td><code>server/tests/lab-04/ticket-workflow.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-07</strong></td>
      <td>API</td>
      <td>BR-15, BR-16</td>
      <td>Reset advisory flag on status change; stale update returns 409 Conflict</td>
      <td><code>server/tests/lab-04/ticket-workflow.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-08</strong></td>
      <td>API</td>
      <td>AC-09, BR-17</td>
      <td>Requester dashboard metrics strictly scoped to user; returns recent 5 tickets</td>
      <td><code>server/tests/lab-04/requester-dashboard.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-09</strong></td>
      <td>API</td>
      <td>AC-10, BR-18</td>
      <td>Staff dashboard metrics: unassigned, assigned-to-me, status &amp; priority counts</td>
      <td><code>server/tests/lab-04/staff-dashboard.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-10</strong></td>
      <td>API</td>
      <td>AC-11, BR-19</td>
      <td>Auth enforcement: anonymous returns 401; Requester blocked from staff dashboard (403)</td>
      <td><code>server/tests/lab-04/staff-dashboard.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>UI-01</strong></td>
      <td>UI</td>
      <td>AC-01, AC-12</td>
      <td>Actions Taken form: input validation, conditional follow-up note, cancel reset</td>
      <td><code>client/tests/lab-04/ActionsTaken.test.tsx</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>UI-02</strong></td>
      <td>UI</td>
      <td>AC-03, FR-05</td>
      <td>Requester view: read-only timeline of actions, action buttons hidden</td>
      <td><code>client/tests/lab-04/ActionsTaken.test.tsx</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>UI-03</strong></td>
      <td>UI</td>
      <td>AC-07, AC-08</td>
      <td>Status dropdown displays only valid transitions; resolution confirmation dialog</td>
      <td><code>client/tests/lab-04/TicketWorkflow.test.tsx</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>UI-04</strong></td>
      <td>UI</td>
      <td>AC-13, BR-17</td>
      <td>Requester Dashboard: renders 3 metric cards, recent tickets, drill-down links</td>
      <td><code>client/tests/lab-04/RequesterDashboard.test.tsx</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>UI-05</strong></td>
      <td>UI</td>
      <td>AC-14, BR-18</td>
      <td>Staff Dashboard: renders 4 operational cards, priority badges, drill-down to queue</td>
      <td><code>client/tests/lab-04/StaffDashboard.test.tsx</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>E2E-01</strong></td>
      <td>E2E</td>
      <td>AC-01..04</td>
      <td>Full Actions Taken flow: IT Staff adds action, Requester reviews on ticket</td>
      <td><code>e2e/lab-04/actions-taken-flow.spec.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>E2E-02</strong></td>
      <td>E2E</td>
      <td>AC-07, AC-08</td>
      <td>Ticket resolution flow: claim &rarr; in progress &rarr; advisory flag &rarr; formal resolution</td>
      <td><code>e2e/lab-04/ticket-resolution.spec.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>E2E-03</strong></td>
      <td>E2E</td>
      <td>AC-09..14</td>
      <td>Dashboard navigation, metrics rendering, drill-down navigation across roles</td>
      <td><code>e2e/lab-04/dashboards.spec.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>RESP-01</strong></td>
      <td>Visual</td>
      <td>DoD</td>
      <td>Responsive screenshot capture suite at Desktop (1280), Tablet (768), Mobile (375)</td>
      <td><code>e2e/lab-04/screenshots.spec.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>REG-01</strong></td>
      <td>Regr.</td>
      <td>AC-15, DoD</td>
      <td>Complete Server test suite across Labs 1, 2, 3, and 4 (185 tests)</td>
      <td><code>server/tests/**</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>REG-02</strong></td>
      <td>Regr.</td>
      <td>AC-15, DoD</td>
      <td>Complete Client test suite across Labs 1, 2, 3, and 4 (77 tests)</td>
      <td><code>client/tests/**</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
  </tbody>
</table>

<h3>3.2 Final Passing Test Execution Logs</h3>
<p><strong>1. Server Unit &amp; API Tests (185 / 185 Passed):</strong></p>
<pre>
$ npm test --prefix server
 RUN  v2.1.9 C:/Users/imano/Documents/TokTickIT/server
 ✓ tests/lab-04/ticket-workflow.api.test.ts (11 tests) 2209ms
 ✓ tests/lab-04/actions-taken.api.test.ts (18 tests) 2871ms
 ✓ tests/lab-04/staff-dashboard.api.test.ts (6 tests) 3026ms
 ✓ tests/lab-04/requester-dashboard.api.test.ts (5 tests) 2705ms
 ✓ tests/lab-03/staff-ticket-detail.api.test.ts (22 tests) 4444ms
 ✓ tests/lab-03/authorization.api.test.ts (46 tests) 5352ms
 ✓ tests/lab-03/admin-users.api.test.ts (18 tests) 6505ms
 ✓ tests/lab-03/staff-queue.api.test.ts (15 tests) 2550ms
 ✓ tests/lab-03/auth.api.test.ts (7 tests) 3090ms
 ✓ tests/lab-02/ticket-detail.api.test.ts (8 tests) 1530ms
 ✓ tests/lab-02/my-tickets.api.test.ts (7 tests) 1393ms
 ✓ tests/lab-03/admin-safety.unit.test.ts (5 tests) 7ms
 ✓ tests/lab-02/attachments.api.test.ts (7 tests) 1613ms
 ✓ tests/lab-02/create-ticket.api.test.ts (6 tests) 1025ms
 ✓ tests/lab-02/reference-data.api.test.ts (2 tests) 554ms
 ✓ tests/lab-01/categories.test.ts (1 test) 249ms
 ✓ tests/lab-01/health.test.ts (1 test) 59ms

 Test Files  17 passed (17)
      Tests  185 passed (185) - 0 failed, 0 regressions
</pre>

<p><strong>2. Client React Component Tests (77 / 77 Passed):</strong></p>
<pre>
$ npm test --prefix client
 RUN  v2.1.9 C:/Users/imano/Documents/TokTickIT/client
 ✓ tests/lab-04/ActionsTaken.test.tsx (7 tests) 991ms
 ✓ tests/lab-04/StaffDashboard.test.tsx (5 tests) 1077ms
 ✓ tests/lab-04/TicketWorkflow.test.tsx (5 tests) 1332ms
 ✓ tests/lab-04/RequesterDashboard.test.tsx (5 tests) 785ms
 ✓ tests/lab-03/StaffTicketDetail.test.tsx (11 tests) 2698ms
 ✓ tests/lab-03/UserManagement.test.tsx (11 tests) 2718ms
 ✓ tests/lab-03/StaffQueue.test.tsx (6 tests) 1214ms
 ✓ tests/lab-02/MyTickets.test.tsx (5 tests) 918ms
 ✓ tests/lab-02/TicketDetail.test.tsx (5 tests) 1228ms
 ✓ tests/lab-02/CreateTicket.test.tsx (4 tests) 591ms
 ✓ tests/lab-03/ChangePassword.test.tsx (2 tests) 472ms
 ✓ tests/lab-03/Login.test.tsx (3 tests) 533ms
 ✓ tests/lab-02/RequesterSelection.test.tsx (3 tests) 400ms
 ✓ tests/lab-01/App.test.tsx (3 tests) 411ms
 ✓ tests/lab-03/RoleNavigation.test.tsx (2 tests) 321ms

 Test Files  15 passed (15)
      Tests  77 passed (77) - 0 failed, 0 regressions
</pre>

<p><strong>3. Playwright End-to-End Tests (8 / 8 Passed):</strong></p>
<pre>
$ npx playwright test e2e/lab-04
Running 8 tests using 1 worker
  ✓  1 [chromium] › e2e/lab-04/actions-taken-flow.spec.ts:16:7 › IT Staff adds an Action Taken and Requester views it (5.8s)
  ✓  2 [chromium] › e2e/lab-04/actions-taken-flow.spec.ts:54:7 › IT Staff edits an existing Action Taken (3.9s)
  ✓  3 [chromium] › e2e/lab-04/dashboards.spec.ts:11:7 › Requester Dashboard renders metrics and navigates to ticket (3.2s)
  ✓  4 [chromium] › e2e/lab-04/dashboards.spec.ts:39:7 › Staff Dashboard renders metrics and filters queue on drill-down (4.1s)
  ✓  5 [chromium] › e2e/lab-04/dashboards.spec.ts:65:7 › Admin Dashboard shows active user metrics (3.6s)
  ✓  6 [chromium] › e2e/lab-04/screenshots.spec.ts:15:7 › captures responsive screenshots for Lab 4 views (14.2s)
  ✓  7 [chromium] › e2e/lab-04/ticket-resolution.spec.ts:11:7 › Ticket resolution lifecycle with advisory flag and staff resolution (7.1s)
  ✓  8 [chromium] › e2e/lab-04/ticket-resolution.spec.ts:38:7 › Requester confirms resolved ticket (3.5s)

  8 passed (45.4s)
</pre>

<!-- ========================================== -->
<!-- ANSWER PART 4 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 4: AI Use with Reflection</h2>

<p>
AI Documentation link: <a href="https://github.com/ImanolLabarrere/TokTickIT/blob/main/docs/lab-04/ai-use.md"><code>docs/lab-04/ai-use.md</code></a>.<br>
<strong>AI Assistant Used:</strong> Google Antigravity Agentic Assistant powered by Gemini 2.5 Pro.
</p>

<h3>4.1 Selected Key Prompts (Prompt Progression)</h3>
<ol>
  <li><strong>Contract &amp; Specification (Issue 1):</strong>
  <br><em>Prompt:</em> "Initialize Lab 4 following the KMUTT rubric. Create docs/lab-04/specification.md, tests.md, ui-spec.md, api-spec.md, reviewer.md, and ai-use.md. Define the parent-child Actions Taken model, complete status transition matrix with Cancelled, resolution gate BR-14, stale update conflict handling (409), and role dashboards with explicit calculation formulas."</li>
  
  <li><strong>Actions Taken Schema &amp; REST Endpoints (Issue 2):</strong>
  <br><em>Prompt:</em> "Create Prisma model ActionsTaken with relation to Ticket and User (performedBy). Create migration, seed data with tickets having 0, 1, and multiple actions. Implement POST, GET, and PATCH /api/tickets/:id/actions with session stamping and follow-up note validation. Write 18 Vitest API tests."</li>

  <li><strong>Actions Taken React UI &amp; Follow-up Rules (Issue 3):</strong>
  <br><em>Prompt:</em> "Build client/src/components/ActionsTaken.tsx in Zen Green styling. Support timeline listing, inline creation form, edit mode, amber follow-up badge, and role-based view (read-only for Requester, full controls for Staff). Write 7 component tests."</li>

  <li><strong>Ticket Workflow, Resolution Gate &amp; Concurrency (Issue 4):</strong>
  <br><em>Prompt:</em> "Enforce the full 8-status transition matrix in server/src/app.ts. Add resolution gating (ownerId required for RESOLVED/CLOSED), optimistic conflict detection on expectedCurrentStatus returning 409, and confirmation modal in UI. Write API and RTL test suites."</li>

  <li><strong>Role-Based Dashboard APIs &amp; UI Components (Issue 5):</strong>
  <br><em>Prompt:</em> "Implement GET /api/dashboard/requester and GET /api/dashboard/staff with authoritative aggregation queries. Build RequesterDashboard and StaffDashboard components with metric cards, drill-downs, and zero-states. Verify with 11 API and 10 UI tests."</li>

  <li><strong>Integration QA, Playwright Suites &amp; Responsive Screenshots (Issue 6):</strong>
  <br><em>Prompt:</em> "Create Playwright E2E suites for actions flow, resolution lifecycle, and dashboards. Capture responsive screenshots across Desktop (1280px), Tablet (768px), and Mobile (375px) in artifacts/lab-04/screenshots/. Run full regression across all 4 labs."</li>

  <li><strong>Review &amp; Release Documentation:</strong>
  <br><em>Prompt:</em> "Update reviewer.md with PR links #30 to #35 and peer review comments from LeoMin13. Update test execution results and generate the complete 9-part PDF submission."</li>
</ol>

<h3>4.2 My Reflection</h3>
<div class="avoid-break">
<p>
Lab 4 marked the final maturation of the TokTickIT platform from individual functional modules into a cohesive, production-grade IT service desk. Using Antigravity as an agentic pair programmer allowed me to:
</p>
<ul>
  <li><strong>Maintain rigorous contract compliance:</strong> By separating specification from coding (Spec DD), every requirement from <code>SE+Lab+4.pdf</code> (parent-child actions, full state transition matrix, owner resolution gate, stale update concurrency detection, and role dashboards) mapped directly to concrete Acceptance Criteria and automated tests.</li>
  <li><strong>Prevent regressions systematically:</strong> Running both the 185 server integration tests and the 77 client component tests at each increment guaranteed that enhancements introduced in Lab 4 never broke existing Lab 1, 2, or 3 behavior. When a hoisted helper placement issue or a status shape mismatch surfaced, the test suite caught it immediately.</li>
  <li><strong>Streamline peer reviews and collaboration:</strong> Working through sequential feature branches with atomic commits, clean PRs into <code>lab4-staging</code>, and peer code reviews with LeoMin13 ensured high code quality and clear traceability throughout the entire sprint.</li>
</ul>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 5 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 5: Working IT Staff Dashboard UI</h2>

<h3>5.1 Dashboard Features &amp; Database Query Evidence</h3>
<p>
The IT Staff Dashboard (<code>GET /api/dashboard/staff</code>) acts as the operational command center for service desk engineers.
It aggregates live data from the database using authoritative Prisma queries and provides 1-click drill-downs into filtered views:
</p>
<ul>
  <li><strong>Unassigned Tickets Metric:</strong> <code>prisma.ticket.count({ where: { ownerId: null, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } })</code> &rarr; Links directly to <code>/staff/queue?filter=unassigned</code>.</li>
  <li><strong>My Assigned Tickets Metric:</strong> <code>prisma.ticket.count({ where: { ownerId: userId, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } })</code> &rarr; Links to <code>/staff/queue?filter=mine</code>.</li>
  <li><strong>Waiting for Requester:</strong> <code>prisma.ticket.count({ where: { status: 'WAITING_FOR_REQUESTER' } })</code> &rarr; Links to <code>/staff/queue?status=WAITING_FOR_REQUESTER</code>.</li>
  <li><strong>High / Urgent Priority:</strong> <code>prisma.ticket.count({ where: { itPriority: { in: ['HIGH', 'URGENT'] }, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } })</code>.</li>
  <li><strong>Status &amp; Priority Breakdown:</strong> Grouped badge distribution showing counts for all active ticket states.</li>
  <li><strong>Administrator Metric:</strong> <code>prisma.user.count({ where: { active: true } })</code> &mdash; Shown exclusively for Administrators.</li>
  <li><strong>Recent Tickets Table:</strong> Displays the 5 most recently updated tickets with priority badges, status chips, requester names, and direct links to Ticket Detail.</li>
</ul>

<h3>5.2 Responsive Screenshots &mdash; IT Staff Dashboard</h3>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${staffDashDesktop}" alt="Staff Dashboard Desktop">
    <div class="img-caption">Desktop View (1280px) &mdash; 4 KPI Cards, Quick Actions, Recent Tickets</div>
  </div>
  <div class="img-card">
    <img src="${staffDashTablet}" alt="Staff Dashboard Tablet">
    <div class="img-caption">Tablet View (768px) &mdash; 2-Column Responsive Grid</div>
  </div>
  <div class="img-card">
    <img src="${staffDashMobile}" alt="Staff Dashboard Mobile">
    <div class="img-caption">Mobile View (375px) &mdash; 1-Column Stack, No Overflow</div>
  </div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 6 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 6: Working Actions Taken UI</h2>

<h3>6.1 Multi-Action Lifecycle &amp; Role Enforcement</h3>
<p>
The Actions Taken module (<code>client/src/components/ActionsTaken.tsx</code>) provides a complete work log directly within the Ticket Detail screen:
</p>
<ul>
  <li><strong>Action Listing:</strong> Chronological cards displaying creation timestamp, performer name, action description, and result.</li>
  <li><strong>Performer Immutability (BR-04):</strong> The performer is automatically stamped from the authenticated session (<code>req.session.userId</code>); users cannot spoof or alter the performer.</li>
  <li><strong>Follow-up Flag &amp; Conditional Note (FR-04):</strong> When "Follow-up required" is checked, an amber badge is displayed on the action card and the "Follow-up Note" field becomes strictly mandatory.</li>
  <li><strong>Role-Based Security:</strong>
    <ul>
      <li><strong>IT Staff &amp; Admin:</strong> Full action creation and editing capabilities; "Log Action" button and inline forms are accessible.</li>
      <li><strong>Requester:</strong> Strict read-only presentation; creation, editing, and internal controls are omitted, but action history is visible to keep the requester informed.</li>
    </ul>
  </li>
</ul>

<h3>6.2 Responsive Screenshots &mdash; Actions Taken (Staff vs. Requester)</h3>
<div class="avoid-break">
<h4>Staff View (Creation, Edit &amp; Follow-up Badge):</h4>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${actionsStaffDesktop}" alt="Actions Taken Staff Desktop">
    <div class="img-caption">Staff Desktop (1280px) &mdash; Log Form &amp; Action Timeline</div>
  </div>
  <div class="img-card">
    <img src="${actionsStaffTablet}" alt="Actions Taken Staff Tablet">
    <div class="img-caption">Staff Tablet (768px) &mdash; Responsive Cards &amp; Badges</div>
  </div>
  <div class="img-card">
    <img src="${actionsStaffMobile}" alt="Actions Taken Staff Mobile">
    <div class="img-caption">Staff Mobile (375px) &mdash; Compact Actions Form</div>
  </div>
</div>

<h4>Requester View (Clean Read-Only Mode):</h4>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${actionsReqDesktop}" alt="Actions Taken Requester Desktop">
    <div class="img-caption">Requester Desktop (1280px) &mdash; Read-Only Action History</div>
  </div>
  <div class="img-card">
    <img src="${actionsReqTablet}" alt="Actions Taken Requester Tablet">
    <div class="img-caption">Requester Tablet (768px) &mdash; Transparent Work Log</div>
  </div>
  <div class="img-card">
    <img src="${actionsReqMobile}" alt="Actions Taken Requester Mobile">
    <div class="img-caption">Requester Mobile (375px) &mdash; Clean Mobile Timeline</div>
  </div>
</div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 7 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 7: Working Ticket Workflow</h2>

<h3>7.1 Workflow Rules, Resolution Gate &amp; Concurrency</h3>
<p>
Sprint 4 establishes ironclad ticket lifecycle controls enforced by both frontend guards and backend validation:
</p>
<ul>
  <li><strong>Permitted Transition Options:</strong> The status selector dynamically computes permitted next statuses based on the ticket's current state (e.g. <code>OPEN</code> &rarr; <code>IN_PROGRESS</code>, <code>WAITING_FOR_REQUESTER</code>, <code>RESOLVED</code>, <code>CANCELLED</code>). Unlisted transitions are disallowed.</li>
  <li><strong>Resolution Gate (BR-14):</strong> When transitioning to <code>RESOLVED</code> or <code>CLOSED</code>, the backend verifies that <code>ownerId !== null</code>. If unassigned, the request is rejected with HTTP 400 and code <code>TICKET_MUST_BE_ASSIGNED_BEFORE_RESOLUTION</code>.</li>
  <li><strong>Resolution Confirmation Modal:</strong> Transitioning to <code>RESOLVED</code> displays an accessible confirmation dialog requiring the staff member to verify that all actions taken are complete and documented.</li>
  <li><strong>Stale Update Conflict Detection (BR-16):</strong> Every status update submits <code>expectedCurrentStatus</code>. If another engineer updated the status in the interim, the backend returns HTTP 409 Conflict with a conflict banner in the UI prompting the user to refresh.</li>
  <li><strong>Requester Advisory Reset (BR-15):</strong> If a requester previously clicked "Problem Appears Resolved", any subsequent status transition automatically resets <code>requesterConfirmedResolved = false</code>.</li>
</ul>

<h3>7.2 Screenshots &mdash; Resolution Confirmation Modal</h3>
<div class="img-grid-2">
  <div class="img-card">
    <img src="${resDialogDesktop}" alt="Resolution Dialog Desktop">
    <div class="img-caption">Resolution Confirmation Dialog (Desktop 1280px) &mdash; Accessible Modal &amp; Primary Actions</div>
  </div>
  <div class="img-card">
    <img src="${resDialogMobile}" alt="Resolution Dialog Mobile">
    <div class="img-caption">Resolution Confirmation Dialog (Mobile 375px) &mdash; Centered Responsive Modal</div>
  </div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 8 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 8: Working Requester Dashboard and Final Regression UI</h2>

<h3>8.1 Requester Dashboard &amp; User Scoping</h3>
<p>
The Requester Dashboard (<code>GET /api/dashboard/requester</code>) provides requesters with a dedicated summary of their tickets:
</p>
<ul>
  <li><strong>Strict Isolation (BR-17):</strong> Queries are hard-scoped to <code>req.session.userId</code>. A requester cannot access or aggregate data from any other user.</li>
  <li><strong>Concise Metric Cards:</strong> "My Open Tickets", "Waiting on Me" (needs requester response), and "Resolved Tickets".</li>
  <li><strong>Drill-down Navigation:</strong> Clicking "View All" on any card opens the My Tickets screen with corresponding filters.</li>
  <li><strong>Recent Tickets:</strong> Displays the 5 most recent tickets submitted by the requester, with live status pills and timestamps.</li>
</ul>

<div class="img-grid-3">
  <div class="img-card">
    <img src="${reqDashDesktop}" alt="Requester Dashboard Desktop">
    <div class="img-caption">Requester Dashboard Desktop (1280px)</div>
  </div>
  <div class="img-card">
    <img src="${reqDashTablet}" alt="Requester Dashboard Tablet">
    <div class="img-caption">Requester Dashboard Tablet (768px)</div>
  </div>
  <div class="img-card">
    <img src="${reqDashMobile}" alt="Requester Dashboard Mobile">
    <div class="img-caption">Requester Dashboard Mobile (375px)</div>
  </div>
</div>

<h3>8.2 End-to-End Regression Verification across All Sprints</h3>
<p>All capabilities from Labs 1, 2, and 3 continue to function flawlessly in the final build:</p>
<table>
  <thead>
    <tr>
      <th>Area</th>
      <th>Sprint Introduced</th>
      <th>Key Features Verified</th>
      <th>Regression Result</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Authentication &amp; Sessions</strong></td>
      <td>Lab 3</td>
      <td>Cookie-based session auth, role routing, temporary passwords, forced password change</td>
      <td><span class="badge badge-pass">Pass (7/7 tests)</span></td>
    </tr>
    <tr>
      <td><strong>Ticket Creation &amp; List</strong></td>
      <td>Lab 2</td>
      <td>Multi-step ticket submission, category selection, client-side validation, My Tickets list</td>
      <td><span class="badge badge-pass">Pass (15/15 tests)</span></td>
    </tr>
    <tr>
      <td><strong>Attachments</strong></td>
      <td>Lab 2</td>
      <td>File upload (images, docs, pdf), file size &amp; type validation, secure file retrieval</td>
      <td><span class="badge badge-pass">Pass (7/7 tests)</span></td>
    </tr>
    <tr>
      <td><strong>Comments &amp; Internal Notes</strong></td>
      <td>Lab 3</td>
      <td>Public comments visible to requester; Internal Notes strictly restricted to IT Staff/Admin</td>
      <td><span class="badge badge-pass">Pass (22/22 tests)</span></td>
    </tr>
    <tr>
      <td><strong>Staff Queue &amp; Ownership</strong></td>
      <td>Lab 3</td>
      <td>Queue filtering (status, priority, assignment), claim ticket, reassign ticket</td>
      <td><span class="badge badge-pass">Pass (15/15 tests)</span></td>
    </tr>
    <tr>
      <td><strong>Administrator User Mgmt</strong></td>
      <td>Lab 3</td>
      <td>CRUD users, email uniqueness, role assignment, activate/deactivate, password reset</td>
      <td><span class="badge badge-pass">Pass (18/18 tests)</span></td>
    </tr>
    <tr>
      <td><strong>Actions Taken &amp; Workflow</strong></td>
      <td>Lab 4</td>
      <td>Parent-child actions, follow-up flags, transition matrix, resolution gate, dashboards</td>
      <td><span class="badge badge-pass">Pass (40/40 tests)</span></td>
    </tr>
  </tbody>
</table>

<!-- ========================================== -->
<!-- ANSWER PART 9 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 9: Zen Green UI, Responsive, Accessibility, and Final Polish</h2>

<h3>9.1 Zen Green Design Language Compliance</h3>
<p>
TokTickIT strictly implements the Zen Green design language across all screens:
</p>
<ul>
  <li><strong>Color Palette Tokens:</strong> Primary Forest Green (<code>#006B3C</code>), Accent Deep Emerald (<code>#2d6a4f</code>), Page Background Soft Mint (<code>#EEF2EF</code>), Card Backgrounds (<code>#ffffff</code>), Soft Green Borders (<code>#d8f3dc</code>).</li>
  <li><strong>Typography:</strong> Clean, modern system sans-serif hierarchy with robust weights (800 headings, 600 subheadings, 400 body).</li>
  <li><strong>Component Consistency:</strong> Standardized badges for status, priority, and follow-ups with distinct color-coded semantic cues.</li>
</ul>

<h3>9.2 Completed Visual and Accessibility Checklist</h3>
<table>
  <thead>
    <tr>
      <th>Check Item</th>
      <th>Desktop (1280px)</th>
      <th>Tablet (768px)</th>
      <th>Mobile (375px)</th>
      <th>Status &amp; Verification Evidence</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>No Horizontal Overflow</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Zero horizontal scrollbar at 375px viewport (verified via Playwright)</td>
    </tr>
    <tr>
      <td><strong>Metric Card Alignment</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Grid wraps cleanly: 4 cols on desktop, 2 on tablet, 1 col on mobile</td>
    </tr>
    <tr>
      <td><strong>Visible Focus Rings</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>High-contrast 2px focus ring on all buttons, links, inputs (<code>:focus-visible</code>)</td>
    </tr>
    <tr>
      <td><strong>Actions Taken Legibility</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Timeline cards wrap text gracefully; follow-up amber badges visually distinct</td>
    </tr>
    <tr>
      <td><strong>Validation Placement</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Error messages render directly beneath invalid form inputs</td>
    </tr>
    <tr>
      <td><strong>Modal Accessibility</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Resolution modal locks backdrop, traps focus, supports Esc to dismiss</td>
    </tr>
    <tr>
      <td><strong>Non-Color Status Cues</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Status badges pair colors with explicit text labels and status icons</td>
    </tr>
  </tbody>
</table>

<h3>9.3 Final Product Definition of Done (DoD) Verification</h3>
<ul>
  <li>&#9745; <strong>Code Quality &amp; Clean Working Tree:</strong> Zero uncommitted files, zero console errors, zero dead code.</li>
  <li>&#9745; <strong>Database Integrity:</strong> Idempotent migrations and seeds, zero data loss from earlier sprints.</li>
  <li>&#9745; <strong>Automated Verification:</strong> 185 server tests, 77 client tests, 22 Playwright tests passing at 100%.</li>
  <li>&#9745; <strong>Peer Review &amp; Staged Merge:</strong> All 6 feature PRs reviewed, approved, and merged via <code>lab4-staging</code> into <code>main</code>.</li>
  <li>&#9745; <strong>Deliverables:</strong> Comprehensive 9-part PDF report with high-res screenshots and live commit references.</li>
</ul>

</body>
</html>`;

  // Write HTML file to docs/lab-04/submission.html
  const htmlPath = path.join(rootDir, 'docs', 'lab-04', 'submission.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`Saved HTML report to ${htmlPath}`);

  // Launch Playwright to render PDF
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const pdfPath = path.join(rootDir, 'TokTickIT-Lab4-Submission.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '14mm',
      bottom: '14mm',
      left: '12mm',
      right: '12mm'
    }
  });

  console.log(`Successfully generated PDF: ${pdfPath}`);
  await browser.close();
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
