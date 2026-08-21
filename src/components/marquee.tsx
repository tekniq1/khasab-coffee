import { useLiveStoreSettings } from "@/lib/settings";

const defaultMessages = [
  "توصيل مجاني عند الطلب بـ +100 ريال",
  "تحميص أسبوعي طازج",
  "أجود أنواع القهوة المختصة",
  "أدوات ومستلزمات باريستا احترافية",
];

export function Marquee() {
  const { settings } = useLiveStoreSettings();

  if (!settings.announcement_enabled) return null;

  const messages = settings.announcement_text
    ? [settings.announcement_text, ...defaultMessages]
    : defaultMessages;

  return (
    <div className="overflow-hidden bg-primary py-2 text-primary-foreground">
      <div className="marquee-track w-max whitespace-nowrap">
        {[0, 1].map((rep) => (
          <div key={rep} className="flex items-center">
            {messages.map((m, idx) => (
              <span key={idx} className="mx-6 text-xs font-medium sm:text-sm">
                <span className="ms-3 text-secondary">✦</span> {m}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
