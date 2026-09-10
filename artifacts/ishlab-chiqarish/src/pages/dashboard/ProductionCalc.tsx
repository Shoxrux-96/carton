import { useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, Printer, Layers } from "lucide-react";
import BoxTemplate from "@/components/BoxTemplate";

const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => n.toFixed(d);

export default function ProductionCalc() {
  // Quti o'lchamlari (sm)
  const [boxL, setBoxL] = useState("");
  const [boxW, setBoxW] = useState("");
  const [boxH, setBoxH] = useState("");

  // Qog'oz og'irligi (har 3 qatlam uchun umumiy)
  const [paperWeightKg, setPaperWeightKg] = useState("0.125"); // kg/m²

  // Har bir qatlam uchun alohida NARX (so'm/kg)
  const [priceLayer1, setPriceLayer1] = useState(""); // tashqi qog'oz
  const [priceLayer2, setPriceLayer2] = useState(""); // gofra qog'oz
  const [priceLayer3, setPriceLayer3] = useState(""); // ichki qog'oz

  // Bosma
  const [printColors, setPrintColors] = useState("1");
  const [printPriceM2, setPrintPriceM2] = useState("");

  // Xarajatlar
  const [gluePerBox, setGluePerBox] = useState("");
  const [cuttingPerBox, setCuttingPerBox] = useState("");

  // Miqdor
  const [wastePercent, setWastePercent] = useState("10");
  const [quantity, setQuantity] = useState("1000");

  const printRef = useRef<HTMLDivElement>(null);
  const n = (s: string) => parseFloat(s) || 0;

  const calc = useMemo(() => {
    const L = n(boxL), W = n(boxW), H = n(boxH);
    const pwKg = n(paperWeightKg);
    const p1 = n(priceLayer1);
    const p2 = n(priceLayer2);
    const p3 = n(priceLayer3);
    const pc = parseInt(printColors) || 0;
    const prp = n(printPriceM2);
    const gl = n(gluePerBox);
    const cu = n(cuttingPerBox);
    const w = n(wastePercent);
    const q = n(quantity);

    if (L <= 0 || W <= 0 || H <= 0 || pwKg <= 0 || q <= 0) return null;

    // Kesma o'lchamlari (sm)
    const blankLen = 2 * W + 2 * L + 5;         // 4 panel + 5sm yelim
    const flapH = L / 2;                         // kanot = bo'yi / 2
    const blankW = 1 + flapH + H + flapH + 1;   // 1 + L/2 + H + L/2 + 1 = H + L + 2

    // Maydon (m²)
    const netAreaM2 = (blankLen * blankW) / 10000;
    const grossAreaM2 = netAreaM2 * (1 + w / 100);

    // ===== 3 QATLAMLI QOG'OZ =====
    // 1-qatlam: tashqi qog'oz (×1.0)
    const l1Weight = grossAreaM2 * pwKg;
    const l1Cost = l1Weight * p1;

    // 2-qatlam: gofra qog'oz (÷0.7 — kamroq qalinlik, ko'proq miqdor)
    const l2Weight = grossAreaM2 * pwKg / 0.7;
    const l2Cost = l2Weight * p2;

    // 3-qatlam: ichki qog'oz (×1.0)
    const l3Weight = grossAreaM2 * pwKg;
    const l3Cost = l3Weight * p3;

    // Jami
    const totalWeight = l1Weight + l2Weight + l3Weight;
    const totalPaperCost = l1Cost + l2Cost + l3Cost;
    const printCost = grossAreaM2 * prp * pc;
    const totalPerBox = totalPaperCost + printCost + gl + cu;

    return {
      blankLen: +fmtD(blankLen, 1), blankW: +fmtD(blankW, 1),
      netAreaM2: +fmtD(netAreaM2, 4), grossAreaM2: +fmtD(grossAreaM2, 4),
      // 1-qatlam
      l1: { weight: +fmtD(l1Weight, 4), price: p1, cost: Math.round(l1Cost) },
      // 2-qatlam
      l2: { weight: +fmtD(l2Weight, 4), price: p2, cost: Math.round(l2Cost) },
      // 3-qatlam
      l3: { weight: +fmtD(l3Weight, 4), price: p3, cost: Math.round(l3Cost) },
      // Jami
      totalWeight: +fmtD(totalWeight, 4), totalPaperCost: Math.round(totalPaperCost),
      printCost: Math.round(printCost),
      perBox: { paper: Math.round(totalPaperCost), printing: Math.round(printCost), glue: Math.round(gl), cutting: Math.round(cu), total: Math.round(totalPerBox) },
      total: { quantity: q, paper: Math.round(totalPaperCost * q), printing: Math.round(printCost * q), glue: Math.round(gl * q), cutting: Math.round(cu * q), grandTotal: Math.round(totalPerBox * q) },
    };
  }, [boxL, boxW, boxH, paperWeightKg, priceLayer1, priceLayer2, priceLayer3, printColors, printPriceM2, gluePerBox, cuttingPerBox, wastePercent, quantity]);

  const hasBox = n(boxL) > 0 && n(boxW) > 0 && n(boxH) > 0;

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=600");
    if (!w) return;
    w.document.write(`<html><head><title>Eskiz</title><style>@page{size:landscape;margin:10mm;}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}svg{max-width:100%;height:auto;}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
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
          {/* Quti */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📦 Quti (sm)</p>
            <div className="space-y-1">
              {sm("Bo'yi", boxL, setBoxL, "30", "sm")}
              {sm("Eni", boxW, setBoxW, "20", "sm")}
              {sm("Balandligi", boxH, setBoxH, "15", "sm")}
            </div>
          </div>

          {/* Qog'oz og'irligi */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📄 Qog'oz og'irligi</p>
            <div className="space-y-1">
              {sm("Og'irlik", paperWeightKg, setPaperWeightKg, "0.125", "kg/m²")}
            </div>
          </div>

          {/* 3 qatlam narxlari */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">💰 Har bir qatlam narxi (so'm/kg)</p>
            <div className="space-y-1">
              {sm("1-qatlam", priceLayer1, setPriceLayer1, "", "so'm/kg")}
              {sm("2-qatlam", priceLayer2, setPriceLayer2, "", "so'm/kg")}
              {sm("3-qatlam", priceLayer3, setPriceLayer3, "", "so'm/kg")}
            </div>
          </div>

          {/* Bosma */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">🖨️ Bosma</p>
            <div className="space-y-1">
              {sm("Ranglar", printColors, setPrintColors, "1", "dona")}
              {sm("Bosma narxi", printPriceM2, setPrintPriceM2, "", "so'm/m²")}
            </div>
          </div>

          {/* Xarajatlar */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">🔧 Xarajatlar</p>
            <div className="space-y-1">
              {sm("Yelim", gluePerBox, setGluePerBox, "", "so'm/dona")}
              {sm("Kesish", cuttingPerBox, setCuttingPerBox, "", "so'm/dona")}
            </div>
          </div>

          {/* Miqdor */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📊 Miqdor</p>
            <div className="space-y-1">
              {sm("Chiqindi", wastePercent, setWastePercent, "10", "%")}
              {sm("Miqdor", quantity, setQuantity, "1000", "dona")}
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
                  {/* Kesma + maydon */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
                    <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                      <div className="text-base font-bold text-orange-500">{calc.grossAreaM2} m²</div>
                      <div className="text-[9px] text-muted-foreground">Chiqindi bilan</div>
                    </div>
                  </div>

                  {/* 3 QATLAMLI QOG'OZ */}
                  <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
                    <div className="p-2.5 border-b border-border/50 bg-muted/30 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold">3 qatlamli qog'oz (1 dona uchun)</span>
                    </div>
                    <div className="p-2.5">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border/50">
                            <th className="text-left py-1.5 font-semibold">Qatlam</th>
                            <th className="text-left py-1.5 font-semibold">Turi</th>
                            <th className="text-right py-1.5 font-semibold">Og'irlik (kg)</th>
                            <th className="text-right py-1.5 font-semibold">Narx (so'm/kg)</th>
                            <th className="text-right py-1.5 font-semibold">Summa</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border/30">
                            <td className="py-1.5 font-bold text-blue-600">1-qatlam</td>
                            <td className="py-1.5 text-muted-foreground">Tashqi qog'oz</td>
                            <td className="py-1.5 text-right font-mono font-bold">{calc.l1.weight}</td>
                            <td className="py-1.5 text-right font-mono text-muted-foreground">{fmt(calc.l1.price)}</td>
                            <td className="py-1.5 text-right font-mono font-bold">{fmt(calc.l1.cost)} so'm</td>
                          </tr>
                          <tr className="border-b border-border/30 bg-amber-50/50 dark:bg-amber-950/20">
                            <td className="py-1.5 font-bold text-amber-600">2-qatlam</td>
                            <td className="py-1.5 text-muted-foreground">Gofra (÷0.7)</td>
                            <td className="py-1.5 text-right font-mono font-bold">{calc.l2.weight}</td>
                            <td className="py-1.5 text-right font-mono text-amber-600">{fmt(calc.l2.price)}</td>
                            <td className="py-1.5 text-right font-mono font-bold">{fmt(calc.l2.cost)} so'm</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-1.5 font-bold text-green-600">3-qatlam</td>
                            <td className="py-1.5 text-muted-foreground">Ichki qog'oz</td>
                            <td className="py-1.5 text-right font-mono font-bold">{calc.l3.weight}</td>
                            <td className="py-1.5 text-right font-mono text-muted-foreground">{fmt(calc.l3.price)}</td>
                            <td className="py-1.5 text-right font-mono font-bold">{fmt(calc.l3.cost)} so'm</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="bg-primary/5 font-bold">
                            <td className="py-1.5" colSpan={2}>JAMI</td>
                            <td className="py-1.5 text-right font-mono">{calc.totalWeight} kg</td>
                            <td></td>
                            <td className="py-1.5 text-right font-mono text-primary">{fmt(calc.totalPaperCost)} so'm</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* 1 dona + Jami */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <p className="text-[9px] font-bold text-blue-600 uppercase mb-1.5">📦 1 dona uchun</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">📄 Qog'oz (3 qatlam)</span><span className="font-semibold">{fmt(calc.perBox.paper)} so'm</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">🖨️ Bosma</span><span className="font-semibold">{fmt(calc.perBox.printing)} so'm</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">🧴 Yelim</span><span className="font-semibold">{fmt(calc.perBox.glue)} so'm</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">✂️ Kesish</span><span className="font-semibold">{fmt(calc.perBox.cutting)} so'm</span></div>
                        <div className="border-t border-blue-200 dark:border-blue-800 pt-1 flex justify-between font-bold">
                          <span>Jami:</span><span className="text-primary">{fmt(calc.perBox.total)} so'm</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-lg p-3 text-white">
                      <p className="text-[9px] font-bold uppercase mb-1 opacity-80">💰 JAMI ({fmt(calc.total.quantity)} dona)</p>
                      <div className="text-center py-1">
                        <div className="text-2xl font-extrabold">{fmt(calc.total.grandTotal)}</div>
                        <div className="text-[10px] opacity-80">so'm</div>
                      </div>
                      <div className="space-y-0.5 text-[10px] opacity-90 mt-2">
                        <div className="flex justify-between"><span>📄 Qog'oz</span><span>{fmt(calc.total.paper)}</span></div>
                        <div className="flex justify-between"><span>🖨️ Bosma</span><span>{fmt(calc.total.printing)}</span></div>
                        <div className="flex justify-between"><span>🧴 Yelim</span><span>{fmt(calc.total.glue)}</span></div>
                        <div className="flex justify-between"><span>✂️ Kesish</span><span>{fmt(calc.total.cutting)}</span></div>
                        <div className="border-t border-white/20 pt-0.5 flex justify-between font-bold">
                          <span>1 dona</span><span>{fmt(calc.perBox.total)} so'm</span>
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
    </Card>
  );
}
