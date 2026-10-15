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

export async function createTicket(payload: CreateTicketPayload): Promise<CreateTicketResult> {
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
      credentials: "include",
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
export type TicketStatusValue =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

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

export async function getTickets(params: TicketListParams): Promise<TicketListResponse> {
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
      credentials: "include",
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
  publicComments: PublicComment[];
  requesterConfirmedResolved: boolean;
}

// Lab 3 Issue 3 — Public Comments + "Problem Appears Resolved".
export interface PublicComment {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  authorRole?: Role;
  createdAt: string;
}

export async function getTicketDetail(ticketId: number): Promise<TicketDetailResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
      credentials: "include",
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

export async function addAttachment(ticketId: number, file: File): Promise<AttachmentItem[]> {
  const formData = new FormData();
  formData.append("attachments", file);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
      method: "POST",
      credentials: "include",
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

// Downloads via fetch+blob (not a plain <a href>) so the session cookie
// travels with the request and the file still lands with its real name.
export async function downloadAttachment(attachmentId: number, fileName: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
      credentials: "include",
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

export async function removeAttachment(attachmentId: number, reason: string): Promise<AttachmentItem> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
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


// ---------------------------------------------------------------------------
// Lab 3 Issue 2 — Authentication
// ---------------------------------------------------------------------------
export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

async function parseAuthError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({ error: fallback }));
  throw new Error(body.error ?? fallback);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    await parseAuthError(res, "Invalid email or password");
  }
  const body = await res.json();
  return body.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const body = await res.json();
  return body.user;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    await parseAuthError(res, "Unable to change password.");
  }
}
// Lab 3 Issue 3 — Public Comments + "Problem Appears Resolved".
export async function postComment(ticketId: number, content: string): Promise<PublicComment> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unable to post comment." }));
    throw new Error(body.error ?? "Unable to post comment.");
  }
  return res.json();
}

export async function markProblemAppearsResolved(ticketId: number): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolved-confirmation`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unable to update the ticket." }));
    throw new Error(body.error ?? "Unable to update the ticket.");
  }
}

// ---------------------------------------------------------------------------
// Lab 3 Issue 4 — IT Staff Ticket Queue
// ---------------------------------------------------------------------------
export interface StaffTicketListItem {
  id: number;
  ticketNumber: string | null;
  summary: string;
  requesterName: string;
  categoryName: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatusValue;
  ownerId: number | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketListResponse {
  data: StaffTicketListItem[];
  pagination: TicketListPagination;
}

export interface StaffTicketListParams {
  search?: string;
  categoryId?: number;
  requestedPriority?: Priority;
  itPriority?: Priority;
  currentStatus?: TicketStatusValue;
  ownerId?: "unassigned" | number;
  sortBy?: "createdAt" | "updatedAt" | "itPriority";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface StaffOwner {
  id: number;
  name: string;
}

export async function getStaffTickets(params: StaffTicketListParams): Promise<StaffTicketListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.currentStatus) query.set("currentStatus", params.currentStatus);
  if (params.ownerId !== undefined) query.set("ownerId", String(params.ownerId));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/staff/tickets?${query.toString()}`, { credentials: "include" });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unable to load the queue." }));
    throw new Error(body.error ?? "Unable to load the queue.");
  }
  return res.json();
}

export async function getStaffOwners(): Promise<StaffOwner[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/staff/owners`, { credentials: "include" });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) throw new Error("Unable to load staff members.");
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 Issue 5 — IT Staff Ticket Detail
// ---------------------------------------------------------------------------
export interface InternalNote {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  authorRole?: Role;
  createdAt: string;
}

export interface StaffTicketDetailResponse {
  id: number;
  ticketNumber: string | null;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatusValue;
  requesterConfirmedResolved: boolean;
  createdAt: string;
  updatedAt: string;
  requester: { id: number; name: string; email: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  ownerId: number | null;
  owner: { id: number; name: string } | null;
  attachments: AttachmentItem[];
  publicComments: PublicComment[];
  internalNotes: InternalNote[];
}

async function staffRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
  fallback = "Request failed. Please try again."
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? fallback);
  }
  return res.json();
}

export function getStaffTicketDetail(ticketId: number): Promise<StaffTicketDetailResponse> {
  return staffRequest(`/api/staff/tickets/${ticketId}`, "GET", undefined, "Unable to load ticket.");
}

export function claimTicket(
  ticketId: number
): Promise<{ ownerId: number; ownerName: string; currentStatus: TicketStatusValue }> {
  return staffRequest(`/api/staff/tickets/${ticketId}/claim`, "POST", {}, "Unable to claim the ticket.");
}

export function assignTicket(
  ticketId: number,
  ownerId: number
): Promise<{ ownerId: number; ownerName: string }> {
  return staffRequest(`/api/staff/tickets/${ticketId}/assign`, "POST", { ownerId }, "Unable to reassign the ticket.");
}

export function setItPriority(ticketId: number, itPriority: Priority): Promise<{ itPriority: Priority }> {
  return staffRequest(`/api/staff/tickets/${ticketId}/priority`, "PATCH", { itPriority }, "Unable to update the priority.");
}

export function setTicketStatus(
  ticketId: number,
  currentStatus: TicketStatusValue
): Promise<{ currentStatus: TicketStatusValue }> {
  return staffRequest(`/api/staff/tickets/${ticketId}/status`, "PATCH", { currentStatus }, "Unable to update the status.");
}

export function postInternalNote(ticketId: number, content: string): Promise<InternalNote> {
  return staffRequest(`/api/staff/tickets/${ticketId}/notes`, "POST", { content }, "Unable to save the note.");
}

// ---------------------------------------------------------------------------
// Lab 3 Issue 6 — Administrator User Management
// ---------------------------------------------------------------------------
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface AdminUserListParams {
  search?: string;
  role?: Role;
  page?: number;
  pageSize?: number;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  pagination: TicketListPagination;
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  initialPassword: string;
}

export type UpdateAdminUserPayload = Partial<Pick<AdminUser, "name" | "email" | "role" | "isActive">>;

// Carries the HTTP status (so the screen can tell 403 "forbidden" from a safe
// failure) and any field-level validation messages the API returned.
export class AdminApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function adminRequest<T>(path: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AdminApiError("Unable to connect to TokTickIT API", 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new AdminApiError(data.error ?? "Request failed. Please try again.", res.status, data.fields ?? {});
  }
  return res.json();
}

export function getAdminUsers(params: AdminUserListParams): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  return adminRequest(`/api/admin/users?${query.toString()}`, "GET");
}

export function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUser> {
  return adminRequest("/api/admin/users", "POST", payload);
}

export function updateAdminUser(id: number, changes: UpdateAdminUserPayload): Promise<AdminUser> {
  return adminRequest(`/api/admin/users/${id}`, "PATCH", changes);
}

export function resetAdminPassword(id: number, newInitialPassword: string): Promise<{ ok: true }> {
  return adminRequest(`/api/admin/users/${id}/reset-password`, "POST", { newInitialPassword });
}
