import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

interface SaleItem { productId: number; name: string; quantity: number; price: number; }

export default function SalesScreen() {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all"|"day"|"month"|"year">("all");

  const [items, setItems] = useState<SaleItem[]>([{ productId: 0, name: "", quantity: 1, price: 0 }]);
  const [selectedClientId, setSelectedClientId] = useState<number>(0);

  const load = async () => {
    try {
      const [s, p, c] = await Promise.all([
        apiFetch("/sales"), apiFetch("/products"), apiFetch("/clients"),
      ]);
      setSales(Array.isArray(s) ? s : []);
      setProducts(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
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

  const resetForm = () => { setItems([{ productId: 0, name: "", quantity: 1, price: 0 }]); setSelectedClientId(0); };
  const addItem = () => setItems([...items, { productId: 0, name: "", quantity: 1, price: 0 }]);
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const selectProduct = (idx: number, pid: number) => {
    const p = products.find((pr: any) => pr.id === pid);
    if (p) setItems(items.map((item, i) => i === idx ? { ...item, productId: p.id, name: p.name, price: p.price || 0 } : item));
  };
  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.price, 0);

  const submitSale = async () => {
    const valid = items.filter(i => i.productId && i.quantity > 0);
    if (valid.length === 0) { Alert.alert("Xatolik", "Mahsulot tanlang"); return; }
    setSaving(true);
    try {
      for (const item of valid) {
        await apiFetch("/sales", { method: "POST", body: JSON.stringify({ productId: item.productId, quantity: item.quantity, warehouseId: 1 }) });
      }
      Alert.alert("Muvaffaqiyat", "Sotuv kiritildi ✅");
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

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
              <Text style={[st.th, { flex: 0.9 }]}>Sana</Text>
              <Text style={[st.th, { flex: 1.3 }]}>Mahsulot</Text>
              <Text style={[st.th, { flex: 0.6, textAlign: "right" }]}>Miqdor</Text>
              <Text style={[st.th, { flex: 1, textAlign: "right" }]}>Summa</Text>
              <Text style={[st.th, { flex: 0.7, textAlign: "center" }]}>Turi</Text>
            </View>
            {filtered.map((r: any, i: number) => (
              <View key={r.id || i} style={st.tr}>
                <Text style={[st.td, { flex: 0.9, fontSize: 10, color: colors.textMuted }]}>
                  {r.soldAt ? new Date(r.soldAt).toLocaleDateString("uz") : "—"}
                </Text>
                <Text style={[st.td, { flex: 1.3, fontWeight: "700", color: colors.primary }]} numberOfLines={1}>{r.productName || "—"}</Text>
                <Text style={[st.td, { flex: 0.6, textAlign: "right", fontWeight: "700", color: colors.danger }]}>-{r.quantity}</Text>
                <Text style={[st.td, { flex: 1, textAlign: "right", fontWeight: "600" }]}>{formatSum(r.totalSum)}</Text>
                <View style={{ flex: 0.7, alignItems: "center" }}>
                  <View style={[st.typeBadge, { backgroundColor: "#dcfce7" }]}>
                    <Text style={[st.typeText, { color: "#16a34a" }]}>Sotuv</Text>
                  </View>
                </View>
              </View>
            ))}
            {/* Total row */}
            <View style={st.totalRow}>
              <Text style={st.totalLabel}>Jami: {totalQty} dona</Text>
              <Text style={st.totalValue}>{formatSum(totalSum)}</Text>
            </View>
          </View>
        ) : (
          <View style={st.empty}>
            <Text style={{ fontSize: 40 }}>📊</Text>
            <Text style={st.emptyTitle}>Sotuv yozuvlari yo'q</Text>
            <Text style={st.emptyDesc}>Buyurtma yetkazilganda yoki qo'lda kiritilganda ko'rinadi</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={st.fab} onPress={() => { resetForm(); setShowModal(true); }} activeOpacity={0.8}>
        <Text style={st.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <ScrollView style={st.modalScroll} contentContainerStyle={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>📊 Sotuvni ro'yxatga olish</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={st.modalClose}>✕</Text></TouchableOpacity>
            </View>

            {/* Items */}
            <View style={st.section}>
              <View style={st.sectionHead}>
                <Text style={st.label}>Mahsulotlar</Text>
                <TouchableOpacity onPress={addItem} style={st.addBtn}><Text style={st.addBtnText}>+ Qo'shish</Text></TouchableOpacity>
              </View>
              {items.map((item, idx) => (
                <View key={idx} style={st.itemCard}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {products.map(p => (
                      <TouchableOpacity key={p.id} style={[st.chip, item.productId === p.id && st.chipActive]} onPress={() => selectProduct(idx, p.id)}>
                        <Text style={[st.chipText, item.productId === p.id && { color: "#fff" }]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={st.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.mini}>Miqdor</Text>
                      <TextInput style={st.itemInput} value={String(item.quantity)} onChangeText={v => updateItem(idx, "quantity", Math.max(1, Number(v) || 0))} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.mini}>Narxi</Text>
                      <TextInput style={st.itemInput} value={String(item.price)} onChangeText={v => updateItem(idx, "price", Math.max(0, Number(v) || 0))} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                    </View>
                    <Text style={st.itemSum}>{formatSum(item.quantity * item.price)}</Text>
                    {items.length > 1 && <TouchableOpacity onPress={() => removeItem(idx)}><Text>🗑️</Text></TouchableOpacity>}
                  </View>
                </View>
              ))}
              <View style={st.sumRow}>
                <Text style={st.sumLabel}>Jami:</Text>
                <Text style={st.sumValue}>{formatSum(itemsTotal)}</Text>
              </View>
            </View>

            {/* Client */}
            <Text style={st.label}>Mijoz</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {clients.filter(c => c.type === "customer").map(c => (
                <TouchableOpacity key={c.id} style={[st.chip, selectedClientId === c.id && st.chipActive]} onPress={() => setSelectedClientId(c.id)}>
                  <Text style={[st.chipText, selectedClientId === c.id && { color: "#fff" }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedClient && <Text style={st.clientInfo}>📞 {selectedClient.phone || "—"}</Text>}

            <View style={st.actions}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setShowModal(false)}><Text style={st.cancelText}>Bekor</Text></TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={submitSale} disabled={saving}><Text style={st.saveText}>{saving ? "⏳..." : "✅ Sotish"}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 9, fontWeight: "700" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: "800", color: colors.primary },
  empty: { padding: 60, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.textMuted, marginTop: 8 },
  emptyDesc: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 4 },
  fab: { position: "absolute", bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.lg, zIndex: 100 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalScroll: { maxHeight: "90%", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: spacing.xxl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted },
  section: { marginBottom: spacing.lg },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 6 },
  addBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  addBtnText: { fontSize: 11, fontWeight: "600", color: colors.primary },
  itemCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  itemRow: { flexDirection: "row", gap: 6, alignItems: "flex-end" },
  mini: { fontSize: 9, fontWeight: "600", color: colors.textMuted, marginBottom: 3 },
  itemInput: { height: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  itemSum: { fontSize: 12, fontWeight: "700", color: colors.primary, minWidth: 65, textAlign: "right", paddingBottom: 8 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 },
  sumLabel: { fontSize: 12, color: colors.textSecondary },
  sumValue: { fontSize: 16, fontWeight: "800", color: colors.primary },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surface, marginRight: 6, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, fontWeight: "600", color: colors.text },
  clientInfo: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 50, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 50, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
