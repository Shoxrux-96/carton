import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Dimensions,
} from "react-native";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");

interface CalcInput {
  width: string;    // mm
  height: string;   // mm
  length: string;   // mm
  paperWeight: string; // g/m²
  quantity: string;    // dona
  paperPrice: string;  // so'm/kg
  paintPrice: string;  // so'm/m²
}

export default function ProductionCalcScreen() {
  const [inputs, setInputs] = useState<CalcInput>({
    width: "",
    height: "",
    length: "",
    paperWeight: "",
    quantity: "1",
    paperPrice: "",
    paintPrice: "",
  });

  const set = (key: keyof CalcInput, val: string) => setInputs(prev => ({ ...prev, [key]: val }));

  const n = (s: string) => parseFloat(s) || 0;

  const calc = useMemo(() => {
    const w = n(inputs.width) / 1000;   // mm → m
    const h = n(inputs.height) / 1000;
    const l = n(inputs.length) / 1000;
    const pw = n(inputs.paperWeight);   // g/m²
    const qty = n(inputs.quantity);
    const paperPrice = n(inputs.paperPrice); // so'm/kg
    const paintPrice = n(inputs.paintPrice); // so'm/m²

    // 1 dona mahsulotning yuzasi (tomonlari) — quti uchun 5 ta tomon (pastisiz)
    const oneSurface = 2 * (w * h + w * l + h * l); // m²
    const totalSurface = oneSurface * qty;           // jami m²

    // Qog'oz og'irligi
    const paperWeightPerM2 = pw;                     // g/m²
    const totalPaperWeight = totalSurface * paperWeightPerM2; // gram
    const totalPaperKg = totalPaperWeight / 1000;    // kg

    // Qog'oz narxi
    const paperCost = totalPaperKg * paperPrice;     // so'm

    // Kraska narxi
    const paintCost = totalSurface * paintPrice;     // so'm

    // Jami xarajat
    const totalCost = paperCost + paintCost;

    // 1 dona uchun
    const onePaperCost = oneSurface * paperWeightPerM2 / 1000 * paperPrice;
    const onePaintCost = oneSurface * paintPrice;
    const oneTotalCost = onePaperCost + onePaintCost;

    return {
      oneSurface: oneSurface.toFixed(4),
      totalSurface: totalSurface.toFixed(2),
      totalPaperWeight: Math.round(totalPaperWeight),
      totalPaperKg: totalPaperKg.toFixed(2),
      paperCost: Math.round(paperCost),
      paintCost: Math.round(paintCost),
      totalCost: Math.round(totalCost),
      onePaperCost: Math.round(onePaperCost),
      onePaintCost: Math.round(onePaintCost),
      oneTotalCost: Math.round(oneTotalCost),
      hasData: w > 0 && h > 0 && l > 0 && pw > 0 && qty > 0,
    };
  }, [inputs]);

  const fmt = (n: number) => n.toLocaleString("uz-UZ");

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sarlavha */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧮 Kalkulyatsiya</Text>
          <Text style={styles.headerSub}>Mahsulot ishlab chiqarish xarajatlari</Text>
        </View>

        {/* Mahsulot o'lchamlari */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📐 Mahsulot o'lchamlari (mm)</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Eni</Text>
              <TextInput style={styles.input} value={inputs.width} onChangeText={v => set("width", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>mm</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Bo'yi</Text>
              <TextInput style={styles.input} value={inputs.height} onChangeText={v => set("height", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>mm</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Uzunligi</Text>
              <TextInput style={styles.input} value={inputs.length} onChangeText={v => set("length", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>mm</Text>
            </View>
          </View>
        </View>

        {/* Materiallar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📄 Materiallar</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Qog'oz og'irligi</Text>
              <TextInput style={styles.input} value={inputs.paperWeight} onChangeText={v => set("paperWeight", v)} keyboardType="numeric" placeholder="250" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>g/m²</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Miqdori</Text>
              <TextInput style={styles.input} value={inputs.quantity} onChangeText={v => set("quantity", v)} keyboardType="numeric" placeholder="1" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>dona</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Qog'oz narxi</Text>
              <TextInput style={styles.input} value={inputs.paperPrice} onChangeText={v => set("paperPrice", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>so'm/kg</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Kraska narxi</Text>
              <TextInput style={styles.input} value={inputs.paintPrice} onChangeText={v => set("paintPrice", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>so'm/m²</Text>
            </View>
          </View>
        </View>

        {/* Natija — 1 dona */}
        {calc.hasData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📦 1 dona uchun</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Yuzasi:</Text>
              <Text style={styles.resultValue}>{calc.oneSurface} m²</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Qog'oz:</Text>
              <Text style={styles.resultValue}>{fmt(calc.onePaperCost)} so'm</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Kraska:</Text>
              <Text style={styles.resultValue}>{fmt(calc.onePaintCost)} so'm</Text>
            </View>
            <View style={[styles.resultRow, styles.resultTotal]}>
              <Text style={[styles.resultLabel, styles.totalLabel]}>Jami:</Text>
              <Text style={[styles.resultValue, styles.totalValue]}>{fmt(calc.oneTotalCost)} so'm</Text>
            </View>
          </View>
        )}

        {/* Natija — jami */}
        {calc.hasData && (
          <View style={[styles.card, styles.totalCard]}>
            <Text style={styles.cardTitle}>💰 Jami xarajat ({n(inputs.quantity)} dona)</Text>
            <View style={styles.bigTotal}>
              <Text style={styles.bigTotalValue}>{fmt(calc.totalCost)}</Text>
              <Text style={styles.bigTotalUnit}>so'm</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Jami yuzasi:</Text>
              <Text style={styles.resultValue}>{calc.totalSurface} m²</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Qog'oz og'irligi:</Text>
              <Text style={styles.resultValue}>{calc.totalPaperWeight.toLocaleString()} g ({calc.totalPaperKg} kg)</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Qog'oz xarajati:</Text>
              <Text style={styles.resultValue}>{fmt(calc.paperCost)} so'm</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Kraska xarajati:</Text>
              <Text style={styles.resultValue}>{fmt(calc.paintCost)} so'm</Text>
            </View>
          </View>
        )}

        {!calc.hasData && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🧮</Text>
            <Text style={styles.emptyText}>O'lchamlarni kiriting</Text>
            <Text style={styles.emptySub}>Natija avtomatik hisoblanadi</Text>
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
    backgroundColor: "#f97316", paddingTop: 12, paddingBottom: 20,
    paddingHorizontal: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: spacing.lg,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginHorizontal: spacing.lg,
    marginBottom: spacing.md, ...shadows.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  field: { flex: 1 },
  label: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, fontWeight: "600", color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  unit: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  resultRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  resultLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  resultValue: { fontSize: 13, color: colors.text, fontWeight: "700" },
  resultTotal: { borderBottomWidth: 0, paddingTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 16, fontWeight: "800", color: colors.primary },
  totalCard: { borderColor: colors.primary, borderWidth: 2 },
  bigTotal: { alignItems: "center", paddingVertical: 12 },
  bigTotalValue: { fontSize: 28, fontWeight: "800", color: colors.primary },
  bigTotalUnit: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  emptyState: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  emptySub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
