import { useState, useMemo, useEffect } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useGetSales, useGetProducts } from "@workspace/api-client-react";
import { useAuthHeaders } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, FileDown } from "lucide-react";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { format } from "date-fns";
import { useLang } from "@/lib/i18n";

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

export default function Sales() {
  const authOpts = useAuthHeaders();
  
  const { data: apiRecords, isLoading } = useGetSales({ request: authOpts });
  const { data: products } = useGetProducts({ request: authOpts });
  const { t } = useLang();

  // Date filter
  const [dateFilter, setDateFilter] = useState<"all" | "day" | "month" | "year">("all");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));

  // All records — only from API (sotuv faqat buyurtma yetkazilganda)
  const allRecords = useMemo(() => {
    if (!Array.isArray(apiRecords)) return [];
    return apiRecords.map((r: any) => ({
      ...r,
      source: "order",
      totalSum: r.totalSum || 0,
    })).sort((a: any, b: any) => new Date(b.soldAt || b.createdAt).getTime() - new Date(a.soldAt || a.createdAt).getTime());
  }, [apiRecords]);

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
    ];
    exportToExcel(filteredRecords, cols, "sotuv");
  };

  return (
    <DashboardLayout>
      <PageHeader 
        title={t('sales_title')} 
        description="Sotuvlar faqat buyurtma yetkazilganda avtomatik qo'shiladi"
        action={
          <Button variant="outline" onClick={exportSales} className="rounded-xl px-4 h-12">
            <FileDown className="mr-2 h-5 w-5" /> Excel
          </Button>
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
              </tr>
            </thead>
            <tbody>
              {isLoading && paginatedRecords.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">{t('loading')}</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
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
    </DashboardLayout>
  );
}
