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

  // Lab 3 Issue 4 (spec section 5.3): realistic Tickets spread across
  // Requesters, statuses, priorities and assigned/unassigned ownership, so the
  // IT Staff queue has real data. Idempotent: a demo ticket is skipped when one
  // with the same summary already exists.
  const DEMO_TICKETS = [
    { summary: "Laptop battery drains quickly", category: "Hardware", system: "Corporate Laptop", requester: "jennifer.anderson@example.com", req: "MEDIUM", it: "MEDIUM", status: "IN_PROGRESS", owner: "alex.thompson@tiktockit.com", daysAgo: 9 },
    { summary: "Cannot connect to VPN from home", category: "Network", system: "VPN", requester: "michael.brown@example.com", req: "HIGH", it: "HIGH", status: "OPEN", owner: "priya.nair@tiktockit.com", daysAgo: 8 },
    { summary: "Email not syncing on mobile", category: "Software", system: "Email", requester: "sarah.johnson@example.com", req: "MEDIUM", it: "MEDIUM", status: "IN_PROGRESS", owner: "wattana.srisuk@tiktockit.com", daysAgo: 7 },
    { summary: "New employee account setup", category: "Account and Access", system: "Email", requester: "david.lee@example.com", req: "LOW", it: "LOW", status: "RESOLVED", owner: "alex.thompson@tiktockit.com", daysAgo: 12 },
    { summary: "Printer keeps showing offline", category: "Hardware", system: "Printer", requester: "emma.wilson@example.com", req: "MEDIUM", it: "LOW", status: "OPEN", owner: "priya.nair@tiktockit.com", daysAgo: 6 },
    { summary: "Request access to Grade Submission App", category: "Account and Access", system: "Grade Submission App", requester: "jennifer.anderson@example.com", req: "LOW", it: "LOW", status: "WAITING_FOR_REQUESTER", owner: "wattana.srisuk@tiktockit.com", daysAgo: 5 },
    { summary: "Campus Wi-Fi drops in the library", category: "Network", system: "Campus Wi-Fi", requester: "michael.brown@example.com", req: "HIGH", it: "MEDIUM", status: "NEW", owner: null, daysAgo: 1 },
    { summary: "LEB2 App shows a blank page after login", category: "Software", system: "LEB2 App", requester: "sarah.johnson@example.com", req: "HIGH", it: "HIGH", status: "NEW", owner: null, daysAgo: 2 },
    { summary: "Docking station not detected", category: "Hardware", system: "Corporate Laptop", requester: "david.lee@example.com", req: "MEDIUM", it: "MEDIUM", status: "CLOSED", owner: "alex.thompson@tiktockit.com", daysAgo: 20 },
    { summary: "Forgot password for the grading portal", category: "Account and Access", system: "Grade Submission App", requester: "emma.wilson@example.com", req: "LOW", it: "LOW", status: "NEW", owner: null, daysAgo: 0 },
    { summary: "Outlook freezing intermittently", category: "Software", system: "Email", requester: "jennifer.anderson@example.com", req: "HIGH", it: "MEDIUM", status: "REOPENED", owner: "priya.nair@tiktockit.com", daysAgo: 15 },
    { summary: "VPN certificate expired", category: "Network", system: "VPN", requester: "david.lee@example.com", req: "MEDIUM", it: "HIGH", status: "OPEN", owner: "wattana.srisuk@tiktockit.com", daysAgo: 3 },
    { summary: "Duplicate request: printer toner", category: "Hardware", system: "Printer", requester: "emma.wilson@example.com", req: "LOW", it: "LOW", status: "CANCELLED", owner: null, daysAgo: 11 },
    { summary: "Second monitor not detected", category: "Hardware", system: "Corporate Laptop", requester: "sarah.johnson@example.com", req: "MEDIUM", it: "MEDIUM", status: "NEW", owner: null, daysAgo: 0 },
  ] as const;

  let ticketsCreated = 0;
  for (const t of DEMO_TICKETS) {
    const existing = await prisma.ticket.findFirst({ where: { summary: t.summary } });
    if (existing) continue;

    const category = await prisma.category.findUnique({ where: { name: t.category } });
    const system = await prisma.relatedSystem.findUnique({ where: { name: t.system } });
    const requester = await prisma.user.findUnique({ where: { email: t.requester } });
    const owner = t.owner ? await prisma.user.findUnique({ where: { email: t.owner } }) : null;
    if (!category || !system || !requester) continue;

    const createdAt = new Date(Date.now() - t.daysAgo * 24 * 60 * 60 * 1000);
    const created = await prisma.ticket.create({
      data: {
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: t.summary,
        description: `${t.summary}. Demo ticket created by the seed script for the IT Staff queue.`,
        requestedPriority: t.req,
        itPriority: t.it,
        currentStatus: t.status,
        ownerId: owner ? owner.id : null,
        createdAt,
      },
    });
    await prisma.ticket.update({
      where: { id: created.id },
      data: {
        ticketNumber: `TKT-${createdAt.getFullYear()}-${String(created.id).padStart(6, "0")}`,
        updatedAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
      },
    });
    ticketsCreated++;
  }
  console.log(`Demo tickets: ${ticketsCreated} created (${DEMO_TICKETS.length - ticketsCreated} already existed).`);

  // Lab 3 Issue 5 (spec section 5.3): example Public Comments and Internal Notes
  // that contain nothing sensitive. Idempotent: an entry is skipped if the same
  // text already exists on that ticket.
  const DEMO_THREADS = [
    {
      ticket: "Laptop battery drains quickly",
      comments: [
        { by: "alex.thompson@tiktockit.com", text: "Thanks for the report. We are checking the battery health on your device." },
        { by: "jennifer.anderson@example.com", text: "It also drains when the laptop is idle with the lid closed." },
      ],
      notes: [{ by: "alex.thompson@tiktockit.com", text: "Battery report shows high wear. Replacement part requested." }],
    },
    {
      ticket: "Cannot connect to VPN from home",
      comments: [{ by: "priya.nair@tiktockit.com", text: "Can you confirm which VPN client version you are using?" }],
      notes: [{ by: "priya.nair@tiktockit.com", text: "Looks like the same certificate issue as the other VPN ticket." }],
    },
    {
      ticket: "Request access to Grade Submission App",
      comments: [{ by: "wattana.srisuk@tiktockit.com", text: "Please send your employee ID so we can confirm your department." }],
      notes: [],
    },
  ];

  for (const thread of DEMO_THREADS) {
    const ticketRow = await prisma.ticket.findFirst({ where: { summary: thread.ticket } });
    if (!ticketRow) continue;

    for (const c of thread.comments) {
      const author = await prisma.user.findUnique({ where: { email: c.by } });
      if (!author) continue;
      const exists = await prisma.publicComment.findFirst({ where: { ticketId: ticketRow.id, content: c.text } });
      if (!exists) {
        await prisma.publicComment.create({ data: { ticketId: ticketRow.id, authorId: author.id, content: c.text } });
      }
    }
    for (const n of thread.notes) {
      const author = await prisma.user.findUnique({ where: { email: n.by } });
      if (!author) continue;
      const exists = await prisma.internalNote.findFirst({ where: { ticketId: ticketRow.id, content: n.text } });
      if (!exists) {
        await prisma.internalNote.create({ data: { ticketId: ticketRow.id, authorId: author.id, content: n.text } });
      }
    }
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