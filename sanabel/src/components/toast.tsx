"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AlertIcon, CheckIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

type Toast = { id: number; text: string; tone: "ok" | "bad" };

const ToastContext = createContext<{
  notify: (text: string, tone?: "ok" | "bad") => void;
} | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast يجب أن يُستخدم داخل ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((text: string, tone: "ok" | "bad" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text, tone }]);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        // منطقة حيّة: قارئ الشاشة يعلن الرسالة دون نقل التركيز
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastRow
            key={toast.id}
            toast={toast}
            onDone={() =>
              setToasts((current) => current.filter((t) => t.id !== toast.id))
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 5000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={cn(
        "enter pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-pop",
        toast.tone === "ok"
          ? "bg-forest-700 text-white"
          : "bg-danger-500 text-white",
      )}
    >
      {toast.tone === "ok" ? (
        <CheckIcon className="mt-0.5 size-4" />
      ) : (
        <AlertIcon className="mt-0.5 size-4" />
      )}
      <p className="flex-1">{toast.text}</p>
      <button
        type="button"
        onClick={onDone}
        aria-label="إغلاق التنبيه"
        className="rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
