import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/lib/currency";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/my-orders")({
  head: () => ({
    meta: [
      { title: "طلباتي — محمصة خصب" },
      { name: "description", content: "تابع حالة طلباتك من محمصة خصب للقهوة المختصة." },
    ],
  }),
  component: MyOrdersPage,
});

const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
  pending: {
    label: "بانتظار التحقق",
    icon: Clock,
    cls: "bg-amber-500/15 text-amber-700 border-amber-300",
  },
  confirmed: {
    label: "تم تأكيد الطلب",
    icon: CheckCircle2,
    cls: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  },
  processing: {
    label: "قيد التحضير والتجهيز",
    icon: Package,
    cls: "bg-purple-500/15 text-purple-700 border-purple-300",
  },
  shipped: {
    label: "جاري التوصيل",
    icon: Truck,
    cls: "bg-blue-500/15 text-blue-700 border-blue-300",
  },
  delivered: {
    label: "تم التسليم بنجاح ✓",
    icon: CheckCircle2,
    cls: "bg-primary/15 text-primary border-primary/30",
  },
  cancelled: {
    label: "ملغي",
    icon: XCircle,
    cls: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

const statusSteps = ["pending", "confirmed", "processing", "shipped", "delivered"];

function MyOrdersPage() {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/my-orders" } });
        return;
      }
      setUser(data.user);
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });
      setOrders(ordersData ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-bold text-primary">جارِ تحميل طلباتك…</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary/15 text-secondary">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-primary">لا توجد طلبات بعد</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          لم تقم بأي طلب حتى الآن، ابدأ رحلتك مع محمصة خصب!
        </p>
        <Link
          to="/products"
          search={{}}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-md"
        >
          <ShoppingBag className="h-4 w-4" /> تصفح المتجر الآن
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">طلباتي</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مرحباً {user?.user_metadata?.full_name?.split(" ")[0] || "بك"} — لديك {orders.length} طلب
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const status = statusConfig[order.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          const isExpanded = expandedOrder === order.id;
          const currentStepIndex =
            order.status === "cancelled" ? -1 : statusSteps.indexOf(order.status);
          const items: any[] = Array.isArray(order.items) ? order.items : [];

          return (
            <div key={order.id} className="overflow-hidden rounded-3xl border bg-card shadow-xs">
              {/* Order Header */}
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-black text-primary tracking-wider">
                        {order.code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${status.cls}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("ar-YE", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {" · "}
                      {order.delivery_method}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="text-lg font-black text-primary">
                      {currency === "YER"
                        ? formatPrice(order.total_yer ?? 0)
                        : `${order.total_sar ?? 0} ريال سعودي`}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{items.length} منتج</div>
                  </div>
                </div>

                {/* Progress Bar (non-cancelled) */}
                {order.status !== "cancelled" && (
                  <div className="mt-4">
                    <div className="flex items-center gap-1">
                      {statusSteps.map((step, idx) => {
                        const isDone = idx <= currentStepIndex;
                        const isActive = idx === currentStepIndex;
                        return (
                          <div key={step} className="flex flex-1 items-center gap-1">
                            <div
                              className={`h-2 flex-1 rounded-full transition-all ${
                                isDone ? "bg-primary" : "bg-muted"
                              }`}
                            />
                            {idx === statusSteps.length - 1 && (
                              <div
                                className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                                  isActive
                                    ? "border-primary bg-primary"
                                    : isDone
                                      ? "border-primary bg-primary/20"
                                      : "border-muted"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground font-bold">
                      <span>بانتظار التحقق</span>
                      <span>جاري التوصيل</span>
                      <span>تم التسليم</span>
                    </div>
                  </div>
                )}

                {/* Tracking Note from Admin */}
                {order.tracking_note && (
                  <div className="mt-3 rounded-2xl border border-secondary/30 bg-secondary/10 p-3 text-xs">
                    <span className="font-bold text-secondary">ملاحظة من المحمصة: </span>
                    <span className="text-primary">{order.tracking_note}</span>
                  </div>
                )}

                {/* Expand Toggle */}
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl border bg-muted/40 py-2 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" /> إخفاء تفاصيل الطلب
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" /> عرض تفاصيل الطلب ({items.length} منتج)
                    </>
                  )}
                </button>
              </div>

              {/* Order Items (Expanded) */}
              {isExpanded && (
                <div className="border-t bg-muted/20 px-5 py-4 space-y-3">
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-bold text-primary truncate">{item.name}</div>
                        {item.options && (
                          <div className="text-xs text-muted-foreground">{item.options}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-end">
                        <div className="font-bold text-sm">
                          {currency === "YER"
                            ? formatPrice((item.price_yer ?? item.price ?? 0) * item.qty)
                            : `${((item.price_sar ?? 0) * item.qty).toLocaleString()} ريال سعودي`}
                        </div>
                        <div className="text-[11px] text-muted-foreground">× {item.qty}</div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex items-center justify-between font-extrabold text-primary">
                    <span>الإجمالي</span>
                    <span>
                      {currency === "YER"
                        ? formatPrice(order.total_yer ?? 0)
                        : `${order.total_sar ?? 0} ريال سعودي`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/products"
          search={{}}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-6 py-3 text-sm font-bold text-primary hover:bg-muted"
        >
          <ArrowRight className="h-4 w-4" /> متابعة التسوق
        </Link>
      </div>
    </div>
  );
}
