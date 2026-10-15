import express, { Request, Response, RequestHandler } from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { requireRequester } from "./middleware/requireRequester.js";
import { attachmentsUpload, MAX_ATTACHMENTS_PER_TICKET, UPLOAD_DIR } from "./upload.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import { requireAuth, blockIfMustChangePassword, requireRole } from "./middleware/auth.js";
import { hashPassword, validatePasswordPolicy, normalizeEmail } from "./utils/password.js";
import { removesActiveAdmin } from "./utils/adminSafety.js";
// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors({ origin: true, credentials: true })); // credentials:true so the session cookie round-trips
app.use(express.json());
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Lab 3 Issue 2 — Authentication foundation
// ---------------------------------------------------------------------------
app.use("/api/auth", authRouter);

// Lab 3 Issue 5: endpoints shared by Requesters (their own tickets only) and
// IT Staff (any ticket). Administrators are intentionally excluded (matrix).
const requireRequesterOrStaff: RequestHandler[] = [
  requireAuth,
  blockIfMustChangePassword,
  requireRole("REQUESTER", "IT_STAFF"),
];

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (err) {
    console.error("GET /api/categories failed:", err);
    res.status(500).json({ error: "Unable to load categories" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Issue 2 — Development Requester context
// GET /api/requesters      -> active Requesters only, for the selector
// GET /api/related-systems -> full seeded list, for Create Ticket (Issue 3)
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
        const requesters = await getPrisma().user.findMany({
      where: { isActive: true, role: "REQUESTER" },
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch (err) {
    console.error("GET /api/requesters failed:", err);
    res.status(500).json({ error: "Unable to load requesters" });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch (err) {
    console.error("GET /api/related-systems failed:", err);
    res.status(500).json({ error: "Unable to load related systems" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Issue 3 — Create Ticket
// BR-01: backend-generated unique Ticket Number (TKT-<year>-<6-digit sequence>).
// BR-02: new Tickets always start as currentStatus NEW.
// BR-07/08/09/10: field validation. BR-11: client disables submit (server is
// stateless here, so duplicate-submission prevention is primarily a UI concern).
// BR-12: no orphaned Attachments if creation fails. BR-13/14: attachment rules
// are enforced by the attachmentsUpload middleware. BR-19: ownership via
// requireRequester.
// ---------------------------------------------------------------------------
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

app.post(
  "/api/tickets",
  requireRequester,
  attachmentsUpload,
  async (req: Request, res: Response) => {
    const requesterId = req.requesterId as number;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    function rejectValidation(fields: Record<string, string>) {
      for (const file of files) fs.unlink(file.path, () => undefined);
      res.status(400).json({ error: "Validation failed", fields });
    }

    const summary = typeof req.body.summary === "string" ? req.body.summary.trim() : "";
    const description =
      typeof req.body.description === "string" ? req.body.description.trim() : "";
    const requestedPriority = req.body.requestedPriority;
    const categoryId = Number(req.body.categoryId);
    const relatedSystemId = Number(req.body.relatedSystemId);

    const fieldErrors: Record<string, string> = {};
    if (summary.length < 5 || summary.length > 150) {
      fieldErrors.summary = "Summary must be between 5 and 150 characters.";
    }
    if (description.length < 10 || description.length > 2000) {
      fieldErrors.description = "Description must be between 10 and 2000 characters.";
    }
    if (!PRIORITIES.includes(requestedPriority)) {
      fieldErrors.requestedPriority = "Select a valid priority.";
    }
    if (!Number.isInteger(categoryId)) {
      fieldErrors.categoryId = "Select a category.";
    }
    if (!Number.isInteger(relatedSystemId)) {
      fieldErrors.relatedSystemId = "Select a related system.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      rejectValidation(fieldErrors);
      return;
    }

    try {
      const [category, relatedSystem] = await Promise.all([
        getPrisma().category.findUnique({ where: { id: categoryId } }),
        getPrisma().relatedSystem.findUnique({ where: { id: relatedSystemId } }),
      ]);
      if (!category) fieldErrors.categoryId = "Unknown category.";
      if (!relatedSystem || !relatedSystem.isActive) {
        fieldErrors.relatedSystemId = "Unknown or inactive related system.";
      }
      if (Object.keys(fieldErrors).length > 0) {
        rejectValidation(fieldErrors);
        return;
      }

      const ticket = await getPrisma().$transaction(async (tx) => {
        const created = await tx.ticket.create({
          data: {
            requesterId,
            categoryId,
            relatedSystemId,
            summary,
            description,
            requestedPriority,
            itPriority: requestedPriority, // spec section 9: IT Priority starts as a copy
          },
        });

        const year = new Date().getFullYear();
        const ticketNumber = `TKT-${year}-${String(created.id).padStart(6, "0")}`;
        const withNumber = await tx.ticket.update({
          where: { id: created.id },
          data: { ticketNumber },
        });

        if (files.length > 0) {
          await tx.attachment.createMany({
            data: files.map((file) => ({
              ticketId: created.id,
              fileName: file.originalname,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              storagePath: file.filename,
            })),
          });
        }

        return withNumber;
      });

      res.status(201).json({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        currentStatus: ticket.currentStatus,
        createdAt: ticket.createdAt,
      });
    } catch (err) {
      for (const file of files) fs.unlink(file.path, () => undefined);
      console.error("POST /api/tickets failed:", err);
      res.status(500).json({ error: "Unable to create ticket. Please try again." });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 2 Issue 4 — My Tickets (list, scoped to the current Requester)
// BR-09: never returns another Requester's rows. BR-23/24/25/26: search,
// filter, sort, and pagination, with invalid params falling back to defaults
// rather than erroring.
// ---------------------------------------------------------------------------
const SORTABLE_FIELDS = new Set(["ticketNumber", "createdAt", "updatedAt"]);
const STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

app.get("/api/tickets", requireRequester, async (req: Request, res: Response) => {
  const requesterId = req.requesterId as number;

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = Number(req.query.categoryId);
  const requestedPriority = req.query.requestedPriority;
  const status = req.query.status;

  const sortByRaw = typeof req.query.sortBy === "string" ? req.query.sortBy : "";
  const sortBy = SORTABLE_FIELDS.has(sortByRaw) ? sortByRaw : "createdAt";
  const sortDirRaw = typeof req.query.sortDir === "string" ? req.query.sortDir.toLowerCase() : "";
  const sortDir: "asc" | "desc" = sortDirRaw === "asc" ? "asc" : "desc";

  const pageRaw = Number(req.query.page);
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const pageSizeRaw = Number(req.query.pageSize);
  const pageSize =
    Number.isInteger(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 50 ? pageSizeRaw : 10;

  const where: Prisma.TicketWhereInput = { requesterId };

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (Number.isInteger(categoryId)) {
    where.categoryId = categoryId;
  }
  if (typeof requestedPriority === "string" && PRIORITIES.includes(requestedPriority as (typeof PRIORITIES)[number])) {
    where.requestedPriority = requestedPriority as Prisma.TicketWhereInput["requestedPriority"];
  }
  if (typeof status === "string" && STATUSES.includes(status as (typeof STATUSES)[number])) {
    where.currentStatus = status as Prisma.TicketWhereInput["currentStatus"];
  }

  try {
    const [data, totalItems] = await Promise.all([
      getPrisma().ticket.findMany({
        where,
        orderBy: { [sortBy]: sortDir } as Prisma.TicketOrderByWithRelationInput,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          requestedPriority: true,
          currentStatus: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
        },
      }),
      getPrisma().ticket.count({ where }),
    ]);

    res.status(200).json({
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    });
  } catch (err) {
    console.error("GET /api/tickets failed:", err);
    res.status(500).json({ error: "Unable to load tickets" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Issue 5 — Ticket Detail + Attachments
// BR-09: findFirst({id, requesterId}) gives an identical 404 whether the
// Ticket doesn't exist or belongs to someone else (never distinguished).
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", requireRequester, async (req: Request, res: Response) => {
  const requesterId = req.requesterId as number;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findFirst({
      where: { id, requesterId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        attachments: {
          orderBy: { uploadedAt: "asc" },
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            uploadedAt: true,
            isRemoved: true,
            removedAt: true,
            removalReason: true,
          },
        },
        publicComments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true, role: true } } },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }
    res.status(200).json({
      ...ticket,
      publicComments: ticket.publicComments.map((c) => ({
        id: c.id,
        content: c.content,
        authorId: c.authorId,
        authorName: c.author.name,
        authorRole: c.author.role,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/tickets/:id failed:", err);
    res.status(500).json({ error: "Unable to load ticket" });
  }
});

app.post(
  "/api/tickets/:id/attachments",
  requireRequester,
  attachmentsUpload,
  async (req: Request, res: Response) => {
    const requesterId = req.requesterId as number;
    const ticketId = Number(req.params.id);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    function cleanup() {
      for (const file of files) fs.unlink(file.path, () => undefined);
    }

    if (!Number.isInteger(ticketId)) {
      cleanup();
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    try {
      const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId } });
      if (!ticket) {
        cleanup();
        res.status(404).json({ error: "Ticket not found." });
        return;
      }
      if (files.length === 0) {
        res.status(400).json({ error: "Select at least one file to attach." });
        return;
      }

      const activeCount = await getPrisma().attachment.count({
        where: { ticketId, isRemoved: false },
      });
      if (activeCount + files.length > MAX_ATTACHMENTS_PER_TICKET) {
        cleanup();
        res
          .status(400)
          .json({ error: `A Ticket may have at most ${MAX_ATTACHMENTS_PER_TICKET} attachments.` });
        return;
      }

      await getPrisma().attachment.createMany({
        data: files.map((file) => ({
          ticketId,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath: file.filename,
        })),
      });

      const attachments = await getPrisma().attachment.findMany({
        where: { ticketId },
        orderBy: { uploadedAt: "asc" },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          uploadedAt: true,
          isRemoved: true,
          removedAt: true,
          removalReason: true,
        },
      });

      res.status(201).json({ attachments });
    } catch (err) {
      cleanup();
      console.error("POST /api/tickets/:id/attachments failed:", err);
      res.status(500).json({ error: "Unable to upload attachment. Please try again." });
    }
  }
);

app.get("/api/attachments/:id/download", requireRequesterOrStaff, async (req: Request, res: Response) => {
  const user = req.authUser!;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Attachment not found." });
    return;
  }

  try {
    const attachment = await getPrisma().attachment.findFirst({
      where: user.role === "REQUESTER" ? { id, ticket: { requesterId: user.id } } : { id },
    });
    if (!attachment) {
      res.status(404).json({ error: "Attachment not found." });
      return;
    }
    if (attachment.isRemoved) {
      res
        .status(410)
        .json({ error: "This attachment has been removed and is no longer available." });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, attachment.storagePath);
    res.download(filePath, attachment.fileName);
  } catch (err) {
    console.error("GET /api/attachments/:id/download failed:", err);
    res.status(500).json({ error: "Unable to download attachment" });
  }
});

app.patch("/api/attachments/:id/remove", requireRequester, async (req: Request, res: Response) => {
  const requesterId = req.requesterId as number;
  const id = Number(req.params.id);
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";

  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Attachment not found." });
    return;
  }
  if (reason.length < 3 || reason.length > 200) {
    res.status(400).json({ error: "A removal reason (3-200 characters) is required." });
    return;
  }

  try {
    const attachment = await getPrisma().attachment.findFirst({
      where: { id, ticket: { requesterId } },
    });
    if (!attachment) {
      res.status(404).json({ error: "Attachment not found." });
      return;
    }
    if (attachment.isRemoved) {
      res.status(400).json({ error: "This attachment was already removed." });
      return;
    }

    const updated = await getPrisma().attachment.update({
      where: { id },
      data: { isRemoved: true, removedAt: new Date(), removalReason: reason },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error("PATCH /api/attachments/:id/remove failed:", err);
    res.status(500).json({ error: "Unable to remove attachment" });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 Issue 3 — Public Comments + "Problem Appears Resolved"
// FR-05: a Requester can post a Public Comment on their own Ticket and flag
// it as appearing resolved. api-spec.md: content 1-2000 chars trimmed,
// non-blank; 404 (never 403) if the Ticket isn't the caller's, so ownership
// failures look identical to "doesn't exist" (BR-07 safe-error rule).
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/comments", requireRequesterOrStaff, async (req: Request, res: Response) => {
  const user = req.authUser!;
  const ticketId = Number(req.params.id);
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

  if (!Number.isInteger(ticketId)) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }
  if (content.length < 1 || content.length > 2000) {
    res.status(400).json({ error: "Comment must be between 1 and 2000 characters." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findFirst({
      where: user.role === "REQUESTER" ? { id: ticketId, requesterId: user.id } : { id: ticketId },
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    const comment = await getPrisma().publicComment.create({
      data: { ticketId, authorId: user.id, content },
      include: { author: { select: { name: true, role: true } } },
    });

    res.status(201).json({
      id: comment.id,
      content: comment.content,
      authorId: comment.authorId,
      authorName: comment.author.name,
      authorRole: comment.author.role,
      createdAt: comment.createdAt,
    });
  } catch (err) {
    console.error("POST /api/tickets/:id/comments failed:", err);
    res.status(500).json({ error: "Unable to post comment. Please try again." });
  }
});

app.post(
  "/api/tickets/:id/resolved-confirmation",
  requireRequester,
  async (req: Request, res: Response) => {
    const requesterId = req.requesterId as number;
    const ticketId = Number(req.params.id);

    if (!Number.isInteger(ticketId)) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    try {
      const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId } });
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found." });
        return;
      }

      await getPrisma().ticket.update({
        where: { id: ticketId },
        data: { requesterConfirmedResolved: true },
      });

      res.status(200).json({ requesterConfirmedResolved: true });
    } catch (err) {
      console.error("POST /api/tickets/:id/resolved-confirmation failed:", err);
      res.status(500).json({ error: "Unable to update the ticket. Please try again." });
    }
  }
);

// ---------------------------------------------------------------------------
// Lab 3 Issue 4 — IT Staff Ticket Queue (FR-06)
// Covers ALL Tickets (not scoped to one Requester). Only role IT_STAFF may
// call these routes; Requesters and Administrators get 403 (authorization
// matrix, specification.md section 6). Same clamping/defaults pattern as the
// Requester list above (BR-13): invalid params fall back, never error.
// ---------------------------------------------------------------------------
const requireStaff: RequestHandler[] = [requireAuth, blockIfMustChangePassword, requireRole("IT_STAFF")];
const STAFF_SORTABLE_FIELDS = new Set(["createdAt", "updatedAt", "itPriority"]);

app.get("/api/staff/tickets", requireStaff, async (req: Request, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = Number(req.query.categoryId);
  const requestedPriority = req.query.requestedPriority;
  const itPriority = req.query.itPriority;
  const currentStatus = req.query.currentStatus;
  const ownerRaw = req.query.ownerId;

  const sortByRaw = typeof req.query.sortBy === "string" ? req.query.sortBy : "";
  const sortBy = STAFF_SORTABLE_FIELDS.has(sortByRaw) ? sortByRaw : "createdAt";
  const sortDirRaw = typeof req.query.sortDir === "string" ? req.query.sortDir.toLowerCase() : "";
  const sortDir: "asc" | "desc" = sortDirRaw === "asc" ? "asc" : "desc";

  const pageRaw = Number(req.query.page);
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const pageSizeRaw = Number(req.query.pageSize);
  const pageSize =
    Number.isInteger(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 50 ? pageSizeRaw : 10;

  const where: Prisma.TicketWhereInput = {};

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (Number.isInteger(categoryId) && categoryId > 0) {
    where.categoryId = categoryId;
  }
  if (typeof requestedPriority === "string" && PRIORITIES.includes(requestedPriority as (typeof PRIORITIES)[number])) {
    where.requestedPriority = requestedPriority as Prisma.TicketWhereInput["requestedPriority"];
  }
  if (typeof itPriority === "string" && PRIORITIES.includes(itPriority as (typeof PRIORITIES)[number])) {
    where.itPriority = itPriority as Prisma.TicketWhereInput["itPriority"];
  }
  if (typeof currentStatus === "string" && STATUSES.includes(currentStatus as (typeof STATUSES)[number])) {
    where.currentStatus = currentStatus as Prisma.TicketWhereInput["currentStatus"];
  }
  if (ownerRaw === "unassigned") {
    where.ownerId = null;
  } else if (typeof ownerRaw === "string" && ownerRaw !== "" && Number.isInteger(Number(ownerRaw))) {
    where.ownerId = Number(ownerRaw);
  }

  try {
    const [rows, totalItems] = await Promise.all([
      getPrisma().ticket.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: "desc" }] as Prisma.TicketOrderByWithRelationInput[],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          requestedPriority: true,
          itPriority: true,
          currentStatus: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          requester: { select: { name: true } },
          category: { select: { name: true } },
          owner: { select: { name: true } },
        },
      }),
      getPrisma().ticket.count({ where }),
    ]);

    res.status(200).json({
      data: rows.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        requesterName: t.requester.name,
        categoryName: t.category.name,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ownerId: t.ownerId,
        ownerName: t.owner?.name ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    });
  } catch (err) {
    console.error("GET /api/staff/tickets failed:", err);
    res.status(500).json({ error: "Unable to load the queue" });
  }
});

// Feeds the queue's Owner filter (and, in Issue 5, the Reassign picker).
app.get("/api/staff/owners", requireStaff, async (_req: Request, res: Response) => {
  try {
    const owners = await getPrisma().user.findMany({
      where: { isActive: true, role: "IT_STAFF" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(owners);
  } catch (err) {
    console.error("GET /api/staff/owners failed:", err);
    res.status(500).json({ error: "Unable to load staff members" });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 Issue 5 — IT Staff Ticket Detail operations (FR-07, FR-08, FR-09)
// All routes below are IT_STAFF only (requireStaff); every rule is enforced
// here on the server, never just by hiding a button in the UI.
// ---------------------------------------------------------------------------

// specification.md section 7 — Status Transition Matrix (BR-12).
const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "OPEN"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "OPEN", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS"],
  CANCELLED: [],
};

const COMMENT_AUTHOR_SELECT = { select: { name: true, role: true } } as const;

app.get("/api/staff/tickets/:id", requireStaff, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        attachments: {
          orderBy: { uploadedAt: "asc" },
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            uploadedAt: true,
            isRemoved: true,
            removedAt: true,
            removalReason: true,
          },
        },
        publicComments: { orderBy: { createdAt: "asc" }, include: { author: COMMENT_AUTHOR_SELECT } },
        internalNotes: { orderBy: { createdAt: "asc" }, include: { author: COMMENT_AUTHOR_SELECT } },
      },
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    const shape = (e: {
      id: number;
      content: string;
      authorId: number;
      createdAt: Date;
      author: { name: string; role: string };
    }) => ({
      id: e.id,
      content: e.content,
      authorId: e.authorId,
      authorName: e.author.name,
      authorRole: e.author.role,
      createdAt: e.createdAt,
    });

    res.status(200).json({
      ...ticket,
      publicComments: ticket.publicComments.map(shape),
      internalNotes: ticket.internalNotes.map(shape),
    });
  } catch (err) {
    console.error("GET /api/staff/tickets/:id failed:", err);
    res.status(500).json({ error: "Unable to load ticket" });
  }
});

// BR-09: claiming sets the owner to the caller; a NEW ticket also becomes OPEN.
// 409 when someone else already owns it (use /assign to reassign).
app.post("/api/staff/tickets/:id/claim", requireStaff, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = req.authUser!;
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    const becomesOpen = ticket.currentStatus === "NEW";
    const nextStatus = becomesOpen ? "OPEN" : ticket.currentStatus;

    // updateMany with the owner condition makes the claim atomic: if two staff
    // members click Claim at the same moment, only one of them matches.
    const result = await getPrisma().ticket.updateMany({
      where: { id, OR: [{ ownerId: null }, { ownerId: user.id }] },
      data: {
        ownerId: user.id,
        currentStatus: nextStatus,
        ...(becomesOpen ? { requesterConfirmedResolved: false } : {}),
      },
    });
    if (result.count === 0) {
      res.status(409).json({ error: "This ticket is already claimed. Use reassign instead." });
      return;
    }

    res.status(200).json({ ownerId: user.id, ownerName: user.name, currentStatus: nextStatus });
  } catch (err) {
    console.error("POST /api/staff/tickets/:id/claim failed:", err);
    res.status(500).json({ error: "Unable to claim the ticket. Please try again." });
  }
});

// BR-08/BR-10: the new owner must be an active IT Staff or Administrator user.
app.post("/api/staff/tickets/:id/assign", requireStaff, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ownerId = Number(req.body.ownerId);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    const target = Number.isInteger(ownerId)
      ? await getPrisma().user.findUnique({ where: { id: ownerId } })
      : null;
    if (!target || !target.isActive || (target.role !== "IT_STAFF" && target.role !== "ADMINISTRATOR")) {
      res.status(400).json({ error: "The new owner must be an active IT Staff member." });
      return;
    }

    await getPrisma().ticket.update({ where: { id }, data: { ownerId: target.id } });
    res.status(200).json({ ownerId: target.id, ownerName: target.name });
  } catch (err) {
    console.error("POST /api/staff/tickets/:id/assign failed:", err);
    res.status(500).json({ error: "Unable to reassign the ticket. Please try again." });
  }
});

// BR-11: IT Priority is the only priority staff can change.
app.patch("/api/staff/tickets/:id/priority", requireStaff, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const itPriority = req.body.itPriority;
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }
  if (typeof itPriority !== "string" || !PRIORITIES.includes(itPriority as (typeof PRIORITIES)[number])) {
    res.status(400).json({ error: "IT Priority must be LOW, MEDIUM or HIGH." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    await getPrisma().ticket.update({
      where: { id },
      data: { itPriority: itPriority as (typeof PRIORITIES)[number] },
    });
    res.status(200).json({ itPriority });
  } catch (err) {
    console.error("PATCH /api/staff/tickets/:id/priority failed:", err);
    res.status(500).json({ error: "Unable to update the priority. Please try again." });
  }
});

// BR-12 / BR-14: only listed transitions are allowed, and a successful change
// always clears the Requester's "appears resolved" flag.
app.patch("/api/staff/tickets/:id/status", requireStaff, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const to = req.body.currentStatus;
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }
  if (typeof to !== "string" || !STATUSES.includes(to as (typeof STATUSES)[number])) {
    res.status(400).json({ error: "Unknown ticket status." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    const from = ticket.currentStatus;
    if (!STATUS_TRANSITIONS[from].includes(to)) {
      res.status(400).json({ error: "Invalid status transition", from, to });
      return;
    }

    // Guard against a concurrent change: only update if the status is still `from`.
    const result = await getPrisma().ticket.updateMany({
      where: { id, currentStatus: from },
      data: { currentStatus: to as (typeof STATUSES)[number], requesterConfirmedResolved: false },
    });
    if (result.count === 0) {
      res.status(409).json({ error: "The ticket was changed by someone else. Reload and try again." });
      return;
    }

    res.status(200).json({ currentStatus: to });
  } catch (err) {
    console.error("PATCH /api/staff/tickets/:id/status failed:", err);
    res.status(500).json({ error: "Unable to update the status. Please try again." });
  }
});

// FR-09 / BR-15 / BR-16: append-only Internal Notes, IT Staff only.
app.post("/api/staff/tickets/:id/notes", requireStaff, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = req.authUser!;
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }
  if (content.length < 1 || content.length > 2000) {
    res.status(400).json({ error: "Note must be between 1 and 2000 characters." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    const note = await getPrisma().internalNote.create({
      data: { ticketId: id, authorId: user.id, content },
    });
    res.status(201).json({
      id: note.id,
      content: note.content,
      authorId: note.authorId,
      authorName: user.name,
      authorRole: user.role,
      createdAt: note.createdAt,
    });
  } catch (err) {
    console.error("POST /api/staff/tickets/:id/notes failed:", err);
    res.status(500).json({ error: "Unable to save the note. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 Issue 6 — Administrator User Management (FR-10, FR-11)
// ADMINISTRATOR only; every safety rule is enforced here on the server.
// ---------------------------------------------------------------------------
const requireAdmin: RequestHandler[] = [requireAuth, blockIfMustChangePassword, requireRole("ADMINISTRATOR")];
const USER_ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;
type UserRoleValue = (typeof USER_ROLES)[number];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_USER_SELECT = { id: true, name: true, email: true, role: true, isActive: true } as const;

// BR-18: duplicate emails are detected case-insensitively (excluding the user being edited).
async function isEmailTaken(email: string, excludeUserId?: number): Promise<boolean> {
  const existing = await getPrisma().user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      ...(excludeUserId !== undefined ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
}

function validateName(value: unknown): { value?: string; error?: string } {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return { error: "Name is required." };
  if (name.length > 100) return { error: "Name must be 100 characters or fewer." };
  return { value: name };
}

function validateEmail(value: unknown): { value?: string; error?: string } {
  const email = typeof value === "string" ? normalizeEmail(value) : "";
  if (!email) return { error: "Email is required." };
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };
  return { value: email };
}

function isRole(value: unknown): value is UserRoleValue {
  return typeof value === "string" && USER_ROLES.includes(value as UserRoleValue);
}

app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const role = req.query.role;
  const pageRaw = Number(req.query.page);
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const pageSizeRaw = Number(req.query.pageSize);
  const pageSize =
    Number.isInteger(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 50 ? pageSizeRaw : 10;

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (isRole(role)) {
    where.role = role;
  }

  try {
    const [data, totalItems] = await Promise.all([
      getPrisma().user.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: ADMIN_USER_SELECT,
      }),
      getPrisma().user.count({ where }),
    ]);
    res.status(200).json({
      data,
      pagination: { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) },
    });
  } catch (err) {
    console.error("GET /api/admin/users failed:", err);
    res.status(500).json({ error: "Unable to load users" });
  }
});

// BR-17: exactly one role, a unique email, an initial password; the new user
// must change that password at first login.
app.post("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const fields: Record<string, string> = {};

  const name = validateName(body.name);
  if (name.error) fields.name = name.error;
  const email = validateEmail(body.email);
  if (email.error) fields.email = email.error;
  if (!isRole(body.role)) fields.role = "Choose a valid role.";
  const isActive = body.isActive === undefined ? true : body.isActive;
  if (typeof isActive !== "boolean") fields.isActive = "Active must be true or false.";
  const initialPassword = typeof body.initialPassword === "string" ? body.initialPassword : "";
  const passwordError = validatePasswordPolicy(initialPassword);
  if (passwordError) fields.initialPassword = passwordError;

  try {
    if (email.value && (await isEmailTaken(email.value))) {
      fields.email = "A user with this email already exists.";
    }
    if (Object.keys(fields).length > 0) {
      res.status(400).json({ error: "Please correct the highlighted fields.", fields });
      return;
    }

    const created = await getPrisma().user.create({
      data: {
        name: name.value as string,
        email: email.value as string,
        role: body.role as UserRoleValue,
        isActive: isActive as boolean,
        passwordHash: await hashPassword(initialPassword),
        mustChangePassword: true,
      },
      select: ADMIN_USER_SELECT,
    });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(400).json({
        error: "Please correct the highlighted fields.",
        fields: { email: "A user with this email already exists." },
      });
      return;
    }
    console.error("POST /api/admin/users failed:", err);
    res.status(500).json({ error: "Unable to create the user. Please try again." });
  }
});

app.patch("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const caller = req.authUser!;
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const body = req.body ?? {};
  const fields: Record<string, string> = {};
  const data: { name?: string; email?: string; role?: UserRoleValue; isActive?: boolean } = {};

  if (body.name !== undefined) {
    const name = validateName(body.name);
    if (name.error) fields.name = name.error;
    else data.name = name.value;
  }
  if (body.email !== undefined) {
    const email = validateEmail(body.email);
    if (email.error) fields.email = email.error;
    else data.email = email.value;
  }
  if (body.role !== undefined) {
    if (isRole(body.role)) data.role = body.role;
    else fields.role = "Choose a valid role.";
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    else fields.isActive = "Active must be true or false.";
  }

  try {
    const target = await getPrisma().user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (data.email && (await isEmailTaken(data.email, id))) {
      fields.email = "A user with this email already exists.";
    }
    if (Object.keys(fields).length > 0) {
      res.status(400).json({ error: "Please correct the highlighted fields.", fields });
      return;
    }
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "Nothing to update." });
      return;
    }

    // BR-19: an Administrator cannot deactivate their own account.
    if (data.isActive === false && target.id === caller.id) {
      res.status(400).json({ error: "Cannot deactivate your own account" });
      return;
    }

    // BR-20: never leave the system without an active Administrator.
    const next = { role: data.role ?? target.role, isActive: data.isActive ?? target.isActive };
    if (removesActiveAdmin({ role: target.role, isActive: target.isActive }, next)) {
      const others = await getPrisma().user.count({
        where: { role: "ADMINISTRATOR", isActive: true, id: { not: id } },
      });
      if (others === 0) {
        res.status(400).json({ error: "At least one active Administrator is required" });
        return;
      }
    }

    const updated = await getPrisma().user.update({ where: { id }, data, select: ADMIN_USER_SELECT });
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(400).json({
        error: "Please correct the highlighted fields.",
        fields: { email: "A user with this email already exists." },
      });
      return;
    }
    console.error("PATCH /api/admin/users/:id failed:", err);
    res.status(500).json({ error: "Unable to update the user. Please try again." });
  }
});

// BR-21: the new initial password must be changed at the user's next login.
// Their already-open session is not closed, but its next request is rejected
// by the mustChangePassword gate until they choose a new password.
app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const newInitialPassword = typeof req.body?.newInitialPassword === "string" ? req.body.newInitialPassword : "";
  const passwordError = validatePasswordPolicy(newInitialPassword);
  if (passwordError) {
    res.status(400).json({ error: passwordError, fields: { newInitialPassword: passwordError } });
    return;
  }

  try {
    const target = await getPrisma().user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    await getPrisma().user.update({
      where: { id },
      data: { passwordHash: await hashPassword(newInitialPassword), mustChangePassword: true },
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/users/:id/reset-password failed:", err);
    res.status(500).json({ error: "Unable to reset the password. Please try again." });
  }
});

export default app;