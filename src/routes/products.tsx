import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageX, Sparkles } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { ProductCard } from "@/components/product-card";
import { categories, useLiveProducts, type CategoryId } from "@/lib/products";

const searchSchema = z.object({
  cat: z.enum(["coffee", "tools", "matcha", "green"]).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "متجر محمصة خصب | جميع المحاصيل والأدوات" },
      {
        name: "description",
        content: "تسوق محاصيل البن المختصة وأدوات التقطير وفلاتر الباريستا من محمصة خصب.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { cat, q } = Route.useSearch();
  const [selectedCat, setSelectedCat] = useState<CategoryId | "all">(cat ?? "all");
  const { products: liveProducts } = useLiveProducts();

  const activeItems = (liveProducts || products || []).filter((p) => p && p.isActive !== false);

  const filtered = activeItems.filter((p) => {
    if (selectedCat !== "all" && p.category !== selectedCat) return false;
    if (q && !p.name.includes(q) && !p.short.includes(q)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-black text-primary sm:text-4xl">متجر محمصة خصب</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          اختر محصولك المفضل وعدتك الاحترافية لتحضير أفضل كوب قهوة
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setSelectedCat("all")}
          className={`rounded-full px-5 py-2.5 text-xs font-bold transition-colors ${
            selectedCat === "all"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card border hover:bg-muted"
          }`}
        >
          جميع المنتجات
        </button>

        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={`rounded-full px-5 py-2.5 text-xs font-bold transition-colors ${
              selectedCat === c.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border hover:bg-muted"
            }`}
          >
            {c.name}
            {(c.id === "matcha" || c.id === "green") && (
              <span className="ms-1.5 rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] text-secondary">
                قريباً
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Product Grid / Empty State */}
      <div className="mt-10">
        {filtered.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border bg-card p-10 text-center shadow-xs">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary/15 text-secondary">
              <PackageX className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-primary">لا تتوفر منتجات في هذا القسم حالياً</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              نعمل على توفير تشكيلة جديدة وفائقة الجودة قريباً في قسم{" "}
              <span className="font-bold text-primary">
                {categories.find((c) => c.id === selectedCat)?.name || "المنتجات"}
              </span>
              . تابعنا ليصلك كل جديد!
            </p>
            <div className="mt-6">
              <button
                onClick={() => setSelectedCat("all")}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4 text-secondary" /> تصفح جميع المنتجات المتاحة
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {filtered.map((prod, i) => (
              <ProductCard key={prod.slug} product={prod} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
