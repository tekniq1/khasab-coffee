import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type BankAccount = {
  bank: string;
  number: string;
  holder: string;
};

export const defaultBankAccounts: BankAccount[] = [
  { bank: "بنك الكريمي", number: "1234567890", holder: "محمصة خصب للقهوة" },
  { bank: "بنك القطيبي", number: "9876543210", holder: "محمصة خصب للقهوة" },
  { bank: "ون كاش", number: "777000000", holder: "محمصة خصب" },
  { bank: "محفظة جيب", number: "733111222", holder: "محمصة خصب" },
];

export const defaultPickupAddress = "الحجاز الجديد محل أضواء الدور الأول - عدن";
export const defaultWhatsAppNumber = "967777000000";

export type StoreSettings = {
  id?: string;
  announcement_text: string;
  announcement_enabled: boolean;
  whatsapp_number: string;
  pickup_address: string;
  bank_accounts: BankAccount[];
};

export function parseStoreSettings(row: any): StoreSettings {
  if (!row) {
    return {
      announcement_text: "توصيل مجاني عند الطلب بـ +100 ريال، تحميص أسبوعي، أجود أنواع القهوة المختصة",
      announcement_enabled: true,
      whatsapp_number: defaultWhatsAppNumber,
      pickup_address: defaultPickupAddress,
      bank_accounts: defaultBankAccounts,
    };
  }

  // Check if extra settings are stored inside hero_banners JSON or direct columns
  let extra: any = {};
  if (row.hero_banners) {
    if (Array.isArray(row.hero_banners) && row.hero_banners[0] && typeof row.hero_banners[0] === "object") {
      extra = row.hero_banners[0];
    } else if (typeof row.hero_banners === "object" && !Array.isArray(row.hero_banners)) {
      extra = row.hero_banners;
    }
  }

  let bankAccounts = row.bank_accounts || extra.bank_accounts;
  if (typeof bankAccounts === "string") {
    try {
      bankAccounts = JSON.parse(bankAccounts);
    } catch {
      bankAccounts = defaultBankAccounts;
    }
  }
  if (!Array.isArray(bankAccounts) || bankAccounts.length === 0) {
    bankAccounts = defaultBankAccounts;
  }

  return {
    id: row.id,
    announcement_text: row.announcement_text ?? "توصيل مجاني عند الطلب بـ +100 ريال، تحميص أسبوعي، أجود أنواع القهوة المختصة",
    announcement_enabled: row.announcement_enabled ?? true,
    whatsapp_number: row.whatsapp_number || extra.whatsapp_number || defaultWhatsAppNumber,
    pickup_address: row.pickup_address || extra.pickup_address || defaultPickupAddress,
    bank_accounts: bankAccounts,
  };
}

export function useLiveStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>({
    announcement_text: "توصيل مجاني عند الطلب بـ +100 ريال، تحميص أسبوعي، أجود أنواع القهوة المختصة",
    announcement_enabled: true,
    whatsapp_number: defaultWhatsAppNumber,
    pickup_address: defaultPickupAddress,
    bank_accounts: defaultBankAccounts,
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      setSettings(parseStoreSettings(data));
    } catch {
      // fallback to defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const chId = `settings-live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(chId)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading, reload: load };
}
