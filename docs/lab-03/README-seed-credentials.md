# Lab 3 — Seed Account Credentials (local development only)

Every account created by `npx prisma db seed` (in `server/`) shares the same initial
password below. Local development data only — never a real secret.

**Initial password for every seeded account:** `ChangeMe123`

Every seeded account has `mustChangePassword = true`, so the first login for any of them
is immediately followed by the mandatory Change Password screen (Lab 3 §8.1).

## Accounts

| Role | Name | Email | Active |
|---|---|---|---|
| Requester | Jennifer Anderson | jennifer.anderson@example.com | ✅ |
| Requester | Michael Brown | michael.brown@example.com | ✅ |
| Requester | Sarah Johnson | sarah.johnson@example.com | ✅ |
| Requester | David Lee | david.lee@example.com | ✅ |
| Requester | Emma Wilson | emma.wilson@example.com | ✅ |
| Requester | Carlos Mendes | carlos.mendes@example.com | ❌ inactive |
| IT Staff | Alex Thompson | alex.thompson@tiktockit.com | ✅ |
| IT Staff | Priya Nair | priya.nair@tiktockit.com | ✅ |
| IT Staff | Wattana Srisuk | wattana.srisuk@tiktockit.com | ✅ |
| IT Staff | Former Staff | former.staff@tiktockit.com | ❌ inactive |
| Administrator | Admin User | admin@tiktockit.com | ✅ |