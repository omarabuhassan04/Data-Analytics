"use client";

import { useReducedMotion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Ignition = {
  /** هل اشتعلت النار؟ يتحكّم بشدّة الإضاءة والمؤثّرات فقط */
  lit: boolean;
  /** هل بدأ المستخدم الإشعال بنفسه؟ يُستخدم لعرض حركة اليد مرّة واحدة */
  struck: boolean;
  ignite: () => void;
};

const IgnitionContext = createContext<Ignition | null>(null);

/** المهلة قبل الإشعال التلقائي — لا يجوز أن يكون الدخول مرهونًا بإيماءة */
const AUTO_IGNITE_MS = 2600;

export function IgnitionProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [lit, setLit] = useState(false);
  const [struck, setStruck] = useState(false);

  const ignite = useCallback(() => {
    setStruck((already) => already || true);
    setLit(true);
  }, []);

  useEffect(() => {
    // من يفضّل تقليل الحركة يرى المشهد مضاءً فورًا بلا تسلسل إشعال
    if (reduceMotion) {
      setLit(true);
      return;
    }

    // أي تفاعل من المستخدم يقدح النار مباشرةً
    const onInteract = () => ignite();
    window.addEventListener("pointerdown", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });

    // وإن لم يتفاعل، تشتعل النار وحدها بعد مهلة قصيرة
    const timer = window.setTimeout(() => setLit(true), AUTO_IGNITE_MS);

    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.clearTimeout(timer);
    };
  }, [reduceMotion, ignite]);

  const value = useMemo<Ignition>(() => ({ lit, struck, ignite }), [lit, struck, ignite]);

  return (
    <IgnitionContext.Provider value={value}>
      <div className={lit ? "lit" : undefined}>{children}</div>
    </IgnitionContext.Provider>
  );
}

export function useIgnition(): Ignition {
  const context = useContext(IgnitionContext);
  if (!context) throw new Error("useIgnition يجب أن يُستخدم داخل IgnitionProvider");
  return context;
}
