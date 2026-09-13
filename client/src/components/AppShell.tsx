import { ReactNode } from "react";
import { useRequester } from "../context/RequesterContext.js";

export type AppView = "my-tickets" | "create-ticket";

interface AppShellProps {
  children: ReactNode;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export default function AppShell({ children, activeView, onNavigate }: AppShellProps) {
  const { currentRequester, changeRequester } = useRequester();

  return (
    <div>
      <header
        className="d-flex flex-wrap justify-content-between align-items-center px-4 py-3 text-white gap-2"
        style={{ backgroundColor: "#006B3C" }}
      >
        <div className="d-flex align-items-center gap-4">
          <span className="fw-semibold">TokTickIT</span>
          <nav className="d-flex gap-2" aria-label="Main navigation">
            <button
              className={`btn btn-sm ${activeView === "my-tickets" ? "btn-light" : "btn-outline-light"}`}
              aria-current={activeView === "my-tickets" ? "page" : undefined}
              onClick={() => onNavigate("my-tickets")}
            >
              My Tickets
            </button>
            <button
              className={`btn btn-sm ${activeView === "create-ticket" ? "btn-light" : "btn-outline-light"}`}
              aria-current={activeView === "create-ticket" ? "page" : undefined}
              onClick={() => onNavigate("create-ticket")}
            >
              Create Ticket
            </button>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span>{currentRequester?.name}</span>
          <button className="btn btn-sm btn-outline-light" onClick={changeRequester}>
            Change Requester
          </button>
        </div>
      </header>
      <main className="container py-4">{children}</main>
    </div>
  );
}
