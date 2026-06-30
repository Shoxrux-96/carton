import { useEffect } from "react";
import { useLocation, useRouter } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";
import { Home, ClipboardCheck, ShoppingCart, Package, User, Truck } from "lucide-react";

export function MobileLayout({ children, title, driverMode }: { children: React.ReactNode; title?: string; driverMode?: boolean }) {
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  const bottomTabs = [
    { path: "/mobile", label: t("home"), icon: Home },
    { path: "/mobile/attendance", label: t("attendance"), icon: ClipboardCheck },
    { path: "/mobile/orders", label: t("orders"), icon: ShoppingCart },
    { path: "/mobile/products", label: t("products"), icon: Package },
    { path: "/mobile/profile", label: t("profile"), icon: User },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const tabs = driverMode
    ? [
        { path: "/mobile/delivery", label: t("delivery"), icon: Truck },
        { path: "/mobile/profile", label: t("profile"), icon: User },
      ]
    : bottomTabs;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-zinc-50 to-amber-50/20 max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 px-4 py-3 shrink-0 flex items-center gap-3 z-10">
        <button onClick={() => setLocation("/mobile")} className="text-amber-600 font-bold text-lg tracking-tight">
          Shovot Carton
        </button>
        {title && (
          <>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-sm font-medium text-muted-foreground truncate">{title}</span>
          </>
        )}
        {driverMode && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium flex items-center gap-1">
            <Truck className="w-3 h-3" /> {t("driver")}
          </span>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-amber-100 px-2 pb-2 pt-1 z-20">
        <div className={`grid gap-1 ${tabs.length <= 5 ? "grid-cols-5" : "grid-cols-4"}`}>
          {tabs.map(tab => {
            const isActive = location === tab.path || location.startsWith(tab.path + "/");
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => setLocation(tab.path)}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all ${
                  isActive ? "text-amber-600" : "text-muted-foreground/60 hover:text-muted-foreground"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-amber-100" : ""}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-amber-600" : ""}`} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function MobilePageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {action && <div>{action}</div>}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}
