import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Package, TrendingUp, Wrench, Building2,
  TrendingDown, Landmark, Layers, ArrowUpRight, ArrowDownRight,
  DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, LineChart } from "recharts";
import { format, subMonths, subDays, eachDayOfInterval, subYears } from "date-fns";

const MONTHS_UZ = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

type FinPeriod = "daily" | "monthly" | "yearly";

export default function Overview() {
  const { t } = useLang();
  const authOpts = useAuthHeaders();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: () => customFetch("/api/dashboard", { headers: authOpts.headers }).then(r => r.json()),
  });

  const { data: financeData } = useQuery({
    queryKey: ["/api/finance"],
    queryFn: () => customFetch("/api/finance", { headers: authOpts.headers }).then(r => r.json()),
    enabled: !isLoading,
  });

  const { data: salesData } = useQuery({
    queryKey: ["/api/sales"],
    queryFn: () => customFetch("/api/sales", { headers: authOpts.headers }).then(r => r.json()),
    enabled: !isLoading,
  });

  const { data: productionTx } = useQuery({
    queryKey: ["/api/production/transactions"],
    queryFn: () => customFetch("/api/production/transactions", { headers: authOpts.headers }).then(r => r.json()),
    enabled: !isLoading,
  });

  const statCards = [
    { title: t('total_products'), value: stats?.totalProducts, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-500/20 to-blue-500/5" },
    { title: t('inventory_types'), value: stats?.totalInventoryItems, icon: Layers, color: "text-indigo-500", bg: "bg-indigo-500/10", gradient: "from-indigo-500/20 to-indigo-500/5" },
    { title: t('today_production'), value: stats?.totalProductionToday, icon: Wrench, color: "text-teal-500", bg: "bg-teal-500/10", gradient: "from-teal-500/20 to-teal-500/5" },
    { title: t('today_sales'), value: stats?.totalSalesToday, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", gradient: "from-emerald-500/20 to-emerald-500/5" },
    { title: t('clients'), value: stats?.totalCustomers, icon: Building2, color: "text-cyan-500", bg: "bg-cyan-500/10", gradient: "from-cyan-500/20 to-cyan-500/5" },
    { title: t('month_income'), icon: DollarSign, value: stats?.monthlyIncome ? Math.round(stats.monthlyIncome / 1000000) + " mln so'm" : "0", color: "text-green-500", bg: "bg-green-500/10", gradient: "from-green-500/20 to-green-500/5" },
    { title: t('month_expense'), icon: TrendingDown, value: stats?.monthlyExpense ? Math.round(stats.monthlyExpense / 1000000) + " mln so'm" : "0", color: "text-red-500", bg: "bg-red-500/10", gradient: "from-red-500/20 to-red-500/5" },
    { title: t('month_profit'), icon: Landmark, value: stats?.monthlyProfit ? Math.round(stats.monthlyProfit / 1000000) + " mln so'm" : "0", color: "text-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-500/20 to-blue-500/5" },
  ];

  const lastSixMonths = useMemo(() => {
    const now = new Date();
    const points: { y: number; m: number; ym: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), i);
      points.push({
        y: d.getFullYear(),
        m: d.getMonth(),
        ym: format(d, "yyyy-MM"),
      });
    }
    return points;
  }, []);

  const saleChartData = useMemo(() => {
    const sales = Array.isArray(salesData) ? salesData : [];
    const production = Array.isArray(productionTx) ? productionTx : [];

    return lastSixMonths.map(({ y, m, ym }) => {
      const monthSales = sales
        .filter((s: any) => s.soldAt?.startsWith(ym))
        .reduce((sum: number, s: any) => sum + (s.totalSum || 0), 0);
      const monthProd = production
        .filter((p: any) => p.date?.startsWith(ym))
        .reduce((sum: number, p: any) => sum + (p.totalSum || 0), 0);
      return {
        date: `${MONTHS_UZ[m]} ${y}`,
        sotuv: Math.round(monthSales / 1000),
        ishlab_chiqarish: Math.round(monthProd / 1000),
      };
    });
  }, [salesData, productionTx, lastSixMonths]);

  const [finPeriod, setFinPeriod] = useState<FinPeriod>("monthly");

  const financeChartData = useMemo(() => {
    const tx = Array.isArray(financeData) ? financeData : [];
    const sumIncome = (rows: any[]) => rows.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const sumExpense = (rows: any[]) => rows.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const toMln = (v: number) => Math.round(v / 1000000);

    if (finPeriod === "daily") {
      const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
      return days.map((day) => {
        const ds = format(day, "yyyy-MM-dd");
        const dayTx = tx.filter((t: any) => t.date?.startsWith(ds));
        return { name: format(day, "dd.MM"), kirim: toMln(sumIncome(dayTx)), chiqim: toMln(sumExpense(dayTx)) };
      });
    }

    if (finPeriod === "yearly") {
      const now = new Date();
      const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).reverse();
      return years.map((y) => {
        const yTx = tx.filter((t: any) => new Date(t.date).getFullYear() === y);
        return { name: String(y), kirim: toMln(sumIncome(yTx)), chiqim: toMln(sumExpense(yTx)) };
      });
    }

    return lastSixMonths.map(({ y, m, ym }) => {
      const monthTx = tx.filter((t: any) => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
      return {
        name: `${MONTHS_UZ[m]} ${y}`,
        kirim: toMln(sumIncome(monthTx)),
        chiqim: toMln(sumExpense(monthTx)),
      };
    });
  }, [financeData, lastSixMonths, finPeriod]);

  const chartConfig1: ChartConfig = {
    sotuv: { label: t('sale_label'), color: "#10b981" },
    ishlab_chiqarish: { label: t('production_label'), color: "#6366f1" },
  };

  const chartConfig2: ChartConfig = {
    kirim: { label: t('income'), color: "#22c55e" },
    chiqim: { label: t('expense'), color: "#ef4444" },
  };

  const totalSales = Array.isArray(salesData)
    ? salesData.reduce((s: number, r: any) => s + (r.totalSum || 0), 0)
    : 0;
  const totalProd = Array.isArray(productionTx)
    ? productionTx.reduce((s: number, r: any) => s + (r.totalSum || 0), 0)
    : 0;
  const profit = (stats?.monthlyIncome || 0) - (stats?.monthlyExpense || 0);
  const profitPercent = stats?.monthlyIncome
    ? Math.round((profit / stats.monthlyIncome) * 100)
    : 0;

  return (
    <DashboardLayout>
      <PageHeader
        title={t('overview_title')}
        description={t('overview_description')}
      />

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 11 }).map((_, i) => (
              <Skeleton key={`overview-skeleton-${i}`} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Card className="relative p-5 overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="relative flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                      <h3 className="text-2xl font-bold font-display text-foreground leading-none mt-1">
                        {stat.value ?? 0}
                      </h3>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales trend line chart */}
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold">{t('sales_trend')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('sales_trend_desc')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">{t('sale_label')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs text-muted-foreground">{t('production_label')}</span>
                  </div>
                </div>
              </div>
              <ChartContainer config={chartConfig1} className="aspect-[2/1] w-full">
                <AreaChart data={saleChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sotuvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="sotuv" stroke="#10b981" fill="url(#sotuvGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="ishlab_chiqarish" stroke="#6366f1" fill="url(#prodGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ChartContainer>
            </Card>

            {/* Finance line chart */}
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-bold">{t('finance_indicators')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('finance_indicators_desc')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-lg bg-muted/60 p-0.5 text-xs font-medium">
                    {(["daily", "monthly", "yearly"] as FinPeriod[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFinPeriod(p)}
                        className={`rounded-md px-2.5 py-1 transition-colors ${
                          finPeriod === p
                            ? "bg-white text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p === "daily" ? "Kunlik" : p === "monthly" ? "Oylik" : "Yillik"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">{t('income')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground">{t('expense')}</span>
                  </div>
                </div>
              </div>
              <ChartContainer config={chartConfig2} className="aspect-[2/1] w-full">
                <LineChart data={financeChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval={Math.ceil(financeChartData.length / 6) - 1} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v: any) => `${v} mln so'm`} />} />
                  <Line type="monotone" dataKey="kirim" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="chiqim" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </Card>
          </div>

          {/* Bottom widgets row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary card */}
            <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/[0.02]">
              <h3 className="text-lg font-bold mb-4">{t('general_indicators')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('total_sales_label')}</span>
                  <span className="text-sm font-bold">{Math.round(totalSales / 1000000)} mln so'm</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('total_production_label')}</span>
                  <span className="text-sm font-bold">{Math.round(totalProd / 1000000)} mln so'm</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('month_profit_label')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{Math.round(profit / 1000000)} mln so'm</span>
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${
                      profitPercent >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {profitPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(profitPercent)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
