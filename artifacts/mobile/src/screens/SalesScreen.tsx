import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

export default function SalesScreen() {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all"|"day"|"month"|"year">("all");

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        apiFetch("/sales"), apiFetch("/products"),
      ]);
      setSales(Array.isArray(s) ? s : []);
      setProducts(Array.isArray(p) ? p : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const enriched = useMemo(() => {
    return sales.map(s => {
      const product = products.find(p => p.id === s.productId);
      return { ...s, totalSum: s.quantity * (product?.price || 0), productPrice: product?.price || 0 };
    }).sort((a: any, b: any) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [sales, products]);

  const filtered = useMemo(() => {
    if (dateFilter === "all") return enriched;
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = today.slice(0, 7);
    const thisYear = today.slice(0, 4);
    return enriched.filter((s: any) => {
      const d = s.soldAt ? s.soldAt.split("T")[0] : "";
      if (dateFilter === "day") return d === today;
      if (dateFilter === "month") return d.startsWith(thisMonth);
      if (dateFilter === "year") return d.startsWith(thisYear);
      return true;
    });
  }, [enriched, dateFilter]);

  const totalQty = filtered.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalSum = filtered.reduce((s, r) => s + (r.totalSum || 0), 0);

  return (
    <View style={st.container}>
      <ScrollView style={st.scroll} contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Date filter */}
        <View style={st.filterRow}>
          {([["all","Barcha"],["day","Kun"],["month","Oy"],["year","Yil"]] as const).map(([k,l]) => (
            <TouchableOpacity key={k} style={[st.filterBtn, dateFilter === k && st.filterActive]} onPress={() => setDateFilter(k)}>
              <Text style={[st.filterText, dateFilter === k && { color: "#fff" }]}>{l}</Text>
            </TouchableOpacity>
          ))}
          <Text style={st.countText}>{filtered.length} ta</Text>
        </View>

        {/* Table */}
        {filtered.length > 0 ? (
          <View style={st.table}>
            <View style={st.thead}>
              <Text style={[st.th, { flex: 1 }]}>Sana</Text>
              <Text style={[st.th, { flex: 1.5 }]}>Mahsulot</Text>
              <Text style={[st.th, { flex: 0.6, textAlign: "right" }]}>Miqdor</Text>
              <Text style={[st.th, { flex: 1, textAlign: "right" }]}>Summa</Text>
            </View>
            {filtered.map((r: any, i: number) => (
              <View key={r.id ?? `${r.productName ?? "sale"}-${i}`} style={st.tr}>
                <Text style={[st.td, { flex: 1, fontSize: 11, color: colors.textMuted }]}>
                  {r.soldAt ? new Date(r.soldAt).toLocaleDateString("uz") : "—"}
                </Text>
                <Text style={[st.td, { flex: 1.5, fontWeight: "700", color: colors.primary }]} numberOfLines={1}>{r.productName || "—"}</Text>
                <Text style={[st.td, { flex: 0.6, textAlign: "right", fontWeight: "700", color: colors.danger }]}>-{r.quantity}</Text>
                <Text style={[st.td, { flex: 1, textAlign: "right", fontWeight: "600" }]}>{formatSum(r.totalSum)}</Text>
              </View>
            ))}
            <View style={st.totalRow}>
              <Text style={st.totalLabel}>Jami: {totalQty} dona</Text>
              <Text style={st.totalValue}>{formatSum(totalSum)}</Text>
            </View>
          </View>
        ) : (
          <View style={st.empty}>
            <Text style={{ fontSize: 40 }}>📊</Text>
            <Text style={st.emptyTitle}>Sotuv yozuvlari yo'q</Text>
            <Text style={st.emptyDesc}>Buyurtma yetkazilganda avtomatik qo'shiladi</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  countText: { fontSize: 11, color: colors.textMuted, marginLeft: "auto" },
  table: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", ...shadows.sm },
  thead: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { fontSize: 9, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: colors.border, alignItems: "center" },
  td: { fontSize: 12, color: colors.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: "800", color: colors.primary },
  empty: { padding: 60, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.textMuted, marginTop: 8 },
  emptyDesc: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 4 },
});
