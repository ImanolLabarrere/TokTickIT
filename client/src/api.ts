const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface Requester {
  id: number;
  name: string;
  email: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

// Lab 2 Issue 3 — active Categories, for the Create Ticket dropdown.
export async function getCategories(): Promise<Category[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/categories`);
  } catch {
    throw new Error("Unable to load categories.");
  }
  if (!res.ok) {
    throw new Error("Unable to load categories.");
  }
  return res.json();
}

// Lab 2 Issue 2 — active Development Requesters, for the selector.
export async function getRequesters(): Promise<Requester[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/requesters`);
  } catch {
    throw new Error("Unable to load Development Requesters.");
  }
  if (!res.ok) {
    throw new Error("Unable to load Development Requesters.");
  }
  return res.json();
}

// Lab 2 Issue 2 — full Related System list (used by Create Ticket in Issue 3).
export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/related-systems`);
  } catch {
    throw new Error("Unable to load related systems.");
  }
  if (!res.ok) {
    throw new Error("Unable to load related systems.");
  }
  return res.json();
}

// Lab 2 Issue 3 — create a Ticket (with optional attachments).
export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface CreateTicketPayload {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: Priority;
  attachments: File[];
}

export interface CreateTicketResult {
  id: number;
  ticketNumber: string;
  currentStatus: string;
  createdAt: string;
}

export type FieldErrors = Record<string, string>;

export class ValidationError extends Error {
  fields: FieldErrors;
  constructor(fields: FieldErrors) {
    super("Validation failed");
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId: number
): Promise<CreateTicketResult> {
  const formData = new FormData();
  formData.append("categoryId", String(payload.categoryId));
  formData.append("relatedSystemId", String(payload.relatedSystemId));
  formData.append("summary", payload.summary);
  formData.append("description", payload.description);
  formData.append("requestedPriority", payload.requestedPriority);
  for (const file of payload.attachments) {
    formData.append("attachments", file);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets`, {
      method: "POST",
      headers: { "X-Requester-Id": String(requesterId) },
      body: formData,
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (res.status === 400) {
    const body = await res.json().catch(() => ({ fields: {} }));
    throw new ValidationError(body.fields ?? {});
  }
  if (!res.ok) {
    throw new Error("Unable to create the ticket. Please try again.");
  }
  return res.json();
}
// Lab 2 Issue 4 — My Tickets list (search/filter/sort/pagination).
export type TicketStatusValue = "NEW";

export interface TicketListItem {
  id: number;
  ticketNumber: string | null;
  summary: string;
  requestedPriority: Priority;
  currentStatus: TicketStatusValue;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
}

export interface TicketListPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: TicketListItem[];
  pagination: TicketListPagination;
}

export interface TicketListParams {
  search?: string;
  categoryId?: number;
  requestedPriority?: Priority;
  status?: TicketStatusValue;
  sortBy?: "ticketNumber" | "createdAt" | "updatedAt";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getTickets(
  params: TicketListParams,
  requesterId: number
): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.status) query.set("status", params.status);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
      headers: { "X-Requester-Id": String(requesterId) },
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    throw new Error("Unable to load tickets. Please try again.");
  }
  return res.json();
}

export async function checkSystem(): Promise<SystemStatus> {
  let healthRes: Response;
  try {
    healthRes = await fetch(`${API_URL}/api/health`);
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  let categoriesRes: Response;
  try {
    categoriesRes = await fetch(`${API_URL}/api/categories`);
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!categoriesRes.ok) {
    throw new Error("Unable to load request categories");
  }

  const categories = (await categoriesRes.json()) as Category[];
  return { online: true, categories };
}