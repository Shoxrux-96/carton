import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert, Linking, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import LocationPicker from "../components/LocationPicker";

export default function ClientsScreen({ navigation }: any) {
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Korxonamiz (bir nechta korxona)
  const [companies, setCompanies] = useState<any[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [savingCompany, setSavingCompany] = useState(false);
  const [cName, setCName] = useState("");
  const [cOwner, setCOwner] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cAddress, setCAddress] = useState("");

  // Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");

  const sources = ["Telefon", "Instagram", "Facebook", "Telegram", "Web sayt", "Reklama", "Boshqa"];

  const load = async () => {
    try {
      const q = search ? `&search=${search}` : "";
      const data = await apiFetch(`/clients?type=customer${q}`);
      setClients(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadCompanies = async () => {
    try {
      const data = await apiFetch("/company");
      setCompanies(Array.isArray(data?.companies) ? data.companies : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); loadCompanies(); }, [search]));
  const onRefresh = async () => { setRefreshing(true); await load(); await loadCompanies(); setRefreshing(false); };

  const openCompanyAdd = () => {
    setEditingCompany(null); setCName(""); setCOwner(""); setCPhone(""); setCAddress("");
    setShowCompanyModal(true);
  };
  const openCompanyEdit = (c: any) => {
    setEditingCompany(c); setCName(c.name || ""); setCOwner(c.owner || "");
    setCPhone(c.phone || ""); setCAddress(c.address || "");
    setShowCompanyModal(true);
  };
  const saveCompany = async () => {
    if (!cName.trim()) { Alert.alert("Xatolik", "Korxona nomini kiriting"); return; }
    setSavingCompany(true);
    try {
      const body = { name: cName.trim(), owner: cOwner, phone: cPhone, address: cAddress };
      if (editingCompany) await apiFetch(`/company/${editingCompany.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await apiFetch("/company", { method: "POST", body: JSON.stringify(body) });
      setShowCompanyModal(false);
      await loadCompanies();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSavingCompany(false); }
  };
  const deleteCompany = (c: any) => {
    const msg = `"${c.name}" korxonasini o'chirmoqchimisiz?`;
    const doDelete = async () => {
      try { await apiFetch(`/company/${c.id}`, { method: "DELETE" }); await loadCompanies(); }
      catch (e: any) { Alert.alert("Xatolik", e.message); }
    };
    // react-native-web'da Alert no-op — web preview uchun window.confirm
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (typeof window !== "undefined" && window.confirm(msg)) doDelete();
    } else {
      Alert.alert("O'chirish", msg, [
        { text: "Yo'q" },
        { text: "Ha", style: "destructive", onPress: doDelete },
      ]);
    }
  };
  const createCompanyWaybill = (c: any) => {
    navigation?.navigate?.("Waybills", { newSender: c.name || "", newSenderPhone: c.phone || "" });
  };

  const exportExcel = () => {
    const csv = "Ism,Korxona,Telefon,Manzil,Manba,Sana\n" + clients.map((c: any) =>
      `"${(c.name || "").replace(/"/g, '""')}","${(c.companyName || "").replace(/"/g, '""')}","${(c.phone || "").replace(/"/g, '""')}","${(c.address || "").replace(/"/g, '""')}","${(c.source || "").replace(/"/g, '""')}",${c.createdAt ? new Date(c.createdAt).toLocaleDateString("uz") : ""}`
    ).join("\n");
    Linking.openURL("data:text/csv;charset=utf-8," + encodeURIComponent(csv));
  };

  const resetForm = () => { setName(""); setPhone(""); setCompanyName(""); setAddress(""); setSource(""); setEditing(null); };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (c: any) => {
    setEditing(c); setName(c.name || ""); setPhone(c.phone || ""); setCompanyName(c.companyName || "");
    setAddress(c.address || ""); setSource(c.source || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Xatolik", "Ismni kiriting"); return; }
    setSaving(true);
    try {
      const body = { name: name.trim(), phone, companyName, address, source, type: "customer" };
      if (editing) {
        await apiFetch(`/clients/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/clients", { method: "POST", body: JSON.stringify(body) });
      }
      Alert.alert("Muvaffaqiyat", editing ? "Mijoz yangilandi" : "Mijoz qo'shildi");
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
        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>🏢 Mijozlar</Text>
            <Text style={styles.pageSub}>Mijozlar bazasi va kontaktlari</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={openCompanyAdd}>
              <Text style={styles.headerBtnText}>🏢 Korxonamiz</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={exportExcel}>
              <Text style={styles.headerBtnText}>📥 Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, styles.headerBtnPrimary]} onPress={openAdd}>
              <Text style={styles.headerBtnTextPrimary}>＋ Mijoz</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KORXONAMIZ */}
        <View style={styles.compCard}>
          <View style={styles.compHeader}>
            <Text style={styles.compHeaderTitle}>🏢 Korxonamiz ({companies.length})</Text>
            <TouchableOpacity style={styles.compAddBtn} onPress={openCompanyAdd}>
              <Text style={styles.compAddText}>＋ Qo'shish</Text>
            </TouchableOpacity>
          </View>
          {companies.map((c) => (
            <View key={c.id} style={styles.compRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.compName}>{c.name}</Text>
                {c.owner ? <Text style={styles.compMeta}>👤 {c.owner}</Text> : null}
                {c.phone ? <Text style={styles.compMeta}>📞 {c.phone}</Text> : null}
                {c.address ? <Text style={styles.compMeta}>📍 {c.address.length > 34 ? c.address.slice(0, 34) + "..." : c.address}</Text> : null}
                <View style={styles.compActions}>
                  <TouchableOpacity style={styles.compActBtn} onPress={() => createCompanyWaybill(c)}>
                    <Text style={styles.compActText}>📄 Yuk xati</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.compActBtn} onPress={() => openCompanyEdit(c)}>
                    <Text style={styles.compActText}>✏️ Tahrirlash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.compActBtn, styles.compActDanger]} onPress={() => deleteCompany(c)}>
                    <Text style={[styles.compActText, { color: "#dc2626" }]}>🗑 O'chirish</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          {companies.length === 0 && (
            <Text style={styles.compEmpty}>Hozircha korxona yo'q — "＋ Qo'shish" tugmasini bosing</Text>
          )}
        </View>

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
                  {c.companyName ? <Text style={styles.clientPhone}>🏢 {c.companyName}</Text> : null}
                  {c.phone ? <Text style={styles.clientPhone}>📞 {c.phone}</Text> : null}
                {c.address ? <Text style={styles.clientAddr}>📍 {c.address.length > 30 ? c.address.slice(0, 30) + "..." : c.address}</Text> : null}
              </View>
              {c.source ? (
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceText}>{c.source}</Text>
                </View>
              ) : null}
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

      {/* Modal - Add/Edit Client */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "Mijozni tahrirlash" : "Yangi mijoz"}</Text>
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

            {/* Company Name */}
            <Text style={styles.fieldLabel}>Korxona nomi</Text>
            <TextInput style={styles.fieldInput} value={companyName} onChangeText={setCompanyName} placeholder="Korxona / firma nomi" placeholderTextColor={colors.textMuted} />

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
                <Text style={styles.saveText}>{saving ? "Saqlanmoqda..." : editing ? "Saqlash" : "Qo'shish"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal - Add/Edit Company (Korxonamiz) */}
      <Modal visible={showCompanyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCompany ? "Korxonani tahrirlash" : "Yangi korxona"}</Text>
              <TouchableOpacity onPress={() => setShowCompanyModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Korxona nomi *</Text>
            <TextInput style={styles.fieldInput} value={cName} onChangeText={setCName} placeholder="Korxona / firma nomi" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Korxona egasi</Text>
            <TextInput style={styles.fieldInput} value={cOwner} onChangeText={setCOwner} placeholder="F.I.Sh." placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Telefon raqami</Text>
            <TextInput style={styles.fieldInput} value={cPhone} onChangeText={setCPhone} placeholder="+998 XX XXX XX XX" keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />

            <LocationPicker value={cAddress} onChange={setCAddress} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCompanyModal(false)}>
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCompany} disabled={savingCompany}>
                <Text style={styles.saveText}>{savingCompany ? "Saqlanmoqda..." : editingCompany ? "Saqlash" : "Qo'shish"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  pageHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 2, borderBottomColor: colors.border },
  pageTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  pageSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 6 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  headerBtnText: { fontSize: 12, fontWeight: "700", color: colors.text },
  headerBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  headerBtnTextPrimary: { fontSize: 12, fontWeight: "700", color: "#fff" },
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
  compCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  compHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  compHeaderTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  compAddBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.primary },
  compAddText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  compRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
  compName: { fontSize: 15, fontWeight: "700", color: colors.text },
  compMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  compActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  compActBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  compActDanger: { borderColor: "#fecaca" },
  compActText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  compEmpty: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
});
