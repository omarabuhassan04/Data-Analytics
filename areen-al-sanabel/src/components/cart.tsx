"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  itemId: number;
  name: string;
  unit: string;
  /** الكمية المتاحة وقت الإضافة — للتحقق المبدئي في الواجهة فقط */
  available: number;
  quantity: number;
  note?: string;
};

type CartApi = {
  lines: CartLine[];
  count: number;
  totalUnits: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (itemId: number, quantity: number) => void;
  setNote: (itemId: number, note: string) => void;
  remove: (itemId: number) => void;
  clear: () => void;
  has: (itemId: number) => boolean;
};

const CartContext = createContext<CartApi | null>(null);

const STORAGE_KEY = "areen.cart.v1";

type StoredCart = { userId: number; lines: CartLine[] };

export function CartProvider({
  userId,
  children,
}: {
  userId: number;
  children: ReactNode;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // استعادة السلة من التخزين المحلي، مع تجاهلها إذا كانت تعود لمستخدم آخر
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredCart;
        if (stored.userId === userId && Array.isArray(stored.lines)) {
          setLines(stored.lines);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: StoredCart = { userId, lines };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [lines, userId, hydrated]);

  const add = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((entry) => entry.itemId === line.itemId);
      if (existing) {
        return current.map((entry) =>
          entry.itemId === line.itemId
            ? { ...entry, ...line, quantity: entry.quantity + quantity }
            : entry,
        );
      }
      return [...current, { ...line, quantity }];
    });
  }, []);

  const setQuantity = useCallback((itemId: number, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((entry) => entry.itemId !== itemId)
        : current.map((entry) =>
            entry.itemId === itemId ? { ...entry, quantity } : entry,
          ),
    );
  }, []);

  const setNote = useCallback((itemId: number, note: string) => {
    setLines((current) =>
      current.map((entry) => (entry.itemId === itemId ? { ...entry, note } : entry)),
    );
  }, []);

  const remove = useCallback((itemId: number) => {
    setLines((current) => current.filter((entry) => entry.itemId !== itemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartApi>(
    () => ({
      lines,
      count: lines.length,
      totalUnits: lines.reduce((sum, line) => sum + line.quantity, 0),
      add,
      setQuantity,
      setNote,
      remove,
      clear,
      has: (itemId: number) => lines.some((line) => line.itemId === itemId),
    }),
    [lines, add, setQuantity, setNote, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart يجب أن يُستخدم داخل CartProvider");
  return context;
}
