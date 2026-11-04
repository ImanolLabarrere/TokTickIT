# Lab 3 — Peer Review Record

## Reviewer Identity
- **Name:** Imanol LABARRERE
- **Student ID:** 69540460013
- **GitHub username:** ImanolLabarrere
- **Reviewers of my Pull Requests:** Léo LEPOUTRE (LeoMin13), Matos07

## Pull Requests I Authored (reviewed by LeoMin13 / Matos07)

Fill the PR link, the reviewer's real comment and my response for each row. Do not invent
comments: copy them from the GitHub conversation.

| Issue | PR link | Reviewer | Reviewer's comment | My response |
|---|---|---|---|---|
| 1 — Sprint 3 specification | _no PR — committed directly to `lab3-staging` (workflow deviation, see ai-use.md)_ | | | |
| 2 — Authentication foundation | | | | |
| 3 — Requester regression, comments | | | | |
| 4 — IT Staff ticket queue | | | | |
| 5 — IT Staff ticket detail | | | | |
| 6 — Administrator user management | | | | |
| 7 — Integration QA and E2E | | | | |
| Release — `lab3-staging` → `main` | | | | |

## Pull Requests I Reviewed (someone else's)

| PR link | My review comment | Author's response |
|---|---|---|
| | | |

_If I did not review a classmate's pull request in Lab 3, say so here instead of leaving the table
blank, and explain who reviewed mine._

## Approval Evidence (screenshots go in the PDF)
- [ ] An "Approved" review on at least one of my PRs, with a real comment exchange.
- [ ] The final GitHub Project Kanban board with every Issue in **Done**.
- [ ] `git log --graph --all` showing the feature branches merged into `lab3-staging`, then `main`.

## Notes
Branch discipline in this sprint had two deviations from the ideal workflow:

1. **Issue 1** (specification) was committed directly to `lab3-staging` without a feature branch or PR.
2. **Issues 3, 5 and 6** were merged directly into `main` instead of `lab3-staging` (GitHub proposes `main` as the default base). Corrected on 2026-11-04 by a merge-commit bringing `main` into `lab3-staging` before creating `feature/7-integration-qa`.

These deviations are acknowledged here and in `ai-use.md`.