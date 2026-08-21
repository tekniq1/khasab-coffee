import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LockKeyhole, UserCheck, ShieldAlert } from "lucide-react";
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
      const isAdmin =
        user.email === "gfyhhgftyj@gmail.com" ||
        (
          await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle()
        ).data?.role === "admin";

      if (isAdmin) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: (redirect || "/") as any });
      }
    } catch {
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
    setLoading(true);
    try {
      if (mode === "signup") {
        // Only customer accounts can be created via public sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
              role: "customer",
            },
            emailRedirectTo: `${window.location.origin}${redirect || "/"}`,
          },
        });
        if (error) throw error;

        // Upsert into public.profiles
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName,
            phone: phone,
            updated_at: new Date().toISOString(),
          });
        }

        toast.success("تم إنشاء حساب العميل بنجاح");
        if (data.session) {
          await checkUserRoleAndNavigate(data.user);
        } else {
          toast.info("يرجى تفقّد بريدك الإلكتروني لتأكيد التسجيل");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح");
        await checkUserRoleAndNavigate(data.user);
      }
    } catch (err: any) {
      toast.error(err?.message || "تعذر إتمام العملية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border bg-card p-7 shadow-lg">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-extrabold text-primary">
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب عميل جديد"}
        </h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {redirect ? "سجّل دخولك لمتابعة إتمام طلبك في محمصة خصب" : "مرحباً بك في منصة محمصة خصب للقهوة المختصة"}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                  الاسم الكامل *
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="أحمد عبد الله"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                  رقم الهاتف *
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="77XXXXXXX"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              البريد الإلكتروني *
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="name@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              كلمة المرور *
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md disabled:opacity-60 hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب العميل"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center text-xs font-semibold text-secondary hover:underline"
        >
          {mode === "signin" ? "ليس لديك حساب؟ إنشاء حساب عميل جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}
        </button>
      </div>
    </div>
  );
}
