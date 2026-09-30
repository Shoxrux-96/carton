import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Modal, Alert, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const WD = ["Du","Se","Ch","Pa","Ju","Sh","Ya"];

const confirmDelete = (date: string): Promise<boolean> => {
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(`${date} sanasini o'chirasizmi?`) : true);
  }
  return new Promise(resolve => {
    Alert.alert("O'chirish", `${date} sanasini o'chirasizmi?`, [
      { text: "Bekor", style: "cancel", onPress: () => resolve(false) },
      { text: "Ha", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
};

export default function WorkDaysScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Office settings
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusM, setRadiusM] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [lateMinutes, setLateMinutes] = useState("");

  // Off days
  const [offDays, setOffDays] = useState<{ date: string; reason: string }[]>([]);
  const [offDate, setOffDate] = useState("");
  const [offReason, setOffReason] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickYear, setPickYear] = useState(new Date().getFullYear());
  const [pickMonth, setPickMonth] = useState(new Date().getMonth() + 1);

  const load = async () => {
    try {
      const [s, o] = await Promise.all([
        apiFetch("/settings").catch(() => null),
        apiFetch("/settings/off-days").catch(() => null),
      ]);
      if (s && typeof s === "object") {
        setLat(String(s.lat ?? ""));
        setLng(String(s.lng ?? ""));
        setRadiusM(String(s.radius ?? ""));
        setStartTime(s.startTime || "09:00");
        setEndTime(s.endTime || "18:00");
        setLateMinutes(String(s.lateMinutes ?? ""));
      }
      if (o && Array.isArray(o.offDays)) setOffDays(o.offDays);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const saveSettings = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify({
          lat: parseFloat(lat) || 0,
          lng: parseFloat(lng) || 0,
          radius: parseInt(radiusM) || 0,
          startTime,
          endTime,
          lateMinutes: parseInt(lateMinutes) || 0,
        }),
      });
      setMsg("✅ Ish kunlari sozlamasi saqlandi");
    } catch (e: any) {
      setMsg("⚠️ " + (e.message || "Saqlashda xatolik"));
    } finally {
      setSaving(false);
    }
  };

  const addOffDay = async () => {
    if (!offDate) {
      setMsg("⚠️ Avval sanani tanlang");
      return;
    }
    if (offDays.some(d => d.date === offDate)) {
      setMsg("⚠️ Bu sana allaqachon dam olish kuni");
      return;
    }
    try {
      const data = await apiFetch("/settings/off-days", {
        method: "POST",
        body: JSON.stringify({ date: offDate, reason: offReason || "Dam olish" }),
      });
      if (Array.isArray(data?.offDays)) setOffDays(data.offDays);
      setOffDate("");
      setOffReason("");
      setMsg("✅ Dam olish kuni qo'shildi");
    } catch (e: any) {
      setMsg("⚠️ " + (e.message || "Qo'shishda xatolik"));
    }
  };

  const removeOffDay = async (date: string) => {
    if (!(await confirmDelete(date))) return;
    try {
      const data = await apiFetch(`/settings/off-days/${date}`, { method: "DELETE" });
      if (Array.isArray(data?.offDays)) setOffDays(data.offDays);
      setMsg("✅ O'chirildi");
    } catch (e: any) {
      setMsg("⚠️ " + (e.message || "O'chirishda xatolik"));
    }
  };

  // Month calendar
  const daysInMonth = new Date(pickYear, pickMonth, 0).getDate();
  const firstWeekday = (new Date(pickYear, pickMonth - 1, 1).getDay() + 6) % 7; // Du=0
  const isMonthOff = (day: number) =>
    offDays.some(d => d.date === `${pickYear}-${String(pickMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`);

  const field = (label: string, value: string, onChange: (v: string) => void, kb: "numeric" | "default" = "default") => (
    <View style={st.field}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        style={st.input}
        value={value}
        onChangeText={onChange}
        keyboardType={kb}
        autoCapitalize="none"
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={st.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {msg ? (
        <View style={st.msgBox}>
          <Text style={st.msgText}>{msg}</Text>
        </View>
      ) : null}

      {/* ===== Ish vaqti ===== */}
      <Text style={st.sectionTitle}>🕐 Ish vaqti</Text>
      <View style={st.card}>
        <View style={st.row2}>
          {field("Boshlanish", startTime, setStartTime)}
          {field("Tugash", endTime, setEndTime)}
        </View>
        <View style={st.row2}>
          {field("Kechikish (daq)", lateMinutes, setLateMinutes, "numeric")}
          {field("Radius (m)", radiusM, setRadiusM, "numeric")}
        </View>
        <Text style={st.subLabel}>Ofis joylashuvi (kenglik / uzunlik)</Text>
        <View style={st.row2}>
          {field("Latitude", lat, setLat, "numeric")}
          {field("Longitude", lng, setLng, "numeric")}
        </View>
        <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={saveSettings} disabled={saving}>
          <Text style={st.saveBtnT}>{saving ? "Saqlanmoqda..." : "💾 Saqlash"}</Text>
        </TouchableOpacity>
        <Text style={st.hint}>Barcha qurilmalar (web va mobil) bu sozlamani bir xil ko'radi</Text>
      </View>

      {/* ===== Dam olish kunlari ===== */}
      <Text style={st.sectionTitle}>🏖 Dam olish kunlari</Text>
      <View style={st.card}>
        <Text style={st.subLabel}>Sana</Text>
        <View style={st.dateRow}>
          <TouchableOpacity style={st.dateBtn} onPress={() => { setPickYear(new Date().getFullYear()); setPickMonth(new Date().getMonth() + 1); setShowPicker(true); }}>
            <Text style={st.dateBtnT}>{offDate || "📅 Sana tanlash"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[st.subLabel, { marginTop: 10 }]}>Sabab</Text>
        <TextInput
          style={st.input}
          value={offReason}
          onChangeText={setOffReason}
          placeholder="Masalan: Bayram"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity style={st.addBtn} onPress={addOffDay}>
          <Text style={st.addBtnT}>＋ Qo'shish</Text>
        </TouchableOpacity>

        {offDays.length > 0 ? offDays.map(d => (
          <View key={d.date} style={st.offRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.offDate}>{d.date}</Text>
              <Text style={st.offReason}>{d.reason}</Text>
            </View>
            <TouchableOpacity style={st.delBtn} onPress={() => removeOffDay(d.date)}>
              <Text style={st.delBtnT}>🗑</Text>
            </TouchableOpacity>
          </View>
        )) : <Text style={st.empty}>Dam olish kunlari yo'q</Text>}
      </View>

      {/* ===== Calendar ===== */}
      <Text style={st.sectionTitle}>📆 Kalendar</Text>
      <View style={st.card}>
        <View style={st.calHeader}>
          <TouchableOpacity style={st.calArr} onPress={() => setPickMonth(m => (m === 1 ? 12 : m - 1))}>
            <Text style={st.calArrT}>◀</Text>
          </TouchableOpacity>
          <Text style={st.calTitle}>{MONTHS[pickMonth - 1]} {pickYear}</Text>
          <TouchableOpacity style={st.calArr} onPress={() => setPickMonth(m => (m === 12 ? 1 : m + 1))}>
            <Text style={st.calArrT}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={st.calWeek}>
          {WD.map(w => <Text key={w} style={st.calWeekT}>{w}</Text>)}
        </View>
        <View style={st.calGrid}>
          {Array.from({ length: firstWeekday }, (_, i) => <View key={`e${i}`} style={st.calCell} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const off = isMonthOff(day);
            return (
              <View key={day} style={st.calCell}>
                <View style={[st.calDay, off && st.calDayOff]}>
                  <Text style={[st.calDayT, off && { color: "#fff" }]}>{day}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={st.hint}>Qizil — dam olish kuni</Text>
      </View>

      {/* Date picker modal */}
      <Modal visible={showPicker} animationType="fade" transparent>
        <TouchableOpacity style={st.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={st.pickerBox}>
            <Text style={st.pickerTitle}>📅 Sana tanlang</Text>
            <View style={st.calHeader}>
              <TouchableOpacity style={st.calArr} onPress={() => setPickYear(y => y - 1)}>
                <Text style={st.calArrT}>◀</Text>
              </TouchableOpacity>
              <Text style={st.calTitle}>{pickYear}</Text>
              <TouchableOpacity style={st.calArr} onPress={() => setPickYear(y => y + 1)}>
                <Text style={st.calArrT}>▶</Text>
              </TouchableOpacity>
            </View>
            <View style={st.monthGrid}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[st.monthItem, pickMonth === i + 1 && st.monthItemOn]}
                  onPress={() => setPickMonth(i + 1)}
                >
                  <Text style={[st.monthItemT, pickMonth === i + 1 && { color: "#fff" }]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.calWeek}>
              {WD.map(w => <Text key={w} style={st.calWeekT}>{w}</Text>)}
            </View>
            <View style={st.calGrid}>
              {Array.from({ length: firstWeekday }, (_, i) => <View key={`e${i}`} style={st.calCell} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${pickYear}-${String(pickMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const on = offDate === dateStr;
                return (
                  <View key={day} style={st.calCell}>
                    <TouchableOpacity
                      style={[st.calDay, on && st.calDayOn]}
                      onPress={() => { setOffDate(dateStr); setShowPicker(false); }}
                    >
                      <Text style={[st.calDayT, on && { color: "#fff" }]}>{day}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  msgBox: { backgroundColor: "#eff6ff", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  msgText: { fontSize: 13, color: "#1d4ed8", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  row2: { flexDirection: "row", gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 5 },
  subLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border || "#e5e7eb",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 10,
  },
  saveBtn: { height: 46, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", marginTop: 4 },
  saveBtnT: { color: "#fff", fontSize: 15, fontWeight: "700" },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 8, textAlign: "center" },
  dateRow: { flexDirection: "row", gap: 10 },
  dateBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.primary + "10",
  },
  dateBtnT: { fontSize: 14, fontWeight: "700", color: colors.primary },
  addBtn: { height: 44, backgroundColor: "#16a34a", borderRadius: radius.lg, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  addBtnT: { color: "#fff", fontSize: 15, fontWeight: "700" },
  offRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 8,
  },
  offDate: { fontSize: 14, fontWeight: "800", color: "#dc2626" },
  offReason: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  delBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fee2e2", justifyContent: "center", alignItems: "center" },
  delBtnT: { fontSize: 16 },
  empty: { textAlign: "center", color: colors.textMuted, fontSize: 13, paddingVertical: 12 },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calArr: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  calArrT: { fontSize: 14, color: colors.text },
  calTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  calWeek: { flexDirection: "row", marginBottom: 6 },
  calWeekT: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.textMuted },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: `${100 / 7}%`, alignItems: "center", marginBottom: 4 },
  calDay: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: colors.surfaceAlt },
  calDayOff: { backgroundColor: "#dc2626" },
  calDayOn: { backgroundColor: colors.primary },
  calDayT: { fontSize: 13, fontWeight: "600", color: colors.text },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  pickerBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: "100%", maxWidth: 340 },
  pickerTitle: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  monthItem: { width: "30%", paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  monthItemOn: { backgroundColor: colors.primary },
  monthItemT: { fontSize: 12, fontWeight: "600", color: colors.text },
});
