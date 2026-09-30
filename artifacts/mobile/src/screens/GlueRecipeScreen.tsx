import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { colors, radius, shadows, spacing } from "../theme";

const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "0");
const num = (s: string) => {
  const v = Number(String(s).replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

// Hisoblash me'yorlari — 1 m² uchun (qat'iy, foydalanuvchi aytgan norma)
const NORMS = [
  { key: "starch", icon: "🌾", name: "Krahmal", gPerM2: 10 },
  { key: "dye", icon: "🎨", name: "Kraska (bo'yoq)", gPerM2: 4 },
  { key: "soda", icon: "⚗️", name: "Kaustik soda", gPerM2: 0.6 },
  { key: "borax", icon: "🧴", name: "Bura", gPerM2: 0.52 },
];

const InputField = ({ label, value, setValue, placeholder, unit }: {
  label: string; value: string; setValue: (v: string) => void; placeholder: string; unit?: string;
}) => (
  <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <View style={s.inputRow}>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={v => setValue(v.replace(/[^\d.,]/g, ""))}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
      {unit ? <Text style={s.unit}>{unit}</Text> : null}
    </View>
  </View>
);

export default function GlueRecipeScreen() {
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
      const gTotal = A * n.gPerM2;               // g
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
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* 1) Hisoblash me'yorlari (qat'iy) */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📏 Hisoblash me'yorlari (1 m² uchun)</Text>
        {NORMS.map((n, i) => (
          <View key={n.key} style={s.normRow}>
            <Text style={s.normName}>{n.icon} {n.name}</Text>
            <Text style={s.normVal}>{fmtD(n.gPerM2, 2)} g / m²</Text>
          </View>
        ))}
        <View style={s.normTotal}>
          <Text style={s.normTotalT}>Jami quruq modda: {fmtD(calc.dryPerM2, 2)} g / m²</Text>
        </View>

        {/* Narxlar — shu kartaning ichida */}
        <View style={s.priceBox}>
          <Text style={s.priceTitle}>💰 Narxlar (so'm / kg) — qo'lda kiritiladi</Text>
          <View style={s.row2}>
            <InputField label="🌾 Krahmal narxi" value={pStarch} setValue={setPStarch} placeholder="0" unit="so'm" />
            <InputField label="🎨 Kraska narxi" value={pDye} setValue={setPDye} placeholder="0" unit="so'm" />
          </View>
          <View style={s.row2}>
            <InputField label="⚗️ Kaustik soda narxi" value={pSoda} setValue={setPSoda} placeholder="0" unit="so'm" />
            <InputField label="🧴 Bura narxi" value={pBorax} setValue={setPBorax} placeholder="0" unit="so'm" />
          </View>
        </View>
      </View>

      {/* 2) Ishlab chiqarilgan mahsulot */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🏭 Ishlab chiqarilgan karton qog'oz</Text>
        <View style={s.row2}>
          <InputField label="Bir dona maydoni" value={pieceArea} setValue={setPieceArea} placeholder="0" unit="m²" />
          <InputField label="Miqdori" value={pieceQty} setValue={setPieceQty} placeholder="1" unit="dona" />
        </View>
        <View style={s.sumRow}>
          <Text style={s.sumLabel}>Jami maydon</Text>
          <Text style={[s.sumValue, { color: colors.primary }]}>{fmt(calc.A)} m²</Text>
        </View>
      </View>

      {/* 3) Natija — tayyor kley mahsulotlari va tannarx */}
      <View style={[s.card, { backgroundColor: "#f0fdf4", borderColor: "#16a34a" }]}>
        <Text style={[s.cardTitle, { color: "#16a34a" }]}>📊 Ishlatilgan kley va tannarx</Text>

        {/* Har bir mahsulot: g/m² → jami → narx → summa */}
        <View style={s.tableHead}>
          <Text style={[s.th, { flex: 2 }]}>Mahsulot</Text>
          <Text style={[s.th, { flex: 1.1, textAlign: "right" }]}>Jami</Text>
          <Text style={[s.th, { flex: 1.1, textAlign: "right" }]}>Narx</Text>
          <Text style={[s.th, { flex: 1.2, textAlign: "right" }]}>Summa</Text>
        </View>
        {calc.items.map(it => (
          <View key={it.key} style={s.tableRow}>
            <Text style={[s.td, { flex: 2 }]} numberOfLines={1}>{it.icon} {it.name}</Text>
            <Text style={[s.td, { flex: 1.1, textAlign: "right" }]}>{fmtD(it.kg, 3)} kg</Text>
            <Text style={[s.tdMuted, { flex: 1.1, textAlign: "right" }]}>{fmt(it.price)}</Text>
            <Text style={[s.tdBold, { flex: 1.2, textAlign: "right" }]}>{fmt(Math.round(it.cost))}</Text>
          </View>
        ))}
        <Text style={s.hint}>g/m² bo'yicha: {NORMS.map(n => `${fmtD(n.gPerM2, 2)} g`).join(" · ")} (1 m² ga)</Text>

        <View style={s.totalBox}>
          <View style={s.sumRow}>
            <Text style={[s.sumLabel, { fontWeight: "800", fontSize: 14 }]}>JAMI SUMMA (tannarx)</Text>
            <Text style={[s.sumValue, { color: "#16a34a", fontSize: 18 }]}>{fmt(Math.round(calc.total))} so'm</Text>
          </View>
          <View style={s.sumRow}>
            <Text style={s.sumLabel}>Tannarx (1 m²)</Text>
            <Text style={[s.sumValue, { color: "#16a34a" }]}>{fmt(Math.round(calc.perM2))} so'm</Text>
          </View>
          <View style={s.sumRow}>
            <Text style={s.sumLabel}>Tannarx (1 dona)</Text>
            <Text style={[s.sumValue, { color: "#16a34a" }]}>{fmt(Math.round(calc.perPiece))} so'm</Text>
          </View>
          <View style={s.sumRow}>
            <Text style={s.sumLabel}>Jami ishlatilgan kley</Text>
            <Text style={s.sumValue}>{fmtD(calc.glueKg, 2)} kg</Text>
          </View>
        </View>
        {calc.A === 0 && (
          <Text style={s.hint}>Bir dona maydonini (m²) kiriting — miqdor 1 dona deb olinadi.</Text>
        )}
      </View>

      <View style={[s.card, { backgroundColor: "#fffbeb", borderColor: "#fbbf24" }]}>
        <Text style={s.cardTitle}>⚠️ Muhim ko'rsatkichlar (nazorat)</Text>
        <Text style={s.ctrlText}>• Klеylanish harorati: 56°C – 59°C (yuqori bo'lsa gofra ajralib ketadi)</Text>
        <Text style={s.ctrlText}>• Qovushqoqlilik: ВЗ-4 / ВЗ-246 voronkasi bo'yicha 30 – 45 sekund</Text>
        <Text style={s.ctrlText}>• Ishlatish muddati: tayyorlangan kleyni 24 soat ichida ishlatish tavsiya etiladi</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    marginHorizontal: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  normRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  normName: { fontSize: 13, fontWeight: "600", color: colors.text },
  normVal: { fontSize: 13, fontWeight: "800", color: colors.primary },
  normTotal: { backgroundColor: "#fff7ed", borderRadius: radius.md, padding: 8, marginTop: 8 },
  normTotalT: { fontSize: 11, fontWeight: "700", color: colors.primaryDark, textAlign: "center" },
  priceBox: {
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  priceTitle: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 },
  row2: { flexDirection: "row", gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1, minWidth: 0, maxWidth: "100%", backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: "600",
    color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  unit: { fontSize: 10, color: colors.textMuted, marginLeft: 6, minWidth: 40 },
  tableHead: {
    flexDirection: "row", gap: 4, paddingBottom: 6, borderBottomWidth: 1.5, borderBottomColor: colors.border,
  },
  th: { fontSize: 9, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row", gap: 4, alignItems: "center",
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  td: { fontSize: 12, color: colors.text },
  tdMuted: { fontSize: 11, color: colors.textMuted },
  tdBold: { fontSize: 12, fontWeight: "700", color: colors.text },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  sumLabel: { fontSize: 13, color: colors.textSecondary },
  sumValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  totalBox: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 8 },
  hint: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
  ctrlText: { fontSize: 12, color: colors.textSecondary, lineHeight: 20, marginBottom: 4 },
});
