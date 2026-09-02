import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/lib/currency";

type AddToCartModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    image: string;
    variantLabel: string;
    priceYer: number;
    priceSar: number;
  };
};

export function AddToCartModal({ isOpen, onClose, product }: AddToCartModalProps) {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckoutClick = () => {
    onClose();
    if (user) {
      navigate({ to: "/checkout" });
    } else {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
    }
  };

  const displayPrice =
    currency === "YER" ? formatPrice(product.priceYer) : `${product.priceSar} ريال سعودي`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h2 className="mt-4 text-xl font-extrabold text-primary">تمت الإضافة إلى السلة بنجاح</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          اختر الخطوة التالية لمتابعة تجربة التسوق
        </p>

        <div className="mt-5 flex items-center gap-4 rounded-2xl border bg-muted/40 p-3 text-start">
          <img
            src={product.image}
            alt={product.name}
            className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
          />
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-sm text-primary">{product.name}</div>
            <div className="text-xs text-muted-foreground">الخيار: {product.variantLabel}</div>
            <div className="mt-1 text-xs font-bold text-secondary">{displayPrice}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleCheckoutClick}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-transform hover:scale-[1.02]"
          >
            <ShoppingBag className="h-4 w-4" /> إتمام الطلب
          </button>
          <button
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-background px-6 py-3.5 text-sm font-bold text-primary hover:bg-muted"
          >
            مواصلة الشراء <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
