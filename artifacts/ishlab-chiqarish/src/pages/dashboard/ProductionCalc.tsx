import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator, Package, Scissors, Printer, Droplets, TrendingUp } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("uz-UZ");

interface CalcInput {
  boxLength: string;
  boxWidth: string;
  boxHeight: string;
  paperWeight: string;
  paperPriceKg: string;
  printColors: string;
  printPriceM2: string;
  gluePricePerBox: string;
  cuttingPricePerBox: string;
  wastePercent: string;
  quantity: string;
}

const defaultValues: CalcInput = {
  boxLength: "", boxWidth: "", boxHeight: "",
  paperWeight: "", paperPriceKg: "",
  printColors: "1", printPriceM2: "",
  gluePricePerBox: "", cuttingPricePerBox: "",
  wastePercent: "10", quantity: "1000",
};

export default function ProductionCalc() {
  const [inputs, setInputs] = useState<CalcInput>(defaultValues);
  const set = (key: keyof CalcInput, val: string) => setInputs(prev => ({ ...prev, [key]: val }));
  const n = (s: string) => parseFloat(s) || 0;

  const calc = useMemo(() => {
    const L = n(inputs.boxLength) / 1000;
    const W = n(inputs.boxWidth) / 1000;
    const H = n(inputs.boxHeight) / 1000;
    const pw = n(inputs.paperWeight);
    const paperPrice = n(inputs.paperPriceKg);
    const printColorsN = parseInt(inputs.printColors) || 0;
    const printPrice = n(inputs.printPriceM2);
    const gluePrice = n(inputs.gluePricePerBox);
    const cuttingPrice = n(inputs.cuttingPricePerBox);
    const waste = n(inputs.wastePercent);
    const qty = n(inputs.quantity);

    if (L <= 0 || W <= 0 || H <= 0 || pw <= 0 || qty <= 0) return null;

    const scoringFlap = 0.030;
    const topFlap = W * 0.75;
    const bottomFlap = W * 0.75;
    const blankLength = 2 * (L + W) + scoringFlap;
    const blankWidth = H + topFlap + bottomFlap;
    const netArea = blankLength * blankWidth;
    const grossArea = netArea * (1 + waste / 100);
    const paperWeightGram = grossArea * pw;
    const paperWeightKg = paperWeightGram / 1000;
    const paperCost = paperWeightKg * paperPrice;
    const printCost = grossArea * printPrice * printColorsN;
    const glueCost = gluePrice;
    const cuttingCost = cuttingPrice;
    const totalPerBox = paperCost + printCost + glueCost + cuttingCost;

    return {
      blank: { lengthMM: Math.round(blankLength * 1000), widthMM: Math.round(blankWidth * 1000), area: +netArea.toFixed(4), grossArea: +grossArea.toFixed(4) },
      paper: { weightGram: Math.round(paperWeightGram), weightKg: +paperWeightKg.toFixed(4), costPerBox: Math.round(paperCost) },
      printing: { area: +grossArea.toFixed(4), colors: printColorsN, costPerBox: Math.round(printCost) },
      glue: { costPerBox: Math.round(glueCost) },
      cutting: { costPerBox: Math.round(cuttingCost) },
      perBox: { paper: Math.round(paperCost), printing: Math.round(printCost), glue: Math.round(glueCost), cutting: Math.round(cuttingCost), total: Math.round(totalPerBox) },
      total: { quantity: qty, paper: Math.round(paperCost * qty), printing: Math.round(printCost * qty), glue: Math.round(glueCost * qty), cutting: Math.round(cuttingCost * qty), grandTotal: Math.round(totalPerBox * qty) },
    };
  }, [inputs]);

  const field = (label: string, key: keyof CalcInput, placeholder: string, unit: string) => (
    <div>
      <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{label}</label>
      <div className="relative">
        <Input type="number" value={inputs[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} className="h-11 pr-12" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Quti o'lchamlari */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="p-5 border-b border-border/50 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Quti o'lchamlari (ichki)</h3>
        </div>
        <div className="p-5">
          <p className="text-xs text-muted-foreground mb-4">Eni, bo'yi, uzunligi — mm da kiriting</p>
          <div className="grid grid-cols-3 gap-4">
            {field("Bo'yi (L)", "boxLength", "300", "mm")}
            {field("Eni (W)", "boxWidth", "200", "mm")}
            {field("Bo'yi (H)", "boxHeight", "150", "mm")}
          </div>
        </div>
      </Card>

      {/* Qog'oz */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="p-5 border-b border-border/50 flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold">Qog'oz</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            {field("Og'irligi", "paperWeight", "250", "g/m²")}
            {field("Narxi", "paperPriceKg", "12000", "so'm/kg")}
          </div>
        </div>
      </Card>

      {/* Bosma */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="p-5 border-b border-border/50 flex items-center gap-2">
          <Printer className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold">Bosma (chop etish)</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            {field("Ranglar soni", "printColors", "1", "dona")}
            {field("Narxi", "printPriceM2", "500", "so'm/m²")}
          </div>
          <p className="text-xs text-muted-foreground mt-2">0 = bosmasiz (oddiy quti)</p>
        </div>
      </Card>

      {/* Qo'shimcha xarajatlar */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="p-5 border-b border-border/50 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-bold">Qo'shimcha xarajatlar</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {field("Yelim", "gluePricePerBox", "50", "so'm/dona")}
            {field("Kesish", "cuttingPricePerBox", "30", "so'm/dona")}
            {field("Chiqindi %", "wastePercent", "10", "%")}
            {field("Miqdori", "quantity", "1000", "dona")}
          </div>
        </div>
      </Card>

      {/* NATIJA */}
      {calc && (
        <>
          {/* Kesma o'lchamlari */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="p-5 border-b border-border/50 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-violet-500" />
              <h3 className="text-lg font-bold">Kesma (blank) o'lchamlari</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{calc.blank.lengthMM}</div>
                  <div className="text-xs text-muted-foreground mt-1">Uzunligi (mm)</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{calc.blank.widthMM}</div>
                  <div className="text-xs text-muted-foreground mt-1">Kengligi (mm)</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <div className="text-2xl font-bold text-amber-500">{calc.blank.area}</div>
                  <div className="text-xs text-muted-foreground mt-1">Sof maydon (m²)</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <div className="text-2xl font-bold text-orange-500">{calc.blank.grossArea}</div>
                  <div className="text-xs text-muted-foreground mt-1">Chiqindi bilan (m²)</div>
                </div>
              </div>
            </div>
          </Card>

          {/* 1 dona + Jami */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1 dona */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="p-5 border-b border-border/50">
                <h3 className="text-lg font-bold">📦 1 dona uchun xarajat</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">📄 Qog'oz ({calc.paper.weightGram}g = {calc.paper.weightKg}kg)</span>
                  <span className="font-bold">{fmt(calc.perBox.paper)} so'm</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">🖨️ Bosma ({calc.printing.colors} rang)</span>
                  <span className="font-bold">{fmt(calc.perBox.printing)} so'm</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">🧴 Yelim</span>
                  <span className="font-bold">{fmt(calc.perBox.glue)} so'm</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">✂️ Kesish</span>
                  <span className="font-bold">{fmt(calc.perBox.cutting)} so'm</span>
                </div>
                <div className="flex justify-between items-center pt-3">
                  <span className="text-base font-bold">1 dona jami:</span>
                  <span className="text-xl font-extrabold text-primary">{fmt(calc.perBox.total)} so'm</span>
                </div>
              </div>
            </Card>

            {/* Jami xarajat */}
            <Card className="overflow-hidden border-0 shadow-lg border-2 border-primary">
              <div className="p-5 border-b border-border/50 bg-primary/5">
                <h3 className="text-lg font-bold">💰 Jami xarajat ({fmt(calc.total.quantity)} dona)</h3>
              </div>
              <div className="p-5">
                <div className="text-center py-6">
                  <div className="text-4xl font-extrabold text-primary">{fmt(calc.total.grandTotal)}</div>
                  <div className="text-sm text-muted-foreground mt-1">so'm</div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">📄 Qog'oz:</span>
                    <span className="font-semibold">{fmt(calc.total.paper)} so'm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">🖨️ Bosma:</span>
                    <span className="font-semibold">{fmt(calc.total.printing)} so'm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">🧴 Yelim:</span>
                    <span className="font-semibold">{fmt(calc.total.glue)} so'm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">✂️ Kesish:</span>
                    <span className="font-semibold">{fmt(calc.total.cutting)} so'm</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold">1 dona o'rtacha:</span>
                      <span className="font-extrabold text-primary">{fmt(calc.perBox.total)} so'm</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {!calc && (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="p-16 text-center">
            <Calculator className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-lg font-medium text-muted-foreground">O'lchamlarni kiriting</p>
            <p className="text-sm text-muted-foreground mt-1">Natija avtomatik hisoblanadi</p>
          </div>
        </Card>
      )}
    </div>
  );
}
