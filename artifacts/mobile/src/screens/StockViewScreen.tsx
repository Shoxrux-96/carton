import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TextInput } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const formatCurrency = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

export default function StockViewScreen() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");

  const load = async () => {
    try {
      const data = await apiFetch("/inventory");
      setInventory(Array.isArray(data) ? data : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Web Ombor sahifasidagi filtr bilan bir xil: nom bo'yicha qidiruv + aniq narx
  const filtered = useMemo(() => {
    return inventory.filter(item => {
      if (nameFilter && !(item.productName || "").toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (priceFilter) {
        const p = parseFloat(priceFilter);
        if (!isNaN(p) && item.price !== p) return false;
      }
      return true;
    });
  }, [inventory, nameFilter, priceFilter]);

  // Webdagi kartalar bilan bir xil hisob-kitob
  const typeCount = inventory.length;
  const totalItems = filtered.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalSum = filtered.reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0);
  const lowStock = filtered.filter(i => i.quantity < 10).length;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

      {/* Summary — web bilan bir xil: turlar, jami dona, jami summa, kam qolganlar */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.summaryValue}>{typeCount}</Text>
          <Text style={styles.summaryLabel}>Mahsulot turlari</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.summaryValue}>{totalItems.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Jami dona</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: "#f59e0b" }]}>
          <Text style={[styles.summaryValue, styles.summaryValueSm]}>{formatCurrency(totalSum)}</Text>
          <Text style={styles.summaryLabel}>Jami summa</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.danger }]}>
          <Text style={styles.summaryValue}>{lowStock}</Text>
          <Text style={styles.summaryLabel}>Kam qolganlar</Text>
        </View>
      </View>

      {/* Search — webdagi nom va narx filtri bilan bir xil */}
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { flex: 2 }]}
          value={nameFilter}
          onChangeText={setNameFilter}
          placeholder="Mahsulot nomi"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
        />
        <TextInput
          style={[styles.searchInput, { flex: 1 }]}
          value={priceFilter}
          onChangeText={setPriceFilter}
          placeholder="Narxi"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />
      </View>

      {/* Inventory list */}
      {filtered.map((item, i) => (
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
          <View style={styles.priceRow}>
            {item.price ? (
              <Text style={styles.price}>💰 Narxi: {formatCurrency(item.price)}</Text>
            ) : <View />}
            <Text style={styles.sum}>📊 Summa: {formatCurrency((item.quantity || 0) * (item.price || 0))}</Text>
          </View>
        </View>
      ))}

      {inventory.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Ombor bo'sh</Text></View>
      )}
      {inventory.length > 0 && filtered.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Mahsulot topilmadi</Text></View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg },
  summaryCard: { flexGrow: 1, flexBasis: "47%", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, ...shadows.sm },
  summaryValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  summaryValueSm: { fontSize: 14 },
  summaryLabel: { fontSize: 10, color: colors.textSecondary },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  searchInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: 10, fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.borderLight,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 18 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  warehouse: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  qtyWrap: { alignItems: "center" },
  qty: { fontSize: 20, fontWeight: "800", color: colors.primary },
  qtyLabel: { fontSize: 10, color: colors.textMuted },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm, gap: 8 },
  price: { fontSize: 12, color: colors.textSecondary },
  sum: { fontSize: 12, fontWeight: "700", color: colors.success },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textMuted },
});
