import { useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, Printer, Layers, TrendingUp, Building2, Package } from "lucide-react";
import BoxTemplate from "@/components/BoxTemplate";

const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => n.toFixed(d);

export default function ProductionCalc() {
  const [boxL, setBoxL] = useState("");
  const [boxW, setBoxW] = useState("");
  const [boxH, setBoxH] = useState("");
  const [paperWeightKg, setPaperWeightKg] = useState("0.125");
  const [priceLayer1, setPriceLayer1] = useState("");
  const [priceLayer2, setPriceLayer2] = useState("");
  const [priceLayer3, setPriceLayer3] = useState("");
  const [wastePercent, setWastePercent] = useState("10");
  const [quantity, setQuantity] = useState("1000");
  const [coefficient, setCoefficient] = useState("1.5");
  const [companyName, setCompanyName] = useState("Shovot Carton");
  const [boxName, setBoxName] = useState("RSC quti");

  const printRef = useRef<HTMLDivElement>(null);
  const n = (s: string) => parseFloat(s) || 0;

  const calc = useMemo(() => {
    const L = n(boxL), W = n(boxW), H = n(boxH);
    const pwKg = n(paperWeightKg);
    const p1 = n(priceLayer1), p2 = n(priceLayer2), p3 = n(priceLayer3);
    const w = n(wastePercent), q = n(quantity);
    const k = n(coefficient);

    if (L <= 0 || W <= 0 || H <= 0 || pwKg <= 0 || q <= 0) return null;

    // Kesma o'lchamlari (sm)
    const blankLen = 2 * (W + L) + 6;
    const flapH = L / 2;
    const blankW = 1 + flapH + H + flapH + 1;

    // Maydon (m²)
    const netAreaM2 = (blankLen * blankW) / 10000;

    // 3 qatlam
    const l1Weight = netAreaM2 * pwKg;
    const l1Cost = l1Weight * p1;
    const l2Weight = netAreaM2 * pwKg / 0.7;
    const l2Cost = l2Weight * p2;
    const l3Weight = netAreaM2 * pwKg;
    const l3Cost = l3Weight * p3;

    const totalWeight = l1Weight + l2Weight + l3Weight;
    const totalPaperCost = l1Cost + l2Cost + l3Cost;

    // Sotish narxi = ishlab chiqarish narxi × koeffitsient
    const sellingPrice = Math.round(totalPaperCost * k);

    return {
      blankLen: +fmtD(blankLen, 1), blankW: +fmtD(blankW, 1),
      netAreaM2: +fmtD(netAreaM2, 4),
      l1: { weight: +fmtD(l1Weight, 4), price: p1, cost: Math.round(l1Cost) },
      l2: { weight: +fmtD(l2Weight, 4), price: p2, cost: Math.round(l2Cost) },
      l3: { weight: +fmtD(l3Weight, 4), price: p3, cost: Math.round(l3Cost) },
      totalWeight: +fmtD(totalWeight, 4), totalPaperCost: Math.round(totalPaperCost),
      perBox: { paper: Math.round(totalPaperCost), total: Math.round(totalPaperCost) },
      total: { quantity: q, paper: Math.round(totalPaperCost * q), grandTotal: Math.round(totalPaperCost * q) },
      sellingPrice,
      sellingTotal: Math.round(sellingPrice * q),
      coefficient: k,
    };
  }, [boxL, boxW, boxH, paperWeightKg, priceLayer1, priceLayer2, priceLayer3, wastePercent, quantity, coefficient]);

  const hasBox = n(boxL) > 0 && n(boxW) > 0 && n(boxH) > 0;

  const handlePrint = () => {
    if (!calc) return;
    window.print();
  };

  const sm = (label: string, val: string, set: (v: string) => void, ph: string, unit: string) => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground w-16 shrink-0 text-right">{label}</span>
      <div className="relative flex-1">
        <Input type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph}
          className="h-8 text-xs px-2 pr-8 bg-background/50 border-border/50" />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden border-0 shadow-lg border-primary/20">
      <div className="p-3 border-b border-border/50 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">🧮 Kalkulyatsiya</h3>
        </div>
        {hasBox && (
          <Button size="sm" variant="outline" onClick={handlePrint} className="h-7 text-xs gap-1">
            <Printer className="w-3 h-3" /> Chop etish
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Chap — inputlar */}
        <div className="lg:w-80 p-3 space-y-2 border-r border-border/50">
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Korxona & quti nomi
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground w-16 shrink-0 text-right">Korxona</span>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Shovot Carton"
                  className="h-8 text-xs px-2 bg-background/50 border-border/50" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground w-16 shrink-0 text-right">Quti nomi</span>
                <Input value={boxName} onChange={e => setBoxName(e.target.value)} placeholder="RSC quti"
                  className="h-8 text-xs px-2 bg-background/50 border-border/50" />
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📦 Quti (sm)</p>
            <div className="space-y-1">
              {sm("Bo'yi", boxL, setBoxL, "30", "sm")}
              {sm("Eni", boxW, setBoxW, "20", "sm")}
              {sm("Balandligi", boxH, setBoxH, "15", "sm")}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📄 Qog'oz og'irligi</p>
            <div className="space-y-1">
              {sm("Og'irlik", paperWeightKg, setPaperWeightKg, "0.125", "kg/m²")}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">💰 Har bir qatlam narxi (so'm/kg)</p>
            <div className="space-y-1">
              {sm("1-qatlam", priceLayer1, setPriceLayer1, "", "so'm/kg")}
              {sm("2-qatlam", priceLayer2, setPriceLayer2, "", "so'm/kg")}
              {sm("3-qatlam", priceLayer3, setPriceLayer3, "", "so'm/kg")}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📊 Miqdor</p>
            <div className="space-y-1">
              {sm("Chiqindi", wastePercent, setWastePercent, "10", "%")}
              {sm("Miqdor", quantity, setQuantity, "1000", "dona")}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
            <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase mb-1.5">📈 Sotish narxi</p>
            <div className="space-y-1">
              {sm("Koeffitsient", coefficient, setCoefficient, "1.5", "×")}
            </div>
          </div>
        </div>

        {/* O'ng — eskiz + natija */}
        <div className="flex-1 p-3">
          {hasBox ? (
            <div className="space-y-3">
              <div ref={printRef}>
                <BoxTemplate boxLength={n(boxL)} boxWidth={n(boxW)} boxHeight={n(boxH)} />
              </div>

              {calc && (
                <>
                  {/* Kesma o'lchamlari */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                      <div className="text-base font-bold text-violet-600">{calc.blankLen} sm</div>
                      <div className="text-[9px] text-muted-foreground">Kesma uzunligi</div>
                    </div>
                    <div className="text-center p-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                      <div className="text-base font-bold text-violet-600">{calc.blankW} sm</div>
                      <div className="text-[9px] text-muted-foreground">Kesma eni</div>
                    </div>
                    <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <div className="text-base font-bold text-amber-500">{calc.netAreaM2} m²</div>
                      <div className="text-[9px] text-muted-foreground">Sof maydon</div>
                    </div>
                  </div>

                  {/* Eskiz + Narxlar yonma-yon */}
                  <div className="flex flex-col lg:flex-row gap-3">
                    {/* Eskiz */}
                    <div className="flex-1">
                      <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
                        <div className="p-2.5 border-b border-border/50 bg-muted/30 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          <span className="text-sm font-bold">3 qatlamli qog'oz (1 dona uchun)</span>
                        </div>
                        <div className="p-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border/50">
                                <th className="text-left py-2 font-semibold">Qatlam</th>
                                <th className="text-left py-2 font-semibold">Turi</th>
                                <th className="text-right py-2 font-semibold">Og'irlik</th>
                                <th className="text-right py-2 font-semibold">Narx</th>
                                <th className="text-right py-2 font-semibold">Summa</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-border/30">
                                <td className="py-2 font-bold text-blue-600 text-base">1</td>
                                <td className="py-2 text-muted-foreground">Tashqi</td>
                                <td className="py-2 text-right font-mono font-bold">{calc.l1.weight} kg</td>
                                <td className="py-2 text-right font-mono text-muted-foreground">{fmt(calc.l1.price)}</td>
                                <td className="py-2 text-right font-mono font-bold text-base">{fmt(calc.l1.cost)}</td>
                              </tr>
                              <tr className="border-b border-border/30 bg-amber-50/50 dark:bg-amber-950/20">
                                <td className="py-2 font-bold text-amber-600 text-base">2</td>
                                <td className="py-2 text-muted-foreground">Gofra ÷0.7</td>
                                <td className="py-2 text-right font-mono font-bold">{calc.l2.weight} kg</td>
                                <td className="py-2 text-right font-mono text-amber-600">{fmt(calc.l2.price)}</td>
                                <td className="py-2 text-right font-mono font-bold text-base">{fmt(calc.l2.cost)}</td>
                              </tr>
                              <tr className="border-b border-border/50">
                                <td className="py-2 font-bold text-green-600 text-base">3</td>
                                <td className="py-2 text-muted-foreground">Ichki</td>
                                <td className="py-2 text-right font-mono font-bold">{calc.l3.weight} kg</td>
                                <td className="py-2 text-right font-mono text-muted-foreground">{fmt(calc.l3.price)}</td>
                                <td className="py-2 text-right font-mono font-bold text-base">{fmt(calc.l3.cost)}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr className="bg-primary/5 font-bold">
                                <td className="py-2 text-base" colSpan={2}>JAMI</td>
                                <td className="py-2 text-right font-mono text-base">{calc.totalWeight} kg</td>
                                <td></td>
                                <td className="py-2 text-right font-mono text-primary text-lg">{fmt(calc.totalPaperCost)} so'm</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Narxlar — jadval balandligida */}
                    <div className="lg:w-44 flex flex-row lg:flex-col gap-2">
                      {/* Ishlab chiqarish narxi */}
                      <div className="flex-1 lg:flex-none bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center">
                        <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Ishlab chiqarish</p>
                        <div className="text-2xl font-extrabold text-blue-600 leading-none">{fmt(calc.perBox.total)}</div>
                        <div className="text-[11px] text-blue-500 mt-1">so'm / dona</div>
                      </div>

                      {/* Sotish narxi */}
                      <div className="flex-1 lg:flex-none bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border-2 border-emerald-400 dark:border-emerald-600 flex flex-col items-center justify-center">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Sotish narxi</p>
                        <div className="text-2xl font-extrabold text-emerald-600 leading-none">{fmt(calc.sellingPrice)}</div>
                        <div className="text-[11px] text-emerald-500 mt-1">so'm / dona</div>
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
              <p className="text-sm font-medium">Quti o'lchamlarini kiriting (sm)</p>
              <p className="text-xs mt-1">Eskiz avtomatik chiziladi</p>
            </div>
          )}
        </div>
      </div>

      {/* CHOP ETISH UCHUN — faqat print da ko'rinadi */}
      {calc && (() => {
        const bw = n(boxW), bh = n(boxH), bl = n(boxL);
        const blankLen = 2 * bw + 2 * bl + 6;
        const flapH = bl / 2;
        const blankW = 1 + flapH + bh + flapH + 1;

        return (
        <div className="print-only" style={{ display: "none" }}>
          <div style={{ fontFamily: "Arial", padding: "10mm", width: "297mm", minHeight: "210mm" }}>
            {/* SARLAVHA */}
            <div style={{ borderBottom: "2px solid black", paddingBottom: "8px", marginBottom: "8px" }}>
              {/* 1-QATOR: korxona nomi + quti nomi */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>{companyName}</h1>
                <span style={{ color: "#999", fontSize: "14px" }}>—</span>
                <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>{boxName}</p>
                <span style={{ fontSize: "10px", color: "#666", marginLeft: "auto" }}>Sana: {new Date().toLocaleDateString("uz-UZ")}</span>
              </div>
              {/* 2-QATOR: mahsulot haqida ma'lumot */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "12px", background: "#f5f5f5", padding: "5px 10px", borderRadius: "3px" }}>
                <div style={{ display: "flex", gap: "16px" }}>
                  <span><b>Eni (W):</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{bw} sm</span></span>
                  <span><b>Balandligi (H):</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{bh} sm</span></span>
                  <span><b>Bo'yi (L):</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{bl} sm</span></span>
                </div>
                <span style={{ color: "#ccc" }}>|</span>
                <div style={{ display: "flex", gap: "16px" }}>
                  <span><b>Kesma:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fmt(blankLen)} × {fmt(blankW)} sm</span></span>
                  <span><b>Kanot:</b> <span style={{ fontFamily: "monospace" }}>{fmt(flapH)} sm</span></span>
                </div>
                <span style={{ color: "#ccc" }}>|</span>
                <span><b>Sof maydon:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fmt(calc.netAreaM2)} m²</span></span>
                <span style={{ color: "#ccc" }}>|</span>
                <span><b>Umumiy og'irlik:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fmt(calc.totalWeight)} kg</span></span>
                <span style={{ color: "#ccc" }}>|</span>
                <span><b>1 dona narxi:</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fmt(calc.totalPaperCost)} so'm</span></span>
              </div>
            </div>

            {/* ESKIZ — to'liq kenglikda */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
              <BoxTemplate boxLength={bl} boxWidth={bw} boxHeight={bh} showFlat={true} show3D={false} />
            </div>

            {/* 3D — eskiz pastida */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <BoxTemplate boxLength={bl} boxWidth={bw} boxHeight={bh} showFlat={false} show3D={true} showTitle={false} printMode={true} />
            </div>
          </div>
        </div>
        );
      })()}

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body, html { background: white !important; color: black !important; }
          body * { visibility: hidden !important; }
          .print-only, .print-only * { visibility: visible !important; color: black !important; }
          .print-only { display: block !important; position: absolute; left: 0; top: 0; background: white !important; }
          @page { margin: 5mm; size: A4 landscape; }
        }
      `}</style>
    </Card>
  );
}
