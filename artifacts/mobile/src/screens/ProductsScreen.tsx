import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Modal, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [material, setMaterial] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const load = async () => {
    try {
      const data = await apiFetch("/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const resetForm = () => { setName(""); setDescription(""); setPrice(""); setMaterial(""); setLength(""); setWidth(""); setHeight(""); setEditing(null); };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (p: any) => {
    setEditing(p); setName(p.name || ""); setDescription(p.description || "");
    setPrice(String(p.price || "")); setMaterial(p.material || "");
    setLength(String(p.length || "")); setWidth(String(p.width || "")); setHeight(String(p.height || ""));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Xatolik", "Nomi kiritilishi shart"); return; }
    if (!price) { Alert.alert("Xatolik", "Narxi kiritilishi shart"); return; }
    setSaving(true);
    try {
      const body: any = { name: name.trim(), description, price: Number(price), material };
      if (length) body.length = Number(length);
      if (width) body.width = Number(width);
      if (height) body.height = Number(height);
      if (editing) {
        await apiFetch(`/products/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/products", { method: "POST", body: JSON.stringify(body) });
      }
      Alert.alert("Muvaffaqiyat", editing ? "Yangilandi ✅" : "Qo'shildi ✅");
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert("O'chirish", "Mahsulotni o'chirmoqchimisiz?", [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: async () => {
        try { await apiFetch(`/products/${id}`, { method: "DELETE" }); await load(); } catch {}
      }},
    ]);
  };

  const togglePublish = async (p: any) => {
    try {
      await apiFetch(`/products/${p.id}`, { method: "PUT", body: JSON.stringify({ isPublished: !p.isPublished }) });
      await load();
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <Text style={styles.count}>{products.length} ta mahsulot</Text>
      </View>

      {products.map((p) => (
        <TouchableOpacity key={p.id} style={styles.card} onPress={() => openEdit(p)} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              {p.description ? <Text style={styles.desc}>{p.description}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.price}>{(p.price || 0).toLocaleString()}</Text>
              <TouchableOpacity onPress={() => togglePublish(p)} style={[styles.publishBadge, { backgroundColor: p.isPublished ? "#dcfce7" : "#f3f4f6" }]}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: p.isPublished ? "#16a34a" : "#6b7280" }}>{p.isPublished ? "✅ Chop" : "🙈 Yashirin"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.metaRow}>
            {p.material && <View style={styles.metaPill}><Text style={styles.metaText}>🧱 {p.material}</Text></View>}
            {p.length && <View style={styles.metaPill}><Text style={styles.metaText}>📐 {p.length}x{p.width}x{p.height}</Text></View>}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openEdit(p)} style={styles.editBtn}><Text style={styles.editText}>✏️ Tahrirlash</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(p.id)} style={styles.deleteBtn}><Text style={styles.deleteText}>🗑️</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      {products.length === 0 && (
        <View style={styles.empty}><Text style={styles.emptyText}>Mahsulotlar topilmadi</Text></View>
      )}
    </ScrollView>

    {/* FAB */}
    <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
      <Text style={styles.fabText}>＋</Text>
    </TouchableOpacity>

    {/* Modal */}
    <Modal visible={showModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? "✏️ Tahrirlash" : "➕ Yangi mahsulot"}</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <Text style={styles.label}>Nomi *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Mahsulot nomi" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Tavsif</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Qisqacha" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Narxi (so'm) *</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Material</Text>
          <TextInput style={styles.input} value={material} onChangeText={setMaterial} placeholder="Karton, gofrokarton..." placeholderTextColor={colors.textMuted} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Text style={styles.label}>Uzunlik</Text><TextInput style={styles.input} value={length} onChangeText={setLength} keyboardType="numeric" placeholder="sm" placeholderTextColor={colors.textMuted} /></View>
            <View style={{ flex: 1 }}><Text style={styles.label}>Kenglik</Text><TextInput style={styles.input} value={width} onChangeText={setWidth} keyboardType="numeric" placeholder="sm" placeholderTextColor={colors.textMuted} /></View>
            <View style={{ flex: 1 }}><Text style={styles.label}>Balandlik</Text><TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="sm" placeholderTextColor={colors.textMuted} /></View>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.cancelText}>Bekor</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}><Text style={styles.saveText}>{saving ? "⏳..." : "✅ Saqlash"}</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  count: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: "#f0fdfa", justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 22 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  desc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  price: { fontSize: 15, fontWeight: "800", color: colors.primary },
  publishBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: spacing.sm, flexWrap: "wrap" },
  metaPill: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  cardActions: { flexDirection: "row", gap: 8, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  editBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#fff7ed", alignItems: "center" },
  editText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#fee2e2", alignItems: "center" },
  deleteText: { fontSize: 14 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textMuted },
  fab: { position: "absolute", bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.lg, zIndex: 100 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalScroll: { maxHeight: "85%", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: spacing.xxl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 4, marginTop: spacing.sm },
  input: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 50, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 50, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
