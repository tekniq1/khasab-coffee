import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { AddToCartModal } from "@/components/add-to-cart-modal";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { findProduct, grindOptions, products, useLiveProducts, type Product } from "@/lib/products";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: ({ loaderData }) => {
    const p = loaderData ? findProduct(loaderData.slug) : null;
    return {
      meta: [
        { title: p ? `${p.name} — محمصة خصب` : "محمصة خصب | متجر القهوة المختصة" },
        { name: "description", content: p ? p.short : "محصول قهوة مختصة أو أداة باريستا من محمصة خصب." },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useLoaderData();
  const { products: liveProducts } = useLiveProducts();
  const { add } = useCart();
  const { price } = useCurrency();

  const product = liveProducts.find((p) => p.slug === slug) || findProduct(slug);

  const [grind, setGrind] = useState(grindOptions[0]!);
  const [variant, setVariant] = useState(product?.variants?.[0] || { label: "قطعة", yer: 9000, sar: 22 });
  const [qty, setQty] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

  useEffect(() => {
    if (product) {
      if (product.variants?.[0]) setVariant(product.variants[0]);
      setSelectedImage(product.image || product.images?.[0] || "");
    }
  }, [product]);

  if (!product) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-primary">المنتج غير موجود</h1>
        <p className="mt-2 text-sm text-muted-foreground">عذراً، لم نتمكن من العثور على هذا المنتج أو ربما تم حذفه.</p>
        <Link
          to="/products"
          search={{}}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md"
        >
          <ArrowRight className="h-4 w-4" /> العودة لمتجر المنتجات
        </Link>
      </div>
    );
  }

  const allImages = product.images && product.images.length > 0 ? product.images : [product.image];
  const currentImg = selectedImage || product.image || allImages[0];
  const related = (liveProducts || products).filter((p) => p.category === product.category && p.slug !== product.slug);

  const onAdd = () => {
    add({
      slug: product.slug,
      name: product.name,
      image: currentImg,
      price: variant.yer,
      priceSar: variant.sar,
      qty,
      options: product.isCoffee ? `${grind} • ${variant.label}` : variant.label,
    });
    setModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Images & Gallery */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-3xl border bg-sand aspect-square flex items-center justify-center shadow-xs"
          >
            <img src={currentImg} alt={product.name} className="h-full w-full object-cover" />
          </motion.div>

          {/* Thumbnails Gallery if multiple images exist */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto p-1">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                    currentImg === img ? "border-primary scale-105 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`${product.name} - ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">{product.name}</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{product.description || product.short}</p>
          <div className="mt-4 text-2xl font-extrabold">{price(variant)}</div>

          <div className="mt-6 space-y-5">
            {product.isCoffee && (
              <div>
                <div className="mb-2 text-sm font-bold">درجة الطحن</div>
                <div className="flex flex-wrap gap-2">
                  {grindOptions.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrind(g)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                        grind === g ? "bg-primary text-primary-foreground" : "bg-card"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.variants && product.variants.length > 1 && (
              <div>
                <div className="mb-2 text-sm font-bold">{product.isCoffee ? "الوزن / الحجم" : "الخيار"}</div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.label}
                      onClick={() => setVariant(v)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                        variant.label === v.label ? "bg-primary text-primary-foreground shadow-sm" : "bg-card"
                      }`}
                    >
                      {v.label} ({price(v)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.isCoffee && (
              <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm sm:grid-cols-3">
                <Info label="المنشأ" value={product.origin} />
                <Info label="المعالجة" value={product.process} />
                <Info label="الوزن المختار" value={variant.label} />
              </div>
            )}

            {product.notes && product.notes.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-bold">إيحاءات النكهة</div>
                <div className="flex flex-wrap gap-2">
                  {product.notes.map((n) => (
                    <span
                      key={n}
                      className="rounded-full bg-secondary/15 px-3.5 py-1 text-xs font-semibold text-secondary"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {product.specs && product.specs.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
              <div className="bg-muted px-4 py-2 text-sm font-bold text-primary">المواصفات</div>
              <table className="w-full text-sm">
                <tbody>
                  {product.specs.map((s) => (
                    <tr key={s.label} className="border-t">
                      <td className="px-4 py-3 text-muted-foreground">{s.label}</td>
                      <td className="px-4 py-3 font-semibold">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center rounded-full border bg-card">
              <button 
                className="px-4 py-2 text-lg disabled:opacity-50" 
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={product.stockQuantity !== undefined && product.stockQuantity <= 0}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-bold">{qty}</span>
              <button 
                className="px-4 py-2 text-lg disabled:opacity-50" 
                onClick={() => setQty((q) => q + 1)}
                disabled={product.stockQuantity !== undefined && product.stockQuantity <= 0}
              >
                +
              </button>
            </div>
            <motion.button
              whileTap={product.stockQuantity !== undefined && product.stockQuantity <= 0 ? {} : { scale: 0.95 }}
              onClick={onAdd}
              disabled={product.stockQuantity !== undefined && product.stockQuantity <= 0}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold shadow-[var(--shadow-soft)] ${
                product.stockQuantity !== undefined && product.stockQuantity <= 0
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {product.stockQuantity !== undefined && product.stockQuantity <= 0 ? (
                "نفدت الكمية"
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  أضف إلى السلة
                </>
              )}
            </motion.button>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-secondary" /> شحن سريع خلال 24 ساعة
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-secondary" /> محاصيل محمّصة أسبوعياً
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-secondary" /> تحويل بنكي / استلام من النقطة
            </span>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-primary">منتجات مشابهة</h2>
            <Link to="/products" search={{}} className="text-sm font-semibold text-secondary">
              كل المنتجات
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.slice(0, 4).map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      <AddToCartModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={{
          name: product.name,
          image: currentImg,
          variantLabel: product.isCoffee ? `${grind} • ${variant.label}` : variant.label,
          priceYer: variant.yer * qty,
          priceSar: variant.sar * qty,
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value ?? "—"}</div>
    </div>
  );
}
