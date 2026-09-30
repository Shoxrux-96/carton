import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

type CardDef = {
  key: string;
  icon: string;
  title: string;
  desc: string;
  route: string;
  bg: string;
  fg: string;
};

const CARDS: CardDef[] = [
  { key: "employees", icon: "👥", title: "Hodimlar", desc: "Ro'yxat, ma'lumot, maosh", route: "Employees", bg: "#eef2ff", fg: "#4f46e5" },
  { key: "attendance", icon: "✅", title: "Davomat", desc: "Kunlik kelgan/kelmagan", route: "Attendance", bg: "#ecfdf5", fg: "#16a34a" },
  { key: "tasks", icon: "📋", title: "Topshiriqlar", desc: "Berish va bajarish", route: "Tasks", bg: "#fff7ed", fg: "#ea580c" },
  { key: "report", icon: "📊", title: "Hisobot", desc: "Kunlik/oylik/yillik", route: "AttendanceReport", bg: "#eff6ff", fg: "#2563eb" },
  { key: "workdays", icon: "📅", title: "Ish kunlari", desc: "Ish vaqti va dam olish", route: "WorkDays", bg: "#fefce8", fg: "#ca8a04" },
  { key: "salary", icon: "💰", title: "Oylik maosh", desc: "Hisoblash va to'lov", route: "Salary", bg: "#fdf2f8", fg: "#db2777" },
  { key: "faceatt", icon: "🤳", title: "Face ID davomat", desc: "Yuz orqali belgilash", route: "FaceAttendance", bg: "#f0fdfa", fg: "#0d9488" },
  { key: "facereg", icon: "📸", title: "Yuz ro'yxati", desc: "Hodim yuzini qo'shish", route: "FaceRegister", bg: "#f5f3ff", fg: "#7c3aed" },
];

export default function HRHubScreen({ navigation }: any) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [emps, tasks, offDays] = await Promise.all([
        apiFetch("/employees").catch(() => []),
        apiFetch("/tasks").catch(() => []),
        apiFetch("/settings/off-days").catch(() => null),
      ]);
      const activeEmp = Array.isArray(emps) ? emps.filter((e: any) => e.status === "active").length : 0;
      const openTasks = Array.isArray(tasks)
        ? tasks.filter((t: any) => t.status !== "finished" && t.status !== "done" && t.status !== "completed").length
        : 0;
      const offs = offDays && Array.isArray(offDays.offDays) ? offDays.offDays.length : 0;
      setCounts({
        employees: `${activeEmp} nafar`,
        tasks: `${openTasks} ta ochiq`,
        workdays: `${offs} ta dam olish`,
      });
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={st.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.header}>
        <Text style={st.headerTitle}>👥 HR boshqaruvi</Text>
        <Text style={st.headerDesc}>Barcha HR bo'limlari — web bilan bir xil</Text>
      </View>

      <View style={st.grid}>
        {CARDS.map(c => (
          <TouchableOpacity
            key={c.key}
            style={st.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate(c.route)}
          >
            <View style={[st.iconBox, { backgroundColor: c.bg }]}>
              <Text style={st.icon}>{c.icon}</Text>
            </View>
            <Text style={st.cardTitle}>{c.title}</Text>
            <Text style={st.cardDesc}>{c.desc}</Text>
            {counts[c.key] ? <Text style={[st.badge, { color: c.fg }]}>{counts[c.key]}</Text> : null}
            <View style={[st.arrow, { backgroundColor: c.bg }]}>
              <Text style={[st.arrowT, { color: c.fg }]}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  header: { marginBottom: spacing.lg },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  headerDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47.5%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  icon: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  cardDesc: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  badge: { fontSize: 11, fontWeight: "700", marginTop: 8 },
  arrow: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowT: { fontSize: 16, fontWeight: "800", lineHeight: 18 },
});
