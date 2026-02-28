"use client";

import { useState, useEffect } from "react";

function useLocalState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialize state with localStorage value if available (client-side only)
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue; // Server-side: use initialValue
    }
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue !== null
        ? (JSON.parse(storedValue) as T)
        : initialValue;
    } catch (error) {
      console.error("Error reading localStorage key “" + key + "”: ", error);
      return initialValue;
    }
  });

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Error setting localStorage key “" + key + "”: ", error);
    }
  }, [key, state]);

  return [state, setState];
}

export default useLocalState;
