import { createFileRoute } from "@tanstack/react-router";
import { brandLogo, toolsBanner } from "@/lib/products";
import { useLiveStoreSettings } from "@/lib/settings";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن خصب — قهوة مختصة وأدوات باريستا" },
      {
        name: "description",
        content: "خصب علامة يمنية متخصصة في محاصيل البن المختصة وآلات وأدوات القهوة الاحترافية.",
      },
      { property: "og:title", content: "عن خصب" },
      { property: "og:description", content: "محاصيل بن مختصة وأدوات باريستا بجودة ترفع تجربتك." },
    ],
  }),
  component: AboutPage,
});

const defaultAboutText = "خصب علامة متخصصة في القهوة المختصة: نختار محاصيل استثنائية من اليمن وإثيوبيا وأوغندا وكولومبيا، ونوفر إلى جانبها آلات ومطاحن وأدوات تحضير احترافية. هدفنا أن تصل تجربتك للكوب المثالي في بيتك أو مقهاك.";

const defaultCards = [
  { title: "محاصيل مختارة", desc: "تحميص طازج أسبوعياً وإيحاءات نكهة موثقة" },
  { title: "أدوات موثوقة", desc: "خامات أصلية مختبرة قبل العرض" },
  { title: "دعم قريب", desc: "فريق يساعدك في اختيار الأنسب لتحضيرك" },
];

function AboutPage() {
  const { settings } = useLiveStoreSettings();
  const aboutText = settings.about_text || defaultAboutText;
  const cards = (settings.about_cards && settings.about_cards.length > 0) ? settings.about_cards : defaultCards;
  const logoSrc = settings.logo_url || brandLogo;
  const storeName = settings.store_name || "خصب";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col items-center text-center">
        <img
          src={logoSrc}
          alt={`شعار ${storeName}`}
          className="h-28 w-28 rounded-full object-cover ring-1 ring-border"
          width={112}
          height={112}
        />
        <h1 className="mt-6 text-3xl font-extrabold text-primary">عن {storeName}</h1>
        <p className="mt-4 max-w-2xl leading-8 text-muted-foreground whitespace-pre-line">
          {aboutText}
        </p>
      </div>

      <img
        src={toolsBanner}
        alt="أدوات القهوة من خصب"
        loading="lazy"
        className="mt-10 w-full rounded-3xl border object-cover"
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {cards.map((c, i) => (
          <div key={i} className="rounded-3xl border bg-card p-5">
            <div className="font-bold text-primary">{c.title}</div>
            <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
