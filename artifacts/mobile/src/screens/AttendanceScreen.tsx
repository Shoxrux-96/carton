import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

export default function AttendanceScreen() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const load = async () => {
    try {
      const [emps, att] = await Promise.all([
        apiFetch("/employees"),
        apiFetch(`/attendance?date=${date}`),
      ]);
      setEmployees(Array.isArray(emps) ? emps : []);
      setAttendance(Array.isArray(att) ? att : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getStatus = (empId: number) => {
    const rec = attendance.find((a: any) => a.employeeId === empId);
    return rec?.status || null;
  };

  const markAttendance = async (employeeId: number, status: string) => {
    setSaving(employeeId);
    try {
      await apiFetch("/attendance", {
        method: "POST",
        body: JSON.stringify({ employeeId, date, status }),
      });
      await load();
    } catch (e: any) {
      Alert.alert("Xatolik", e.message);
    } finally {
      setSaving(null);
    }
  };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    present: { bg: "#dcfce7", text: "#16a34a", label: "Keldi ✅" },
    absent: { bg: "#fee2e2", text: "#dc2626", label: "Kelmadi ❌" },
    late: { bg: "#fef3c7", text: "#d97706", label: "Kech qoldi ⏰" },
  };

  const activeCount = employees.filter(e => e.status === "active").length;
  const presentCount = attendance.filter(a => a.status === "present").length;
  const absentCount = attendance.filter(a => a.status === "absent").length;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Jami xodim</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.summaryValue}>{presentCount}</Text>
          <Text style={styles.summaryLabel}>Keldi</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.danger }]}>
          <Text style={styles.summaryValue}>{absentCount}</Text>
          <Text style={styles.summaryLabel}>Kelmadi</Text>
        </View>
      </View>

      <Text style={styles.dateText}>📅 {date}</Text>

      {/* Employee list */}
      {employees.filter(e => e.status === "active").map((emp) => {
        const status = getStatus(emp.id);
        const statusInfo = status ? statusColors[status] : null;
        const isSaving = saving === emp.id;

        return (
          <View key={emp.id} style={styles.empCard}>
            <View style={styles.empInfo}>
              <View style={styles.empAvatar}>
                <Text style={styles.empAvatarText}>{emp.name?.charAt(0) || "?"}</Text>
              </View>
              <View>
                <Text style={styles.empName}>{emp.name}</Text>
                <Text style={styles.empPosition}>{emp.position || "Xodim"}</Text>
              </View>
            </View>

            {statusInfo ? (
              <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
              </View>
            ) : null}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.markBtn, { backgroundColor: "#dcfce7" }, status === "present" && styles.activeBtn]}
                onPress={() => markAttendance(emp.id, "present")}
                disabled={isSaving}
              >
                <Text style={[styles.markBtnText, { color: "#16a34a" }]}>✅</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.markBtn, { backgroundColor: "#fef3c7" }, status === "late" && styles.activeBtn]}
                onPress={() => markAttendance(emp.id, "late")}
                disabled={isSaving}
              >
                <Text style={[styles.markBtnText, { color: "#d97706" }]}>⏰</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.markBtn, { backgroundColor: "#fee2e2" }, status === "absent" && styles.activeBtn]}
                onPress={() => markAttendance(emp.id, "absent")}
                disabled={isSaving}
              >
                <Text style={[styles.markBtnText, { color: "#dc2626" }]}>❌</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {employees.filter(e => e.status === "active").length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Xodimlar topilmadi</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderLeftWidth: 3, ...shadows.sm,
  },
  summaryValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  summaryLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  dateText: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: spacing.lg },
  empCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, ...shadows.sm,
  },
  empInfo: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.sm },
  empAvatar: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight,
    justifyContent: "center", alignItems: "center",
  },
  empAvatarText: { fontSize: 16, fontWeight: "700", color: colors.primary },
  empName: { fontSize: 15, fontWeight: "700", color: colors.text },
  empPosition: { fontSize: 12, color: colors.textMuted },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 8 },
  markBtn: { flex: 1, height: 40, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  activeBtn: { borderWidth: 2, borderColor: colors.primary },
  markBtnText: { fontSize: 18 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
