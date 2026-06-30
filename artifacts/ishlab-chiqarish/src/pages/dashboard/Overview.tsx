import { useMemo } from "react";
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
  Package, TrendingUp, Wrench, AlertTriangle, Users, Building2,
  ShoppingCart, TrendingDown, Landmark, Layers, ArrowUpRight, ArrowDownRight,
  Clock, ArrowRight, DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

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

  const { data: ordersData } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: () => customFetch("/api/orders", { headers: authOpts.headers }).then(r => r.json()),
    enabled: !isLoading,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: () => customFetch("/api/inventory", { headers: authOpts.headers }).then(r => r.json()),
    enabled: !isLoading,
  });

  const statCards = [
    { title: t('total_products'), value: stats?.totalProducts, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-500/20 to-blue-500/5" },
    { title: t('inventory_types'), value: stats?.totalInventoryItems, icon: Layers, color: "text-indigo-500", bg: "bg-indigo-500/10", gradient: "from-indigo-500/20 to-indigo-500/5" },
    { title: t('today_production'), value: stats?.totalProductionToday, icon: Wrench, color: "text-teal-500", bg: "bg-teal-500/10", gradient: "from-teal-500/20 to-teal-500/5" },
    { title: t('today_sales'), value: stats?.totalSalesToday, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", gradient: "from-emerald-500/20 to-emerald-500/5" },
    { title: t('low_stock'), value: stats?.lowStockItems, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", gradient: "from-amber-500/20 to-amber-500/5" },
    { title: t('leads'), value: stats?.totalLeads, icon: Users, color: "text-rose-500", bg: "bg-rose-500/10", gradient: "from-rose-500/20 to-rose-500/5" },
    { title: t('clients'), value: stats?.totalCustomers, icon: Building2, color: "text-cyan-500", bg: "bg-cyan-500/10", gradient: "from-cyan-500/20 to-cyan-500/5" },
    { title: t('active_orders_stat'), value: stats?.activeOrders, icon: ShoppingCart, color: "text-orange-500", bg: "bg-orange-500/10", gradient: "from-orange-500/20 to-orange-500/5" },
    { title: t('month_income'), icon: DollarSign, value: stats?.monthlyIncome ? (stats.monthlyIncome / 1000000).toFixed(1) + " mln" : "0", color: "text-green-500", bg: "bg-green-500/10", gradient: "from-green-500/20 to-green-500/5" },
    { title: t('month_expense'), icon: TrendingDown, value: stats?.monthlyExpense ? (stats.monthlyExpense / 1000000).toFixed(1) + " mln" : "0", color: "text-red-500", bg: "bg-red-500/10", gradient: "from-red-500/20 to-red-500/5" },
    { title: t('month_profit'), icon: Landmark, value: stats?.monthlyProfit ? (stats.monthlyProfit / 1000000).toFixed(1) + " mln" : "0", color: "text-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-500/20 to-blue-500/5" },
  ];

  const lowStockItems = useMemo(() => {
    if (!Array.isArray(inventoryData)) return [];
    return inventoryData
      .filter((i: any) => i.quantity <= 5)
      .slice(0, 5)
      .sort((a: any, b: any) => a.quantity - b.quantity);
  }, [inventoryData]);

  const recentOrders = useMemo(() => {
    if (!Array.isArray(ordersData)) return [];
    return [...ordersData]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [ordersData]);

  const saleChartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });
    const sales = Array.isArray(salesData) ? salesData : [];
    const production = Array.isArray(productionTx) ? productionTx : [];

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const daySales = sales
        .filter((s: any) => s.soldAt?.startsWith(dayStr))
        .reduce((sum: number, s: any) => sum + (s.totalSum || 0), 0);
      const dayProd = production
        .filter((p: any) => p.date?.startsWith(dayStr))
        .reduce((sum: number, p: any) => sum + (p.totalSum || 0), 0);
      return {
        date: format(day, "dd.MM"),
        sotuv: Math.round(daySales / 1000),
        ishlab_chiqarish: Math.round(dayProd / 1000),
      };
    });
  }, [salesData, productionTx]);

  const financeChartData = useMemo(() => {
    const months = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
    const tx = Array.isArray(financeData) ? financeData : [];
    const monthlyData = months.map((name, idx) => {
      const monthTx = tx.filter((t: any) => {
        const d = new Date(t.date);
        return d.getMonth() === idx;
      });
      return {
        name,
        kirim: monthTx
          .filter((t: any) => t.type === "income")
          .reduce((s: number, t: any) => s + (t.amount || 0), 0),
        chiqim: monthTx
          .filter((t: any) => t.type === "expense")
          .reduce((s: number, t: any) => s + (t.amount || 0), 0),
      };
    });
    return monthlyData;
  }, [financeData]);

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
              <Skeleton key={i} className="h-32 rounded-2xl" />
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

            {/* Finance bar chart */}
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold">{t('finance_indicators')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('finance_indicators_desc')}</p>
                </div>
                <div className="flex items-center gap-3">
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
                <BarChart data={financeChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="kirim" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="chiqim" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
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
                  <span className="text-sm font-bold">{(totalSales / 1000000).toFixed(1)} mln so'm</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('total_production_label')}</span>
                  <span className="text-sm font-bold">{(totalProd / 1000000).toFixed(1)} mln so'm</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('month_profit_label')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{(profit / 1000000).toFixed(1)} mln so'm</span>
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${
                      profitPercent >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {profitPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(profitPercent)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{t('active_orders_stat')}</span>
                  <Badge variant="secondary" className="text-xs">
                    {stats?.activeOrders || 0} ta
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Low stock alerts */}
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t('low_stock_products')}</h3>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              {lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Package className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">{t('all_products_sufficient')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.map((item: any) => (
                    <div
                      key={item.productId || item.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} {t('items_left')}</p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.quantity === 0
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {item.quantity === 0 ? t('out_of_stock') : `${item.quantity} ta`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent orders */}
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t('recent_orders')}</h3>
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              </div>
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">{t('no_orders_text')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{order.orderCode || order.id}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {order.orderType === "purchase" ? t('purchase_type') : t('delivery_type')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {order.createdAt ? format(new Date(order.createdAt), "dd.MM HH:mm") : "—"}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
