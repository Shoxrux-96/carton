import { MobileLayout, MobilePageHeader } from "./MobileLayout";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { User, Shield, Phone, Mail, LogOut, Key, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useState } from "react";

export default function MobileProfile() {
  const { t, lang, setLang } = useLang();
  const { user: rawUser, logout } = useAuth();
  const authOpts = useAuthHeaders();
  const user = rawUser as any;
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  // Fetch employee data to get login credentials
  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => customFetch("/api/employees", { headers: authOpts.headers }).then(r => r.json()),
  });

  // Find this user's employee record by phone
  const myEmployee = Array.isArray(employees)
    ? employees.find((e: any) => e.loginPhone === user?.phone || e.phone === user?.phone)
    : null;

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const initials = (myEmployee?.name || user?.name)
    ? (myEmployee?.name || user?.name).split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const roleLabel = user?.role === "admin" ? t("role_admin") : user?.role === "driver" ? t("role_driver") : t("role_employee");

  return (
    <MobileLayout title={t("profile")}>
      <MobilePageHeader title={t("my_profile")} />

      {/* Avatar & Name */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-amber-200 mb-3">
          {initials}
        </div>
        <h2 className="text-lg font-bold">{myEmployee?.name || user?.name || t("user_fallback")}</h2>
        <p className="text-xs text-muted-foreground">{roleLabel}</p>
        {user?.role === "admin" && (
          <span className="mt-1 px-3 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium flex items-center gap-1">
            <Shield className="w-3 h-3" /> {t("role_admin")}
          </span>
        )}
      </div>

      {/* Info */}
      <Card className="border-0 shadow-md p-4 mb-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <User className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("full_name")}</p>
              <p className="text-sm font-medium">{myEmployee?.name || user?.name || "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Phone className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("phone")}</p>
              <p className="text-sm font-medium">{myEmployee?.phone || user?.phone || "-"}</p>
            </div>
          </div>
          {myEmployee?.position && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Mail className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("position_col")}</p>
                <p className="text-sm font-medium">{myEmployee.position}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Login Credentials */}
      {myEmployee?.loginPhone && (
        <Card className="border-0 shadow-md p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold">{t("mobile_login")}</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-[11px] text-muted-foreground">{t("login_phone")}</p>
                <p className="text-sm font-mono font-medium">{myEmployee.loginPhone}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-[11px] text-muted-foreground">{t("password_label")}</p>
                <p className="text-sm font-mono font-medium">
                  {showPassword ? myEmployee.loginPassword : "••••••••"}
                </p>
              </div>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Language Switcher */}
      <Card className="border-0 shadow-md p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t("language")}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setLang("uz")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${lang === "uz" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              {t("uzbek")}
            </button>
            <button
              onClick={() => setLang("ru")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${lang === "ru" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              {t("russian")}
            </button>
          </div>
        </div>
      </Card>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        {t("logout")}
      </button>
    </MobileLayout>
  );
}
