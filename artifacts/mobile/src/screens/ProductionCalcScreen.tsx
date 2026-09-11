import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions,
} from "react-native";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");
const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => n.toFixed(d);

export default function ProductionCalcScreen() {
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

  const n = (s: string) => parseFloat(s) || 0;
  const hasBox = n(boxL) > 0 && n(boxW) > 0 && n(boxH) > 0;

  const calc = useMemo(() => {
    const L = n(boxL), W = n(boxW), H = n(boxH);
    const pwKg = n(paperWeightKg);
    const p1 = n(priceLayer1), p2 = n(priceLayer2), p3 = n(priceLayer3);
    const w = n(wastePercent), q = n(quantity);
    const k = n(coefficient);

    if (L <= 0 || W <= 0 || H <= 0 || pwKg <= 0 || q <= 0) return null;

    const blankLen = 2 * (W + L) + 6;
    const flapH = L / 2;
    const blankW = 1 + flapH + H + flapH + 1;
    const netAreaM2 = (blankLen * blankW) / 10000;

    const l1Weight = netAreaM2 * pwKg;
    const l1Cost = l1Weight * p1;
    const l2Weight = netAreaM2 * pwKg / 0.7;
    const l2Cost = l2Weight * p2;
    const l3Weight = netAreaM2 * pwKg;
    const l3Cost = l3Weight * p3;

    const totalWeight = l1Weight + l2Weight + l3Weight;
    const totalPaperCost = l1Cost + l2Cost + l3Cost;
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
      revenue: Math.round(sellingPrice * q),
      profit: Math.round((sellingPrice - totalPaperCost) * q),
      coefficient: k,
    };
  }, [boxL, boxW, boxH, paperWeightKg, priceLayer1, priceLayer2, priceLayer3, wastePercent, quantity, coefficient]);

  const InputField = useCallback(({ label, value, setValue, placeholder, unit }: {
    label: string; value: string; setValue: (v: string) => void; placeholder: string; unit?: string;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={value} onChangeText={setValue}
          keyboardType="numeric" placeholder={placeholder} placeholderTextColor={colors.textMuted} />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  ), []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧮 Kalkulyatsiya</Text>
          <Text style={styles.headerSub}>Quti ishlab chiqarish xarajatlarini hisoblang</Text>
        </View>

        {/* KORXONA + QUTI NOMI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Korxona & quti nomi</Text>
          <InputField label="Korxona" value={companyName} setValue={setCompanyName} placeholder="Shovot Carton" />
          <InputField label="Quti nomi" value={boxName} setValue={setBoxName} placeholder="RSC quti" />
        </View>

        {/* QUTI O'LCHAMLARI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Quti o'lchamlari (sm)</Text>
          <View style={styles.row}>
            <InputField label="Bo'yi (L)" value={boxL} setValue={setBoxL} placeholder="30" unit="sm" />
            <InputField label="Eni (W)" value={boxW} setValue={setBoxW} placeholder="20" unit="sm" />
            <InputField label="Balandligi (H)" value={boxH} setValue={setBoxH} placeholder="15" unit="sm" />
          </View>
        </View>

        {/* QOG'OG'IZ OG'IRLIGI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📄 Qog'oz og'irligi</Text>
          <InputField label="Og'irlik" value={paperWeightKg} setValue={setPaperWeightKg} placeholder="0.125" unit="kg/m²" />
        </View>

        {/* QATLAM NARXLARI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Har bir qatlam narxi (so'm/kg)</Text>
          <InputField label="1-qatlam (tashqi)" value={priceLayer1} setValue={setPriceLayer1} placeholder="8000" unit="so'm/kg" />
          <InputField label="2-qatlam (gofra)" value={priceLayer2} setValue={setPriceLayer2} placeholder="6000" unit="so'm/kg" />
          <InputField label="3-qatlam (ichki)" value={priceLayer3} setValue={setPriceLayer3} placeholder="7000" unit="so'm/kg" />
        </View>

        {/* MIQDOR */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Miqdor</Text>
          <View style={styles.row}>
            <InputField label="Chiqindi" value={wastePercent} setValue={setWastePercent} placeholder="10" unit="%" />
            <InputField label="Miqdor" value={quantity} setValue={setQuantity} placeholder="1000" unit="dona" />
          </View>
          {calc && (
            <View style={styles.resultSummary}>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryLabel}>Ishlab chiqarish:</Text>
                <Text style={styles.resultSummaryValue}>{fmt(calc.total.paper)} so'm</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={[styles.resultSummaryLabel, { color: "#6366f1" }]}>Daromad:</Text>
                <Text style={[styles.resultSummaryValue, { color: "#6366f1" }]}>{fmt(calc.revenue)} so'm</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={[styles.resultSummaryLabel, { color: colors.danger }]}>Sof foyda:</Text>
                <Text style={[styles.resultSummaryValue, { color: colors.danger }]}>{fmt(calc.profit)} so'm</Text>
              </View>
            </View>
          )}
        </View>

        {/* SOTISH NARXI */}
        <View style={[styles.card, { backgroundColor: "#fffbeb", borderColor: "#fbbf24" }]}>
          <Text style={[styles.cardTitle, { color: "#b45309" }]}>📈 Sotish narxi</Text>
          <InputField label="Koeffitsient" value={coefficient} setValue={setCoefficient} placeholder="1.5" unit="×" />
        </View>

        {/* NATIJALAR */}
        {hasBox && calc ? (
          <>
            {/* KESMA O'LCHAMLARI */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>✂️ Kesma o'lchamlari</Text>
              <View style={styles.dimRow}>
                <View style={styles.dimBox}>
                  <Text style={styles.dimValue}>{calc.blankLen}</Text>
                  <Text style={styles.dimLabel}>sm uzunlik</Text>
                </View>
                <View style={styles.dimBox}>
                  <Text style={styles.dimValue}>{calc.blankW}</Text>
                  <Text style={styles.dimLabel}>sm en</Text>
                </View>
                <View style={[styles.dimBox, { backgroundColor: "#fef3c7" }]}>
                  <Text style={[styles.dimValue, { color: "#d97706" }]}>{calc.netAreaM2}</Text>
                  <Text style={[styles.dimLabel, { color: "#d97706" }]}>m² maydon</Text>
                </View>
              </View>
            </View>

            {/* 3 QATLAMLI JADVAL */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📄 3 qatlamli qog'oz (1 dona uchun)</Text>
              {/* Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Qatlam</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Turi</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { textAlign: "right" }]}>Og'irlik</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { textAlign: "right" }]}>Narx</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, { textAlign: "right" }]}>Summa</Text>
              </View>
              {/* Layer 1 */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { fontWeight: "800", color: "#2563eb" }]}>1</Text>
                <Text style={[styles.tableCell, { color: colors.textSecondary }]}>Tashqi</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{calc.l1.weight} kg</Text>
                <Text style={[styles.tableCell, { textAlign: "right", color: colors.textSecondary }]}>{fmt(calc.l1.price)}</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{fmt(calc.l1.cost)}</Text>
              </View>
              {/* Layer 2 */}
              <View style={[styles.tableRow, { backgroundColor: "#fffbeb" }]}>
                <Text style={[styles.tableCell, { fontWeight: "800", color: "#d97706" }]}>2</Text>
                <Text style={[styles.tableCell, { color: colors.textSecondary }]}>Gofra ÷0.7</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{calc.l2.weight} kg</Text>
                <Text style={[styles.tableCell, { textAlign: "right", color: "#d97706" }]}>{fmt(calc.l2.price)}</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{fmt(calc.l2.cost)}</Text>
              </View>
              {/* Layer 3 */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { fontWeight: "800", color: "#22c55e" }]}>3</Text>
                <Text style={[styles.tableCell, { color: colors.textSecondary }]}>Ichki</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{calc.l3.weight} kg</Text>
                <Text style={[styles.tableCell, { textAlign: "right", color: colors.textSecondary }]}>{fmt(calc.l3.price)}</Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "700" }]}>{fmt(calc.l3.cost)}</Text>
              </View>
              {/* JAMI */}
              <View style={[styles.tableRow, styles.tableFooter]}>
                <Text style={[styles.tableCell, { fontWeight: "800", fontSize: 14 }]}>JAMI</Text>
                <Text style={[styles.tableCell]}></Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "800", fontSize: 14 }]}>{calc.totalWeight} kg</Text>
                <Text style={[styles.tableCell]}></Text>
                <Text style={[styles.tableCell, { textAlign: "right", fontWeight: "800", fontSize: 16, color: colors.primary }]}>{fmt(calc.totalPaperCost)} so'm</Text>
              </View>
            </View>

            {/* NARX CARD'LAR */}
            <View style={styles.priceCardsRow}>
              <View style={[styles.priceCard, { backgroundColor: "#eff6ff", borderColor: "#3b82f6" }]}>
                <Text style={[styles.priceCardLabel, { color: "#2563eb" }]}>Ishlab chiqarish</Text>
                <Text style={[styles.priceCardValue, { color: "#2563eb" }]}>{fmt(calc.perBox.total)}</Text>
                <Text style={[styles.priceCardUnit, { color: "#3b82f6" }]}>so'm / dona</Text>
              </View>
              <View style={[styles.priceCard, { backgroundColor: "#ecfdf5", borderColor: "#22c55e", borderWidth: 2 }]}>
                <Text style={[styles.priceCardLabel, { color: "#16a34a" }]}>Sotish narxi</Text>
                <Text style={[styles.priceCardValue, { color: "#16a34a" }]}>{fmt(calc.sellingPrice)}</Text>
                <Text style={[styles.priceCardUnit, { color: "#22c55e" }]}>so'm / dona</Text>
                <View style={styles.coeffBadge}>
                  <Text style={styles.coeffBadgeText}>× {calc.coefficient}</Text>
                </View>
              </View>
            </View>

            {/* MIQDOR BO'LIMI — DAROMAD + SOF FOYDA */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 {fmt(calc.total.quantity)} dona uchun</Text>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryLabel}>Ishlab chiqarish:</Text>
                <Text style={styles.resultSummaryValue}>{fmt(calc.total.paper)} so'm</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={[styles.resultSummaryLabel, { color: "#6366f1" }]}>Daromad:</Text>
                <Text style={[styles.resultSummaryValue, { color: "#6366f1" }]}>{fmt(calc.revenue)} so'm</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={[styles.resultSummaryLabel, { color: colors.danger }]}>Sof foyda:</Text>
                <Text style={[styles.resultSummaryValue, { color: colors.danger }]}>{fmt(calc.profit)} so'm</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
            <Text style={styles.emptyText}>Quti o'lchamlarini kiriting (sm)</Text>
            <Text style={styles.emptySub}>Eskiz avtomatik chiziladi</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: colors.primary, paddingTop: 12, paddingBottom: 20,
    paddingHorizontal: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: spacing.lg,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginHorizontal: spacing.lg,
    marginBottom: spacing.md, ...shadows.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontWeight: "600", color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  unit: { fontSize: 10, color: colors.textMuted, marginLeft: 6, minWidth: 50 },
  resultSummary: {
    marginTop: spacing.sm, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  resultSummaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4,
  },
  resultSummaryLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  resultSummaryValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  dimRow: { flexDirection: "row", gap: 10 },
  dimBox: {
    flex: 1, backgroundColor: "#f5f3ff", borderRadius: radius.md,
    padding: 12, alignItems: "center",
  },
  dimValue: { fontSize: 18, fontWeight: "800", color: "#7c3aed" },
  dimLabel: { fontSize: 10, color: "#7c3aed", marginTop: 2 },
  tableRow: {
    flexDirection: "row", paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  tableHeader: {
    backgroundColor: colors.surfaceAlt, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tableHeaderText: { fontWeight: "700", color: colors.textSecondary, fontSize: 11 },
  tableCell: { flex: 1, fontSize: 12, color: colors.text, paddingHorizontal: 4 },
  tableFooter: {
    backgroundColor: "#f0fdf4", borderBottomWidth: 0,
    paddingTop: 10,
  },
  priceCardsRow: { flexDirection: "row", gap: 10, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  priceCard: {
    flex: 1, borderRadius: radius.xl, padding: 16, alignItems: "center",
    borderWidth: 1, ...shadows.sm,
  },
  priceCardLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  priceCardValue: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  priceCardUnit: { fontSize: 11, marginTop: 4 },
  coeffBadge: {
    marginTop: 6, backgroundColor: "#dcfce7", paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 20,
  },
  coeffBadgeText: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  emptyState: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  emptySub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
