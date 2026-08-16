import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Plus, ShoppingCart, Search, MapPin, Map, Crosshair, Package, Truck, X, Trash2, FileDown } from "lucide-react";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLang } from "@/lib/i18n";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

const generateOrderCode = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 2; i++) code += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) code += Math.floor(Math.random() * 10);
  return code;
};

type OrderType = "purchase" | "delivery";

interface OrderItem {
  id?: number;
  name: string;
  quantity: number;
  price: number;
  productId?: number;
  clientId?: number;
}

function LocationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLang();
  const [position, setPosition] = useState<[number, number] | null>(() => {
    if (value) {
      const [lat, lng] = value.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return null;
  });
  const [mapOpen, setMapOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [satellite, setSatellite] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (value) {
      const [lat, lng] = value.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) setPosition([lat, lng]);
    }
  }, [value]);

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        setPosition([parseFloat(lat), parseFloat(lng)]);
        onChange(`${lat},${lng}`);
      },
    });
    return null;
  }

  const defaultCenter: [number, number] = [41.3, 69.2];

  const searchLocation = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await res.json();
      if (data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition([lat, lng]);
        onChange(`${lat.toFixed(6)},${lng.toFixed(6)}`);
      }
    } catch {}
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        onChange(`${lat.toFixed(6)},${lng.toFixed(6)}`);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold block mb-1.5">{t('delivery_address_label')}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('coordinate_or_address')}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={() => setMapOpen(!mapOpen)} className="px-3">
          <Map className="w-4 h-4" />
        </Button>
      </div>

      {mapOpen && (
        <div className="rounded-xl overflow-hidden border-2 border-border">
          <div className="flex flex-wrap gap-2 p-2 bg-muted/50">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchLocation()}
              placeholder={t('enter_location_name')}
              className="flex-1 min-w-[150px] h-9 px-3 rounded-lg border border-border bg-background text-sm"
            />
            <Button type="button" variant="secondary" size="sm" onClick={searchLocation}>
              {t('search')}
            </Button>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setSatellite(false)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${!satellite ? "bg-primary text-white" : "bg-background hover:bg-muted"}`}
              >
                {t('street_view')}
              </button>
              <button
                type="button"
                onClick={() => setSatellite(true)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${satellite ? "bg-primary text-white" : "bg-background hover:bg-muted"}`}
              >
                {t('satellite_view')}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              isLoading={locating}
              className="px-3"
              title="Joriy lokatsiyani belgilash"
            >
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-[300px]">
            <MapContainer
              key={satellite ? "sat" : "street"}
              center={position || defaultCenter}
              zoom={position ? 15 : 12}
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
              <MapClickHandler />
              {position && <Marker position={position} />}
            </MapContainer>
          </div>
          <div className="p-2 text-xs text-muted-foreground bg-muted/50">
            {t('mark_on_map')}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderItemsEditor({
  items,
  onChange,
  orderType,
  products,
  stockMap,
}: {
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
  orderType: OrderType;
  products: any[];
  stockMap: Record<number, number>;
}) {
  const { t } = useLang();
  const addItem = () => {
    onChange([...items, { name: "", quantity: 1, price: 0 }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: any) => {
    onChange(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const selectProduct = (idx: number, productId: number) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      onChange(
        items.map((item, i) =>
          i === idx ? { ...item, productId: product.id, name: product.name, price: product.price } : item
        )
      );
    }
  };

  const total = items.reduce((s, item) => s + item.quantity * item.price, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold block mb-1.5">{t('products_label')}</label>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> {t('add_item')}
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border-2 border-border bg-muted/20">
            <div className="flex-1 grid grid-cols-12 gap-2">
              {orderType === "delivery" ? (
                <div className="col-span-3 flex flex-col gap-1">
                  <select
                    value={products.find((p: any) => p.name === item.name)?.id || ""}
                    onChange={e => selectProduct(idx, Number(e.target.value))}
                    className="h-9 rounded-lg border-2 border-border bg-background px-3 text-sm"
                  >
                    <option value="">{t('select_product_option')}</option>
                    {products.map((p: any) => {
                      const stock = stockMap[p.id] || 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({stock} dona)
                        </option>
                      );
                    })}
                  </select>
                  {item.productId && item.quantity > (stockMap[item.productId] || 0) && (
                    <span className="text-[10px] text-destructive font-medium">
                      {t('insufficient_stock')}
                    </span>
                  )}
                </div>
              ) : (
                <input
                  value={item.name}
                  onChange={e => updateItem(idx, "name", e.target.value)}
                  placeholder={t('material_name_label')}
                  className="col-span-3 h-9 rounded-lg border-2 border-border bg-background px-3 text-sm"
                />
              )}
              {orderType === "delivery" && item.productId && item.quantity > (stockMap[item.productId] || 0) && (
                <span className="col-span-3 text-xs text-destructive font-medium text-center">
                  {t('insufficient_stock')} ({stockMap[item.productId] || 0} dona)
                </span>
              )}
              <input
                type="number"
                value={item.quantity}
                onChange={e => updateItem(idx, "quantity", Math.max(1, Number(e.target.value)))}
                placeholder="Soni"
                className="col-span-3 h-9 rounded-lg border-2 border-border bg-background px-3 text-sm text-center"
              />
              <input
                type="number"
                value={item.price}
                onChange={e => updateItem(idx, "price", Math.max(0, Number(e.target.value)))}
                placeholder="Narxi"
                className="col-span-3 h-9 rounded-lg border-2 border-border bg-background px-3 text-sm text-center"
              />
              <div className="col-span-3 flex items-center justify-center gap-1">
                <span className="text-sm font-semibold font-mono">{formatSum(item.quantity * item.price)}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2 border-t border-border">
        <div className="text-center">
          <span className="text-xs text-muted-foreground">{t('total_sum_label')}</span>
          <p className="text-lg font-bold font-mono">{formatSum(total)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coordinates, setCoordinates] = useState("");

  const [dateFilter, setDateFilter] = useState<"all" | "day" | "month" | "year">("all");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [purchaseItems, setPurchaseItems] = useState<OrderItem[]>([{ name: "", quantity: 1, price: 0 }]);
  const [deliveryItems, setDeliveryItems] = useState<OrderItem[]>([{ name: "", quantity: 1, price: 0 }]);
  const [supplier, setSupplier] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const { t } = useLang();

  const purchaseStatusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: t('status_pending'), color: "bg-yellow-100 text-yellow-700" },
    ordered: { label: t('status_ordered'), color: "bg-blue-100 text-blue-700" },
    received: { label: t('status_received'), color: "bg-green-100 text-green-700" },
    cancelled: { label: t('status_cancelled'), color: "bg-red-100 text-red-700" },
  };

  const deliveryStatusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: t('status_pending'), color: "bg-yellow-100 text-yellow-700" },
    confirmed: { label: t('status_confirmed'), color: "bg-blue-100 text-blue-700" },
    production: { label: t('status_in_production_label'), color: "bg-purple-100 text-purple-700" },
    completed: { label: t('status_completed'), color: "bg-green-100 text-green-700" },
    cancelled: { label: t('status_cancelled'), color: "bg-red-100 text-red-700" },
  };

  const deliveryProgressConfig: Record<string, { label: string; color: string }> = {
    pending: { label: t('status_pending'), color: "bg-gray-100 text-gray-700" },
    shipped: { label: t('delivery_step_shipped'), color: "bg-blue-100 text-blue-700" },
    in_transit: { label: t('delivery_step_in_transit'), color: "bg-amber-100 text-amber-700" },
    delivered: { label: t('delivery_step_delivered'), color: "bg-green-100 text-green-700" },
  };

  const orderTypes = [
    { key: "purchase" as OrderType, label: t('purchase_label'), icon: Package },
    { key: "delivery" as OrderType, label: t('delivery_label'), icon: Truck },
  ];

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
      if (!order.orderCode) order.orderCode = generateOrderCode();
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
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => customFetch("/api/products").then(r => r.json()),
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => customFetch("/api/clients", { headers: authOpts.headers }).then(r => r.json()),
  });

  const { data: inventory } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: () => customFetch("/api/inventory", { headers: authOpts.headers }).then(r => r.json()),
  });

  const stockMap = useMemo(() => {
    const m: Record<number, number> = {};
    if (Array.isArray(inventory)) {
      inventory.forEach((inv: any) => {
        m[inv.productId] = (m[inv.productId] || 0) + inv.quantity;
      });
    }
    return m;
  }, [inventory]);

  const clientsMap = useMemo(() => {
    if (!Array.isArray(clients)) return {};
    return Object.fromEntries(clients.map((c: any) => [c.id, c]));
  }, [clients]);

  useEffect(() => {
    if (!editing && selectedClientId) {
      const client = clientsMap[selectedClientId];
      if (client?.address) {
        setCoordinates(client.address);
      } else {
        setCoordinates("");
      }
    }
  }, [selectedClientId, editing, clientsMap]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clientsMap[selectedClientId] || null;
  }, [selectedClientId, clientsMap]);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    let filtered = orders.filter((o: any) => (o.orderType || "delivery") === orderType);
    if (dateFilter !== "all") {
      filtered = filtered.filter((o: any) => {
        const d = new Date(o.createdAt);
        if (isNaN(d.getTime())) return true;
        const fd = new Date(filterDate);
        if (isNaN(fd.getTime())) return true;
        if (dateFilter === "day")
          return d.getFullYear() === fd.getFullYear() && d.getMonth() === fd.getMonth() && d.getDate() === fd.getDate();
        if (dateFilter === "month")
          return d.getFullYear() === fd.getFullYear() && d.getMonth() === fd.getMonth();
        if (dateFilter === "year")
          return d.getFullYear() === fd.getFullYear();
        return true;
      });
    }
    return filtered;
  }, [orders, orderType, dateFilter, filterDate]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredOrders]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, page, pageSize]);

  useEffect(() => { setPage(1); }, [dateFilter, pageSize]);

  const resetForm = () => {
    setSupplier("");
    setSelectedClientId(0);
    setNotes("");
    setCoordinates("");
    setPurchaseItems([{ name: "", quantity: 1, price: 0 }]);
    setDeliveryItems([{ name: "", quantity: 1, price: 0 }]);
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (order: any) => {
    setEditing(order);
    if (order.orderType === "purchase") {
      setSupplier(order.supplier || "");
      setNotes(order.notes || "");
      const items = order.items?.length
        ? order.items
        : [{ name: order.materialName || "", quantity: order.quantity || 1, price: order.price || 0 }];
      setPurchaseItems(items);
    } else {
      setSelectedClientId(order.clientId || 0);
      setNotes(order.notes || "");
      setCoordinates(order.deliveryAddress || "");
      const items = order.items?.length
        ? order.items.map((it: any) => ({ ...it, productId: it.productId || 0 }))
        : [{ name: order.productName || "", quantity: order.quantity || 1, price: order.productPrice || 0, productId: 0 }];
      setDeliveryItems(items);
    }
    setIsAddOpen(true);
  };

  const closeDialog = () => {
    setIsAddOpen(false);
    resetForm();
  };

  const updateStatus = async (id: number, field: string, value: string) => {
    if (field === "deliveryStatus" && value === "delivered") {
      let order: any = null;
      try {
        const all = JSON.parse(localStorage.getItem("carton_orders") || "[]");
        order = all.find((o: any) => o.id === id);
      } catch {}
      if (!order) {
        try {
          const queryData = queryClient.getQueryData(["/api/orders"]);
          if (Array.isArray(queryData)) order = queryData.find((o: any) => o.id === id);
        } catch {}
      }
      if (order) {
        const items = Array.isArray(order.items) ? order.items : [];
        const sales = JSON.parse(localStorage.getItem("carton_sales") || "[]");
        const existingKeys = new Set(sales.map((s: any) => s.sourceKey).filter(Boolean));
        if (items.length > 0) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const sourceKey = `order_${id}_${item.productId || i}`;
            if (existingKeys.has(sourceKey)) continue;
            sales.push({
              id: sourceKey,
              sourceKey,
              productName: item.name || "Noma'lum",
              warehouseName: "Yetkazib berish",
              quantity: item.quantity || 0,
              totalSum: item.price ? item.quantity * item.price : 0,
              soldAt: new Date().toISOString(),
              source: "order",
              orderCode: order.orderCode,
              clientName: order.clientName,
              clientPhone: order.clientPhone,
            });
          }
        } else if (order.productId) {
          const sourceKey = `order_${id}`;
          if (!existingKeys.has(sourceKey)) {
            sales.push({
              id: sourceKey,
              sourceKey,
              productName: order.productName || "Noma'lum",
              warehouseName: "Yetkazib berish",
              quantity: order.quantity || 0,
              totalSum: order.totalSum || 0,
              soldAt: new Date().toISOString(),
              source: "order",
              orderCode: order.orderCode,
              clientName: order.clientName,
              clientPhone: order.clientPhone,
            });
          }
        }
        localStorage.setItem("carton_sales", JSON.stringify(sales));
      }
    }

    // Always update localStorage regardless of API success/failure
    // so mergeOrders doesn't overwrite the new status with stale local data
    try {
      const stored = JSON.parse(localStorage.getItem("carton_orders") || "[]");
      const localOrder = stored.find((o: any) => o.id === id);
      if (localOrder) {
        localOrder[field] = value;
        localStorage.setItem("carton_orders", JSON.stringify(stored));
      }
    } catch {}

    try {
      await customFetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      // API failed, but we already saved to localStorage above
    }
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  };

  const deleteOrder = async (id: number) => {
    try {
      await customFetch(`/api/orders/${id}`, {
        method: "DELETE",
        headers: authOpts.headers,
      });
    } catch {
      try {
        const deleted = JSON.parse(localStorage.getItem("carton_deleted_orders") || "[]");
        if (!deleted.includes(id)) deleted.push(id);
        localStorage.setItem("carton_deleted_orders", JSON.stringify(deleted));
      } catch {}
    }
    queryClient.setQueryData(["/api/orders"], (old: any) => {
      if (!Array.isArray(old)) return old;
      const filtered = old.filter((o: any) => o.id !== id);
      ordersCache.current = filtered;
      return filtered;
    });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  };

  const validateItems = (items: OrderItem[]): string | null => {
    if (items.length === 0) return t('at_least_one_product');
    for (const item of items) {
      if (!item.name.trim()) return t('enter_product_name');
      if (item.quantity < 1) return t('min_quantity');
      if (item.price < 0) return t('invalid_price');
    }
    return null;
  };

  const onSubmitPurchase = async () => {
    const err = validateItems(purchaseItems);
    if (err) return alert(err);
    if (!supplier.trim()) return alert(t('enter_supplier'));

    setIsLoading(true);
    try {
      const totalSum = purchaseItems.reduce((s, item) => s + item.quantity * item.price, 0);
      const payload = {
        orderType: "purchase",
        supplier: supplier.trim(),
        materialName: purchaseItems.map(i => i.name.trim()).join(", "),
        quantity: purchaseItems.reduce((s, item) => s + item.quantity, 0),
        price: purchaseItems[0]?.price || 0,
        notes,
        orderCode: editing ? editing.orderCode || generateOrderCode() : generateOrderCode(),
        items: purchaseItems.map(item => ({ name: item.name.trim(), quantity: item.quantity, price: item.price })),
        totalSum,
      };

      let apiFailed = false;
      try {
        if (editing) {
          await customFetch(`/api/orders/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authOpts.headers },
            body: JSON.stringify(payload),
          });
        } else {
          await customFetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authOpts.headers },
            body: JSON.stringify(payload),
          });
        }
      } catch (e) {
        console.warn("Backend save failed, saving locally:", e);
        apiFailed = true;
      }

      if (apiFailed) {
        const existing = ordersCache.current || [];
        const updatedOrders = editing
          ? existing.map((o: any) => o.id === editing.id ? { ...o, ...payload, id: o.id } : o)
          : [...existing, { ...payload, id: Date.now(), createdAt: new Date().toISOString(), status: "pending" }];
        localStorage.setItem("carton_orders", JSON.stringify(updatedOrders));
        ordersCache.current = updatedOrders;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      closeDialog();
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitDelivery = async () => {
    const err = validateItems(deliveryItems);
    if (err) return alert(err);
    if (!selectedClientId) return alert(t('select_client'));

    for (const item of deliveryItems) {
      if (!item.productId) continue;
      const stock = stockMap[item.productId] || 0;
      if (item.quantity > stock) {
        return alert(`"${item.name}" uchun omborda yetarli mahsulot yo'q! Mavjud: ${stock} dona, so'ralgan: ${item.quantity} dona`);
      }
    }

    setIsLoading(true);
    try {
      const totalSum = deliveryItems.reduce((s, item) => s + item.quantity * item.price, 0);
      const firstItem = deliveryItems[0];
      let productId = firstItem?.productId || 0;
      if (!productId && Array.isArray(products)) {
        const found = products.find((p: any) => p.name === firstItem?.name);
        if (found) productId = found.id;
      }
      const client = clientsMap[selectedClientId];
      const payload = {
        orderType: "delivery",
        clientId: selectedClientId,
        productId,
        quantity: deliveryItems.reduce((s, item) => s + item.quantity, 0),
        notes,
        deliveryAddress: coordinates,
        orderCode: editing ? editing.orderCode || generateOrderCode() : generateOrderCode(),
        items: deliveryItems.map(item => ({ productId: item.productId, name: item.name.trim(), quantity: item.quantity, price: item.price })),
        totalSum,
      };

      let apiFailed = false;
      try {
        if (editing) {
          await customFetch(`/api/orders/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authOpts.headers },
            body: JSON.stringify(payload),
          });
        } else {
          await customFetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authOpts.headers },
            body: JSON.stringify(payload),
          });
        }
      } catch (e) {
        console.warn("Backend save failed, saving locally:", e);
        apiFailed = true;
      }

      // deduct stock (always)
      try {
        for (const item of deliveryItems) {
          if (!item.productId) continue;
          await customFetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authOpts.headers },
            body: JSON.stringify({ productId: item.productId, quantity: item.quantity, warehouseId: 1 }),
          });
        }
      } catch {
        const stored = JSON.parse(localStorage.getItem("carton_inventory") || "[]");
        for (const item of deliveryItems) {
          if (!item.productId) continue;
          const entry = stored.find((s: any) => s.productId === item.productId);
          if (entry) entry.quantity = Math.max(0, entry.quantity - item.quantity);
          else stored.push({ productId: item.productId, quantity: -item.quantity });
        }
        localStorage.setItem("carton_inventory", JSON.stringify(stored));
      }
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });

      if (apiFailed) {
        const existing = ordersCache.current || [];
        const orderEntry = {
          ...payload,
          id: editing ? editing.id : Date.now(),
          createdAt: editing ? editing.createdAt : new Date().toISOString(),
          status: editing ? editing.status : "pending",
          clientName: client?.name || "",
          clientPhone: client?.phone || "",
        };
        const updatedOrders = editing
          ? existing.map((o: any) => o.id === editing.id ? { ...o, ...orderEntry } : o)
          : [...existing, orderEntry];
        localStorage.setItem("carton_orders", JSON.stringify(updatedOrders));
        ordersCache.current = updatedOrders;
      }

      // Always save to carton_sales so it appears in Sales table with all fields
      const sales = JSON.parse(localStorage.getItem("carton_sales") || "[]");
      const existingKeys = new Set(sales.map((s: any) => s.sourceKey).filter(Boolean));
      const items = deliveryItems || payload.items || [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const sourceKey = `order_${(editing ? editing.id : Date.now())}_${item.productId || i}`;
        if (existingKeys.has(sourceKey)) continue;
        sales.push({
          id: sourceKey,
          sourceKey,
          productName: item.name || "Noma'lum",
          warehouseName: "Yetkazib berish",
          quantity: item.quantity || 0,
          totalSum: item.price ? item.quantity * item.price : 0,
          soldAt: new Date().toISOString(),
          source: "order",
          orderCode: editing ? editing.orderCode : generateOrderCode(),
          clientName: client?.name || "",
          clientPhone: client?.phone || "",
        });
      }
      localStorage.setItem("carton_sales", JSON.stringify(sales));
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      closeDialog();
    } finally {
      setIsLoading(false);
    }
  };

  const formatCoords = (addr: string) => {
    if (!addr) return null;
    const parts = addr.split(",").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return `${parts[0].toFixed(4)}, ${parts[1].toFixed(4)}`;
    }
    return addr;
  };

  const renderItems = (order: any) => {
    const items = order.items;
    if (Array.isArray(items) && items.length > 0) {
      return items.map((item: any, i: number) => (
        <div key={i} className="text-sm">
          <span className="font-medium">{item.name}</span>
          <span className="text-muted-foreground ml-1.5">
            {item.quantity} ta × {formatSum(item.price)}
          </span>
          <span className="ml-1.5 font-semibold text-primary">= {formatSum(item.quantity * item.price)}</span>
          {i < items.length - 1 && <span className="block border-t border-border/40 my-1.5" />}
        </div>
      ));
    }
    return <span>{order.materialName || order.productName} × {order.quantity}</span>;
  };

  const formatItems = (order: any) => {
    const items = order.items;
    if (Array.isArray(items) && items.length > 0)
      return items.map((i: any) => `${i.name} x${i.quantity}`).join(", ");
    return `${order.materialName || order.productName} x${order.quantity}`;
  };

  const exportOrders = () => {
    if (orderType === "purchase") {
      const cols: ExcelColumn[] = [
        { header: "Buyurtma", key: "orderCode" },
        { header: "Yetkazib beruvchi", key: "supplier" },
        { header: "Materiallar", key: "items", accessor: (r: any) => formatItems(r) },
        { header: "Soni", key: "totalItems", accessor: (r: any) => r.totalItems || 0 },
        { header: "Jami summa", key: "totalSum", accessor: (r: any) => r.totalSum || 0 },
        { header: "Vaqt", key: "createdAt", accessor: (r: any) => format(new Date(r.createdAt), "dd.MM.yyyy HH:mm") },
        { header: "Holat", key: "status" },
      ];
      exportToExcel(filteredOrders, cols, "xarid-buyurtmalari");
    } else {
      const cols: ExcelColumn[] = [
        { header: "Buyurtma", key: "orderCode" },
        { header: "Mijoz", key: "clientName" },
        { header: "Mahsulotlar", key: "items", accessor: (r: any) => formatItems(r) },
        { header: "Soni", key: "totalItems", accessor: (r: any) => r.totalItems || 0 },
        { header: "Jami summa", key: "totalSum", accessor: (r: any) => r.totalSum || 0 },
        { header: "Vaqt", key: "createdAt", accessor: (r: any) => format(new Date(r.createdAt), "dd.MM.yyyy HH:mm") },
        { header: "Holat", key: "status" },
        { header: "Yetkazish", key: "deliveryStatus" },
      ];
      exportToExcel(filteredOrders, cols, "yetkazib-berish");
    }
  };

  return (
    <DashboardLayout>
      <div style={{ width: "100%" }}>
      <PageHeader
        title={t('orders_title')}
        description={t('orders_description')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportOrders} className="rounded-xl px-4 h-12">
              <FileDown className="mr-2 h-5 w-5" /> Excel
            </Button>
            <Button onClick={openAdd} className="rounded-xl px-6 h-12 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> {t('new_order_btn')}
            </Button>
          </div>
        }
      />

      <div className="flex gap-2 mb-6">
        {orderTypes.map(ot => (
          <button
            key={ot.key}
            onClick={() => { setOrderType(ot.key); setEditing(null); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
              orderType === ot.key
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <ot.icon className="w-4 h-4" />
            {ot.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-border/50">
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(["all", "day", "month", "year"] as const).map(k => (
            <button
              key={k}
              onClick={() => setDateFilter(k)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                dateFilter === k ? "bg-primary text-white" : "bg-background hover:bg-muted"
              }`}
            >
              {k === "all" ? t('all') : k === "day" ? t('day') : k === "month" ? t('month') : t('year')}
            </button>
          ))}
        </div>
        {dateFilter !== "all" && (
          <input
            type={dateFilter === "year" ? "number" : "date"}
            value={dateFilter === "year" ? filterDate.slice(0, 4) : filterDate}
            onChange={e => setFilterDate(dateFilter === "year" ? `${e.target.value}-01-01` : e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-background text-sm"
          />
        )}
        <div className="text-sm text-muted-foreground ml-auto">
          {sortedOrders.length} ta buyurtma
        </div>
      </div>

      {orderType === "purchase" && (
        <Card className="border-0 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('order_label')}</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('supplier_label')}</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('materials_label')}</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap text-right">{t('count_label')}</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap text-right">{t('total_sum')}</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('time')}</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('status')}</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                      <p className="text-lg font-medium">{t('no_purchase_orders')}</p>
                      <p className="text-muted-foreground mt-1">{t('purchase_orders_empty_desc')}</p>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order: any) => {
                    const totalItems = Array.isArray(order.items)
                      ? order.items.reduce((s: number, i: any) => s + i.quantity, 0)
                      : order.quantity || 0;
                    return (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">#{order.orderCode || order.id}</td>
                        <td className="px-3 py-3 font-medium whitespace-nowrap">{order.supplier}</td>
                        <td className="px-3 py-3">{renderItems(order)}</td>
                        <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{totalItems} ta</td>
                        <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap">{formatSum(order.totalSum)}</td>
                        <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">{format(new Date(order.createdAt), 'dd.MM HH:mm')}</td>
                        <td className="px-3 py-3">
                          <select
                            value={order.status}
                            onChange={e => updateStatus(order.id, "status", e.target.value)}
                            disabled={order.status === "cancelled"}
                            className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${purchaseStatusConfig[order.status]?.color || "bg-gray-100"}`}
                          >
                            {Object.entries(purchaseStatusConfig).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(order)}>
                              {t('edit')}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('delete_order_title')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    #{order.orderCode || order.id} - {t('delete_order_desc')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteOrder(order.id)} className="bg-destructive hover:bg-destructive/90">
                                    {t('delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3 py-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('rows')}:</span>
              {[10, 30, 50].map(s => (
                <button
                  key={s}
                  onClick={() => { setPageSize(s); setPage(1); }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    pageSize === s ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {s}
                </button>
              ))}
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
        </Card>
      )}

      {orderType === "delivery" && (
    <Card className="border-0 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
            <tr>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('order_label')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('client_col')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('products_label')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap text-right">{t('count_label')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap text-right">{t('total_sum')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('location_label')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('time')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('status')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('delivery')}</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap text-right">{t('action')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-16">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                  <p className="text-lg font-medium">{t('no_delivery_orders')}</p>
                  <p className="text-muted-foreground mt-1">{t('delivery_orders_empty_desc')}</p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order: any) => {
                const clientFromMap = clientsMap[order.clientId];
                const clientAddr = order.deliveryAddress || clientFromMap?.address || (order.clientAddress || "");
                const coords = formatCoords(clientAddr);
                const totalItems = Array.isArray(order.items)
                  ? order.items.reduce((s: number, i: any) => s + i.quantity, 0)
                  : order.quantity || 0;
                return (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">#{order.orderCode}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium whitespace-nowrap">{order.clientName}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">{order.clientPhone}</div>
                    </td>
                    <td className="px-3 py-3">{renderItems(order)}</td>
                    <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{totalItems} ta</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap">{formatSum(order.totalSum)}</td>
                    <td className="px-3 py-3">
                      {coords ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs font-mono whitespace-nowrap">{coords}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">{format(new Date(order.createdAt), 'dd.MM HH:mm')}</td>
                    <td className="px-3 py-3">
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order.id, "status", e.target.value)}
                        disabled={order.status === "completed" || order.status === "cancelled"}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${deliveryStatusConfig[order.status]?.color || "bg-gray-100"}`}
                      >
                        {Object.entries(deliveryStatusConfig).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={order.deliveryStatus}
                        onChange={e => updateStatus(order.id, "deliveryStatus", e.target.value)}
                        disabled={order.deliveryStatus === "delivered"}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${deliveryProgressConfig[order.deliveryStatus]?.color || "bg-gray-100"}`}
                      >
                        {Object.entries(deliveryProgressConfig).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(order)}>
                          {t('edit')}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('delete_order_title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                #{order.orderCode || order.id} - {t('delete_order_desc')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOrder(order.id)} className="bg-destructive hover:bg-destructive/90">
                                {t('delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-3 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('rows')}:</span>
          {[10, 30, 50].map(s => (
            <button
              key={s}
              onClick={() => { setPageSize(s); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                pageSize === s ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {s}
            </button>
          ))}
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
    </Card>
  )}

  {/* Purchase order dialog */}
      <Dialog
        open={isAddOpen && orderType === "purchase"}
        onOpenChange={open => { if (!open) closeDialog(); }}
        title={editing ? t('edit_purchase') : t('new_purchase')}
        className="w-[calc(45vw+160px)] translate-x-[20px] max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={e => { e.preventDefault(); onSubmitPurchase(); }} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('supplier_label')}</label>
            <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder={t('supplier_name')} />
          </div>

          <OrderItemsEditor items={purchaseItems} onChange={setPurchaseItems} orderType="purchase" products={Array.isArray(products) ? products : []} stockMap={stockMap} />

          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('note')}</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('additional_info')} />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
            <Button type="submit" isLoading={isLoading}>{t('save')}</Button>
          </div>
        </form>
      </Dialog>

      {/* Delivery order dialog */}
      <Dialog
        open={isAddOpen && orderType === "delivery"}
        onOpenChange={open => { if (!open) closeDialog(); }}
        title={editing ? t('edit_order') : t('new_order_dialog')}
        className="w-[calc(45vw+160px)] translate-x-[20px] max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={e => { e.preventDefault(); onSubmitDelivery(); }} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('client_select')}</label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(Number(e.target.value))}
              className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm"
            >
              <option value={0}>{t('select_product')}</option>
              {Array.isArray(clients) && clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone || t('no_phone')})</option>
              ))}
            </select>
            {selectedClient && (
              <div className="mt-2 p-3 rounded-xl bg-muted/40 border border-border text-sm space-y-1">
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{t('phone_label')}</span> {selectedClient.phone}
                  </div>
                )}
                {selectedClient.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{t('location_info')}</span>
                    <span className="font-mono text-xs">{selectedClient.address}</span>
                  </div>
                )}
                {selectedClient.source && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{t('source_info')}</span> {selectedClient.source}
                  </div>
                )}
              </div>
            )}
          </div>

          <OrderItemsEditor items={deliveryItems} onChange={setDeliveryItems} orderType="delivery" products={Array.isArray(products) ? products : []} stockMap={stockMap} />

          <LocationPicker value={coordinates} onChange={setCoordinates} />

          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('note')}</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('additional_info')} />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
            <Button type="submit" isLoading={isLoading}>{t('save')}</Button>
          </div>
        </form>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}
