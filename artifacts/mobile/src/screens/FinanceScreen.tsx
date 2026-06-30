import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

const categories = ["Sotuv", "Maosh", "Material", "Transport", "Kommunal", "Boshqa"];
const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

export default function FinanceScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "year">("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const load = async () => {
    try {
      const [tx, sum] = await Promise.all([
        apiFetch("/finance"),
        apiFetch("/finance/summary"),
      ]);
      setTransactions(Array.isArray(tx) ? tx : []);
      setSummary(sum);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = useMemo(() => {
    let result = transactions;
    if (filter !== "all") result = result.filter(t => t.type === filter);
    if (periodFilter !== "all") {
      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
      const yearStr = String(selectedYear);
      result = result.filter(t => {
        if (!t.date) return false;
        if (periodFilter === "month") return t.date.startsWith(monthStr);
        if (periodFilter === "year") return t.date.startsWith(yearStr);
        return true;
      });
    }
    return result;
  }, [transactions, filter, periodFilter, selectedMonth, selectedYear]);

  const monthIncome = summary?.monthly?.income || 0;
  const monthExpense = summary?.monthly?.expense || 0;
  const monthProfit = monthIncome - monthExpense;
  const yearIncome = summary?.yearly?.income || 0;
  const yearExpense = summary?.yearly?.expense || 0;
  const yearProfit = yearIncome - yearExpense;

  const resetForm = () => { setFormType("income"); setAmount(""); setCategory(""); setDescription(""); setDate(new Date().toISOString().split("T")[0]); };

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) { Alert.alert("Xatolik", "Summani kiriting"); return; }
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      await apiFetch("/finance", {
        method: "POST",
        body: JSON.stringify({ type: formType, amount: Number(amount), category: category || (formType === "income" ? "Kirim" : "Chiqim"), description, date: today }),
      });
      Alert.alert("Muvaffaqiyat", "Yozuv qo'shildi ✅");
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert("O'chirish", "Bu yozuvni o'chirmoqchimisiz?", [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: async () => {
        try { await apiFetch(`/finance/${id}`, { method: "DELETE" }); await load(); } catch {}
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Monthly summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: "#f0fdf4" }]}>
            <Text style={styles.summaryIcon}>📈</Text>
            <Text style={[styles.summaryValue, { color: "#16a34a" }]}>{formatSum(monthIncome)}</Text>
            <Text style={styles.summaryLabel}>Kirim (oy)</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#fef2f2" }]}>
            <Text style={styles.summaryIcon}>📉</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{formatSum(monthExpense)}</Text>
            <Text style={styles.summaryLabel}>Chiqim (oy)</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: monthProfit >= 0 ? "#eff6ff" : "#fef2f2" }]}>
            <Text style={styles.summaryIcon}>💰</Text>
            <Text style={[styles.summaryValue, { color: monthProfit >= 0 ? "#2563eb" : "#dc2626" }]}>{formatSum(monthProfit)}</Text>
            <Text style={styles.summaryLabel}>Foyda (oy)</Text>
          </View>
        </View>

        {/* Yearly summary */}
        <View style={styles.yearRow}>
          <View style={styles.yearCard}>
            <Text style={styles.yearLabel}>Yillik kirim</Text>
            <Text style={[styles.yearValue, { color: "#16a34a" }]}>{formatSum(yearIncome)}</Text>
          </View>
          <View style={styles.yearCard}>
            <Text style={styles.yearLabel}>Yillik chiqim</Text>
            <Text style={[styles.yearValue, { color: "#dc2626" }]}>{formatSum(yearExpense)}</Text>
          </View>
          <View style={styles.yearCard}>
            <Text style={styles.yearLabel}>Yillik foyda</Text>
            <Text style={[styles.yearValue, { color: yearProfit >= 0 ? "#2563eb" : "#dc2626" }]}>{formatSum(yearProfit)}</Text>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {([["all", "Barchasi"], ["income", "Kirim"], ["expense", "Chiqim"]] as const).map(([k, l]) => (
            <TouchableOpacity key={k} style={[styles.filterBtn, filter === k && styles.filterActive]} onPress={() => setFilter(k)}>
              <Text style={[styles.filterText, filter === k && { color: "#fff" }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Period filter */}
        <View style={styles.periodRow}>
          {([["all", "Jami"], ["month", "Oy"], ["year", "Yil"]] as const).map(([k, l]) => (
            <TouchableOpacity key={k} style={[styles.periodBtn, periodFilter === k && styles.periodActive]} onPress={() => setPeriodFilter(k)}>
              <Text style={[styles.periodText, periodFilter === k && { color: colors.primary }]}>{l}</Text>
            </TouchableOpacity>
          ))}
          {periodFilter !== "all" && (
            <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.calendarIcon}>📅</Text>
              <Text style={styles.calendarText}>
                {periodFilter === "month"
                  ? `${months[selectedMonth]} ${selectedYear}`
                  : String(selectedYear)}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <Text style={styles.countInfo}>{filtered.length} ta</Text>
        </View>

        {/* Transactions table */}
        {filtered.length > 0 ? (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Sana</Text>
              <Text style={[styles.th, { flex: 1 }]}>Kategoriya</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Izoh</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Summa</Text>
            </View>
            {filtered.slice(0, 50).map((tx: any, i: number) => (
              <TouchableOpacity key={tx.id || i} style={styles.tableRow} onLongPress={() => handleDelete(tx.id)} activeOpacity={0.7}>
                <Text style={[styles.td, { flex: 1, color: colors.textMuted, fontSize: 11 }]}>
                  {tx.date ? new Date(tx.date).toLocaleDateString("uz") : "—"}
                </Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.categoryBadge, { backgroundColor: tx.type === "income" ? "#dcfce7" : "#fee2e2" }]}>
                    <Text style={[styles.categoryText, { color: tx.type === "income" ? "#16a34a" : "#dc2626" }]}>
                      {tx.category || (tx.type === "income" ? "Kirim" : "Chiqim")}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.td, { flex: 1.5, color: colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                  {tx.description || "—"}
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right", fontWeight: "700", color: tx.type === "income" ? "#16a34a" : "#dc2626" }]}>
                  {tx.type === "income" ? "+" : "-"}{formatSum(tx.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>💰</Text>
            <Text style={styles.emptyText}>Yozuvlar yo'q</Text>
          </View>
        )}

        <Text style={styles.hint}>* Uzoq bosib o'chirish mumkin</Text>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>📅 {periodFilter === "month" ? "Oy tanlang" : "Yil tanlang"}</Text>

            {/* Year selector */}
            <View style={styles.yearSelector}>
              <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={styles.yearArrow}>
                <Text style={styles.yearArrowText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.yearDisplay}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)} style={styles.yearArrow}>
                <Text style={styles.yearArrowText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Month grid (only for month filter) */}
            {periodFilter === "month" && (
              <View style={styles.monthGrid}>
                {months.map((m, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.monthItem, selectedMonth === i && styles.monthItemActive]}
                    onPress={() => { setSelectedMonth(i); setShowDatePicker(false); }}
                  >
                    <Text style={[styles.monthItemText, selectedMonth === i && { color: "#fff" }]}>{m.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {periodFilter === "year" && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneBtnText}>✅ Tanlash</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setShowModal(true); }} activeOpacity={0.8}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modal — Yangi yozuv */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Yangi moliyaviy yozuv</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Type */}
            <Text style={styles.fieldLabel}>Tur</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, formType === "income" && styles.typeBtnIncome]} onPress={() => setFormType("income")}>
                <Text style={[styles.typeBtnText, formType === "income" && { color: "#fff" }]}>📈 Kirim</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, formType === "expense" && styles.typeBtnExpense]} onPress={() => setFormType("expense")}>
                <Text style={[styles.typeBtnText, formType === "expense" && { color: "#fff" }]}>📉 Chiqim</Text>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <Text style={styles.fieldLabel}>Kategoriya</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categories.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Amount */}
            <Text style={styles.fieldLabel}>Summa (so'm)</Text>
            <TextInput style={styles.fieldInput} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />

            {/* Description */}
            <Text style={styles.fieldLabel}>Izoh</Text>
            <TextInput style={styles.fieldInput} value={description} onChangeText={setDescription} placeholder="Qisqacha ma'lumot" placeholderTextColor={colors.textMuted} />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "⏳..." : "✅ Saqlash"}</Text>
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
  // Summary cards
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  summaryCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: "center" },
  summaryIcon: { fontSize: 18, marginBottom: 4 },
  summaryValue: { fontSize: 13, fontWeight: "800" },
  summaryLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },
  // Yearly
  yearRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  yearCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadows.sm },
  yearLabel: { fontSize: 10, color: colors.textMuted },
  yearValue: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  // Filters
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  periodActive: { borderColor: colors.primary, backgroundColor: "#fff7ed" },
  periodText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  calendarBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.primary + "15", borderWidth: 1, borderColor: colors.primary },
  calendarIcon: { fontSize: 14 },
  calendarText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  countInfo: { fontSize: 11, color: colors.textMuted },
  // Date picker
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 30 },
  pickerContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, width: "100%", maxWidth: 320 },
  pickerTitle: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.lg },
  yearSelector: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: spacing.lg },
  yearArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  yearArrowText: { fontSize: 16, color: colors.text },
  yearDisplay: { fontSize: 22, fontWeight: "800", color: colors.text },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthItem: { width: "30%", paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  monthItemActive: { backgroundColor: colors.primary },
  monthItemText: { fontSize: 13, fontWeight: "600", color: colors.text },
  doneBtn: { height: 48, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", marginTop: spacing.md },
  doneBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  // Table
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", ...shadows.sm },
  tableHeader: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { fontSize: 9, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border, alignItems: "center" },
  td: { fontSize: 12, color: colors.text },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  categoryText: { fontSize: 10, fontWeight: "700" },
  hint: { fontSize: 10, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
  empty: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: "600", marginTop: 8 },
  // FAB
  fab: { position: "absolute", bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.lg, zIndex: 100 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: spacing.md },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  typeBtnIncome: { backgroundColor: "#16a34a" },
  typeBtnExpense: { backgroundColor: "#dc2626" },
  typeBtnText: { fontSize: 14, fontWeight: "700", color: colors.text },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginRight: 6, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  rowFields: { flexDirection: "row", gap: 12, marginBottom: spacing.sm },
  fieldInput: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
