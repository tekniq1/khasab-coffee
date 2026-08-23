import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Coffee, ShieldCheck, Truck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { heroBanners, products, useLiveProducts } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "محمصة خصب | متجر القهوة المختصة — محاصيل وآلات وأدوات" },
      {
        name: "description",
        content:
          "محمصة خصب: متجر القهوة المختصة. آلات إسبريسو، مطاحن احترافية، أدوات تقطير، فلاتر، ومحاصيل بن مختارة مع توصيل سريع.",
      },
      { property: "og:title", content: "محمصة خصب | متجر القهوة المختصة" },
      {
        property: "og:description",
        content: "مو بس محصولك.. عدّتك علينا — كل أدوات القهوة اللي تحتاجها بجودة ترفع تجربتك.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeBanner, setActiveBanner] = useState(0);
  const { products: liveProducts } = useLiveProducts();

  // Auto slide hero banners
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const activeItems = (liveProducts || products || []).filter((p) => p && p.isActive !== false);
  const bestSellers = activeItems.filter((x) => x.bestSeller);
  const displayProducts = bestSellers.length > 0 ? bestSellers : activeItems.slice(0, 4);

  return (
    <div>
      {/* Dynamic Hero Banner Slider */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="relative min-h-[380px] sm:min-h-[460px] md:min-h-[520px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanner}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 z-0"
            >
              <img
                src={heroBanners[activeBanner]!.image}
                alt={heroBanners[activeBanner]!.title}
                className="h-full w-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent" />
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 w-full">
            <motion.div
              key={`text-${activeBanner}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl"
            >
              <span className="inline-block rounded-full bg-secondary/20 px-4 py-1.5 text-xs font-bold text-secondary border border-secondary/30">
                قهوة مختصة • أدوات باريستا • تحميص طازج
              </span>
              <h1 className="mt-4 text-3xl leading-tight font-black sm:text-5xl lg:text-6xl text-white">
                {heroBanners[activeBanner]!.title}
              </h1>
              <p className="mt-4 text-sm leading-7 text-primary-foreground/80 sm:text-base">
                {heroBanners[activeBanner]!.desc}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/products"
                  search={{}}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-7 py-3.5 text-sm font-bold text-secondary-foreground shadow-lg transition-transform hover:scale-[1.03]"
                >
                  تسوق الآن <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/products"
                  search={{ cat: "coffee" }}
                  className="rounded-full border border-white/20 bg-white/10 backdrop-blur-xs px-7 py-3.5 text-sm font-bold text-white hover:bg-white/20"
                >
                  محاصيل البن المختصة
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Slider controls */}
          <div className="absolute bottom-6 start-4 z-20 flex items-center gap-2 sm:start-8">
            <button
              onClick={() => setActiveBanner((prev) => (prev - 1 + heroBanners.length) % heroBanners.length)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur-xs transition-colors hover:bg-white/20"
              title="السابق"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveBanner((prev) => (prev + 1) % heroBanners.length)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur-xs transition-colors hover:bg-white/20"
              title="التالي"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="ms-3 flex items-center gap-1.5">
              {heroBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveBanner(idx)}
                  className={`h-2 rounded-full transition-all ${
                    activeBanner === idx ? "w-6 bg-secondary" : "w-2 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
        {[
          { icon: Truck, t: "توصيل سريع", d: "خلال 24 ساعة داخل عدن وبقية المحافظات" },
          { icon: Coffee, t: "تحميص طازج", d: "محاصيل تُحمّص طازجة أسبوعياً" },
          { icon: ShieldCheck, t: "منتجات أصلية 100%", d: "ضمان الجودة العالية على كافة المنتجات" },
        ].map((f, i) => (
          <motion.div
            key={f.t}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="glass-card flex items-center gap-4 rounded-3xl p-5"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-primary">{f.t}</div>
              <div className="text-xs text-muted-foreground">{f.d}</div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Best Sellers Section (المنتجات الأكثر مبيعاً) */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">مختارات خصب المميزة</span>
            <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">المنتجات الأكثر مبيعاً</h2>
          </div>
          <Link to="/products" search={{}} className="text-sm font-bold text-secondary hover:underline">
            عرض كل المنتجات
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {displayProducts.map((prod, i) => (
            <ProductCard key={prod.slug} product={prod} index={i} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div
          className="overflow-hidden rounded-[2.5rem] p-10 text-center text-primary-foreground shadow-2xl relative"
          style={{ background: "var(--gradient-deep)" }}
        >
          <div className="relative z-10">
            <h2 className="text-2xl font-extrabold sm:text-4xl text-white">جاهز ترفع مستوى كوب القهوة؟</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80 leading-7">
              اختر محصولك المفضل وعدّتك الاحترافية من محمصة خصب، وخلّ الباقي علينا.
            </p>
            <Link
              to="/products"
              search={{}}
              className="mt-7 inline-block rounded-full bg-secondary px-8 py-3.5 text-sm font-bold text-secondary-foreground shadow-lg transition-transform hover:scale-[1.03]"
            >
              ابدأ التسوق الآن
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
