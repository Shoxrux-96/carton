import { useState } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { useGetProducts } from "@workspace/api-client-react";
import { useAuthHeaders } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Wrench, TrendingUp, CalendarDays, Clock, Infinity, Search, FileDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import customFetch from "@/lib/custom-fetch";
import { useLang } from "@/lib/i18n";

const schema = z.object({
  productId: z.coerce.number().min(1, "Tanlash majburiy"),
  quantity: z.coerce.number().min(1, "Kamida 1 ta bo'lishi kerak"),
  productionDate: z.string().min(1, "Sana majburiy"),
});

type FormValues = z.infer<typeof schema>;

const formatSum = (n: number) =>
  n.toLocaleString("uz-UZ") + " so'm";

export default function Production() {
  const queryClient = useQueryClient();
  const { t } = useLang();

  const summaryCards = [
    { key: "daily", label: t('today'), icon: Clock, color: "from-blue-500 to-blue-600", period: "day" },
    { key: "monthly", label: t('this_month'), icon: CalendarDays, color: "from-amber-500 to-orange-600", period: "month" },
    { key: "yearly", label: t('this_year'), icon: TrendingUp, color: "from-green-500 to-emerald-600", period: "year" },
    { key: "allTime", label: t('total'), icon: Infinity, color: "from-purple-500 to-violet-600", period: "all" },
  ];

  const authOpts = useAuthHeaders();

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["/api/production/transactions"],
    queryFn: () => customFetch("/api/production/transactions", { headers: authOpts.headers }).then(r => r.json()),
  });
  const { data: products } = useGetProducts({ request: authOpts });

  const { data: summary } = useQuery({
    queryKey: ["/api/production/summary"],
    queryFn: () => customFetch("/api/production/summary", { headers: authOpts.headers }).then(r => r.json()),
  });

  const [period, setPeriod] = useState("day");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [productNameFilter, setProductNameFilter] = useState("");

  const byProductQueryKey = ["/api/production/by-product", period, filterDate, productNameFilter];
  const { data: byProduct } = useQuery({
    queryKey: byProductQueryKey,
    queryFn: () => {
      const params = new URLSearchParams({ period, date: filterDate });
      if (productNameFilter) params.set("productName", productNameFilter);
      return customFetch(`/api/production/by-product?${params}`, { headers: authOpts.headers }).then(r => r.json());
    },
  });

  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productionDate: new Date().toISOString().split('T')[0],
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoadingSubmit(true);
    try {
      const now = new Date();
      const dateTime = `${data.productionDate}T${now.toTimeString().slice(0, 5)}:00`;
      const formattedData = { ...data, productionDate: new Date(dateTime).toISOString() };
      await customFetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify(formattedData),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/production"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/by-product"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsAddOpen(false);
      reset();
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  const periodLabel = period === "day" ? "kun" : period === "month" ? "oy" : "yil";

  return (
    <DashboardLayout>
      <PageHeader
        title={t('production_title')}
        description={t('production_description')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const byProductCols: ExcelColumn[] = [
                { header: "Mahsulot", key: "productName" },
                { header: `${periodLabel}lik ishlab chiqarish`, key: "totalQuantity", accessor: (r: any) => r.totalQuantity || 0 },
                { header: "Summa", key: "totalSum", accessor: (r: any) => r.totalSum || 0 },
              ];
              const txCols: ExcelColumn[] = [
                { header: "Sana", key: "date", accessor: (r: any) => format(new Date(r.date), "dd.MM.yyyy") },
                { header: "Vaqt", key: "time", accessor: (r: any) => format(new Date(r.date), "HH:mm") },
                { header: "Mahsulot", key: "productName" },
                { header: "Miqdor", key: "quantity", accessor: (r: any) => r.quantity || 0 },
                { header: "Summa", key: "totalSum", accessor: (r: any) => r.totalSum || 0 },
              ];
              if (Array.isArray(byProduct) && byProduct.length > 0)
                exportToExcel(byProduct, byProductCols, "ishlab-chiqarish-mahsulot");
              if (Array.isArray(transactions) && transactions.length > 0)
                exportToExcel(transactions, txCols, "ishlab-chiqarish-yozuvlar");
            }} className="rounded-xl px-4 h-12">
              <FileDown className="mr-2 h-5 w-5" /> Excel
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="rounded-xl px-6 h-12 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> {t('enter_production')}
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ key, label, icon: Icon, color }) => {
          const data = summary?.[key] || { totalQuantity: 0, totalSum: 0, count: 0 };
          return (
            <Card key={key} className="relative overflow-hidden border-0 shadow-md">
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10`} />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">{label}</span>
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{data.totalQuantity.toLocaleString()} ta</div>
                <div className="text-sm text-muted-foreground mt-1">{formatSum(data.totalSum)}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Mahsulotlar bo'yicha filtr */}
      <Card className="overflow-hidden border-0 shadow-lg mb-8">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-lg font-bold mb-4">{t('production_by_product')}</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{t('period_label')}</label>
              <div className="flex rounded-xl border-2 border-border overflow-hidden">
                {(["day", "month", "year"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      period === p ? "bg-primary text-white" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {p === "day" ? t('day') : p === "month" ? t('month') : t('year')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                {period === "day" ? t('date') : period === "month" ? t('month') : t('year')}
              </label>
              <Input
                type={period === "day" ? "date" : period === "month" ? "month" : "number"}
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{t('product_name_filter')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('search_by_name')}
                  value={productNameFilter}
                  onChange={e => setProductNameFilter(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl border-2 border-border bg-background text-sm focus-visible:outline-none focus-visible:border-primary transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('product')}</th>
                <th className="px-6 py-4 text-right font-semibold">{periodLabel}lik ishlab chiqarish</th>
                <th className="px-6 py-4 text-right font-semibold">{t('sum_label')}</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(byProduct) ? (
                <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">{t('loading')}</td></tr>
              ) : byProduct.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-16">
                    <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium text-foreground">{t('no_data')}</p>
                  </td>
                </tr>
              ) : (
                byProduct.map((item: any) => (
                  <tr key={item.productId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">{item.productName}</td>
                    <td className="px-6 py-4 text-right font-mono text-base text-success font-semibold">+{item.totalQuantity} ta</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">{formatSum(item.totalSum)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Barcha kirim-chiqim yozuvlar */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-lg font-bold">{t('all_records')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('date')}</th>
                <th className="px-6 py-4 font-semibold">{t('time')}</th>
                <th className="px-6 py-4 font-semibold">{t('product')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('quantity')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('sum_label')}</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">{t('loading')}</td></tr>
              ) : !Array.isArray(transactions) || transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium text-foreground">{t('no_records')}</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={`${tx.type}-${tx.id}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(tx.date), 'dd.MM.yyyy')}</td>
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(tx.date), 'HH:mm')}</td>
                    <td className="px-6 py-4 font-bold text-primary">{tx.productName}</td>
                    <td className={`px-6 py-4 text-right font-mono text-base font-semibold ${tx.type === 'kirim' ? 'text-success' : 'text-destructive'}`}>
                      {tx.type === 'kirim' ? '+' : '-'}{tx.quantity} ta
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">{formatSum(tx.totalSum)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title={t('enter_production_dialog')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('product')}</label>
            <select
              {...register("productId")}
              className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
            >
              <option value="">{t('select_product')}</option>
              {Array.isArray(products) && products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.productId && <p className="mt-1.5 text-xs text-destructive">{errors.productId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('date')}</label>
              <Input type="date" {...register("productionDate")} error={errors.productionDate?.message} />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('quantity')}</label>
              <Input type="number" {...register("quantity")} error={errors.quantity?.message} placeholder="1" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" isLoading={isLoadingSubmit}>{t('save')}</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
