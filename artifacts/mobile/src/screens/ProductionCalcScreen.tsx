import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions,
} from "react-native";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");

interface CalcInput {
  // Quti o'lchamlari (mm)
  boxLength: string;
  boxWidth: string;
  boxHeight: string;
  // Qog'oz
  paperWeight: string;   // g/m²
  paperPriceKg: string;  // so'm/kg
  // Bosma
  printColors: string;    // ranglar soni
  printPriceM2: string;   // so'm/m² rang uchun
  // Xarajatlar
  gluePricePerBox: string;    // so'm/dona
  cuttingPricePerBox: string; // so'm/dona
  wastePercent: string;       // %
  // Miqdor
  quantity: string;
}

const defaultValues: CalcInput = {
  boxLength: "", boxWidth: "", boxHeight: "",
  paperWeight: "", paperPriceKg: "",
  printColors: "1", printPriceM2: "",
  gluePricePerBox: "", cuttingPricePerBox: "",
  wastePercent: "10",
  quantity: "1000",
};

export default function ProductionCalcScreen() {
  const [inputs, setInputs] = useState<CalcInput>(defaultValues);

  const set = useCallback((key: keyof CalcInput, val: string) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  }, []);

  const n = (s: string) => parseFloat(s) || 0;

  // Oddiy (offline) kalkulyatsiya — API'siz
  const calc = useMemo(() => {
    const L = n(inputs.boxLength) / 1000;   // mm → m
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

    if (L <= 0 || W <= 0 || H <= 0 || pw <= 0 || qty <= 0) {
      return null;
    }

    // Kesma (blank) o'lchamlari — RSC quti
    const scoringFlap = 0.030; // 30mm yelim chok
    const topFlap = W * 0.75;
    const bottomFlap = W * 0.75;

    const blankLength = 2 * (L + W) + scoringFlap;
    const blankWidth = H + topFlap + bottomFlap;

    // Maydon
    const netArea = blankLength * blankWidth;
    const grossArea = netArea * (1 + waste / 100);

    // Qog'oz
    const paperWeightGram = grossArea * pw;
    const paperWeightKg = paperWeightGram / 1000;
    const paperCost = paperWeightKg * paperPrice;

    // Bosma
    const printArea = grossArea;
    const printCost = printArea * printPrice * printColorsN;

    // Yelim + kesish
    const glueCost = gluePrice;
    const cuttingCost = cuttingPrice;

    // Jami
    const totalPerBox = paperCost + printCost + glueCost + cuttingCost;

    return {
      blank: {
        lengthMM: Math.round(blankLength * 1000),
        widthMM: Math.round(blankWidth * 1000),
        area: +netArea.toFixed(4),
        grossArea: +grossArea.toFixed(4),
      },
      paper: {
        weightGram: Math.round(paperWeightGram),
        weightKg: +paperWeightKg.toFixed(4),
        costPerBox: Math.round(paperCost),
      },
      printing: {
        area: +printArea.toFixed(4),
        colors: printColorsN,
        costPerBox: Math.round(printCost),
      },
      glue: { costPerBox: Math.round(glueCost) },
      cutting: { costPerBox: Math.round(cuttingCost) },
      perBox: {
        paper: Math.round(paperCost),
        printing: Math.round(printCost),
        glue: Math.round(glueCost),
        cutting: Math.round(cuttingCost),
        total: Math.round(totalPerBox),
      },
      total: {
        quantity: qty,
        paper: Math.round(paperCost * qty),
        printing: Math.round(printCost * qty),
        glue: Math.round(glueCost * qty),
        cutting: Math.round(cuttingCost * qty),
        grandTotal: Math.round(totalPerBox * qty),
      },
    };
  }, [inputs]);

  const fmt = (n: number) => n.toLocaleString("uz-UZ");

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sarlavha */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧮 Ishlab chiqarish kalkulyatsiyasi</Text>
          <Text style={styles.headerSub}>Quti ishlab chiqarish xarajatlarini hisoblang</Text>
        </View>

        {/* Quti o'lchamlari */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📐 Quti o'lchamlari (ichki)</Text>
          <Text style={styles.hint}>Eni, bo'yi, uzunligi — mm da kiriting</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Bo'yi (L)</Text>
              <TextInput style={styles.input} value={inputs.boxLength} onChangeText={v => set("boxLength", v)} keyboardType="numeric" placeholder="300" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>mm</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Eni (W)</Text>
              <TextInput style={styles.input} value={inputs.boxWidth} onChangeText={v => set("boxWidth", v)} keyboardType="numeric" placeholder="200" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>mm</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Bo'yi (H)</Text>
              <TextInput style={styles.input} value={inputs.boxHeight} onChangeText={v => set("boxHeight", v)} keyboardType="numeric" placeholder="150" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>mm</Text>
            </View>
          </View>
        </View>

        {/* Qog'oz */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📄 Qog'oz</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Og'irligi</Text>
              <TextInput style={styles.input} value={inputs.paperWeight} onChangeText={v => set("paperWeight", v)} keyboardType="numeric" placeholder="250" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>g/m²</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Narxi</Text>
              <TextInput style={styles.input} value={inputs.paperPriceKg} onChangeText={v => set("paperPriceKg", v)} keyboardType="numeric" placeholder="12000" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>so'm/kg</Text>
            </View>
          </View>
        </View>

        {/* Bosma */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🖨️ Bosma (chop etish)</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Ranglar soni</Text>
              <TextInput style={styles.input} value={inputs.printColors} onChangeText={v => set("printColors", v)} keyboardType="numeric" placeholder="1" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>dona</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Narxi</Text>
              <TextInput style={styles.input} value={inputs.printPriceM2} onChangeText={v => set("printPriceM2", v)} keyboardType="numeric" placeholder="500" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>so'm/m²</Text>
            </View>
          </View>
          <Text style={styles.hint}>0 = bosmasiz (oddiy quti)</Text>
        </View>

        {/* Qo'shimcha xarajatlar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Qo'shimcha xarajatlar</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Yelim</Text>
              <TextInput style={styles.input} value={inputs.gluePricePerBox} onChangeText={v => set("gluePricePerBox", v)} keyboardType="numeric" placeholder="50" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>so'm/dona</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Kesish</Text>
              <TextInput style={styles.input} value={inputs.cuttingPricePerBox} onChangeText={v => set("cuttingPricePerBox", v)} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>so'm/dona</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Chiqindi %</Text>
              <TextInput style={styles.input} value={inputs.wastePercent} onChangeText={v => set("wastePercent", v)} keyboardType="numeric" placeholder="10" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>%</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Miqdori</Text>
              <TextInput style={styles.input} value={inputs.quantity} onChangeText={v => set("quantity", v)} keyboardType="numeric" placeholder="1000" placeholderTextColor={colors.textMuted} />
              <Text style={styles.unit}>dona</Text>
            </View>
          </View>
        </View>

        {/* NATIJA */}
        {calc ? (
          <>
            {/* Kesma o'lchamlari */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>✂️ Kesma (blank) o'lchamlari</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Uzunligi:</Text>
                <Text style={styles.resultValue}>{calc.blank.lengthMM} mm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Kengligi:</Text>
                <Text style={styles.resultValue}>{calc.blank.widthMM} mm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Sof maydon:</Text>
                <Text style={styles.resultValue}>{calc.blank.area} m²</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Chiqindi bilan:</Text>
                <Text style={styles.resultValue}>{calc.blank.grossArea} m²</Text>
              </View>
            </View>

            {/* 1 dona uchun */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📦 1 dona uchun xarajat</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>📄 Qog'oz ({calc.paper.weightGram}g = {calc.paper.weightKg}kg):</Text>
                <Text style={styles.resultValue}>{fmt(calc.perBox.paper)} so'm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>🖨️ Bosma ({calc.printing.colors} rang):</Text>
                <Text style={styles.resultValue}>{fmt(calc.perBox.printing)} so'm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>🧴 Yelim:</Text>
                <Text style={styles.resultValue}>{fmt(calc.perBox.glue)} so'm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>✂️ Kesish:</Text>
                <Text style={styles.resultValue}>{fmt(calc.perBox.cutting)} so'm</Text>
              </View>
              <View style={[styles.resultRow, styles.resultTotal]}>
                <Text style={[styles.resultLabel, styles.totalLabel]}>1 dona jami:</Text>
                <Text style={[styles.resultValue, styles.totalValue]}>{fmt(calc.perBox.total)} so'm</Text>
              </View>
            </View>

            {/* Jami xarajat */}
            <View style={[styles.card, styles.totalCard]}>
              <Text style={styles.cardTitle}>💰 Jami xarajat ({fmt(calc.total.quantity)} dona)</Text>
              <View style={styles.bigTotal}>
                <Text style={styles.bigTotalValue}>{fmt(calc.total.grandTotal)}</Text>
                <Text style={styles.bigTotalUnit}>so'm</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>📄 Qog'oz:</Text>
                <Text style={styles.resultValue}>{fmt(calc.total.paper)} so'm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>🖨️ Bosma:</Text>
                <Text style={styles.resultValue}>{fmt(calc.total.printing)} so'm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>🧴 Yelim:</Text>
                <Text style={styles.resultValue}>{fmt(calc.total.glue)} so'm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>✂️ Kesish:</Text>
                <Text style={styles.resultValue}>{fmt(calc.total.cutting)} so'm</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { fontWeight: "700" }]}>1 dona o'rtacha:</Text>
                <Text style={[styles.resultValue, { color: colors.primary, fontWeight: "800" }]}>
                  {fmt(calc.perBox.total)} so'm
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginHorizontal: spacing.lg,
    marginBottom: spacing.md, ...shadows.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  hint: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.sm },
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
  resultLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "500", flex: 1 },
  resultValue: { fontSize: 13, color: colors.text, fontWeight: "700", textAlign: "right" },
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
