import React, { useState, useEffect, useRef, useMemo } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Truck, MapPin, Clock, Phone, User, CheckCircle2, XCircle, ChevronRight, Satellite, Map as MapIcon, Wallet } from "lucide-react";
import WaybillModal from "@/components/WaybillModal";
import { useLang } from "@/lib/i18n";
import { pinIcon, warehousePinIcon } from "@/lib/mapPin";

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
  html: `<div style="width:32px;height:32px;background:${status === "delivered" ? "#22c55e" : status === "in_transit" ? "#f59e0b" : "#9ca3af"};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:14px;">📍</div>`,
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

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDT = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};



const deliveryStatusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
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

const myLocationIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(59,130,246,0.4);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function CurrentLocationMarker({ position }: { position: [number, number] }) {
  const map = useMap();
  return (
    <Marker position={position} icon={myLocationIcon}>
      <Popup>
        <div className="text-center">
          <p className="font-bold text-sm">📍 Mening lokatsiyam</p>
          <p className="text-xs text-muted-foreground">{position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
        </div>
      </Popup>
    </Marker>
  );
}

function FlyToLocation({ position }: { position: [number, number] }) {
  const map = useMap();
  const hasFlown = useRef(false);
  useEffect(() => {
    if (!hasFlown.current) {
      hasFlown.current = true;
      map.setView(position, 15);
    }
  }, [position, map]);
  return null;
}

function MapRef({ mapRef }: { mapRef: React.MutableRefObject<any> }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// Xaritada bosilgan nuqtani igna marker bilan ko'rsatish
function PickHandler({ onPick }: { onPick: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function Delivery() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const [satellite, setSatellite] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<[number, number] | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [driverLocations, setDriverLocations] = useState<Record<number, [number, number]>>({});
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [driverFilter, setDriverFilter] = useState<number | "all" | "none">("all");
  const [viewingWaybillId, setViewingWaybillId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastUpdate, setLastUpdate] = useState("--:--:--");
  const mapRef = useRef<any>(null);

  const { t } = useLang();

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMyLocation(loc);
        if (mapRef.current) {
          mapRef.current.setView(loc, mapRef.current.getZoom());
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const deliverySteps = [
    { key: "pending", label: t('delivery_step_pending') },
    { key: "in_transit", label: t('delivery_step_in_transit') },
    { key: "delivered", label: t('delivery_step_delivered') },
  ];

  const [routeProgress, setRouteProgress] = useState(0.5);
  useEffect(() => {
    const t = setInterval(() => setRouteProgress(p => p > 0.9 ? 0.1 : p + 0.04), 500);
    return () => clearInterval(t);
  }, []);

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => customFetch("/api/clients", { headers: authOpts.headers }).then(r => r.json()),
  });

  const { data: orders, refetch: refetchOrders } = useQuery({
    queryKey: ["/api/waybills"],
    queryFn: () =>
      customFetch("/api/waybills", { headers: authOpts.headers })
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return [];
          const clientArr = Array.isArray(clients) ? clients : [];
          const cMap = Object.fromEntries(clientArr.map((c: any) => [(c.name || "").toLowerCase(), c]));
          return data.map((w: any) => {
            const client = cMap[(w.receiverCompany || "").toLowerCase()];
            return {
              id: w.id,
              orderCode: `YX-${w.docNumber}`,
              clientName: w.receiverCompany || "",
              clientPhone: w.receiverPhone || client?.phone || "",
              deliveryAddress: w.deliveryAddress || client?.address || "",
              driverId: w.driverId,
              deliveryStatus: w.deliveryStatus || "pending",
              date: w.date,
              senderCompany: w.senderCompany,
              totalSum: w.totalSum,
              vehicle: w.vehicle || "",
              deliveredAt: w.deliveredAt || null,
              deliveryFee: Number(w.deliveryFee) || 0,
            };
          });
        })
        .catch(() => []),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!Array.isArray(orders)) return;
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    setLastUpdate(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
  }, [orders]);

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => customFetch("/api/employees", { headers: authOpts.headers }).then(r => r.json()),
  });

  const drivers = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter((e: any) => {
      const r = (e.position || "").toLowerCase();
      return r.includes("haydovchi") || r.includes("dastavkachi") || r.includes("driver");
    });
  }, [employees]);

  const clientsMap = useMemo(() => {
    if (!Array.isArray(clients)) return {};
    return Object.fromEntries(clients.map((c: any) => [c.name, c]));
  }, [clients]);

  const todayStr = ymd(new Date());
  const monthStr = todayStr.slice(0, 7);
  const deliveredDate = (o: any): string => (o.deliveredAt ? ymd(new Date(o.deliveredAt)) : o.date || "");

  // Xarita uchun — bugungi buyurtmalar
  const activeDeliveries = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o: any) => o.date === todayStr);
  }, [orders, todayStr]);

  // Filtr (haydovchi bo'yicha)
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    if (driverFilter === "all") return orders;
    if (driverFilter === "none") return orders.filter((o: any) => !o.driverId);
    return orders.filter((o: any) => o.driverId === driverFilter);
  }, [orders, driverFilter]);

  // Statistika (yetkazilganlar: jami / bugun/ oy) + jami daromad
  const countDelivered = (list: any[]) => {
    const dl = list.filter((o: any) => o.deliveryStatus === "delivered");
    return {
      total: dl.length,
      today: dl.filter((o: any) => deliveredDate(o) === todayStr).length,
      month: dl.filter((o: any) => deliveredDate(o).slice(0, 7) === monthStr).length,
      income: dl.reduce((s: number, o: any) => s + (Number(o.deliveryFee) || 0), 0),
    };
  };
  const statBox = countDelivered(filteredOrders);

  type FilterKey = number | "all" | "none";
  const filterChips: { key: FilterKey; label: string; total: number; today: number; month: number; income: number }[] = useMemo(() => {
    const list: { key: FilterKey; label: string; total: number; today: number; month: number; income: number }[] = [];
    if (Array.isArray(orders)) {
      list.push({ key: "all", label: t("all_drivers"), ...countDelivered(orders) });
      for (const d of drivers) {
        list.push({ key: d.id, label: d.name || `Haydovchi #${d.id}`, ...countDelivered(orders.filter((o: any) => o.driverId === d.id)) });
      }
      const noDrv = countDelivered(orders.filter((o: any) => !o.driverId));
      if (noDrv.total > 0 || orders.some((o: any) => !o.driverId)) {
        list.push({ key: "none", label: t("no_driver"), ...noDrv });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, drivers, todayStr, monthStr]);

  // Jadval qatorlari (sana kamayish bo'yicha)
  const tableRows = useMemo(() => {
    return [...filteredOrders].sort((a: any, b: any) =>
      String(b.date || "").localeCompare(String(a.date || "")) || b.id - a.id
    );
  }, [filteredOrders]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  useEffect(() => { setPage(1); }, [driverFilter, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const pagedRows = tableRows.slice((page - 1) * pageSize, page * pageSize);

  const driverName = (o: any) => drivers.find((d: any) => d.id === o.driverId)?.name || "—";

  useEffect(() => {
    if (drivers.length === 0) return;
    const interval = setInterval(() => {
      setDriverLocations(prev => {
        const next = { ...prev };
        for (const d of drivers) {
          const current = next[d.id] || [41.3 + Math.random() * 0.1, 69.2 + Math.random() * 0.1];
          const myDeliveries = activeDeliveries.filter((o: any) => {
            const addr = o.deliveryAddress || "";
            const parts = addr.split(",").map(Number);
            return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]);
          });
          let target: [number, number] | null = null;
          let minDist = Infinity;
          for (const o of myDeliveries) {
            const addr = o.deliveryAddress || "";
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

  const updateDeliveryStatus = async (waybillId: number, status: string) => {
    try {
      await customFetch(`/api/waybills/${waybillId}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ deliveryStatus: status }),
      });
      refetchOrders();
    } catch {}
  };

  const assignDriver = async (waybillId: number, driverId: number | null) => {
    try {
      await customFetch(`/api/waybills/${waybillId}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ driverId }),
      });
      refetchOrders();
    } catch {}
  };

  // Yetkazish haqini qo'lda kiritib saqlash (masalan 200000 so'm)
  const [feeDraft, setFeeDraft] = useState("");
  const [feeSaving, setFeeSaving] = useState(false);
  useEffect(() => {
    setFeeDraft(selectedOrder ? String(Number(selectedOrder.deliveryFee) || 0) : "");
  }, [selectedOrder?.id]);

  const saveFee = async () => {
    if (!selectedOrder) return;
    const fee = Number(feeDraft.replace(/[^\d]/g, ""));
    if (!feeDraft.replace(/[^\d]/g, "") || !Number.isFinite(fee) || fee < 0) {
      window.alert(t("fee_invalid"));
      return;
    }
    try {
      setFeeSaving(true);
      await customFetch(`/api/waybills/${selectedOrder.id}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ deliveryFee: fee }),
      });
      setSelectedOrder({ ...selectedOrder, deliveryFee: fee });
      refetchOrders();
    } catch {} finally {
      setFeeSaving(false);
    }
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
      const addr = o.deliveryAddress || "";
      const parts = addr.split(",").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        points.push([parts[0], parts[1]]);
      }
    }
    return points;
  }, [activeDeliveries, drivers, driverLocations]);

  const selectedCoords = useMemo(() => {
    if (!selectedOrder) return null;
    const addr = selectedOrder.deliveryAddress || "";
    const parts = addr.split(",").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]] as [number, number];
    return null;
  }, [selectedOrder]);

  const defaultCenter: [number, number] = myLocation || [41.3, 69.2];

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-11rem)] md:h-[calc(100vh-13rem)] lg:h-[calc(100vh-14rem)]">
      <PageHeader
        title={t('delivery_title')}
        description={t('delivery_description')}
      />

      <div className="flex gap-[30px] flex-1 min-h-0">
        {/* Keng card — statistika + haydovchi filtri + buyurtmalar jadvali */}
        <Card className="flex-1 min-w-0 overflow-hidden border-0 shadow-lg flex flex-col">
          <div className="p-4 border-b border-border/50">
            <h3 className="font-bold text-sm mb-3">{t('delivery_orders_title')}</h3>

            {/* Statistika */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div className="rounded-xl border border-border/60 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('total_delivered')}
                </div>
                <div className="text-2xl font-extrabold text-primary">{statBox.total}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  {t('today_delivered')}
                </div>
                <div className="text-2xl font-extrabold">{statBox.today}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Truck className="w-3.5 h-3.5" />
                  {t('month_delivered')}
                </div>
                <div className="text-2xl font-extrabold">{statBox.month}</div>
              </div>
              <div className="rounded-xl border-2 border-green-500/50 bg-green-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-green-700 mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  {t('total_income')}
                </div>
                <div className="text-lg font-extrabold text-green-700">{formatSum(statBox.income)}</div>
              </div>
            </div>

            {/* Haydovchi filtri (kun/oy reyslari bilan) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{t('driver_col')}:</span>
              {filterChips.length === 0 && (
                <span className="text-xs text-muted-foreground">{t('no_drivers_text')}</span>
              )}
              {filterChips.map(chip => (
                <button
                  key={String(chip.key)}
                  onClick={() => setDriverFilter(chip.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    driverFilter === chip.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {chip.label} · {t('short_today')} {chip.today} / {t('short_month')} {chip.month} · 💰 {formatSum(chip.income)}
                </button>
              ))}
            </div>
          </div>

          {/* Buyurtmalar jadvali */}
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                  <th className="py-2 pr-3 font-medium">№</th>
                  <th className="py-2 pr-3 font-medium">{t('client_col')}</th>
                  <th className="py-2 pr-3 font-medium">{t('driver_col')}</th>
                  <th className="py-2 pr-3 font-medium">{t('date_col')}</th>
                  <th className="py-2 pr-3 font-medium">{t('status_col')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('sum_col')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('delivery_fee')}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{t('no_data')}</p>
                    </td>
                  </tr>
                ) : pagedRows.map((o: any) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedOrder(selectedOrder?.id === o.id ? null : o)}
                    className={`cursor-pointer border-b border-border/40 transition-colors ${
                      selectedOrder?.id === o.id ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <td className="py-2.5 pr-3">
                      <button
                        onClick={e => { e.stopPropagation(); setViewingWaybillId(o.id); }}
                        className="font-mono text-xs text-primary hover:underline underline-offset-2 decoration-dotted"
                        title="Yuk xati hujjatini ochish"
                      >
                        #{o.orderCode || o.id}
                      </button>
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{o.clientName || "—"}</td>
                    <td className="py-2.5 pr-3">{driverName(o)}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                      {o.deliveryStatus === "delivered"
                        ? fmtDT(o.deliveredAt)
                        : (o.date || "—")}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${deliveryStatusColor[o.deliveryStatus] || ""}`}>
                        {deliverySteps.find(s => s.key === o.deliveryStatus)?.label || o.deliveryStatus}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold whitespace-nowrap">
                      {formatSum(Number(o.totalSum) || 0)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold whitespace-nowrap text-green-700">
                      {Number(o.deliveryFee) > 0 ? formatSum(Number(o.deliveryFee) || 0) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {tableRows.length > 0 && (
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t('rows')}:</span>
                  {[10, 30, 50].map(s => (
                    <button
                      key={s}
                      onClick={() => setPageSize(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        pageSize === s ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {tableRows.length} ta · {page}/{totalPages}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t('prev')}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        page === p ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t('next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Xarita — card yonida, orasida 30px joy */}
        <Card className="w-[460px] shrink-0 overflow-hidden border-0 shadow-lg relative">
          {/* Controls overlay */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
            <button
              onClick={() => setSatellite(!satellite)}
              className="px-3 py-2 bg-white rounded-xl shadow-lg border border-border text-sm font-medium flex items-center gap-2 hover:bg-muted transition-colors"
            >
              {satellite ? <MapIcon className="w-4 h-4" /> : <Satellite className="w-4 h-4" />}
              {satellite ? t('street_view') : t('satellite_view')}
            </button>
          </div>

          <div className="h-full w-full">
            <MapContainer
              key={satellite ? "sat" : "street"}
              center={defaultCenter}
              zoom={myLocation ? 15 : 12}
              className="h-full w-full"
              scrollWheelZoom={true}
            >
              <MapRef mapRef={mapRef} />
              <TileLayer
                attribution={satellite ? "" : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
                url={satellite
                  ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
              />

              <PickHandler onPick={setPickedPoint} />
              {pickedPoint && <Marker position={pickedPoint} icon={pinIcon} />}

              {allPoints.length > 1 && <MapBoundsUpdater points={allPoints} />}

              {/* Joriy lokatsiya */}
              {myLocation && <CurrentLocationMarker position={myLocation} />}
              {myLocation && <FlyToLocation position={myLocation} />}

              {/* Warehouse marker */}
              <Marker position={[41.3, 69.2]} icon={warehousePinIcon}>
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
                const addr = o.deliveryAddress || "";
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
                        <p className="text-xs mt-1 font-semibold">{formatSum(o.totalSum)}</p>
                        <div className="mt-2 flex gap-1.5">
                          {o.deliveryStatus === "delivered" ? (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-green-100 text-green-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Yetkazilgan
                            </span>
                          ) : (
                            deliverySteps.map(s => (
                              <button
                                key={s.key}
                                onClick={() => updateDeliveryStatus(o.id, s.key)}
                                disabled={o.deliveryStatus === "delivered"}
                                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                                  o.deliveryStatus === s.key
                                    ? "bg-primary text-white"
                                    : "bg-muted hover:bg-muted/80"
                                }`}
                              >
                                {s.label}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Route lines from nearest driver to delivery points */}
              {activeDeliveries.map(o => {
                const addr = o.deliveryAddress || "";
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
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
                      <span className="font-semibold">{formatSum(selectedOrder.totalSum)}</span>
                    </div>
                    {/* Haydovchi tayinlash */}
                    <div className="mt-2 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <select
                        value={selectedOrder.driverId || ""}
                        onChange={e => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          assignDriver(selectedOrder.id, val);
                          setSelectedOrder({ ...selectedOrder, driverId: val });
                        }}
                        className="text-xs border border-border rounded-lg px-2 py-1 bg-white"
                      >
                        <option value="">Haydovchi tanlash...</option>
                        {drivers.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name || `Haydovchi #${d.id}`}</option>
                        ))}
                      </select>
                    </div>
                    {/* Yetkazish haqini qo'lda kiritish */}
                    <div className="mt-2 flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('delivery_fee')}:</span>
                      <input
                        value={feeDraft}
                        onChange={e => setFeeDraft(e.target.value.replace(/[^\d]/g, ""))}
                        inputMode="numeric"
                        placeholder="200000"
                        className="text-xs border border-border rounded-lg px-2 py-1 bg-white w-28 text-right font-semibold"
                      />
                      <span className="text-[11px] text-muted-foreground">so'm</span>
                      <Button size="sm" variant="outline" className="text-[10px] h-7" disabled={feeSaving} onClick={saveFee}>
                        {feeSaving ? "..." : t('save')}
                      </Button>
                    </div>
                    {/* Manzil avtomatik */}
                    {selectedOrder.deliveryAddress && (
                      <div className="mt-2 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">{selectedOrder.deliveryAddress}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {selectedOrder.deliveryStatus === "delivered" ? (
                      <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Yetkazilgan
                      </span>
                    ) : (
                      deliverySteps.map(s => (
                        <Button
                          key={s.key}
                          size="sm"
                          variant={selectedOrder.deliveryStatus === s.key ? "default" : "outline"}
                          disabled={selectedOrder.deliveryStatus === "delivered"}
                          onClick={() => {
                            updateDeliveryStatus(selectedOrder.id, s.key);
                            setSelectedOrder({ ...selectedOrder, deliveryStatus: s.key });
                          }}
                          className="text-[10px] h-7"
                        >
                          {s.label}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </Card>
      </div>

      {/* Sahifa haqida footer */}
      <div className="mt-3 shrink-0 flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-white/85 backdrop-blur-sm px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
            <Truck className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{t('delivery_title')}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t('delivery_description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
          <span>{t('delivery_orders_title')}: <b className="text-foreground">{Array.isArray(orders) ? orders.length : 0}</b></span>
          <span className="hidden xl:inline">{t('all_drivers')}: <b className="text-foreground">{drivers.length}</b></span>
          <span>{t('total_delivered')}: <b className="text-green-600">{statBox.total}</b></span>
          <span className="hidden xl:inline">{t('total_income')}: <b className="text-green-600">{formatSum(statBox.income)}</b></span>
          <span className="hidden lg:inline">{t('date_col')}: <b className="text-foreground">{todayStr}</b></span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {t('last_update')}: <b className="text-foreground">{lastUpdate}</b>
          </span>
        </div>
      </div>
      </div>

      {/* Yuk xati hujjati */}
      <WaybillModal
        open={viewingWaybillId !== null}
        onClose={() => setViewingWaybillId(null)}
        onSave={() => {}}
        onView={viewingWaybillId}
        headers={authOpts.headers}
      />
    </DashboardLayout>
  );
}
