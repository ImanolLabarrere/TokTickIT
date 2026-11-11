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

async function generateLab3Pdf() {
  console.log('Generating Lab 3 Submission PDF...');

  // Authentication screenshots
  const loginDesktop = toBase64Image('artifacts/lab-03/screenshots/authentication/login-desktop.png');
  const loginTablet = toBase64Image('artifacts/lab-03/screenshots/authentication/login-tablet.png');
  const loginMobile = toBase64Image('artifacts/lab-03/screenshots/authentication/login-mobile.png');

  const changePwdDesktop = toBase64Image('artifacts/lab-03/screenshots/authentication/change-password-desktop.png');
  const changePwdTablet = toBase64Image('artifacts/lab-03/screenshots/authentication/change-password-tablet.png');
  const changePwdMobile = toBase64Image('artifacts/lab-03/screenshots/authentication/change-password-mobile.png');

  // Staff Queue screenshots
  const staffQueueDesktop = toBase64Image('artifacts/lab-03/screenshots/staff-queue/desktop.png');
  const staffQueueTablet = toBase64Image('artifacts/lab-03/screenshots/staff-queue/tablet.png');
  const staffQueueMobile = toBase64Image('artifacts/lab-03/screenshots/staff-queue/mobile.png');

  // Staff Ticket Detail screenshots
  const staffDetailDesktop = toBase64Image('artifacts/lab-03/screenshots/staff-ticket-detail/desktop.png');
  const staffDetailTablet = toBase64Image('artifacts/lab-03/screenshots/staff-ticket-detail/tablet.png');
  const staffDetailMobile = toBase64Image('artifacts/lab-03/screenshots/staff-ticket-detail/mobile.png');

  // User Management screenshots
  const userMgmtDesktop = toBase64Image('artifacts/lab-03/screenshots/user-management/desktop.png');
  const userMgmtTablet = toBase64Image('artifacts/lab-03/screenshots/user-management/tablet.png');
  const userMgmtMobile = toBase64Image('artifacts/lab-03/screenshots/user-management/mobile.png');

  const userCreateDesktop = toBase64Image('artifacts/lab-03/screenshots/user-management/desktop-create.png');
  const userCreateTablet = toBase64Image('artifacts/lab-03/screenshots/user-management/tablet-create.png');
  const userCreateMobile = toBase64Image('artifacts/lab-03/screenshots/user-management/mobile-create.png');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TokTickIT Lab 3 - Users, Roles, IT Staff Ticketing, and Admin Screens</title>
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

  .kanban-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 10px 0 14px 0;
    page-break-inside: avoid;
  }

  .kanban-col {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
  }

  .kanban-header {
    font-weight: 700;
    font-size: 8.5pt;
    padding-bottom: 6px;
    border-bottom: 2px solid #cbd5e1;
    margin-bottom: 6px;
    text-transform: uppercase;
    color: #475569;
  }

  .kanban-col.done .kanban-header {
    border-bottom-color: #006B3C;
    color: #006B3C;
  }

  .kanban-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 6px;
    margin-bottom: 6px;
    font-size: 7.5pt;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .kanban-card .tag {
    font-weight: 700;
    color: #006B3C;
  }

  .img-grid-3 {
    display: grid;
    grid-template-columns: 2fr 1.3fr 0.9fr;
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
  <h1>TokTickIT &mdash; Lab 3 Submission Report</h1>
  <div class="subtitle">Users, Roles, IT Staff Ticketing, and Admin Screens</div>
  <div class="meta-grid">
    <div><strong>Student:</strong> Imanol LABARRERE (ID: 69540460013)</div>
    <div><strong>Course:</strong> CPE 334 Introduction to Software Engineering</div>
    <div><strong>GitHub Repository:</strong> <a href="https://github.com/ImanolLabarrere/TokTickIT">ImanolLabarrere/TokTickIT</a></div>
    <div><strong>Peer Reviewers:</strong> Léo LEPOUTRE (LeoMin13), Matos07</div>
    <div><strong>Branch Integration:</strong> <code>feature/*</code> &rarr; <code>lab3-staging</code> &rarr; <code>main</code></div>
    <div><strong>Total Test Coverage:</strong> 145 Server (100%) &bull; 55 Client (100%) &bull; 14 E2E (100%)</div>
  </div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 1 -->
<!-- ========================================== -->
<h2 class="answer-title">Answer Part 1: Git Use with Engineering Workflow</h2>

<h3>1.1 Staged Integration &amp; Pull Requests Table</h3>
<p>
Sprint 3 established role-based authorization, IT Staff workflows, and Administrator user management. All planned issues were developed on feature branches, reviewed, and integrated via Pull Requests into <code>lab3-staging</code> and <code>main</code>:
</p>

<table>
  <thead>
    <tr>
      <th>Issue</th>
      <th>Branch Name</th>
      <th>PR Link</th>
      <th>Reviewer</th>
      <th>Scope Delivered</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>#1</td>
      <td><code>lab3-staging</code> (direct)</td>
      <td><em>Workflow deviation (see 1.4)</em></td>
      <td>LeoMin13</td>
      <td>Sprint 3 engineering specification, authorization matrix, tests.md, ui-spec.md, api-spec.md</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#2</td>
      <td><code>feature/2-auth-foundation</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/25">PR #25</a></td>
      <td>LeoMin13</td>
      <td>User Prisma migration, password hashing (bcryptjs), login/logout, session auth, first password change</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#3</td>
      <td><code>feature/3-requester-regression</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/26">PR #26</a></td>
      <td>LeoMin13</td>
      <td>Session-based Requester scoping, Public Comments, "Problem Appears Resolved" flag, Lab 2 regression tests</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#4</td>
      <td><code>feature/4-staff-queue</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/27">PR #27</a></td>
      <td>LeoMin13</td>
      <td>IT Staff Ticket Queue API &amp; UI, multi-criteria filters, search, sort, pagination, status chips</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#5</td>
      <td><code>feature/5-staff-ticket-detail</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/28">PR #28</a></td>
      <td>LeoMin13</td>
      <td>Staff Ticket Detail: claim, reassign, IT Priority, status transitions, Public Comments vs Internal Notes</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#6</td>
      <td><code>feature/6-admin-users</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/24">PR #24</a> / <code>lab3-staging</code></td>
      <td>LeoMin13</td>
      <td>User Management: list, search, filter, create user, duplicate email validation, self-deactivation guard</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
    <tr>
      <td>#7</td>
      <td><code>feature/7-integration-qa</code></td>
      <td><a href="https://github.com/ImanolLabarrere/TokTickIT/pull/29">PR #29</a></td>
      <td>LeoMin13</td>
      <td>End-to-end Playwright suites (auth, staff flow, admin), 18 responsive screenshots, final docs</td>
      <td><span class="badge badge-pass">Merged</span></td>
    </tr>
  </tbody>
</table>

<h3>1.2 Final GitHub Project Kanban Board (All Issues in Done)</h3>
<div class="kanban-board">
  <div class="kanban-col">
    <div class="kanban-header">Backlog (0)</div>
    <div style="font-size: 7pt; color: #94a3b8; text-align: center; padding: 12px 0;">All items completed</div>
  </div>
  <div class="kanban-col">
    <div class="kanban-header">Ready (0)</div>
    <div style="font-size: 7pt; color: #94a3b8; text-align: center; padding: 12px 0;">Empty</div>
  </div>
  <div class="kanban-col">
    <div class="kanban-header">In Progress (0)</div>
    <div style="font-size: 7pt; color: #94a3b8; text-align: center; padding: 12px 0;">Empty</div>
  </div>
  <div class="kanban-col done">
    <div class="kanban-header">Done (7) &#10004;</div>
    <div class="kanban-card"><span class="tag">#1</span> Sprint 3 Engineering Contract</div>
    <div class="kanban-card"><span class="tag">#2</span> Auth Foundation &amp; User Model</div>
    <div class="kanban-card"><span class="tag">#3</span> Requester Regression &amp; Comments</div>
    <div class="kanban-card"><span class="tag">#4</span> IT Staff Ticket Queue</div>
    <div class="kanban-card"><span class="tag">#5</span> Staff Ticket Detail &amp; Notes</div>
    <div class="kanban-card"><span class="tag">#6</span> Administrator User Management</div>
    <div class="kanban-card"><span class="tag">#7</span> Integration QA &amp; Playwright E2E</div>
  </div>
</div>

<h3>1.3 Git Commit History Graph</h3>
<pre>
*   68aa2ad Merge pull request #29 from ImanolLabarrere/feature/7-integration-qa
|\  
| * 63bf592 test: E2E flows, authorization matrix, responsive screenshots, final docs (Issue 7)
| *   61a2248 chore: bring lab3-staging up to date with main (Issues 3, 5, 6)
| |\  
| |/  
|/|   
* |   891b6f3 Merge pull request #28 from ImanolLabarrere/feature/5-staff-ticket-detail
|\ \  
| * | 1e7612d feat: IT Staff ticket detail, claim/reassign, IT Priority, status transitions, internal notes (Issue 5)
* | |   fd9a099 Merge pull request #26 from ImanolLabarrere/feature/3-requester-regression
|\ \ \  
| * | | 9f7ad8b test: fix client tests for session auth, comments and resolved flow (Issue 3)
* | | |   997075a Merge pull request #24 from ImanolLabarrere/lab3-staging
|\ \ \ \  
* \ \ \ \   c22df2f Merge pull request #23 from ImanolLabarrere/lab3-staging
|\ \ \ \ \  
| | | | | *   51d5a5c Merge pull request #27 from ImanolLabarrere/feature/4-staff-queue
| | | | | |\  
| | | | | |/  
| | | | |/|   
| | | | * | a1f71c3 feat: IT Staff ticket queue, role-aware navigation, staff migration and seed (Issue 4)
| | | |/ /  
| | | * / 44f65fe feat: session-based ticket ownership, Public Comments, Problem Appears Resolved (Issue 3)
| | | |/  
| | * 7de3687 Merge pull request #25 from ImanolLabarrere/feature/2-auth-foundation
</pre>

<h3>1.4 Peer Review Record &amp; Workflow Deviations</h3>
<p>
Peer reviews were conducted with Léo LEPOUTRE (<code>LeoMin13</code>). Two minor process deviations occurred and were transparently recorded in <code>docs/lab-03/reviewer.md</code> and <code>ai-use.md</code>:
</p>
<ol>
  <li><strong>Issue 1 (Specification):</strong> Committed directly to <code>lab3-staging</code> without an intermediate PR.</li>
  <li><strong>Issues 3, 5, and 6:</strong> Merged directly into <code>main</code> due to GitHub default target proposal. This was cleanly resolved before Issue 7 by merging <code>main</code> back into <code>lab3-staging</code> (commit <code>61a2248</code>) to maintain strict linear history.</li>
</ol>
<p>
<strong>Clean Repository Structure:</strong> Standardized multi-tier layout separating <code>docs/lab-03/</code>, <code>server/tests/lab-03/</code>, <code>client/tests/lab-03/</code>, <code>e2e/lab-03/</code>, and <code>artifacts/lab-03/screenshots/</code>. <code>.gitignore</code> prevents test artifacts, SQLite binaries, node_modules, and session secrets from entering version control.
</p>

<!-- ========================================== -->
<!-- ANSWER PART 2 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 2: Spec DD (Specification-Driven Development)</h2>

<p>
Specification link: <a href="https://github.com/ImanolLabarrere/TokTickIT/blob/main/docs/lab-03/specification.md"><code>docs/lab-03/specification.md</code></a>.
Written upfront as Issue 1 before implementation began.
</p>

<h3>2.1 Sprint Goal &amp; Stakeholder Interpretation</h3>
<p>
<strong>Sprint Goal:</strong> Replace the development requester selector with secure email/password authentication, implement session-based identity across all routes, introduce operational IT Staff ticketing workflows (queue, claim/reassign, priority, status transitions, public comments, internal notes), and add a minimalist Administrator screen for user account management.
</p>
<p>
<strong>Stakeholder Interpretation:</strong> Move from an unauthenticated prototype to a secure multi-role system where Requesters, IT Staff, and Administrators operate with distinct, server-enforced boundaries. Server-side validation must be authoritative; hiding UI buttons does not constitute authorization.
</p>

<h3>2.2 Functional Requirements (FR-01 to FR-12)</h3>
<ul>
  <li><strong>FR-01: Authentication</strong> &mdash; Authenticate with email and password, establishing an HTTP-only session cookie.</li>
  <li><strong>FR-02: Mandatory Password Change</strong> &mdash; Users with <code>mustChangePassword = true</code> cannot reach normal screens until a valid password is saved.</li>
  <li><strong>FR-03: Current User &amp; Logout</strong> &mdash; <code>GET /api/auth/me</code> returns session info; <code>POST /api/auth/logout</code> invalidates session.</li>
  <li><strong>FR-04: Session-Based Requester Scoping</strong> &mdash; All ticket/attachment endpoints authorize using <code>req.session.userId</code>.</li>
  <li><strong>FR-05: Requester Comments &amp; Advisory Flag</strong> &mdash; Requesters can post Public Comments and mark "Problem Appears Resolved".</li>
  <li><strong>FR-06: IT Staff Ticket Queue</strong> &mdash; Paginated, searchable, filterable, and sortable queue covering all system tickets.</li>
  <li><strong>FR-07: Claim &amp; Reassign</strong> &mdash; IT Staff can claim unassigned tickets or reassign ownership to another active IT Staff member.</li>
  <li><strong>FR-08: IT Priority &amp; Status Transitions</strong> &mdash; IT Staff can adjust IT Priority and execute permitted status transitions.</li>
  <li><strong>FR-09: Public Comments vs Internal Notes</strong> &mdash; Public Comments shared with requester; Internal Notes restricted to IT Staff/Admin.</li>
  <li><strong>FR-10: Administrator User Management</strong> &mdash; List, search, role-filter, create user, edit details, and reset initial password.</li>
  <li><strong>FR-11: Administrator Safety Guards</strong> &mdash; Prevent self-deactivation and prevent removal of the last active Administrator.</li>
  <li><strong>FR-12: Role-Aware App Shell</strong> &mdash; Header dynamically displays authenticated user, role badge, and role-permitted navigation links.</li>
</ul>

<h3>2.3 Server-Side Authorization Matrix</h3>
<table>
  <thead>
    <tr>
      <th>Endpoint</th>
      <th>Method</th>
      <th>Anonymous</th>
      <th>Requester</th>
      <th>IT Staff</th>
      <th>Administrator</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>/api/auth/login</code></td>
      <td>POST</td>
      <td>200 OK</td>
      <td>200 OK</td>
      <td>200 OK</td>
      <td>200 OK</td>
    </tr>
    <tr>
      <td><code>/api/auth/me</code></td>
      <td>GET</td>
      <td>401 Unauthorized</td>
      <td>200 OK</td>
      <td>200 OK</td>
      <td>200 OK</td>
    </tr>
    <tr>
      <td><code>/api/tickets</code></td>
      <td>GET</td>
      <td>401 Unauthorized</td>
      <td>200 (Scoped)</td>
      <td>403 Forbidden</td>
      <td>403 Forbidden</td>
    </tr>
    <tr>
      <td><code>/api/staff/queue</code></td>
      <td>GET</td>
      <td>401 Unauthorized</td>
      <td>403 Forbidden</td>
      <td>200 OK</td>
      <td>403 Forbidden</td>
    </tr>
    <tr>
      <td><code>/api/staff/tickets/:id/claim</code></td>
      <td>POST</td>
      <td>401 Unauthorized</td>
      <td>403 Forbidden</td>
      <td>200 OK</td>
      <td>200 OK</td>
    </tr>
    <tr>
      <td><code>/api/staff/tickets/:id/notes</code></td>
      <td>POST</td>
      <td>401 Unauthorized</td>
      <td>403 Forbidden</td>
      <td>200 OK</td>
      <td>200 OK</td>
    </tr>
    <tr>
      <td><code>/api/admin/users</code></td>
      <td>GET / POST</td>
      <td>401 Unauthorized</td>
      <td>403 Forbidden</td>
      <td>403 Forbidden</td>
      <td>200 OK</td>
    </tr>
  </tbody>
</table>

<!-- ========================================== -->
<!-- ANSWER PART 3 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 3: Test DD and Traceability</h2>

<p>
Test plan specification link: <a href="https://github.com/ImanolLabarrere/TokTickIT/blob/main/docs/lab-03/tests.md"><code>docs/lab-03/tests.md</code></a>.
All 18 Acceptance Criteria map directly to automated suites passing at 100%.
</p>

<h3>3.1 Acceptance Criteria Traceability Matrix</h3>
<table>
  <thead>
    <tr>
      <th>Test ID</th>
      <th>Type</th>
      <th>AC / FR</th>
      <th>Verification Scope</th>
      <th>Test File Path</th>
      <th>Result</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>API-01</strong></td>
      <td>API</td>
      <td>AC-01, AC-02</td>
      <td>Valid login sets cookie; invalid credentials return generic 401</td>
      <td><code>server/tests/lab-03/auth.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-02</strong></td>
      <td>API</td>
      <td>AC-03</td>
      <td>Inactive account blocked with identical generic 401</td>
      <td><code>server/tests/lab-03/auth.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-03</strong></td>
      <td>API</td>
      <td>AC-04, AC-05</td>
      <td><code>mustChangePassword</code> blocks protected routes; clears on valid change</td>
      <td><code>server/tests/lab-03/auth.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-04</strong></td>
      <td>API</td>
      <td>AC-16</td>
      <td>Logout invalidates session; subsequent calls return 401</td>
      <td><code>server/tests/lab-03/auth.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-05</strong></td>
      <td>API</td>
      <td>AC-06, AC-07</td>
      <td>Client <code>requesterId</code> ignored; cross-Requester ticket access returns 404</td>
      <td><code>server/tests/lab-03/authorization.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-06</strong></td>
      <td>API</td>
      <td>AC-08, AC-15</td>
      <td>Authorization matrix enforced across 10 endpoints &amp; 4 roles</td>
      <td><code>server/tests/lab-03/authorization.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-07</strong></td>
      <td>API</td>
      <td>FR-06, AC-17</td>
      <td>Staff queue search/filter/sort/pagination; non-staff forbidden</td>
      <td><code>server/tests/lab-03/staff-queue.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-08</strong></td>
      <td>API</td>
      <td>AC-09</td>
      <td>Claim sets owner + NEW &rarr; OPEN; already claimed returns 409</td>
      <td><code>server/tests/lab-03/staff-ticket-detail.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-09</strong></td>
      <td>API</td>
      <td>AC-10</td>
      <td>Only matrix-listed transitions succeed; invalid transitions return 400</td>
      <td><code>server/tests/lab-03/staff-ticket-detail.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-10</strong></td>
      <td>API</td>
      <td>BR-11</td>
      <td>IT Priority copies Requested Priority initially; editable only by staff</td>
      <td><code>server/tests/lab-03/staff-ticket-detail.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-11</strong></td>
      <td>API</td>
      <td>AC-11</td>
      <td><code>requesterConfirmedResolved</code> flag resets on any status change</td>
      <td><code>server/tests/lab-03/staff-ticket-detail.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-12</strong></td>
      <td>API</td>
      <td>BR-15, BR-16</td>
      <td>Public Comments visible to requester; Internal Notes restricted to staff</td>
      <td><code>server/tests/lab-03/staff-ticket-detail.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-13</strong></td>
      <td>API</td>
      <td>AC-12</td>
      <td>Duplicate email (case-insensitive) rejected on create and edit</td>
      <td><code>server/tests/lab-03/admin-users.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-14</strong></td>
      <td>API</td>
      <td>AC-13</td>
      <td>Self-deactivation blocked; deactivated account locked out immediately</td>
      <td><code>server/tests/lab-03/admin-users.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-15</strong></td>
      <td>API</td>
      <td>FR-10</td>
      <td>User list search/filter/paging; password reset invalidates open session</td>
      <td><code>server/tests/lab-03/admin-users.api.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>API-16</strong></td>
      <td>Unit</td>
      <td>AC-14</td>
      <td>Unit test guarding "never remove the last active Administrator"</td>
      <td><code>server/tests/lab-03/admin-safety.unit.test.ts</code></td>
      <td><span class="badge badge-pass">Pass</span></td>
    </tr>
    <tr>
      <td><strong>UI-01..06</strong></td>
      <td>UI</td>
      <td>AC-01..17</td>
      <td>React component tests: Login, ChangePassword, StaffQueue, StaffDetail, Users, Nav</td>
      <td><code>client/tests/lab-03/**</code></td>
      <td><span class="badge badge-pass">Pass (33 tests)</span></td>
    </tr>
    <tr>
      <td><strong>MIG-01..02</strong></td>
      <td>Regr.</td>
      <td>AC-18, DoD</td>
      <td>All Lab 2 Ticket and Attachment tests pass against authenticated sessions</td>
      <td><code>server/tests/lab-02/**</code>, <code>client/tests/lab-02/**</code></td>
      <td><span class="badge badge-pass">Pass (29 tests)</span></td>
    </tr>
    <tr>
      <td><strong>E2E-01..04</strong></td>
      <td>E2E</td>
      <td>DoD</td>
      <td>Playwright suites for Auth, Staff Ticket Lifecycle, Admin Users, and Lab 2 Flows</td>
      <td><code>e2e/lab-03/*.spec.ts</code>, <code>e2e/lab-02/*.spec.ts</code></td>
      <td><span class="badge badge-pass">Pass (14 tests)</span></td>
    </tr>
  </tbody>
</table>

<h3>3.2 Test Results Summary</h3>
<div class="avoid-break">
<pre>
Server Suites:  13 passed (13) &mdash; 145 passed (100%) &bull; Duration: 24.3s
Client Suites:  11 passed (11) &mdash; 55 passed (100%) &bull; Duration: 18.2s
Playwright E2E: 14 passed (14) &mdash; 9 Lab 3 + 5 Lab 2 regression (100%) &bull; Duration: 36.8s
</pre>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 4 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 4: AI Use with Reflection</h2>

<p>
AI Documentation link: <a href="https://github.com/ImanolLabarrere/TokTickIT/blob/main/docs/lab-03/ai-use.md"><code>docs/lab-03/ai-use.md</code></a>.<br>
<strong>AI Assistant Used:</strong> Claude (Anthropic) &amp; Claude 3.5 Sonnet.
</p>

<h3>4.1 Selected Key Prompts (Prompt Progression)</h3>
<ol>
  <li><strong>Specification Definition (Issue 1):</strong>
  <br><em>Prompt:</em> "Read the Lab 3 sheet and prepare the specification, API spec, UI spec, and test plan. Do not write implementation code."</li>

  <li><strong>Authentication Foundation (Issue 2):</strong>
  <br><em>Prompt:</em> "Do Issue 2 and tell me what to ADD, not the whole zip. Use bcryptjs for cross-platform compatibility."</li>

  <li><strong>Migration Error Recovery:</strong>
  <br><em>Prompt:</em> "Prisma migration failure: P3006 / P1014 duplicate table Requester. How to safely consolidate migrations without data loss?"</li>

  <li><strong>Token-Efficient File Delivery:</strong>
  <br><em>Prompt:</em> "Give me only the files that changed to avoid token truncation and copy-paste errors."</li>

  <li><strong>Requester Regression &amp; Public Comments (Issue 3):</strong>
  <br><em>Prompt:</em> "Switch the Lab 2 endpoints to the authenticated session and add Public Comments and Problem Appears Resolved action."</li>

  <li><strong>IT Staff Ticket Queue (Issue 4):</strong>
  <br><em>Prompt:</em> "Implement the IT Staff Ticket Queue with multi-parameter filtering (status, priority, owner), search, and pagination."</li>

  <li><strong>Staff Ticket Detail &amp; Administrator Management (Issues 5 &amp; 6):</strong>
  <br><em>Prompt:</em> "Build Staff Ticket Detail (claim, reassign, priority, internal notes) and User Management (CRUD, self-deactivation guard, last admin guard)."</li>

  <li><strong>Integration QA &amp; Playwright Suites (Issue 7):</strong>
  <br><em>Prompt:</em> "Do the QA and E2E Issue. Migrate Lab 2 Playwright specs to real login and capture responsive screenshots at 3 viewports."</li>
</ol>

<h3>4.2 My Reflection</h3>
<div class="avoid-break">
<p>
<strong>Specification Agent:</strong> Generating the comprehensive specification first (authorization matrix, transition matrix, numbered BR rules, and acceptance criteria) made implementation structured and verifiable. Every test could be traced directly to an Acceptance Criterion. The only flaw was process discipline: Issue 1 was committed directly to staging without an initial PR.
</p>
<p>
<strong>Coding Agent:</strong> The coding agent was fast and made sound architectural choices (server-side authorization, HTTP-only session cookies, no client-supplied IDs). However, it struggled where it could not execute commands directly: migrations, local database nuances, and test executions. Running test suites locally after every single issue was crucial to catching minor test mock discrepancies and ensuring 100% real-world stability.
</p>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 5 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 5: Working Login and Password Change UI</h2>

<h3>5.1 Authentication Features &amp; Security Policy</h3>
<ul>
  <li><strong>Dual-Field Login:</strong> Email and password fields with busy loading state and inline error banner.</li>
  <li><strong>Safe Failure Feedback:</strong> Generic "Invalid email or password" returned for unknown emails, bad passwords, and inactive accounts (BR-01, BR-02), preventing account enumeration attacks.</li>
  <li><strong>Mandatory First Password Change:</strong> Users with <code>mustChangePassword: true</code> are intercepted immediately and redirected to the password change screen before any application data is exposed.</li>
  <li><strong>Password Policy Enforcement:</strong> Minimum 8 characters, at least one letter and one number, and confirmation matching.</li>
  <li><strong>Session Invalidation:</strong> Logout completely clears the session cookie and prevents subsequent back-button navigation.</li>
</ul>

<h3>5.2 Responsive Screenshots &mdash; Login &amp; Password Change</h3>
<div class="avoid-break">
<h4>Login Screen:</h4>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${loginDesktop}" alt="Login Desktop">
    <div class="img-caption">Desktop View (1280px) &mdash; Centered Zen Green Login Card</div>
  </div>
  <div class="img-card">
    <img src="${loginTablet}" alt="Login Tablet">
    <div class="img-caption">Tablet View (768px) &mdash; Form Card &amp; Validation Placement</div>
  </div>
  <div class="img-card">
    <img src="${loginMobile}" alt="Login Mobile">
    <div class="img-caption">Mobile View (375px) &mdash; Full-Width Responsive Inputs</div>
  </div>
</div>

<h4>Change Password Screen (Mandatory First Login):</h4>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${changePwdDesktop}" alt="Change Password Desktop">
    <div class="img-caption">Desktop View (1280px) &mdash; Policy Checklist &amp; Mismatch Check</div>
  </div>
  <div class="img-card">
    <img src="${changePwdTablet}" alt="Change Password Tablet">
    <div class="img-caption">Tablet View (768px) &mdash; Accessible Controls</div>
  </div>
  <div class="img-card">
    <img src="${changePwdMobile}" alt="Change Password Mobile">
    <div class="img-caption">Mobile View (375px) &mdash; Clear Policy Feedback</div>
  </div>
</div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 6 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 6: Working IT Staff Ticket Queue UI</h2>

<h3>6.1 Operational Queue Capabilities</h3>
<ul>
  <li><strong>Search &amp; Multi-Parameter Filters:</strong> Text search across ticket number and summary; dropdown filters for Status, IT Priority, and Ticket Owner.</li>
  <li><strong>Sorting &amp; Pagination:</strong> Sortable table columns with clean server-side pagination metadata (showing range, total count, prev/next controls).</li>
  <li><strong>Status &amp; Priority Badges:</strong> Visual pills using Zen Green color coding paired with text labels for accessibility.</li>
  <li><strong>Clear Ownership Indication:</strong> Assigned staff member name displayed or distinct "Unassigned" chip.</li>
  <li><strong>Empty &amp; No-Results State:</strong> Clean empty state illustration with a "Clear Filters" button when queries match zero tickets.</li>
</ul>

<h3>6.2 Responsive Screenshots &mdash; IT Staff Ticket Queue</h3>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${staffQueueDesktop}" alt="Staff Queue Desktop">
    <div class="img-caption">Desktop View (1280px) &mdash; Full Queue Table with Filters and Pagination</div>
  </div>
  <div class="img-card">
    <img src="${staffQueueTablet}" alt="Staff Queue Tablet">
    <div class="img-caption">Tablet View (768px) &mdash; Compact Table Layout</div>
  </div>
  <div class="img-card">
    <img src="${staffQueueMobile}" alt="Staff Queue Mobile">
    <div class="img-caption">Mobile View (375px) &mdash; Stacked Card Representation (No Horizontal Scroll)</div>
  </div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 7 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 7: Working IT Staff Ticket Detail UI</h2>

<h3>7.1 Operational Actions &amp; Communication Channels</h3>
<ul>
  <li><strong>Atomic Claim:</strong> Unassigned tickets feature a prominent "Claim Ticket" button that assigns the ticket to the current staff user and updates status from <code>NEW</code> to <code>OPEN</code>.</li>
  <li><strong>Reassignment:</strong> Staff can reassign ticket ownership to any active IT Staff member via dropdown.</li>
  <li><strong>Independent IT Priority:</strong> Staff can adjust IT Priority without overwriting the Requester's original Requested Priority.</li>
  <li><strong>Status Transition Controls:</strong> Status dropdown presents only valid transitions per the matrix; invalid requests are blocked with HTTP 400.</li>
  <li><strong>Public Comments vs. Internal Notes:</strong>
    <ul>
      <li><strong>Public Comments:</strong> Shared conversation visible to both Requester and IT Staff (rendered in green card containers).</li>
      <li><strong>Internal Notes:</strong> Private operational notes visible exclusively to IT Staff and Administrators (rendered in distinct amber containers). Requesters attempting to query notes receive 403 Forbidden.</li>
    </ul>
  </li>
  <li><strong>Problem Appears Resolved Flag:</strong> When a requester marks the advisory flag, a banner alerts staff. Resolving the ticket automatically resets the flag.</li>
</ul>

<h3>7.2 Responsive Screenshots &mdash; Staff Ticket Detail</h3>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${staffDetailDesktop}" alt="Staff Detail Desktop">
    <div class="img-caption">Desktop View (1280px) &mdash; Grouped Header, Notes &amp; Comments Tabs</div>
  </div>
  <div class="img-card">
    <img src="${staffDetailTablet}" alt="Staff Detail Tablet">
    <div class="img-caption">Tablet View (768px) &mdash; Responsive Tabs &amp; Form Fields</div>
  </div>
  <div class="img-card">
    <img src="${staffDetailMobile}" alt="Staff Detail Mobile">
    <div class="img-caption">Mobile View (375px) &mdash; Collapsible Sections &amp; Actions</div>
  </div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 8 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 8: Working Administrator User Management UI</h2>

<h3>8.1 User Management Screen &amp; Safety Guards</h3>
<ul>
  <li><strong>User Directory:</strong> Clean table listing all users with Name, Email, Role badge, Status (Active/Inactive), and Edit action.</li>
  <li><strong>Search &amp; Role Filter:</strong> Live search by user name or email address, with quick role filtering.</li>
  <li><strong>Create User Modal:</strong> Form with name, email, role selection, active toggle, and generated compliant initial password.</li>
  <li><strong>Duplicate Email Prevention:</strong> Case-insensitive duplicate check rejects duplicates with clear field-level validation errors (HTTP 400).</li>
  <li><strong>Safety Rules (BR-18, BR-19):</strong>
    <ul>
      <li>An Administrator cannot deactivate their own active account.</li>
      <li>The system blocks deactivating or changing the role of the last active Administrator (protected in unit test <code>admin-safety.unit.test.ts</code>).</li>
      <li>Soft deactivation is used instead of user deletion to preserve ticket history and audit integrity.</li>
    </ul>
  </li>
  <li><strong>Password Reset:</strong> Administrators can generate a new temporary password for any user; the user's existing session is immediately invalidated, forcing a password change on next login.</li>
</ul>

<h3>8.2 Responsive Screenshots &mdash; User Management &amp; Create Modal</h3>
<div class="avoid-break">
<h4>User List:</h4>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${userMgmtDesktop}" alt="User Management Desktop">
    <div class="img-caption">Desktop View (1280px) &mdash; User List with Role &amp; Status Badges</div>
  </div>
  <div class="img-card">
    <img src="${userMgmtTablet}" alt="User Management Tablet">
    <div class="img-caption">Tablet View (768px) &mdash; Compact Grid &amp; Actions</div>
  </div>
  <div class="img-card">
    <img src="${userMgmtMobile}" alt="User Management Mobile">
    <div class="img-caption">Mobile View (375px) &mdash; Responsive Card List</div>
  </div>
</div>

<h4>Create User Modal:</h4>
<div class="img-grid-3">
  <div class="img-card">
    <img src="${userCreateDesktop}" alt="Create User Desktop">
    <div class="img-caption">Create User Modal Desktop (1280px)</div>
  </div>
  <div class="img-card">
    <img src="${userCreateTablet}" alt="Create User Tablet">
    <div class="img-caption">Create User Modal Tablet (768px)</div>
  </div>
  <div class="img-card">
    <img src="${userCreateMobile}" alt="Create User Mobile">
    <div class="img-caption">Create User Modal Mobile (375px)</div>
  </div>
</div>
</div>

<!-- ========================================== -->
<!-- ANSWER PART 9 -->
<!-- ========================================== -->
<div class="section-break"></div>
<h2 class="answer-title">Answer Part 9: Zen Green UI and Responsive Evidence</h2>

<h3>9.1 Zen Green UI Tokens &amp; Conventions</h3>
<p>
Lab 3 preserves and extends the Zen Green design system established in Lab 2:
</p>
<ul>
  <li><strong>Palette:</strong> Primary Forest Green (<code>#006B3C</code>), Accent Deep Emerald (<code>#2d6a4f</code>), Background Soft Mint (<code>#EEF2EF</code>), Card White (<code>#ffffff</code>), Border Mint (<code>#d8f3dc</code>).</li>
  <li><strong>Semantic Distinctions:</strong> Public Comments in soft green containers (<code>#e8f5e9</code>); Internal Notes in distinct soft amber containers (<code>#fef3c7</code>) with amber border (<code>#f59e0b</code>).</li>
  <li><strong>Role-Aware Header:</strong> App shell shows the user's name and role pill with distinct styling (Requester: blue-green, IT Staff: emerald, Administrator: purple-slate).</li>
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
      <td><strong>No Clipped Labels or Buttons</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Buttons and labels wrap or flex cleanly without clipping</td>
    </tr>
    <tr>
      <td><strong>No Overlapping Messages</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Banners, modals, and toasts occupy dedicated non-overlapping flows</td>
    </tr>
    <tr>
      <td><strong>No Unintended Horizontal Scroll</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Mobile viewport (375px) has zero horizontal overflow across all screens</td>
    </tr>
    <tr>
      <td><strong>Role Badge &amp; Role Navigation</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Role badge clearly legible; navigation hides unauthorized links</td>
    </tr>
    <tr>
      <td><strong>Status &amp; Priority Badges</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Consistent pill geometry, high-contrast text, non-color text labels</td>
    </tr>
    <tr>
      <td><strong>Editable vs Read-Only Fields</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Read-only fields clearly distinguished with subtle background and disabled cursors</td>
    </tr>
    <tr>
      <td><strong>Public Comments vs Internal Notes</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Distinct green vs amber card backgrounds prevents accidental public exposure</td>
    </tr>
    <tr>
      <td><strong>Validation Placement</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Error messages render adjacent to the offending input fields</td>
    </tr>
    <tr>
      <td><strong>Visible Focus Rings</strong></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Focus rings visible on keyboard tab navigation (<code>:focus-visible</code>)</td>
    </tr>
    <tr>
      <td><strong>Mobile Table Adaptability</strong></td>
      <td>n/a</td>
      <td>n/a</td>
      <td><span class="badge badge-pass">Pass</span></td>
      <td>Queue and User lists collapse to card view on mobile viewports</td>
    </tr>
  </tbody>
</table>

</body>
</html>`;

  const htmlPath = path.join(rootDir, 'docs', 'lab-03', 'submission.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`Saved Lab 3 HTML report to ${htmlPath}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const pdfPath = path.join(rootDir, 'TokTickIT-Lab3-Submission.pdf');
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

  console.log(`Successfully generated Lab 3 PDF: ${pdfPath}`);
  await browser.close();
}

generateLab3Pdf().catch(err => {
  console.error('Error generating Lab 3 PDF:', err);
  process.exit(1);
});
