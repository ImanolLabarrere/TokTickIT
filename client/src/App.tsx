import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  void categories; // TODO(Issue 4): render this list once /api/categories exists.

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to connect to TokTickIT API");
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <p className="mt-3 text-muted">⏳ Checking system status…</p>
      )}

      {state === "success" && (
        <p className="mt-3 mb-0">
          <strong>System Status:</strong> <span className="text-success">Online</span>
        </p>
        // TODO(Issue 4): render the "Supported Request Categories" list here.
      )}

      {state === "error" && (
        <div className="mt-3">
          <p className="mb-1">
            <strong>System Status:</strong> <span className="text-danger">Offline</span>
          </p>
          <p className="text-danger mb-0">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}