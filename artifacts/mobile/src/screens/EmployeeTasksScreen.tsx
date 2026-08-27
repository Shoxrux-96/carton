import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch, getUser } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: "Kutilmoqda", bg: "#fef3c7", text: "#d97706", icon: "⏳" },
  in_progress: { label: "Jarayonda", bg: "#dbeafe", text: "#2563eb", icon: "🔄" },
  completed: { label: "Bajarildi", bg: "#dcfce7", text: "#16a34a", icon: "✅" },
};

const NEXT_STATUS: Record<string, string> = {
  pending: "in_progress",
  in_progress: "completed",
};

export default function EmployeeTasksScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [showDetail, setShowDetail] = useState<any>(null);
  const [userId, setUserId] = useState<number | null>(null);

  const load = async () => {
    try {
      const user = await getUser();
      setUserId(user?.id ?? null);
      const allTasks = await apiFetch("/tasks");
      const list = Array.isArray(allTasks) ? allTasks : [];
      if (user?.id) {
        setTasks(list.filter((t: any) => t.assigneeId === user.id));
      } else {
        setTasks(list);
      }
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

  const updateStatus = async (id: number, newStatus: string) => {
    const label = newStatus === "completed" ? "Bajarildi" : "Jarayonda";
    Alert.alert("Holat o'zgartirish", `"${label}" deb belgilamoqchimisiz?`, [
      { text: "Yo'q" },
      { text: "Ha", onPress: async () => {
        try {
          await apiFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
          setShowDetail(null);
          await load();
        } catch (e: any) { Alert.alert("Xatolik", e.message); }
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>

        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>📋 Topshiriqlarim</Text>
          <Text style={styles.headerSub}>{stats.total} ta topshiriq · {stats.pending + stats.inProgress} ta faol</Text>
        </View>

        <View style={styles.statsRow}>
          {[
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
          const next = NEXT_STATUS[task.status];
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
                  {task.materialName && <Text style={styles.taskRowMetaText}>{task.materialName}</Text>}
                  {task.date && <Text style={styles.taskRowMetaText}>{new Date(task.date).toLocaleDateString("uz")}</Text>}
                </View>
              </View>
              {next && (
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: next === "completed" ? "#dcfce7" : "#dbeafe" }]}
                  onPress={() => updateStatus(task.id, next)}
                >
                  <Text style={[styles.nextBtnText, { color: next === "completed" ? "#16a34a" : "#2563eb" }]}>
                    {next === "in_progress" ? "Boshlash" : "Yakunlash"}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }) : (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📋</Text>
            <Text style={styles.emptyText}>Topshiriqlar yo'q</Text>
          </View>
        )}
      </ScrollView>

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
                {NEXT_STATUS[showDetail.status] && (
                  <TouchableOpacity
                    style={[styles.detailActionBtn, { backgroundColor: NEXT_STATUS[showDetail.status] === "completed" ? "#dcfce7" : "#dbeafe" }]}
                    onPress={() => updateStatus(showDetail.id, NEXT_STATUS[showDetail.status])}
                  >
                    <Text style={[styles.detailActionText, { color: NEXT_STATUS[showDetail.status] === "completed" ? "#16a34a" : "#2563eb" }]}>
                      {NEXT_STATUS[showDetail.status] === "in_progress" ? "Boshlash" : "Yakunlash"}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
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
  nextBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  nextBtnText: { fontSize: 11, fontWeight: "700" },

  empty: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },

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
  detailActionBtn: { height: 48, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  detailActionText: { fontSize: 15, fontWeight: "700" },
});
