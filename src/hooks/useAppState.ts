import { useEffect, useState } from "react";
import { DEFAULT_ITEMS, type AppState } from "@/lib/checklist";

const STORAGE_KEY = "examtrack:checklist:v1";

function defaultState(): AppState {
  return { students: [], items: DEFAULT_ITEMS, records: {} };
}

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.items)) {
          setState({ ...defaultState(), ...parsed, records: parsed.records || {} });
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  function reset() {
    setState(defaultState());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return { state, setState, reset, hydrated };
}
