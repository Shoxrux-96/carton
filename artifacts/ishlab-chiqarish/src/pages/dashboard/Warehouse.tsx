import { useState, useMemo, useRef, useEffect } from "react";
import { useGetInventory } from "@workspace/api-client-react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Package, Search, X, FileDown } from "lucide-react";
import { exportToExcel, type ExcelColumn } from "@/lib/export-to-excel";
import { useLang } from "@/lib/i18n";

const formatCurrency = (n: number) =>
  n.toLocaleString("uz-UZ") + " so'm";

export default function WarehousePage() {
  const authOpts = useAuthHeaders();
  const { t } = useLang();
  const { data: items, isLoading } = useGetInventory({ request: authOpts });

  const [nameFilter, setNameFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allProductNames = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return [...new Set(items.map(i => i.productName))].sort();
  }, [items]);

  const suggestions = useMemo(() => {
    if (!nameFilter || selectedProduct) return [];
    return allProductNames.filter(n =>
      n.toLowerCase().includes(nameFilter.toLowerCase())
    );
  }, [allProductNames, nameFilter, selectedProduct]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectProduct = (name: string) => {
    setSelectedProduct(name);
    setNameFilter(name);
    setShowDropdown(false);
  };

  const clearFilter = () => {
    setSelectedProduct(null);
    setNameFilter("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const filtered = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
      if (selectedProduct && item.productName !== selectedProduct) return false;
      if (priceFilter) {
        const p = parseFloat(priceFilter);
        if (isNaN(p)) return true;
        if (item.price !== p) return false;
      }
      return true;
    });
  }, [items, selectedProduct, priceFilter]);

  const totalQuantity = filtered.reduce((sum, i) => sum + i.quantity, 0);
  const totalSum = filtered.reduce((sum, i) => sum + i.quantity * i.price, 0);

  return (
    <DashboardLayout>
      <PageHeader
        title={t('warehouse_title')}
        description={t('warehouse_description')}
        action={
          <Button variant="outline" onClick={() => {
            const cols: ExcelColumn[] = [
              { header: "Mahsulot", key: "productName" },
              { header: "Narxi", key: "price", accessor: (r: any) => r.price || 0 },
              { header: "Miqdor", key: "quantity", accessor: (r: any) => r.quantity || 0 },
              { header: "Summa", key: "total", accessor: (r: any) => (r.quantity || 0) * (r.price || 0) },
            ];
            exportToExcel(filtered, cols, "ombor");
          }} className="rounded-xl px-4 h-12">
            <FileDown className="mr-2 h-5 w-5" /> Excel
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{t('product_types')}</p>
              <p className="text-3xl font-bold">{Array.isArray(items) ? items.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{t('total_items')}</p>
              <p className="text-3xl font-bold">{totalQuantity.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{t('total_amount')}</p>
              <p className="text-3xl font-bold">{formatCurrency(totalSum)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/60 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t('select_product_name')}
              value={nameFilter}
              onChange={e => { setNameFilter(e.target.value); setSelectedProduct(null); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full h-10 pl-9 pr-8 rounded-lg border-2 border-border bg-background text-sm focus-visible:outline-none focus-visible:border-primary transition-colors"
            />
            {selectedProduct && (
              <button onClick={clearFilter} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            )}
            {showDropdown && suggestions.length > 0 && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-card border-2 border-border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                {suggestions.map(name => (
                  <button
                    key={name}
                    onClick={() => selectProduct(name)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative min-w-[160px]">
            <input
              type="number"
              placeholder={t('filter_by_price')}
              value={priceFilter}
              onChange={e => setPriceFilter(e.target.value)}
              className="w-full h-10 pl-4 pr-4 rounded-lg border-2 border-border bg-background text-sm focus-visible:outline-none focus-visible:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-6 py-4 text-left font-semibold">{t('product')}</th>
                <th className="px-6 py-4 text-right font-semibold">{t('product_price')}</th>
                <th className="px-6 py-4 text-right font-semibold">{t('quantity')}</th>
                <th className="px-6 py-4 text-right font-semibold">{t('sum_label')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-muted-foreground">{t('loading')}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="w-8 h-8" />
                      <p>{t('warehouse_empty')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={`${item.productId}-${idx}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{item.productName}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">{item.quantity} ta</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-success">{formatCurrency(item.quantity * item.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
