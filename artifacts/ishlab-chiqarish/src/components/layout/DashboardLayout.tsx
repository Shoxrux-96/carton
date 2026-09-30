import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t, lang, setLang } = useLang();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-zinc-50 to-amber-50/30 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-x-hidden overflow-y-auto relative">
        {/* Top bar with language switcher + APK download */}
        <div className="sticky top-0 z-20 h-12 bg-white/80 backdrop-blur-sm border-b border-border/50 shrink-0 flex items-center justify-end px-6 gap-2">
          <a
            href="/apk/shovot-carton.apk"
            download
            title="Mobil ilovani (APK) yuklab olish"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            APK
          </a>
          <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg p-1">
            <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
            <button
              onClick={() => setLang("uz")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${lang === "uz" ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              UZ
            </button>
            <button
              onClick={() => setLang("ru")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${lang === "ru" ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              RU
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-8 lg:p-10 w-full max-w-[1494px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full h-full pb-24"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string, description?: string, action?: React.ReactNode }) {
  const [location] = useLocation();
  const segments = location.split("/").filter(Boolean);

  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground/60 mb-3">
        <span>Dashboard</span>
        {segments.slice(1).map((seg, i) => (
          <span key={seg} className="flex items-center gap-2">
            <span>/</span>
            <span className={i === segments.slice(1).length - 1 ? "text-foreground font-medium" : ""}>
              {seg.charAt(0).toUpperCase() + seg.slice(1)}
            </span>
          </span>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-2 text-sm">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
