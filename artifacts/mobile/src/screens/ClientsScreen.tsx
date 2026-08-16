import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import LocationPicker from "../components/LocationPicker";

export default function ClientsScreen() {
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");

  const sources = ["Telefon", "Instagram", "Facebook", "Telegram", "Tanish", "Reklama", "Boshqa"];

  const load = async () => {
    try {
      const q = search ? `&search=${search}` : "";
      const data = await apiFetch(`/clients?type=customer${q}`);
      setClients(Array.isArray(data) ? data : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [search]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const resetForm = () => { setName(""); setPhone(""); setAddress(""); setSource(""); setEditing(null); };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (c: any) => {
    setEditing(c); setName(c.name || ""); setPhone(c.phone || "");
    setAddress(c.address || ""); setSource(c.source || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Xatolik", "Ismni kiriting"); return; }
    setSaving(true);
    try {
      const body = { name: name.trim(), phone, address, source, type: "customer" };
      if (editing) {
        await apiFetch(`/clients/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/clients", { method: "POST", body: JSON.stringify(body) });
      }
      Alert.alert("Muvaffaqiyat", editing ? "Mijoz yangilandi ✅" : "Mijoz qo'shildi ✅");
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Mijoz qidirish..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <Text style={styles.countText}>{clients.length} ta mijoz</Text>

        {/* Clients list */}
        {clients.map((c) => (
          <TouchableOpacity key={c.id} style={styles.clientCard} onPress={() => openEdit(c)} activeOpacity={0.7}>
            <View style={styles.clientRow}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>{c.name?.charAt(0) || "?"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{c.name}</Text>
                {c.phone ? <Text style={styles.clientPhone}>📞 {c.phone}</Text> : null}
                {c.address ? <Text style={styles.clientAddr}>📍 {c.address.length > 30 ? c.address.slice(0, 30) + "..." : c.address}</Text> : null}
              </View>
              {c.source && (
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceText}>{c.source}</Text>
                </View>
              )}
            </View>
            <Text style={styles.clientDate}>📅 {c.createdAt ? new Date(c.createdAt).toLocaleDateString("uz") : "—"}</Text>
          </TouchableOpacity>
        ))}

        {clients.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏢</Text>
            <Text style={styles.emptyTitle}>Mijozlar yo'q</Text>
            <Text style={styles.emptyDesc}>Yangi mijoz qo'shish tugmasini bosing</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modal - Add/Edit Client */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "✏️ Mijozni tahrirlash" : "➕ Yangi mijoz"}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text style={styles.fieldLabel}>To'liq ism *</Text>
            <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="F.I.Sh" placeholderTextColor={colors.textMuted} />

            {/* Phone */}
            <Text style={styles.fieldLabel}>Telefon raqami</Text>
            <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} placeholder="+998 XX XXX XX XX" keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />

            {/* Address - Location Picker */}
            <LocationPicker value={address} onChange={setAddress} />

            {/* Source */}
            <Text style={styles.fieldLabel}>Manbasi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceRow}>
              {sources.map(s => (
                <TouchableOpacity key={s} style={[styles.sourceChip, source === s && styles.sourceChipActive]} onPress={() => setSource(s)}>
                  <Text style={[styles.sourceChipText, source === s && { color: "#fff" }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "⏳..." : editing ? "💾 Saqlash" : "➕ Qo'shish"}</Text>
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
  searchRow: { marginBottom: spacing.md },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, height: 48, ...shadows.sm },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  countText: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  clientCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  clientAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#eef2ff", justifyContent: "center", alignItems: "center" },
  clientAvatarText: { fontSize: 17, fontWeight: "700", color: colors.primary },
  clientName: { fontSize: 15, fontWeight: "700", color: colors.text },
  clientPhone: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  clientAddr: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  sourceBadge: { backgroundColor: "#dbeafe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sourceText: { fontSize: 10, fontWeight: "600", color: "#2563eb" },
  clientDate: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  empty: { padding: 60, alignItems: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptyDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  fab: { position: "absolute", bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.lg, zIndex: 100 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted, padding: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: spacing.md },
  fieldInput: { height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  sourceRow: { marginTop: 4, marginBottom: spacing.md },
  sourceChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginRight: 8, borderWidth: 1.5, borderColor: colors.border },
  sourceChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sourceChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xxl },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
