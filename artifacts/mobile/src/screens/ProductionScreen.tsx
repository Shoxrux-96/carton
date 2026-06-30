import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert, Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");
const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

const periods = [
  { key: "day", label: "Kun" },
  { key: "month", label: "Oy" },
  { key: "year", label: "Yil" },
];

export default function ProductionScreen() {
  const [summary, setSummary] = useState<any>(null);
  const [byProduct, setByProduct] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [period, setPeriod] = useState("day");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  // Modal form — Production + Warehouse (combined)
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [quantity, setQuantity] = useState("");
  const [prodDate, setProdDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [sum, prods, tx] = await Promise.all([
        apiFetch("/production/summary"),
        apiFetch("/products"),
        apiFetch("/production/transactions"),
      ]);
      setSummary(sum);
      setProducts(Array.isArray(prods) ? prods : []);
      setTransactions(Array.isArray(tx) ? tx : []);
    } catch {}
  };

  const loadByProduct = async () => {
    try {
      const params = `period=${period}&date=${filterDate}`;
      const data = await apiFetch(`/production/by-product?${params}`);
      setByProduct(Array.isArray(data) ? data : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  React.useEffect(() => { loadByProduct(); }, [period, filterDate]);

  const onRefresh = async () => { setRefreshing(true); await load(); await loadByProduct(); setRefreshing(false); };

  const handleSubmit = async () => {
    if (!selectedProduct) { Alert.alert("Xatolik", "Mahsulot tanlang"); return; }
    if (!quantity || Number(quantity) < 1) { Alert.alert("Xatolik", "Miqdor kamida 1 bo'lishi kerak"); return; }
    setSaving(true);
    try {
      const now = new Date();
      const dateTime = `${prodDate}T${now.toTimeString().slice(0, 5)}:00`;
      await apiFetch("/production", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedProduct,
          quantity: Number(quantity),
          productionDate: new Date(dateTime).toISOString(),
        }),
      });
      Alert.alert("Muvaffaqiyat", "Ishlab chiqarildi va omborga kiritildi ✅");
      setShowModal(false);
      setSelectedProduct(0);
      setQuantity("");
      await load();
      await loadByProduct();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const periodLabel = period === "day" ? "kunlik" : period === "month" ? "oylik" : "yillik";

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        {summary && (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: "#ecfdf5" }]}>
              <Text style={styles.summaryIcon}>⏱️</Text>
              <Text style={[styles.summaryVal, { color: "#059669" }]}>{summary.daily?.totalQuantity || 0} ta</Text>
              <Text style={styles.summaryLabel}>Bugun</Text>
              <Text style={styles.summarySub}>{formatSum(summary.daily?.totalSum || 0)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#eef2ff" }]}>
              <Text style={styles.summaryIcon}>📆</Text>
              <Text style={[styles.summaryVal, { color: colors.primary }]}>{summary.monthly?.totalQuantity || 0} ta</Text>
              <Text style={styles.summaryLabel}>Shu oy</Text>
              <Text style={styles.summarySub}>{formatSum(summary.monthly?.totalSum || 0)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#fef3c7" }]}>
              <Text style={styles.summaryIcon}>📊</Text>
              <Text style={[styles.summaryVal, { color: "#d97706" }]}>{summary.yearly?.totalQuantity || 0} ta</Text>
              <Text style={styles.summaryLabel}>Shu yil</Text>
              <Text style={styles.summarySub}>{formatSum(summary.yearly?.totalSum || 0)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#f5f3ff" }]}>
              <Text style={styles.summaryIcon}>🏭</Text>
              <Text style={[styles.summaryVal, { color: "#8b5cf6" }]}>{summary.allTime?.totalQuantity || 0} ta</Text>
              <Text style={styles.summaryLabel}>Jami</Text>
              <Text style={styles.summarySub}>{formatSum(summary.allTime?.totalSum || 0)}</Text>
            </View>
          </View>
        )}

        {/* By product section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mahsulotlar bo'yicha ishlab chiqarish</Text>

          {/* Period filter */}
          <View style={styles.filterRow}>
            {periods.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
                onPress={() => setPeriod(p.key)}
              >
                <Text style={[styles.periodText, period === p.key && { color: "#fff" }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* By product table */}
          {byProduct.length > 0 ? (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Mahsulot</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>{periodLabel}</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: "right" }]}>Summa</Text>
              </View>
              {byProduct.map((item, i) => (
                <View key={item.productId || i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: "700", color: colors.primary }]}>{item.productName}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right", color: colors.success, fontWeight: "700" }]}>+{item.totalQuantity} ta</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, textAlign: "right", fontWeight: "600" }]}>{formatSum(item.totalSum)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptySmall}><Text style={styles.emptyText}>Ma'lumot yo'q</Text></View>
          )}
        </View>

        {/* All transactions (kirim-chiqim) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Barcha kirim-chiqim yozuvlar</Text>

          {transactions.length > 0 ? (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Sana</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Mahsulot</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "right" }]}>Miqdor</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Summa</Text>
              </View>
              {transactions.slice(0, 30).map((tx, i) => (
                <View key={`${tx.type}-${tx.id}-${i}`} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1, color: colors.textMuted, fontSize: 11 }]}>
                    {tx.date ? new Date(tx.date).toLocaleDateString("uz") : "—"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5, fontWeight: "600", color: colors.primary }]}>{tx.productName}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8, textAlign: "right", fontWeight: "700", color: tx.type === "kirim" ? colors.success : colors.danger }]}>
                    {tx.type === "kirim" ? "+" : "-"}{tx.quantity} ta
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right", fontWeight: "600" }]}>{formatSum(tx.totalSum || 0)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptySmall}><Text style={styles.emptyText}>Yozuvlar yo'q</Text></View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modal - Kiritish */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏭 Ishlab chiqarish + Omborga kirim</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Product select */}
            <Text style={styles.modalLabel}>Mahsulot</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {products.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, selectedProduct === p.id && styles.chipActive]}
                  onPress={() => setSelectedProduct(p.id)}
                >
                  <Text style={[styles.chipText, selectedProduct === p.id && { color: "#fff" }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date & Quantity */}
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Sana</Text>
                <TextInput
                  style={styles.modalInput}
                  value={prodDate}
                  onChangeText={setProdDate}
                  placeholder="2024-01-01"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Miqdor</Text>
                <TextInput
                  style={styles.modalInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Selected product info */}
            {selectedProduct > 0 && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedName}>
                  📦 {products.find(p => p.id === selectedProduct)?.name}
                </Text>
                <Text style={styles.selectedPrice}>
                  Narxi: {formatSum(products.find(p => p.id === selectedProduct)?.price || 0)}
                </Text>
                {quantity && Number(quantity) > 0 && (
                  <Text style={styles.selectedTotal}>
                    Jami: {formatSum((products.find(p => p.id === selectedProduct)?.price || 0) * Number(quantity))}
                  </Text>
                )}
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "⏳ Saqlanmoqda..." : "🏭📥 Kiritish"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },

  // Summary
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.xl },
  summaryCard: { width: (width - 48) / 2, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center" },
  summaryIcon: { fontSize: 18, marginBottom: 4 },
  summaryVal: { fontSize: 20, fontWeight: "800" },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  summarySub: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  // Section
  section: { marginBottom: spacing.xxl },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },

  // Filters
  filterRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },

  // Table
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", ...shadows.sm },
  tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHeaderText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tableCell: { fontSize: 13, color: colors.text },

  emptySmall: { padding: 30, alignItems: "center" },
  emptyText: { color: colors.textMuted, fontSize: 13 },

  // FAB
  fab: {
    position: "absolute", bottom: 24, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary, justifyContent: "center", alignItems: "center",
    ...shadows.lg, zIndex: 100,
  },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted, padding: 4 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, marginTop: spacing.md },
  chipScroll: { marginBottom: spacing.md },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginRight: 8, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  modalRow: { flexDirection: "row", gap: 12 },
  modalInput: { height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, color: colors.text, backgroundColor: colors.surfaceAlt },
  selectedInfo: { backgroundColor: "#eef2ff", borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  selectedName: { fontSize: 14, fontWeight: "700", color: colors.primary },
  selectedPrice: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  selectedTotal: { fontSize: 15, fontWeight: "800", color: colors.success, marginTop: 4 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xxl },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
