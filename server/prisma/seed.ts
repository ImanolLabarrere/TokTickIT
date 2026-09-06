import { getPrisma } from "../src/prisma.js";

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

// Lab 2 — Development Requesters: at least 4 active + 1 inactive (labsheet §5.3).
// The inactive one (Carlos Mendes) must never appear in the selector.
const REQUESTERS: { name: string; email: string; isActive: boolean }[] = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
  { name: "Michael Brown", email: "michael.brown@example.com", isActive: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true },
  { name: "David Lee", email: "david.lee@example.com", isActive: true },
  { name: "Emma Wilson", email: "emma.wilson@example.com", isActive: true },
  { name: "Carlos Mendes", email: "carlos.mendes@example.com", isActive: false },
];

async function main() {
  const prisma = getPrisma();

  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const requester of REQUESTERS) {
    await prisma.requester.upsert({
      where: { email: requester.email },
      update: { name: requester.name, isActive: requester.isActive },
      create: requester,
    });
  }

  console.log(
    `Seeded ${CATEGORY_NAMES.length} categories, ${RELATED_SYSTEM_NAMES.length} related systems, ` +
      `and ${REQUESTERS.length} requesters (idempotent).`
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
