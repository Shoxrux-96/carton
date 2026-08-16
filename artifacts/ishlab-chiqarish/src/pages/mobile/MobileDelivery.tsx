import { useState, useMemo } from "react";
import { MobileLayout, MobilePageHeader } from "./MobileLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import customFetch from "@/lib/custom-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Phone, User, Clock, CheckCircle2, ChevronRight, Navigation } from "lucide-react";

export default function MobileDelivery() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const deliverySteps = [
    { key: "pending", label: t("delivery_pending"), color: "bg-gray-100 text-gray-700" },
    { key: "shipped", label: t("delivery_shipped"), color: "bg-blue-100 text-blue-700" },
    { key: "in_transit", label: t("delivery_in_transit"), color: "bg-amber-100 text-amber-700" },
    { key: "delivered", label: t("delivery_delivered"), color: "bg-green-100 text-green-700" },
  ];

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: () => customFetch("/api/orders", { headers: authOpts.headers }).then(r => r.json()),
    refetchInterval: 10000,
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => customFetch("/api/employees", { headers: authOpts.headers }).then(r => r.json()),
  });

  const deliveries = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o: any) =>
      o.deliveryStatus && o.deliveryStatus !== "pending" && o.deliveryStatus !== "cancelled"
    );
  }, [orders]);

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await customFetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ deliveryStatus: status }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } catch {}
  };

  const selected = selectedId ? deliveries.find((o: any) => o.id === selectedId) : null;

  const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

  if (selected) {
    return (
      <MobileLayout title={t("delivery")} driverMode>
        <MobilePageHeader
          title={`#${selected.orderCode || selected.id}`}
          subtitle={selected.clientName}
          action={
            <button onClick={() => setSelectedId(null)} className="text-sm text-amber-600 font-medium">
              {t("back")}
            </button>
          }
        />

        <Card className="p-4 border-0 shadow-md mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-100">
              <User className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold">{selected.clientName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {selected.clientPhone || "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <MapPin className="w-3 h-3" />
            <span>{selected.deliveryAddress || selected.clientAddress || t("no_address")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Truck className="w-3 h-3" />
            <span>{selected.productName || t("product")} × {selected.quantity || 0}</span>
            <span className="font-semibold text-amber-600 ml-auto">{formatSum(selected.totalSum || 0)}</span>
          </div>
        </Card>

        {/* Status Update */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold text-muted-foreground">{t("change_status")}</p>
          {deliverySteps.map(step => {
            const isActive = selected.deliveryStatus === step.key;
            const currentIdx = deliverySteps.findIndex(s => s.key === selected.deliveryStatus);
            const stepIdx = deliverySteps.findIndex(s => s.key === step.key);
            const isPast = stepIdx <= currentIdx;
            return (
              <button
                key={step.key}
                onClick={() => updateStatus(selected.id, step.key)}
                disabled={isActive}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-amber-500 bg-amber-50"
                    : isPast
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-white hover:border-amber-200"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? "bg-amber-500" : isPast ? "bg-green-500" : "bg-gray-200"
                }`}>
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-bold text-white">{stepIdx + 1}</span>
                  )}
                </div>
                <span className={`text-sm font-medium flex-1 text-left ${
                  isActive ? "text-amber-800" : isPast ? "text-green-800" : "text-gray-600"
                }`}>
                  {step.label}
                </span>
                {isActive && (
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    {t("current")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="w-full h-12 rounded-2xl"
          onClick={() => {
            const addr = selected.deliveryAddress || selected.clientAddress || "";
            const parts = addr.split(",").map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${parts[0]},${parts[1]}`, "_blank");
            }
          }}
        >
          <Navigation className="w-4 h-4 mr-2" />
          {t("open_direction")}
        </Button>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={t("delivery")} driverMode>
      <MobilePageHeader
        title={t("delivery_service")}
        subtitle={`${deliveries.length} ${t("active_deliveries")}`}
      />

      <div className="space-y-3">
        {deliveries.length === 0 ? (
          <div className="text-center py-10">
            <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm font-medium">{t("no_active_deliveries")}</p>
          </div>
        ) : (
          deliveries.map((order: any) => {
            const currentStep = deliverySteps.find(s => s.key === order.deliveryStatus);
            const currentIdx = deliverySteps.findIndex(s => s.key === order.deliveryStatus);
            return (
              <Card
                key={order.id}
                className="p-4 border-0 shadow-sm"
                onClick={() => setSelectedId(order.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{order.orderCode || order.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${currentStep?.color}`}>
                    {currentStep?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{order.clientName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {order.deliveryAddress || order.clientAddress || ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {deliverySteps.map((step, i) => (
                    <div key={step.key} className="flex items-center gap-0 flex-1">
                      <div className={`w-2 h-2 rounded-full ${i <= currentIdx ? "bg-amber-500" : "bg-gray-200"}`} />
                      {i < deliverySteps.length - 1 && (
                        <div className={`flex-1 h-0.5 ${i < currentIdx ? "bg-amber-500" : "bg-gray-200"}`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-amber-50 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{order.productName} × {order.quantity}</span>
                  <span className="text-sm font-bold text-amber-600">{formatSum(order.totalSum || 0)}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
}
