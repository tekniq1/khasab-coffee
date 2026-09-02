import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  key: string;
  slug: string;
  name: string;
  image: string;
  /** سعر الوحدة بالريال اليمني */
  price: number;
  /** سعر الوحدة بالريال السعودي */
  priceSar: number;
  qty: number;
  options?: string | undefined;
  maxStock?: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "key">) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  total: number;
  totalSar: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "khasab-cart-v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    return {
      items,
      add: (item) => {
        const key = `${item.slug}-${item.options ?? ""}`;
        setItems((prev) => {
          const found = prev.find((i) => i.key === key);
          if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + item.qty } : i));
          return [...prev, { ...item, key }];
        });
      },
      remove: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
      setQty: (key, qty) =>
        setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i))),
      clear: () => setItems([]),
      total: items.reduce((s, i) => s + i.price * i.qty, 0),
      totalSar: items.reduce((s, i) => s + i.priceSar * i.qty, 0),
      count: items.reduce((s, i) => s + i.qty, 0),
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
