import { createFileRoute } from "@tanstack/react-router";

import { brandLogo, toolsBanner } from "@/lib/products";

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

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-col items-center text-center">
        <img
          src={brandLogo}
          alt="شعار خصب"
          className="h-28 w-28 rounded-full object-cover ring-1 ring-border"
          width={112}
          height={112}
        />
        <h1 className="mt-6 text-3xl font-extrabold text-primary">عن خصب</h1>
        <p className="mt-4 max-w-2xl leading-8 text-muted-foreground">
          خصب علامة متخصصة في القهوة المختصة: نختار محاصيل استثنائية من اليمن وإثيوبيا وأوغندا
          وكولومبيا، ونوفر إلى جانبها آلات ومطاحن وأدوات تحضير احترافية. هدفنا أن تصل تجربتك
          للكوب المثالي في بيتك أو مقهاك.
        </p>
      </div>

      <img
        src={toolsBanner}
        alt="أدوات القهوة من خصب"
        loading="lazy"
        className="mt-10 w-full rounded-3xl border object-cover"
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { t: "محاصيل مختارة", d: "تحميص طازج أسبوعياً وإيحاءات نكهة موثقة" },
          { t: "أدوات موثوقة", d: "خامات أصلية مختبرة قبل العرض" },
          { t: "دعم قريب", d: "فريق يساعدك في اختيار الأنسب لتحضيرك" },
        ].map((c) => (
          <div key={c.t} className="rounded-3xl border bg-card p-5">
            <div className="font-bold text-primary">{c.t}</div>
            <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
