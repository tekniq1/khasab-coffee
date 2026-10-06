import { Link } from "@tanstack/react-router";
import { Ban, ChevronLeft, ChevronRight, MoreVertical, Plus, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";

import { AddToCartModal } from "@/components/add-to-cart-modal";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { type Product } from "@/lib/products";

const stockOf = (p: Product) => {
  const base = p.variants[0];
  return base?.stock !== undefined ? base.stock : (p.stockQuantity ?? 50);
};

/** Compact card used inside horizontal category rows. */
function CompactProductCard({ product }: { product: Product }) {
  const { price } = useCurrency();
  const { add } = useCart();
  const [modalOpen, setModalOpen] = useState(false);

  const base = product.variants[0]!;
  const stock = stockOf(product);
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && stock <= (product.lowStockThreshold ?? 5);
  // Products with several sizes or grind options need the product page to choose — show "⋮" instead of "+".
  const needsOptions = product.variants.length > 1 || !!product.isCoffee;

  const quickAdd = (e: React.MouseEvent) => {
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
      maxStock: stock,
    });
    setModalOpen(true);
  };

  return (
    <>
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="group flex h-full w-[44vw] max-w-[230px] min-w-[150px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow hover:shadow-md sm:w-[210px]"
      >
        <div className="relative aspect-square overflow-hidden bg-muted/40">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              isOutOfStock ? "opacity-60 grayscale-[40%]" : ""
            }`}
          />

          {isLowStock && (
            <span className="absolute top-2 start-2 inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2 py-1 text-[10px] font-bold text-white shadow">
              <Zap className="h-3 w-3" /> كمية محدودة
            </span>
          )}
          {!isLowStock && !isOutOfStock && product.badge && (
            <span className="absolute top-2 start-2 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground shadow">
              {product.badge}
            </span>
          )}

          {isOutOfStock ? (
            <span className="absolute inset-x-0 bottom-2 mx-auto inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full border border-destructive/40 bg-white px-2.5 py-1 text-[10px] font-bold text-destructive shadow">
              <Ban className="h-3 w-3" /> نفد من المخزون
            </span>
          ) : needsOptions ? (
            <span
              className="absolute bottom-2 start-2 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md"
              title="اختر الخيارات"
            >
              <MoreVertical className="h-4 w-4" />
            </span>
          ) : (
            <button
              type="button"
              onClick={quickAdd}
              className="absolute bottom-2 start-2 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 active:scale-95"
              title="إضافة إلى السلة"
              aria-label={`إضافة ${product.name} إلى السلة`}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-2 p-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-6 text-foreground">
            {product.name}
          </h3>
          <span className="text-sm font-extrabold text-primary">{price(base)}</span>
        </div>
      </Link>

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

/** One home-page section: title + "عرض الكل" + horizontally scrolling products. */
export function CategoryRow({
  categoryId,
  title,
  products,
}: {
  categoryId: string;
  title: string;
  products: Product[];
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // In-stock first, sold-out at the end of the row.
  const sorted = [...products].sort((a, b) => Number(stockOf(a) <= 0) - Number(stockOf(b) <= 0));

  // RTL: "next" moves visually to the left (negative scrollLeft).
  const scroll = (dir: "next" | "prev") => {
    const el = scroller.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "next" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45 }}
      className="border-b border-border/60 bg-background py-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3 px-4">
          <h2 className="text-lg font-extrabold text-foreground sm:text-2xl">{title}</h2>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 md:flex">
              <button
                type="button"
                onClick={() => scroll("prev")}
                className="grid h-8 w-8 place-items-center rounded-full border bg-card text-primary transition-colors hover:bg-muted"
                aria-label="السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll("next")}
                className="grid h-8 w-8 place-items-center rounded-full border bg-card text-primary transition-colors hover:bg-muted"
                aria-label="التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <Link
              to="/products"
              search={{ cat: categoryId }}
              className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              عرض الكل <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div
          ref={scroller}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2"
        >
          {sorted.map((p) => (
            <CompactProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
