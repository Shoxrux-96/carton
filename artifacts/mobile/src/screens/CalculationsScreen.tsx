import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Modal, Alert, RefreshControl, Dimensions,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");
const fmt = (n: number) => n.toLocaleString("uz-UZ");

interface CalcItem {
  id: number;
  companyName: string;
  boxName: string;
  boxWidth: string;
  boxHeight: string;
  boxLength: string;
  l1Weight: string;
  l1Price: string;
  l2Weight: string;
  l2Price: string;
  l3Weight: string;
  l3Price: string;
  blankLen: string;
  blankW: string;
  netAreaM2: string;
  totalWeight: string;
  totalPaperCost: string;
  salePrice: string;
  coefficient: string;
  createdAt: string;
}

const emptyForm = {
  companyName: "",
  boxName: "",
  boxWidth: "",
  boxHeight: "",
  boxLength: "",
  l1Weight: "",
  l1Price: "",
  l2Weight: "",
  l2Price: "",
  l3Weight: "",
  l3Price: "",
  coefficient: "1.50",
};

export default function CalculationsScreen() {
  const [items, setItems] = useState<CalcItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CalcItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showDetail, setShowDetail] = useState<CalcItem | null>(null);

  const n = (s: string) => parseFloat(s) || 0;

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const load = async () => {
    try {
      const data = await apiFetch("/calculations");
      setItems(Array.isArray(data) ? data : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const resetForm = () => { setForm(emptyForm); setEditing(null); };
  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (item: CalcItem) => {
    setEditing(item);
    setForm({
      companyName: item.companyName || "",
      boxName: item.boxName || "",
      boxWidth: item.boxWidth || "",
      boxHeight: item.boxHeight || "",
      boxLength: item.boxLength || "",
      l1Weight: item.l1Weight || "",
      l1Price: item.l1Price || "",
      l2Weight: item.l2Weight || "",
      l2Price: item.l2Price || "",
      l3Weight: item.l3Weight || "",
      l3Price: item.l3Price || "",
      coefficient: item.coefficient || "1.50",
    });
    setShowModal(true);
  };

  // Hisoblash — offline
  const calcResult = () => {
    const bw = n(form.boxWidth), bh = n(form.boxHeight), bl = n(form.boxLength);
    if (bw <= 0 || bh <= 0 || bl <= 0) return null;
    const flapH = bl / 2;
    const blankLen = 2 * bw + 2 * bl + 6;
    const blankW = 1 + flapH + bh + flapH + 1;
    const netAreaM2 = (blankLen * blankW) / 10000;

    const l1w = n(form.l1Weight), l1p = n(form.l1Price);
    const l2w = n(form.l2Weight), l2p = n(form.l2Price);
    const l3w = n(form.l3Weight), l3p = n(form.l3Price);
    const l1cost = l1w * netAreaM2 * l1p;
    const l2cost = l2w > 0 ? netAreaM2 / 0.7 * l2w * l2p : 0;
    const l3cost = l3w * netAreaM2 * l3p;
    const totalWeight = l1w * netAreaM2 + (l2w > 0 ? netAreaM2 / 0.7 * l2w : 0) + l3w * netAreaM2;
    const totalPaperCost = l1cost + l2cost + l3cost;
    const coeff = n(form.coefficient) || 1.5;
    const salePrice = totalPaperCost * coeff;

    return {
      blankLen: +blankLen.toFixed(1), blankW: +blankW.toFixed(1),
      netAreaM2: +netAreaM2.toFixed(4), totalWeight: +totalWeight.toFixed(4),
      totalPaperCost: Math.round(totalPaperCost), salePrice: Math.round(salePrice),
      coefficient: coeff,
    };
  };

  const handleSave = async () => {
    if (!form.boxName.trim()) { Alert.alert("Xatolik", "Quti nomini kiriting"); return; }
    const r = calcResult();
    if (!r) { Alert.alert("Xatolik", "O'lchamlarni to'g'ri kiriting"); return; }
    setSaving(true);
    try {
      const body = { ...form, ...r };
      if (editing) {
        await apiFetch(`/calculations/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/calculations", { method: "POST", body: JSON.stringify(body) });
      }
      Alert.alert("Muvaffaqiyat", editing ? "Yangilandi" : "Saqlandi");
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert("O'chirish", "Hisoblash o'chirilsinmi?", [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: async () => {
        try { await apiFetch(`/calculations/${id}`, { method: "DELETE" }); await load(); } catch {}
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🧮</Text>
            <Text style={styles.emptyText}>Hisoblashlar yo'q</Text>
            <Text style={styles.emptySub}>+ tugmasini bosib yangi yarating</Text>
          </View>
        ) : items.map(item => (
          <TouchableOpacity key={item.id} style={styles.card} onPress={() => setShowDetail(item)} onLongPress={() => handleDelete(item.id)}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.boxName || "Nomsiz quti"}</Text>
                <Text style={styles.cardSub}>{item.companyName || "Kompaniya"}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>✏️</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardDims}>
              <Text style={styles.dimText}>W={item.boxWidth}</Text>
              <Text style={styles.dimText}>H={item.boxHeight}</Text>
              <Text style={styles.dimText}>L={item.boxLength}</Text>
              <Text style={styles.dimSep}>|</Text>
              <Text style={styles.dimText}>{item.blankLen} × {item.blankW} sm</Text>
            </View>
            <View style={styles.cardPrice}>
              <Text style={styles.priceLabel}>Ishlab chiqarish:</Text>
              <Text style={styles.priceValue}>{fmt(Number(item.totalPaperCost))} so'm</Text>
            </View>
            <View style={styles.cardPrice}>
              <Text style={styles.priceLabel}>Sotish narxi:</Text>
              <Text style={[styles.priceValue, { color: colors.success }]}>{fmt(Number(item.salePrice))} so'm</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* DETAIL MODAL */}
      <Modal visible={!!showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 {showDetail?.boxName}</Text>
              <TouchableOpacity onPress={() => setShowDetail(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {showDetail && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>📐 O'lchamlar</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Eni (W)</Text><Text style={styles.detailValue}>{showDetail.boxWidth} sm</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Balandligi (H)</Text><Text style={styles.detailValue}>{showDetail.boxHeight} sm</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Bo'yi (L)</Text><Text style={styles.detailValue}>{showDetail.boxLength} sm</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Kesma</Text><Text style={styles.detailValue}>{showDetail.blankLen} × {showDetail.blankW} sm</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Sof maydon</Text><Text style={styles.detailValue}>{showDetail.netAreaM2} m²</Text></View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>📄 Qog'oz</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>1-qatlam og'irlik</Text><Text style={styles.detailValue}>{showDetail.l1Weight} kg/m²</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>1-qatlam narx</Text><Text style={styles.detailValue}>{fmt(Number(showDetail.l1Price))} so'm/kg</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>2-qatlam og'irlik</Text><Text style={styles.detailValue}>{showDetail.l2Weight} kg/m²</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>2-qatlam narx</Text><Text style={styles.detailValue}>{fmt(Number(showDetail.l2Price))} so'm/kg</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>3-qatlam og'irlik</Text><Text style={styles.detailValue}>{showDetail.l3Weight} kg/m²</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>3-qatlam narx</Text><Text style={styles.detailValue}>{fmt(Number(showDetail.l3Price))} so'm/kg</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Umumiy og'irlik</Text><Text style={styles.detailValue}>{showDetail.totalWeight} kg</Text></View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>💰 Narx</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Ishlab chiqarish</Text><Text style={[styles.detailValue, { fontWeight: "800" }]}>{fmt(Number(showDetail.totalPaperCost))} so'm</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Koeffitsient</Text><Text style={styles.detailValue}>×{showDetail.coefficient}</Text></View>
                  <View style={[styles.detailRow, { borderBottomWidth: 0, paddingTop: 8 }]}><Text style={[styles.detailLabel, { fontWeight: "800", fontSize: 14 }]}>Sotish narxi</Text><Text style={[styles.detailValue, { color: colors.success, fontSize: 16, fontWeight: "800" }]}>{fmt(Number(showDetail.salePrice))} so'm</Text></View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ADD/EDIT MODAL */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: "90%" }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? "✏️ Tahrirlash" : "➕ Yangi hisoblash"}</Text>
                <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Kompaniya + Quti nomi */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>📝 Ma'lumotlar</Text>
                  <Text style={styles.label}>Kompaniya nomi</Text>
                  <TextInput style={styles.input} value={form.companyName} onChangeText={v => set("companyName", v)} placeholder="SHOVOT CARTON" placeholderTextColor={colors.textMuted} />
                  <Text style={styles.label}>Quti nomi</Text>
                  <TextInput style={styles.input} value={form.boxName} onChangeText={v => set("boxName", v)} placeholder="To'rtburchak quti" placeholderTextColor={colors.textMuted} />
                </View>

                {/* Quti o'lchamlari */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>📐 Quti o'lchamlari (sm)</Text>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Eni (W)</Text>
                      <TextInput style={styles.input} value={form.boxWidth} onChangeText={v => set("boxWidth", v)} keyboardType="numeric" placeholder="20" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Balandligi (H)</Text>
                      <TextInput style={styles.input} value={form.boxHeight} onChangeText={v => set("boxHeight", v)} keyboardType="numeric" placeholder="15" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Bo'yi (L)</Text>
                      <TextInput style={styles.input} value={form.boxLength} onChangeText={v => set("boxLength", v)} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.textMuted} />
                    </View>
                  </View>
                </View>

                {/* 1-qatlam */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>📄 1-qatlam — Tashqi qog'oz</Text>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Og'irlik (kg/m²)</Text>
                      <TextInput style={styles.input} value={form.l1Weight} onChangeText={v => set("l1Weight", v)} keyboardType="numeric" placeholder="0.125" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Narx (so'm/kg)</Text>
                      <TextInput style={styles.input} value={form.l1Price} onChangeText={v => set("l1Price", v)} keyboardType="numeric" placeholder="8000" placeholderTextColor={colors.textMuted} />
                    </View>
                  </View>
                </View>

                {/* 2-qatlam */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>📄 2-qatlam — Gofra qog'oz (ixtiyoriy)</Text>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Og'irlik (kg/m²)</Text>
                      <TextInput style={styles.input} value={form.l2Weight} onChangeText={v => set("l2Weight", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Narx (so'm/kg)</Text>
                      <TextInput style={styles.input} value={form.l2Price} onChangeText={v => set("l2Price", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
                    </View>
                  </View>
                </View>

                {/* 3-qatlam */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>📄 3-qatlam — Ichki qog'oz (ixtiyoriy)</Text>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Og'irlik (kg/m²)</Text>
                      <TextInput style={styles.input} value={form.l3Weight} onChangeText={v => set("l3Weight", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Narx (so'm/kg)</Text>
                      <TextInput style={styles.input} value={form.l3Price} onChangeText={v => set("l3Price", v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
                    </View>
                  </View>
                </View>

                {/* Koeffitsient */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>💰 Sotish narxi</Text>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Koeffitsient</Text>
                      <TextInput style={styles.input} value={form.coefficient} onChangeText={v => set("coefficient", v)} keyboardType="numeric" placeholder="1.50" placeholderTextColor={colors.textMuted} />
                    </View>
                  </View>
                </View>

                {/* NATIJA */}
                {(() => {
                  const r = calcResult();
                  if (!r) return null;
                  return (
                    <View style={[styles.formSection, { backgroundColor: "#f0fdf4", borderColor: colors.success }]}>
                      <Text style={styles.formSectionTitle}>✅ Natija</Text>
                      <View style={styles.resultRow}><Text style={styles.resultLabel}>Kesma</Text><Text style={styles.resultValue}>{r.blankLen} × {r.blankW} sm</Text></View>
                      <View style={styles.resultRow}><Text style={styles.resultLabel}>Sof maydon</Text><Text style={styles.resultValue}>{r.netAreaM2} m²</Text></View>
                      <View style={styles.resultRow}><Text style={styles.resultLabel}>Og'irlik</Text><Text style={styles.resultValue}>{r.totalWeight} kg</Text></View>
                      <View style={styles.resultRow}><Text style={styles.resultLabel}>Ishlab chiqarish</Text><Text style={[styles.resultValue, { fontWeight: "800" }]}>{fmt(r.totalPaperCost)} so'm</Text></View>
                      <View style={[styles.resultRow, { borderBottomWidth: 0 }]}><Text style={[styles.resultLabel, { fontWeight: "800" }]}>Sotish narxi</Text><Text style={[styles.resultValue, { color: colors.success, fontSize: 16, fontWeight: "800" }]}>{fmt(r.salePrice)} so'm</Text></View>
                    </View>
                  );
                })()}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                  <Text style={styles.cancelText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveText}>{saving ? "Saqlanmoqda..." : "Saqlash"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 100 },
  emptyState: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  emptySub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  editBtn: { padding: 6, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  editBtnText: { fontSize: 16 },
  cardDims: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm },
  dimText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  dimSep: { color: colors.textMuted },
  cardPrice: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  priceLabel: { fontSize: 12, color: colors.textSecondary },
  priceValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  fab: {
    position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    ...shadows.lg,
  },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 20,
    maxHeight: "80%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 20, color: colors.textMuted, padding: 4 },
  formSection: { marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  formSectionTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 },
  formRow: { flexDirection: "row", gap: 10 },
  formField: { flex: 1 },
  label: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontWeight: "600", color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  resultRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  resultLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  resultValue: { fontSize: 12, color: colors.text, fontWeight: "700" },
  detailSection: { marginBottom: 16, padding: 12, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  detailSectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  modalActions: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
