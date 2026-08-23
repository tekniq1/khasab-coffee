import React from "react";
import { Building2, CreditCard, Wallet } from "lucide-react";

interface BankLogoProps {
  bankName: string;
  logoType?: string;
  customLogoUrl?: string;
  className?: string;
}

export function BankLogo({ bankName, logoType, customLogoUrl, className = "h-9 w-9" }: BankLogoProps) {
  if (customLogoUrl) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-card border overflow-hidden shadow-xs p-1 ${className}`}
        title={bankName}
      >
        <img src={customLogoUrl} alt={bankName} className="h-full w-full object-contain rounded-lg" />
      </div>
    );
  }

  const name = (bankName || "").toLowerCase();
  const type = (logoType || "").toLowerCase();

  // 1. Kuraimi Bank (الكريمي)
  if (type === "kuraimi" || name.includes("كريمي") || name.includes("kuraimi")) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#005C8A] to-[#003B5C] text-white shadow-xs p-1.5 ${className}`}
        title="بنك الكريمي للتمويل الأصغر الإسلامي"
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
          <rect width="40" height="40" rx="8" fill="#005C8A" />
          <path d="M8 20L20 8L32 20L20 32L8 20Z" fill="#7AB800" opacity="0.9" />
          <path d="M14 20L20 14L26 20L20 26L14 20Z" fill="#FFFFFF" />
          <circle cx="20" cy="20" r="3" fill="#005C8A" />
        </svg>
      </div>
    );
  }

  // 2. Al-Qutaibi Bank (القطيبي)
  if (type === "qutaibi" || name.includes("قطيبي") || name.includes("qutaibi")) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A4D3C] to-[#052E24] text-white shadow-xs p-1.5 ${className}`}
        title="بنك القطيبي الإسلامي للتمويل الأصغر"
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
          <rect width="40" height="40" rx="8" fill="#0A4D3C" />
          <circle cx="20" cy="20" r="13" stroke="#D4AF37" strokeWidth="2.5" />
          <path d="M13 20C13 16 16 13 20 13C24 13 27 16 27 20C27 24 24 27 20 27" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M20 20L25 25" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2.5" fill="#D4AF37" />
        </svg>
      </div>
    );
  }

  // 3. OneCash (ون كاش)
  if (type === "onecash" || name.includes("ون كاش") || name.includes("one cash") || name.includes("onecash")) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2F64] to-[#061A3A] text-white shadow-xs p-1.5 ${className}`}
        title="محفظة ون كاش الإلكترونية (OneCash)"
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
          <rect width="40" height="40" rx="8" fill="#0B2F64" />
          <circle cx="20" cy="20" r="14" fill="#F58220" />
          <path d="M17 14L21 11V29H17V14Z" fill="#FFFFFF" />
          <path d="M21 29H25V26H21V29Z" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  // 4. Jeeb Wallet (محفظة جيب - بنك التضامن)
  if (type === "jeeb" || name.includes("جيب") || name.includes("jeeb") || name.includes("تضامن")) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E30613] to-[#A0040D] text-white shadow-xs p-1.5 ${className}`}
        title="محفظة جيب (بنك التضامن)"
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
          <rect width="40" height="40" rx="8" fill="#E30613" />
          <path d="M12 15C12 13.5 13.5 12 15 12H25C26.5 12 28 13.5 28 15V22C28 26 25 29 20 29C15 29 12 26 12 22V15Z" fill="#FFFFFF" />
          <path d="M16 17H24V21C24 23.2 22.2 25 20 25C17.8 25 16 23.2 16 21V17Z" fill="#E30613" />
        </svg>
      </div>
    );
  }

  // 5. Aden Islamic Bank (بنك عدن الإسلامي)
  if (type === "aden" || name.includes("عدن") || name.includes("aden")) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1B365D] to-[#0F2038] text-white shadow-xs p-1.5 ${className}`}
        title="بنك عدن الإسلامي"
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
          <rect width="40" height="40" rx="8" fill="#1B365D" />
          <path d="M20 9L31 16V29C31 30.1 30.1 31 29 31H11C9.9 31 9 30.1 9 29V16L20 9Z" stroke="#D4AF37" strokeWidth="2.5" fill="none" />
          <path d="M15 21V27M20 21V27M25 21V27" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 6. Al-Busairi Bank (بنك البسيري)
  if (type === "busairi" || name.includes("بسيري") || name.includes("busairi")) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D2C54] to-[#051529] text-white shadow-xs p-1.5 ${className}`}
        title="شركة و بنك البسيري"
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
          <rect width="40" height="40" rx="8" fill="#0D2C54" />
          <circle cx="20" cy="20" r="12" stroke="#00A896" strokeWidth="2.5" />
          <path d="M14 20H26M20 14V26" stroke="#F4D35E" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 7. Al-Shomool Bank (بنك الشمول)
  if (type === "shomool" || name.includes("شمول") || name.includes("shomool")) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#134E5E] to-[#71B280] text-white shadow-xs p-1.5 ${className}`}
        title="بنك الشمول للتمويل الأصغر الإسلامي"
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
          <rect width="40" height="40" rx="8" fill="#134E5E" />
          <circle cx="20" cy="20" r="12" fill="#71B280" opacity="0.85" />
          <path d="M16 16L24 24M24 16L16 24" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Default fallback Bank Badge
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary border border-secondary/30 shadow-xs p-2 ${className}`}
      title={bankName || "حساب بنكي"}
    >
      <Building2 className="h-full w-full" />
    </div>
  );
}

export const availableBankOptions = [
  { id: "kuraimi", name: "بنك الكريمي للتمويل الأصغر الإسلامي" },
  { id: "qutaibi", name: "بنك القطيبي الإسلامي" },
  { id: "onecash", name: "محفظة ون كاش (OneCash)" },
  { id: "jeeb", name: "محفظة جيب (بنك التضامن)" },
  { id: "aden", name: "بنك عدن الإسلامي" },
  { id: "busairi", name: "بنك البسيري للتمويل الأصغر" },
  { id: "shomool", name: "بنك الشمول للتمويل الأصغر" },
  { id: "other", name: "حساب بنكي / محفظة أخرى" },
];
