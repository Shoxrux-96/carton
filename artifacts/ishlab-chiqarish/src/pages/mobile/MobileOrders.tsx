import { useState, useMemo } from "react";
import { MobileLayout, MobilePageHeader } from "./MobileLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import customFetch from "@/lib/custom-fetch";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Clock, Package, Phone, MapPin, Search } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  in_production: "bg-purple-100 text-purple-700",
  ready: "bg-green-100 text-green-700",
  shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function MobileOrders() {
  const { t } = useLang();
  const authOpts = useAuthHeaders();
  const [search, setSearch] = useState("");

  const statusLabels: Record<string, string> = {
    pending: t("status_pending"),
    approved: t("status_approved"),
    in_production: t("status_in_production"),
    ready: t("status_ready"),
    shipped: t("status_shipped"),
    delivered: t("status_delivered"),
    cancelled: t("status_cancelled"),
  };

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: () => customFetch("/api/orders", { headers: authOpts.headers }).then(r => r.json()),
  });

  const allOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    const raw = localStorage.getItem("carton_orders");
    let local: any[] = [];
    if (raw) { try { local = JSON.parse(raw); } catch {} }
    const merged = [...orders];
    for (const l of local) {
      const idx = merged.findIndex((m: any) => m.id === l.id);
      if (idx >= 0) merged[idx] = l;
      else merged.push(l);
    }
    return merged;
  }, [orders]);

  const filtered = useMemo(() => {
    if (!search) return allOrders;
    const q = search.toLowerCase();
    return allOrders.filter((o: any) =>
      (o.clientName || "").toLowerCase().includes(q) ||
      (o.clientPhone || "").includes(q) ||
      (o.orderCode || "").toLowerCase().includes(q) ||
      String(o.id).includes(q)
    );
  }, [allOrders, search]);

  return (
    <MobileLayout title={t("orders")}>
      <MobilePageHeader
        title={t("orders")}
        subtitle={`${allOrders.length} ta ${t("orders").toLowerCase()}`}
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("order_search")}
          className="w-full h-11 pl-10 pr-4 rounded-2xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm font-medium">{t("no_orders")}</p>
          </div>
        ) : (
          filtered.map((order: any) => (
            <Card key={order.id} className="p-4 border-0 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  #{order.orderCode || order.id}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[order.status] || "bg-gray-100"}`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>
              <p className="font-semibold text-sm">{order.clientName || t("client")}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {order.clientPhone || "-"}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {order.productName || t("product")} × {order.quantity || 0}
                </span>
              </div>
              {order.deliveryAddress && (
                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{order.deliveryAddress}</span>
                </p>
              )}
              <div className="mt-2 pt-2 border-t border-amber-50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString("uz-UZ") : "-"}
                </span>
                <span className="font-bold text-sm text-amber-600">
                  {(order.totalSum || 0).toLocaleString("uz-UZ")} so'm
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
