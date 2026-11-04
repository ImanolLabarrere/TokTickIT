# Lab 3 — AI Use and Reflection

I used **Claude** (Anthropic) in several separate chat sessions as both the AI specification agent
(`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`) and the AI coding agent (Issues 2 to 7).
The Issue 1 specification was written in one session; Issues 2 to 7 were built in a long second
session, and the Issue 7 QA work in a later session of **Claude Sonnet 5.5**.

_Fill in: the exact model/version of the earlier sessions, if known._

The coding agent worked in a sandbox with no network access and no database, so it could not run
Prisma, the server tests or Playwright. Every "it works" in this sprint was verified by me, running
`npm test` and the app on my own machine.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text (paraphrased) | My Reflection |
|---|---|---|
| Draft Sprint 3 specification | "Read the Lab 3 sheet and prepare the specification, API spec, UI spec and test plan. No code." | Thorough and consistent (authorization matrix, status transition matrix, session design). It was committed straight to `lab3-staging` without a feature branch or PR — a workflow deviation. |
| Issue 2 — authentication foundation | "Do Issue 2 and tell me what to ADD, not the whole zip." | Chose `bcryptjs` instead of `bcrypt` to avoid native compilation on Windows. The code was right, but it exposed a latent Lab 2 bug (below). |
| Prisma migration failure | I pasted the `P3006` / `P1014` errors from `migrate dev`. | The agent found the same `CREATE TABLE "Requester"` in two Lab 2 migrations. Its first fix (editing one migration file) was wrong and produced a second error; the working fix was to delete the three migrations and generate one fresh one on a disposable local database. Lesson: inspect every migration before editing one. |
| Token-efficient delivery | "Give me the files as a zip, only the ones that changed." | Delivering only changed files avoided my copy-paste mistakes (a truncated `schema.prisma`, an empty test file) and kept the exchange small. |
| Issue 3 — Requester regression | "Switch the Lab 2 endpoints to the authenticated session and add Public Comments." | `requireRequester` was rewritten to use the session, so no route changed. My own `npm test` in `client/` then found 4 failing tests the agent could not run itself (mock data without the new fields, ambiguous text queries). |
| Issue 4 — IT Staff queue | "Continue with the staff ticket queue." | My server run caught a bug in the agent's test: both test requesters had the same default name, so a "two requesters" assertion failed. The API was correct. |
| Issues 5 and 6 — staff operations and admin | "Next Issue." | Server-side rules (transition matrix, atomic claim, self-deactivation, last Administrator) are enforced in the API; the UI only hides options. The last-Administrator rule is unit-tested and demonstrated manually, because the shared dev database always has several Administrators. |
| Issue 7 — integration QA | "Do the QA and E2E Issue." | The agent noticed the Lab 2 E2E specs still used the removed Development Requester selector and would have failed on `main`, so they were migrated to real login. `e2e/global-setup.ts` re-seeds before each run so tests always start from known accounts. |

## My Reflection

**Specification agent.** A detailed contract written first (authorization matrix, transition matrix,
numbered rules and acceptance criteria) made every later Issue mostly mechanical, and the tests could
be traced back to acceptance criteria. Its weakness was process, not content: it did not enforce the
branch workflow, and I skipped a feature branch for Issue 1.

**Coding agent.** It was fast and its architectural choices held up (server-side authorization,
session cookie, no client-supplied identity). It was weakest exactly where it could not execute
anything: migrations, the database and tests. Several bugs were found only when I ran the suites, and
its first migration fix was a guess. What worked: asking for only the changed files, running the full
test suites after every Issue, and refusing to merge on "it should work". What I would change: check
`git branch --show-current` before every commit, and ask the agent to read the whole migration history
before it edits a single file.
