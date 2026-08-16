import { useState, useMemo } from "react";
import { MobileLayout, MobilePageHeader } from "./MobileLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import customFetch from "@/lib/custom-fetch";
import { Card } from "@/components/ui/card";
import { Package, Search, PackageSearch } from "lucide-react";

export default function MobileProducts() {
  const { t } = useLang();
  const authOpts = useAuthHeaders();
  const [search, setSearch] = useState("");

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => customFetch("/api/products").then(r => r.json()),
  });

  const { data: inventory } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: () => customFetch("/api/inventory", { headers: authOpts.headers }).then(r => r.json()),
  });

  const stockMap = useMemo(() => {
    const map = new Map<number, number>();
    if (Array.isArray(inventory)) {
      inventory.forEach((inv: any) => {
        map.set(inv.productId, (map.get(inv.productId) || 0) + inv.quantity);
      });
    }
    return map;
  }, [inventory]);

  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter((p: any) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <MobileLayout title={t("products")}>
      <MobilePageHeader
        title={t("products")}
        subtitle={`${products?.length || 0} ta ${t("products").toLowerCase()}`}
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("product_search")}
          className="w-full h-11 pl-10 pr-4 rounded-2xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      {/* Product List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm font-medium">{t("no_products")}</p>
          </div>
        ) : (
          filtered.map((product: any) => {
            const stock = stockMap.get(product.id) || 0;
            return (
              <Card key={product.id} className="p-4 border-0 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-amber-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{product.description || t("no_info")}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-amber-600">
                      {(product.price || 0).toLocaleString("uz-UZ")} so'm
                    </span>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      stock === 0 ? "bg-red-100 text-red-600" :
                      stock < 50 ? "bg-amber-100 text-amber-600" :
                      "bg-green-100 text-green-600"
                    }`}>
                      {stock} {t("pcs")}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
}
