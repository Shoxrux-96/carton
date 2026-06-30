import { useLocation } from "wouter";
import { MobileLayout, MobilePageHeader } from "./MobileLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";
import { ClipboardCheck, ShoppingCart, Package, User, Truck, CalendarDays, Plus, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MobileHome() {
  const { t } = useLang();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const quickActions = [
    { path: "/mobile/attendance", label: t("attendance"), icon: ClipboardCheck, color: "from-green-500 to-emerald-600" },
    { path: "/mobile/orders", label: t("orders"), icon: ShoppingCart, color: "from-blue-500 to-blue-600" },
    { path: "/mobile/products", label: t("products"), icon: Package, color: "from-amber-500 to-orange-600" },
    { path: "/mobile/production", label: t("production"), icon: Plus, color: "from-purple-500 to-violet-600" },
    { path: "/mobile/delivery", label: t("delivery"), icon: Truck, color: "from-cyan-500 to-teal-600" },
    { path: "/mobile/attendance/report", label: t("report"), icon: CalendarDays, color: "from-rose-500 to-pink-600" },
  ];

  return (
    <MobileLayout>
      <MobilePageHeader
        title={`${t("greeting")}, ${(user as any)?.name?.split(" ")[0] || t("user_fallback")}`}
        subtitle={t("day_summary")}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <TrendingUp className="w-5 h-5 text-green-600 mb-1" />
          <div className="text-lg font-bold text-green-700">12</div>
          <div className="text-[10px] text-green-600 font-medium">{t("today_attendance")}</div>
        </Card>
        <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <ShoppingCart className="w-5 h-5 text-blue-600 mb-1" />
          <div className="text-lg font-bold text-blue-700">5</div>
          <div className="text-[10px] text-blue-600 font-medium">{t("active_orders")}</div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-foreground mb-3">{t("quick_actions")}</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => setLocation(action.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all"
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[11px] font-semibold text-center leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Driver Mode */}
      <Card className="p-4 border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">{t("driver_mode")}</p>
            <p className="text-[11px] text-muted-foreground">{t("driver_mode_desc")}</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setLocation("/mobile/delivery")}>
            {t("enter")}
          </Button>
        </div>
      </Card>
    </MobileLayout>
  );
}
