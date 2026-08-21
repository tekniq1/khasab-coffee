import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Currency = "YER" | "SAR";

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  toggle: () => void;
  /** format a dual price */
  price: (p: { yer: number; sar: number }) => string;
};

const CurrencyCtx = createContext<Ctx | null>(null);
const KEY = "khasab-currency";

const nf = new Intl.NumberFormat("ar-YE", { maximumFractionDigits: 0 });

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("YER");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "YER" || saved === "SAR") setCurrency(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, currency);
  }, [currency]);

  const value = useMemo<Ctx>(
    () => ({
      currency,
      setCurrency,
      toggle: () => setCurrency((c) => (c === "YER" ? "SAR" : "YER")),
      price: (p) =>
        currency === "YER"
          ? `${nf.format(Math.round(p.yer))} ريال يمني`
          : `${nf.format(Math.round(p.sar))} ريال سعودي`,
    }),
    [currency],
  );

  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
