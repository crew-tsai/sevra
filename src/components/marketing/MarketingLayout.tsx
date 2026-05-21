import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import sevraLogo from "@/assets/sevra-logo-dark.png";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/product", label: "Our Product" },
  { to: "/about", label: "About Us" },
];

export default function MarketingLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="marketing min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-36 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={sevraLogo} alt="Sevra" className="h-28 md:h-32 w-auto" />
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
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={sevraLogo} alt="Sevra" className="h-28 md:h-32 w-auto" />
            <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} Sevra. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/product" className="hover:text-foreground">Product</Link>
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/login" className="hover:text-foreground">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
