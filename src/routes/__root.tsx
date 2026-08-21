import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { CartProvider } from "@/lib/cart";
import { CurrencyProvider } from "@/lib/currency";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-bold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى عنوان آخر.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 shadow-md"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Root Error Details:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="max-w-lg w-full text-center rounded-3xl border bg-card p-8 shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          ⚠️
        </div>
        <h1 className="text-xl font-extrabold text-primary">
          تعذر تحميل الصفحة
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          حدث خطأ أثناء معالجة الصفحة:
        </p>
        <div className="mt-4 p-3 rounded-2xl bg-muted/60 text-destructive text-xs font-mono text-start break-words border max-h-48 overflow-y-auto" dir="ltr">
          {error?.message || String(error)}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border bg-background px-6 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "خصب | متجر القهوة المختصة" },
      {
        name: "description",
        content: "خصب — محاصيل بن مختصة وآلات وأدوات قهوة احترافية بتوصيل سريع.",
      },
      { property: "og:title", content: "خصب | متجر القهوة المختصة" },
      {
        property: "og:description",
        content: "مو بس محصولك.. عدّتك علينا.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;700;800&family=Tajawal:wght@400;500;700;800&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    try {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
      return () => {
        data?.subscription?.unsubscribe?.();
      };
    } catch (e) {
      console.warn("Auth subscription notice:", e);
    }
  }, [router, queryClient]);



  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <main className="flex-1">
              <Outlet />
            </main>
            <SiteFooter />
          </div>
          <Toaster position="top-center" richColors />
        </CartProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}

