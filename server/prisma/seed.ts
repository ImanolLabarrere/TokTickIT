import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// The four names are: Account and Access, Hardware, Software, Network.
// Requirement: running the seed twice must NOT create duplicates.
const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];

async function main() {
  const prisma = getPrisma();

  for (const name of CATEGORY_NAMES) {
    // upsert = "insert if missing, otherwise leave as-is" -> safe to rerun.
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Seeded ${CATEGORY_NAMES.length} categories (idempotent).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });