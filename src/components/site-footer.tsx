import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, Phone } from "lucide-react";

import { brandLogo, categories } from "@/lib/products";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={brandLogo}
              alt="شعار خصب"
              loading="lazy"
              className="h-14 w-14 rounded-full object-cover"
              width={56}
              height={56}
            />
            <div>
              <div className="text-xl font-extrabold">خصب</div>
              <p className="text-sm opacity-75">محاصيل وأدوات القهوة المختصة</p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-7 opacity-75">
            مو بس محصولك.. عدّتك علينا. كل أدوات القهوة اللي تحتاجها بجودة ترفع تجربتك.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-secondary">التصنيفات</h3>
          <ul className="space-y-2 text-sm opacity-85">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to="/products" search={{ cat: c.id }} className="hover:text-secondary">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-secondary">تواصل معنا</h3>
          <ul className="space-y-3 text-sm opacity-85">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" /> 777 000 000
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <a href="https://wa.me/967777000000" className="hover:text-secondary">
                واتساب خدمة العملاء
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="h-4 w-4 shrink-0" /> @khasab
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs opacity-60">
        © {new Date().getFullYear()} خصب — جميع الحقوق محفوظة ·{" "}
        <Link to="/auth" className="hover:text-secondary">
          دخول الإدارة
        </Link>
      </div>
    </footer>
  );
}
