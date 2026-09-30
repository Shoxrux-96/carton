import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, Layers, Printer, Save } from "lucide-react";
import GofraPaperSketch from "@/components/GofraPaperSketch";
import { useAuthHeaders } from "@/hooks/use-auth";
import customFetch from "@/lib/custom-fetch";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => n.toFixed(d);

interface Layer {
  name: string;
  weight: string;
  price: string;
  color: string;
}

const defaultLayers: Layer[] = [
  { name: "Tashqi qatlam", weight: "0.15", price: "", color: "#3b82f6" },
  { name: "Gofra", weight: "0.12", price: "", color: "#ea580c" },
  { name: "Ichki qatlam", weight: "0.15", price: "", color: "#10b981" },
];

export default function GofraPaperCalc() {
  const { t } = useLang();
  const [paperW, setPaperW] = useState("");
  const [paperL, setPaperL] = useState("");
  const [layers, setLayers] = useState<Layer[]>(defaultLayers);
  const [quantity, setQuantity] = useState("1000");
  const [coefficient, setCoefficient] = useState("1.5");

  const n = (s: string) => parseFloat(s) || 0;
  const [saving, setSaving] = useState(false);
  const authOpts = useAuthHeaders();

  const updateLayer = (idx: number, field: "weight" | "price", val: string) => {
    setLayers(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  const addLayer = () => {
    setLayers(prev => [...prev, {
      name: `${prev.length + 1}-qatlam`,
      weight: "0.12",
      price: "",
      color: `hsl(${prev.length * 60}, 60%, 50%)`,
    }]);
  };

  const removeLayer = (idx: number) => {
    if (layers.length <= 2) return;
    setLayers(prev => prev.filter((_, i) => i !== idx));
  };

  const calc = useMemo(() => {
    const W = n(paperW), L = n(paperL);
    const q = n(quantity);
    const k = n(coefficient);

    if (W <= 0 || L <= 0 || q <= 0) return null;

    const areaM2 = (W * L) / 10000;
    const areaM2Total = areaM2 * q;

    const layerResults = layers.map(layer => {
      const w = n(layer.weight);
      const p = n(layer.price);
      const weightPerUnit = areaM2 * w;
      const costPerUnit = weightPerUnit * p;
      return {
        name: layer.name,
        weightPerUnit: +fmtD(weightPerUnit, 4),
        costPerUnit: Math.round(costPerUnit),
        totalWeight: +fmtD(weightPerUnit * q, 4),
        totalCost: Math.round(costPerUnit * q),
        price: p,
        color: layer.color,
      };
    });

    const totalWeightPerUnit = layerResults.reduce((s, l) => s + l.weightPerUnit, 0);
    const totalCostPerUnit = layerResults.reduce((s, l) => s + l.costPerUnit, 0);
    const totalWeight = layerResults.reduce((s, l) => s + l.totalWeight, 0);
    const totalCost = layerResults.reduce((s, l) => s + l.totalCost, 0);

    const sellingPrice = Math.round(totalCostPerUnit * k);

    return {
      areaM2: +fmtD(areaM2, 4),
      areaM2Total: +fmtD(areaM2Total, 4),
      layers: layerResults,
      totalWeightPerUnit: +fmtD(totalWeightPerUnit, 4),
      totalCostPerUnit,
      totalWeight: +fmtD(totalWeight, 4),
      totalCost,
      sellingPrice,
      sellingTotal: Math.round(sellingPrice * q),
      coefficient: k,
    };
  }, [paperW, paperL, layers, quantity, coefficient]);

  const handleSaveAsProduct = async () => {
    if (!calc) return;
    setSaving(true);
    try {
      const calcData = {
        paperW: n(paperW), paperL: n(paperL),
        layers: layers.map(l => ({ name: l.name, weight: n(l.weight), price: n(l.price) })),
        quantity: n(quantity), coefficient: n(coefficient),
        areaM2: calc.areaM2,
        totalWeightPerUnit: calc.totalWeightPerUnit, totalCostPerUnit: calc.totalCostPerUnit,
        sellingPrice: calc.sellingPrice,
      };
      const body = {
        name: "Gofra qog'oz",
        description: `Gofra qog'oz (${n(paperW)}×${n(paperL)} sm) — ${layers.length} qatlam`,
        price: calc.sellingPrice,
        length: n(paperL),
        width: n(paperW),
        height: 0,
        material: JSON.stringify(calcData),
        materials: layers.map((l, i) => `${i + 1}-qatlam (${l.name}): ${l.weight}kg/m² × ${fmt(n(l.price))}`),
        category: "Gofra qog'oz",
        isPublished: false,
      };
      const res = await customFetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authOpts.headers },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t('calc_save_error'));
      toast.success(t('calc_saved') + " → " + t('calc_publish_hint'));
    } catch (e: any) {
      toast.error(e.message || t('calc_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const hasDimensions = n(paperW) > 0 && n(paperL) > 0;

  const sm = (label: string, val: string, set: (v: string) => void, ph: string, unit: string) => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground w-20 shrink-0 text-right">{label}</span>
      <div className="relative flex-1">
        <Input type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph}
          className="h-8 text-xs px-2 pr-12 bg-background/50 border-border/50" />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden border-0 shadow-lg border-primary/20">
      <div className="p-3 border-b border-border/50 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">{t('calc_gofra_header')}</h3>
        </div>
        {hasDimensions && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="default" onClick={handleSaveAsProduct} disabled={saving || !calc} className="h-7 text-xs gap-1">
              <Save className="w-3 h-3" /> {saving ? t('calc_save_saving') : t('calc_save_as_product')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="h-7 text-xs gap-1">
              <Printer className="w-3 h-3" /> {t('calc_print')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Chap — inputlar */}
        <div className="lg:w-96 p-3 space-y-2 border-r border-border/50">
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">{t('calc_gofra_dimensions')}</p>
            <div className="space-y-1">
              {sm(t('calc_width') + " (W)", paperW, setPaperW, "100", "sm")}
              {sm(t('calc_length') + " (L)", paperL, setPaperL, "120", "sm")}
            </div>
            {hasDimensions && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{t('calc_area_per_unit')}</span>
                  <span className="font-bold">{fmt(calc?.areaM2 || 0)} m²</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-muted/30 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-bold text-muted-foreground uppercase">{t('calc_layer_params')}</p>
              <Button size="sm" variant="ghost" onClick={addLayer} className="h-5 text-[10px] px-2">
                {t('calc_add_layer')}
              </Button>
            </div>
            <div className="space-y-1.5">
              {layers.map((layer, idx) => (
                <div key={idx} className="p-1.5 bg-background/50 rounded border border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                      <span className="text-[10px] font-bold">{layer.name}</span>
                    </div>
                    {layers.length > 2 && (
                      <button onClick={() => removeLayer(idx)} className="text-[9px] text-red-400 hover:text-red-600">✕</button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {sm(t('calc_weight_label'), layer.weight, v => updateLayer(idx, "weight", v), "0.15", "kg/m²")}
                    {sm(t('calc_price_label'), layer.price, v => updateLayer(idx, "price", v), "", "so'm/kg")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">{t('calc_quantity')}</p>
            <div className="space-y-1">
              {sm(t('calc_amount'), quantity, setQuantity, "1000", "dona")}
            </div>
            {calc && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{t('calc_total_weight')}</span>
                  <span className="font-bold">{fmt(calc.totalWeight)} kg</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{t('calc_production_cost')}</span>
                  <span className="font-bold">{fmt(calc.totalCost)} so'm</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
            <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase mb-1.5">{t('calc_selling_price')}</p>
            <div className="space-y-1">
              {sm(t('calc_coefficient'), coefficient, setCoefficient, "1.5", "×")}
            </div>
          </div>
        </div>

        {/* O'ng — eskiz + natija */}
        <div className="flex-1 p-3">
          {hasDimensions ? (
            <div className="space-y-3">
              {/* Eskiz — Gofra qog'oz */}
              <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
                <div className="p-2.5 border-b border-border/50 bg-muted/30 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{t('calc_gofra_sketch')}</span>
                </div>
                <div className="p-4 flex justify-center">
                  <GofraPaperSketch width={n(paperW)} length={n(paperL)} />
                </div>
              </div>

              {calc && (
                <>
                  {/* Kesma o'lchamlari */}
                  <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                       <div className="text-base font-bold text-violet-600">{n(paperW)} sm</div>
                       <div className="text-[9px] text-muted-foreground">{t('calc_width')}</div>
                     </div>
                     <div className="text-center p-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                       <div className="text-base font-bold text-violet-600">{n(paperL)} sm</div>
                       <div className="text-[9px] text-muted-foreground">{t('calc_length')}</div>
                     </div>
                     <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                       <div className="text-base font-bold text-amber-500">{calc.areaM2} m²</div>
                       <div className="text-[9px] text-muted-foreground">{t('calc_area')}</div>
                    </div>
                  </div>

                  {/* Qatlam jadvali + narxlar */}
                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1">
                      <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
                        <div className="p-2.5 border-b border-border/50 bg-muted/30 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          <span className="text-sm font-bold">{calc.layers.length} {t('calc_layers_count')}</span>
                        </div>
                        <div className="p-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border/50">
                                 <th className="text-left py-2 font-semibold">{t('calc_layer')}</th>
                                 <th className="text-left py-2 font-semibold">{t('calc_type')}</th>
                                 <th className="text-right py-2 font-semibold">{t('calc_weight')}</th>
                                 <th className="text-right py-2 font-semibold">{t('calc_price')}</th>
                                 <th className="text-right py-2 font-semibold">{t('calc_sum')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {calc.layers.map((layer, idx) => (
                                <tr key={idx} className="border-b border-border/30">
                                  <td className="py-2 font-bold text-base" style={{ color: layer.color }}>{idx + 1}</td>
                                  <td className="py-2 text-muted-foreground">{layer.name}</td>
                                  <td className="py-2 text-right font-mono font-bold">{layer.weightPerUnit} kg</td>
                                  <td className="py-2 text-right font-mono text-muted-foreground">{fmt(layer.price)}</td>
                                  <td className="py-2 text-right font-mono font-bold text-base">{fmt(layer.costPerUnit)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-primary/5 font-bold">
                                <td className="py-2 text-base" colSpan={2}>{t('calc_total')}</td>
                                <td className="py-2 text-right font-mono text-base">{calc.totalWeightPerUnit} kg</td>
                                <td></td>
                                <td className="py-2 text-right font-mono text-primary text-lg">{fmt(calc.totalCostPerUnit)} so'm</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Narxlar */}
                    <div className="lg:w-44 flex flex-row lg:flex-col gap-2">
                      <div className="flex-1 lg:flex-none bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center">
                        <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">{t('calc_production_cost')}</p>
                        <div className="text-2xl font-extrabold text-blue-600 leading-none">{fmt(calc.totalCostPerUnit)}</div>
                        <div className="text-[11px] text-blue-500 mt-1">{t('calc_per_unit')}</div>
                      </div>

                      <div className="flex-1 lg:flex-none bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border-2 border-emerald-400 dark:border-emerald-600 flex flex-col items-center justify-center">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">{t('calc_selling_price')}</p>
                        <div className="text-2xl font-extrabold text-emerald-600 leading-none">{fmt(calc.sellingPrice)}</div>
                        <div className="text-[11px] text-emerald-500 mt-1">{t('calc_per_unit')}</div>
                        <div className="text-[10px] text-emerald-700 mt-1 bg-emerald-200 dark:bg-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          × {calc.coefficient}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calculator className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">{t('calc_gofra_empty_hint')}</p>
              <p className="text-xs mt-1">{t('calc_gofra_empty_sub')}</p>
            </div>
          )}
        </div>
      </div>

      {/* CHOP ETISH UCHUN — faqat print da ko'rinadi */}
      {calc && hasDimensions && (
        <div className="print-only" style={{ display: "none" }}>
          <div style={{ fontFamily: "Arial, sans-serif", padding: "10mm", width: "190mm", height: "277mm", display: "flex", flexDirection: "column" }}>
            {/* SARLAVHA */}
            <div style={{ borderBottom: "2px solid #333", paddingBottom: "6px", marginBottom: "8px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>SHOVOT CARTON</h1>
                <span style={{ color: "#999", fontSize: "12px" }}>—</span>
                <p style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>Gofra qog'oz</p>
                <span style={{ fontSize: "9px", color: "#666", marginLeft: "auto" }}>Sana: {new Date().toLocaleDateString("uz-UZ")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "11px", background: "#f5f5f5", padding: "4px 8px", borderRadius: "3px" }}>
                <span><b>Eni:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{n(paperW)} sm</span></span>
                <span><b>Bo'yi:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{n(paperL)} sm</span></span>
                <span style={{ color: "#ccc" }}>|</span>
                <span><b>Maydon:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fmt(calc.areaM2)} m²</span></span>
                <span style={{ color: "#ccc" }}>|</span>
                <span><b>Og'irlik:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fmt(calc.totalWeightPerUnit)} kg</span></span>
              </div>
            </div>

            {/* ESKIZ */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <GofraPaperSketch width={n(paperW)} length={n(paperL)} printMode={true} />
            </div>
          </div>
        </div>
      )}

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body, html { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
          body > * { visibility: hidden !important; }
          .print-only { display: block !important; position: fixed !important; left: 0 !important; top: 0 !important; width: 210mm !important; height: 297mm !important; background: white !important; z-index: 99999 !important; overflow: hidden !important; }
          .print-only * { visibility: visible !important; }
          .print-only svg text { fill: black !important; }
          @page { margin: 0; size: A4 portrait; }
        }
      `}</style>
    </Card>
  );
}
