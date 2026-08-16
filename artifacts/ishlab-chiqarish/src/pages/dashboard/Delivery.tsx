import React, { useState, useEffect, useRef, useMemo } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Truck, MapPin, Clock, Phone, User, Navigation, CheckCircle2, XCircle, ChevronRight, Satellite, Map as MapIcon } from "lucide-react";
import { useLang } from "@/lib/i18n";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(59,130,246,0.5);font-size:16px;">🚛</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

const deliveryIcon = (status: string) => L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:${status === "delivered" ? "#22c55e" : status === "in_transit" ? "#f59e0b" : status === "shipped" ? "#3b82f6" : "#9ca3af"};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:14px;">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

  const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

const haversine = (a: [number, number], b: [number, number]) => {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const s = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
};



const deliveryStatusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  shipped: "bg-blue-100 text-blue-700",
  in_transit: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
};

function MapBoundsUpdater({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [points, map]);
  return null;
}

export default function Delivery() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const [satellite, setSatellite] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [driverLocations, setDriverLocations] = useState<Record<number, [number, number]>>({});

  const { t } = useLang();

  const deliverySteps = [
    { key: "pending", label: t('delivery_step_pending') },
    { key: "shipped", label: t('delivery_step_shipped') },
    { key: "in_transit", label: t('delivery_step_in_transit') },
    { key: "delivered", label: t('delivery_step_delivered') },
  ];

  const [routeProgress, setRouteProgress] = useState(0.5);
  useEffect(() => {
    const t = setInterval(() => setRouteProgress(p => p > 0.9 ? 0.1 : p + 0.04), 500);
    return () => clearInterval(t);
  }, []);

  const ordersCache = useRef<any[] | null>(null);

  const mergeOrders = (apiOrders: any[]) => {
    const localRaw = localStorage.getItem("carton_orders");
    let localOrders: any[] = [];
    try { if (localRaw) localOrders = JSON.parse(localRaw); } catch {}
    const deletedIds: number[] = [];
    try {
      const raw = localStorage.getItem("carton_deleted_orders");
      if (raw) deletedIds.push(...JSON.parse(raw));
    } catch {}
    const merged = [...apiOrders.filter((o: any) => !deletedIds.includes(o.id))];
    for (const local of localOrders) {
      if (deletedIds.includes(local.id)) continue;
      const idx = merged.findIndex(m => m.id === local.id);
      if (idx >= 0) merged[idx] = local;
      else merged.push(local);
    }
    for (const order of merged) {
      if (!order.orderCode) order.orderCode = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
    }
    localStorage.setItem("carton_orders", JSON.stringify(merged));
    ordersCache.current = merged;
    return merged;
  };

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: () =>
      customFetch("/api/orders", { headers: authOpts.headers })
        .then(r => r.json())
        .then(data => Array.isArray(data) ? mergeOrders(data) : data),
    placeholderData: () => {
      if (ordersCache.current) return ordersCache.current;
      try {
        const cached = localStorage.getItem("carton_orders");
        if (cached) {
          const deletedIds: number[] = [];
          try {
            const raw = localStorage.getItem("carton_deleted_orders");
            if (raw) deletedIds.push(...JSON.parse(raw));
          } catch {}
          const parsed = JSON.parse(cached).filter((o: any) => !deletedIds.includes(o.id));
          ordersCache.current = parsed;
          return parsed;
        }
      } catch {}
      return undefined;
    },
    refetchInterval: 8000,
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => customFetch("/api/employees", { headers: authOpts.headers }).then(r => r.json()),
  });

  const drivers = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter((e: any) => e.role === "driver" || e.role === "haydovchi");
  }, [employees]);

  const activeDeliveries = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o: any) => o.deliveryStatus && o.deliveryStatus !== "pending");
  }, [orders]);

  useEffect(() => {
    if (drivers.length === 0) return;
    const interval = setInterval(() => {
      setDriverLocations(prev => {
        const next = { ...prev };
        for (const d of drivers) {
          const current = next[d.id] || [41.3 + Math.random() * 0.1, 69.2 + Math.random() * 0.1];
          const myDeliveries = activeDeliveries.filter((o: any) => {
            const addr = o.deliveryAddress || o.clientAddress || "";
            const parts = addr.split(",").map(Number);
            return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]);
          });
          let target: [number, number] | null = null;
          let minDist = Infinity;
          for (const o of myDeliveries) {
            const addr = o.deliveryAddress || o.clientAddress || "";
            const parts = addr.split(",").map(Number);
            const dest: [number, number] = [parts[0], parts[1]];
            const dist = haversine(current, dest);
            if (dist < minDist) { minDist = dist; target = dest; }
          }
          if (target && minDist > 0.1) {
            const dx = target[0] - current[0];
            const dy = target[1] - current[1];
            const dist = Math.sqrt(dx*dx + dy*dy);
            const speed = 0.003;
            next[d.id] = [
              current[0] + (dx / dist) * speed,
              current[1] + (dy / dist) * speed,
            ] as [number, number];
          } else if (target) {
            next[d.id] = [target[0] + (Math.random() - 0.5) * 0.001, target[1] + (Math.random() - 0.5) * 0.001];
          } else {
            next[d.id] = [
              current[0] + (Math.random() - 0.5) * 0.002,
              current[1] + (Math.random() - 0.5) * 0.002,
            ] as [number, number];
          }
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [drivers, activeDeliveries]);

  const updateDeliveryStatus = async (orderId: number, status: string) => {
    await customFetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authOpts.headers },
      body: JSON.stringify({ deliveryStatus: status }),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  };

  const allPoints = useMemo(() => {
    const points: [number, number][] = [];
    if (drivers.length > 0) {
      const warehouse: [number, number] = [41.3, 69.2];
      points.push(warehouse);
    }
    for (const d of drivers) {
      const loc = driverLocations[d.id];
      if (loc) points.push(loc);
    }
    for (const o of activeDeliveries) {
      const addr = o.deliveryAddress || o.clientAddress || "";
      const parts = addr.split(",").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        points.push([parts[0], parts[1]]);
      }
    }
    return points;
  }, [activeDeliveries, drivers, driverLocations]);

  const selectedCoords = useMemo(() => {
    if (!selectedOrder) return null;
    const addr = selectedOrder.deliveryAddress || selectedOrder.clientAddress || "";
    const parts = addr.split(",").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]] as [number, number];
    return null;
  }, [selectedOrder]);

  const defaultCenter: [number, number] = [41.3, 69.2];

  return (
    <DashboardLayout>
      <PageHeader
        title={t('delivery_title')}
        description={t('delivery_description')}
      />

      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Side panel */}
        <Card className="w-80 shrink-0 overflow-hidden border-0 shadow-lg flex flex-col">
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">{t('deliveries_label')}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {activeDeliveries.filter(o => o.deliveryStatus === "delivered").length} {t('delivered_count')}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeDeliveries.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('no_active_deliveries_text')}</p>
              </div>
            ) : (
              activeDeliveries.map((order: any) => {
                const currentIdx = deliverySteps.findIndex(s => s.key === order.deliveryStatus);
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selectedOrder?.id === order.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-muted-foreground">#{order.orderCode || order.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${deliveryStatusColor[order.deliveryStatus]}`}>
                        {deliverySteps.find(s => s.key === order.deliveryStatus)?.label}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{order.clientName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {order.clientPhone || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{order.deliveryAddress || order.clientAddress || t('no_address_text')}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      {deliverySteps.map((step, i) => (
                        <div key={step.key} className="flex items-center gap-0 flex-1">
                          <div className={`w-2 h-2 rounded-full ${
                            i <= currentIdx ? "bg-primary" : "bg-gray-200"
                          }`} />
                          {i < deliverySteps.length - 1 && (
                            <div className={`flex-1 h-0.5 ${
                              i < currentIdx ? "bg-primary" : "bg-gray-200"
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Map */}
        <Card className="flex-1 overflow-hidden border-0 shadow-lg relative">
          {/* Controls overlay */}
          <div className="absolute top-4 right-4 z-[1000] flex gap-2">
            <button
              onClick={() => setSatellite(!satellite)}
              className="px-3 py-2 bg-white rounded-xl shadow-lg border border-border text-sm font-medium flex items-center gap-2 hover:bg-muted transition-colors"
            >
              {satellite ? <MapIcon className="w-4 h-4" /> : <Satellite className="w-4 h-4" />}
              {satellite ? t('street_view') : t('satellite_view')}
            </button>
            <button
              onClick={() => setSelectedOrder(null)}
              className="px-3 py-2 bg-white rounded-xl shadow-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              {t('all_drivers')}
            </button>
          </div>

          <div className="h-full w-full">
            <MapContainer
              key={satellite ? "sat" : "street"}
              center={defaultCenter}
              zoom={12}
              className="h-full w-full"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution={satellite ? "" : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
                url={satellite
                  ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
              />

              {allPoints.length > 1 && <MapBoundsUpdater points={allPoints} />}

              {/* Warehouse marker */}
              <Marker position={[41.3, 69.2]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-sm">🏭 Shovot Carton</p>
                    <p className="text-xs text-muted-foreground">{t('warehouse_point')}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Driver markers */}
              {drivers.map(d => {
                const loc = driverLocations[d.id];
                if (!loc) return null;
                return (
                  <Marker key={`driver-${d.id}`} position={loc} icon={driverIcon}>
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="font-bold text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {d.name || `Haydovchi #${d.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{d.phone || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {loc[0].toFixed(4)}, {loc[1].toFixed(4)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Delivery markers */}
              {activeDeliveries.map(o => {
                const addr = o.deliveryAddress || o.clientAddress || "";
                const parts = addr.split(",").map(Number);
                if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                return (
                  <Marker
                    key={`delivery-${o.id}`}
                    position={[parts[0], parts[1]]}
                    icon={deliveryIcon(o.deliveryStatus)}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <p className="font-bold text-sm">#{(o.orderCode || o.id)} - {o.clientName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {o.clientPhone || "-"}
                        </p>
                        <p className="text-xs mt-1">{o.productName} × {o.quantity} = {formatSum(o.totalSum)}</p>
                        <div className="mt-2 flex gap-1.5">
                          {deliverySteps.map(s => (
                            <button
                              key={s.key}
                              onClick={() => updateDeliveryStatus(o.id, s.key)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                                o.deliveryStatus === s.key
                                  ? "bg-primary text-white"
                                  : "bg-muted hover:bg-muted/80"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Route lines from nearest driver to delivery points */}
              {activeDeliveries.map(o => {
                const addr = o.deliveryAddress || o.clientAddress || "";
                const parts = addr.split(",").map(Number);
                if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                const dest: [number, number] = [parts[0], parts[1]];
                let nearestDriver: [number, number] | null = null;
                let minDist = Infinity;
                for (const d of drivers) {
                  const loc = driverLocations[d.id];
                  if (!loc) continue;
                  const dist = haversine(loc, dest);
                  if (dist < minDist) { minDist = dist; nearestDriver = loc; }
                }
                const start = nearestDriver || [41.3, 69.2];
                const progressLat = start[0] + (dest[0] - start[0]) * routeProgress;
                const progressLng = start[1] + (dest[1] - start[1]) * routeProgress;
                return (
                  <React.Fragment key={`route-${o.id}`}>
                    <Polyline
                      positions={[start, dest]}
                      pathOptions={{
                        color: "#3b82f6",
                        weight: 3,
                        opacity: 0.6,
                        dashArray: "8, 6",
                      }}
                    />
                    <CircleMarker
                      center={[progressLat, progressLng]}
                      pathOptions={{
                        color: "#3b82f6",
                        fillColor: "#60a5fa",
                        fillOpacity: 0.9,
                        weight: 2,
                      }}
                      radius={5}
                    />
                  </React.Fragment>
                );
              })}

              {/* Selected order route highlight */}
              {selectedCoords && (
                <>
                  {(() => {
                    let nearestDriver: [number, number] | null = null;
                    let minDist = Infinity;
                    for (const d of drivers) {
                      const loc = driverLocations[d.id];
                      if (!loc) continue;
                      const dist = haversine(loc, selectedCoords);
                      if (dist < minDist) { minDist = dist; nearestDriver = loc; }
                    }
                    const origin = nearestDriver || [41.3, 69.2];
                    const pLat = origin[0] + (selectedCoords[0] - origin[0]) * 0.4;
                    const pLng = origin[1] + (selectedCoords[1] - origin[1]) * 0.4;
                    return (
                      <>
                        <Polyline
                          positions={[origin, selectedCoords]}
                          pathOptions={{
                            color: "#ef4444",
                            weight: 4,
                            opacity: 0.8,
                          }}
                        />
                        <Polyline
                          positions={[origin, selectedCoords]}
                          pathOptions={{
                            color: "#ef4444",
                            weight: 8,
                            opacity: 0.15,
                          }}
                        />
                        <CircleMarker
                          center={[pLat, pLng]}
                          pathOptions={{
                            color: "#ef4444",
                            fillColor: "#f87171",
                            fillOpacity: 0.9,
                            weight: 2,
                          }}
                          radius={5}
                        />
                      </>
                    );
                  })()}
                </>
              )}
            </MapContainer>
          </div>

          {/* Bottom info for selected order */}
          {selectedOrder && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000]">
              <Card className="p-4 shadow-xl border-2 border-primary/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">#{(selectedOrder.orderCode || selectedOrder.id)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${deliveryStatusColor[selectedOrder.deliveryStatus]}`}>
                        {deliverySteps.find(s => s.key === selectedOrder.deliveryStatus)?.label}
                      </span>
                    </div>
                    <p className="font-bold text-base mt-0.5">{selectedOrder.clientName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedOrder.clientPhone || "-"}
                      </span>
                      <span>{selectedOrder.productName} × {selectedOrder.quantity}</span>
                      <span className="font-semibold">{formatSum(selectedOrder.totalSum)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {deliverySteps.map(s => (
                      <Button
                        key={s.key}
                        size="sm"
                        variant={selectedOrder.deliveryStatus === s.key ? "default" : "outline"}
                        onClick={() => updateDeliveryStatus(selectedOrder.id, s.key)}
                        className="text-xs"
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
