import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Modal, Alert, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const PRODUCTS_MATERIALS = [
  "Kraxmal", "Koustik Soda", "Qog'oz B2", "Qog'oz B3",
  "Qog'oz K0", "Qog'oz K1", "Oq qog'oz", "Bo'yoq",
];

const PRODUCT_STATUSES = [
  { key: "published", label: "Chop etilgan", emoji: "✅", bg: "#dcfce7", text: "#16a34a" },
  { key: "hidden", label: "Yashirin", emoji: "🙈", bg: "#f3f4f6", text: "#6b7280" },
] as const;

type ProductStatus = (typeof PRODUCT_STATUSES)[number]["key"];

function getStatus(p: any): ProductStatus {
  return p?.status === "published" || p?.isPublished ? "published" : "hidden";
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [customMaterial, setCustomMaterial] = useState("");
  const [color, setColor] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [status, setStatus] = useState<ProductStatus>("hidden");

  const load = async () => {
    try {
      const [data, inventory] = await Promise.all([
        apiFetch("/products"),
        apiFetch("/inventory").catch(() => []),
      ]);
      setProducts(Array.isArray(data) ? data : []);

      const map: Record<number, number> = {};
      if (Array.isArray(inventory)) {
        inventory.forEach((row: any) => {
          map[row.productId] = (map[row.productId] || 0) + (row.quantity || 0);
        });
      }
      setStockMap(map);
    } catch (e: any) {
      Alert.alert("Xatolik", e.message || "Mahsulotlarni yuklab bo'lmadi");
    }
  };

  useFocusEffect(useCallback(() => { void load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const resetForm = () => {
    setName(""); setDescription(""); setPrice(""); setSelectedMaterials([]);
    setCustomMaterial(""); setColor(""); setLength(""); setWidth("");
    setHeight(""); setStatus("hidden"); setEditing(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setName(p.name || "");
    setDescription(p.description || "");
    setPrice(String(p.price || ""));
    // Parse materials from JSON string or fallback to material field
    let mats: string[] = [];
    if (p.materials) {
      try { mats = typeof p.materials === "string" ? JSON.parse(p.materials) : p.materials; } catch { mats = []; }
    }
    if (mats.length === 0 && p.material) mats = [p.material];
    setSelectedMaterials(mats);
    setCustomMaterial("");
    setColor(p.color || "");
    setLength(String(p.length || ""));
    setWidth(String(p.width || ""));
    setHeight(String(p.height || ""));
    setStatus(getStatus(p));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Xatolik", "Nomi kiritilishi shart"); return; }
    if (!price) { Alert.alert("Xatolik", "Narxi kiritilishi shart"); return; }
    setSaving(true);
    try {
      const allMaterials = [...selectedMaterials];
      if (customMaterial.trim() && !allMaterials.includes(customMaterial.trim())) {
        allMaterials.push(customMaterial.trim());
      }
      const body: any = {
        name: name.trim(),
        description,
        price: Number(price),
        materials: allMaterials,
        color,
        status,
      };
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
        try { await apiFetch(`/products/${id}`, { method: "DELETE" }); await load(); } catch (e: any) {
          Alert.alert("Xatolik", e.message);
        }
      }},
    ]);
  };

  const updateStatus = async (p: any, next: ProductStatus) => {
    try {
      await apiFetch(`/products/${p.id}`, { method: "PUT", body: JSON.stringify({ status: next }) });
      await load();
    } catch (e: any) {
      Alert.alert("Xatolik", e.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.header}>
          <Text style={styles.count}>{products.length} ta mahsulot</Text>
          <Text style={styles.hint}>Web paneldagi mahsulotlar shu yerda ko'rinadi</Text>
        </View>

        {products.map((p) => {
          const st = PRODUCT_STATUSES.find((s) => s.key === getStatus(p)) || PRODUCT_STATUSES[1];
          const stock = stockMap[p.id] || 0;
          return (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => openEdit(p)} activeOpacity={0.7}>
              <View style={styles.cardRow}>
                <View style={styles.iconWrap}>
                  {p.image ? (
                    <Image source={{ uri: p.image }} style={styles.productImage} />
                  ) : (
                    <Text style={styles.icon}>📦</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  {p.description ? <Text style={styles.desc} numberOfLines={2}>{p.description}</Text> : null}
                  <Text style={styles.stockText}>Omborda: {stock} ta</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.price}>{(p.price || 0).toLocaleString()}</Text>
                  <View style={[styles.publishBadge, { backgroundColor: st.bg }]}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: st.text }}>{st.emoji} {st.label}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statusRow}>
                {PRODUCT_STATUSES.map((s) => {
                  const active = getStatus(p) === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.statusBtn, active && { backgroundColor: s.bg, borderColor: s.text }]}
                      onPress={() => updateStatus(p, s.key)}
                    >
                      <Text style={[styles.statusBtnText, active && { color: s.text, fontWeight: "700" }]}>
                        {s.emoji} {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
          );
        })}

        {products.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Mahsulotlar topilmadi</Text>
            <Text style={styles.emptyHint}>Web panel → Mahsulotlar bo'limida qo'shing</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "✏️ Tahrirlash" : "➕ Yangi mahsulot"}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            <Text style={styles.label}>Holati</Text>
            <View style={styles.statusRow}>
              {PRODUCT_STATUSES.map((s) => {
                const active = status === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.statusBtn, active && { backgroundColor: s.bg, borderColor: s.text }]}
                    onPress={() => setStatus(s.key)}
                  >
                    <Text style={[styles.statusBtnText, active && { color: s.text, fontWeight: "700" }]}>
                      {s.emoji} {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Nomi *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Mahsulot nomi" placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>Tavsif</Text>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Qisqacha" placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>Narxi (so'm) *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>Materiallar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {PRODUCTS_MATERIALS.map(mat => {
                const active = selectedMaterials.includes(mat);
                return (
                  <TouchableOpacity key={mat} style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelectedMaterials(active ? selectedMaterials.filter(m => m !== mat) : [...selectedMaterials, mat])}>
                    <Text style={[styles.chipText, active && { color: "#fff" }]}>{mat}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={[styles.chip, customMaterial ? styles.chipActive : null]}
                onPress={() => setCustomMaterial(customMaterial ? "" : " ")}>
                <Text style={[styles.chipText, customMaterial && { color: "#fff" }]}>Boshqa</Text>
              </TouchableOpacity>
            </ScrollView>
            {customMaterial !== "" && (
              <TextInput style={[styles.input, { marginBottom: 8 }]} value={customMaterial === " " ? "" : customMaterial}
                onChangeText={v => setCustomMaterial(v || " ")} placeholder="Boshqa material nomi..." placeholderTextColor={colors.textMuted} />
            )}

            <Text style={styles.label}>Rang</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={color} onChangeText={setColor} placeholder="#000000" placeholderTextColor={colors.textMuted} />
              {color ? <View style={[styles.colorPreview, { backgroundColor: color }]} /> : null}
            </View>
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
  count: { fontSize: 16, fontWeight: "700", color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: "#f0fdfa", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  productImage: { width: 56, height: 56, borderRadius: radius.md },
  icon: { fontSize: 22 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  desc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  stockText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  price: { fontSize: 15, fontWeight: "800", color: colors.primary },
  publishBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusRow: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
  statusBtn: {
    flex: 1, paddingVertical: 8, borderRadius: radius.md, alignItems: "center",
    backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border,
  },
  statusBtnText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  metaRow: { flexDirection: "row", gap: 6, marginTop: spacing.sm, flexWrap: "wrap" },
  metaPill: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  cardActions: { flexDirection: "row", gap: 8, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  editBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#fff7ed", alignItems: "center" },
  editText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#fee2e2", alignItems: "center" },
  deleteText: { fontSize: 14 },
  empty: { padding: 40, alignItems: "center" },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: colors.text, fontWeight: "700", fontSize: 16 },
  emptyHint: { color: colors.textMuted, marginTop: 6, textAlign: "center" },
  fab: { position: "absolute", bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.lg, zIndex: 100 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalScroll: { maxHeight: "90%", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
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
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginRight: 6, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  colorPreview: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border },
});
