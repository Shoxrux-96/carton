import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const PRODUCTS_MATERIALS = [
  "Kraxmal", "Koustik Soda", "Qog'oz B2", "Qog'oz B3",
  "Qog'oz K0", "Qog'oz K1", "Oq qog'oz", "Bo'yoq",
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: "Kutilmoqda", bg: "#fef3c7", text: "#d97706", icon: "⏳" },
  in_progress: { label: "Jarayonda", bg: "#dbeafe", text: "#2563eb", icon: "🔄" },
  completed: { label: "Bajarildi", bg: "#dcfce7", text: "#16a34a", icon: "✅" },
};

export default function AdminTasksScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [customMaterial, setCustomMaterial] = useState("");

  const load = async () => {
    try {
      const [t, e, p] = await Promise.all([
        apiFetch("/tasks"),
        apiFetch("/employees").catch(() => []),
        apiFetch("/products").catch(() => []),
      ]);
      setTasks(Array.isArray(t) ? t : []);
      setEmployees(Array.isArray(e) ? e : []);
      setProducts(Array.isArray(p) ? p : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  }), [tasks]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter(t => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setAssigneeId(null);
    setProductId(null); setSelectedMaterial(""); setCustomMaterial(""); setEditing(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (task: any) => {
    setEditing(task);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setAssigneeId(task.assigneeId || null);
    setProductId(task.productId || null);
    const mat = task.materialName || "";
    if (PRODUCTS_MATERIALS.includes(mat)) {
      setSelectedMaterial(mat); setCustomMaterial("");
    } else if (mat) {
      setSelectedMaterial("Boshqa"); setCustomMaterial(mat);
    } else {
      setSelectedMaterial(""); setCustomMaterial("");
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Xatolik", "Sarlavha kiritilishi shart"); return; }
    setSaving(true);
    const materialName = selectedMaterial === "Boshqa" ? customMaterial : selectedMaterial || null;
    const payload = {
      title: title.trim(),
      description: description || null,
      assigneeId: assigneeId || null,
      productId: productId || null,
      materialName,
    };
    try {
      if (editing) {
        await apiFetch(`/tasks/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/tasks", { method: "POST", body: JSON.stringify(payload) });
      }
      Alert.alert("Muvaffaqiyat", editing ? "Yangilandi" : "Qo'shildi");
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert("O'chirish", "Topshiriqni o'chirmoqchimisiz?", [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: async () => {
        try { await apiFetch(`/tasks/${id}`, { method: "DELETE" }); await load(); } catch {}
      }},
    ]);
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
  };

  const activeEmployees = employees.filter(e => e.status === "active");

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Header gradient */}
        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>📋 Topshiriqlar boshqaruvi</Text>
          <Text style={styles.headerSub}>{stats.total} ta topshiriq · {stats.pending} ta kutilmoqda</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { value: stats.total, label: "Jami", bg: "#f5f5f4", color: colors.text },
            { value: stats.pending, label: "Kutilmoqda", bg: "#fef3c7", color: "#d97706" },
            { value: stats.inProgress, label: "Jarayonda", bg: "#dbeafe", color: "#2563eb" },
            { value: stats.completed, label: "Bajarildi", bg: "#dcfce7", color: "#16a34a" },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={styles.filterRow}>
            {(["all", "pending", "in_progress", "completed"] as const).map(s => (
              <TouchableOpacity key={s} style={[styles.filterBtn, statusFilter === s && styles.filterActive]} onPress={() => setStatusFilter(s)}>
                <Text style={[styles.filterText, statusFilter === s && { color: "#fff" }]}>
                  {s === "all" ? "Barchasi" : STATUS_CONFIG[s]?.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Tasks list */}
        {filtered.length > 0 ? filtered.map(task => {
          const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
          const isCompleted = task.status === "completed";
          return (
            <View key={task.id} style={[styles.taskCard, isCompleted && { opacity: 0.65 }]}>
              {/* Task header */}
              <View style={styles.taskHeader}>
                <View style={[styles.statusDot, { backgroundColor: st.bg }]}>
                  <Text style={{ fontSize: 14 }}>{st.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, isCompleted && styles.taskTitleDone]} numberOfLines={2}>{task.title}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => openEdit(task)} style={styles.editBtnSmall}>
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                </TouchableOpacity>
              </View>

              {task.description ? <Text style={styles.taskDesc} numberOfLines={3}>{task.description}</Text> : null}

              {/* Meta info */}
              <View style={styles.taskMeta}>
                {task.assigneeName && (
                  <View style={styles.metaPill}>
                    <Text style={styles.metaIcon}>👤</Text>
                    <Text style={styles.metaText}>{task.assigneeName}</Text>
                  </View>
                )}
                {task.productName && (
                  <View style={styles.metaPill}>
                    <Text style={styles.metaIcon}>📦</Text>
                    <Text style={styles.metaText}>{task.productName}</Text>
                  </View>
                )}
                {task.materialName && (
                  <View style={styles.metaPill}>
                    <Text style={styles.metaIcon}>🧱</Text>
                    <Text style={styles.metaText}>{task.materialName}</Text>
                  </View>
                )}
                {task.date && (
                  <View style={styles.metaPill}>
                    <Text style={styles.metaIcon}>📅</Text>
                    <Text style={styles.metaText}>{new Date(task.date).toLocaleDateString("uz")}</Text>
                  </View>
                )}
              </View>

              {/* Status selector + delete */}
              <View style={styles.taskActions}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  <View style={styles.statusBtnRow}>
                    {(["pending", "in_progress", "completed"] as const).map(s => {
                      const cfg = STATUS_CONFIG[s];
                      const isActive = task.status === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.statusBtn, { backgroundColor: cfg.bg }, isActive && styles.statusBtnActive]}
                          onPress={() => updateStatus(task.id, s)}
                        >
                          <Text style={[styles.statusBtnText, { color: cfg.text }, isActive && { color: "#fff" }]}>
                            {cfg.icon} {cfg.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(task.id)}>
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }) : (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
            </View>
            <Text style={styles.emptyText}>Topshiriqlar yo'q</Text>
            <Text style={styles.emptyHint}>Yangi topshiriq qo'shish uchun "+" tugmasini bosing</Text>
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
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? "✏️ Tahrirlash" : "Yangi topshiriq"}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Sarlavha *</Text>
              <TextInput style={styles.fieldInput} value={title} onChangeText={setTitle} placeholder="Topshiriq nomi" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Izoh</Text>
              <TextInput style={[styles.fieldInput, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Batafsil yozing..." multiline numberOfLines={4} placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Mas'ul (hodim)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <TouchableOpacity style={[styles.chip, !assigneeId && styles.chipActive]} onPress={() => setAssigneeId(null)}>
                  <Text style={[styles.chipText, !assigneeId && { color: "#fff" }]}>Tanlanmagan</Text>
                </TouchableOpacity>
                {activeEmployees.map(emp => (
                  <TouchableOpacity key={emp.id} style={[styles.chip, assigneeId === emp.id && styles.chipActive]} onPress={() => setAssigneeId(emp.id)}>
                    <Text style={[styles.chipText, assigneeId === emp.id && { color: "#fff" }]}>{emp.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Mahsulot (ixtiyoriy)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <TouchableOpacity style={[styles.chip, !productId && styles.chipActive]} onPress={() => setProductId(null)}>
                  <Text style={[styles.chipText, !productId && { color: "#fff" }]}>Tanlanmagan</Text>
                </TouchableOpacity>
                {products.map(p => (
                  <TouchableOpacity key={p.id} style={[styles.chip, productId === p.id && styles.chipActive]} onPress={() => setProductId(p.id)}>
                    <Text style={[styles.chipText, productId === p.id && { color: "#fff" }]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Material (ixtiyoriy)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <TouchableOpacity style={[styles.chip, !selectedMaterial && styles.chipActive]} onPress={() => { setSelectedMaterial(""); setCustomMaterial(""); }}>
                  <Text style={[styles.chipText, !selectedMaterial && { color: "#fff" }]}>Yo'q</Text>
                </TouchableOpacity>
                {PRODUCTS_MATERIALS.map(mat => (
                  <TouchableOpacity key={mat} style={[styles.chip, selectedMaterial === mat && styles.chipActive]} onPress={() => { setSelectedMaterial(mat); setCustomMaterial(""); }}>
                    <Text style={[styles.chipText, selectedMaterial === mat && { color: "#fff" }]}>{mat}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.chip, selectedMaterial === "Boshqa" && styles.chipActive]} onPress={() => setSelectedMaterial("Boshqa")}>
                  <Text style={[styles.chipText, selectedMaterial === "Boshqa" && { color: "#fff" }]}>Boshqa</Text>
                </TouchableOpacity>
              </ScrollView>
              {selectedMaterial === "Boshqa" && (
                <TextInput style={[styles.fieldInput, { marginBottom: 12 }]} value={customMaterial} onChangeText={setCustomMaterial} placeholder="Material nomini kiriting..." placeholderTextColor={colors.textMuted} />
              )}

              <View style={styles.fieldHint}>
                <Text style={styles.fieldHintText}>Sana: avtomatik (bugun)</Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelText}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveText}>{saving ? "Saqlanmoqda..." : editing ? "Yangilash" : "Saqlash"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  headerGradient: {
    backgroundColor: colors.primary, paddingTop: 12, paddingBottom: 20,
    paddingHorizontal: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: spacing.lg,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  statCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  taskCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    marginBottom: spacing.md, marginHorizontal: spacing.lg, ...shadows.sm,
  },
  taskHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: spacing.sm },
  statusDot: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  taskTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 },
  taskTitleDone: { textDecorationLine: "line-through", color: colors.textMuted },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  editBtnSmall: { padding: 6 },
  taskDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 18 },
  taskMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.sm },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaIcon: { fontSize: 11 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  taskActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  statusBtnRow: { flexDirection: "row", gap: 6 },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md },
  statusBtnActive: { backgroundColor: colors.primary },
  statusBtnText: { fontSize: 11, fontWeight: "600" },
  deleteBtn: { padding: 8, backgroundColor: "#fee2e2", borderRadius: radius.md },
  empty: { padding: 60, alignItems: "center" },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center", marginBottom: spacing.md },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: "600" },
  emptyHint: { fontSize: 12, color: colors.textMuted, marginTop: 6, textAlign: "center" },
  fab: {
    position: "absolute", bottom: 24, right: 20, width: 60, height: 60,
    borderRadius: 30, backgroundColor: colors.primary, justifyContent: "center",
    alignItems: "center", ...shadows.lg, zIndex: 100,
  },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xxl, paddingBottom: 40, maxHeight: "90%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalCloseBtn: { padding: 4 },
  modalClose: { fontSize: 24, color: colors.textMuted },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  fieldInput: {
    height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt,
  },
  textArea: { height: 80, textAlignVertical: "top", paddingTop: 12 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt, marginRight: 6, borderWidth: 1.5, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  fieldHint: { marginTop: spacing.sm },
  fieldHintText: { fontSize: 11, color: colors.textMuted },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
