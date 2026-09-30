import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch, getUser } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const WD = ["Du","Se","Ch","Pa","Ju","Sh","Ya"];
const WDFULL = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
const STATUS_PRIORITY: Record<string, number> = { absent: 3, late: 2, present: 1 };

const fmtTime = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtMoney = (n: number) => n.toLocaleString("uz-UZ");
const fmtMoneyShort = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(".", ",")} mlrd`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")} mln`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} ming`;
  return String(n);
};

const STATUS_CELL: Record<string, { t: string; c: string; bg: string; i: string }> = {
  present: { t: "Keldi", c: "#16a34a", bg: "#dcfce7", i: "✅" },
  late: { t: "Kech", c: "#d97706", bg: "#fef3c7", i: "⏰" },
  absent: { t: "Kelmadi", c: "#dc2626", bg: "#fee2e2", i: "❌" },
};

// Kalendar kattasi — bitta kun
function CalCell({ cell, onSelect }: { cell: any; onSelect: (d: string) => void }) {
  if (cell.empty) return <View style={[st.calCell, { backgroundColor: "transparent", borderWidth: 0 }]} />;
  const stt = cell.worst ? STATUS_CELL[cell.worst] : null;
  const bg = stt ? stt.bg : cell.weekend ? "#f8fafc" : "#ffffff";
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onSelect(cell.ds)}
      style={[
        st.calCell,
        { backgroundColor: bg },
        cell.isToday && st.calToday,
        cell.isActive && st.calActive,
        cell.future && st.calFutureCell,
      ]}
    >
      <Text style={[st.calDay, stt && { color: stt.c }, cell.future && st.calDayFuture]}>{cell.day}</Text>
      {stt ? <Text style={st.calEmoji}>{stt.i}</Text> : null}
    </TouchableOpacity>
  );
}

export default function AttendanceReportScreen() {
  const [monthReport, setMonthReport] = useState<any[]>([]);
  const [yearReport, setYearReport] = useState<any[]>([]);
  const [todayRecs, setTodayRecs] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showPicker, setShowPicker] = useState(false);
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [myEmpId, setMyEmpId] = useState<number | null>(null);

  const load = async () => {
    try {
      const u = await getUser();
      setMyPhone(u?.phone?.replace(/\+/g, "") || null);
      const role = u?.role || "employee";
      const admin = role === "admin" || role === "owner";
      setIsAdmin(admin);

      const [emps, offs] = await Promise.all([
        apiFetch("/employees").catch(() => []),
        apiFetch("/settings/off-days").catch(() => null),
      ]);
      const empList: any[] = Array.isArray(emps) ? emps : [];
      setEmployees(empList);
      setOffDays(Array.isArray(offs?.offDays) ? offs.offDays.map((d: any) => d.date) : []);

      let meId: number | null = null;
      if (!admin && u?.phone) {
        const me = empList.find(
          (e: any) => e.phone?.replace(/[\+\s]/g, "") === u.phone.replace(/[\+\s]/g, "")
        );
        if (me) meId = me.id;
      }
      setMyEmpId(meId);
      const filt = (rows: any[]) => (meId !== null ? rows.filter((r: any) => r.employeeId === meId) : rows);

      const today = new Date().toISOString().split("T")[0];
      const [mRep, yRep, tRec] = await Promise.all([
        apiFetch(`/attendance/report?year=${selectedYear}&month=${selectedMonth}`),
        apiFetch(`/attendance/report?year=${selectedYear}&month=0`),
        apiFetch(`/attendance?date=${today}`).catch(() => []),
      ]);
      setMonthReport(filt(Array.isArray(mRep) ? mRep : []));
      setYearReport(filt(Array.isArray(yRep) ? yRep : []));
      setTodayRecs(filt(Array.isArray(tRec) ? tRec : []));

      if (period === "month") {
        const mon = await apiFetch(`/attendance/monthly?year=${selectedYear}&month=${selectedMonth}`).catch(() => []);
        setMonthly(filt(Array.isArray(mon) ? mon : []));
      } else {
        setMonthly([]);
      }
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, [period, selectedYear, selectedMonth]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const report = period === "month" ? monthReport : yearReport;
  const totalPresent = report.reduce((s, r) => s + (r.presentDays || 0), 0);
  const totalAbsent = report.reduce((s, r) => s + (r.absentDays || 0), 0);
  const totalLate = report.reduce((s, r) => s + (r.lateDays || 0), 0);

  // ===== Daromad: ish kuni × (oylik maosh ÷ oy ish kunlari) — web "Oylik maosh" formulasi =====
  const workingDaysIn = (y: number, m: number) => {
    const dim = new Date(y, m, 0).getDate();
    const p = `${y}-${String(m).padStart(2, "0")}`;
    const off = offDays.filter(d => d.startsWith(p)).length;
    return Math.max(1, dim - off);
  };
  const salaryOf = (id?: number | null) => {
    if (id == null) return 0;
    return Number(employees.find(e => e.id === id)?.salary) || 0;
  };
  const rateOf = (id: number | null | undefined, y: number, m: number) =>
    Math.round(salaryOf(id) / workingDaysIn(y, m));
  const workedOfRow = (r: any) => (r.presentDays || 0) + (r.lateDays || 0);
  const workedOf = (rows: any[]) => rows.reduce((s, r) => s + workedOfRow(r), 0);

  const now = new Date();
  const incomeToday = todayRecs.reduce(
    (s, r) => (r.status === "present" || r.status === "late")
      ? s + rateOf(r.employeeId, now.getFullYear(), now.getMonth() + 1) : s, 0);
  const incomeMonth = monthReport.reduce(
    (s, r) => s + workedOfRow(r) * rateOf(r.employeeId, selectedYear, selectedMonth), 0);
  const incomeYear = yearReport.reduce(
    (s, r) => s + workedOfRow(r) * rateOf(r.employeeId, selectedYear, Number(r.month) || selectedMonth), 0);
  const mySalary = salaryOf(myEmpId);
  const totalSalary = employees.reduce((s, e) => s + (Number(e.salary) || 0), 0);
  const monthWorked = workedOf(monthReport);
  const yearWorked = workedOf(yearReport);

  const periodLabel = period === "month" ? `${months[selectedMonth-1]} ${selectedYear}` : String(selectedYear);

  // ===== Oylik ish kunlari (kalendar) =====
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  // ===== Kalendar ko'rinishi =====
  const activeDate = React.useMemo(() => {
    if (selDate && selDate.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`)) return selDate;
    const today = new Date().toISOString().split("T")[0];
    const mm = String(selectedMonth).padStart(2, "0");
    const todayInMonth = today.startsWith(`${selectedYear}-${mm}`);
    return todayInMonth ? today : `${selectedYear}-${mm}-01`;
  }, [selDate, selectedYear, selectedMonth]);

  const calCells = React.useMemo(() => {
    if (period !== "month") return [] as any[];
    const mm = String(selectedMonth).padStart(2, "0");
    const byDate: Record<string, any[]> = {};
    monthly.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });
    const firstDow = new Date(`${selectedYear}-${mm}-01T00:00:00`).getDay();
    const lead = (firstDow + 6) % 7;
    const cells: any[] = [];
    for (let i = 0; i < lead; i++) cells.push({ empty: true, key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${selectedYear}-${mm}-${String(d).padStart(2, "0")}`;
      const recs = byDate[ds] || [];
      let worst: string | null = null;
      recs.forEach(r => {
        if (r.status && (!worst || (STATUS_PRIORITY[r.status] || 0) > (STATUS_PRIORITY[worst] || 0))) worst = r.status;
      });
      cells.push({
        day: d, ds, recs, worst,
        future: ds > todayStr,
        weekend: [0, 6].includes(new Date(`${ds}T00:00:00`).getDay()),
        isToday: ds === todayStr,
        isActive: ds === activeDate,
      });
    }
    // Oxirgi haftani to'ldirish — haqiqiy kalendardek har qator 7 katak
    while (cells.length % 7 !== 0) {
      cells.push({ empty: true, key: `e${cells.length}` });
    }
    return cells;
  }, [period, monthly, selectedYear, selectedMonth, daysInMonth, todayStr, activeDate]);

  const selDetail = React.useMemo(() => {
    if (period !== "month") return [] as any[];
    return monthly.filter(r => r.date === activeDate);
  }, [period, monthly, activeDate]);

  const selDow = new Date(`${activeDate}T00:00:00`).getDay();

  // ===== Yillik sonlar (hodim uchun — 12 oy) =====
  const yearRows = React.useMemo(() => {
    if (period !== "year" || isAdmin) return [] as any[];
    const byM: Record<string, any> = {};
    report.forEach(r => {
      const m = String(r.month || "").padStart(2, "0");
      byM[m] = r;
    });
    const rows: any[] = [];
    for (let i = 0; i < 12; i++) {
      const r = byM[String(i + 1).padStart(2, "0")];
      const worked = (r?.presentDays || 0) + (r?.lateDays || 0);
      rows.push({
        name: months[i],
        present: r?.presentDays || 0,
        late: r?.lateDays || 0,
        absent: r?.absentDays || 0,
        total: r?.totalDays || 0,
        worked,
        income: worked * rateOf(r?.employeeId ?? myEmpId, selectedYear, i + 1),
      });
    }
    return rows;
  }, [period, isAdmin, report, myEmpId, selectedYear, offDays, employees]);

  // ===== Yillik xulosa (admin — har bir hodim bo'yicha, oylik qatorlarni yig'ish) =====
  const empYear = React.useMemo(() => {
    if (period !== "year" || !isAdmin) return [] as any[];
    const map = new Map<number, any>();
    report.forEach(r => {
      let e = map.get(r.employeeId);
      if (!e) {
        e = {
          employeeName: r.employeeName, employeePosition: r.employeePosition,
          totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, income: 0,
        };
        map.set(r.employeeId, e);
      }
      e.totalDays += r.totalDays || 0;
      e.presentDays += r.presentDays || 0;
      e.absentDays += r.absentDays || 0;
      e.lateDays += r.lateDays || 0;
      e.income += workedOfRow(r) * rateOf(r.employeeId, selectedYear, Number(r.month) || selectedMonth);
    });
    return [...map.values()].sort((a, b) => String(a.employeeName).localeCompare(String(b.employeeName)));
  }, [period, isAdmin, report, selectedYear, selectedMonth, offDays, employees]);

  const renderEmpCard = (r: any, i: number) => (
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
      <View style={st.cardIncome}>
        <Text style={st.cardSalary}>Oylik maosh: {fmtMoney(salaryOf(r.employeeId))} so'm</Text>
        <Text style={st.cardIncomeTxt}>
          💰 Daromad: {fmtMoney(
            r.income != null
              ? r.income
              : workedOfRow(r) * rateOf(r.employeeId, selectedYear, Number(r.month) || selectedMonth)
          )} so'm
        </Text>
      </View>
    </View>
  );

  return (
    <View style={st.container}>
      
      <ScrollView style={st.scroll} contentContainerStyle={st.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} showsVerticalScrollIndicator={false}>

        {/* Period selector */}
        <View style={st.filterRow}>
          {([["month","Oy"],["year","Yil"]] as const).map(([k,l]) => (
            <TouchableOpacity key={k} style={[st.filterBtn, period === k && st.filterActive]} onPress={() => setPeriod(k)}>
              <Text style={[st.filterText, period === k && { color: "#fff" }]}>{l}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={st.calBtn} onPress={() => setShowPicker(true)} testID="periodBtn">
            <Text style={st.calIcon}>📅</Text>
            <Text style={st.calText}>{periodLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary — sonlar */}
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

        {/* Daromad — oylik maoshdan (web "Oylik maosh" sahifasi) */}
        <View style={st.incomeCard}>
          <View style={st.incomeHead}>
            <Text style={st.incomeTitle}>💵 Daromad</Text>
            <View style={st.rateBox}>
              <Text style={st.salaryVal}>
                {isAdmin ? "Jami oylik maosh" : "Oylik maosh"}: {fmtMoney(isAdmin ? totalSalary : mySalary)} so'm
              </Text>
            </View>
          </View>
          <View style={st.incomeRow}>
            <View style={st.incomeItem}>
              <Text style={[st.incomeVal, { color: "#16a34a" }]}>
                {fmtMoney(incomeToday)}<Text style={st.incomeUnit}> so'm</Text>
              </Text>
              <Text style={st.incomeLbl}>Bugun</Text>
            </View>
            <View style={st.incomeItem}>
              <Text style={[st.incomeVal, { color: "#2563eb" }]}>
                {fmtMoney(incomeMonth)}<Text style={st.incomeUnit}> so'm</Text>
              </Text>
              <Text style={st.incomeLbl}>
                {months[selectedMonth - 1]}{selectedYear !== now.getFullYear() ? ` ${selectedYear}` : ""}
              </Text>
            </View>
            <View style={st.incomeItem}>
              <Text style={[st.incomeVal, { color: "#7c3aed" }]}>
                {fmtMoney(incomeYear)}<Text style={st.incomeUnit}> so'm</Text>
              </Text>
              <Text style={st.incomeLbl}>{selectedYear} yil</Text>
            </View>
          </View>
          <Text style={st.incomeNote}>
            Daromad = ish kuni × (oylik maosh ÷ oy ish kunlari). Oylik maosh «Oylik maosh» sahifasida
            belgilanadi — oy almashtirilsa shu oyga mos avtomat hisoblanadi
          </Text>
        </View>

        <>
            {/* Oylik ish kunlari — kalendar (faqat "Oy" rejimida) */}
            {/* Oylik ish kunlari — kalendar (faqat "Oy" rejimida) */}
            {period === "month" && (
            <View style={st.tableWrap}>
              <View style={st.tableHead}>
                <Text style={st.tableTitle}>🗓️ Oylik ish kunlari</Text>
                <Text style={st.tableSub}>{months[selectedMonth - 1]} {selectedYear}</Text>
              </View>

              {/* Hafta kunlari sarlavhasi */}
              <View style={st.calWeekRow}>
                {WD.map(w => <Text key={w} style={st.calWeekT}>{w}</Text>)}
              </View>

              {/* Kalendar katakchalari */}
              <View style={st.calGrid}>
                {calCells.map((c: any) => (
                  <CalCell key={c.key || c.ds} cell={c} onSelect={setSelDate} />
                ))}
              </View>

              {/* Izoh (legend) */}
              <View style={st.legendRow}>
                <Text style={st.legendItem}>✅ Keldi</Text>
                <Text style={st.legendItem}>⏰ Kech</Text>
                <Text style={st.legendItem}>❌ Kelmadi</Text>
              </View>

              {/* Tanlangan kun tafsiloti */}
              <View style={st.detailBox}>
                <Text style={st.detailTitle}>
                  📌 {WDFULL[selDow]}, {activeDate.slice(8, 10)}.{activeDate.slice(5, 7)}.{activeDate.slice(0, 4)}
                </Text>
                {selDetail.length === 0 ? (
                  <Text style={st.detailEmpty}>
                    {activeDate > todayStr ? "⏳ Kelajakdagi kun" : "— Yozuv yo'q"}
                  </Text>
                ) : selDetail.map((r: any, i: number) => {
                  const s = STATUS_CELL[r.status] || null;
                  return (
                    <View key={i} style={st.detailRow}>
                      {isAdmin && <Text style={st.detailName} numberOfLines={1}>{r.employeeName || "Noma'lum"}</Text>}
                      <View style={[st.badge, { backgroundColor: s?.bg || "#f1f5f9" }]}>
                        <Text style={[st.badgeTxt, { color: s?.c || "#64748b" }]}>{s ? `${s.i} ${s.t}` : "—"}</Text>
                      </View>
                      <Text style={st.detailTime}>{fmtTime(r.createdAt) || "—"}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            )}

            {/* Oylik xulosa qatlari (admin — har bir hodim bo'yicha) */}
            {period === "month" && isAdmin && (report.length > 0 ? report.map(renderEmpCard) : <View style={st.empty}><Text style={st.emptyText}>Hisobot topilmadi</Text></View>)}

            {/* Yillik hisobot — sonlarda (12 oy) */}
            {period === "year" && !isAdmin && (
              <View style={st.tableWrap}>
                <View style={st.tableHead}>
                  <Text style={st.tableTitle}>📊 Yillik davomat (sonlarda)</Text>
                  <Text style={st.tableSub}>{selectedYear}</Text>
                </View>
                {yearRows.map((row, i) => (
                  <View key={i} style={[st.yearRowCard, i % 2 === 1 && st.yearRowAlt]}>
                    <Text style={st.yearMonth}>{row.name}</Text>
                    <View style={st.yearCounts}>
                      <Text style={[st.yearCnt, { color: "#16a34a" }]}>✅ {row.present}</Text>
                      <Text style={[st.yearCnt, { color: "#d97706" }]}>⏰ {row.late}</Text>
                      <Text style={[st.yearCnt, { color: "#dc2626" }]}>❌ {row.absent}</Text>
                      <Text style={st.yearTotal}>{row.worked} kun</Text>
                      <Text style={[st.yearCnt, { color: "#0f766e" }]}>💰 {fmtMoneyShort(row.income)}</Text>
                    </View>
                  </View>
                ))}
                <View style={[st.yearRowCard, st.yearTotalRow]}>
                  <Text style={[st.yearMonth, { color: colors.primary }]}>Jami</Text>
                  <View style={st.yearCounts}>
                    <Text style={[st.yearCnt, { color: "#16a34a" }]}>✅ {totalPresent}</Text>
                    <Text style={[st.yearCnt, { color: "#d97706" }]}>⏰ {totalLate}</Text>
                    <Text style={[st.yearCnt, { color: "#dc2626" }]}>❌ {totalAbsent}</Text>
                    <Text style={st.yearTotal}>{yearWorked} kun</Text>
                    <Text style={[st.yearCnt, { color: "#0f766e" }]}>💰 {fmtMoneyShort(incomeYear)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Yillik xulosa (admin — har bir hodim bo'yicha) */}
            {period === "year" && isAdmin && (empYear.length > 0 ? empYear.map(renderEmpCard) : <View style={st.empty}><Text style={st.emptyText}>Hisobot topilmadi</Text></View>)}
          </>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showPicker} animationType="fade" transparent>
        <TouchableOpacity style={st.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={st.pickerBox}>
            <Text style={st.pickerTitle}>📅 {period === "month" ? "Oy tanlang" : "Yil tanlang"}</Text>

            {/* Year arrows */}
            <View style={st.yearRow}>
              <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={st.yearArr}><Text style={st.yearArrT}>◀</Text></TouchableOpacity>
              <Text style={st.yearVal}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)} style={st.yearArr}><Text style={st.yearArrT}>▶</Text></TouchableOpacity>
            </View>

            {/* Month grid */}
            {period === "month" && (
              <View style={st.monthGrid}>
                {months.map((m, i) => (
                  <TouchableOpacity key={i} style={[st.monthItem, selectedMonth === i+1 && st.monthItemOn]} onPress={() => { setSelectedMonth(i+1); setShowPicker(false); }}>
                    <Text style={[st.monthItemT, selectedMonth === i+1 && { color: "#fff" }]}>{m.slice(0,3)}</Text>
                  </TouchableOpacity>
                ))}
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
  container: {flex: 1, backgroundColor: colors.background },
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
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md },
  stat: { alignItems: "center" },
  statN: { fontSize: 18, fontWeight: "800" },
  statL: { fontSize: 9, color: colors.textMuted },
  progBg: { height: 5, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: "hidden", marginTop: 8 },
  progFill: { height: 5, backgroundColor: colors.success, borderRadius: 3 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textMuted },
  // ===== Oylik ish kunlari (kalendar) =====
  tableWrap: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 10, marginBottom: spacing.sm, ...shadows.sm },
  tableHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 8 },
  tableTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  tableSub: { fontSize: 11, fontWeight: "700", color: colors.primary },
  badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  badgeTxt: { fontSize: 10, fontWeight: "800" },
  // ===== Kalendar ko'rinishi =====
  calWeekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, paddingHorizontal: 2 },
  calWeekT: { width: "13.5%", textAlign: "center", fontSize: 10, fontWeight: "800", color: colors.textMuted },
  calGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  calCell: {
    width: "13.5%", height: 44, marginBottom: 6, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  calDay: { fontSize: 12, fontWeight: "800", color: colors.text },
  calDayFuture: { color: "#cbd5e1" },
  calEmoji: { fontSize: 10, marginTop: 1 },
  calToday: { borderWidth: 2, borderColor: "#f97316" },
  calActive: { borderWidth: 2, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  calFutureCell: { backgroundColor: "#f8fafc" },
  legendRow: { flexDirection: "row", gap: 14, justifyContent: "center", marginTop: 6, marginBottom: 10 },
  legendItem: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
  detailBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12 },
  detailTitle: { fontSize: 12, fontWeight: "800", color: colors.text, marginBottom: 8 },
  detailEmpty: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f011" },
  detailName: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.text },
  detailTime: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  // ===== Yillik sonlar =====
  yearRowCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  yearRowAlt: { backgroundColor: "#f8fafc" },
  yearMonth: { fontSize: 12, fontWeight: "800", color: colors.text, width: 62 },
  yearCounts: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1, justifyContent: "flex-end", flex: 1 },
  yearCnt: { fontSize: 12, fontWeight: "800" },
  yearTotal: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  yearTotalRow: { backgroundColor: colors.surfaceAlt, borderBottomWidth: 0, marginTop: 4 },
  // ===== Daromad =====
  incomeCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: "#16a34a33", ...shadows.sm,
  },
  incomeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  incomeTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  rateBox: { alignItems: "flex-end", flexShrink: 1 },
  salaryVal: { fontSize: 12, fontWeight: "800", color: colors.text },
  incomeRow: { flexDirection: "row", gap: 8 },
  incomeItem: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingVertical: 10, paddingHorizontal: 4, alignItems: "center",
  },
  incomeVal: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  incomeUnit: { fontSize: 9, fontWeight: "700" },
  incomeLbl: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, marginTop: 3 },
  incomeNote: { fontSize: 9, color: colors.textMuted, marginTop: 8, lineHeight: 13 },
  cardIncome: { marginTop: 8, alignItems: "flex-end", gap: 2 },
  cardSalary: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  cardIncomeTxt: { fontSize: 12, fontWeight: "800", color: "#0f766e" },
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
