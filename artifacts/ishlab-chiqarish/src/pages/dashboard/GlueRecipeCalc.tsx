import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Ruler, Factory, ClipboardList, AlertTriangle } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "0");
const num = (s: string) => {
  const v = Number(String(s).replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

// Hisoblash me'yorlari — 1 m² uchun (qat'iy)
const NORMS = [
  { key: "starch", icon: "🌾", name: "Krahmal", gPerM2: 10 },
  { key: "dye", icon: "🎨", name: "Kraska (bo'yoq)", gPerM2: 4 },
  { key: "soda", icon: "⚗️", name: "Kaustik soda", gPerM2: 0.6 },
  { key: "borax", icon: "🧴", name: "Bura", gPerM2: 0.52 },
];

function NumField({ label, value, onChange, placeholder, unit }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="relative">
        <Input
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder={placeholder}
          inputMode="decimal"
          className="pr-12"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export default function GlueRecipeCalc() {
  // Ishlab chiqarilgan karton qog'oz
  const [pieceArea, setPieceArea] = useState("");  // bir dona maydoni, m²
  const [pieceQty, setPieceQty] = useState("1");   // miqdori, dona

  // Narxlar (so'm / kg) — qo'lda kiritiladi
  const [pStarch, setPStarch] = useState("");
  const [pDye, setPDye] = useState("");
  const [pSoda, setPSoda] = useState("");
  const [pBorax, setPBorax] = useState("");

  const calc = useMemo(() => {
    const area = num(pieceArea);
    const qty = num(pieceQty);
    const A = area * qty;

    const items = NORMS.map(n => {
      const gTotal = A * n.gPerM2;
      const kg = gTotal / 1000;
      const price =
        n.key === "starch" ? num(pStarch) :
        n.key === "dye" ? num(pDye) :
        n.key === "soda" ? num(pSoda) : num(pBorax);
      const cost = kg * price;
      return { ...n, gTotal, kg, price, cost };
    });

    const total = items.reduce((s, it) => s + it.cost, 0);
    return {
      A, qty, items, total,
      perM2: A > 0 ? total / A : 0,
      perPiece: qty > 0 ? total / qty : 0,
      dryPerM2: NORMS.reduce((s, n) => s + n.gPerM2, 0),
      glueKg: (A * NORMS.reduce((s, n) => s + n.gPerM2, 0)) / 1000,
    };
  }, [pieceArea, pieceQty, pStarch, pDye, pSoda, pBorax]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1) Me'yorlar (qat'iy) */}
      <Card className="p-4 border-0 shadow-lg">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Ruler className="w-4 h-4 text-teal-600" /> Hisoblash me'yorlari (1 m² uchun)</h3>
        <div className="space-y-0">
          {NORMS.map(n => (
            <div key={n.key} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <span className="text-sm font-semibold">{n.icon} {n.name}</span>
              <span className="text-sm font-extrabold text-primary">{fmtD(n.gPerM2, 2)} g / m²</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-orange-50 border border-orange-200 p-2.5 text-center">
          <span className="text-xs font-bold text-orange-700">Jami quruq modda: {fmtD(calc.dryPerM2, 2)} g / m²</span>
        </div>

        {/* 2) Ishlab chiqarilgan mahsulot */}
        <h3 className="font-bold text-sm mt-4 mb-3 flex items-center gap-2"><Factory className="w-4 h-4 text-orange-600" /> Ishlab chiqarilgan karton qog'oz</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Bir dona maydoni" value={pieceArea} onChange={setPieceArea} placeholder="0" unit="m²" />
          <NumField label="Miqdori" value={pieceQty} onChange={setPieceQty} placeholder="1" unit="dona" />
        </div>
        <div className="flex items-center justify-between mt-1 py-1.5 border-t border-border/50">
          <span className="text-sm font-semibold">Jami maydon</span>
          <span className="text-sm font-extrabold text-primary">{fmt(calc.A)} m²</span>
        </div>

        {/* Narxlar — shu kartaning ichida */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs font-bold text-muted-foreground mb-2.5">💰 Narxlar (so'm / kg) — qo'lda kiritiladi</p>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="🌾 Krahmal narxi" value={pStarch} onChange={setPStarch} placeholder="0" unit="so'm" />
            <NumField label="🎨 Kraska narxi" value={pDye} onChange={setPDye} placeholder="0" unit="so'm" />
            <NumField label="⚗️ Kaustik soda narxi" value={pSoda} onChange={setPSoda} placeholder="0" unit="so'm" />
            <NumField label="🧴 Bura narxi" value={pBorax} onChange={setPBorax} placeholder="0" unit="so'm" />
          </div>
        </div>
      </Card>

      {/* 3) Natija — tannarx */}
      <Card className="p-4 border-2 border-green-500/50 bg-green-50/70 shadow-lg">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-green-700"><ClipboardList className="w-4 h-4" /> Ishlatilgan kley va tannarx</h3>

        <div className="flex gap-1 pb-1.5 border-b-2 border-green-300">
          <span className="flex-[2] text-[10px] font-extrabold uppercase text-muted-foreground">Mahsulot</span>
          <span className="flex-[1.1] text-[10px] font-extrabold uppercase text-muted-foreground text-right">Jami</span>
          <span className="flex-[1.1] text-[10px] font-extrabold uppercase text-muted-foreground text-right">Narx</span>
          <span className="flex-[1.2] text-[10px] font-extrabold uppercase text-muted-foreground text-right">Summa</span>
        </div>
        {calc.items.map(it => (
          <div key={it.key} className="flex gap-1 items-center py-2 border-b border-border/40 last:border-0">
            <span className="flex-[2] text-sm">{it.icon} {it.name}</span>
            <span className="flex-[1.1] text-sm text-right">{fmtD(it.kg, 3)} kg</span>
            <span className="flex-[1.1] text-xs text-muted-foreground text-right">{fmt(it.price)}</span>
            <span className="flex-[1.2] text-sm font-bold text-right">{fmt(Math.round(it.cost))}</span>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground mt-1.5">
          g/m² bo'yicha: {NORMS.map(n => `${fmtD(n.gPerM2, 2)} g`).join(" · ")} (1 m² ga)
        </p>

        <div className="mt-3 border-t-2 border-green-300 pt-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-extrabold">JAMI SUMMA (tannarx)</span>
            <span className="text-xl font-extrabold text-green-700">{fmt(Math.round(calc.total))} so'm</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Tannarx (1 m²)</span>
            <span className="text-sm font-bold text-green-700">{fmt(Math.round(calc.perM2))} so'm</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Tannarx (1 dona)</span>
            <span className="text-sm font-bold text-green-700">{fmt(Math.round(calc.perPiece))} so'm</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Jami ishlatilgan kley</span>
            <span className="text-sm font-bold">{fmtD(calc.glueKg, 2)} kg</span>
          </div>
        </div>
        {calc.A === 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">Bir dona maydonini (m²) kiriting — miqdor 1 dona deb olinadi.</p>
        )}
      </Card>

      {/* 5) Nazorat */}
      <Card className="p-4 border border-yellow-300 bg-yellow-50/70 shadow-lg">
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-yellow-700"><AlertTriangle className="w-4 h-4" /> Muhim ko'rsatkichlar (nazorat)</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          <li>• Klеylanish harorati: 56°C – 59°C (yuqori bo'lsa gofra ajralib ketadi)</li>
          <li>• Qovushqoqlilik: ВЗ-4 / ВЗ-246 voronkasi bo'yicha 30 – 45 sekund</li>
          <li>• Ishlatish muddati: tayyorlangan kleyni 24 soat ichida ishlatish tavsiya etiladi</li>
        </ul>
      </Card>
    </div>
  );
}
