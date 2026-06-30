import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const positions = ["Buxgalter", "Boshqaruvchi", "Ishchi", "Qorovul", "Haydovchi", "Oshpaz", "Boshqa"];
const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

export default function EmployeesScreen({ navigation }: any) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loginPassword, setLoginPassword] = useState("12345678");

  const load = async () => {
    try {
      const data = await apiFetch("/employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const resetForm = () => {
    setName(""); setPhone(""); setPosition(""); setSalary(""); setHireDate(""); setNotes(""); setEditing(null); setLoginPassword("12345678");
  };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (e: any) => {
    setEditing(e); setName(e.name || ""); setPhone(e.phone || "");
    setPosition(e.position || ""); setSalary(String(e.salary || ""));
    setHireDate(e.hireDate || ""); setNotes(e.notes || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Xatolik", "Ismni kiriting"); return; }
    if (!phone.trim()) { Alert.alert("Xatolik", "Telefon raqamni kiriting (login uchun kerak)"); return; }
    setSaving(true);
    try {
      const body = { name: name.trim(), phone, position, salary: Number(salary) || 0, hireDate, notes };
      if (editing) {
        await apiFetch(`/employees/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
        Alert.alert("Muvaffaqiyat", "Hodim yangilandi ✅");
      } else {
        // 1. Hodimni yaratish
        await apiFetch("/employees", { method: "POST", body: JSON.stringify(body) });
        // 2. Avtomatik login yaratish
        const cleanPhone = phone.replace(/[\s\+\-\(\)]/g, "");
        const role = position === "Boshqaruvchi" ? "manager" : position === "Haydovchi" ? "driver" : "employee";
        try {
          await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ phone: cleanPhone, password: loginPassword, role }) });
        } catch {}
        Alert.alert("Muvaffaqiyat", `Hodim qo'shildi ✅\n\nLogin: ${cleanPhone}\nParol: ${loginPassword}\nRol: ${role}`);
      }
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (id: number, current: string) => {
    const newStatus = current === "active" ? "inactive" : "active";
    try {
      await apiFetch(`/employees/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      await load();
    } catch {}
  };

  const deleteEmployee = (emp: any) => {
    if (emp.position === "Owner") { Alert.alert("", "Owner o'chirib bo'lmaydi"); return; }
    Alert.alert("O'chirish", `${emp.name} ni o'chirmoqchimisiz?`, [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: async () => {
        try { await apiFetch(`/employees/${emp.id}`, { method: "DELETE" }); await load(); } catch (e: any) { Alert.alert("Xatolik", e.message); }
      }},
    ]);
  };

  const activeCount = employees.filter(e => e.status === "active").length;
  const totalSalary = employees.filter(e => e.status === "active").reduce((s, e) => s + (e.salary || 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Faol hodim</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
            <Text style={[styles.statValue, { fontSize: 14 }]}>{formatSum(totalSalary)}</Text>
            <Text style={styles.statLabel}>Jami maosh</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("Attendance")}>
            <Text style={styles.quickEmoji}>✅</Text>
            <Text style={styles.quickText}>Davomat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("AttendanceReport")}>
            <Text style={styles.quickEmoji}>📊</Text>
            <Text style={styles.quickText}>Hisobot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("FaceAttendance")}>
            <Text style={styles.quickEmoji}>🤳</Text>
            <Text style={styles.quickText}>Face ID</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("FaceRegister")}>
            <Text style={styles.quickEmoji}>📸</Text>
            <Text style={styles.quickText}>Yuz ro'yxati</Text>
          </TouchableOpacity>
        </View>

        {/* Employees list */}
        <Text style={styles.sectionTitle}>Hodimlar ro'yxati</Text>
        {employees.map((emp) => (
          <TouchableOpacity key={emp.id} style={styles.empCard} onPress={() => openEdit(emp)} activeOpacity={0.7}>
            <View style={styles.empRow}>
              {emp.faceImage ? (
                <Image source={{ uri: emp.faceImage }} style={styles.empPhoto} />
              ) : (
                <View style={styles.empAvatar}>
                  <Text style={styles.empAvatarText}>{emp.name?.charAt(0) || "?"}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{emp.name}</Text>
                <Text style={styles.empPosition}>{emp.position || "—"}</Text>
                {emp.phone && <Text style={styles.empPhone}>📞 {emp.phone}</Text>}
              </View>
              <View style={styles.empRight}>
                <Text style={styles.empSalary}>{formatSum(emp.salary || 0)}</Text>
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: emp.status === "active" ? "#dcfce7" : "#fee2e2" }]}
                  onPress={() => toggleStatus(emp.id, emp.status)}
                >
                  <Text style={[styles.statusText, { color: emp.status === "active" ? "#16a34a" : "#dc2626" }]}>
                    {emp.status === "active" ? "Faol" : "Nofaol"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {emp.hireDate && <Text style={styles.empDate}>📅 Ishga kirgan: {new Date(emp.hireDate).toLocaleDateString("uz")}</Text>}
            {emp.position !== "Owner" && (
              <TouchableOpacity onPress={() => deleteEmployee(emp)} style={styles.delBtn}>
                <Text style={styles.delText}>🗑️ O'chirish</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {employees.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyText}>Hodimlar yo'q</Text>
          </View>
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
              <Text style={styles.modalTitle}>{editing ? "✏️ Hodimni tahrirlash" : "➕ Yangi hodim"}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Ism *</Text>
            <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="To'liq ismi" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Telefon</Text>
            <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} placeholder="+998901234567" keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Lavozim</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {positions.map(p => (
                <TouchableOpacity key={p} style={[styles.chip, position === p && styles.chipActive]} onPress={() => setPosition(p)}>
                  <Text style={[styles.chipText, position === p && { color: "#fff" }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Maosh (so'm)</Text>
                <TextInput style={styles.fieldInput} value={salary} onChangeText={setSalary} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Ishga kirgan</Text>
                <TextInput style={styles.fieldInput} value={hireDate} onChangeText={setHireDate} placeholder="2024-01-15" placeholderTextColor={colors.textMuted} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Izoh</Text>
            <TextInput style={styles.fieldInput} value={notes} onChangeText={setNotes} placeholder="Qo'shimcha" placeholderTextColor={colors.textMuted} />

            {!editing && (
              <View style={styles.loginSection}>
                <Text style={styles.loginTitle}>🔑 Mobil ilova uchun login</Text>
                <Text style={styles.loginHint}>Telefon raqam = login, parolni o'zgartiring</Text>
                <Text style={styles.fieldLabel}>Parol</Text>
                <TextInput style={styles.fieldInput} value={loginPassword} onChangeText={setLoginPassword} placeholder="Kamida 8 belgi" placeholderTextColor={colors.textMuted} />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "⏳..." : "✅ Saqlash"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, ...shadows.sm },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 10, color: colors.textSecondary },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: spacing.xl },
  quickBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 14, alignItems: "center", ...shadows.sm },
  quickEmoji: { fontSize: 22, marginBottom: 4 },
  quickText: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  empCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  empRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  empAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#eef2ff", justifyContent: "center", alignItems: "center" },
  empAvatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  empPhoto: { width: 44, height: 44, borderRadius: 14 },
  empName: { fontSize: 15, fontWeight: "700", color: colors.text },
  empPosition: { fontSize: 12, color: colors.textMuted },
  empPhone: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  empRight: { alignItems: "flex-end", gap: 4 },
  empSalary: { fontSize: 13, fontWeight: "700", color: colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  empDate: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  delBtn: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: "#fee2e2", alignSelf: "flex-start" },
  delText: { fontSize: 11, fontWeight: "600", color: "#dc2626" },
  empty: { padding: 60, alignItems: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: "600" },
  fab: { position: "absolute", bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", ...shadows.lg, zIndex: 100 },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalScroll: { maxHeight: "90%", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: spacing.xxl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted, padding: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: spacing.md },
  fieldInput: { height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  chipScroll: { marginBottom: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceAlt, marginRight: 8, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  rowFields: { flexDirection: "row", gap: 12 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xxl },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  loginSection: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  loginTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 4 },
  loginHint: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.sm },
});
