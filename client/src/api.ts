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

// Issue 2 + Issue 4 — call the backend.
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