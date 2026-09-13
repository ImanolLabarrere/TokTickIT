# Lab 2 — AI Use and Reflection

I used **Claude** (Anthropic) throughout Sprint 2, both as the AI specification agent (drafting
`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`) and as the AI coding agent (implementing each
Issue). Work was split across two chat sessions — this is noted explicitly where relevant below, since it
affected how Issue 3 was integrated (see reflection).

_Fill in: exact Claude model/version used for each session, if known._

## Selected Key Prompts

| Prompt Name | Actual Prompt Text (paraphrased) | My Reflection |
|---|---|---|
| Draft Sprint Specification | "Regarde les PDFs, on n'a pas les Issues détaillées mais je te les donne moi-même ; commençons par l'Issue 1 (specification.md, tests.md, ui-spec.md, api-spec.md), aucun code." | Very thorough first pass, but far too heavy for a documentation-only Issue. |
| Reduce Documentation Verbosity | "Tout est trop lourd, réduis fortement les 4 fichiers sans perdre la couverture minimale exigée par le barème." | Good iteration — line count roughly halved while every required FR/BR/AC category stayed covered. |
| Implement Requester Context | "Attaque l'Issue 2 : modèles Prisma, seed idempotent, endpoints /api/requesters et /api/related-systems, écran de sélection." | Implementation itself was correct, but I later discovered (via `git log --graph --all`) that this branch was never actually merged into `lab2-staging` before Issue 3 started elsewhere — a real git-workflow lesson, not a code bug. |
| Implement My Tickets (same 4-part structure) | "On passe à l'Issue 4 avec le même type de prompt : branche, implémentation, tests/captures, merge." | Caught a genuine bug myself while testing: two Vitest tests failed because the desktop table and the mobile card view both render at once in jsdom (no real CSS media queries in tests), so `getByText`/`getByRole` needed `getAllBy...` variants. |
| Implement Ticket Detail + Attachments | "Passons à l'Issue 5, même découpage en 4 points." | Went smoothly once the real Prisma field names (`fileName`, `isRemoved`, `removalReason`) were confirmed against the actual schema instead of assumed from the original api-spec draft. |
| Integration QA, Playwright, E2E | "Passons à l'Issue 6, même type de prompt." | Required carefully re-reading the actual `CreateTicket.tsx` labels/ids before writing E2E selectors, rather than guessing — avoided brittle tests. |

## My Reflection

Working issue-by-issue with a fixed structure (create branch → implement → test/screenshot → merge)
kept scope discipline: each PR stayed traceable to one Issue. The main lesson of the sprint wasn't about
code at all — it was that switching between chat sessions silently broke the intended
`lab2-staging` integration flow (Issue 1's docs landed in `main` instead of `lab2-staging`, and Issue 2's
branch was superseded rather than merged). Re-reading `git log --graph --all` before starting new work
caught this before it compounded further. Lesson: always verify the actual remote branch state at the
start of a new session rather than trusting a prior summary of "what's done."
