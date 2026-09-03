import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type BankAccount = {
  bank: string;
  number: string;
  holder: string;
  logo_type?: string;
  custom_logo_url?: string;
};

export const defaultBankAccounts: BankAccount[] = [
  { bank: "بنك الكريمي", number: "1234567890", holder: "محمصة خصب للقهوة", logo_type: "kuraimi" },
  { bank: "بنك القطيبي", number: "9876543210", holder: "محمصة خصب للقهوة", logo_type: "qutaibi" },
  { bank: "ون كاش", number: "777000000", holder: "محمصة خصب", logo_type: "onecash" },
  { bank: "محفظة جيب", number: "733111222", holder: "محمصة خصب", logo_type: "jeeb" },
];

export const defaultPickupAddress = "الحجاز الجديد محل أضواء الدور الأول - عدن";
export const defaultWhatsAppNumber = "967777000000";
export const defaultStoreName = "محمصة خصب";
export const defaultAdenDeliveryFee = "1,000 - 5,000 ر.ي";
export const defaultAdenDeliveryFeeSar = "3 - 12 ر.س";
export const defaultPickupFee = "مجاناً";
export const defaultPickupFeeSar = "مجاناً";
export const defaultOtherDeliveryFee = "2,000 - 5,000 ر.ي";
export const defaultOtherDeliveryFeeSar = "5 - 12 ر.س";

export type HeroBanner = {
  image: string;
  title: string;
  desc: string;
};

export type SocialLink = {
  platform:
    | "instagram"
    | "whatsapp"
    | "tiktok"
    | "youtube"
    | "facebook"
    | "snapchat"
    | "twitter"
    | "telegram"
    | "other";
  url: string;
  label?: string;
};

export type StoreSettings = {
  id?: string;
  store_name?: string;
  logo_url?: string;
  announcement_text: string;
  announcement_enabled: boolean;
  whatsapp_number: string;
  pickup_address: string;
  aden_delivery_fee: string;
  aden_delivery_fee_sar?: string;
  pickup_delivery_fee: string;
  pickup_delivery_fee_sar?: string;
  other_delivery_fee: string;
  other_delivery_fee_sar?: string;
  bank_accounts: BankAccount[];
  hero_banners?: HeroBanner[];
  instagram_handle?: string;
  about_text?: string;
  footer_text?: string;
  about_cards?: { title: string; desc: string }[];
  categories?: { id: string; name: string }[];
  social_links?: SocialLink[];
};

export function parseStoreSettings(row: any): StoreSettings {
  if (!row) {
    return {
      store_name: defaultStoreName,
      logo_url: "",
      announcement_text:
        "توصيل مجاني عند الطلب بـ +100 ريال، تحميص أسبوعي، أجود أنواع القهوة المختصة",
      announcement_enabled: true,
      whatsapp_number: defaultWhatsAppNumber,
      pickup_address: defaultPickupAddress,
      aden_delivery_fee: defaultAdenDeliveryFee,
      aden_delivery_fee_sar: defaultAdenDeliveryFeeSar,
      pickup_delivery_fee: defaultPickupFee,
      pickup_delivery_fee_sar: defaultPickupFeeSar,
      other_delivery_fee: defaultOtherDeliveryFee,
      other_delivery_fee_sar: defaultOtherDeliveryFeeSar,
      bank_accounts: defaultBankAccounts,
    };
  }

  // Backwards-compat: some old rows stored extra settings inside hero_banners[0]
  let legacyExtra: any = {};
  if (
    row.hero_banners &&
    Array.isArray(row.hero_banners) &&
    row.hero_banners[0] &&
    typeof row.hero_banners[0] === "object" &&
    !row.hero_banners[0].image // not a real banner object
  ) {
    legacyExtra = row.hero_banners[0];
  }

  let bankAccounts = row.bank_accounts || legacyExtra.bank_accounts;
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

  // hero_banners: only real banner objects (those that have an .image field)
  const heroBanners: HeroBanner[] = Array.isArray(row.hero_banners)
    ? (row.hero_banners as any[]).filter((b) => b && typeof b === "object" && b.image)
    : [];

  // Parse social_links safely
  let socialLinks: SocialLink[] = [];
  if (Array.isArray(row.social_links)) {
    socialLinks = row.social_links;
  } else if (typeof row.social_links === "string") {
    try {
      socialLinks = JSON.parse(row.social_links);
    } catch {
      socialLinks = [];
    }
  } else if (Array.isArray(legacyExtra.social_links)) {
    socialLinks = legacyExtra.social_links;
  }

  return {
    id: row.id,
    // Use nullish coalescing (??) for all string fields so empty string "" is preserved correctly
    store_name: row.store_name ?? legacyExtra.store_name ?? defaultStoreName,
    logo_url: row.logo_url ?? legacyExtra.logo_url ?? "",
    announcement_text:
      row.announcement_text ??
      "توصيل مجاني عند الطلب بـ +100 ريال، تحميص أسبوعي، أجود أنواع القهوة المختصة",
    announcement_enabled: row.announcement_enabled ?? true,
    whatsapp_number: row.whatsapp_number ?? legacyExtra.whatsapp_number ?? defaultWhatsAppNumber,
    pickup_address: row.pickup_address ?? legacyExtra.pickup_address ?? defaultPickupAddress,
    aden_delivery_fee:
      row.aden_delivery_fee ?? legacyExtra.aden_delivery_fee ?? defaultAdenDeliveryFee,
    aden_delivery_fee_sar:
      row.aden_delivery_fee_sar ?? legacyExtra.aden_delivery_fee_sar ?? defaultAdenDeliveryFeeSar,
    pickup_delivery_fee:
      row.pickup_delivery_fee ?? legacyExtra.pickup_delivery_fee ?? defaultPickupFee,
    pickup_delivery_fee_sar:
      row.pickup_delivery_fee_sar ?? legacyExtra.pickup_delivery_fee_sar ?? defaultPickupFeeSar,
    other_delivery_fee:
      row.other_delivery_fee ?? legacyExtra.other_delivery_fee ?? defaultOtherDeliveryFee,
    other_delivery_fee_sar:
      row.other_delivery_fee_sar ??
      legacyExtra.other_delivery_fee_sar ??
      defaultOtherDeliveryFeeSar,
    bank_accounts: bankAccounts,
    hero_banners: heroBanners,
    instagram_handle: row.instagram_handle ?? legacyExtra.instagram_handle ?? "khasab",
    about_text: row.about_text ?? legacyExtra.about_text ?? "",
    footer_text:
      row.footer_text ??
      legacyExtra.footer_text ??
      "مو بس محصولك.. عدّتك علينا. كل أدوات القهوة اللي تحتاجها بجودة ترفع تجربتك.",
    about_cards: row.about_cards || legacyExtra.about_cards || [],
    categories: row.categories || legacyExtra.categories || [],
    social_links: socialLinks,
  };
}

export function useLiveStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: defaultStoreName,
    logo_url: "",
    announcement_text:
      "توصيل مجاني عند الطلب بـ +100 ريال، تحميص أسبوعي، أجود أنواع القهوة المختصة",
    announcement_enabled: true,
    whatsapp_number: defaultWhatsAppNumber,
    pickup_address: defaultPickupAddress,
    aden_delivery_fee: defaultAdenDeliveryFee,
    aden_delivery_fee_sar: defaultAdenDeliveryFeeSar,
    pickup_delivery_fee: defaultPickupFee,
    pickup_delivery_fee_sar: defaultPickupFeeSar,
    other_delivery_fee: defaultOtherDeliveryFee,
    other_delivery_fee_sar: defaultOtherDeliveryFeeSar,
    bank_accounts: defaultBankAccounts,
    hero_banners: [],
    instagram_handle: "khasab",
    about_text: "",
    footer_text: "مو بس محصولك.. عدّتك علينا. كل أدوات القهوة اللي تحتاجها بجودة ترفع تجربتك.",
    about_cards: [],
    categories: [],
    social_links: [],
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("store_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch store_settings:", error);
      }
      if (data) {
        setSettings(parseStoreSettings(data));
      }
    } catch (err) {
      console.error("useLiveStoreSettings error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const chId = `settings-live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(chId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings" },
        (payload) => {
          console.log("Store settings updated via Realtime:", payload);
          load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading, reload: load };
}
