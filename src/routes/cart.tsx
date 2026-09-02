import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة المشتريات — محمصة خصب" },
      { name: "description", content: "راجع منتجات سلتك وأكمل طلبك من متجر محمصة خصب للقهوة المختصة." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, remove, setQty, total, totalSar } = useCart();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleCheckout = () => {
    if (user) {
      navigate({ to: "/checkout" });
    } else {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">سلة المشتريات</h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border bg-card p-10 text-center shadow-xs">
          <p className="text-muted-foreground">سلتك فارغة حالياً</p>
          <Link
            to="/products"
            search={{}}
            className="mt-5 inline-block rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-md"
          >
            تصفح متجر محمصة خصب
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {items.map((i) => (
              <div
                key={i.key}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs"
              >
                <img
                  src={i.image}
                  alt={i.name}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate font-bold text-primary">{i.name}</div>
                  {i.options && (
                    <div className="truncate text-xs text-muted-foreground">{i.options}</div>
                  )}
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {currency === "YER" ? formatPrice(i.price) : `${i.priceSar.toLocaleString()} ريال سعودي`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center rounded-full border bg-background">
                    <button className="px-3 py-1" onClick={() => setQty(i.key, i.qty - 1)}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                    <button className="px-3 py-1" onClick={() => setQty(i.key, Math.min(i.maxStock ?? 999, i.qty + 1))}>
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(i.key)}
                    className="rounded-full p-2 text-destructive hover:bg-destructive/10"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-lg font-extrabold text-primary">
              <span>الإجمالي الكلي</span>
              <span>{currency === "YER" ? formatPrice(total) : `${totalSar} ريال سعودي`}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-center text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <ShoppingBag className="h-4 w-4" /> إتمام الطلب
            </button>
          </div>
        </>
      )}
    </div>
  );
}
