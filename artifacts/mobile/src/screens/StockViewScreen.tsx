import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

export default function StockViewScreen() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await apiFetch("/inventory");
      setInventory(Array.isArray(data) ? data : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totalItems = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
  const lowStock = inventory.filter(i => i.quantity < 10).length;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.summaryValue}>{inventory.length}</Text>
          <Text style={styles.summaryLabel}>Tur</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.summaryValue}>{totalItems}</Text>
          <Text style={styles.summaryLabel}>Jami miqdor</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.danger }]}>
          <Text style={styles.summaryValue}>{lowStock}</Text>
          <Text style={styles.summaryLabel}>Kam qoldi</Text>
        </View>
      </View>

      {/* Inventory list */}
      {inventory.map((item, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: item.quantity < 10 ? "#fee2e2" : "#ecfdf5" }]}>
              <Text style={styles.icon}>{item.quantity < 10 ? "⚠️" : "📦"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.productName || "—"}</Text>
              <Text style={styles.warehouse}>📍 {item.warehouseName || "Ombor"}</Text>
            </View>
            <View style={styles.qtyWrap}>
              <Text style={[styles.qty, item.quantity < 10 && { color: colors.danger }]}>{item.quantity}</Text>
              <Text style={styles.qtyLabel}>dona</Text>
            </View>
          </View>
          {item.price ? (
            <Text style={styles.price}>💰 Narxi: {item.price.toLocaleString()} so'm</Text>
          ) : null}
        </View>
      ))}

      {inventory.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Ombor bo'sh</Text></View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: spacing.xl },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, ...shadows.sm },
  summaryValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  summaryLabel: { fontSize: 10, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 18 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  warehouse: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  qtyWrap: { alignItems: "center" },
  qty: { fontSize: 20, fontWeight: "800", color: colors.primary },
  qtyLabel: { fontSize: 10, color: colors.textMuted },
  price: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textMuted },
});
