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

// Lab 2 Issue 5 — Ticket Detail + Attachments.
export interface AttachmentItem {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  isRemoved: boolean;
  removedAt: string | null;
  removalReason: string | null;
}

export interface TicketDetailResponse {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  currentStatus: TicketStatusValue;
  createdAt: string;
  updatedAt: string;
  requester: { id: number; name: string; email: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  attachments: AttachmentItem[];
}

export async function getTicketDetail(
  ticketId: number,
  requesterId: number
): Promise<TicketDetailResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
      headers: { "X-Requester-Id": String(requesterId) },
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (res.status === 404) {
    throw new Error("Ticket not found.");
  }
  if (!res.ok) {
    throw new Error("Unable to load ticket. Please try again.");
  }
  return res.json();
}

export async function addAttachment(
  ticketId: number,
  file: File,
  requesterId: number
): Promise<AttachmentItem[]> {
  const formData = new FormData();
  formData.append("attachments", file);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
      method: "POST",
      headers: { "X-Requester-Id": String(requesterId) },
      body: formData,
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unable to upload attachment." }));
    throw new Error(body.error ?? "Unable to upload attachment.");
  }
  const body = await res.json();
  return body.attachments;
}

// Downloads via fetch+blob (not a plain <a href>) because the download
// endpoint requires the X-Requester-Id header, which a normal link can't send.
export async function downloadAttachment(
  attachmentId: number,
  fileName: string,
  requesterId: number
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
      headers: { "X-Requester-Id": String(requesterId) },
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (res.status === 410) {
    throw new Error("This attachment has been removed and is no longer available.");
  }
  if (!res.ok) {
    throw new Error("Unable to download attachment.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function removeAttachment(
  attachmentId: number,
  reason: string,
  requesterId: number
): Promise<AttachmentItem> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Requester-Id": String(requesterId) },
      body: JSON.stringify({ reason }),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unable to remove attachment." }));
    throw new Error(body.error ?? "Unable to remove attachment.");
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