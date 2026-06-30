import { useState, useMemo, useEffect } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useGetSales, useCreateSale, useGetProducts, useGetWarehouses } from "@workspace/api-client-react";
import { useAuthHeaders } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, TrendingUp, Trash2, FileDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { format } from "date-fns";
import { useLang } from "@/lib/i18n";

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

interface SaleItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
}

function getLocal(key: string, fallback: any = null) {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; }
}
function setLocal(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export default function Sales() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  
  const { data: apiRecords, isLoading } = useGetSales({ request: authOpts });
  const { data: products } = useGetProducts({ request: authOpts });
  const { data: warehouses } = useGetWarehouses({ request: authOpts });
  const createMutation = useCreateSale({ request: authOpts });
  const { t } = useLang();

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => customFetch("/api/clients", { headers: authOpts.headers }).then(r => r.json()),
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [localSales, setLocalSales] = useState<any[]>(() => getLocal("carton_sales", []));

  // Multi-item form state
  const [soldAt, setSoldAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<SaleItem[]>([{ productId: 0, name: "", quantity: 1, price: 0 }]);
  const [clientId, setClientId] = useState<number | "">("");
  const selectedClient = Array.isArray(clients) ? clients.find((c: any) => c.id === Number(clientId)) : null;

  const resetForm = () => {
    setSoldAt(new Date().toISOString().slice(0, 10));
    setItems([{ productId: 0, name: "", quantity: 1, price: 0 }]);
    setClientId("");
    setApiError(null);
  };

  const addItem = () => setItems([...items, { productId: 0, name: "", quantity: 1, price: 0 }]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const selectProduct = (idx: number, productId: number) => {
    const product = Array.isArray(products) ? products.find((p: any) => p.id === productId) : null;
    if (product) {
      setItems(
        items.map((item, i) =>
          i === idx ? { ...item, productId: product.id, name: product.name, price: product.price || 0 } : item
        )
      );
    }
  };

  const totalSum = items.reduce((s, item) => s + item.quantity * item.price, 0);

  const onSubmit = async () => {
    if (!soldAt) return alert(t('enter_date'));
    if (!clientId) return alert(t('select_client_alert'));
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) return alert(t('min_one_product'));

    setApiError(null);
    const newSales: any[] = [];

    for (const item of validItems) {
      let apiFailed = false;
      try {
        await createMutation.mutateAsync({
          data: { productId: item.productId, quantity: item.quantity, warehouseId: 1 },
        } as any);
      } catch (err: any) {
        apiFailed = true;
        setApiError(err?.error || t('api_error_local'));
      }

      const product = Array.isArray(products) ? products.find((p: any) => p.id === item.productId) : null;
      newSales.push({
        id: Date.now() + Math.random(),
        productName: product?.name || item.name || "Noma'lum",
        warehouseName: "",
        quantity: item.quantity,
        totalSum: item.quantity * item.price,
        soldAt: new Date(soldAt).toISOString(),
        source: "manual",
        clientName: selectedClient?.name || "",
        clientPhone: selectedClient?.phone || "",
        clientId: Number(clientId),
      });

      if (apiFailed) {
        try {
          const inventory = JSON.parse(localStorage.getItem("carton_inventory") || "[]");
          const entry = inventory.find((i: any) => i.productId === item.productId);
          if (entry) entry.quantity = Math.max(0, entry.quantity - item.quantity);
          else inventory.push({ productId: item.productId, quantity: -item.quantity });
          localStorage.setItem("carton_inventory", JSON.stringify(inventory));
        } catch {}
      }
    }

    if (newSales.length > 0) {
      const updated = [...localSales, ...newSales];
      setLocalSales(updated);
      setLocal("carton_sales", updated);
    }

    queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    queryClient.invalidateQueries({ queryKey: ["/api/production/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    setIsAddOpen(false);
    resetForm();
  };

  // Merge API records + local sales
  const allRecords = useMemo(() => {
    const merged: any[] = [];

    // Local records first (source of truth — have all fields)
    for (const s of localSales) {
      if (s && s.id != null) {
        merged.push({ ...s, source: s.source || "manual" });
      }
    }

    // API records — add only if no matching local record
    if (Array.isArray(apiRecords)) {
      for (const r of apiRecords) {
        if (!r || r.id == null) continue;
        const rAny = r as any;
        const match = merged.find(
          (s: any) => s.productName === rAny.productName &&
          s.quantity === rAny.quantity &&
          Math.abs(new Date(s.soldAt).getTime() - new Date(rAny.soldAt).getTime()) < 60000
        );
        if (!match) {
          merged.push({
            ...rAny,
            source: "api",
            clientName: rAny.clientName || "",
            clientPhone: rAny.clientPhone || "",
            totalSum: rAny.totalSum || 0,
          });
        }
      }
    }

    return merged.sort(
      (a, b) => new Date(b.soldAt || b.createdAt).getTime() - new Date(a.soldAt || a.createdAt).getTime()
    ).filter((r: any) => (r.totalSum || 0) > 0);
  }, [apiRecords, localSales]);

  // Date filter
  const [dateFilter, setDateFilter] = useState<"all" | "day" | "month" | "year">("all");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));

  const filteredRecords = useMemo(() => {
    if (dateFilter === "all") return allRecords;
    return allRecords.filter((r: any) => {
      const d = new Date(r.soldAt || r.createdAt);
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
  }, [allRecords, dateFilter, filterDate]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  useEffect(() => { setPage(1); }, [dateFilter, pageSize]);

  const exportSales = () => {
    const cols: ExcelColumn[] = [
      { header: "Sana", key: "soldAt", accessor: (r: any) => format(new Date(r.soldAt), "dd.MM.yyyy HH:mm") },
      { header: "Mahsulot", key: "productName" },
      { header: "Sotilgan miqdor", key: "quantity", accessor: (r: any) => r.quantity },
      { header: "Summasi", key: "totalSum", accessor: (r: any) => r.totalSum || 0 },
      { header: "Sotuv turi", key: "source", accessor: (r: any) => r.source === "order" ? "Buyurtma" : "Kelishuv" },
      { header: "Mijoz", key: "clientName", accessor: (r: any) => r.clientName || "" },
      { header: "Telefon raqami", key: "clientPhone", accessor: (r: any) => r.clientPhone || "" },
    ];
    exportToExcel(filteredRecords, cols, "sotuv");
  };

  return (
    <DashboardLayout>
      <PageHeader 
        title={t('sales_title')} 
        description={t('sales_description')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportSales} className="rounded-xl px-4 h-12">
              <FileDown className="mr-2 h-5 w-5" /> Excel
            </Button>
            <Button onClick={() => {setIsAddOpen(true); setApiError(null);}} className="rounded-xl px-6 h-12 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> {t('enter_sale')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
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
          {filteredRecords.length} ta yozuv
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('date')}</th>
                <th className="px-6 py-4 font-semibold">{t('products_label')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('sold_quantity')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('amount_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('sale_type')}</th>
                <th className="px-6 py-4 font-semibold">{t('client_col')}</th>
                <th className="px-6 py-4 font-semibold">{t('phone_number')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && paginatedRecords.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">{t('loading')}</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium text-foreground">{t('no_records')}</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record: any) => (
                  <tr key={record.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{format(new Date(record.soldAt), 'dd.MM.yyyy HH:mm')}</td>
                    <td className="px-6 py-4 font-bold text-primary">{record.productName}</td>
                    <td className="px-6 py-4 text-right font-mono text-base font-semibold whitespace-nowrap">-{record.quantity} ta</td>
                    <td className="px-6 py-4 text-right font-mono text-sm whitespace-nowrap">{formatSum(record.totalSum || 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                        record.source === "order" 
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {record.source === "order" ? t('order_type_label') : t('agreement_type')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{record.clientName || <span className="text-xs opacity-40">—</span>}</td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{record.clientPhone || <span className="text-xs opacity-40">—</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {paginatedRecords.length > 0 && (
          <div className="border-t border-border/50 px-6 py-3 flex items-center justify-between">
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
        )}
      </Card>

      <Dialog open={isAddOpen} onOpenChange={o => { setIsAddOpen(o); if (!o) resetForm(); }} title={t('register_sale')}>
        <div className="space-y-4 pt-4">
          
          {apiError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg font-medium">
              {apiError}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
            <span>{t('agreement_type')}</span>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('date')}</label>
            <Input type="date" value={soldAt} onChange={e => setSoldAt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">{t('products_label')}</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> {t('add_item')}
              </Button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border-2 border-border bg-muted/20">
                <div className="flex-1 grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <select
                      value={item.productId || ""}
                      onChange={e => selectProduct(idx, Number(e.target.value))}
                      className="w-full h-9 rounded-lg border-2 border-border bg-background px-3 text-sm"
                    >
                      <option value="">{t('select_product_option')}</option>
                      {Array.isArray(products) && products.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(idx, "quantity", Math.max(1, Number(e.target.value)))}
                    placeholder="Miqdor"
                    className="col-span-3 h-9 rounded-lg border-2 border-border bg-background px-3 text-sm text-center"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => updateItem(idx, "price", Math.max(0, Number(e.target.value)))}
                    placeholder="Narxi"
                    className="col-span-3 h-9 rounded-lg border-2 border-border bg-background px-3 text-sm text-center"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <div className="text-right text-sm font-semibold text-primary pt-1">
              Jami: {formatSum(totalSum)}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('client_col')}</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value ? Number(e.target.value) : "")}
              className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
            >
              <option value="">{t('select_product')}</option>
              {Array.isArray(clients) && clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedClient && (
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('phone_number')}</label>
              <div className="h-12 w-full rounded-xl border-2 border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                {selectedClient.phone || "—"}
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>{t('cancel')}</Button>
            <Button type="button" onClick={onSubmit} isLoading={createMutation.isPending}>{t('register_btn')}</Button>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
