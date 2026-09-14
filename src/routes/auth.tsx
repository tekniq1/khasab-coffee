import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/lib/supabase";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول / إنشاء حساب عميل — محمصة خصب" },
      {
        name: "description",
        content: "سجّل دخولك أو أنشئ حساب عميل جديد في محمصة خصب لمتابعة وإكمال طلباتك.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const checkUserRoleAndNavigate = async (user: any) => {
    if (!user) return;
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const isAdmin = roleData?.role === "admin";

      if (redirect) {
        navigate({ to: redirect as any });
      } else if (isAdmin) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      console.error("Auth redirect error:", err);
      navigate({ to: (redirect || "/") as any });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        checkUserRoleAndNavigate(data.session.user);
      }
    });
  }, [navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanEmail || !cleanPassword) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        // Only customer accounts can be created via public sign up
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: cleanName,
              phone: cleanPhone,
              role: "customer",
            },
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}${redirect || "/"}`
                : undefined,
          },
        });
        if (error) throw error;

        // Upsert into public.profiles
        if (data.user) {
          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              full_name: cleanName,
              phone: cleanPhone,
              updated_at: new Date().toISOString(),
            });
          } catch {
            // ignore profile upsert error if RLS blocks before session
          }
        }

        toast.success("تم إنشاء حساب العميل بنجاح");
        if (data.session) {
          await checkUserRoleAndNavigate(data.user);
        } else {
          toast.info("يرجى تفقّد بريدك الإلكتروني لتأكيد التسجيل");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح");
        await checkUserRoleAndNavigate(data.user);
      }
    } catch (err: any) {
      console.error("Auth submit error:", err);
      toast.error(err?.message || "تعذر إتمام العملية");
    } finally {
      setLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="relative rounded-[2rem] border bg-card p-6 shadow-xl sm:p-8">
        {/* Close Button / Go to Home */}
        <button
          onClick={() => navigate({ to: "/" })}
          className="absolute left-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
        >
          ✕
        </button>

        <h1 className="text-center text-xl font-extrabold text-primary mb-6">الحساب</h1>

        {/* Segmented Tabs */}
        <div className="mb-8 flex rounded-xl bg-muted/30 p-1">
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
              mode === "signup" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
            }`}
          >
            إنشاء حساب
          </button>
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
              mode === "signin" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
            }`}
          >
            تسجيل الدخول
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-primary">الاسم</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border bg-background px-4 py-3.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 transition-all"
                  placeholder="الاسم الكامل"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-primary">رقم الهاتف</span>
                <div className="flex rounded-2xl border bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all overflow-hidden">
                  <div className="flex items-center justify-center bg-muted/20 px-3 border-l text-lg">
                    🇾🇪
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    className="w-full bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground/60 text-right"
                    placeholder="7XXXXXXXX"
                  />
                </div>
              </label>
            </>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-primary">البريد الإلكتروني</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="w-full rounded-2xl border bg-background px-4 py-3.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 text-right transition-all"
              placeholder="name@example.com"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-primary">كلمة المرور</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="w-full rounded-2xl border bg-background px-4 py-3.5 pl-12 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 text-right transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 2 20 20"/><path d="M6.71 6.71q2.48-2.18 5.29-2.18 5.46 0 9.27 4.19a15.11 15.11 0 0 1-2 2.65"/><path d="M14.07 14.07A3 3 0 0 1 9.93 9.93"/><path d="M17.48 17.48A14.65 14.65 0 0 1 12 18.96q-5.46 0-9.27-4.19a15.11 15.11 0 0 1 3.53-3.76"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0066cc] px-6 py-4 text-sm font-bold text-white shadow-md disabled:opacity-60 hover:bg-[#0055aa] transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              <span>تسجيل الدخول</span>
            ) : (
              <span>إنشاء حساب</span>
            )}
          </button>
        </form>

        {mode === "signin" && (
          <div className="mt-4 text-left">
            <button
              onClick={() => toast.info("سيتم إضافة خاصية استعادة كلمة المرور قريباً")}
              className="text-xs font-bold text-[#0066cc] hover:underline"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        )}

        <div className="relative mt-8 mb-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t"></div>
          </div>
          <span className="relative bg-card px-4 text-xs font-medium text-muted-foreground">أو</span>
        </div>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full rounded-2xl bg-blue-50/50 px-6 py-4 text-sm font-bold text-[#0066cc] hover:bg-blue-50 transition-colors border border-blue-100"
        >
          {mode === "signin" ? "إنشاء حساب جديد" : "تسجيل الدخول"}
        </button>
      </div>
    </div>
  );
}
