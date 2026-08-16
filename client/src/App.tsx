import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

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
        <div className="mt-3">
          <p className="mb-2">
            <strong>System Status:</strong> <span className="text-success">Online</span>
          </p>
          <p className="mb-1 fw-semibold">Supported Request Categories</p>
          <ul className="mb-0">
            {categories.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        </div>
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