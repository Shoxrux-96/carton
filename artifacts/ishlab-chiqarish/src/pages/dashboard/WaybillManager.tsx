import { useState, useMemo } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  FileText, Plus, Printer, Filter, Download, Edit3, Eye,
  ArrowUpDown, Trash2,
} from "lucide-react";
import WaybillModal from "@/components/WaybillModal";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { format } from "date-fns";
import { useLang } from "@/lib/i18n";
import { getWaybillCategory } from "@/lib/waybill-category";

const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

const getCategory = getWaybillCategory;

interface WaybillRow {
  id: number;
  name: string;
  format: string;
  unit: string;
  quantity: string;
  price: string;
}

interface WaybillData {
  id: number;
  docNumber: number;
  date: string;
  senderCompany: string;
  senderPhone: string;
  receiverCompany: string;
  receiverPhone: string;
  vehicle: string;
  totalSum: string;
  items: WaybillRow[];
  createdAt: string;
}

export default function WaybillManager() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const { t } = useLang();
  const [isWaybillOpen, setIsWaybillOpen] = useState(false);
  const [viewingWaybillId, setViewingWaybillId] = useState<number | null>(null);
  const [printWaybillId, setPrintWaybillId] = useState<number | null>(null);
  const [editingWaybillId, setEditingWaybillId] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "Sotuv" | "Xarid">("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: waybills, refetch } = useQuery({
    queryKey: ["/api/waybills"],
    queryFn: () => customFetch("/api/waybills", { headers: authOpts.headers }).then(r => r.json()),
    refetchInterval: 5000, // mobil ilovadan saqlangan yuk xatlari tezda ko'rinsin
  });

  const { data: companyData } = useQuery({
    queryKey: ["/api/company"],
    queryFn: () => customFetch("/api/company", { headers: authOpts.headers }).then(r => r.json()),
  });
  const companies: any[] = Array.isArray(companyData?.companies) ? companyData.companies : [];

  const { data: productData } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => customFetch("/api/products", { headers: authOpts.headers }).then(r => r.json()),
  });
  const productNames: string[] = Array.isArray(productData)
    ? productData.map((p: any) => p?.name).filter(Boolean)
    : [];

  // Serverdan kelgan category ustuvor, aks holda lokal hisob (API bilan bir xil qoida)
  const catOf = (w: any): string =>
    w.category ||
    getCategory(
      w.senderCompany,
      w.receiverCompany,
      companies,
      Array.isArray(w.items) ? w.items.map((i: any) => i?.name).filter(Boolean) : [],
      productNames,
    );

  const waybillList = useMemo(() => {
    let list: WaybillData[] = Array.isArray(waybills) ? waybills : [];

    if (filterText) {
      const ft = filterText.toLowerCase();
      list = list.filter((w: any) =>
        String(w.docNumber).includes(ft) ||
        (w.senderCompany || "").toLowerCase().includes(ft) ||
        (w.receiverCompany || "").toLowerCase().includes(ft)
      );
    }
    if (filterCategory !== "all") {
      list = list.filter((w: any) => catOf(w) === filterCategory);
    }
    if (filterMonth !== null) {
      const monthStr = `${filterYear}-${String(filterMonth + 1).padStart(2, "0")}`;
      list = list.filter((w: any) => w.date && w.date.startsWith(monthStr));
    }

    return list;
  }, [waybills, filterMonth, filterYear, filterText, companies, productNames]);

  const totalSum = useMemo(() => {
    return waybillList.reduce((s: number, w: any) => s + (parseFloat(w.totalSum) || 0), 0);
  }, [waybillList]);

  const handleView = (id: number) => {
    setViewingWaybillId(id);
    setEditingWaybillId(null);
    setPrintWaybillId(null);
    setIsWaybillOpen(true);
  };

  const handleEdit = (id: number) => {
    setEditingWaybillId(id);
    setViewingWaybillId(null);
    setPrintWaybillId(null);
    setIsWaybillOpen(true);
  };

  const handlePrint = (id: number) => {
    setViewingWaybillId(id);
    setEditingWaybillId(null);
    setPrintWaybillId(id);
    setIsWaybillOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('waybill_confirm_delete'))) return;
    try {
      await customFetch(`/api/waybills/${id}`, { method: "DELETE", headers: authOpts.headers });
      queryClient.invalidateQueries({ queryKey: ["/api/waybills"] });
    } catch {}
  };

  const handleExportExcel = () => {
    const cols: ExcelColumn[] = [
      { header: "ID", key: "id", accessor: (r: any) => r.id },
      { header: t('waybill_doc_number'), key: "docNumber", accessor: (r: any) => r.docNumber },
      { header: t('waybill_date'), key: "date", accessor: (r: any) => r.date ? format(new Date(r.date), "dd.MM.yyyy") : "" },
      { header: t('waybill_sender'), key: "senderCompany", accessor: (r: any) => r.senderCompany || "" },
      { header: t('waybill_sender') + " tel", key: "senderPhone", accessor: (r: any) => r.senderPhone || "" },
      { header: t('waybill_receiver'), key: "receiverCompany", accessor: (r: any) => r.receiverCompany || "" },
      { header: t('waybill_receiver') + " tel", key: "receiverPhone", accessor: (r: any) => r.receiverPhone || "" },
      { header: t('waybill_category'), key: "category", accessor: (r: any) => catOf(r) },
      { header: t('waybill_total_sum') + " (сўм)", key: "totalSum", accessor: (r: any) => parseFloat(r.totalSum) || 0 },
      { header: t('waybill_items'), key: "itemCount", accessor: (r: any) => `${(r.items || []).length} ${t('waybill_doc_count')} / ${(r.items || []).reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0).toLocaleString("uz-UZ")} ${t('waybill_piece')}` },
    ];
    exportToExcel(waybillList, cols, "yuk_xatlari");
  };

  const handleNewWaybill = () => {
    setViewingWaybillId(null);
    setEditingWaybillId(null);
    setPrintWaybillId(null);
    setIsWaybillOpen(true);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t('waybill_title')}
        description={t('waybill_description')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel} className="rounded-xl px-4 h-12">
              <Download className="mr-2 h-5 w-5" /> Excel
            </Button>
            <Button onClick={handleNewWaybill} className="rounded-xl px-6 h-12 shadow-lg bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 h-5 w-5" /> {t('waybill_new')}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="overflow-hidden border-0 shadow-lg mb-6">
        <div className="flex items-center gap-3 p-4 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-xl gap-1"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? t('waybill_hide') : t('waybill_filter')}
          </Button>
          {showFilters && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('waybill_month')}</span>
                <select
                  value={filterMonth}
                  onChange={e => setFilterMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border-2 border-border text-sm bg-background"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('waybill_year')}</span>
                <Input
                  type="number"
                  value={filterYear}
                  onChange={e => setFilterYear(Number(e.target.value))}
                  className="w-28 h-10 text-sm"
                />
              </div>
               <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('waybill_search')}</span>
                <Input
                  placeholder={t('waybill_search_placeholder')}
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="w-56 h-10 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('waybill_type')}</span>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border-2 border-border text-sm bg-background"
                >
                  <option value="all">{t('waybill_all')}</option>
                  <option value="Sotuv">{t('waybill_sale_income')}</option>
                  <option value="Xarid">{t('waybill_purchase_expense')}</option>
                </select>
              </div>
              {(filterMonth !== null || filterText || filterCategory !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => { setFilterMonth(new Date().getMonth()); setFilterText(""); setFilterCategory("all"); }}
                  className="h-10 px-3 text-sm"
                >
                  {t('waybill_clear')}
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-sm font-medium text-blue-700">{t('waybill_total_docs')}</div>
          <div className="text-2xl font-bold text-blue-800">{waybillList.length}</div>
        </Card>
        <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-sm font-medium text-green-700">{t('waybill_sale_income')}</div>
          <div className="text-2xl font-bold text-green-800">
            {waybillList.filter((w: any) => catOf(w) === "Sotuv").length} {t('waybill_piece')}
          </div>
        </Card>
        <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
          <div className="text-sm font-medium text-red-700">{t('waybill_purchase_expense')}</div>
          <div className="text-2xl font-bold text-red-800">
            {waybillList.filter((w: any) => catOf(w) === "Xarid").length} {t('waybill_piece')}
          </div>
        </Card>
        <Card className="p-5 border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100">
          <div className="text-sm font-medium text-amber-700">{t('waybill_total_sum')}</div>
          <div className="text-2xl font-bold text-amber-800">{totalSum.toLocaleString("uz-UZ")} so'm</div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-center">{t('waybill_doc_number')}</th>
                <th className="px-4 py-3 font-semibold">{t('waybill_date')}</th>
                <th className="px-4 py-3 font-semibold">{t('waybill_sender')}</th>
                <th className="px-4 py-3 font-semibold">{t('waybill_receiver')}</th>
                <th className="px-4 py-3 font-semibold text-center">{t('waybill_category')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('waybill_total')}</th>
                <th className="px-4 py-3 font-semibold text-center">{t('waybill_items')}</th>
                <th className="px-4 py-3 font-semibold text-center"></th>
              </tr>
            </thead>
            <tbody>
              {waybillList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                    <p className="text-lg font-medium">{t('waybill_no_waybills')}</p>
                    <p className="text-sm text-muted-foreground">{t('waybill_no_data_hint')}</p>
                  </td>
                </tr>
              ) : (
                waybillList.map((w: WaybillData, i: number) => (
                  <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-center font-bold text-amber-600">#{w.docNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {w.date ? format(new Date(w.date), "dd.MM.yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{w.senderCompany || "—"}</div>
                      <div className="text-xs text-muted-foreground">{w.senderPhone || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{w.receiverCompany || "—"}</div>
                      <div className="text-xs text-muted-foreground">{w.receiverPhone || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        catOf(w) === "Sotuv"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {catOf(w)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {(parseFloat(w.totalSum) || 0).toLocaleString("uz-UZ")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm font-semibold">{(w.items || []).length} {t('waybill_doc_count')}</div>
                      <div className="text-xs text-muted-foreground">
                        {(w.items || []).reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0).toLocaleString("uz-UZ")} {t('waybill_piece')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => handleView(w.id)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('waybill_action_view')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(w.id)}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                          title={t('waybill_action_edit')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(w.id)}
                          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          title={t('waybill_action_print')}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('waybill_action_delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <WaybillModal
        open={isWaybillOpen}
        onClose={() => {
          setIsWaybillOpen(false);
          setViewingWaybillId(null);
          setEditingWaybillId(null);
          setPrintWaybillId(null);
        }}
        onView={viewingWaybillId}
        onEdit={editingWaybillId}
        headers={authOpts.headers}
        printOnOpen={!!printWaybillId}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/waybills"] });
        }}
      />
    </DashboardLayout>
  );
}
