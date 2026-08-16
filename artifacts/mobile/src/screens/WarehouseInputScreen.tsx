import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

export default function WarehouseInputScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [prods, inv] = await Promise.all([apiFetch("/products"), apiFetch("/inventory")]);
      setProducts(Array.isArray(prods) ? prods : []);
      setInventory(Array.isArray(inv) ? inv : []);
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
      Alert.alert("Muvaffaqiyat", "Omborga kirim qo'shildi ✅");
      setSelectedProduct(0);
      setQuantity("");
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const totalItems = inventory.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.statValue}>{inventory.length}</Text>
          <Text style={styles.statLabel}>Tur</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.statValue}>{totalItems}</Text>
          <Text style={styles.statLabel}>Jami dona</Text>
        </View>
      </View>

      {/* Input form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>📥 Omborga kirim qo'shish</Text>

        <Text style={styles.label}>Mahsulot</Text>
        <View style={styles.pickerWrap}>
          {products.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.productChip, selectedProduct === p.id && styles.productChipActive]}
              onPress={() => setSelectedProduct(p.id)}
            >
              <Text style={[styles.productChipText, selectedProduct === p.id && { color: "#fff" }]}>{p.name}</Text>
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
          <Text style={styles.submitText}>{saving ? "Saqlanmoqda..." : "✅ Omborga kiritish"}</Text>
        </TouchableOpacity>
      </View>

      {/* Current inventory */}
      <Text style={styles.sectionTitle}>📦 Hozirgi ombor holati</Text>
      {inventory.map((item, i) => (
        <View key={i} style={styles.invCard}>
          <View style={styles.invRow}>
            <Text style={styles.invName}>{item.productName || "—"}</Text>
            <Text style={[styles.invQty, item.quantity < 10 && { color: colors.danger }]}>{item.quantity} dona</Text>
          </View>
          {item.price ? <Text style={styles.invPrice}>💰 {item.price.toLocaleString()} so'm/dona</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: spacing.xl },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, ...shadows.sm },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl, ...shadows.md },
  formTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  pickerWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg },
  productChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border },
  productChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  productChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  input: { height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, color: colors.text, backgroundColor: colors.surfaceAlt, marginBottom: spacing.lg },
  submitBtn: { height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  invCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  invRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invName: { fontSize: 14, fontWeight: "600", color: colors.text },
  invQty: { fontSize: 16, fontWeight: "800", color: colors.primary },
  invPrice: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
