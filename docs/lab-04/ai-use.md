# Lab 4 — AI Use and Reflection

I used **Antigravity** (Google DeepMind's agentic coding assistant) powered by **Claude Sonnet 4.6 (Thinking)** and **Gemini 3.8 Flash** across the Lab 4 sprint as both the AI specification agent (`docs/lab-04/specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`) and the coding agent (Issues 2 through 6).

The agent operated with direct terminal access, running database migrations, unit/integration test suites (`npm test` in both `server/` and `client/`), and end-to-end tests via Playwright directly to observe execution results autonomously.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text (paraphrased) | My Reflection |
|---|---|---|
| Handout Analysis & Contract Setup | "Analyze the Lab 4 sheet (SE+Lab+4.pdf). Decompose into sequential issues and draft the complete engineering contract." | Generated a comprehensive specification adhering to KMUTT requirements, numbered business rules, traceability matrix, and clean branch structure. |
| Issue 2 — Actions Taken Foundation | "Implement ActionTaken model, migration, seed, and secure backend CRUD APIs with tests." | Implemented strictly scoped backend logic, server-stamped performer, and comprehensive Vitest coverage. |
| Issue 3 — Actions Taken UI | "Integrate Actions Taken history, form validation, and role-based permissions into Ticket Detail." | Preserved Zen Green styling while making follow-up notes and audit trails clear for both staff and requesters. |
| Issue 4 — Ticket Workflow & Resolution | "Finalize transition matrix, resolution owner gate, and stale-update conflict detection." | Enforced resolution authorization strictly on the server and prevented race conditions. |
| Issue 5 — Role Dashboards | "Build backend aggregation APIs and frontend dashboard screens for Requesters and IT Staff." | Provided real-time operational summaries with seamless drill-down to filtered views. |
| Issue 6 — Integration QA & Hardening | "Run full E2E suites, capture responsive screenshots, and update final results." | Verified zero-regression across Labs 1–3 and full end-to-end reliability. |

## My Reflection

Lab 4 marked the maturation of the TokTickIT platform from individual functional modules into a cohesive, production-grade IT service desk. Using Antigravity as an agentic partner allowed me to:
1. **Maintain rigorous contract compliance**: Ensuring that every requirement from `SE+Lab+4.pdf` (actions taken, state transition completeness, owner gating, stale update concurrency, and role dashboards) mapped directly to concrete Acceptance Criteria and automated tests.
2. **Prevent regressions systematically**: Running both the 185 server integration tests and the 77 client component tests at each increment guaranteed that enhancements introduced in Lab 4 never broke existing Lab 1, 2, or 3 behavior.
3. **Streamline peer reviews and collaboration**: Working through sequential feature branches with atomic commits, clean PRs into `lab4-staging`, and peer code reviews with LeoMin13 ensured high code quality and clear traceability throughout the entire sprint.
