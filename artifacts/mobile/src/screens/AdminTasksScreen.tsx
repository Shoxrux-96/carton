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
  const [timeFilter, setTimeFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
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
    let result = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);
    if (timeFilter !== "all") {
      const now = new Date();
      let cutoff: Date;
      if (timeFilter === "daily") {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeFilter === "weekly") {
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      } else {
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      result = result.filter(t => {
        if (!t.date) return false;
        return new Date(t.date) >= cutoff;
      });
    }
    return result;
  }, [tasks, statusFilter, timeFilter]);

  const toggleMaterial = (mat: string) => {
    setSelectedMaterials(prev =>
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    );
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setAssigneeId(null);
    setProductId(null); setSelectedMaterials([]); setCustomMaterial(""); setEditing(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (task: any) => {
    setEditing(task);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setAssigneeId(task.assigneeId || null);
    setProductId(task.productId || null);
    const matStr = task.materialName || "";
    if (matStr) {
      const mats = matStr.split(",").map((s: string) => s.trim()).filter(Boolean);
      const known = mats.filter((m: string) => PRODUCTS_MATERIALS.includes(m));
      const unknown = mats.filter((m: string) => !PRODUCTS_MATERIALS.includes(m));
      setSelectedMaterials(known);
      setCustomMaterial(unknown.join(", "));
    } else {
      setSelectedMaterials([]);
      setCustomMaterial("");
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Xatolik", "Sarlavha kiritilishi shart"); return; }
    setSaving(true);
    const allMats = [...selectedMaterials];
    if (customMaterial.trim()) {
      customMaterial.split(",").map(s => s.trim()).filter(Boolean).forEach(m => allMats.push(m));
    }
    const materialName = allMats.length > 0 ? allMats.join(", ") : null;
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

  const activeEmployees = employees.filter(e => e.status === "active");

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>

        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>📋 Topshiriqlar</Text>
          <Text style={styles.headerSub}>{stats.total} ta topshiriq · {stats.pending} ta kutilmoqda</Text>
        </View>

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={styles.filterRow}>
            {([["all", "Barchasi"], ["daily", "Bugun"], ["weekly", "Bu hafta"], ["monthly", "Bu oy"]] as const).map(([key, label]) => (
              <TouchableOpacity key={key} style={[styles.filterBtn, timeFilter === key && styles.timeFilterActive]} onPress={() => setTimeFilter(key)}>
                <Text style={[styles.filterText, timeFilter === key && { color: "#fff" }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filtered.length > 0 ? filtered.map(task => {
          const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
          const isCompleted = task.status === "completed";
          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskRow, isCompleted && { opacity: 0.6 }]}
              onPress={() => setShowDetail(task)}
              activeOpacity={0.7}
            >
              <View style={[styles.taskStatusDot, { backgroundColor: st.bg }]}>
                <Text style={{ fontSize: 12 }}>{st.icon}</Text>
              </View>
              <View style={styles.taskRowContent}>
                <Text style={[styles.taskRowTitle, isCompleted && { textDecorationLine: "line-through" }]} numberOfLines={1}>
                  {task.title}
                </Text>
                <View style={styles.taskRowMeta}>
                  {task.assigneeName && <Text style={styles.taskRowMetaText}>{task.assigneeName}</Text>}
                  {task.date && <Text style={styles.taskRowMetaText}>{new Date(task.date).toLocaleDateString("uz")}</Text>}
                </View>
              </View>
              <View style={styles.taskRowActions}>
                <TouchableOpacity onPress={() => openEdit(task)} style={styles.taskRowBtn}>
                  <Text style={{ fontSize: 14 }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(task.id)} style={styles.taskRowBtn}>
                  <Text style={{ fontSize: 14 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }) : (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📋</Text>
            <Text style={styles.emptyText}>Topshiriqlar yo'q</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal visible={!!showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Topshiriq</Text>
              <TouchableOpacity onPress={() => setShowDetail(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {showDetail && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailTitle}>{showDetail.title}</Text>
                <View style={[styles.detailBadge, { backgroundColor: (STATUS_CONFIG[showDetail.status] || STATUS_CONFIG.pending).bg }]}>
                  <Text style={[styles.detailBadgeText, { color: (STATUS_CONFIG[showDetail.status] || STATUS_CONFIG.pending).text }]}>
                    {(STATUS_CONFIG[showDetail.status] || STATUS_CONFIG.pending).icon} {(STATUS_CONFIG[showDetail.status] || STATUS_CONFIG.pending).label}
                  </Text>
                </View>
                {showDetail.description ? (
                  <Text style={styles.detailDesc}>{showDetail.description}</Text>
                ) : null}
                <View style={styles.detailInfo}>
                  {showDetail.assigneeName && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailInfoLabel}>Mas'ul:</Text>
                      <Text style={styles.detailInfoValue}>{showDetail.assigneeName}</Text>
                    </View>
                  )}
                  {showDetail.productName && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailInfoLabel}>Mahsulot:</Text>
                      <Text style={styles.detailInfoValue}>{showDetail.productName}</Text>
                    </View>
                  )}
                  {showDetail.materialName && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailInfoLabel}>Materiallar:</Text>
                      <Text style={styles.detailInfoValue}>{showDetail.materialName}</Text>
                    </View>
                  )}
                  {showDetail.date && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailInfoLabel}>Sana:</Text>
                      <Text style={styles.detailInfoValue}>{new Date(showDetail.date).toLocaleDateString("uz")}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.detailEditBtn} onPress={() => { setShowDetail(null); openEdit(showDetail); }}>
                    <Text style={styles.detailEditText}>Tahrirlash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailDeleteBtn} onPress={() => { setShowDetail(null); handleDelete(showDetail.id); }}>
                    <Text style={styles.detailDeleteText}>O'chirish</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? "Tahrirlash" : "Yangi topshiriq"}</Text>
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

              <Text style={styles.fieldLabel}>Materiallar (bir nechta tanlash mumkin)</Text>
              <View style={styles.materialGrid}>
                {PRODUCTS_MATERIALS.map(mat => {
                  const isSelected = selectedMaterials.includes(mat);
                  return (
                    <TouchableOpacity key={mat} style={[styles.materialChip, isSelected && styles.materialChipActive]} onPress={() => toggleMaterial(mat)}>
                      <Text style={[styles.materialChipText, isSelected && { color: "#fff" }]}>{mat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedMaterials.length > 0 && (
                <Text style={styles.selectedInfo}>{selectedMaterials.length} ta material tanlangan</Text>
              )}

              <Text style={styles.fieldLabel}>Boshqa materiallar (vergul bilan ajrating)</Text>
              <TextInput style={[styles.fieldInput, { marginBottom: 12 }]} value={customMaterial} onChangeText={setCustomMaterial} placeholder="Masalan: Zanglamas po'lat" placeholderTextColor={colors.textMuted} />

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
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primary },
  timeFilterActive: { backgroundColor: "#6366f1" },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },

  taskRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: 8,
    marginHorizontal: spacing.lg, ...shadows.sm,
  },
  taskStatusDot: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 10 },
  taskRowContent: { flex: 1 },
  taskRowTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  taskRowMeta: { flexDirection: "row", gap: 8, marginTop: 2 },
  taskRowMetaText: { fontSize: 11, color: colors.textMuted },
  taskRowActions: { flexDirection: "row", gap: 4 },
  taskRowBtn: { padding: 6 },

  empty: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },

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

  detailTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8 },
  detailBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  detailBadgeText: { fontSize: 12, fontWeight: "700" },
  detailDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  detailInfo: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.md, marginBottom: 16 },
  detailInfoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  detailInfoLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  detailInfoValue: { fontSize: 13, color: colors.text, fontWeight: "600" },
  detailActions: { flexDirection: "row", gap: 12 },
  detailEditBtn: { flex: 1, height: 48, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  detailEditText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  detailDeleteBtn: { flex: 1, height: 48, backgroundColor: "#fee2e2", borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  detailDeleteText: { color: "#ef4444", fontSize: 14, fontWeight: "700" },

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
  materialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  materialChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border,
  },
  materialChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  materialChipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  selectedInfo: { fontSize: 12, fontWeight: "600", color: colors.primary, marginBottom: 8 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
