import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch, getUser } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];

export default function AttendanceReportScreen() {
  const [report, setReport] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"day"|"month"|"year">("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split("T")[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [myPhone, setMyPhone] = useState<string | null>(null);

  const load = async () => {
    try {
      const u = await getUser();
      setMyPhone(u?.phone?.replace(/\+/g, "") || null);
      const role = u?.role || "employee";
      const isAdmin = role === "admin" || role === "owner";

      if (period === "day") {
        const data = await apiFetch(`/attendance?date=${selectedDay}`);
        let records = Array.isArray(data) ? data : [];
        // Oddiy hodim faqat o'zini ko'radi
        if (!isAdmin && u?.phone) {
          const emps = await apiFetch("/employees").catch(() => []);
          const me = Array.isArray(emps) ? emps.find((e: any) => e.phone?.replace(/[\+\s]/g, "") === u.phone.replace(/[\+\s]/g, "")) : null;
          if (me) records = records.filter((r: any) => r.employeeId === me.id);
        }
        setReport(records);
      } else {
        const data = await apiFetch(`/attendance/report?year=${selectedYear}&month=${selectedMonth}`);
        let records = Array.isArray(data) ? data : [];
        if (!isAdmin && u?.phone) {
          const emps = await apiFetch("/employees").catch(() => []);
          const me = Array.isArray(emps) ? emps.find((e: any) => e.phone?.replace(/[\+\s]/g, "") === u.phone.replace(/[\+\s]/g, "")) : null;
          if (me) records = records.filter((r: any) => r.employeeId === me.id);
        }
        setReport(records);
      }
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [period, selectedYear, selectedMonth, selectedDay]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totalPresent = report.reduce((s, r) => s + (r.presentDays || 0), 0);
  const totalAbsent = report.reduce((s, r) => s + (r.absentDays || 0), 0);
  const totalLate = report.reduce((s, r) => s + (r.lateDays || 0), 0);

  const periodLabel = period === "day" ? selectedDay : period === "month" ? `${months[selectedMonth-1]} ${selectedYear}` : String(selectedYear);

  return (
    <View style={st.container}>
      <ScrollView style={st.scroll} contentContainerStyle={st.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} showsVerticalScrollIndicator={false}>

        {/* Period selector */}
        <View style={st.filterRow}>
          {([["day","Kun"],["month","Oy"],["year","Yil"]] as const).map(([k,l]) => (
            <TouchableOpacity key={k} style={[st.filterBtn, period === k && st.filterActive]} onPress={() => setPeriod(k)}>
              <Text style={[st.filterText, period === k && { color: "#fff" }]}>{l}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={st.calBtn} onPress={() => setShowPicker(true)}>
            <Text style={st.calIcon}>📅</Text>
            <Text style={st.calText}>{periodLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {period !== "day" && (
          <View style={st.summaryRow}>
            <View style={[st.summaryCard, { backgroundColor: "#ecfdf5" }]}>
              <Text style={[st.summaryVal, { color: "#16a34a" }]}>{totalPresent}</Text>
              <Text style={st.summaryLbl}>Keldi</Text>
            </View>
            <View style={[st.summaryCard, { backgroundColor: "#fee2e2" }]}>
              <Text style={[st.summaryVal, { color: "#dc2626" }]}>{totalAbsent}</Text>
              <Text style={st.summaryLbl}>Kelmadi</Text>
            </View>
            <View style={[st.summaryCard, { backgroundColor: "#fef3c7" }]}>
              <Text style={[st.summaryVal, { color: "#d97706" }]}>{totalLate}</Text>
              <Text style={st.summaryLbl}>Kechikdi</Text>
            </View>
          </View>
        )}

        {/* Report data */}
        {period === "day" ? (
          // Daily view — show each employee status
          report.length > 0 ? report.map((r: any, i: number) => {
            const statusInfo = r.status === "present" ? { label: "Keldi ✅", bg: "#dcfce7", color: "#16a34a" } : r.status === "absent" ? { label: "Kelmadi ❌", bg: "#fee2e2", color: "#dc2626" } : { label: "Kechikdi ⏰", bg: "#fef3c7", color: "#d97706" };
            return (
              <View key={r.id || i} style={st.card}>
                <View style={st.cardRow}>
                  <View style={st.avatar}><Text style={st.avatarT}>{r.employeeName?.charAt(0) || "?"}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.empName}>{r.employeeName || "Noma'lum"}</Text>
                    <Text style={st.empPos}>{r.employeePosition || "—"}</Text>
                  </View>
                  <View style={[st.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[st.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>
              </View>
            );
          }) : <View style={st.empty}><Text style={st.emptyText}>Bu kunga hisobot yo'q</Text></View>
        ) : (
          // Monthly/yearly view
          report.length > 0 ? report.map((r: any, i: number) => (
            <View key={i} style={st.card}>
              <View style={st.cardRow}>
                <View style={st.avatar}><Text style={st.avatarT}>{r.employeeName?.charAt(0) || "?"}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.empName}>{r.employeeName || "Noma'lum"}</Text>
                  <Text style={st.empPos}>{r.employeePosition || "—"}</Text>
                </View>
              </View>
              <View style={st.statsRow}>
                <View style={st.stat}><Text style={[st.statN, { color: "#16a34a" }]}>{r.presentDays || 0}</Text><Text style={st.statL}>keldi</Text></View>
                <View style={st.stat}><Text style={[st.statN, { color: "#dc2626" }]}>{r.absentDays || 0}</Text><Text style={st.statL}>kelmadi</Text></View>
                <View style={st.stat}><Text style={[st.statN, { color: "#d97706" }]}>{r.lateDays || 0}</Text><Text style={st.statL}>kech</Text></View>
                <View style={st.stat}><Text style={[st.statN, { color: colors.text }]}>{r.totalDays || 0}</Text><Text style={st.statL}>jami</Text></View>
              </View>
              <View style={st.progBg}><View style={[st.progFill, { width: `${r.totalDays ? ((r.presentDays||0)/r.totalDays*100) : 0}%` }]} /></View>
            </View>
          )) : <View style={st.empty}><Text style={st.emptyText}>Hisobot topilmadi</Text></View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showPicker} animationType="fade" transparent>
        <TouchableOpacity style={st.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={st.pickerBox}>
            <Text style={st.pickerTitle}>📅 {period === "day" ? "Kun tanlang" : period === "month" ? "Oy tanlang" : "Yil tanlang"}</Text>

            {/* Year arrows */}
            <View style={st.yearRow}>
              <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={st.yearArr}><Text style={st.yearArrT}>◀</Text></TouchableOpacity>
              <Text style={st.yearVal}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)} style={st.yearArr}><Text style={st.yearArrT}>▶</Text></TouchableOpacity>
            </View>

            {/* Month grid */}
            {(period === "month" || period === "day") && (
              <View style={st.monthGrid}>
                {months.map((m, i) => (
                  <TouchableOpacity key={i} style={[st.monthItem, selectedMonth === i+1 && st.monthItemOn]} onPress={() => { setSelectedMonth(i+1); if (period === "month") setShowPicker(false); }}>
                    <Text style={[st.monthItemT, selectedMonth === i+1 && { color: "#fff" }]}>{m.slice(0,3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Day grid for day period */}
            {period === "day" && (
              <View style={st.dayGrid}>
                {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1).map(d => {
                  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                  const isToday = dateStr === selectedDay;
                  return (
                    <TouchableOpacity key={d} style={[st.dayItem, isToday && st.dayItemOn]} onPress={() => { setSelectedDay(dateStr); setShowPicker(false); }}>
                      <Text style={[st.dayItemT, isToday && { color: "#fff" }]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {period === "year" && (
              <TouchableOpacity style={st.doneBtn} onPress={() => setShowPicker(false)}>
                <Text style={st.doneBtnT}>✅ Tanlash</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg, flexWrap: "wrap" },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  calBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.md, backgroundColor: colors.primary + "15", borderWidth: 1, borderColor: colors.primary },
  calIcon: { fontSize: 14 },
  calText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  summaryCard: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: "center" },
  summaryVal: { fontSize: 20, fontWeight: "800" },
  summaryLbl: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff7ed", justifyContent: "center", alignItems: "center" },
  avatarT: { fontSize: 15, fontWeight: "700", color: colors.primary },
  empName: { fontSize: 14, fontWeight: "700", color: colors.text },
  empPos: { fontSize: 11, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md },
  stat: { alignItems: "center" },
  statN: { fontSize: 18, fontWeight: "800" },
  statL: { fontSize: 9, color: colors.textMuted },
  progBg: { height: 5, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: "hidden", marginTop: 8 },
  progFill: { height: 5, backgroundColor: colors.success, borderRadius: 3 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textMuted },
  // Picker
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 30 },
  pickerBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, width: "100%", maxWidth: 320 },
  pickerTitle: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.lg },
  yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: spacing.lg },
  yearArr: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  yearArrT: { fontSize: 16, color: colors.text },
  yearVal: { fontSize: 22, fontWeight: "800", color: colors.text },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  monthItem: { width: "30%", paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  monthItemOn: { backgroundColor: colors.primary },
  monthItemT: { fontSize: 12, fontWeight: "600", color: colors.text },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: spacing.sm },
  dayItem: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  dayItemOn: { backgroundColor: colors.primary },
  dayItemT: { fontSize: 13, fontWeight: "600", color: colors.text },
  doneBtn: { height: 44, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", marginTop: spacing.md },
  doneBtnT: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
