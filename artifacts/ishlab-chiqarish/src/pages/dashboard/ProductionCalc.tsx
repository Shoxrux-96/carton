import { useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, Printer } from "lucide-react";
import BoxTemplate from "@/components/BoxTemplate";

const fmt = (n: number) => n.toLocaleString("uz-UZ");

export default function ProductionCalc() {
  const [boxL, setBoxL] = useState("");
  const [boxW, setBoxW] = useState("");
  const [boxH, setBoxH] = useState("");
  const [paperW, setPaperW] = useState("");
  const [paperPrice, setPaperPrice] = useState("");
  const [printColors, setPrintColors] = useState("1");
  const [printPrice, setPrintPrice] = useState("");
  const [glue, setGlue] = useState("");
  const [cutting, setCutting] = useState("");
  const [waste, setWaste] = useState("10");
  const [qty, setQty] = useState("1000");
  const printRef = useRef<HTMLDivElement>(null);

  const n = (s: string) => parseFloat(s) || 0;

  const calc = useMemo(() => {
    const L = n(boxL) / 1000, W = n(boxW) / 1000, H = n(boxH) / 1000;
    const pw = n(paperW), pp = n(paperPrice);
    const pc = parseInt(printColors) || 0, prp = n(printPrice);
    const gl = n(glue), cu = n(cutting), w = n(waste), q = n(qty);
    if (L <= 0 || W <= 0 || H <= 0 || pw <= 0 || q <= 0) return null;

    const flap = 0.030, tF = W * 0.75, bF = W * 0.75;
    const bL = 2 * (L + W) + flap, bW = H + tF + bF;
    const net = bL * bW, gross = net * (1 + w / 100);
    const pGram = gross * pw, pKg = pGram / 1000;
    const pCost = pKg * pp;
    const prCost = gross * prp * pc;
    const tBox = pCost + prCost + gl + cu;

    return {
      bL: Math.round(bL * 1000), bW: Math.round(bW * 1000),
      net: +net.toFixed(4), gross: +gross.toFixed(4),
      pGram: Math.round(pGram), pKg: +pKg.toFixed(4),
      pCost: Math.round(pCost), prCost: Math.round(prCost),
      gl: Math.round(gl), cu: Math.round(cu),
      tBox: Math.round(tBox),
      tPaper: Math.round(pCost * q), tPrint: Math.round(prCost * q),
      tGlue: Math.round(gl * q), tCut: Math.round(cu * q),
      tAll: Math.round(tBox * q), q,
    };
  }, [boxL, boxW, boxH, paperW, paperPrice, printColors, printPrice, glue, cutting, waste, qty]);

  const hasBox = n(boxL) > 0 && n(boxW) > 0 && n(boxH) > 0;

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>Eskiz — ${boxL}x${boxW}x${boxH}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        svg { max-width: 100%; height: auto; }
      </style></head><body>${el.innerHTML}</body></html>
    `);
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
        {/* Chap — kichik inputlar */}
        <div className="lg:w-80 p-3 space-y-2 border-r border-border/50">
          {/* Quti */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📦 Quti (mm)</p>
            <div className="space-y-1">
              {sm("Bo'yi", boxL, setBoxL, "300", "mm")}
              {sm("Eni", boxW, setBoxW, "200", "mm")}
              {sm("Balandligi", boxH, setBoxH, "150", "mm")}
            </div>
          </div>
          {/* Qog'oz */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📄 Qog'oz</p>
            <div className="space-y-1">
              {sm("Og'irlik", paperW, setPaperW, "250", "g/m²")}
              {sm("Narx", paperPrice, setPaperPrice, "12000", "so'm/kg")}
            </div>
          </div>
          {/* Bosma + xarajatlar */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">🖨️ Bosma & xarajatlar</p>
            <div className="space-y-1">
              {sm("Ranglar", printColors, setPrintColors, "1", "dona")}
              {sm("Bosma narxi", printPrice, setPrintPrice, "500", "so'm/m²")}
              {sm("Yelim", glue, setGlue, "50", "so'm/dona")}
              {sm("Kesish", cutting, setCutting, "30", "so'm/dona")}
            </div>
          </div>
          {/* Miqdor */}
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">📊 Miqdor</p>
            <div className="space-y-1">
              {sm("Chiqindi", waste, setWaste, "10", "%")}
              {sm("Miqdor", qty, setQty, "1000", "dona")}
            </div>
          </div>
        </div>

        {/* O'ng — eskiz + natija */}
        <div className="flex-1 p-3">
          {hasBox ? (
            <div className="space-y-3">
              {/* Eskiz */}
              <div ref={printRef}>
                <BoxTemplate boxLength={n(boxL)} boxWidth={n(boxW)} boxHeight={n(boxH)} />
              </div>

              {/* Kesma o'lchamlari */}
              {calc && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                    <div className="text-base font-bold text-violet-600">{calc.bL}</div>
                    <div className="text-[9px] text-muted-foreground">Kesma uzunligi (mm)</div>
                  </div>
                  <div className="text-center p-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                    <div className="text-base font-bold text-violet-600">{calc.bW}</div>
                    <div className="text-[9px] text-muted-foreground">Kesma eni (mm)</div>
                  </div>
                  <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <div className="text-base font-bold text-amber-500">{calc.net}</div>
                    <div className="text-[9px] text-muted-foreground">Sof maydon (m²)</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <div className="text-base font-bold text-orange-500">{calc.gross}</div>
                    <div className="text-[9px] text-muted-foreground">Chiqindi bilan (m²)</div>
                  </div>
                </div>
              )}

              {/* 1 dona + Jami */}
              {calc && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* 1 dona */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                    <p className="text-[9px] font-bold text-blue-600 uppercase mb-1.5">📦 1 dona uchun</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">📄 Qog'oz</span><span className="font-semibold">{fmt(calc.pCost)} so'm</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">🖨️ Bosma</span><span className="font-semibold">{fmt(calc.prCost)} so'm</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">🧴 Yelim</span><span className="font-semibold">{fmt(calc.gl)} so'm</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">✂️ Kesish</span><span className="font-semibold">{fmt(calc.cu)} so'm</span></div>
                      <div className="border-t border-blue-200 dark:border-blue-800 pt-1 flex justify-between font-bold">
                        <span>Jami:</span><span className="text-primary">{fmt(calc.tBox)} so'm</span>
                      </div>
                    </div>
                  </div>
                  {/* Jami */}
                  <div className="bg-gradient-to-br from-primary to-primary/80 rounded-lg p-3 text-white">
                    <p className="text-[9px] font-bold uppercase mb-1 opacity-80">💰 JAMI ({fmt(calc.q)} dona)</p>
                    <div className="text-center py-1">
                      <div className="text-2xl font-extrabold">{fmt(calc.tAll)}</div>
                      <div className="text-[10px] opacity-80">so'm</div>
                    </div>
                    <div className="space-y-0.5 text-[10px] opacity-90 mt-2">
                      <div className="flex justify-between"><span>📄 Qog'oz</span><span>{fmt(calc.tPaper)}</span></div>
                      <div className="flex justify-between"><span>🖨️ Bosma</span><span>{fmt(calc.tPrint)}</span></div>
                      <div className="flex justify-between"><span>🧴 Yelim</span><span>{fmt(calc.tGlue)}</span></div>
                      <div className="flex justify-between"><span>✂️ Kesish</span><span>{fmt(calc.tCut)}</span></div>
                      <div className="border-t border-white/20 pt-0.5 flex justify-between font-bold">
                        <span>1 dona</span><span>{fmt(calc.tBox)} so'm</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calculator className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Quti o'lchamlarini kiriting</p>
              <p className="text-xs mt-1">Eskiz avtomatik chiziladi</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
