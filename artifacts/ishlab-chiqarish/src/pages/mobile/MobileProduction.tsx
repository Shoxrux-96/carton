import { useState } from "react";
import { MobileLayout, MobilePageHeader } from "./MobileLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import customFetch from "@/lib/custom-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Wrench, Loader2 } from "lucide-react";

export default function MobileProduction() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const today = new Date().toISOString().split("T")[0];

  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => customFetch("/api/products").then(r => r.json()),
  });

  const productList = Array.isArray(products) ? products : [];

  const handleSubmit = async () => {
    if (!productName || !quantity) return;
    setSubmitting(true);
    setSuccess(false);
    try {
      const product = productList.find((p: any) => p.name === productName);
      const now = new Date();
      const dateTime = `${date}T${now.toTimeString().slice(0, 5)}:00`;
      await customFetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify({
          productId: product?.id || 0,
          productName,
          quantity: parseInt(quantity) || 0,
          productionDate: new Date(dateTime).toISOString(),
        }),
      });
      setSuccess(true);
      setProductName("");
      setQuantity("");
      queryClient.invalidateQueries({ queryKey: ["/api/production"] });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileLayout title={t("production")}>
      <MobilePageHeader
        title={t("production_entry")}
        subtitle={t("production_subtitle")}
      />

      <Card className="p-4 border-0 shadow-md mb-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{t("product_name")}</label>
            <input
              list="product-list"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder={t("product_name_placeholder")}
              className="w-full h-11 px-4 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <datalist id="product-list">
              {productList.map((p: any) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{t("quantity")}</label>
            <Input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              className="h-11"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{t("date")}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !productName || !quantity}
            className="w-full h-12 rounded-2xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {t("submit")}
          </Button>
          {success && (
            <p className="text-center text-sm text-green-600 font-medium">✅ {t("success_added")}</p>
          )}
        </div>
      </Card>

      {/* Recent productions */}
      <MobileProductionRecent authOpts={authOpts} />
    </MobileLayout>
  );
}

function MobileProductionRecent({ authOpts }: { authOpts: any }) {
  const { t } = useLang();
  const { data: transactions } = useQuery({
    queryKey: ["/api/production/transactions"],
    queryFn: () => customFetch("/api/production/transactions", { headers: authOpts.headers }).then(r => r.json()),
  });

  const recent = Array.isArray(transactions) ? transactions.slice(-10).reverse() : [];

  if (recent.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-2">{t("recent_records")}</h3>
      <div className="space-y-2">
        {recent.map((tx: any, i: number) => (
          <Card key={tx.id || i} className="p-3 border-0 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Wrench className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.productName}</p>
              <p className="text-[11px] text-muted-foreground">
                {tx.quantity} {t("pcs")} — {tx.date ? new Date(tx.date).toLocaleDateString("uz-UZ") : "-"}
              </p>
            </div>
            <span className="text-sm font-bold text-amber-600">+{tx.quantity}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
