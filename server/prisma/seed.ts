import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/utils/password.js";

// Lab 1 — seed the four supported categories (unchanged).
const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];

// Lab 2 — Related Systems (labsheet §5.3 examples). At least six required.
const RELATED_SYSTEM_NAMES = [
  "Email",
  "Campus Wi-Fi",
  "VPN",
  "LEB2 App",
  "Grade Submission App",
  "Printer",
  "Corporate Laptop",
];

// Lab 3 — every seeded account's local-dev-only initial password.
// Documented in docs/lab-03/README-seed-credentials.md — never a real secret.
const SEED_PASSWORD = "ChangeMe123";

interface SeedUser {
  name: string;
  email: string;
  isActive: boolean;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

// Lab 2 Requesters, now migrated into the User model (BR-22): same identities,
// role REQUESTER, mustChangePassword true. At least 4 active + 1 inactive (labsheet §5.3).
const REQUESTERS: SeedUser[] = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true, role: "REQUESTER", mustChangePassword: true },
  { name: "Michael Brown", email: "michael.brown@example.com", isActive: true, role: "REQUESTER", mustChangePassword: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true, role: "REQUESTER", mustChangePassword: true },
  { name: "David Lee", email: "david.lee@example.com", isActive: true, role: "REQUESTER", mustChangePassword: true },
  { name: "Emma Wilson", email: "emma.wilson@example.com", isActive: true, role: "REQUESTER", mustChangePassword: true },
  { name: "Carlos Mendes", email: "carlos.mendes@example.com", isActive: false, role: "REQUESTER", mustChangePassword: true },
];

// Lab 3 §5.3 — at least 3 active IT Staff + 1 inactive IT Staff.
const IT_STAFF: SeedUser[] = [
  { name: "Alex Thompson", email: "alex.thompson@tiktockit.com", isActive: true, role: "IT_STAFF", mustChangePassword: true },
  { name: "Priya Nair", email: "priya.nair@tiktockit.com", isActive: true, role: "IT_STAFF", mustChangePassword: true },
  { name: "Wattana Srisuk", email: "wattana.srisuk@tiktockit.com", isActive: true, role: "IT_STAFF", mustChangePassword: true },
  { name: "Former Staff", email: "former.staff@tiktockit.com", isActive: false, role: "IT_STAFF", mustChangePassword: true },
];

// Lab 3 §5.3 — at least 1 active Administrator.
const ADMINISTRATORS: SeedUser[] = [
  { name: "Admin User", email: "admin@tiktockit.com", isActive: true, role: "ADMINISTRATOR", mustChangePassword: true },
];

async function main() {
  const prisma = getPrisma();

  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const allUsers = [...REQUESTERS, ...IT_STAFF, ...ADMINISTRATORS];

  for (const seedUser of allUsers) {
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        name: seedUser.name,
        isActive: seedUser.isActive,
        role: seedUser.role,
        mustChangePassword: seedUser.mustChangePassword,
        passwordHash,
      },
      create: {
        name: seedUser.name,
        email: seedUser.email,
        isActive: seedUser.isActive,
        role: seedUser.role,
        mustChangePassword: seedUser.mustChangePassword,
        passwordHash,
      },
    });
  }

  console.log(
    `Seeded ${CATEGORY_NAMES.length} categories, ${RELATED_SYSTEM_NAMES.length} related systems, ` +
      `and ${allUsers.length} users (${REQUESTERS.length} Requesters, ${IT_STAFF.length} IT Staff, ` +
      `${ADMINISTRATORS.length} Administrator). Initial password for every seeded account: ` +
      `"${SEED_PASSWORD}" (local dev only).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });