import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext.js";

export type AppView = "my-tickets" | "create-ticket" | "my-queue" | "admin";

export interface NavItem {
  view: AppView;
  label: string;
}

interface AppShellProps {
  children: ReactNode;
  navItems: NavItem[];
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

const ROLE_LABELS = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
} as const;

// Lab 3 Issue 4: navigation is role-aware (FR-12) — each role only sees the
// destinations it may use. The server still enforces every route; hiding a
// button is feedback, not security.
export default function AppShell({ children, navItems, activeView, onNavigate }: AppShellProps) {
  const { user, logout } = useAuth();

  return (
    <div>
      <header
        className="d-flex flex-wrap justify-content-between align-items-center px-4 py-3 text-white gap-2"
        style={{ backgroundColor: "#006B3C" }}
      >
        <div className="d-flex align-items-center gap-4">
          <span className="fw-semibold">TokTickIT</span>
          <nav className="d-flex gap-2" aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                key={item.view}
                className={`btn btn-sm ${activeView === item.view ? "btn-light" : "btn-outline-light"}`}
                aria-current={activeView === item.view ? "page" : undefined}
                onClick={() => onNavigate(item.view)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span>{user?.name}</span>
          {user && (
            <span className="badge bg-light text-success-emphasis">{ROLE_LABELS[user.role]}</span>
          )}
          <button className="btn btn-sm btn-outline-light" onClick={() => logout()}>
            Logout
          </button>
        </div>
      </header>
      <main className="container py-4">{children}</main>
    </div>
  );
}
