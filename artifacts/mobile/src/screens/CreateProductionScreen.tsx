import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

export default function CreateProductionScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [prods, sum, records] = await Promise.all([
        apiFetch("/products"),
        apiFetch("/production/summary"),
        apiFetch("/production"),
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setSummary(sum);
      setRecentRecords(Array.isArray(records) ? records.slice(-10).reverse() : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity) { Alert.alert("Xatolik", "Mahsulot va miqdor tanlang"); return; }
    setSaving(true);
    try {
      await apiFetch("/production", {
        method: "POST",
        body: JSON.stringify({ productId: selectedProduct, quantity: Number(quantity), productionDate: new Date(date).toISOString() }),
      });
      Alert.alert("Muvaffaqiyat", "Ishlab chiqarish kiritildi ✅");
      setSelectedProduct(0);
      setQuantity("");
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      {/* Summary */}
      {summary && (
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: "#ecfdf5" }]}>
            <Text style={styles.summaryEmoji}>📅</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{summary.daily?.totalQuantity || 0}</Text>
            <Text style={styles.summaryLabel}>Bugun</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#eef2ff" }]}>
            <Text style={styles.summaryEmoji}>📆</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{summary.monthly?.totalQuantity || 0}</Text>
            <Text style={styles.summaryLabel}>Oy</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#fef3c7" }]}>
            <Text style={styles.summaryEmoji}>📊</Text>
            <Text style={[styles.summaryValue, { color: "#d97706" }]}>{summary.yearly?.totalQuantity || 0}</Text>
            <Text style={styles.summaryLabel}>Yil</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#f5f3ff" }]}>
            <Text style={styles.summaryEmoji}>🏭</Text>
            <Text style={[styles.summaryValue, { color: "#8b5cf6" }]}>{summary.allTime?.totalQuantity || 0}</Text>
            <Text style={styles.summaryLabel}>Jami</Text>
          </View>
        </View>
      )}

      {/* Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>🏭 Ishlab chiqarishni kiritish</Text>

        <Text style={styles.label}>Mahsulot tanlang</Text>
        <View style={styles.pickerWrap}>
          {products.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, selectedProduct === p.id && styles.chipActive]}
              onPress={() => setSelectedProduct(p.id)}
            >
              <Text style={[styles.chipText, selectedProduct === p.id && { color: "#fff" }]}>📦 {p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Miqdor (dona)</Text>
        <TextInput
          style={styles.input}
          placeholder="Miqdor kiriting"
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
          <Text style={styles.submitText}>{saving ? "Saqlanmoqda..." : "✅ Kiritish"}</Text>
        </TouchableOpacity>
      </View>

      {/* Recent records */}
      <Text style={styles.sectionTitle}>📋 So'nggi kiritilganlar</Text>
      {recentRecords.map((r) => (
        <View key={r.id} style={styles.recordCard}>
          <View style={styles.recordRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recordName}>{r.productName || "—"}</Text>
              <Text style={styles.recordDate}>📅 {r.productionDate ? new Date(r.productionDate).toLocaleDateString("uz") : "—"}</Text>
            </View>
            <View style={styles.recordQtyWrap}>
              <Text style={styles.recordQty}>+{r.quantity}</Text>
              <Text style={styles.recordQtyLabel}>dona</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.xl },
  summaryCard: { width: "48%", borderRadius: radius.lg, padding: spacing.lg, alignItems: "center" },
  summaryEmoji: { fontSize: 18, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl, ...shadows.md },
  formTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  pickerWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  input: { height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, color: colors.text, backgroundColor: colors.surfaceAlt, marginBottom: spacing.lg },
  submitBtn: { height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  recordCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  recordRow: { flexDirection: "row", alignItems: "center" },
  recordName: { fontSize: 14, fontWeight: "700", color: colors.text },
  recordDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  recordQtyWrap: { alignItems: "center" },
  recordQty: { fontSize: 20, fontWeight: "800", color: colors.success },
  recordQtyLabel: { fontSize: 10, color: colors.textMuted },
});
