import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, Phone, Youtube, Twitter, Facebook, Globe } from "lucide-react";

import { brandLogo, categories } from "@/lib/products";
import { useLiveStoreSettings } from "@/lib/settings";

export function SiteFooter() {
  const { settings } = useLiveStoreSettings();
  const phone = settings.whatsapp_number || "967777000000";
  const cleanPhone = phone.replace(/\D/g, "");

  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={settings.logo_url || brandLogo}
              alt={`شعار ${settings.store_name || "خصب"}`}
              loading="lazy"
              className="h-14 w-14 rounded-full object-cover ring-1 ring-white/20 bg-background"
              width={56}
              height={56}
            />
            <div>
              <div className="text-xl font-extrabold">{settings.store_name || "خصب"}</div>
              <p className="text-sm opacity-75">محاصيل وأدوات القهوة المختصة</p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-7 opacity-75">
            {settings.footer_text ||
              "مو بس محصولك.. عدّتك علينا. كل أدوات القهوة اللي تحتاجها بجودة ترفع تجربتك."}
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
            <li className="flex items-center gap-2" dir="ltr">
              <Phone className="h-4 w-4 shrink-0" />
              <span>+{cleanPhone}</span>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-secondary"
              >
                واتساب خدمة العملاء
              </a>
            </li>
            {settings.social_links && settings.social_links.length > 0 ? (
              settings.social_links.map((link, idx) => {
                let Icon = Globe;
                if (link.platform === "instagram") Icon = Instagram;
                else if (link.platform === "whatsapp") Icon = MessageCircle;
                else if (link.platform === "youtube") Icon = Youtube;
                else if (link.platform === "facebook") Icon = Facebook;
                else if (link.platform === "twitter") Icon = Twitter;

                return (
                  <li key={idx} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-secondary"
                    >
                      {link.platform === "instagram"
                        ? link.label || `@${link.url.split("/").pop()?.split("?")[0]}`
                        : link.label || link.platform}
                    </a>
                  </li>
                );
              })
            ) : (
              <>
                {settings.instagram_handle ? (
                  <li className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 shrink-0" />
                    <a
                      href={`https://instagram.com/${settings.instagram_handle.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-secondary"
                    >
                      @{settings.instagram_handle.replace("@", "")}
                    </a>
                  </li>
                ) : (
                  <li className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 shrink-0" /> @khasab
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs opacity-60">
        © {new Date().getFullYear()} خصب — جميع الحقوق محفوظة ·{" "}
        <Link to="/admin" className="hover:text-secondary font-bold">
          دخول الإدارة (لوحة التحكم)
        </Link>
      </div>
    </footer>
  );
}
