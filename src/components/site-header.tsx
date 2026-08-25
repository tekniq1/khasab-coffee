import { Link, useNavigate } from "@tanstack/react-router";
import { Globe, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Marquee } from "@/components/marquee";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { brandLogo, categories, searchProducts, useLiveProducts } from "@/lib/products";
import { useLiveStoreSettings } from "@/lib/settings";

const navLinks = [
  { to: "/", label: "الرئيسية" },
  { to: "/products", label: "المتجر" },
  { to: "/about", label: "عن المحمصة" },
];

export function SiteHeader() {
  const { count } = useCart();
  const { currency, toggle } = useCurrency();
  const { products: liveProducts } = useLiveProducts();
  const { settings } = useLiveStoreSettings();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const storeName = settings.store_name || "محمصة خصب";
  const logoSrc = settings.logo_url || brandLogo;

  const results = searchProducts(query, liveProducts);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <Marquee />
      <div className="glass-card rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="rounded-xl p-1.5 sm:p-2 text-primary transition-colors hover:bg-muted md:hidden shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">القائمة</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-8 flex flex-col gap-1 text-base">
                {navLinks.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2 font-medium text-foreground hover:bg-muted"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-4 mb-1 px-3 text-xs text-muted-foreground">التصنيفات</div>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to="/products"
                    search={{ cat: c.id }}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                  >
                    {c.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img
              src={logoSrc}
              alt={`شعار ${storeName}`}
              className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-full object-cover ring-2 ring-primary/20 bg-background"
              width={44}
              height={44}
            />
            <span className="text-sm sm:text-xl font-black tracking-tight text-primary whitespace-nowrap">
              {storeName}
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeProps={{ className: "bg-muted text-primary font-bold" }}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1.5 sm:gap-2 md:ms-0">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-full border bg-background p-2 sm:px-3.5 sm:py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary shrink-0"
              title="بحث عن منتج"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">ابحث عن منتج…</span>
            </button>

            {/* Currency Switcher */}
            <button
              onClick={toggle}
              title="تغيير العملة"
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border bg-card px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-primary transition-colors hover:bg-muted shrink-0"
            >
              <Globe className="h-3.5 w-3.5 text-secondary" />
              <span className="hidden sm:inline">{currency === "YER" ? "ريال يمني (YER)" : "ريال سعودي (SAR)"}</span>
              <span className="inline sm:hidden">{currency === "YER" ? "ر.ي" : "ر.س"}</span>
            </button>

            {/* Cart Icon */}
            <Link
              to="/cart"
              className="relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] shrink-0"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">السلة</span>
              {count > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[11px] font-bold text-secondary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl border bg-card p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Search className="h-4 w-4 text-secondary" />
                <span>البحث عن منتج في محمصة خصب</span>
              </div>
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اكتب اسم المحصول، الأداة، أو نوع القهوة…"
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
              {query.trim() === "" ? (
                <p className="text-center py-6 text-xs text-muted-foreground">
                  اكتب اسم المنتج للبدء في البحث المباشر
                </p>
              ) : results.length === 0 ? (
                <p className="text-center py-6 text-xs text-muted-foreground">
                  لم يتم العثور على نتائج تطابق "{query}"
                </p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                      navigate({ to: "/product/$slug", params: { slug: p.slug } });
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-background p-2.5 text-start hover:border-secondary transition-colors"
                  >
                    <img src={p.image} alt={p.name} className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-primary">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.short}</div>
                    </div>
                    {p.variants && p.variants[0] && (
                      <div className="text-xs font-bold text-secondary shrink-0">
                        {currency === "YER" ? `${p.variants[0].yer.toLocaleString()} ر.ي` : `${p.variants[0].sar} ر.س`}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
