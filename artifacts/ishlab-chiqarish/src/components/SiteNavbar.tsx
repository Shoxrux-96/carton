import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function SiteNavbar() {
  const [location] = useLocation();
  const { t, lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onCatalog = location.startsWith("/catalog");

  const navLinks = [
    { href: "/#about", label: t("landing_about") },
    { href: "/#services", label: t("landing_services") },
    { href: "/#features", label: t("landing_why_us_nav") },
    { href: "/catalog", label: t("landing_catalog") },
    { href: "/#contact", label: t("landing_contact") },
  ];

  const handleNav = (e: React.MouseEvent, href: string) => {
    setMenuOpen(false);
    const [path, hash] = href.split("#");
    if (hash && location.replace(/\/+$/, "") === path.replace(/\/+$/, "")) {
      e.preventDefault();
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const linkClass = (href: string) =>
    `transition-colors relative after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-amber-500 after:transition-all hover:after:w-full ${
      href === "/catalog"
        ? onCatalog
          ? "text-amber-600 font-semibold after:w-full"
          : "hover:text-foreground hover:text-amber-600"
        : "hover:text-foreground hover:text-amber-600"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}images/logo-circle.png`}
            alt="Shovot Carton"
            className="w-14 h-14 rounded-full object-contain ring-2 ring-amber-300 ring-offset-2 ring-offset-background shadow-lg shadow-amber-500/30 bg-white"
          />
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground leading-tight">Shovot Carton</div>
            <div className="text-xs text-muted-foreground">shovotcarton.uz</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={(e) => handleNav(e, l.href)} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Language Dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-amber-300 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>{lang === "uz" ? "UZ" : "RU"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
                <button
                  onClick={() => { setLang("uz"); setLangOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${lang === "uz" ? "bg-amber-50 text-amber-700" : "hover:bg-muted"}`}
                >
                  🇺🇿 O'zbekcha
                </button>
                <button
                  onClick={() => { setLang("ru"); setLangOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${lang === "ru" ? "bg-amber-50 text-amber-700" : "hover:bg-muted"}`}
                >
                  🇷🇺 Русский
                </button>
              </div>
            )}
          </div>

          <Link href="/login">
            <Button variant="outline" className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 font-semibold hidden sm:inline-flex">
              {t("landing_login")}
            </Button>
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg border border-border text-foreground hover:border-amber-300 transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="lg:hidden border-t border-border/50 bg-background/98">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1">
            {navLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={(e) => handleNav(e, l.href)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                  l.href === "/catalog" && onCatalog
                    ? "bg-amber-50 text-amber-700"
                    : "text-muted-foreground hover:bg-amber-50 hover:text-amber-700"
                }`}
              >
                {l.label}
                <ChevronRight className="w-4 h-4" />
              </Link>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="outline" className="w-full mt-2 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold">
                {t("landing_login")}
              </Button>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
