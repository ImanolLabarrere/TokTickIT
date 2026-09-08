import express, { Request, Response } from "express";
import cors from "cors";
import fs from "node:fs";
import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { requireRequester } from "./middleware/requireRequester.js";
import { attachmentsUpload } from "./upload.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

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
    const requesters = await getPrisma().requester.findMany({
      where: { isActive: true },
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
const STATUSES = ["NEW"] as const;

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

export default app;