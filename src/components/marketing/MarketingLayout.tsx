import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { signInPath } from "@/lib/home";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import sevraLogo from "@/assets/sevra-logo-dark.png";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useMessages } from "@/i18n";
import { marketingLayoutMessages } from "@/i18n/messages/marketing-layout";

const NAV: ReadonlyArray<{ to: string; key: "home" | "ourProduct" | "aboutUs"; end?: boolean }> = [
  { to: "/", key: "home", end: true },
  { to: "/product", key: "ourProduct" },
  { to: "/about", key: "aboutUs" },
];

export default function MarketingLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const m = useMessages(marketingLayoutMessages);

  useEffect(() => {
    window.scrollTo(0, 0);
    setOpen(false);
  }, [pathname]);

  return (
    <div className="marketing min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 md:h-28 lg:h-36 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img
              src={sevraLogo}
              alt={m.logoHome}
              className="h-10 sm:h-14 md:h-24 lg:h-32 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {m[n.key]}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              to={signInPath()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              {m.logIn}
            </Link>
            <button
              type="button"
              aria-label={open ? m.closeMenu : m.openMenu}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center rounded-md border border-border h-9 w-9 text-foreground hover:bg-muted/40 transition"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-base font-medium transition-colors ${
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`
                  }
                >
                  {m[n.key]}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 pb-24 sm:pb-28">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={sevraLogo} alt={m.logo} className="h-12 sm:h-16 md:h-24 lg:h-32 w-auto" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} Sevra · {m.productBy}{" "}
              <a
                href="https://thestellar.ai"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground underline underline-offset-2 decoration-border"
              >
                The Stellar Crew
              </a>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/product" className="hover:text-foreground">{m.product}</Link>
            <Link to="/about" className="hover:text-foreground">{m.about}</Link>
            <Link to={signInPath()} className="hover:text-foreground">{m.logIn}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
