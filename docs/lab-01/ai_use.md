# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** <name>

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 |  - 	"Here's the labsheet PDF and starter scaffold — implement Issue 1 (project foundation) exactly to its acceptance criteria, and tell me what to install beyond VS Code." 
SOLUTION : 
Verified the React/Vite/Bootstrap build, type-checked the Express/TS backend, spun up a real local PostgreSQL to confirm Prisma connectivity, found and fixed a missing noEmit setting in tsconfig.json that was leaking compiled .js files into src/, and wrote the full setup README.md.


| 2 | - "npm is blocked by PowerShell with an execution-policy security error — fix it."
SOLUTION:
Diagnosed the Windows script-execution restriction


| 3 | - 	"git push fails with 'src refspec does not match any', but the branch already exists on GitHub."
SOLUTION:
Identified that the branch existed remotely but not locally, and gave the correct git fetch + git checkout branch sequence

| 4 | -  "git status shows nothing to commit even after replacing the project files from the zip."
SOLUTION:
README.md was still the original 12-byte stub because a copy-paste had  been skipped


| 5 | - "Now implement Issue 2 (API health check) end to end."
SOLUTION:
Implemented the GET /api/health


| 6 | - 	"The frontend is unreachable at localhost:5173 after adding the Issue 4 code — is the code broken?"
SOLUTION:
the code was correct and that the real cause was simply that the frontend dev server had never been started in its own terminal.


| 7 | -  "psql says relation "Category" does not exist."
SOLUTION:
the psql session was connected to the default postgres database instead of toktickit


## Reflection
Two or three sentences: what made your prompts better, and one place you had to
correct or reject what the agent produced.
