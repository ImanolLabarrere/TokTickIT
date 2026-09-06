import { ReactNode } from "react";
import { useRequester } from "../context/RequesterContext.js";

export default function AppShell({ children }: { children: ReactNode }) {
  const { currentRequester, changeRequester } = useRequester();

  return (
    <div>
      <header
        className="d-flex justify-content-between align-items-center px-4 py-3 text-white"
        style={{ backgroundColor: "#006B3C" }}
      >
        <span className="fw-semibold">TokTickIT</span>
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
