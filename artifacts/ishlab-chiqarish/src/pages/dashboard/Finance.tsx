import { useState, useMemo } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, RefreshCw, FileDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useLang } from "@/lib/i18n";

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().optional(),
  amount: z.coerce.number().min(1, "Summa majburiy"),
  description: z.string().optional(),
  date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function getLocal(key: string, fallback: any = null) {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; }
}
function setLocal(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

interface FinanceRecord {
  id: number;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
  source?: string;
}

const AUTO_SOURCES = ["carton_auto_finance"];
const DELETED_SOURCES_KEY = "carton_deleted_finance_sources";

export default function Finance() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [txType, setTxType] = useState<"all" | "income" | "expense">("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "year">("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { t } = useLang();

  // API data
  const { data: apiTransactions } = useQuery({
    queryKey: ["/api/finance"],
    queryFn: () => customFetch("/api/finance", { headers: authOpts.headers }).then(r => r.json()),
  });

  const { data: apiSummary } = useQuery({
    queryKey: ["/api/finance/summary"],
    queryFn: () => customFetch("/api/finance/summary", { headers: authOpts.headers }).then(r => r.json()),
  });

  // Sales data
  const { data: sales } = useQuery({
    queryKey: ["/api/sales"],
    queryFn: () => customFetch("/api/sales", { headers: authOpts.headers }).then(r => r.json()),
  });

  // Production transactions
  const { data: prodTransactions } = useQuery({
    queryKey: ["/api/production/transactions"],
    queryFn: () => customFetch("/api/production/transactions", { headers: authOpts.headers }).then(r => r.json()),
  });

  // Orders (for purchase → expense)
  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: () => customFetch("/api/orders", { headers: authOpts.headers }).then(r => r.json()),
  });

  // Local manually-added finance records
  const [manualRecords, setManualRecords] = useState<FinanceRecord[]>(() => getLocal("carton_finance", []));
  // Track deleted auto-generated sources so they don't reappear
  const [deletedSources, setDeletedSources] = useState<string[]>(() => getLocal(DELETED_SOURCES_KEY, []));

  // Persist
  const persistManual = (records: FinanceRecord[]) => {
    setManualRecords(records);
    setLocal("carton_finance", records);
  };
  const persistDeleted = (sources: string[]) => {
    setDeletedSources(sources);
    setLocal(DELETED_SOURCES_KEY, sources);
  };

  // Auto-generated records (computed every render, no effect needed)
  const autoRecords = useMemo(() => {
    const result: FinanceRecord[] = [];
    const skip = new Set(deletedSources);
    let idCounter = -1;

    // 1. From sales (API + localStorage)
    const allSales = Array.isArray(sales) ? [...sales] : [];
    const localSales: any[] = getLocal("carton_sales", []);
    for (const ls of localSales) {
      if (!allSales.some((s: any) => s.id === ls.id)) allSales.push(ls);
    }
    for (const sale of allSales) {
      const src = `sale_${sale.id}`;
      if (skip.has(src)) continue;
      result.push({
        id: idCounter--,
        type: "income",
        category: "Sotuv",
        amount: sale.totalSum || 0,
        description: `${sale.productName || "Mahsulot"} sotildi (${sale.quantity || 0} ta)`,
        date: sale.soldAt ? sale.soldAt.split("T")[0] : format(new Date(), "yyyy-MM-dd"),
        source: src,
      });
    }

    // 2. From production material expenses (API + localStorage)
    const allProdTx = Array.isArray(prodTransactions) ? [...prodTransactions] : [];
    for (const tx of allProdTx) {
      const src = `prod_${tx.id}`;
      if (skip.has(src)) continue;
      if (tx.type === "chiqim" && tx.totalSum > 0) {
        result.push({
          id: idCounter--,
          type: "expense",
          category: "Material",
          amount: tx.totalSum,
          description: `${tx.productName || "Material"} ishlatildi (${tx.quantity || 0} ta)`,
          date: tx.date ? tx.date.split("T")[0] : format(new Date(), "yyyy-MM-dd"),
          source: src,
        });
      }
    }

    // 3. Salary expenses (last 3 months)
    const employees = getLocal("carton_employees", []);
    const attendance = getLocal("carton_attendance", {});
    const offDays = getLocal("carton_off_days", []);
    const isDayOff = (date: string) => offDays.some((d: any) => d.date === date);

    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const d = new Date();
      d.setMonth(d.getMonth() - monthOffset);
      const ym = format(d, "yyyy-MM");
      const lastDay = format(endOfMonth(d), "yyyy-MM-dd");
      const src = `salary_${ym}`;
      if (skip.has(src)) continue;

      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const workingDays = allDays.filter(dd => !isDayOff(format(dd, "yyyy-MM-dd")));
      const totalWorkingDays = workingDays.length;

      let totalSalary = 0;
      for (const emp of employees) {
        if (emp.status !== "active") continue;
        const monthlySalary = emp.salary || 0;
        if (monthlySalary === 0) continue;
        let attended = 0;
        for (const [dateStr, entries] of Object.entries(attendance)) {
          if (!String(dateStr).startsWith(ym)) continue;
          const record = (entries as any[]).find((e: any) => e.employeeId === emp.id);
          if (record && (record.status === "present" || record.status === "late")) attended++;
        }
        const dailyRate = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0;
        totalSalary += Math.round(dailyRate * attended);
      }

      if (totalSalary > 0) {
        result.push({
          id: idCounter--,
          type: "expense",
          category: "Maosh",
          amount: totalSalary,
          description: `${ym} oyi uchun ish haqi (${employees.filter((e: any) => e.status === "active").length} hodim)`,
          date: lastDay,
          source: src,
        });
      }
    }

    // 4. Purchase orders as expense
    const allOrders = Array.isArray(orders) ? [...orders] : [];
    // Also include locally-saved purchase orders
    const localOrders: any[] = getLocal("carton_orders", []);
    for (const lo of localOrders) {
      if (!allOrders.some((o: any) => o.id === lo.id)) allOrders.push(lo);
    }
    for (const order of allOrders) {
      if (order.orderType !== "purchase") continue;
      const src = `purchase_${order.id}`;
      if (skip.has(src)) continue;
      const totalSum = order.totalSum || 0;
      if (totalSum <= 0) continue;
      const items = Array.isArray(order.items) ? order.items : [];
      const desc = items.length > 0
        ? items.map((i: any) => `${i.name} x${i.quantity}`).join(", ")
        : order.materialName || "Xarid";
      result.push({
        id: idCounter--,
        type: "expense",
        category: "Xarid",
        amount: totalSum,
        description: `${desc} (yetkazib beruvchi: ${order.supplier || "Noma'lum"})`,
        date: order.createdAt ? order.createdAt.split("T")[0] : format(new Date(), "yyyy-MM-dd"),
        source: src,
      });
    }

    return result;
  }, [sales, prodTransactions, orders, deletedSources]);

  // Merge API + manual + auto records
  const allRecords = useMemo(() => {
    const api = Array.isArray(apiTransactions) ? apiTransactions : [];
    const apiIds = new Set(api.map((r: any) => r.id));
    const manualIds = new Set(manualRecords.map(r => r.id));
    const merged = [
      ...api.filter((r: any) => !manualIds.has(r.id)),
      ...manualRecords,
      ...autoRecords.filter(r => !apiIds.has(r.id) && !manualIds.has(r.id)),
    ];
    merged.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let result = merged;
    if (txType === "income") result = result.filter((r: any) => r.type === "income");
    if (txType === "expense") result = result.filter((r: any) => r.type === "expense");
    // Period filter
    if (periodFilter !== "all") {
      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
      const yearStr = String(selectedYear);
      result = result.filter((r: any) => {
        if (!r.date) return false;
        if (periodFilter === "month") return r.date.startsWith(monthStr);
        if (periodFilter === "year") return r.date.startsWith(yearStr);
        return true;
      });
    }
    return result;
  }, [apiTransactions, manualRecords, autoRecords, txType, periodFilter, selectedMonth, selectedYear]);

  // Compute summary from allRecords
  const computedSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const currentYear = format(now, "yyyy");

    let monthIncome = 0, monthExpense = 0;
    let yearIncome = 0, yearExpense = 0;

    for (const r of allRecords) {
      if (r.date.startsWith(currentYear)) {
        if (r.type === "income") yearIncome += r.amount;
        else yearExpense += r.amount;
      }
      if (r.date.startsWith(currentMonth)) {
        if (r.type === "income") monthIncome += r.amount;
        else monthExpense += r.amount;
      }
    }

    return {
      monthly: { income: monthIncome, expense: monthExpense, profit: monthIncome - monthExpense },
      yearly: { income: yearIncome, expense: yearExpense, profit: yearIncome - yearExpense },
    };
  }, [allRecords]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "income", date: format(new Date(), "yyyy-MM-dd") },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const payload = { ...data, date: data.date || format(new Date(), "yyyy-MM-dd") };
      try {
        await customFetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(payload),
        });
      } catch {}

      // Always save locally
      const record: FinanceRecord = {
        id: Date.now(),
        ...data,
        category: data.category || (data.type === "income" ? "Kirim" : "Chiqim"),
        description: data.description || "",
      };
      persistManual([record, ...manualRecords]);
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      setIsAddOpen(false);
      reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirm_delete'))) return;
    // Check if it's an auto-generated record
    const auto = autoRecords.find(r => r.id === id);
    if (auto?.source) {
      persistDeleted([...deletedSources, auto.source]);
      return;
    }
    // Try API delete
    try {
      await customFetch(`/api/finance/${id}`, { method: "DELETE", headers: authOpts.headers });
    } catch {}
    // Remove from manual records
    persistManual(manualRecords.filter(r => r.id !== id));
    queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
  };

  // Generate salary for current month manually
  const generateMonthlyExpenses = () => {
    const employees = getLocal("carton_employees", []);
    const attendance = getLocal("carton_attendance", {});
    const offDays = getLocal("carton_off_days", []);
    const isDayOff = (date: string) => offDays.some((d: any) => d.date === date);
    const now = new Date();
    const ym = format(now, "yyyy-MM");

    // If already auto-generated, skip
    if (autoRecords.some(r => r.source === `salary_${ym}`)) {
      alert(t('salary_already_calculated'));
      return;
    }

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDays = allDays.filter(d => !isDayOff(format(d, "yyyy-MM-dd")));
    const totalWorkingDays = workingDays.length;

    let totalSalary = 0;
    for (const emp of employees) {
      if (emp.status !== "active") continue;
      const monthlySalary = emp.salary || 0;
      if (monthlySalary === 0) continue;
      let attended = 0;
      for (const [dateStr, entries] of Object.entries(attendance)) {
        if (!String(dateStr).startsWith(ym)) continue;
        const record = (entries as any[]).find((e: any) => e.employeeId === emp.id);
        if (record && (record.status === "present" || record.status === "late")) attended++;
      }
      const dailyRate = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0;
      totalSalary += Math.round(dailyRate * attended);
    }

    if (totalSalary > 0) {
      // Add as manual record (not auto, so it won't be regenerated)
      persistManual([...manualRecords, {
        id: Date.now(),
        type: "expense",
        category: "Maosh",
        amount: totalSalary,
        description: `${ym} oyi uchun ish haqi`,
        date: format(endOfMonth(now), "yyyy-MM-dd"),
        source: `salary_${ym}`,
      }]);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t('finance_title')}
        description={t('finance_description')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const cols: ExcelColumn[] = [
                { header: "Sana", key: "date", accessor: (r: any) => format(new Date(r.date), "dd.MM.yyyy") },
                { header: "Tur", key: "type", accessor: (r: any) => r.type === "income" ? "Kirim" : "Chiqim" },
                { header: "Kategoriya", key: "category", accessor: (r: any) => r.category || "" },
                { header: "Izoh", key: "description", accessor: (r: any) => r.description || "" },
                { header: "Manba", key: "source", accessor: (r: any) => r.source || "Qo'lda" },
                { header: "Summa", key: "amount", accessor: (r: any) => r.amount || 0 },
              ];
              exportToExcel(allRecords, cols, "moliya");
            }} className="rounded-xl px-4 h-12">
              <FileDown className="mr-2 h-5 w-5" /> Excel
            </Button>
            <Button variant="outline" onClick={generateMonthlyExpenses} className="rounded-xl px-4 h-12">
              <RefreshCw className="mr-2 h-5 w-5" /> {t('monthly_expense_btn')}
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="rounded-xl px-6 h-12 shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> {t('new_record')}
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">{t('income')}</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-800">{formatSum(computedSummary.monthly.income)}</div>
          <div className="text-xs text-green-600 mt-1">{t('this_month')}</div>
        </Card>
        <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">{t('expense')}</span>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-800">{formatSum(computedSummary.monthly.expense)}</div>
          <div className="text-xs text-red-600 mt-1">{t('this_month')}</div>
        </Card>
        <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">{t('profit')}</span>
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <div className={`text-2xl font-bold ${computedSummary.monthly.profit >= 0 ? "text-green-800" : "text-red-800"}`}>
            {formatSum(computedSummary.monthly.profit)}
          </div>
          <div className="text-xs text-blue-600 mt-1">{t('this_month')}</div>
        </Card>
      </div>

      {/* Yearly summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4 border shadow-sm">
          <div className="text-xs text-muted-foreground mb-1">{t('yearly_income')}</div>
          <div className="text-lg font-bold text-green-700">{formatSum(computedSummary.yearly.income)}</div>
        </Card>
        <Card className="p-4 border shadow-sm">
          <div className="text-xs text-muted-foreground mb-1">{t('yearly_expense')}</div>
          <div className="text-lg font-bold text-red-700">{formatSum(computedSummary.yearly.expense)}</div>
        </Card>
        <Card className="p-4 border shadow-sm">
          <div className="text-xs text-muted-foreground mb-1">{t('yearly_profit')}</div>
          <div className={`text-lg font-bold ${computedSummary.yearly.profit >= 0 ? "text-green-700" : "text-red-700"}`}>
            {formatSum(computedSummary.yearly.profit)}
          </div>
        </Card>
      </div>

      {/* Filter tabs + auto-generated info */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="flex gap-2">
          {(["all", "income", "expense"] as const).map(tp => (
            <button
              key={tp}
              onClick={() => setTxType(tp)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                txType === tp
                  ? "bg-primary text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tp === "all" ? t('all') : tp === "income" ? t('income') : t('expense')}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl border border-border overflow-hidden ml-2">
          {(["all", "month", "year"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                periodFilter === p ? "bg-primary text-white" : "bg-background hover:bg-muted"
              }`}
            >
              {p === "all" ? t('total') : p === "month" ? t('month') : t('year')}
            </button>
          ))}
        </div>
        {periodFilter !== "all" && (
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <span>📅</span>
              <span>
                {periodFilter === "month"
                  ? `${["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"][selectedMonth]} ${selectedYear}`
                  : selectedYear}
              </span>
            </button>
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 bg-card border-2 border-border rounded-2xl shadow-xl z-50 p-5 min-w-[280px]">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setSelectedYear(y => y - 1)} className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-lg">◀</button>
                  <span className="text-xl font-bold">{selectedYear}</span>
                  <button onClick={() => setSelectedYear(y => y + 1)} className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-lg">▶</button>
                </div>
                {periodFilter === "month" && (
                  <div className="grid grid-cols-3 gap-2">
                    {["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"].map((m, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedMonth(i); setShowDatePicker(false); }}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                          selectedMonth === i
                            ? "bg-primary text-white shadow-md"
                            : "bg-muted/50 hover:bg-muted text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {periodFilter === "year" && (
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="w-full mt-2 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm"
                  >
                    ✅ {t('select_label')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-muted-foreground ml-auto">
          {allRecords.length} ta yozuv
        </div>
      </div>

      {/* Transactions table */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('date')}</th>
                <th className="px-6 py-4 font-semibold">{t('category')}</th>
                <th className="px-6 py-4 font-semibold">{t('description_label')}</th>
                <th className="px-6 py-4 font-semibold">{t('source')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('sum_label')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {allRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium">{t('no_records')}</p>
                  </td>
                </tr>
              ) : (
                allRecords.map((tx: any) => {
                  const isAuto = !!tx.source;
                  return (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {format(new Date(tx.date), 'dd.MM.yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {tx.category || (tx.type === "income" ? "Kirim" : "Chiqim")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-[300px] truncate">
                        {tx.description || "-"}
                        {isAuto && (
                          <span className="ml-2 text-[10px] text-blue-500 font-medium">{t('auto_label')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {tx.source ? (
                          <span className="font-mono text-[10px]">
                            {tx.source.startsWith("sale") ? t('sale_source') :
                             tx.source.startsWith("salary") ? t('salary_source') :
                             tx.source.startsWith("prod") ? t('material_source') :
                             tx.source.startsWith("purchase") ? t('purchase_source') : t('manual_label')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{t('manual_label')}</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-semibold whitespace-nowrap ${
                        tx.type === "income" ? "text-green-600" : "text-red-600"
                      }`}>
                        {tx.type === "income" ? "+" : "-"}{formatSum(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isAuto && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title={t('new_finance_record')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('record_type')}</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="income" {...register("type")} className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{t('income')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="expense" {...register("type")} className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">{t('expense')}</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('category')}</label>
              <select {...register("category")} className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm">
                <option value="">{t('select_product')}</option>
                <option value="Sotuv">{t('category_sale')}</option>
                <option value="Maosh">{t('category_salary')}</option>
                <option value="Material">Material</option>
                <option value="Transport">Transport</option>
                <option value="Kommunal">Kommunal</option>
                <option value="Boshqa">Boshqa</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1.5">{t('amount_label')}</label>
              <Input type="number" {...register("amount")} error={errors.amount?.message} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1.5">{t('description_label')}</label>
            <Input {...register("description")} placeholder={t('short_info')} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" isLoading={isLoading}>{t('save')}</Button>
          </div>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
