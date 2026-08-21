import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";

import { AddToCartModal } from "@/components/add-to-cart-modal";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { type Product } from "@/lib/products";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const { price } = useCurrency();
  const { add } = useCart();

  // Default variant (100g for coffee)
  const base = product.variants[0]!;

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
    add({
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: base.yer,
      priceSar: base.sar,
      qty: 1,
      options: base.label,
    });
    setModalOpen(true);
  };

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
          className="surface-lift group flex h-full flex-col overflow-hidden rounded-3xl border bg-card"
        >
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
              disabled={product.stockQuantity !== undefined && product.stockQuantity <= 0}
              onClick={handleAddToCart}
              className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold transition-colors ${
                product.stockQuantity !== undefined && product.stockQuantity <= 0
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              {product.stockQuantity !== undefined && product.stockQuantity <= 0 ? (
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
