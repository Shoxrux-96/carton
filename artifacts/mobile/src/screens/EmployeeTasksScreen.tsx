import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Alert,
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

const NEXT_LABEL: Record<string, string> = {
  pending: "Boshlash",
  in_progress: "Yakunlash",
};

export default function EmployeeTasksScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [userId, setUserId] = useState<number | null>(null);

  const load = async () => {
    try {
      const user = await getUser();
      setUserId(user?.id ?? null);

      const allTasks = await apiFetch("/tasks");
      const list = Array.isArray(allTasks) ? allTasks : [];

      // Faqat o'zimga tayinlangan topshiriqlar
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
    if (statusFilter === "all") return tasks;
    return tasks.filter(t => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const updateStatus = async (id: number, newStatus: string) => {
    const label = newStatus === "completed" ? "Bajarildi" : "Jarayonda";
    Alert.alert("Holat o'zgartirish", `"${label}" deb belgilamoqchimisiz?`, [
      { text: "Yo'q" },
      { text: "Ha", onPress: async () => {
        try {
          await apiFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
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

        {/* Header */}
        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>📋 Mening topshiriqlarim</Text>
          <Text style={styles.headerSub}>{stats.total} ta topshiriq · {stats.pending + stats.inProgress} ta faol</Text>
        </View>

        {/* Stats */}
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

        {/* Tasks */}
        {filtered.length > 0 ? filtered.map(task => {
          const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
          const isCompleted = task.status === "completed";
          const next = NEXT_STATUS[task.status];
          return (
            <View key={task.id} style={[styles.taskCard, isCompleted && { opacity: 0.65 }]}>
              <View style={styles.taskHeader}>
                <View style={[styles.statusDot, { backgroundColor: st.bg }]}>
                  <Text style={{ fontSize: 18 }}>{st.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, isCompleted && styles.taskTitleDone]} numberOfLines={2}>{task.title}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
              </View>

              {task.description ? <Text style={styles.taskDesc} numberOfLines={4}>{task.description}</Text> : null}

              <View style={styles.taskMeta}>
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

              {next && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: next === "completed" ? "#dcfce7" : "#dbeafe" }]}
                  onPress={() => updateStatus(task.id, next)}
                >
                  <Text style={[styles.actionText, { color: next === "completed" ? "#16a34a" : "#2563eb" }]}>
                    {next === "in_progress" ? "▶️ Boshlash" : "✅ Yakunlash"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }) : (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={{ fontSize: 40 }}>📋</Text>
            </View>
            <Text style={styles.emptyText}>Topshiriqlar yo'q</Text>
            <Text style={styles.emptyHint}>Sizga tayinlangan topshiriqlar shu yerda ko'rinadi</Text>
          </View>
        )}
      </ScrollView>
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
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  taskCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    marginBottom: spacing.md, marginHorizontal: spacing.lg, ...shadows.sm,
  },
  taskHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: spacing.sm },
  statusDot: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  taskTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  taskTitleDone: { textDecorationLine: "line-through", color: colors.textMuted },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  taskDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 19 },
  taskMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.md },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaIcon: { fontSize: 11 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  actionBtn: { paddingVertical: 12, borderRadius: radius.lg, alignItems: "center" },
  actionText: { fontSize: 14, fontWeight: "700" },
  empty: { padding: 60, alignItems: "center" },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center", marginBottom: spacing.md },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: "600" },
  emptyHint: { fontSize: 12, color: colors.textMuted, marginTop: 6, textAlign: "center" },
});
