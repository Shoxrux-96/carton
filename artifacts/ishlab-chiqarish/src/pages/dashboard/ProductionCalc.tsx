import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator } from "lucide-react";

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

  const inp = (label: string, val: string, set: (v: string) => void, ph: string, unit: string) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="relative flex-1">
        <Input type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph}
          className="h-9 text-sm pr-10 bg-background/50" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden border-0 shadow-lg border-primary/20">
      <div className="p-4 border-b border-border/50 bg-primary/5 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">🧮 Ishlab chiqarish kalkulyatsiyasi</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chap — inputlar */}
          <div className="space-y-3">
            {/* Quti */}
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">📦 Quti o'lchamlari (mm)</p>
              <div className="space-y-2">
                {inp("Bo'yi (L)", boxL, setBoxL, "300", "mm")}
                {inp("Eni (W)", boxW, setBoxW, "200", "mm")}
                {inp("Bo'yi (H)", boxH, setBoxH, "150", "mm")}
              </div>
            </div>
            {/* Qog'oz */}
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">📄 Qog'oz</p>
              <div className="space-y-2">
                {inp("Og'irligi", paperW, setPaperW, "250", "g/m²")}
                {inp("Narxi", paperPrice, setPaperPrice, "12000", "so'm/kg")}
              </div>
            </div>
            {/* Bosma + xarajatlar */}
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">🖨️ Bosma & xarajatlar</p>
              <div className="space-y-2">
                {inp("Ranglar", printColors, setPrintColors, "1", "dona")}
                {inp("Bosma narxi", printPrice, setPrintPrice, "500", "so'm/m²")}
                {inp("Yelim", glue, setGlue, "50", "so'm/dona")}
                {inp("Kesish", cutting, setCutting, "30", "so'm/dona")}
              </div>
            </div>
            {/* Miqdor */}
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">📊 Miqdor</p>
              <div className="space-y-2">
                {inp("Chiqindi", waste, setWaste, "10", "%")}
                {inp("Miqdori", qty, setQty, "1000", "dona")}
              </div>
            </div>
          </div>

          {/* O'ng — natija */}
          <div className="space-y-3">
            {calc ? (
              <>
                {/* Kesma */}
                <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase mb-2">✂️ Kesma (blank)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-white dark:bg-background rounded-lg">
                      <div className="text-lg font-bold text-violet-600">{calc.bL}</div>
                      <div className="text-[10px] text-muted-foreground">Uzunligi (mm)</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-background rounded-lg">
                      <div className="text-lg font-bold text-violet-600">{calc.bW}</div>
                      <div className="text-[10px] text-muted-foreground">Kengligi (mm)</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-background rounded-lg">
                      <div className="text-lg font-bold text-amber-500">{calc.net}</div>
                      <div className="text-[10px] text-muted-foreground">Sof (m²)</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-background rounded-lg">
                      <div className="text-lg font-bold text-orange-500">{calc.gross}</div>
                      <div className="text-[10px] text-muted-foreground">Chiqindi (m²)</div>
                    </div>
                  </div>
                </div>

                {/* 1 dona */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">📦 1 dona uchun</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">📄 Qog'оз ({calc.pGram}g)</span>
                      <span className="font-semibold">{fmt(calc.pCost)} so'm</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">🖨️ Bosma ({calc.q !== undefined ? printColors : 0} rang)</span>
                      <span className="font-semibold">{fmt(calc.prCost)} so'm</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">🧴 Yelim</span>
                      <span className="font-semibold">{fmt(calc.gl)} so'm</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">✂️ Kesish</span>
                      <span className="font-semibold">{fmt(calc.cu)} so'm</span>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-800 pt-1.5 flex justify-between">
                      <span className="text-xs font-bold">1 dona jami:</span>
                      <span className="text-sm font-extrabold text-primary">{fmt(calc.tBox)} so'm</span>
                    </div>
                  </div>
                </div>

                {/* JAMI */}
                <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-white">
                  <p className="text-[10px] font-bold uppercase mb-2 opacity-80">💰 JAMI ({fmt(calc.q)} dona)</p>
                  <div className="text-center py-2">
                    <div className="text-3xl font-extrabold">{fmt(calc.tAll)}</div>
                    <div className="text-xs opacity-80 mt-0.5">so'm</div>
                  </div>
                  <div className="space-y-1 mt-3 text-xs opacity-90">
                    <div className="flex justify-between"><span>📄 Qog'oz</span><span>{fmt(calc.tPaper)} so'm</span></div>
                    <div className="flex justify-between"><span>🖨️ Bosma</span><span>{fmt(calc.tPrint)} so'm</span></div>
                    <div className="flex justify-between"><span>🧴 Yelim</span><span>{fmt(calc.tGlue)} so'm</span></div>
                    <div className="flex justify-between"><span>✂️ Kesish</span><span>{fmt(calc.tCut)} so'm</span></div>
                    <div className="border-t border-white/20 pt-1 flex justify-between font-bold">
                      <span>1 dona o'rtacha</span>
                      <span>{fmt(calc.tBox)} so'm</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <Calculator className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">O'lchamlarni kiriting</p>
                <p className="text-xs mt-1">Natija avtomatik hisoblanadi</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
