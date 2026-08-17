"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  IconApproved,
  IconClose,
  IconInfo,
  IconWhistle,
} from "@/components/icons";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_STYLES: Record<ToastKind, { className: string; icon: ReactNode }> = {
  success: {
    className: "border-forest-200 bg-forest-50 text-forest-700",
    icon: <IconApproved className="size-5 shrink-0 text-forest-600" />,
  },
  error: {
    className: "border-crimson-200 bg-crimson-50 text-crimson-700",
    icon: <IconWhistle className="size-5 shrink-0 text-crimson-600" />,
  },
  info: {
    className: "border-ember-200 bg-ember-50 text-ember-700",
    icon: <IconInfo className="size-5 shrink-0 text-ember-600" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { id, kind, message }]);
      // رسائل الخطأ تبقى مدّة أطول لأنها غالبًا تحتاج قراءة متأنّية
      window.setTimeout(() => dismiss(id), kind === "error" ? 6500 : 3800);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:end-6 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg shadow-ink-900/5",
                TOAST_STYLES[toast.kind].className,
              )}
            >
              {TOAST_STYLES[toast.kind].icon}
              <p className="flex-1 text-sm font-semibold leading-relaxed">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="إغلاق التنبيه"
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
              >
                <IconClose className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast يجب أن يُستخدم داخل ToastProvider");
  return context;
}
