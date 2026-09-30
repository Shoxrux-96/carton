import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];

const fmt = (n: number) =>
  Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

type Row = {
  employeeId: number;
  employeeName: string;
  position: string;
  monthlySalary: number;
  dailyRate: number;
  present: number;
  late: number;
  absent: number;
  attended: number;
  totalWorkingDays: number;
  calculatedSalary: number;
  deduction: number;
};

export default function SalaryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [employees, setEmployees] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<{ employeeId: number; date: string; status: string }[]>([]);
  const [offDays, setOffDays] = useState<{ date: string; reason: string }[]>([]);

  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  const load = async () => {
    try {
      const [emps, mon, offs] = await Promise.all([
        apiFetch("/employees").catch(() => []),
        apiFetch(`/attendance/monthly?year=${year}&month=${month}`).catch(() => []),
        apiFetch("/settings/off-days").catch(() => null),
      ]);
      setEmployees(Array.isArray(emps) ? emps : []);
      setMonthly(Array.isArray(mon) ? mon : []);
      if (offs && Array.isArray(offs.offDays)) setOffDays(offs.offDays);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [year, month]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const calc = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const offInMonth = offDays.filter(d => d.date.startsWith(yearMonth)).length;
    const totalWorkingDays = daysInMonth - offInMonth;

    const byEmp: Record<number, { present: number; late: number; absent: number }> = {};
    for (const r of monthly) {
      if (!byEmp[r.employeeId]) byEmp[r.employeeId] = { present: 0, late: 0, absent: 0 };
      if (r.status === "present") byEmp[r.employeeId].present += 1;
      else if (r.status === "late") byEmp[r.employeeId].late += 1;
      else if (r.status === "absent") byEmp[r.employeeId].absent += 1;
    }

    const rows: Row[] = employees
      .filter((e: any) => e.status === "active")
      .map((e: any) => {
        const a = byEmp[e.id] || { present: 0, late: 0, absent: 0 };
        const attended = a.present + a.late;
        const monthlySalary = e.salary || 0;
        const dailyRate = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0;
        const calculatedSalary = Math.round(dailyRate * attended);
        return {
          employeeId: e.id,
          employeeName: e.name,
          position: e.position || "",
          monthlySalary,
          dailyRate: Math.round(dailyRate),
          present: a.present,
          late: a.late,
          absent: a.absent,
          attended,
          totalWorkingDays,
          calculatedSalary,
          deduction: monthlySalary - calculatedSalary,
        };
      });

    const totalSalary = rows.reduce((s, r) => s + r.calculatedSalary, 0);
    const totalDeduction = rows.reduce((s, r) => s + r.deduction, 0);
    return { totalWorkingDays, rows, totalSalary, totalDeduction };
  }, [employees, monthly, offDays, year, month, yearMonth]);

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={st.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Period picker */}
      <View style={st.periodRow}>
        <TouchableOpacity style={st.arr} onPress={() => shiftMonth(-1)}>
          <Text style={st.arrT}>◀</Text>
        </TouchableOpacity>
        <Text style={st.periodText}>📅 {MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity style={st.arr} onPress={() => shiftMonth(1)}>
          <Text style={st.arrT}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={st.summaryRow}>
        <View style={[st.summaryCard, { backgroundColor: "#eff6ff" }]}>
          <Text style={[st.summaryVal, { color: "#1d4ed8" }]}>{fmt(calc.totalSalary)}</Text>
          <Text style={st.summaryLbl}>Jami maosh</Text>
        </View>
        <View style={[st.summaryCard, { backgroundColor: "#ecfdf5" }]}>
          <Text style={[st.summaryVal, { color: "#16a34a" }]}>{calc.totalWorkingDays}</Text>
          <Text style={st.summaryLbl}>Ish kuni</Text>
        </View>
        <View style={[st.summaryCard, { backgroundColor: "#fee2e2" }]}>
          <Text style={[st.summaryVal, { color: "#dc2626" }]}>-{fmt(calc.totalDeduction)}</Text>
          <Text style={st.summaryLbl}>Ushlanma</Text>
        </View>
      </View>

      {/* Rows */}
      {calc.rows.length > 0 ? calc.rows.map(r => (
        <View key={r.employeeId} style={st.card}>
          <View style={st.cardHead}>
            <View style={st.avatar}><Text style={st.avatarT}>{r.employeeName?.charAt(0) || "?"}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.empName}>{r.employeeName}</Text>
              <Text style={st.empPos}>{r.position}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={st.calcVal}>{fmt(r.calculatedSalary)}</Text>
              <Text style={st.calcLbl}>hisoblandi</Text>
            </View>
          </View>

          <View style={st.statsRow}>
            <View style={st.stat}>
              <Text style={[st.statN, { color: colors.textSecondary }]}>{fmt(r.monthlySalary)}</Text>
              <Text style={st.statL}>oylik</Text>
            </View>
            <View style={st.stat}>
              <Text style={[st.statN, { color: colors.textSecondary }]}>{fmt(r.dailyRate)}</Text>
              <Text style={st.statL}>kunlik</Text>
            </View>
            <View style={st.stat}>
              <Text style={[st.statN, { color: "#16a34a" }]}>{r.present}</Text>
              <Text style={st.statL}>keldi</Text>
            </View>
            <View style={st.stat}>
              <Text style={[st.statN, { color: "#d97706" }]}>{r.late}</Text>
              <Text style={st.statL}>kech</Text>
            </View>
            <View style={st.stat}>
              <Text style={[st.statN, { color: "#dc2626" }]}>{r.absent}</Text>
              <Text style={st.statL}>yo'q</Text>
            </View>
          </View>

          <View style={st.footRow}>
            <Text style={st.footL}>Qatnashish: <Text style={st.footV}>{r.attended}/{r.totalWorkingDays} kun</Text></Text>
            <Text style={[st.footL, r.deduction > 0 && { color: "#dc2626" }]}>
              Ushlanma: <Text style={st.footV}>{r.deduction > 0 ? `-${fmt(r.deduction)}` : "-"}</Text>
            </Text>
          </View>
        </View>
      )) : (
        <View style={st.empty}>
          <Text style={st.emptyText}>Faol hodimlar topilmadi</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  arr: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  arrT: { fontSize: 14, color: colors.text },
  periodText: { fontSize: 16, fontWeight: "800", color: colors.text },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  summaryCard: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: "center" },
  summaryVal: { fontSize: 17, fontWeight: "800" },
  summaryLbl: { fontSize: 10, color: colors.textSecondary, marginTop: 3 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#fff7ed", justifyContent: "center", alignItems: "center" },
  avatarT: { fontSize: 16, fontWeight: "700", color: colors.primary },
  empName: { fontSize: 15, fontWeight: "800", color: colors.text },
  empPos: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  calcVal: { fontSize: 17, fontWeight: "800", color: "#16a34a" },
  calcLbl: { fontSize: 10, color: colors.textMuted },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  stat: { alignItems: "center", flex: 1 },
  statN: { fontSize: 15, fontWeight: "800" },
  statL: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
  footRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  footL: { fontSize: 11, color: colors.textSecondary },
  footV: { fontWeight: "800", color: colors.text },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textMuted },
});
