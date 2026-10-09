import { Link } from "@tanstack/react-router";
import { Edit, ShoppingBag, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { AddToCartModal } from "@/components/add-to-cart-modal";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { type Product } from "@/lib/products";
import { supabase } from "@/lib/supabase";

export function ProductCard({
  product,
  index = 0,
  variant = "grid",
}: {
  product: Product;
  index?: number;
  variant?: "grid" | "scroll";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const { price } = useCurrency();
  const { add } = useCart();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin (for showing edit/delete buttons)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const ownerEmails = ["tekniq1011@gmail.com", "gfyhhgftyj@gmail.com"];
      if (
        ownerEmails.includes(data.user.email ?? "") ||
        data.user.user_metadata?.["role"] === "admin"
      ) {
        setIsAdmin(true);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle()
        .then(({ data: roleData }: { data: { role: string } | null }) => {
          if (roleData?.role === "admin") setIsAdmin(true);
        });
    });
  }, []);

  // Default variant (first one)
  const base = product.variants[0]!;

  // Per-variant stock: use base.stock if available, fallback to product.stockQuantity
  const baseStock = base.stock !== undefined ? base.stock : (product.stockQuantity ?? 50);
  const isOutOfStock = baseStock <= 0;
  const isLowStock = !isOutOfStock && baseStock <= (product.lowStockThreshold ?? 5);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 10, y: px * 12 });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    add({
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: base.yer,
      priceSar: base.sar,
      qty: 1,
      options: base.label,
      maxStock: baseStock,
    });
    setModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`هل أنت متأكد من حذف "${product.name}" نهائياً؟`)) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("products").delete().eq("slug", product.slug);
      if (error) throw error;
      window.location.reload();
    } catch {
      alert("تعذر حذف المنتج");
    }
  };

  /* ─────────────────────────────────────────────
     SCROLL VARIANT — compact horizontal-scroll card
  ───────────────────────────────────────────── */
  if (variant === "scroll") {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: Math.min(index * 0.07, 0.35) }}
          className="w-44 shrink-0 sm:w-52"
        >
          <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
            {/* Image area */}
            <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
              <div className="relative aspect-square overflow-hidden bg-sand">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Limited badge — top start, site secondary color */}
                {product.showLimitedBadge && (
                  <span className="absolute top-2 start-2 flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground shadow">
                    ⚡ كمية محدودة
                  </span>
                )}

                {/* Product badge — top start (only if not showing limited badge) */}
                {product.badge && !product.showLimitedBadge && (
                  <span className="absolute top-2 start-2 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground shadow-xs">
                    {product.badge}
                  </span>
                )}

                {/* Out-of-stock overlay badge */}
                {isOutOfStock ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-black text-destructive shadow">
                      نفدت الكمية
                    </span>
                  </div>
                ) : (
                  /* Add to cart circular button — bottom end */
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="absolute bottom-2 end-2 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
                    title="إضافة إلى السلة"
                  >
                    <ShoppingBag className="h-4 w-4" />
                  </button>
                )}

                {/* Admin buttons */}
                {isAdmin && (
                  <div className="absolute top-2 end-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to="/admin"
                      onClick={(e) => e.stopPropagation()}
                      className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-primary shadow-md hover:bg-white"
                      title="تعديل المنتج"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-destructive shadow-md hover:bg-white"
                      title="حذف المنتج"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Link>

            {/* Info */}
            <Link to="/product/$slug" params={{ slug: product.slug }} className="block p-3">
              <h3 className="line-clamp-2 text-sm font-bold leading-snug text-primary">
                {product.name}
              </h3>
              <p className="mt-1.5 text-sm font-extrabold text-secondary">{price(base)}</p>
            </Link>
          </div>
        </motion.div>

        <AddToCartModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          product={{
            name: product.name,
            image: product.image,
            variantLabel: base.label,
            priceYer: base.yer,
            priceSar: base.sar,
          }}
        />
      </>
    );
  }

  /* ─────────────────────────────────────────────
     GRID VARIANT — default full card (unchanged)
  ───────────────────────────────────────────── */
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.4) }}
        style={{ perspective: 1000 }}
      >
        <div
          ref={ref}
          onMouseMove={onMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 0.25s ease-out",
          }}
          className="surface-lift group flex h-full flex-col overflow-hidden rounded-3xl border bg-card relative"
        >
          {/* Admin action buttons — only visible when logged in as admin */}
          {isAdmin && (
            <div className="absolute top-2 end-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link
                to="/admin"
                onClick={(e) => e.stopPropagation()}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-primary shadow-md hover:bg-white"
                title="تعديل المنتج"
              >
                <Edit className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-destructive shadow-md hover:bg-white"
                title="حذف المنتج"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <Link to="/product/$slug" params={{ slug: product.slug }} className="block flex-1">
            <div className="relative aspect-4/5 overflow-hidden bg-sand">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {product.badge && (
                <span className="absolute top-3 start-3 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground shadow-xs">
                  {product.badge}
                </span>
              )}
              {/* Low stock badge — orange pill top-start (only if not showing product.badge) */}
              {product.showLimitedBadge && !product.badge && (
                <span className="absolute top-3 start-3 flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold text-secondary-foreground shadow">
                  ⚡ كمية محدودة
                </span>
              )}
              {product.showLimitedBadge && product.badge && (
                <span className="absolute top-3 start-3 flex flex-col gap-1">
                  <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground shadow-xs">
                    {product.badge}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold text-secondary-foreground shadow">
                    ⚡ كمية محدودة
                  </span>
                </span>
              )}
              {/* Out-of-stock overlay badge */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-black text-destructive shadow">
                    نفدت الكمية
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-1 p-4">
              <h3 className="truncate text-base font-bold text-primary">{product.name}</h3>
              <p className="line-clamp-1 text-xs text-muted-foreground">{product.short}</p>
              <div className="flex items-center gap-1.5 pt-2">
                <span className="text-sm font-extrabold text-foreground">{price(base)}</span>
                <span className="text-[11px] text-muted-foreground">/ {base.label}</span>
              </div>
            </div>
          </Link>

          <div className="px-4 pb-4">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold transition-colors ${
                isOutOfStock
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              {isOutOfStock ? (
                "نفدت الكمية"
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" /> إضافة إلى السلة
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      <AddToCartModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={{
          name: product.name,
          image: product.image,
          variantLabel: base.label,
          priceYer: base.yer,
          priceSar: base.sar,
        }}
      />
    </>
  );
}
