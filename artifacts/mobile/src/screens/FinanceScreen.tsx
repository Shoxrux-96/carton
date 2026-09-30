import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert, Dimensions, Linking, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");

const formatSum = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

const pad2 = (n: number) => String(n).padStart(2, "0");

// Sana + soat: sana (yyyy-MM-dd) + yozuv qo'shilgan vaqt (createdAt → lokal HH:mm)
const formatTxDateTime = (tx: any): string => {
  const day = String(tx?.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return tx?.date ? String(tx.date) : "—";
  const [y, m, d] = day.split("-");
  let out = `${d}.${m}.${y}`;
  const t = tx?.createdAt ? new Date(tx.createdAt) : null;
  if (t && !isNaN(t.getTime())) out += ` ${pad2(t.getHours())}:${pad2(t.getMinutes())}`;
  return out;
};

// Tartiblash: sana kamayish → bir kunda createdAt kamayish → id
const compareTx = (a: any, b: any): number => {
  const da = String(a?.date || "").slice(0, 10);
  const db = String(b?.date || "").slice(0, 10);
  if (da !== db) return db < da ? -1 : da < db ? 1 : 0;
  const ta = a?.createdAt ? Date.parse(a.createdAt) : NaN;
  const tb = b?.createdAt ? Date.parse(b.createdAt) : NaN;
  if (!isNaN(ta) && !isNaN(tb) && ta !== tb) return tb - ta;
  if (!isNaN(ta) !== !isNaN(tb)) return isNaN(tb) ? -1 : 1;
  return (b?.id || 0) - (a?.id || 0);
};

const EXPENSE_CATEGORIES = ["Machalka", "Qo'lqop", "Transport", "Ijara", "Maosh", "Elektr", "Gaz", "Oziq-ovqat", "Suv", "Boshqa"];
const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const monthsRU = ["Января","Февраля","Марта","Апреля","Мая","Июня","Июля","Августа","Сентября","Октября","Ноября","Декабря"];

interface WaybillRow {
  id: number;
  name: string;
  format: string;
  unit: string;
  quantity: string;
  price: string;
}

function generateWaybillHTML(doc: any, rows: WaybillRow[], total: number) {
  const d = new Date(doc.date);
  const dateStr = `${d.getDate()} ${monthsRU[d.getMonth()]} ${d.getFullYear()} г.`;
  const filledRows = rows.filter(r => r.name || r.quantity);
  const rowsHTML = filledRows.map((r, i) => `
    <tr>
      <td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${i + 1}</td>
      <td style="border:1px solid #000;padding:8px 6px;font-size:12px">${r.name || "—"}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${r.format || "—"}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${r.unit || "—"}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px;font-weight:bold">${(Number(r.quantity) || 0).toLocaleString("uz-UZ")}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px">${(Number(r.price) || 0).toLocaleString("uz-UZ")}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px;font-weight:bold">${((Number(r.quantity) || 0) * (Number(r.price) || 0)).toLocaleString("uz-UZ")}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #000; line-height: 1.4; }
  .page { width: 100%; max-width: 210mm; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h1 { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  .header .doc-num { font-size: 16px; margin-top: 4px; }
  .date-line { text-align: right; font-size: 12px; margin-bottom: 12px; border-bottom: 1px solid #000; padding-bottom: 6px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 12px; gap: 20px; }
  .party { flex: 1; font-size: 12px; }
  .party-label { font-weight: bold; font-size: 13px; margin-bottom: 4px; }
  .party-row { margin-bottom: 2px; }
  .vehicle-line { font-size: 12px; margin-bottom: 10px; padding: 6px 10px; background: #f9f9f9; border: 1px solid #ddd; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #e8e8e8; border: 1px solid #000; padding: 8px 6px; font-size: 11px; font-weight: bold; text-align: center; text-transform: uppercase; }
  td { border: 1px solid #000; padding: 8px 6px; }
  .total-line { text-align: right; font-size: 15px; font-weight: bold; margin: 10px 0; padding: 8px 12px; border-top: 2px solid #000; border-bottom: 2px solid #000; }
  .note { font-size: 11px; color: #555; margin: 10px 0; padding: 8px; background: #fffde7; border: 1px solid #e0d68a; border-radius: 4px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 30px; gap: 20px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-label { font-size: 12px; font-weight: bold; margin-bottom: 4px; }
  .sig-line { border-top: 1px solid #000; width: 90%; margin: 25px auto 4px; }
  .sig-sub { font-size: 10px; color: #666; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 6px; }
</style></head><body>
<div class="page">
  <div class="header">
    <h1>НАКЛАДНАЯ</h1>
    <div class="doc-num">№ ${doc.docNumber}</div>
  </div>
  <div class="date-line">Дата составления: <strong>${dateStr}</strong></div>
  <div class="parties">
    <div class="party">
      <div class="party-label">Отправитель:</div>
      <div class="party-row">Организация: <strong>${doc.senderCompany || "—"}</strong></div>
      <div class="party-row">Телефон: ${doc.senderPhone || "—"}</div>
    </div>
    <div class="party">
      <div class="party-label">Получатель:</div>
      <div class="party-row">Организация: <strong>${doc.receiverCompany || "—"}</strong></div>
      <div class="party-row">Телефон: ${doc.receiverPhone || "—"}</div>
    </div>
  </div>
  ${doc.vehicle ? `<div class="vehicle-line">🚗 <strong>Транспортное средство:</strong> ${doc.vehicle}</div>` : ""}
  <table>
    <thead>
      <tr>
        <th style="width:5%">№</th>
        <th style="width:30%">Наименование товара</th>
        <th style="width:12%">Формат</th>
        <th style="width:8%">Ед.</th>
        <th style="width:12%">Кол-во</th>
        <th style="width:15%">Цена за ед.</th>
        <th style="width:18%">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
      ${filledRows.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Товар не указан</td></tr>' : ""}
    </tbody>
  </table>
  <div class="total-line">ИТОГО К ОПЛАТЕ: ${total.toLocaleString("uz-UZ")} сум</div>
  <div class="note">⚠️ Накладная составлена в двух экземплярах. Первый экземпляр передается получателю, второй — остается у отправителя.</div>
  <div class="signatures">
    <div class="sig-block"><div class="sig-label">Отправитель</div><div class="sig-line"></div><div class="sig-sub">Подпись / ФИО</div></div>
    <div class="sig-block"><div class="sig-label">Получатель</div><div class="sig-line"></div><div class="sig-sub">Подпись / ФИО</div></div>
    <div class="sig-block"><div class="sig-label">Водитель</div><div class="sig-line"></div><div class="sig-sub">Подпись / ФИО</div></div>
  </div>
  <div class="footer">Документ сформирован автоматически • Shovot Carton Paper</div>
</div>
</body></html>`;
}

export default function FinanceScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "year">("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");

  // Waybill state
  const [showWaybill, setShowWaybill] = useState(false);
  const [wbDocNumber, setWbDocNumber] = useState(1);
  const [wbDate, setWbDate] = useState(new Date().toISOString().split("T")[0]);
  const [wbSenderCompany, setWbSenderCompany] = useState("Shovot Carton Paper");
  const [wbSenderPhone, setWbSenderPhone] = useState("+998 99 505 40 04");
  const [wbReceiverCompany, setWbReceiverCompany] = useState("");
  const [wbReceiverPhone, setWbReceiverPhone] = useState("");
  const [wbRows, setWbRows] = useState<WaybillRow[]>([
    { id: 1, name: "", format: "", unit: "Kg", quantity: "", price: "" },
  ]);
  const [wbPrinting, setWbPrinting] = useState(false);

  const load = async () => {
    try {
      const tx = await apiFetch("/finance");
      setTransactions(Array.isArray(tx) ? tx : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => {
    (async () => {
      try {
        const waybills = await apiFetch("/waybills");
        const list = Array.isArray(waybills) ? waybills : [];
        const maxDoc = list.reduce((m: number, w: any) => Math.max(m, w.docNumber || 0), 0);
        setWbDocNumber(maxDoc + 1);
      } catch { setWbDocNumber(1); }
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = transactions;
    if (periodFilter !== "all") {
      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
      const yearStr = String(selectedYear);
      result = result.filter((t: any) => {
        if (!t.date) return false;
        if (periodFilter === "month") return t.date.startsWith(monthStr);
        if (periodFilter === "year") return t.date.startsWith(yearStr);
        return true;
      });
    }
    // Tartib: yangi yozuv yuqorida, bir kunda soat bo'yicha (aralashmaydi)
    return [...result].sort(compareTx);
  }, [transactions, periodFilter, selectedMonth, selectedYear]);

  const computedSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentYear = String(now.getFullYear());
    let monthIncome = 0, monthExpense = 0, yearIncome = 0, yearExpense = 0;
    for (const r of transactions) {
      if (r.date?.startsWith(currentYear)) {
        if (r.type === "income") yearIncome += r.amount;
        else yearExpense += r.amount;
      }
      if (r.date?.startsWith(currentMonth)) {
        if (r.type === "income") monthIncome += r.amount;
        else monthExpense += r.amount;
      }
    }
    return {
      monthly: { income: monthIncome, expense: monthExpense, profit: monthIncome - monthExpense },
      yearly: { income: yearIncome, expense: yearExpense, profit: yearIncome - yearExpense },
    };
  }, [transactions]);

  const resetForm = () => { setCategory(""); setAmount(""); setQuantity(""); setDescription(""); };

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) { Alert.alert("Xatolik", "Summani kiriting"); return; }
    setSaving(true);
    try {
      await apiFetch("/finance", {
        method: "POST",
        body: JSON.stringify({
          type: "expense",
          category: category || "Boshqa",
          amount: Number(amount),
          description: description || "",
          date: new Date().toISOString().split("T")[0],
        }),
      });
      setShowModal(false); resetForm(); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    const doDelete = async () => {
      try { await apiFetch(`/finance/${id}`, { method: "DELETE" }); await load(); } catch {}
    };
    // react-native-web'da Alert no-op — web uchun window.confirm
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && !window.confirm("Bu yozuvni o'chirmoqchimisiz?")) return;
      doDelete();
      return;
    }
    Alert.alert("O'chirish", "Bu yozuvni o'chirmoqchimisiz?", [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: doDelete },
    ]);
  };

  // Waybill handlers
  const wbTotal = wbRows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0);

  const updateWbRow = (id: number, field: keyof WaybillRow, value: string) => {
    setWbRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addWbRow = () => {
    setWbRows(prev => [...prev, { id: Date.now(), name: "", format: "", unit: "Kg", quantity: "", price: "" }]);
  };

  const removeWbRow = (id: number) => {
    if (wbRows.length <= 1) return;
    setWbRows(prev => prev.filter(r => r.id !== id));
  };

  const handleWbPrint = async () => {
    setWbPrinting(true);
    try {
      const html = generateWaybillHTML(
        { docNumber: wbDocNumber, date: wbDate, senderCompany: wbSenderCompany, senderPhone: wbSenderPhone, receiverCompany: wbReceiverCompany, receiverPhone: wbReceiverPhone },
        wbRows, wbTotal
      );
      await Print.printAsync({ html });
      // Save to API
      await apiFetch("/waybills", {
        method: "POST",
        body: JSON.stringify({
          docNumber: wbDocNumber,
          date: wbDate,
          senderCompany: wbSenderCompany,
          senderPhone: wbSenderPhone,
          receiverCompany: wbReceiverCompany,
          receiverPhone: wbReceiverPhone,
          items: wbRows.filter(r => r.name || r.quantity).map(r => ({
            name: r.name,
            format: r.format,
            unit: r.unit,
            quantity: r.quantity,
            price: r.price,
          })),
        }),
      });
      // Increment doc number
      setWbDocNumber(prev => prev + 1);
    } catch (e: any) {
      if (e?.message !== "User did not cancel") {
        Alert.alert("Xatolik", e.message || "Chop etishda xatolik");
      }
    } finally { setWbPrinting(false); }
  };

  const resetWbForm = () => {
    setWbReceiverCompany("");
    setWbReceiverPhone("");
    setWbRows([{ id: 1, name: "", format: "", unit: "Kg", quantity: "", price: "" }]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
            const rows = filtered.slice(0, 100);
            const csv = "Sana,Tur,Kategoriya,Izoh,Summa\n" + rows.map((r: any) =>
              `${formatTxDateTime(r)},${r.type === "income" ? "Kirim" : "Chiqim"},${r.category || ""},"${(r.description || "").replace(/"/g, '""')}",${r.amount || 0}`
            ).join("\n");
            const uri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
            Linking.openURL(uri);
          }}>
            <Text style={styles.actionBtnText}>📥 Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { resetWbForm(); setShowWaybill(true); }}>
            <Text style={styles.actionBtnText}>📋 Yuk xati</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => { resetForm(); setShowModal(true); }}>
            <Text style={styles.actionBtnTextPrimary}>➕ Xarajat</Text>
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: "#f0fdf4" }]}>
            <Text style={[styles.summaryValue, { color: "#16a34a" }]}>{formatSum(computedSummary.monthly.income)}</Text>
            <Text style={styles.summaryLabel}>Kirim (oy)</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#fef2f2" }]}>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{formatSum(computedSummary.monthly.expense)}</Text>
            <Text style={styles.summaryLabel}>Chiqim (oy)</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: computedSummary.monthly.profit >= 0 ? "#eff6ff" : "#fef2f2" }]}>
            <Text style={[styles.summaryValue, { color: computedSummary.monthly.profit >= 0 ? "#2563eb" : "#dc2626" }]}>{formatSum(computedSummary.monthly.profit)}</Text>
            <Text style={styles.summaryLabel}>Foyda (oy)</Text>
          </View>
        </View>

        <View style={styles.yearRow}>
          <View style={styles.yearCard}>
            <Text style={styles.yearLabel}>Yillik kirim</Text>
            <Text style={[styles.yearValue, { color: "#16a34a" }]}>{formatSum(computedSummary.yearly.income)}</Text>
          </View>
          <View style={styles.yearCard}>
            <Text style={styles.yearLabel}>Yillik chiqim</Text>
            <Text style={[styles.yearValue, { color: "#dc2626" }]}>{formatSum(computedSummary.yearly.expense)}</Text>
          </View>
          <View style={styles.yearCard}>
            <Text style={styles.yearLabel}>Yillik foyda</Text>
            <Text style={[styles.yearValue, { color: computedSummary.yearly.profit >= 0 ? "#2563eb" : "#dc2626" }]}>{formatSum(computedSummary.yearly.profit)}</Text>
          </View>
        </View>

        {/* Period filter */}
        <View style={styles.periodRow}>
          {([["all", "Jami"], ["month", "Oy"], ["year", "Yil"]] as const).map(([k, l]) => (
            <TouchableOpacity key={k} style={[styles.periodBtn, periodFilter === k && styles.periodActive]} onPress={() => setPeriodFilter(k)}>
              <Text style={[styles.periodText, periodFilter === k && { color: colors.primary }]}>{l}</Text>
            </TouchableOpacity>
          ))}
          {periodFilter !== "all" && (
            <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.calendarIcon}>📅</Text>
              <Text style={styles.calendarText}>
                {periodFilter === "month"
                  ? `${months[selectedMonth]} ${selectedYear}`
                  : String(selectedYear)}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <Text style={styles.countInfo}>{filtered.length} ta yozuv</Text>
        </View>

        {/* Transactions table */}
        {filtered.length > 0 ? (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Sana</Text>
              <Text style={[styles.th, { flex: 1 }]}>Kategoriya</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Izoh</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Summa</Text>
            </View>
            {filtered.slice(0, 50).map((tx: any, i: number) => (
              <TouchableOpacity key={tx.id ?? `${tx.description ?? "tx"}-${i}`} style={styles.tableRow} onLongPress={() => handleDelete(tx.id)} activeOpacity={0.7}>
                <Text style={[styles.td, { flex: 1, color: colors.textMuted, fontSize: 11 }]}>
                  {formatTxDateTime(tx)}
                </Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.categoryBadge, { backgroundColor: tx.type === "income" ? "#dcfce7" : "#fee2e2" }]}>
                    <Text style={[styles.categoryText, { color: tx.type === "income" ? "#16a34a" : "#dc2626" }]}>
                      {tx.category || (tx.type === "income" ? "Kirim" : "Chiqim")}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.td, { flex: 1.5, color: colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                  {tx.description || "—"}
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right", fontWeight: "700", color: tx.type === "income" ? "#16a34a" : "#dc2626" }]}>
                  {tx.type === "income" ? "+" : "-"}{formatSum(tx.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>💰</Text>
            <Text style={styles.emptyText}>Yozuvlar yo'q</Text>
          </View>
        )}

        <Text style={styles.hint}>* Uzoq bosib o'chirish mumkin</Text>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>📅 {periodFilter === "month" ? "Oy tanlang" : "Yil tanlang"}</Text>
            <View style={styles.yearSelector}>
              <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={styles.yearArrow}>
                <Text style={styles.yearArrowText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.yearDisplay}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)} style={styles.yearArrow}>
                <Text style={styles.yearArrowText}>▶</Text>
              </TouchableOpacity>
            </View>
            {periodFilter === "month" && (
              <View style={styles.monthGrid}>
                {months.map((m, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.monthItem, selectedMonth === i && styles.monthItemActive]}
                    onPress={() => { setSelectedMonth(i); setShowDatePicker(false); }}
                  >
                    <Text style={[styles.monthItemText, selectedMonth === i && { color: "#fff" }]}>{m.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {periodFilter === "year" && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneBtnText}>Tanlash</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      
      {/* Modal — Xarajatlar */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💸 Xarajatlar</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Kategoriya</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {EXPENSE_CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Miqdori</Text>
            <TextInput style={styles.fieldInput} value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            <Text style={styles.fieldLabel}>Summa (so'm)</Text>
            <TextInput style={styles.fieldInput} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            <Text style={styles.fieldLabel}>Izoh</Text>
            <TextInput style={styles.fieldInput} value={description} onChangeText={setDescription} placeholder="Qisqacha ma'lumot" placeholderTextColor={colors.textMuted} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "Saqlanmoqda..." : "Saqlash"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal — Yuk xati */}
      <Modal visible={showWaybill} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "95%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Yuk xati №{wbDocNumber}</Text>
              <TouchableOpacity onPress={() => setShowWaybill(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Doc info */}
              <View style={styles.wbRow2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Sana</Text>
                  <TextInput style={styles.wbInput} value={wbDate} onChangeText={setWbDate} placeholder="2026-09-15" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              {/* Sender */}
              <Text style={styles.wbSectionTitle}>📤 Jo'natuvchi</Text>
              <Text style={styles.fieldLabel}>Kompaniya</Text>
              <TextInput style={styles.wbInput} value={wbSenderCompany} onChangeText={setWbSenderCompany} placeholder="Kompaniya nomi" placeholderTextColor={colors.textMuted} />
              <Text style={styles.fieldLabel}>Telefon</Text>
              <TextInput style={styles.wbInput} value={wbSenderPhone} onChangeText={setWbSenderPhone} placeholder="+998 XX XXX XX XX" placeholderTextColor={colors.textMuted} />

              {/* Receiver */}
              <Text style={styles.wbSectionTitle}>📥 Qabul qiluvchi</Text>
              <Text style={styles.fieldLabel}>Kompaniya</Text>
              <TextInput style={styles.wbInput} value={wbReceiverCompany} onChangeText={setWbReceiverCompany} placeholder="Kompaniya nomi" placeholderTextColor={colors.textMuted} />
              <Text style={styles.fieldLabel}>Telefon</Text>
              <TextInput style={styles.wbInput} value={wbReceiverPhone} onChangeText={setWbReceiverPhone} placeholder="+998 XX XXX XX XX" placeholderTextColor={colors.textMuted} />

              {/* Goods */}
              <Text style={styles.wbSectionTitle}>📋 Maxsulotlar</Text>
              {wbRows.map((r, idx) => {
                const rowTotal = (Number(r.quantity) || 0) * (Number(r.price) || 0);
                return (
                  <View key={r.id} style={styles.wbRowCard}>
                    <View style={styles.wbRowHeader}>
                      <Text style={styles.wbRowNumber}>#{idx + 1}</Text>
                      <TouchableOpacity style={styles.wbRemoveBtn} onPress={() => removeWbRow(r.id)}>
                        <Text style={styles.wbRemoveBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.wbFieldRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Nomi</Text>
                        <TextInput style={styles.wbInput} value={r.name} onChangeText={v => updateWbRow(r.id, "name", v)} placeholder="Mahsulot nomi" placeholderTextColor={colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Format</Text>
                        <TextInput style={styles.wbInput} value={r.format} onChangeText={v => updateWbRow(r.id, "format", v)} placeholder="30x20x15" placeholderTextColor={colors.textMuted} />
                      </View>
                    </View>
                    <View style={styles.wbFieldRow}>
                      <View style={{ flex: 0.6 }}>
                        <Text style={styles.fieldLabel}>Birlik</Text>
                        <TextInput style={styles.wbInput} value={r.unit} onChangeText={v => updateWbRow(r.id, "unit", v)} placeholder="Kg" placeholderTextColor={colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Miqdori</Text>
                        <TextInput style={styles.wbInput} value={r.quantity} onChangeText={v => updateWbRow(r.id, "quantity", v)} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Narx</Text>
                        <TextInput style={styles.wbInput} value={r.price} onChangeText={v => updateWbRow(r.id, "price", v)} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                      </View>
                    </View>
                    <View style={styles.wbRowTotalLine}>
                      <Text style={styles.wbRowTotalLabel}>Summa:</Text>
                      <Text style={[styles.wbRowTotalValue, { color: rowTotal > 0 ? "#16a34a" : colors.textMuted }]}>
                        {rowTotal > 0 ? rowTotal.toLocaleString("uz-UZ") + " so'm" : "—"}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity style={styles.wbAddRowBtn} onPress={addWbRow}>
                <Text style={styles.wbAddRowText}>+ Yangi qator</Text>
              </TouchableOpacity>

              {/* Total */}
              <View style={styles.wbTotalCard}>
                <Text style={styles.wbTotalLabel}>JAMI SUMMA</Text>
                <Text style={styles.wbTotalValue}>{wbTotal.toLocaleString("uz-UZ")} so'm</Text>
              </View>
            </ScrollView>

            {/* Print button */}
            <TouchableOpacity style={[styles.wbPrintBtn, wbPrinting && { opacity: 0.6 }]} onPress={handleWbPrint} disabled={wbPrinting}>
              <Text style={styles.wbPrintBtnText}>{wbPrinting ? "Chop etilmoqda..." : "🖨️ Chop etish (A4)"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  financeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, paddingHorizontal: 4 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border },
  backBtnText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  financeTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  actionRow: { flexDirection: "row", gap: 6, marginBottom: spacing.md },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  actionBtnPrimary: { backgroundColor: "#fff7ed", borderColor: colors.primary },
  actionBtnText: { fontSize: 11, fontWeight: "700", color: colors.text },
  actionBtnTextPrimary: { fontSize: 11, fontWeight: "700", color: colors.primary },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  summaryCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: "center" },
  summaryValue: { fontSize: 13, fontWeight: "800" },
  summaryLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },
  yearRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  yearCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadows.sm },
  yearLabel: { fontSize: 10, color: colors.textMuted },
  yearValue: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  periodActive: { borderColor: colors.primary, backgroundColor: "#fff7ed" },
  periodText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  calendarBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.primary + "15", borderWidth: 1, borderColor: colors.primary },
  calendarIcon: { fontSize: 14 },
  calendarText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  countInfo: { fontSize: 11, color: colors.textMuted },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 30 },
  pickerContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, width: "100%", maxWidth: 320 },
  pickerTitle: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.lg },
  yearSelector: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: spacing.lg },
  yearArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  yearArrowText: { fontSize: 16, color: colors.text },
  yearDisplay: { fontSize: 22, fontWeight: "800", color: colors.text },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthItem: { width: "30%", paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center" },
  monthItemActive: { backgroundColor: colors.primary },
  monthItemText: { fontSize: 13, fontWeight: "600", color: colors.text },
  doneBtn: { height: 48, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", marginTop: spacing.md },
  doneBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", ...shadows.sm },
  tableHeader: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 10, backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { fontSize: 9, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border, alignItems: "center" },
  td: { fontSize: 12, color: colors.text },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  categoryText: { fontSize: 10, fontWeight: "700" },
  hint: { fontSize: 10, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
  empty: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: "600", marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginRight: 6, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  fieldInput: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  // Waybill styles
  wbRow2: { flexDirection: "row", gap: 10, marginBottom: spacing.sm },
  wbInput: { height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 14, color: colors.text, backgroundColor: colors.surfaceAlt },
  wbSectionTitle: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: spacing.md, marginBottom: spacing.sm, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  wbRowCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  wbRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  wbRowNumber: { fontSize: 13, fontWeight: "800", color: colors.primary },
  wbFieldRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs },
  wbRemoveBtn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },
  wbRemoveBtnText: { fontSize: 14, color: "#ef4444", fontWeight: "700" },
  wbRowTotalLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.borderLight },
  wbRowTotalLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  wbRowTotalValue: { fontSize: 14, fontWeight: "800" },
  wbAddRowBtn: { paddingVertical: 10, alignItems: "center", borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", marginTop: 6 },
  wbAddRowText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  wbTotalCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, borderWidth: 2, borderColor: colors.primary, ...shadows.sm },
  wbTotalLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
  wbTotalValue: { fontSize: 22, fontWeight: "800", color: colors.primary },
  wbPrintBtn: { height: 56, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm, marginTop: spacing.md },
  wbPrintBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
