"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ErrorDialog } from "@/components/ui/error-dialog";

interface ErrorContextType {
  showError: (message: string, title?: string) => void;
  hideError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Error");
  const [message, setMessage] = useState("");

  const showError = useCallback((msg: string, t: string = "Error") => {
    setMessage(msg);
    setTitle(t);
    setOpen(true);
  }, []);

  const hideError = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <ErrorContext.Provider value={{ showError, hideError }}>
      {children}
      <ErrorDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        message={message}
      />
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
}
