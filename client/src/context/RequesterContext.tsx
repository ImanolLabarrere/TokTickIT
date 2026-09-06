import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getRequesters, Requester } from "../api.js";

const STORAGE_KEY = "toktickit.selectedRequesterId";

interface RequesterContextValue {
  requesters: Requester[];
  loading: boolean;
  error: string | null;
  currentRequester: Requester | null;
  selectRequester: (id: number) => void;
  changeRequester: () => void;
  retry: () => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRequester, setCurrentRequester] = useState<Requester | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await getRequesters();
      setRequesters(list);

      // BR-07: if the previously selected id is no longer an active requester
      // (deactivated or removed), forget it and fall back to Selection.
      const storedId = sessionStorage.getItem(STORAGE_KEY);
      if (storedId) {
        const match = list.find((r) => r.id === Number(storedId));
        if (match) {
          setCurrentRequester(match);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Development Requesters.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRequester(id: number) {
    const match = requesters.find((r) => r.id === id);
    if (!match) return;
    sessionStorage.setItem(STORAGE_KEY, String(id));
    setCurrentRequester(match);
  }

  function changeRequester() {
    sessionStorage.removeItem(STORAGE_KEY);
    setCurrentRequester(null);
  }

  return (
    <RequesterContext.Provider
      value={{ requesters, loading, error, currentRequester, selectRequester, changeRequester, retry: load }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextValue {
  const ctx = useContext(RequesterContext);
  if (!ctx) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return ctx;
}
