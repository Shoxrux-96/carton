import { useState, useMemo, useRef } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout/DashboardLayout";
import { useAuthHeaders } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import customFetch from "@/lib/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, PackageSearch, Pencil, Package, Upload, X, Eye, EyeOff, Building2, Layers } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { toast } from "sonner";
import BoxTemplate from "@/components/BoxTemplate";

export const PRODUCTS_MATERIALS = [
  "Kraxmal", "Koustik Soda", "Qog'oz B2", "Qog'oz B3",
  "Qog'oz K0", "Qog'oz K1", "Oq qog'oz", "Bo'yoq",
];

export const MATERIALS = [
  ...PRODUCTS_MATERIALS,
  "Qo'lqop", "Machalka", "Elektr", "Gaz", "Oziq ovqat", "Boshqa",
];

const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => n.toFixed(d);

const defaultForm = {
  companyName: "Shovot Carton",
  boxName: "RSC quti",
  boxL: "",
  boxW: "",
  boxH: "",
  layer1Weight: "0.12",
  layer2Weight: "0.12",
  layer3Weight: "0.12",
  priceLayer1: "",
  priceLayer2: "",
  priceLayer3: "",
  quantity: "1000",
  coefficient: "1.5",
  image: "",
  color: "",
  status: "hidden" as "published" | "hidden",
};

export default function Products() {
  const queryClient = useQueryClient();
  const authOpts = useAuthHeaders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { t } = useLang();

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => customFetch("/api/products").then(r => r.json()),
  });

  const { data: inventory } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: () => customFetch("/api/inventory", { headers: authOpts.headers }).then(r => r.json()),
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const n = (s: string) => parseFloat(s) || 0;

  const stockMap = new Map<number, number>();
  if (Array.isArray(inventory)) {
    inventory.forEach((inv: any) => {
      stockMap.set(inv.productId, (stockMap.get(inv.productId) || 0) + inv.quantity);
    });
  }

  const calc = useMemo(() => {
    const L = n(form.boxL), W = n(form.boxW), H = n(form.boxH);
    const w1 = n(form.layer1Weight), w2 = n(form.layer2Weight), w3 = n(form.layer3Weight);
    const p1 = n(form.priceLayer1), p2 = n(form.priceLayer2), p3 = n(form.priceLayer3);
    const k = n(form.coefficient);

    if (L <= 0 || W <= 0 || H <= 0) return null;

    const blankLen = 2 * (W + L) + 6;
    const flapH = L / 2;
    const blankW = 1 + flapH + H + flapH + 1;
    const netAreaM2 = (blankLen * blankW) / 10000;

    const l1Weight = netAreaM2 * w1;
    const l1Cost = l1Weight * p1;
    const l2Weight = netAreaM2 * w2 / 0.7;
    const l2Cost = l2Weight * p2;
    const l3Weight = netAreaM2 * w3;
    const l3Cost = l3Weight * p3;

    const totalPaperCost = l1Cost + l2Cost + l3Cost;
    const sellingPrice = Math.round(totalPaperCost * k);

    return {
      blankLen: +fmtD(blankLen, 1), blankW: +fmtD(blankW, 1),
      netAreaM2: +fmtD(netAreaM2, 4),
      l1: { weight: +fmtD(l1Weight, 4), price: p1, cost: Math.round(l1Cost) },
      l2: { weight: +fmtD(l2Weight, 4), price: p2, cost: Math.round(l2Cost) },
      l3: { weight: +fmtD(l3Weight, 4), price: p3, cost: Math.round(l3Cost) },
      totalPaperCost: Math.round(totalPaperCost),
      sellingPrice,
      coefficient: k,
    };
  }, [form.boxL, form.boxW, form.boxH, form.layer1Weight, form.layer2Weight, form.layer3Weight, form.priceLayer1, form.priceLayer2, form.priceLayer3, form.coefficient]);

  const hasBox = n(form.boxL) > 0 && n(form.boxW) > 0 && n(form.boxH) > 0;

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      setImagePreview(base64);
      set("image", base64);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    set("image", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setImagePreview(product.image || null);
    const mats = Array.isArray(product.materials) ? product.materials : [];
    setForm({
      companyName: product.description?.split("—")[0]?.trim() || "Shovot Carton",
      boxName: product.name || "RSC quti",
      boxL: product.length?.toString() || "",
      boxW: product.width?.toString() || "",
      boxH: product.height?.toString() || "",
      layer1Weight: "0.12",
      layer2Weight: "0.12",
      layer3Weight: "0.12",
      priceLayer1: "",
      priceLayer2: "",
      priceLayer3: "",
      quantity: "1000",
      coefficient: "1.5",
      image: product.image || "",
      color: product.color || "",
      status: product.status === "published" || product.isPublished ? "published" : "hidden",
    });
    setIsAddOpen(true);
  };

  const openAdd = () => {
    setEditingProduct(null);
    setImagePreview(null);
    setForm(defaultForm);
    setIsAddOpen(true);
  };

  const onSubmit = async () => {
    const isEditing = !!editingProduct;
    setIsLoadingSubmit(true);
    try {
      const body = {
        name: form.boxName || "Nomsiz quti",
        description: `${form.companyName} — ${form.boxName} (${n(form.boxW)}×${n(form.boxH)}×${n(form.boxL)} sm)`,
        price: calc?.sellingPrice || 0,
        length: n(form.boxL),
        width: n(form.boxW),
        height: n(form.boxH),
        material: [
          form.layer1Weight && `1-qatlam: ${form.layer1Weight}kg/m²`,
          form.layer2Weight && `2-qatlam: ${form.layer2Weight}kg/m²`,
          form.layer3Weight && `3-qatlam: ${form.layer3Weight}kg/m²`,
        ].filter(Boolean).join(", "),
        materials: [
          form.layer1Weight && `1-qatlam: ${form.layer1Weight}kg/m² × ${fmt(n(form.priceLayer1))}`,
          form.layer2Weight && `2-qatlam: ${form.layer2Weight}kg/m² × ${fmt(n(form.priceLayer2))}`,
          form.layer3Weight && `3-qatlam: ${form.layer3Weight}kg/m² × ${fmt(n(form.priceLayer3))}`,
        ].filter(Boolean),
        color: form.color || undefined,
        image: form.image || undefined,
        category: "Quti",
        status: form.status,
      };
      if (editingProduct) {
        await customFetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(body),
        });
      } else {
        await customFetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authOpts.headers },
          body: JSON.stringify(body),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddOpen(false);
      setEditingProduct(null);
      setForm(defaultForm);
      setImagePreview(null);
      toast.success(isEditing ? "Mahsulot yangilandi!" : "Mahsulot saqlandi!");
    } catch (e: any) {
      toast.error(e.message || "Xatolik yuz berdi");
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('confirm_delete_product'))) {
      await customFetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: authOpts.headers,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast.success("Mahsulot o'chirildi!");
    }
  };

  const togglePublish = async (product: any) => {
    const next = product.status === "published" || product.isPublished ? "hidden" : "published";
    await customFetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authOpts.headers },
      body: JSON.stringify({ status: next }),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const totalStock = Array.from(stockMap.values()).reduce((a, b) => a + b, 0);

  const sm = (label: string, key: string, ph: string, unit: string) => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground w-20 shrink-0 text-right">{label}</span>
      <div className="relative flex-1">
        <Input type="number" value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={ph}
          className="h-8 text-xs px-2 pr-8 bg-background/50 border-border/50" />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title={t('products_title')}
        description={`${products?.length || 0} ${t('products_in_stock').replace('{count}', totalStock.toLocaleString())}`}
        action={
          <Button onClick={openAdd} className="rounded-xl px-6 h-12 shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
            <Plus className="mr-2 h-5 w-5" /> Yangi mahsulot
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`product-skeleton-${i}`} className="h-48 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : !Array.isArray(products) || products.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <PackageSearch className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-xl font-medium text-foreground">{t('no_products_title')}</p>
            <p className="text-muted-foreground mt-2">{t('no_products_desc')}</p>
          </div>
        ) : (
          products.map((product: any) => {
            const stock = stockMap.get(product.id) || 0;
            const stockColor = stock === 0 ? "text-red-500" : stock < 50 ? "text-amber-500" : "text-green-500";
            const mats = Array.isArray(product.materials) ? product.materials : [];
            let calcData: any = null;
            try { calcData = product.material ? JSON.parse(product.material) : null; } catch {}
            return (
              <div
                key={product.id}
                className="group bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:border-amber-200/50 transition-all duration-300 overflow-hidden"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-amber-300/40" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {(product.status === "published" || product.isPublished) ? (
                      <span className="px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs font-medium shadow-lg flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {t('published')}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-gray-500 text-white text-xs font-medium shadow-lg flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> {t('hidden')}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => togglePublish(product)} className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-lg flex items-center justify-center hover:bg-white transition-colors" title={product.isPublished ? "Yashirish" : "Publishend qilish"}>
                      {product.isPublished ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-green-600" />}
                    </button>
                    <button onClick={() => openEdit(product)} className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-primary hover:bg-white transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-destructive hover:bg-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-foreground mb-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                    {product.description || t('no_info')}
                  </p>

                  {/* Kalkulyatsiya ma'lumotlari */}
                  {calcData && (
                    <div className="mb-3 space-y-2">
                      {/* Quti uchun */}
                      {calcData.blankLen && (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-xs font-medium">Kesma: {calcData.blankLen}×{calcData.blankW} sm</span>
                            <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-xs font-medium">Sof: {calcData.netAreaM2} m²</span>
                          </div>
                          <div className="space-y-1">
                            {calcData.l1 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span className="text-muted-foreground">1-qatlam:</span>
                                <span className="font-medium">{calcData.l1.weight} kg</span>
                                <span className="text-muted-foreground">× {fmt(calcData.l1.price)}</span>
                                <span className="font-bold ml-auto">{fmt(calcData.l1.cost)} so'm</span>
                              </div>
                            )}
                            {calcData.l2 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                <span className="text-muted-foreground">2-qatlam:</span>
                                <span className="font-medium">{calcData.l2.weight} kg</span>
                                <span className="text-muted-foreground">× {fmt(calcData.l2.price)}</span>
                                <span className="font-bold ml-auto">{fmt(calcData.l2.cost)} so'm</span>
                              </div>
                            )}
                            {calcData.l3 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                <span className="text-muted-foreground">3-qatlam:</span>
                                <span className="font-medium">{calcData.l3.weight} kg</span>
                                <span className="text-muted-foreground">× {fmt(calcData.l3.price)}</span>
                                <span className="font-bold ml-auto">{fmt(calcData.l3.cost)} so'm</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs bg-blue-50 dark:bg-blue-950/30 rounded-lg px-2 py-1.5">
                            <span className="text-blue-700 font-medium">Ishlab chiqarish</span>
                            <span className="font-bold text-blue-600">{fmt(calcData.totalPaperCost)} so'm</span>
                          </div>
                        </>
                      )}

                      {/* Gofra qog'oz uchun */}
                      {calcData.areaM2 && !calcData.blankLen && (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">Gofra qog'oz: {calcData.paperW}×{calcData.paperL} sm</span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">Maydon: {calcData.areaM2} m²</span>
                          </div>
                          {calcData.layers && (
                            <div className="space-y-1">
                              {calcData.layers.map((layer: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                  <span className="text-muted-foreground">{layer.name}:</span>
                                  <span className="font-medium">{layer.weight} kg/m²</span>
                                  <span className="text-muted-foreground">× {fmt(layer.price)}</span>
                                  <span className="font-bold ml-auto">{fmt(calcData.layers[i]?.weight && calcData.areaM2 ? layer.weight * calcData.areaM2 * layer.price : 0)} so'm</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs bg-blue-50 dark:bg-blue-950/30 rounded-lg px-2 py-1.5">
                            <span className="text-blue-700 font-medium">Ishlab chiqarish</span>
                            <span className="font-bold text-blue-600">{fmt(calcData.totalCostPerUnit)} so'm</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {mats.length > 0 && !calcData && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {mats.map((m: string) => (
                        <span key={m} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">{m}</span>
                      ))}
                    </div>
                  )}

                  {(product.length || product.width || product.height) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {product.length && <DimensionBadge label="Uzunlik" value={`${product.length} sm`} />}
                      {product.width && <DimensionBadge label="Kenglik" value={`${product.width} sm`} />}
                      {product.height && <DimensionBadge label="Balandlik" value={`${product.height} sm`} />}
                      {product.color && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                          <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: product.color }} />
                          {product.color}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Sotish narxi</p>
                      <p className="font-bold text-lg text-emerald-600">{formatCurrency(product.price)}</p>
                      {calcData?.coefficient && <p className="text-[10px] text-muted-foreground">× {calcData.coefficient} koeffitsient</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">{t('in_stock')}</p>
                      <p className={`font-bold text-lg ${stockColor}`}>{stock} ta</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title={editingProduct ? t('edit_product') : "Yangi mahsulot"}>
        <div className="space-y-3 pt-2 max-h-[80vh] overflow-y-auto pr-1">
          {/* Korxona & quti nomi */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Korxona & quti nomi
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-20 shrink-0 text-right">Korxona</span>
                <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Shovot Carton" className="h-9 text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-20 shrink-0 text-right">Quti nomi</span>
                <Input value={form.boxName} onChange={e => set("boxName", e.target.value)} placeholder="RSC quti" className="h-9 text-xs" />
              </div>
            </div>
          </div>

          {/* Quti o'lchamlari */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">📦 Quti (sm)</p>
            <div className="space-y-1.5">
              {sm("Bo'yi", "boxL", "30", "sm")}
              {sm("Eni", "boxW", "20", "sm")}
              {sm("Balandligi", "boxH", "15", "sm")}
            </div>
          </div>

          {/* Eskiz */}
          {hasBox && (
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Eskiz
              </p>
              <div className="bg-white rounded-lg border border-border/50 p-2 flex justify-center">
                <BoxTemplate boxLength={n(form.boxL)} boxWidth={n(form.boxW)} boxHeight={n(form.boxH)} />
              </div>
            </div>
          )}

          {/* Qatlam og'irligi + narx */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">💰 Har bir qatlam uchun</p>
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-blue-600">1-qatlam (Tashqi)</p>
              {sm("Og'irlik", "layer1Weight", "0.12", "kg/m²")}
              {sm("Narx", "priceLayer1", "", "so'm/kg")}
              <p className="text-[9px] font-bold text-amber-600 mt-1">2-qatlam (Gofra)</p>
              {sm("Og'irlik", "layer2Weight", "0.12", "kg/m²")}
              {sm("Narx", "priceLayer2", "", "so'm/kg")}
              <p className="text-[9px] font-bold text-green-600 mt-1">3-qatlam (Ichki)</p>
              {sm("Og'irlik", "layer3Weight", "0.12", "kg/m²")}
              {sm("Narx", "priceLayer3", "", "so'm/kg")}
            </div>
          </div>

          {/* Miqdor + koeffitsient */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">📊 Miqdor & narx</p>
            <div className="space-y-1.5">
              {sm("Miqdor", "quantity", "1000", "dona")}
              {sm("Koeffitsient", "coefficient", "1.5", "×")}
            </div>
            {calc && (
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3">
                <div className="flex-1 text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="text-[9px] font-bold text-blue-700 uppercase">Ishlab chiqarish</div>
                  <div className="text-lg font-extrabold text-blue-600">{fmt(calc.totalPaperCost)}</div>
                  <div className="text-[9px] text-blue-500">so'm / dona</div>
                </div>
                <div className="flex-1 text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border-2 border-emerald-400">
                  <div className="text-[9px] font-bold text-emerald-700 uppercase">Sotish narxi</div>
                  <div className="text-lg font-extrabold text-emerald-600">{fmt(calc.sellingPrice)}</div>
                  <div className="text-[9px] text-emerald-500">so'm / dona × {calc.coefficient}</div>
                </div>
              </div>
            )}
          </div>

          {/* Rasm */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">🖼 Rasm</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {imagePreview ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-muted">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                <button type="button" onClick={clearImage}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 bg-muted/30 hover:bg-muted/50">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">{t('upload_image')}</span>
              </button>
            )}
          </div>

          {/* Rang */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">🎨 Rang</p>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color || "#000000"} onChange={e => set("color", e.target.value)}
                className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer" />
              <Input value={form.color} onChange={e => set("color", e.target.value)} placeholder="#000000" className="h-9 text-xs flex-1" />
              {form.color && <div className="w-10 h-10 rounded-lg border-2 border-border" style={{ backgroundColor: form.color }} />}
            </div>
          </div>

          {/* Publish */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">{t('status')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => set("status", "published")}
                className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${form.status === "published" ? "bg-green-100 text-green-700 border-green-300" : "bg-muted/30 text-muted-foreground border-border hover:border-green-300"}`}>
                {t('published')}
              </button>
              <button type="button" onClick={() => set("status", "hidden")}
                className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${form.status === "hidden" ? "bg-gray-200 text-gray-700 border-gray-400" : "bg-muted/30 text-muted-foreground border-border hover:border-gray-400"}`}>
                {t('hidden')}
              </button>
            </div>
          </div>

          {/* Tugmalar */}
          <div className="pt-3 flex justify-end gap-3 border-t border-border">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="h-10 px-6 rounded-xl">{t('cancel')}</Button>
            <Button onClick={onSubmit} disabled={isLoadingSubmit || !form.boxName}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
              {isLoadingSubmit ? "Saqlanmoqda..." : editingProduct ? t('save') : "Saqlash"}
            </Button>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}

function DimensionBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
      {label}: {value}
    </div>
  );
}
