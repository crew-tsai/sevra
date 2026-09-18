import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Activity, Megaphone, ShieldAlert, FileCheck2, Radar, Bot, History, Layers, ArrowRight } from "lucide-react";
import { BrowserMockup } from "@/components/marketing/BrowserMockup";
import { DeviceMockup } from "@/components/marketing/DeviceMockup";
import dashboardShot from "@/assets/product-dashboard.png";
import dashboardMobileShot from "@/assets/product-dashboard-mobile.png";
import sevraAiShot from "@/assets/product-sevra-ai.png";
import { useMessages } from "@/i18n";
import { productMessages } from "@/i18n/messages/product-about";


const MODULE_ICONS = [Radar, ShieldAlert, Bot, FileCheck2, Megaphone, Activity, History, Layers];

export default function Product() {
  const t = useMessages(productMessages);
  const modules = t.modules.map((mod, i) => ({ ...mod, icon: MODULE_ICONS[i] }));
  return (
    <div>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <p className="text-xs uppercase tracking-widest text-primary">{t.eyebrow}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
          {t.intro}
        </p>
      </section>

      {/* Dashboard screenshot */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-28">
        <DeviceMockup desktopSrc={dashboardShot} mobileSrc={dashboardMobileShot} alt={t.dashboardAlt} url="app.sevra.ai/dashboard" />
        <p className="mt-10 text-center text-sm text-muted-foreground">{t.dashboardCaption}</p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="sr-only">{t.modulesHeading}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((m) => (
            <Card key={m.title} className="bg-card border-border p-6 flex flex-col">
              <div className="h-10 w-10 rounded-md bg-primary/15 flex items-center justify-center text-primary mb-4">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{m.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 flex-1">{m.body}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {m.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {b}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Sevra AI screenshot */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-widest text-primary">{t.aiEyebrow}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{t.aiTitle}</h2>
            <p className="mt-4 text-muted-foreground">
              {t.aiBody}
            </p>
          </div>
          <BrowserMockup src={sevraAiShot} alt={t.aiAlt} url="app.sevra.ai/sevra" />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t.ctaTitle}</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            {t.ctaBody}
          </p>
          <Link
            to="/#contact"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t.requestDemo} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>

  );
}
