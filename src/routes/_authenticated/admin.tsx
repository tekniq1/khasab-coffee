import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  DollarSign,
  Edit,
  Eye,
  EyeOff,
  Image as ImageIcon,
  LogOut,
  MapPin,
  Package,
  Phone,
  Plus,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  Download,
  Globe,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/lib/currency";
import { formatPrice, products as defaultProducts, brandLogo, fetchProductsFromSupabase, type Product } from "@/lib/products";
import {
  parseStoreSettings,
  defaultBankAccounts,
  defaultPickupAddress,
  defaultWhatsAppNumber,
  defaultStoreName,
  defaultAdenDeliveryFee,
  defaultPickupFee,
  defaultOtherDeliveryFee,
  type BankAccount,
  type StoreSettings,
} from "@/lib/settings";
import { BankLogo, availableBankOptions } from "@/components/bank-logo";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم والإدارة — محمصة خصب" },
      { name: "description", content: "إدارة متكاملة للمنتجات، المبيعات، الأرباح، والطلبات بالوقت الحقيقي لمحمصة خصب." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type OrderItem = {
  slug?: string;
  name: string;
  qty: number;
  price?: number;
  price_yer?: number;
  price_sar?: number;
  options?: string | null;
};

type Order = {
  id: string;
  code: string;
  user_id?: string | null;
  customer_name: string;
  phone: string;
  city_type?: string;
  governorate?: string;
  delivery_method?: string;
  method?: string;
  lat: number | null;
  lng: number | null;
  pickup_point?: string | null;
  notes: string | null;
  txn_ref: string;
  sender_name: string | null;
  receipt_path: string | null;
  items: OrderItem[];
  total_yer?: number;
  total_sar?: number;
  total?: number;
  cost_total_yer?: number;
  cost_total_sar?: number;
  tracking_note?: string | null;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  created_at: string;
};

const orderStatuses: { id: Order["status"]; label: string; cls: string }[] = [
  { id: "pending", label: "بانتظار التحقق", cls: "bg-amber-500/15 text-amber-700 border-amber-300" },
  { id: "confirmed", label: "مؤكد", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  { id: "processing", label: "قيد التحضير", cls: "bg-purple-500/15 text-purple-700 border-purple-300" },
  { id: "shipped", label: "جاري التوصيل", cls: "bg-blue-500/15 text-blue-700 border-blue-300" },
  { id: "delivered", label: "تم التسليم", cls: "bg-primary/15 text-primary border-primary/30" },
  { id: "cancelled", label: "ملغي", cls: "bg-destructive/15 text-destructive border-destructive/30" },
];

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"analytics" | "products" | "orders" | "customers" | "store" | "security">("analytics");
  const [realtimeActive, setRealtimeActive] = useState(false);

  // 1. RBAC Auth Query (With auto-healing for owner account)
  const rolesQuery = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const isOwner =
        userData.user.email === "tekniq1011@gmail.com" ||
        userData.user.email === "gfyhhgftyj@gmail.com" ||
        userData.user.user_metadata?.role === "admin";

      if (isOwner) {
        // Auto-heal admin role in user_roles table so Postgres RLS policies allow full CRUD
        try {
          await supabase
            .from("user_roles")
            .upsert({ user_id: userData.user.id, role: "admin" }, { onConflict: "user_id" });
        } catch {
          // ignore
        }
        return true;
      }

      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        return data?.role === "admin";
      } catch (err) {
        console.error("RBAC check error:", err);
        return false;
      }
    },
  });

  // 2. Realtime Orders Query
  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  // 3. Products Query (Sync with Supabase products table)
  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      return await fetchProductsFromSupabase();
    },
  });

  // 4. Profiles Query (Customers)
  const customersQuery = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) return [];
      return data ?? [];
    },
  });

  // 5. Store Settings Query
  const settingsQuery = useQuery({
    queryKey: ["admin-store-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return parseStoreSettings(data);
    },
  });

  // Setup Supabase Realtime Subscription for Orders, Products & Settings
  useEffect(() => {
    if (!rolesQuery.data) return;
    const chId = `admin-realtime-${Date.now()}`;
    const channel = supabase
      .channel(chId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          setRealtimeActive(true);
          toast.info(`تحديث في الطلبات (${payload.eventType})`);
          qc.invalidateQueries({ queryKey: ["admin-orders"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          setRealtimeActive(true);
          toast.info(`تحديث لحظي في المنتجات والمخزون (${payload.eventType})`);
          qc.invalidateQueries({ queryKey: ["admin-products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings" },
        () => {
          setRealtimeActive(true);
          qc.invalidateQueries({ queryKey: ["admin-store-settings"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rolesQuery.data, qc]);

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  };

  if (rolesQuery.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div className="space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-bold text-primary">جارِ التحقق من الصلاحيات والبيانات…</p>
        </div>
      </div>
    );
  }

  if (!rolesQuery.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-destructive/10 text-destructive">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold text-primary">غير مصرح بالدخول</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          حسابك لا يمتلك رتبة مدير (Admin) للوصول لوحة تحكم محمصة خصب.
        </p>
        <button
          onClick={signOut}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-xs font-bold text-primary-foreground"
        >
          تسجيل الخروج
        </button>
      </div>
    );
  }

  const { currency, setCurrency } = useCurrency();
  const allOrders = ordersQuery.data ?? [];
  const allProducts = productsQuery.data ?? [];
  const allCustomers = customersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground font-black text-lg">
            خصب
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-primary sm:text-2xl">لوحة التحكم والمخرجات (Admin Panel)</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                متصل بالمباشر (Supabase Realtime)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Currency Switcher */}
          <div className="flex items-center rounded-2xl bg-muted p-1 border">
            <button
              type="button"
              onClick={() => setCurrency("YER")}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                currency === "YER"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ريال يمني (YER)
            </button>
            <button
              type="button"
              onClick={() => setCurrency("SAR")}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                currency === "SAR"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ريال سعودي (SAR)
            </button>
          </div>

          <button
            onClick={() => {
              ordersQuery.refetch();
              productsQuery.refetch();
              toast.success("تم تحديث البيانات المباشرة");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-muted"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> تحديث البيانات
          </button>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform hover:scale-105"
          >
            <LogOut className="h-3.5 w-3.5" /> خروج
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-muted/60 p-1.5 border">
        {[
          { id: "analytics", label: "التقارير والأرباح", icon: BarChart3 },
          { id: "products", label: "المنتجات والمخزون", icon: Package },
          { id: "orders", label: "الطلبات والتتبع المباشر", icon: Truck },
          { id: "customers", label: "سجلات العملاء", icon: Users },
          { id: "store", label: "تخصيص المحتوى", icon: Sliders },
          { id: "security", label: "الصلاحيات والأمان", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                  : "text-muted-foreground hover:bg-background hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === "orders" && allOrders.filter((o) => o.status === "pending").length > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 text-[10px] text-white">
                  {allOrders.filter((o) => o.status === "pending").length}
                </span>
              )}
              {tab.id === "products" && allProducts.filter((p) => (p.stockQuantity ?? 50) <= (p.lowStockThreshold ?? 5)).length > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] text-white">
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Areas */}
      <div className="mt-6">
        {activeTab === "analytics" && <AnalyticsModule orders={allOrders} products={allProducts} customers={allCustomers} />}
        {activeTab === "products" && <ProductsModule products={allProducts} refetch={() => productsQuery.refetch()} />}
        {activeTab === "orders" && <OrdersModule orders={allOrders} refetch={() => ordersQuery.refetch()} />}
        {activeTab === "customers" && <CustomersModule customers={allCustomers} orders={allOrders} />}
        {activeTab === "store" && <StoreSettingsModule settings={settingsQuery.data} refetch={() => settingsQuery.refetch()} />}
        {activeTab === "security" && <SecurityModule customers={allCustomers} />}
      </div>
    </div>
  );
}

/* ====================================================================
   MODULE 1: Analytics & Net Profit Dashboard (التقارير والأرباح)
   ==================================================================== */
function AnalyticsModule({ orders, products, customers }: { orders: Order[]; products: Product[]; customers: any[] }) {
  const { currency } = useCurrency();
  const completedOrders = orders.filter((o) => o.status !== "cancelled");

  // Revenues and Net Profits — only confirmed/delivered orders
  const totalSalesYer = completedOrders.reduce((sum, o) => sum + (o.total_yer ?? o.total ?? 0), 0);
  const totalSalesSar = completedOrders.reduce((sum, o) => sum + (o.total_sar ?? (o.total_yer ? Math.round(o.total_yer / 400) : 0)), 0);

  // Profit = Sales - Cost (use actual cost if saved, else fallback 60% estimate)
  const totalCostYer = completedOrders.reduce((sum, o) => {
    const cost = o.cost_total_yer;
    if (cost !== null && cost !== undefined && cost > 0) return sum + cost;
    // Fallback: estimate 60% cost margin
    return sum + (o.total_yer ?? o.total ?? 0) * 0.6;
  }, 0);
  const netProfitYer = Math.max(0, totalSalesYer - totalCostYer);

  const totalCostSar = completedOrders.reduce((sum, o) => {
    const cost = o.cost_total_sar;
    if (cost !== null && cost !== undefined && cost > 0) return sum + cost;
    return sum + (o.total_sar ?? 0) * 0.6;
  }, 0);
  const netProfitSar = Math.max(0, totalSalesSar - totalCostSar);

  const isYer = currency === "YER";
  const baseSales = isYer ? totalSalesYer : totalSalesSar;
  const baseProfit = isYer ? netProfitYer : netProfitSar;

  // Chart data for daily sales
  const salesChartData = [
    { name: "الأحد", sales: Math.round(baseSales * 0.12), profit: Math.round(baseProfit * 0.12) },
    { name: "الإثنين", sales: Math.round(baseSales * 0.15), profit: Math.round(baseProfit * 0.15) },
    { name: "الثلاثاء", sales: Math.round(baseSales * 0.18), profit: Math.round(baseProfit * 0.18) },
    { name: "الأربعاء", sales: Math.round(baseSales * 0.22), profit: Math.round(baseProfit * 0.22) },
    { name: "الخميس", sales: Math.round(baseSales * 0.25), profit: Math.round(baseProfit * 0.25) },
    { name: "الجمعة", sales: Math.round(baseSales * 0.08), profit: Math.round(baseProfit * 0.08) },
  ];

  // Region Chart data
  const adenCount = orders.filter((o) => o.city_type === "aden").length;
  const otherCount = orders.filter((o) => o.city_type === "other").length;

  const regionData = [
    { name: "داخل مدينة عدن", value: adenCount || 1, color: "#0E3B43" },
    { name: "بقية المحافظات", value: otherCount || 1, color: "#BA7A3B" },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي المبيعات"
          valueYer={totalSalesYer}
          valueSar={totalSalesSar}
          icon={DollarSign}
          subText="من كافة الطلبات المؤكدة"
        />
        <StatCard
          title="صافي الأرباح المقدرة"
          valueYer={netProfitYer}
          valueSar={netProfitSar}
          icon={Sparkles}
          subText="خصم تكاليف الشراء والتجهيز"
          highlight
        />
        <StatCard
          title="إجمالي الطلبات"
          valueRaw={`${orders.length} طلب`}
          icon={ShoppingBag}
          subText={`${orders.filter((o) => o.status === "pending").length} بانتظار التحقق`}
        />
        <StatCard
          title="العملاء المسجلون"
          valueRaw={`${customers.length} عميل`}
          icon={Users}
          subText="قاعدة بيانات عملاء محمصة خصب"
        />
      </div>

      {/* Visual Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales & Profit Trend */}
        <div className="rounded-3xl border bg-card p-5 lg:col-span-2 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-primary">مسار المبيعات والأرباح (الأسبوع الحاضر)</h3>
              <p className="text-xs text-muted-foreground">
                {isYer ? "عرض الرسوم البيانية بالريال اليمني (YER)" : "عرض الرسوم البيانية بالريال السعودي (SAR)"}
              </p>
            </div>
            <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-bold text-secondary">
              تلقائي
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Tooltip formatter={(value: any) => [isYer ? formatPrice(Number(value)) : `${Number(value).toLocaleString()} ر.س`, ""]} />
                <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#0E3B43" fill="#0E3B43" fillOpacity={0.15} />
                <Area type="monotone" dataKey="profit" name="صافي الربح" stroke="#BA7A3B" fill="#BA7A3B" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Region Distribution Pie */}
        <div className="rounded-3xl border bg-card p-5 shadow-xs">
          <h3 className="font-bold text-base text-primary mb-1">توزيع الطلبات حسب المنطقة</h3>
          <p className="text-xs text-muted-foreground mb-4">عدن مقابل بقية المحافظات</p>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={regionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {regionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-2 text-xs font-bold">
            <div className="flex items-center justify-between text-primary">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0E3B43]" /> عدن
              </span>
              <span>{adenCount} طلب</span>
            </div>
            <div className="flex items-center justify-between text-secondary">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#BA7A3B]" /> المحافظات
              </span>
              <span>{otherCount} طلب</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================
   MODULE 2: Product & Stock Inventory Management (المنتجات والمخزون)
   ==================================================================== */
function ProductsModule({ products, refetch }: { products: Product[]; refetch: () => void }) {
  const { currency } = useCurrency();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    category: "coffee" as CategoryId,
    short: "",
    description: "",
    stockQuantity: 50,
    lowStockThreshold: 5,
    costPriceYer: 5000,
    costPriceSar: 12,
    sellingPriceYer: 9000,
    sellingPriceSar: 22,
    origin: "",
    process: "",
    badge: "",
    notes: [] as string[],
    isCoffee: true,
    bestSeller: false,
    image: "",
    images: [] as string[],
    variants: [] as { label: string; yer: number; sar: number; stock: number }[],
  });

  const openAdd = () => {
    setEditingProduct(null);
    setForm({
      name: "",
      slug: "prod-" + Date.now().toString(36),
      category: "coffee",
      short: "",
      description: "",
      stockQuantity: 50,
      lowStockThreshold: 5,
      costPriceYer: 5000,
      costPriceSar: 12,
      sellingPriceYer: 9000,
      sellingPriceSar: 22,
      origin: "",
      process: "",
      badge: "",
      notes: [],
      isCoffee: true,
      bestSeller: false,
      image: "",
      images: [],
      variants: [{ label: "100g", yer: 9000, sar: 22, stock: 50 }],
    });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    const imgs = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
    const firstVariant = p.variants?.[0] || { yer: 9000, sar: 22 };
    setForm({
      name: p.name,
      slug: p.slug,
      category: p.category,
      short: p.short,
      description: p.description,
      stockQuantity: p.stockQuantity ?? 50,
      lowStockThreshold: p.lowStockThreshold ?? 5,
      costPriceYer: p.costPriceYer ?? 5000,
      costPriceSar: p.costPriceSar ?? 12,
      sellingPriceYer: firstVariant.yer,
      sellingPriceSar: firstVariant.sar,
      origin: p.origin || "",
      process: p.process || "",
      badge: (p as any).badge || "",
      notes: Array.isArray((p as any).notes) ? (p as any).notes : [],
      isCoffee: p.isCoffee ?? false,
      bestSeller: p.bestSeller ?? false,
      image: p.image || imgs[0] || "",
      images: imgs,
      variants: p.variants && p.variants.length > 0 
        ? p.variants.map(v => ({ ...v, stock: v.stock ?? p.stockQuantity ?? 50 }))
        : [{ label: "100g", yer: firstVariant.yer, sar: firstVariant.sar, stock: p.stockQuantity ?? 50 }],
    });
    setModalOpen(true);
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${form.slug || "prod"}-${Date.now()}-${i}.${ext}`;

      try {
        const { data, error } = await supabase.storage
          .from("product-images")
          .upload(fileName, file, { contentType: file.type, upsert: true });

        if (!error && data) {
          const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(fileName);
          if (publicData?.publicUrl) {
            uploadedUrls.push(publicData.publicUrl);
          }
        } else {
          console.error("Upload error:", error);
          toast.error("فشل في رفع الصورة: " + file.name);
        }
      } catch (e) {
        console.error("Upload exception:", e);
        toast.error("تعذر رفع الصورة: " + file.name);
      }
    }

    if (uploadedUrls.length > 0) {
      setForm((prev) => {
        const newImages = [...prev.images, ...uploadedUrls];
        return {
          ...prev,
          images: newImages,
          image: prev.image || newImages[0] || "",
        };
      });
      toast.success(`تم رفع ${uploadedUrls.length} صورة بنجاح`);
    }

    setUploadingImages(false);
  };

  const addCustomUrl = () => {
    if (!customImageUrl.trim()) return;
    const url = customImageUrl.trim();
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, url],
      image: prev.image || url,
    }));
    setCustomImageUrl("");
    toast.success("تمت إضافة رابط الصورة");
  };

  const setAsPrimary = (imgUrl: string) => {
    setForm((prev) => ({
      ...prev,
      image: imgUrl,
    }));
    toast.success("تم تعيين الصورة كصورة رئيسية للمنتج");
  };

  const removeImage = (imgUrl: string) => {
    setForm((prev) => {
      const updated = prev.images.filter((img) => img !== imgUrl);
      return {
        ...prev,
        images: updated,
        image: prev.image === imgUrl ? (updated[0] || "") : prev.image,
      };
    });
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalImage = form.image || form.images[0] || "";
      // Use dynamic variants if provided, otherwise generate from base price
      const finalVariants = form.variants.length > 0
        ? form.variants
        : form.isCoffee
          ? [
              { label: "100g", yer: form.sellingPriceYer, sar: form.sellingPriceSar },
              { label: "200g", yer: Math.round(form.sellingPriceYer * 1.75), sar: Math.round(form.sellingPriceSar * 1.75) },
            ]
          : [{ label: "قطعة", yer: form.sellingPriceYer, sar: form.sellingPriceSar }];

      const payload = {
        slug: form.slug,
        name: form.name,
        category: form.category,
        short: form.short,
        description: form.description,
        stock_quantity: form.stockQuantity,
        low_stock_threshold: form.lowStockThreshold,
        cost_price_yer: form.costPriceYer,
        cost_price_sar: form.costPriceSar,
        image: finalImage,
        images: form.images.length > 0 ? form.images : (finalImage ? [finalImage] : []),
        variants: finalVariants,
        is_coffee: form.isCoffee,
        origin: form.origin,
        process: form.process,
        badge: form.badge || null,
        notes: form.notes.filter(Boolean),
        best_seller: form.bestSeller,
        is_active: true,
      };

      const { error } = await supabase.from("products").upsert(payload, { onConflict: "slug" });
      if (error) throw error;

      toast.success(editingProduct ? "تم تحديث بيانات وصور المنتج بنجاح" : "تمت إضافة المنتج الجديد بنجاح");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      console.error("Save product error:", err);
      toast.error(err?.message || "حدث خطأ أثناء حفظ بيانات المنتج (تأكد من وجود صلاحية admin في جدول user_roles)");
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      const nextActive = !(p.isActive ?? true);
      const finalImage = p.image || defaultProducts[0]?.image || "";
      const payload = {
        slug: p.slug,
        name: p.name,
        category: p.category,
        short: p.short || "",
        description: p.description || "",
        stock_quantity: p.stockQuantity ?? 50,
        low_stock_threshold: p.lowStockThreshold ?? 5,
        cost_price_yer: p.costPriceYer ?? 0,
        cost_price_sar: p.costPriceSar ?? 0,
        image: finalImage,
        images: p.images && p.images.length > 0 ? p.images : [finalImage],
        variants: p.variants,
        is_coffee: p.isCoffee ?? false,
        origin: p.origin || "",
        process: p.process || "",
        best_seller: p.bestSeller ?? false,
        is_active: nextActive,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("products").upsert(payload, { onConflict: "slug" });
      if (error) throw error;
      toast.success(nextActive ? "تم تفعيل المنتج في المتجر" : "تم تعطيل ظهور المنتج في المتجر");
      refetch();
    } catch (err: any) {
      console.error("Toggle active error:", err);
      toast.error(err?.message || "تعذر تحديث حالة المنتج");
    }
  };

  const deleteProduct = async (slug: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج نهائياً من المتجر؟")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("slug", slug);
      if (error) throw error;
      toast.success("تم حذف المنتج بنجاح");
      refetch();
    } catch {
      toast.error("تعذر حذف المنتج");
    }
  };

  const updateVariantStock = async (p: Product, variantLabel: string, newQty: number) => {
    try {
      const qty = Math.max(0, newQty);
      const updatedVariants = p.variants.map((v) =>
        v.label === variantLabel ? { ...v, stock: qty } : v
      );
      const finalImage = p.image || defaultProducts[0]?.image || "";
      // Also update global stockQuantity to sum of all variants
      const totalStock = updatedVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
      const payload = {
        slug: p.slug,
        name: p.name,
        category: p.category,
        short: p.short || "",
        description: p.description || "",
        stock_quantity: totalStock,
        low_stock_threshold: p.lowStockThreshold ?? 5,
        cost_price_yer: p.costPriceYer ?? 0,
        cost_price_sar: p.costPriceSar ?? 0,
        image: finalImage,
        images: p.images && p.images.length > 0 ? p.images : [finalImage],
        variants: updatedVariants,
        is_coffee: p.isCoffee ?? false,
        origin: p.origin || "",
        process: p.process || "",
        best_seller: p.bestSeller ?? false,
        is_active: p.isActive ?? true,
        updated_at: new Date().toISOString(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("products").upsert(payload, { onConflict: "slug" });
      if (error) throw error;
      refetch();
      toast.success(`تم تحديث مخزون حجم (${variantLabel}) في "${p.name}" إلى ${qty}`);
    } catch (err: any) {
      console.error("Update variant stock error:", err);
      toast.error(err?.message || "تعذر تحديث مخزون الحجم");
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-primary">إدارة المنتجات، الصور والمخزون</h3>
          <p className="text-xs text-muted-foreground">إضافة وتعديل المنتجات ورفع الصور المتعددة وتحديد المنتجات الأكثر مبيعاً</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> إضافة منتج جديد
        </button>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-3xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="border-b bg-muted/60 text-muted-foreground font-bold">
              <tr>
                <th className="p-3.5 text-start">المنتج والصورة</th>
                <th className="p-3.5 text-start">التصنيف</th>
                <th className="p-3.5 text-start">السعر (YER / SAR)</th>
                <th className="p-3.5 text-start">المخزون والكمية</th>
                <th className="p-3.5 text-start">الصور المرفقة</th>
                <th className="p-3.5 text-start">الحالة</th>
                <th className="p-3.5 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(products || []).filter(Boolean).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 text-secondary mb-2 opacity-60" />
                    <p className="font-bold text-sm text-primary">لا توجد منتجات مسجلة في قاعدة البيانات حالياً</p>
                    <p className="text-xs text-muted-foreground mt-1">اضغط على زر "إضافة منتج جديد" بالأعلى لإضافة المحصول أو الأداة وسيظهر فوراً بالمتجر.</p>
                  </td>
                </tr>
              ) : (
                (products || []).filter(Boolean).map((p) => {
                const base = (p.variants && Array.isArray(p.variants) && p.variants[0]) ? p.variants[0] : { yer: 0, sar: 0 };
                const imgCount = p.images?.length || (p.image ? 1 : 0);
                // Per-variant: check if any variant is low or out of stock
                const hasVariantStock = p.variants.some((v) => v.stock !== undefined);
                const anyLow = hasVariantStock
                  ? p.variants.some((v) => (v.stock ?? 0) <= (p.lowStockThreshold ?? 5))
                  : (p.stockQuantity ?? 50) <= (p.lowStockThreshold ?? 5);

                return (
                  <tr key={p.slug} className="transition-colors hover:bg-muted/30">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image || defaultProducts[0]?.image}
                          alt={p.name}
                          className="h-11 w-11 rounded-xl object-cover ring-1 ring-border shrink-0 bg-background"
                        />
                        <div>
                          <div className="font-extrabold text-primary">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground">{p.short || p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                        {p.category === "coffee" ? "محاصيل بن" : p.category === "tools" ? "أدوات تحضير" : p.category === "matcha" ? "ماتشا" : "بن أخضر"}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold">
                      {currency === "YER" ? (
                        <>
                          <div className="text-primary font-black">{base.yer.toLocaleString()} ر.ي</div>
                          <div className="text-[11px] text-muted-foreground">{base.sar} ر.س</div>
                        </>
                      ) : (
                        <>
                          <div className="text-primary font-black">{base.sar.toLocaleString()} ر.س</div>
                          <div className="text-[11px] text-muted-foreground">{base.yer.toLocaleString()} ر.ي</div>
                        </>
                      )}
                    </td>
                    {/* Per-variant stock controls */}
                    <td className="p-3.5">
                      <div className="space-y-1.5">
                        {p.variants.map((v) => {
                          const vStock = v.stock !== undefined ? v.stock : (p.stockQuantity ?? 50);
                          const vLow = vStock <= (p.lowStockThreshold ?? 5);
                          const vOut = vStock <= 0;
                          return (
                            <div key={v.label} className="flex items-center gap-1.5">
                              <span className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-black ${
                                vOut ? "bg-destructive/15 text-destructive" : vLow ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/10 text-emerald-700"
                              }`}>
                                {v.label}
                              </span>
                              <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${vOut ? "bg-destructive animate-ping" : vLow ? "bg-amber-500" : "bg-emerald-500"}`} />
                              <button
                                onClick={() => updateVariantStock(p, v.label, vStock - 1)}
                                className="h-5 w-5 rounded-md bg-muted hover:bg-muted/80 text-xs font-black flex items-center justify-center text-primary"
                                title="تقليل"
                              >−</button>
                              <input
                                type="number"
                                value={vStock}
                                onChange={(e) => updateVariantStock(p, v.label, Number(e.target.value))}
                                className={`w-12 text-center rounded-md border bg-background text-xs py-0.5 font-bold outline-none ${vOut ? "text-destructive" : vLow ? "text-amber-700" : "text-emerald-700"}`}
                              />
                              <button
                                onClick={() => updateVariantStock(p, v.label, vStock + 1)}
                                className="h-5 w-5 rounded-md bg-muted hover:bg-muted/80 text-xs font-black flex items-center justify-center text-primary"
                                title="زيادة"
                              >+</button>
                            </div>
                          );
                        })}
                        {/* Global low-stock indicator */}
                        {anyLow && (
                          <div className="text-[10px] font-bold text-destructive">⚠ مخزون منخفض</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                        <ImageIcon className="h-3.5 w-3.5" /> {imgCount} صور
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          p.isActive ?? true ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.isActive ?? true ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {p.isActive ?? true ? "نشط" : "معطل"}
                      </button>
                    </td>
                    <td className="p-3.5 flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-full p-2 text-primary hover:bg-muted"
                        title="تعديل المنتج والصور"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteProduct(p.slug)}
                        className="rounded-full p-2 text-destructive hover:bg-destructive/10"
                        title="حذف المنتج"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-primary">
                {editingProduct ? "تعديل بيانات وصور المنتج" : "إضافة منتج جديد للمتجر"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveProduct} className="mt-4 space-y-4">
              {/* Section 1: Product Images (معرض وصور المنتج) */}
              <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary block">صور المنتج (معرض الصور المتعددة)</span>
                    <span className="text-[11px] text-muted-foreground">اختر صورة أو أكثر من جهازك، وحدد الصورة الرئيسية</span>
                  </div>
                  <button
                    type="button"
                    disabled={uploadingImages}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground shadow-xs hover:bg-secondary/90 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImages ? "جارِ الرفع…" : "اختيار ورفع صور من الجهاز"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadImages(e.target.files)}
                  />
                </div>

                {/* Direct URL input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="أو أدخل رابط صورة مباشر (URL)..."
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={addCustomUrl}
                    className="rounded-xl border bg-background px-4 py-2 text-xs font-bold text-primary hover:bg-muted shrink-0"
                  >
                    + إضافة بالرابط
                  </button>
                </div>

                {/* Images Preview Grid */}
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                    {form.images.map((imgUrl, idx) => {
                      const isPrimary = (form.image === imgUrl) || (!form.image && idx === 0);
                      return (
                        <div
                          key={idx}
                          className={`relative rounded-2xl overflow-hidden border-2 p-1 bg-card group ${
                            isPrimary ? "border-primary ring-2 ring-primary/30" : "border-border"
                          }`}
                        >
                          <img src={imgUrl} alt="صورة المنتج" className="h-20 w-full object-cover rounded-xl" />
                          {isPrimary && (
                            <span className="absolute top-2 start-2 bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                              ⭐ رئيسية
                            </span>
                          )}
                          <div className="mt-1.5 flex items-center justify-between gap-1">
                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => setAsPrimary(imgUrl)}
                                className="text-[10px] font-bold text-secondary hover:underline"
                              >
                                تعيين كرئيسية
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(imgUrl)}
                              className="text-destructive p-1 rounded-md hover:bg-destructive/10 ms-auto"
                              title="حذف الصورة"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 2: General Details */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground">اسم المنتج *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                    placeholder="مثال: كولمبيا بانتيرا"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground">التصنيف *</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as CategoryId, isCoffee: e.target.value === "coffee" })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="coffee">محاصيل القهوة المختصة</option>
                    <option value="tools">أدوات وإكسسوارات الباريستا</option>
                    <option value="matcha">ماتشا</option>
                    <option value="green">محاصيل البن الخضراء</option>
                  </select>
                </label>
              </div>


              {/* Section 3: Dynamic Variants Manager (الأحجام والأسعار) */}
              <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary block">الأحجام والأسعار (Variants)</span>
                    <span className="text-[11px] text-muted-foreground">أضف حجماً واحداً أو أكثر مع السعر المستقل لكل حجم</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, variants: [...form.variants, { label: form.isCoffee ? "250g" : "قطعة", yer: form.sellingPriceYer, sar: form.sellingPriceSar, stock: 50 }] })}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-3 py-1.5 text-[11px] font-bold text-secondary hover:bg-secondary/25"
                  >
                    <Plus className="h-3 w-3" /> إضافة حجم
                  </button>
                </div>
                {form.variants.length === 0 && (
                  <p className="text-center text-[11px] text-muted-foreground py-2">
                    لا توجد أحجام — سيتم إنشاء حجم افتراضي عند الحفظ بناءً على السعر المُدخل
                  </p>
                )}
                <div className="space-y-2">
                  {form.variants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) => {
                          const updated = [...form.variants];
                          updated[idx] = { ...updated[idx]!, label: e.target.value };
                          setForm({ ...form, variants: updated });
                        }}
                        placeholder="مثال: 100g"
                        className="w-24 rounded-xl border bg-background px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-bold shrink-0">YER</span>
                        <input
                          type="number"
                          value={v.yer || ""}
                          onChange={(e) => {
                            const updated = [...form.variants];
                            updated[idx] = { ...updated[idx]!, yer: e.target.value ? Number(e.target.value) : ("" as any) };
                            setForm({ ...form, variants: updated });
                          }}
                          className="flex-1 rounded-xl border bg-background px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-ring"
                          placeholder="9000"
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-bold shrink-0">SAR</span>
                        <input
                          type="number"
                          value={v.sar || ""}
                          onChange={(e) => {
                            const updated = [...form.variants];
                            updated[idx] = { ...updated[idx]!, sar: e.target.value ? Number(e.target.value) : ("" as any) };
                            setForm({ ...form, variants: updated });
                          }}
                          className="flex-1 rounded-xl border bg-background px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-ring"
                          placeholder="22"
                        />
                      </div>
                      <div className="w-20 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-bold shrink-0" title="المخزون">📦</span>
                        <input
                          type="number"
                          value={v.stock === undefined ? "" : v.stock}
                          onChange={(e) => {
                            const updated = [...form.variants];
                            updated[idx] = { ...updated[idx]!, stock: e.target.value ? Number(e.target.value) : ("" as any) };
                            setForm({ ...form, variants: updated });
                          }}
                          className="w-full rounded-xl border bg-background px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-ring text-emerald-700"
                          placeholder="الكمية"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.variants.filter((_, i) => i !== idx);
                          setForm({ ...form, variants: updated });
                        }}
                        className="p-1 rounded-lg text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Base price for fallback display */}
                <div className="grid gap-2 sm:grid-cols-2 pt-1 border-t">
                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground">السعر الأساسي YER (لحساب التكلفة)</span>
                    <input
                      type="number"
                      value={form.sellingPriceYer || ""}
                      onChange={(e) => setForm({ ...form, sellingPriceYer: e.target.value ? Number(e.target.value) : ("" as any) })}
                      className="w-full rounded-xl border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground">السعر الأساسي SAR (لحساب التكلفة)</span>
                    <input
                      type="number"
                      value={form.sellingPriceSar || ""}
                      onChange={(e) => setForm({ ...form, sellingPriceSar: e.target.value ? Number(e.target.value) : ("" as any) })}
                      className="w-full rounded-xl border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold"
                    />
                  </label>
                </div>
              </div>

              {/* Section 4: Cost & Stock */}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground">سعر التكلفة (YER)</span>
                  <input
                    type="number"
                    value={form.costPriceYer || ""}
                    onChange={(e) => setForm({ ...form, costPriceYer: e.target.value ? Number(e.target.value) : ("" as any) })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                    placeholder="مثال: 5000"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground">سعر التكلفة (SAR)</span>
                  <input
                    type="number"
                    value={form.costPriceSar || ""}
                    onChange={(e) => setForm({ ...form, costPriceSar: e.target.value ? Number(e.target.value) : ("" as any) })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                    placeholder="مثال: 12"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground">الكمية بالمخزون (Stock) *</span>
                  <input
                    type="number"
                    required
                    value={form.stockQuantity || ""}
                    onChange={(e) => setForm({ ...form, stockQuantity: e.target.value ? Number(e.target.value) : ("" as any) })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold text-emerald-700"
                  />
                </label>
              </div>

              {/* Section 5: Product Info (Origin, Process, Badge, Notes) */}
              <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
                <span className="text-xs font-bold text-primary block">معلومات المنتج (للقهوة المختصة)</span>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground">المنشأ (Origin)</span>
                    <input
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      placeholder="مثال: إثيوبيا"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground">المعالجة (Process)</span>
                    <input
                      value={form.process}
                      onChange={(e) => setForm({ ...form, process: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      placeholder="مثال: مغسولة"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground">الشارة (Badge)</span>
                    <input
                      value={form.badge}
                      onChange={(e) => setForm({ ...form, badge: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      placeholder="مثال: جديد"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[11px] font-bold text-muted-foreground block mb-1">إيحاءات النكهة (مفصولة بفاصلة)</span>
                  <input
                    value={form.notes.join("، ")}
                    onChange={(e) => setForm({ ...form, notes: e.target.value.split(/[،,]/).map(s => s.trim()).filter(Boolean) })}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                    placeholder="مثال: كرز، زهور بيضاء، سكر قصب"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">الوصف المختصر / الإيحاءات</span>
                <input
                  value={form.short}
                  onChange={(e) => setForm({ ...form, short: e.target.value })}
                  className="w-full rounded-2xl border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                  placeholder="مثال: كرز، زهور، وحلاوة عالية"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">الوصف التفصيلي للمنتج</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-2xl border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-ring min-h-20"
                  placeholder="اكتب وصفاً جذاباً عن المحصول أو الأداة..."
                />
              </label>

              {/* Best Seller Checkbox */}
              <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/10 p-3 border border-secondary/20">
                <input
                  type="checkbox"
                  id="bestSellerCheck"
                  checked={form.bestSeller}
                  onChange={(e) => setForm({ ...form, bestSeller: e.target.checked })}
                  className="h-4 w-4 rounded-md border-secondary text-secondary"
                />
                <label htmlFor="bestSellerCheck" className="text-xs font-bold text-primary cursor-pointer">
                  ⭐ إظهار هذا المنتج في قسم "المنتجات الأكثر مبيعاً" بالصفحة الرئيسية للمتجر
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border px-5 py-2 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                >
                  حفظ ونشر المنتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   MODULE 3: Real-Time Orders & Tracking Module (الطلبات والتتبع)
   ==================================================================== */
function OrdersModule({ orders, refetch }: { orders: Order[]; refetch: () => void }) {
  const { currency } = useCurrency();
  const [filter, setFilter] = useState<string>("all");
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingNote, setTrackingNote] = useState("");

  const updateStatus = async (id: string, status: Order["status"]) => {
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success("تم تحديث حالة الطلب بنجاح");
      refetch();
    } catch {
      toast.error("تعذر تحديث الحالة");
    }
  };

  const saveTrackingNote = async () => {
    if (!trackingModalOrder) return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ tracking_note: trackingNote })
        .eq("id", trackingModalOrder.id);
      if (error) throw error;
      toast.success("تم تحديث ملاحظة التتبع للعميل");
      setTrackingModalOrder(null);
      refetch();
    } catch {
      toast.error("تعذر تحديث التتبع");
    }
  };

  const openReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("تعذر فتح صورة السند");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const deleteOrder = async (id: string, code: string) => {
    if (!confirm(`هل أنت متأكد من حذف الطلب "${code}" نهائياً؟ لا يمكن التراجع عن هذه العملية.`)) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      toast.success(`تم حذف الطلب ${code} بنجاح`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "تعذر حذف الطلب");
    }
  };

  const exportOrdersCSV = () => {
    const rows = [
      ["رقم الطلب", "اسم العميل", "الهاتف", "المنطقة", "طريقة التوصيل", "رقم الحوالة", "الحالة", "الإجمالي YER", "الإجمالي SAR", "التاريخ", "المنتجات"],
    ];
    filtered.forEach((o) => {
      const items = o.items.map((it) => `${it.name}×${it.qty}`).join(" | ");
      rows.push([
        o.code,
        o.customer_name,
        o.phone,
        o.city_type === "aden" ? "عدن" : `محافظة ${o.governorate || ""}`,
        o.delivery_method || "",
        o.txn_ref || "",
        orderStatuses.find((s) => s.id === o.status)?.label ?? o.status,
        String(o.total_yer || o.total || 0),
        String(o.total_sar || ""),
        new Date(o.created_at).toLocaleDateString("ar"),
        items,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-khasab-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`تم تصدير ${filtered.length} طلب كملف CSV`);
  };

  const filtered = orders.filter((o) => filter === "all" || o.status === filter);


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-primary">الطلبات والتتبع المباشر (Real-Time Orders)</h3>
          <p className="text-xs text-muted-foreground">استقبال وتتبع شحنات العملاء بالوقت الحقيقي</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Export */}
          <button
            onClick={exportOrdersCSV}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-xs font-bold text-primary hover:bg-muted shadow-xs"
            title="تصدير الطلبات الظاهرة كملف Excel/CSV"
          >
            <Download className="h-3.5 w-3.5" />
            تصدير CSV
          </button>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 bg-muted/50 p-1 rounded-2xl border">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              الكل ({orders.length})
            </button>
            {orderStatuses.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilter(s.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                  filter === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label} ({orders.filter((o) => o.status === s.id).length})
              </button>
            ))}
          </div>
        </div>
      </div>


      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border bg-card p-12 text-center shadow-xs">
          <Package className="mb-3 h-8 w-8 text-secondary" />
          <p className="text-sm font-bold text-primary">لا توجد طلبات في هذا القسم حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <article key={o.id} className="rounded-3xl border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black tracking-wide text-primary">{o.code}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3.5 py-1 text-xs font-extrabold ${
                      orderStatuses.find((s) => s.id === o.status)?.cls ?? ""
                    }`}
                  >
                    {orderStatuses.find((s) => s.id === o.status)?.label ?? o.status}
                  </span>
                  <button
                    onClick={() => deleteOrder(o.id, o.code)}
                    className="rounded-full p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                    title="حذف الطلب نهائياً"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>


              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <Info label="اسم العميل" value={o.customer_name} />
                <Info label="رقم الجوال" value={o.phone} />
                <Info label="المنطقة" value={o.city_type === "aden" ? "داخل عدن" : `محافظة ${o.governorate}`} />
                <Info label="طريقة الشحن" value={o.delivery_method} />
                <Info label="رقم الحوالة" value={o.txn_ref} />
                {o.sender_name && <Info label="اسم المودع" value={o.sender_name} />}
              </div>

              {/* Items Breakdown */}
              <div className="mt-4 rounded-2xl bg-muted/40 p-3.5 text-xs space-y-1.5 border">
                <div className="font-bold text-primary mb-1">تفاصيل العناصر والكميات:</div>
                {o.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-muted-foreground">
                    <span>
                      {it.name} {it.options ? `(${it.options})` : ""} × {it.qty}
                    </span>
                    <span className="font-bold text-foreground">
                      {currency === "YER"
                        ? formatPrice((it.price_yer || it.price || 0) * it.qty)
                        : `${((it.price_sar || Math.round((it.price_yer || it.price || 0) / 400)) * it.qty).toLocaleString()} ر.س`}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center font-black text-sm text-primary pt-2 border-t mt-2">
                  <span>الإجمالي الكلي</span>
                  <span>
                    {currency === "YER"
                      ? formatPrice(Number(o.total_yer || o.total || 0))
                      : `${(o.total_sar || Math.round(Number(o.total_yer || o.total || 0) / 400)).toLocaleString()} ريال سعودي`}
                  </span>
                </div>
              </div>

              {/* Tracking Note */}
              {o.tracking_note && (
                <div className="mt-3 rounded-2xl bg-secondary/10 p-3 text-xs border border-secondary/20 text-secondary-foreground font-semibold">
                  ملاحظة التتبع الحالية: "{o.tracking_note}"
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t">
                {o.receipt_path && (
                  <button
                    onClick={() => openReceipt(o.receipt_path!)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3.5 py-1.5 text-xs font-bold text-secondary hover:bg-secondary/25"
                  >
                    <Receipt className="h-3.5 w-3.5" /> معاينة السند المرفق
                  </button>
                )}
                {o.lat && o.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${o.lat},${o.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3.5 py-1.5 text-xs font-bold text-primary"
                  >
                    <MapPin className="h-3.5 w-3.5" /> الخريطة (GPS)
                  </a>
                )}
                <button
                  onClick={() => {
                    setTrackingModalOrder(o);
                    setTrackingNote(o.tracking_note || "");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3.5 py-1.5 text-xs font-bold text-primary"
                >
                  <Truck className="h-3.5 w-3.5" /> تحديث التتبع
                </button>

                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])}
                  className="ms-auto rounded-full border bg-background px-3.5 py-1.5 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-ring"
                >
                  {orderStatuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Tracking Note Modal */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl">
            <h3 className="font-extrabold text-base text-primary mb-2">تحديث حالة تتبع الطلب {trackingModalOrder.code}</h3>
            <p className="text-xs text-muted-foreground mb-4">اكتب ملاحظة التتبع التي ستظهر للعميل فوراً</p>
            <textarea
              value={trackingNote}
              onChange={(e) => setTrackingNote(e.target.value)}
              placeholder="مثال: تم تجهيز الشحنة وهي الآن مع مندوب التوصيل في طريقها إليك."
              className="w-full rounded-2xl border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-ring min-h-24"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setTrackingModalOrder(null)} className="rounded-full border px-4 py-2 text-xs font-bold">
                إلغاء
              </button>
              <button onClick={saveTrackingNote} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
                حفظ والتحديث
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   MODULE 4: Customers & Purchase History (سجلات العملاء)
   ==================================================================== */
function CustomersModule({ customers, orders }: { customers: any[]; orders: Order[] }) {
  const { currency } = useCurrency();
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  // Aggregate all unique customers from profiles and orders
  const allCustomerMap = new Map<string, any>();

  // Add from profiles
  customers.forEach((c) => {
    const key = c.phone || c.id || c.full_name;
    if (key) {
      allCustomerMap.set(key, {
        id: c.id,
        full_name: c.full_name || "عميل مسجل",
        phone: c.phone || "—",
        created_at: c.created_at || c.updated_at || new Date().toISOString(),
      });
    }
  });

  // Add from orders (if customer ordered before registration)
  orders.forEach((o) => {
    const key = o.phone || o.user_id || o.customer_name;
    if (key && !allCustomerMap.has(key)) {
      allCustomerMap.set(key, {
        id: o.user_id || key,
        full_name: o.customer_name || "عميل متجر",
        phone: o.phone || "—",
        created_at: o.created_at,
      });
    }
  });

  const customerList = Array.from(allCustomerMap.values());

  const filtered = customerList.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-primary">إدارة سجلات العملاء والإنفاق (Customers Database)</h3>
          <p className="text-xs text-muted-foreground">استعراض العملاء المسجلين في قاعدة البيانات وسجل مشترياتهم وإجمالي الإنفاق</p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="w-full rounded-full border bg-card px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="border-b bg-muted/60 text-muted-foreground font-bold">
              <tr>
                <th className="p-3.5 text-start">العميل</th>
                <th className="p-3.5 text-start">رقم الهاتف</th>
                <th className="p-3.5 text-start">عدد الطلبات</th>
                <th className="p-3.5 text-start">
                  {currency === "YER" ? "إجمالي الإنفاق (YER)" : "إجمالي الإنفاق (SAR)"}
                </th>
                <th className="p-3.5 text-start">سجل المشتريات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    لا يوجد عملاء يطابقون البحث
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const customerOrders = orders.filter((o) => o.user_id === c.id || o.phone === c.phone || o.customer_name === c.full_name);
                  const totalSpentYer = customerOrders.reduce((s, o) => s + Number(o.total_yer || o.total || 0), 0);
                  const totalSpentSar = customerOrders.reduce((s, o) => s + Number(o.total_sar || Math.round(Number(o.total_yer || o.total || 0) / 400)), 0);

                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-bold text-primary flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-xs">
                          {(c.full_name || "ع")[0]}
                        </div>
                        <div>
                          <div>{c.full_name}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">عميل مسجل</div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-semibold" dir="ltr">{c.phone || "—"}</td>
                      <td className="p-3.5 font-bold">{customerOrders.length} طلبات</td>
                      <td className="p-3.5 font-extrabold text-emerald-700">
                        {currency === "YER" ? formatPrice(totalSpentYer) : `${totalSpentSar.toLocaleString()} ريال سعودي`}
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => setSelectedCustomer({ ...c, orders: customerOrders, totalSpentYer, totalSpentSar })}
                          className="rounded-full border bg-background px-3.5 py-1.5 text-[11px] font-bold text-primary hover:bg-muted shadow-2xs"
                        >
                          عرض السجل ({customerOrders.length})
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Orders History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl border bg-card p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-primary">سجل مشتريات العميل</h3>
                <div className="text-xs text-muted-foreground">{selectedCustomer.full_name} • {selectedCustomer.phone}</div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-primary/10 p-3.5 text-xs font-bold text-primary mb-4 flex justify-between">
              <span>إجمالي قيمة المشتريات:</span>
              <span className="font-extrabold text-emerald-700">
                {currency === "YER"
                  ? formatPrice(selectedCustomer.totalSpentYer)
                  : `${selectedCustomer.totalSpentSar.toLocaleString()} ريال سعودي`}
              </span>
            </div>

            <div className="space-y-3">
              {selectedCustomer.orders.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">لا توجد طلبات مسجلة لهذا العميل بعد</p>
              ) : (
                selectedCustomer.orders.map((o: Order) => (
                  <div key={o.id} className="rounded-2xl border p-3.5 text-xs space-y-2 bg-background">
                    <div className="flex justify-between font-bold text-primary">
                      <span>كود الطلب: {o.code}</span>
                      <span className="font-extrabold text-emerald-700">
                        {currency === "YER"
                          ? formatPrice(Number(o.total_yer || o.total || 0))
                          : `${(o.total_sar || Math.round(Number(o.total_yer || o.total || 0) / 400)).toLocaleString()} ريال سعودي`}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex justify-between">
                      <span>التاريخ: {new Date(o.created_at).toLocaleDateString("ar")}</span>
                      <span>الحالة: {orderStatuses.find((s) => s.id === o.status)?.label ?? o.status}</span>
                    </div>
                    <div className="text-[11px] bg-muted/40 p-2 rounded-xl">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.name} × {it.qty}</span>
                          <span>
                            {currency === "YER"
                              ? formatPrice((it.price_yer || it.price || 0) * it.qty)
                              : `${((it.price_sar || Math.round((it.price_yer || it.price || 0) / 400)) * it.qty).toLocaleString()} ر.س`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   MODULE 5: Store Content & Branding Customization (تخصيص المحتوى)
   ==================================================================== */
function StoreSettingsModule({ settings, refetch }: { settings: StoreSettings; refetch: () => void }) {
  const [storeName, setStoreName] = useState(settings?.store_name || defaultStoreName);
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || "");
  const [announcementText, setAnnouncementText] = useState(settings?.announcement_text || "");
  const [enabled, setEnabled] = useState(settings?.announcement_enabled ?? true);
  const [whatsappNumber, setWhatsappNumber] = useState(settings?.whatsapp_number || defaultWhatsAppNumber);
  const [pickupAddress, setPickupAddress] = useState(settings?.pickup_address || defaultPickupAddress);
  const [adenDeliveryFee, setAdenDeliveryFee] = useState(settings?.aden_delivery_fee || defaultAdenDeliveryFee);
  const [adenDeliveryFeeSar, setAdenDeliveryFeeSar] = useState(settings?.aden_delivery_fee_sar || defaultAdenDeliveryFeeSar);
  const [pickupDeliveryFee, setPickupDeliveryFee] = useState(settings?.pickup_delivery_fee || defaultPickupFee);
  const [pickupDeliveryFeeSar, setPickupDeliveryFeeSar] = useState(settings?.pickup_delivery_fee_sar || defaultPickupFeeSar);
  const [otherDeliveryFee, setOtherDeliveryFee] = useState(settings?.other_delivery_fee || defaultOtherDeliveryFee);
  const [otherDeliveryFeeSar, setOtherDeliveryFeeSar] = useState(settings?.other_delivery_fee_sar || defaultOtherDeliveryFeeSar);
  const [accounts, setAccounts] = useState<BankAccount[]>(
    settings?.bank_accounts?.length > 0 ? settings.bank_accounts : defaultBankAccounts
  );
  // Hero Banners state
  const [heroBannersEdit, setHeroBannersEdit] = useState<{ image: string; title: string; desc: string }[]>(
    (settings as any)?.hero_banners_list || []
  );
  const [newBanner, setNewBanner] = useState({ image: "", title: "", desc: "" });
  // About & Footer settings
  const [instagramHandle, setInstagramHandle] = useState((settings as any)?.instagram_handle || "khasab");
  const [aboutText, setAboutText] = useState((settings as any)?.about_text || "");
  const [footerText, setFooterText] = useState((settings as any)?.footer_text || "مو بس محصولك.. عدّتك علينا. كل أدوات القهوة اللي تحتاجها بجودة ترفع تجربتك.");
  const [socialLinks, setSocialLinks] = useState<any[]>(settings?.social_links || []);
  const [saving, setSaving] = useState(false);
  const [uploadingLogoIdx, setUploadingLogoIdx] = useState<number | null>(null);
  const [uploadingBrandLogo, setUploadingBrandLogo] = useState(false);

  // Handle Brand Logo Upload
  const handleBrandLogoUpload = async (file: File) => {
    try {
      setUploadingBrandLogo(true);
      const ext = file.name.split(".").pop() || "png";
      const filePath = `brand/logo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        setLogoUrl(publicUrlData.publicUrl);
        toast.success("تم رفع وتعيين شعار المتجر بنجاح");
      }
    } catch (err: any) {
      console.error("Upload brand logo error:", err);
      toast.error("تعذر رفع صورة الشعار: " + (err?.message || ""));
    } finally {
      setUploadingBrandLogo(false);
    }
  };

  // Add new account row
  const addAccount = () => {
    setAccounts([...accounts, { bank: "بنك الكريمي", number: "", holder: "محمصة خصب للقهوة", logo_type: "kuraimi" }]);
  };

  // Update account row
  const updateAccount = (index: number, field: keyof BankAccount, value: string) => {
    const updated = [...accounts];
    updated[index] = { ...updated[index]!, [field]: value };
    setAccounts(updated);
  };

  // Handle Bank Logo Upload
  const handleLogoUpload = async (index: number, file: File) => {
    try {
      setUploadingLogoIdx(index);
      const ext = file.name.split(".").pop() || "png";
      const filePath = `bank-logos/logo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        updateAccount(index, "custom_logo_url", publicUrlData.publicUrl);
        toast.success("تم رفع وتعيين شعار البنك بنجاح");
      }
    } catch (err: any) {
      console.error("Upload bank logo error:", err);
      toast.error("تعذر رفع صورة الشعار: " + (err?.message || ""));
    } finally {
      setUploadingLogoIdx(null);
    }
  };

  // Remove account row
  const removeAccount = (index: number) => {
    if (accounts.length <= 1) {
      toast.error("يجب الإبقاء على حساب بنكي واحد على الأقل");
      return;
    }
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Find existing store_settings row if any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from("store_settings")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Build the complete payload — all fields as independent columns
      // hero_banners stores the actual banner list, while all other settings go in top-level columns
      const payload: Record<string, any> = {
        // Store identity
        store_name: storeName,
        logo_url: logoUrl,
        // Announcement bar
        announcement_text: announcementText,
        announcement_enabled: enabled,
        // Contact & delivery
        whatsapp_number: whatsappNumber,
        pickup_address: pickupAddress,
        aden_delivery_fee: adenDeliveryFee,
        aden_delivery_fee_sar: adenDeliveryFeeSar,
        pickup_delivery_fee: pickupDeliveryFee,
        pickup_delivery_fee_sar: pickupDeliveryFeeSar,
        other_delivery_fee: otherDeliveryFee,
        other_delivery_fee_sar: otherDeliveryFeeSar,
        // Bank accounts
        bank_accounts: accounts,
        // Social & content
        instagram_handle: instagramHandle,
        about_text: aboutText,
        footer_text: footerText,
        social_links: socialLinks,
        // Hero banners (actual banner images list)
        hero_banners: heroBannersEdit,
        updated_at: new Date().toISOString(),
      };

      let saveErr = null;
      const targetId = existing?.id || settings?.id;

      if (targetId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("store_settings").update(payload).eq("id", targetId);
        saveErr = error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("store_settings").insert([payload]);
        saveErr = error;
      }

      if (saveErr) throw saveErr;

      toast.success("تم حفظ ونشر كافة التعديلات للمتجر بنجاح");
      refetch();
    } catch (err: any) {
      console.error("Save settings error:", err);
      toast.error("تعذر تحديث الإعدادات: " + (err?.message || "تأكد من صلاحيات المدير"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-extrabold text-primary">تخصيص الهوية والشعار وشريط الإعلانات والحسابات</h3>
        <p className="text-xs text-muted-foreground">
          تحكم كامل في اسم وشعار المحمصة في أعلى الموقع، شريط الإعلانات، رسوم التوصيل، ونقطة الاستلام، وحسابات البنوك
        </p>
      </div>

      <form onSubmit={saveSettings} className="space-y-6 max-w-4xl">
        {/* Section 0: Brand Name & Logo */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-secondary" />
            1. هوية واسم وشعار المحمصة (أعلى شريط الموقع والفوتر)
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground block mb-1">
                اسم المحمصة / المتجر الرسمي *
              </span>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full rounded-2xl border bg-background px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring font-extrabold text-primary"
                placeholder="مثال: محمصة خصب"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                يظهر هذا الاسم بجانب الشعار في أعلى شريط الموقع على جميع الشاشات والهواتف
              </span>
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground block">
                شعار المحمصة الرسمي (Brand Logo)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-bold text-primary cursor-pointer hover:bg-muted transition-colors">
                  <Upload className="h-3.5 w-3.5 text-secondary" />
                  <span>{uploadingBrandLogo ? "جارِ الرفع…" : "رفع صورة الشعار من الجهاز"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingBrandLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBrandLogoUpload(file);
                    }}
                  />
                </label>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-xs font-bold text-destructive hover:underline"
                  >
                    استعادة الشعار الأصلي
                  </button>
                )}
              </div>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="أو الصق رابط صورة الشعار مباشرة..."
                className="w-full rounded-xl border bg-background px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-ring mt-1"
              />
            </div>
          </div>

          {/* Header Preview Bar */}
          <div className="rounded-2xl border bg-background p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={logoUrl || brandLogo}
                alt="معاينة الشعار"
                className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20 bg-card shrink-0"
              />
              <div>
                <div className="text-[11px] font-bold text-muted-foreground">معاينة مظهر الشعار والاسم في أعلى الموقع:</div>
                <div className="text-base font-black text-primary">{storeName || "محمصة خصب"}</div>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-secondary/15 px-3 py-1 text-[11px] font-bold text-secondary">
              يظهر في الهيدر والفوتر
            </span>
          </div>
        </div>

        {/* Section 1: Announcement Bar */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
            <Sliders className="h-4 w-4 text-secondary" />
            2. شريط الإعلانات العلوي المتحرك
          </h4>

          <label className="block">
            <span className="text-xs font-bold text-muted-foreground block mb-1">
              نص شريط الإعلانات (Announcement Bar)
            </span>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="w-full rounded-2xl border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-ring min-h-20"
              placeholder="اكتب الإعلان العلوي المباشر..."
            />
          </label>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="anno-check"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded-md border-primary text-primary"
            />
            <label htmlFor="anno-check" className="text-xs font-bold text-primary cursor-pointer">
              تفعيل ظهور شريط الإعلانات العلوي في المتجر
            </label>
          </div>
        </div>

        {/* Section 1.5: Hero Banners Manager */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-secondary" />
            3. بانرات الصفحة الرئيسية (Hero Banners)
          </h4>
          <p className="text-xs text-muted-foreground">
            أضف وعدّل البانرات التي تظهر في منتصف الصفحة الرئيسية. كل بانر يحتاج رابط صورة + عنوان + وصف.
          </p>

          {/* Existing Banners List */}
          <div className="space-y-3">
            {heroBannersEdit.map((b, idx) => (
              <div key={idx} className="rounded-2xl border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">البانر {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setHeroBannersEdit(heroBannersEdit.filter((_, i) => i !== idx))}
                    className="p-1 rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid gap-2">
                  <input
                    type="url"
                    value={b.image}
                    onChange={(e) => {
                      const updated = [...heroBannersEdit];
                      updated[idx] = { ...updated[idx]!, image: e.target.value };
                      setHeroBannersEdit(updated);
                    }}
                    placeholder="رابط الصورة (URL)..."
                    className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={b.title}
                    onChange={(e) => {
                      const updated = [...heroBannersEdit];
                      updated[idx] = { ...updated[idx]!, title: e.target.value };
                      setHeroBannersEdit(updated);
                    }}
                    placeholder="العنوان الكبير..."
                    className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={b.desc}
                    onChange={(e) => {
                      const updated = [...heroBannersEdit];
                      updated[idx] = { ...updated[idx]!, desc: e.target.value };
                      setHeroBannersEdit(updated);
                    }}
                    placeholder="الوصف..."
                    className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {b.image && (
                  <img src={b.image} alt="معاينة" className="h-20 w-full object-cover rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
            ))}
          </div>

          {/* Add New Banner */}
          <div className="rounded-2xl border border-dashed border-secondary/40 p-4 space-y-2">
            <span className="text-xs font-bold text-secondary block">+ إضافة بانر جديد</span>
            <input
              type="url"
              value={newBanner.image}
              onChange={(e) => setNewBanner({ ...newBanner, image: e.target.value })}
              placeholder="رابط الصورة..."
              className="w-full rounded-xl border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={newBanner.title}
              onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
              placeholder="العنوان الكبير..."
              className="w-full rounded-xl border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={newBanner.desc}
              onChange={(e) => setNewBanner({ ...newBanner, desc: e.target.value })}
              placeholder="الوصف..."
              className="w-full rounded-xl border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => {
                if (!newBanner.title) return toast.error("أدخل عنوان البانر");
                setHeroBannersEdit([...heroBannersEdit, newBanner]);
                setNewBanner({ image: "", title: "", desc: "" });
                toast.success("تمت إضافة البانر");
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-4 py-2 text-xs font-bold text-secondary hover:bg-secondary/25"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة بانر
            </button>
          </div>
        </div>

        {/* Section 1.6: About Page & Instagram */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            4. صفحة "عن المحمصة" ومعلومات التواصل
          </h4>

          <label className="block">
            <span className="text-xs font-bold text-muted-foreground block mb-1">حساب إنستغرام</span>
            <div className="flex items-center gap-2 rounded-2xl border bg-background px-4 py-2.5">
              <span className="text-sm font-bold text-muted-foreground">@</span>
              <input
                type="text"
                value={instagramHandle.replace('@', '')}
                onChange={(e) => setInstagramHandle(e.target.value.replace('@', ''))}
                className="flex-1 text-xs outline-none bg-transparent font-mono font-bold"
                placeholder="khasab"
              />
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">يظهر في الفوتر — مثال: khasab</span>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-muted-foreground block mb-1">نص صفحة "عن المحمصة"</span>
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="w-full rounded-2xl border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-ring min-h-[120px]"
              placeholder="اكتب قصة محمصتك هنا، سيظهر هذا النص في صفحة 'عن خصب'..."
            />
            <span className="text-[10px] text-muted-foreground mt-1 block">يظهر في صفحة /about</span>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-muted-foreground block mb-1">نص الفوتر (أسفل الموقع)</span>
            <textarea
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="w-full rounded-2xl border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              placeholder="اكتب وصفاً قصيراً لمتجرك..."
            />
            <span className="text-[10px] text-muted-foreground mt-1 block">يظهر تحت اسم المتجر في جميع الصفحات</span>
          </label>
        </div>

        {/* Section 1.7: Social Links */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
            <Globe className="h-4 w-4 text-secondary" />
            روابط التواصل الاجتماعي
          </h4>
          <p className="text-xs text-muted-foreground">أضف روابط حساباتك في مختلف المنصات (ستظهر في الفوتر)</p>

          <div className="space-y-3">
            {socialLinks.map((link, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 rounded-2xl border bg-background p-3">
                <select
                  value={link.platform}
                  onChange={(e) => {
                    const updated = [...socialLinks];
                    updated[idx] = { ...updated[idx]!, platform: e.target.value as any };
                    setSocialLinks(updated);
                  }}
                  className="rounded-xl border bg-card px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold"
                >
                  <option value="instagram">انستغرام</option>
                  <option value="whatsapp">واتساب</option>
                  <option value="tiktok">تيك توك</option>
                  <option value="youtube">يوتيوب</option>
                  <option value="facebook">فيسبوك</option>
                  <option value="snapchat">سناب شات</option>
                  <option value="twitter">تويتر (X)</option>
                  <option value="telegram">تيليجرام</option>
                  <option value="other">أخرى</option>
                </select>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => {
                    const updated = [...socialLinks];
                    updated[idx] = { ...updated[idx]!, url: e.target.value };
                    setSocialLinks(updated);
                  }}
                  placeholder="الرابط (URL)..."
                  className="flex-1 min-w-[200px] rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== idx))}
                  className="p-2 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSocialLinks([...socialLinks, { platform: "instagram", url: "" }])}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-4 py-2 text-xs font-bold text-secondary hover:bg-secondary/25"
          >
            <Plus className="h-3.5 w-3.5" /> إضافة رابط
          </button>
        </div>

        {/* Section 2: Contact & Pickup Info */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
            <Phone className="h-4 w-4 text-secondary" />
            5. بيانات التواصل ونقطة الاستلام الرسمية
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground block mb-1">
                رقم الواتساب الرسمي لتلقي الطلبات *
              </span>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full rounded-2xl border bg-background px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring font-mono font-bold"
                placeholder="مثال: 967777000000"
                dir="ltr"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                تفتح محادثة الواتساب للعميل مع هذا الرقم فور تأكيد الطلب
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-muted-foreground block mb-1">
                عنوان نقطة الاستلام الافتراضية في عدن *
              </span>
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full rounded-2xl border bg-background px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                placeholder="الحجاز الجديد محل أضواء الدور الأول - عدن"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                يظهر هذا العنوان للعملاء عند اختيار "استلام من الفرع"
              </span>
            </label>
          </div>
        </div>

        {/* Section 3: Delivery & Shipping Rates (Dual Currency) */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
            <Truck className="h-4 w-4 text-secondary" />
            3. خيارات وتكاليف الشحن والتوصيل (بالريال اليمني والسعودي)
          </h4>

          <p className="text-xs text-muted-foreground">
            تظهر هذه التسعيرات للعملاء وتتغير تلقائياً بحسب العملة المختارة في الموقع (YER أو SAR):
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Aden Delivery */}
            <div className="rounded-2xl border bg-background p-3.5 space-y-2">
              <span className="text-xs font-extrabold text-primary block">توصيل منزلي داخل عدن</span>
              <label className="block">
                <span className="text-[10px] font-bold text-muted-foreground block mb-1">بالريال اليمني (YER)</span>
                <input
                  type="text"
                  required
                  value={adenDeliveryFee}
                  onChange={(e) => setAdenDeliveryFee(e.target.value)}
                  className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold text-amber-900"
                  placeholder="1,000 - 5,000 ر.ي"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-muted-foreground block mb-1">بالريال السعودي (SAR)</span>
                <input
                  type="text"
                  value={adenDeliveryFeeSar}
                  onChange={(e) => setAdenDeliveryFeeSar(e.target.value)}
                  className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold text-amber-900"
                  placeholder="3 - 12 ر.س"
                />
              </label>
            </div>

            {/* Pickup Point */}
            <div className="rounded-2xl border bg-background p-3.5 space-y-2">
              <span className="text-xs font-extrabold text-primary block">استلام من الفرع (الحجاز)</span>
              <label className="block">
                <span className="text-[10px] font-bold text-muted-foreground block mb-1">بالريال اليمني (YER)</span>
                <input
                  type="text"
                  required
                  value={pickupDeliveryFee}
                  onChange={(e) => setPickupDeliveryFee(e.target.value)}
                  className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold text-emerald-700"
                  placeholder="مجاناً"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-muted-foreground block mb-1">بالريال السعودي (SAR)</span>
                <input
                  type="text"
                  value={pickupDeliveryFeeSar}
                  onChange={(e) => setPickupDeliveryFeeSar(e.target.value)}
                  className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold text-emerald-700"
                  placeholder="مجاناً"
                />
              </label>
            </div>

            {/* Governorates */}
            <div className="rounded-2xl border bg-background p-3.5 space-y-2">
              <span className="text-xs font-extrabold text-primary block">شحن خارج عدن (المحافظات)</span>
              <label className="block">
                <span className="text-[10px] font-bold text-muted-foreground block mb-1">بالريال اليمني (YER)</span>
                <input
                  type="text"
                  required
                  value={otherDeliveryFee}
                  onChange={(e) => setOtherDeliveryFee(e.target.value)}
                  className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold text-amber-900"
                  placeholder="2,000 - 5,000 ر.ي"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-muted-foreground block mb-1">بالريال السعودي (SAR)</span>
                <input
                  type="text"
                  value={otherDeliveryFeeSar}
                  onChange={(e) => setOtherDeliveryFeeSar(e.target.value)}
                  className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold text-amber-900"
                  placeholder="5 - 12 ر.س"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Bank Accounts Management with Logos & Upload */}
        <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-secondary" />
              4. الحسابات والمحافظ البنكية ورفع وتعديل الشعارات
            </h4>
            <button
              type="button"
              onClick={addAccount}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3.5 py-1.5 text-xs font-bold text-secondary hover:bg-secondary/25"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة حساب بنكي جديد
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            اختر البنك من القائمة لشعاره الرسمي أو ارفع صورة شعار مخصص، واكتب رقم الحساب واسم المستفيد:
          </p>

          <div className="space-y-4">
            {accounts.map((acc, idx) => (
              <div
                key={idx}
                className="rounded-2xl border bg-background p-4 space-y-3 shadow-xs"
              >
                <div className="grid gap-3 sm:grid-cols-[auto_1.1fr_1.2fr_1.1fr_1.1fr_auto] items-center">
                  {/* Bank Logo Preview */}
                  <div className="pt-2 sm:pt-0">
                    <BankLogo
                      bankName={acc.bank}
                      logoType={acc.logo_type}
                      customLogoUrl={acc.custom_logo_url}
                      className="h-11 w-11"
                    />
                  </div>

                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground block mb-1">نوع وشعار البنك</span>
                    <select
                      value={acc.logo_type || "other"}
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        const opt = availableBankOptions.find((o) => o.id === selectedVal);
                        const updated = [...accounts];
                        updated[idx] = {
                          ...updated[idx]!,
                          logo_type: selectedVal,
                          bank: opt && selectedVal !== "other" ? opt.name : updated[idx]!.bank,
                        };
                        setAccounts(updated);
                      }}
                      className="w-full rounded-xl border bg-card px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold"
                    >
                      {availableBankOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground block mb-1">اسم البنك المعروض</span>
                    <input
                      type="text"
                      required
                      value={acc.bank}
                      onChange={(e) => updateAccount(idx, "bank", e.target.value)}
                      className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-bold"
                      placeholder="مثال: بنك الكريمي"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground block mb-1">رقم الحساب / المحفظة</span>
                    <input
                      type="text"
                      required
                      value={acc.number}
                      onChange={(e) => updateAccount(idx, "number", e.target.value)}
                      className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-mono font-bold"
                      placeholder="1234567890"
                      dir="ltr"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-bold text-muted-foreground block mb-1">اسم صاحب الحساب</span>
                    <input
                      type="text"
                      required
                      value={acc.holder}
                      onChange={(e) => updateAccount(idx, "holder", e.target.value)}
                      className="w-full rounded-xl border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                      placeholder="محمصة خصب للقهوة"
                    />
                  </label>

                  <div className="flex items-center justify-end pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => removeAccount(idx)}
                      className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      title="حذف هذا الحساب"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Custom Logo Upload / URL Options */}
                <div className="pt-2 border-t flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-bold text-muted-foreground text-[11px]">تخصيص الشعار:</span>
                  
                  {/* File Upload Button */}
                  <label className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 font-bold text-primary cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="h-3.5 w-3.5 text-secondary" />
                    <span>{uploadingLogoIdx === idx ? "جارِ الرفع…" : "رفع صورة شعار من الجهاز"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogoIdx === idx}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(idx, file);
                      }}
                    />
                  </label>

                  {/* Direct Logo URL */}
                  <input
                    type="url"
                    value={acc.custom_logo_url || ""}
                    onChange={(e) => updateAccount(idx, "custom_logo_url", e.target.value)}
                    placeholder="أو ضع رابط صورة الشعار هنا..."
                    className="flex-1 min-w-[200px] rounded-xl border bg-card px-3 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-ring"
                  />

                  {acc.custom_logo_url && (
                    <button
                      type="button"
                      onClick={() => updateAccount(idx, "custom_logo_url", "")}
                      className="text-[11px] font-bold text-destructive hover:underline"
                    >
                      إلغاء الشعار المخصص
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-60 transition-transform hover:scale-[1.02]"
          >
            {saving ? "جارِ حفظ ونشر التغييرات…" : "💾 حفظ ونشر كافة التغييرات للمتجر"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ====================================================================
   MODULE 6: Security & Access Control RBAC (الأمان والصلاحيات)
   ==================================================================== */
function SecurityModule({ customers }: { customers: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-extrabold text-primary">الأمان وصلاحيات الوصول (Security & RBAC)</h3>
        <p className="text-xs text-muted-foreground">إدارة أدوار المدراء والصلاحيات عبر Supabase Row Level Security</p>
      </div>

      <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-4 max-w-2xl">
        <div className="flex items-center gap-3 text-emerald-700 bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-300/40">
          <ShieldCheck className="h-6 w-6 shrink-0" />
          <div className="text-xs font-bold">
            نظام الحماية مفعل بالكامل (Role-Based Access Control - RBAC) وسياسات Row Level Security تأمّن كافة الجداول والـ Storage Buckets.
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-bold text-primary">المستخدمون ذوو صلاحية المدير (Admins):</div>
          <p>يمكن إدارة وتعديل الرتب مباشرة من جدول `user_roles` في لوحة تحكم Supabase.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  valueYer,
  valueSar,
  valueRaw,
  icon: Icon,
  subText,
  highlight,
}: {
  title: string;
  valueYer?: number;
  valueSar?: number;
  valueRaw?: string;
  icon: any;
  subText: string;
  highlight?: boolean;
}) {
  const { currency } = useCurrency();

  const isYer = currency === "YER";
  const primaryDisplay = valueRaw
    ? valueRaw
    : isYer
      ? formatPrice(valueYer ?? 0)
      : `${(valueSar ?? 0).toLocaleString()} ريال سعودي`;

  const secondaryDisplay = !valueRaw
    ? isYer
      ? `${(valueSar ?? 0).toLocaleString()} ريال سعودي (SAR)`
      : formatPrice(valueYer ?? 0)
    : null;

  return (
    <div
      className={`rounded-3xl border p-5 shadow-xs transition-transform hover:scale-[1.01] ${
        highlight ? "bg-secondary/15 border-secondary/40" : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">{title}</span>
        <div className={`grid h-9 w-9 place-items-center rounded-2xl ${highlight ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-black text-primary">{primaryDisplay}</div>
        {secondaryDisplay && (
          <div className="text-xs font-bold text-secondary mt-1">{secondaryDisplay}</div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-muted-foreground">{subText}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-bold text-primary">{value || "—"}</span>
    </div>
  );
}
