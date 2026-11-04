import { execSync } from "node:child_process";
import path from "node:path";

// Re-seeds before every E2E run so the seeded accounts are back to the
// documented state (password ChangeMe123, mustChangePassword=true). The seed is
// idempotent. Side effect: it also resets any password you changed by hand
// while testing the app manually.
export default async function globalSetup() {
  execSync("npx prisma db seed", { cwd: path.join(process.cwd(), "server"), stdio: "inherit" });
}
