import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import {
  LayoutDashboard,
  Package,
  Wrench,
  TrendingUp,
  LogOut,
  Users,
  Building2,
  ShoppingCart,
  Briefcase,
  ClipboardCheck,
  Landmark,
  ChevronDown,
  Box,
  Warehouse,
  Truck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface NavGroup {
  label: string;
  key: string;
  icon: any;
  children: { href: string; label: string; icon: any }[];
}

function NavGroupItem({ group, location, isOpen, onToggle }: {
  group: NavGroup;
  location: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const isActive = group.children.some(c => location === c.href);
  const GroupIcon = group.icon;

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group",
          isActive
            ? "bg-sidebar-active text-white shadow-md"
            : "hover:bg-white/5 text-sidebar-foreground/80 hover:text-white"
        )}
      >
        <GroupIcon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-sidebar-foreground/50 group-hover:text-white/80")} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        isOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
      )}>
        <div className="ml-3 pl-4 border-l border-white/10 space-y-1">
          {group.children.map((child) => {
            const isChildActive = location === child.href;
            const ChildIcon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isChildActive
                    ? "bg-white/10 text-white"
                    : "text-sidebar-foreground/60 hover:text-white hover:bg-white/5"
                )}
              >
                <ChildIcon className="w-4 h-4 shrink-0" />
                <span>{child.label}</span>
                {isChildActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [openGroups, setOpenGroups] = useState<string[]>(["manufacturing"]);
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLang();

  const groups: NavGroup[] = [
    {
      label: t("manufacturing"),
      key: "manufacturing",
      icon: Box,
      children: [
        { href: "/dashboard/products", label: t("products"), icon: Package },
        { href: "/dashboard/production", label: t("production"), icon: Wrench },
        { href: "/dashboard/warehouse", label: t("warehouse"), icon: Warehouse },
      ],
    },
    {
      label: t("trade"),
      key: "trade",
      icon: ShoppingCart,
      children: [
        { href: "/dashboard/orders", label: t("orders"), icon: ShoppingCart },
        { href: "/dashboard/delivery", label: t("delivery"), icon: Truck },
        { href: "/dashboard/sales", label: t("sales"), icon: TrendingUp },
        { href: "/dashboard/leads", label: t("leads"), icon: Users },
        { href: "/dashboard/clients", label: t("clients"), icon: Building2 },
      ],
    },
    {
      label: t("hr"),
      key: "hr",
      icon: Briefcase,
      children: [
        { href: "/dashboard/employees", label: t("employees"), icon: Briefcase },
        { href: "/dashboard/attendance", label: t("attendance"), icon: ClipboardCheck },
      ],
    },
  ];

  const singleItems = [
    { href: "/dashboard", label: t("home"), icon: LayoutDashboard },
    { href: "/dashboard/finance", label: t("finance"), icon: Landmark },
  ];

  const toggleGroup = (key: string) => {
    setOpenGroups(prev =>
      prev.includes(key)
        ? prev.filter(g => g !== key)
        : [...prev, key]
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/30">
          S
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Shovot Carton</h1>
          <p className="text-xs text-white/50 font-medium">{t("control_panel")}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5">
        {/* Single items */}
        {singleItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-active text-white shadow-md"
                  : "hover:bg-white/5 text-sidebar-foreground/80 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-sidebar-foreground/50 group-hover:text-white/80")} />
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-400 rounded-r-full shadow-lg shadow-amber-400/50" />
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-white/5" />

        {/* Groups */}
        {groups.map((group) => (
          <NavGroupItem
            key={group.key}
            group={group}
            location={location}
            isOpen={openGroups.includes(group.key)}
            onToggle={() => toggleGroup(group.key)}
          />
        ))}
      </div>

      {/* User & Logout */}
      <div className="p-4 border-t border-white/10">
        <Link
          href="/dashboard/profile"
          className="px-4 py-3 mb-2 bg-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-md">
            {user?.phone?.slice(-2) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.phone || "Owner"}</p>
            <p className="text-xs text-white/50">{t("administrator")}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-medium text-sidebar-foreground/60 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span>{t("logout")}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0 shadow-2xl z-30">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar shadow-2xl animate-in slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30 flex items-center justify-center"
      >
        <MenuIcon />
      </button>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
