import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Dimensions,
} from "react-native";
import * as Print from "expo-print";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");

interface WaybillRow {
  id: number;
  name: string;
  format: string;
  unit: string;
  quantity: string;
  price: string;
}

const fmt = (n: number) => n.toLocaleString("uz-UZ");
const monthsRU = ["Января","Февраля","Марта","Апреля","Мая","Июня","Июля","Августа","Сентября","Октября","Ноября","Декабря"];

function generatePrintHTML(doc: any, rows: WaybillRow[], total: number) {
  const d = new Date(doc.date);
  const dateStr = `${d.getDate()} ${monthsRU[d.getMonth()]} ${d.getFullYear()} г.`;
  const filledRows = rows.filter(r => r.name || r.quantity);
  const rowsHTML = filledRows.map((r, i) => `
    <tr>
      <td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${i + 1}</td>
      <td style="border:1px solid #000;padding:8px 6px;font-size:12px">${r.name || "—"}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${r.format || "—"}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${r.unit || "—"}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px;font-weight:bold">${fmt(Number(r.quantity) || 0)}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px">${fmt(Number(r.price) || 0)}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px;font-weight:bold">${fmt((Number(r.quantity) || 0) * (Number(r.price) || 0))}</td>
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
  .party-row span { color: #333; }
  
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
  
  <div class="total-line">ИТОГО К ОПЛАТЕ: ${fmt(total)} сум</div>
  
  <div class="note">
    ⚠️ Накладная составлена в двух экземплярах. Первый экземпляр передается получателю, второй — остается у отправителя.
  </div>
  
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-label">Отправитель</div>
      <div class="sig-line"></div>
      <div class="sig-sub">Подпись / ФИО</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">Получатель</div>
      <div class="sig-line"></div>
      <div class="sig-sub">Подпись / ФИО</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">Водитель</div>
      <div class="sig-line"></div>
      <div class="sig-sub">Подпись / ФИО</div>
    </div>
  </div>
  
  <div class="footer">Документ сформирован автоматически • Shovot Carton Paper</div>
</div>
</body></html>`;
}

export default function WaybillScreen({ navigation }: any) {
  const [docNumber, setDocNumber] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [senderCompany, setSenderCompany] = useState("Shovot Carton Paper");
  const [senderPhone, setSenderPhone] = useState("+998 99 505 40 04");
  const [receiverCompany, setReceiverCompany] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [rows, setRows] = useState<WaybillRow[]>([
    { id: 1, name: "", format: "", unit: "Kg", quantity: "", price: "" },
  ]);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const last = parseInt(await AsyncStorage.getItem("carton_waybill_number") || "0", 10);
        setDocNumber(last + 1);
      } catch { setDocNumber(1); }
    })();
  }, []);

  const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0);

  const updateRow = (id: number, field: keyof WaybillRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    setRows(prev => [...prev, { id: Date.now(), name: "", format: "", unit: "Kg", quantity: "", price: "" }]);
  };

  const removeRow = (id: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const html = generatePrintHTML(
        { docNumber, date, senderCompany, senderPhone, receiverCompany, receiverPhone, vehicle },
        rows, total
      );
      await Print.printAsync({ html });
      await AsyncStorage.setItem("carton_waybill_number", String(docNumber));
    } catch (e: any) {
      if (e?.message !== "User did not cancel") {
        Alert.alert("Xatolik", e.message || "Chop etishda xatolik");
      }
    } finally { setPrinting(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Document info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📄 Yuk xati №{docNumber}</Text>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Sana</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-09-15" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Mashina</Text>
            <TextInput style={styles.input} value={vehicle} onChangeText={setVehicle} placeholder="Mashina raqami" placeholderTextColor={colors.textMuted} />
          </View>
        </View>
      </View>

      {/* Sender */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📤 Jo'natuvchi</Text>
        <Text style={styles.fieldLabel}>Kompaniya</Text>
        <TextInput style={styles.input} value={senderCompany} onChangeText={setSenderCompany} placeholder="Kompaniya nomi" placeholderTextColor={colors.textMuted} />
        <Text style={styles.fieldLabel}>Telefon</Text>
        <TextInput style={styles.input} value={senderPhone} onChangeText={setSenderPhone} placeholder="+998 XX XXX XX XX" placeholderTextColor={colors.textMuted} />
      </View>

      {/* Receiver */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📥 Qabul qiluvchi</Text>
        <Text style={styles.fieldLabel}>Kompaniya</Text>
        <TextInput style={styles.input} value={receiverCompany} onChangeText={setReceiverCompany} placeholder="Kompaniya nomi" placeholderTextColor={colors.textMuted} />
        <Text style={styles.fieldLabel}>Telefon</Text>
        <TextInput style={styles.input} value={receiverPhone} onChangeText={setReceiverPhone} placeholder="+998 XX XXX XX XX" placeholderTextColor={colors.textMuted} />
      </View>

      {/* Goods */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📋 Maxsulotlar</Text>
        {rows.map((r, idx) => {
          const rowTotal = (Number(r.quantity) || 0) * (Number(r.price) || 0);
          return (
            <View key={r.id} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowNumber}>#{idx + 1}</Text>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeRow(r.id)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Nomi</Text>
                  <TextInput style={styles.input} value={r.name} onChangeText={v => updateRow(r.id, "name", v)} placeholder="Mahsulot nomi" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Format</Text>
                  <TextInput style={styles.input} value={r.format} onChangeText={v => updateRow(r.id, "format", v)} placeholder="30x20x15" placeholderTextColor={colors.textMuted} />
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={{ flex: 0.6 }}>
                  <Text style={styles.fieldLabel}>Birlik</Text>
                  <TextInput style={styles.input} value={r.unit} onChangeText={v => updateRow(r.id, "unit", v)} placeholder="Kg" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Miqdori</Text>
                  <TextInput style={styles.input} value={r.quantity} onChangeText={v => updateRow(r.id, "quantity", v)} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Narx</Text>
                  <TextInput style={styles.input} value={r.price} onChangeText={v => updateRow(r.id, "price", v)} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                </View>
              </View>
              <View style={styles.rowTotalLine}>
                <Text style={styles.rowTotalLabel}>Summa:</Text>
                <Text style={[styles.rowTotalValue, { color: rowTotal > 0 ? "#16a34a" : colors.textMuted }]}>
                  {rowTotal > 0 ? fmt(rowTotal) + " so'm" : "—"}
                </Text>
              </View>
            </View>
          );
        })}
        <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
          <Text style={styles.addRowText}>+ Yangi qator</Text>
        </TouchableOpacity>
      </View>

      {/* Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>JAMI SUMMA</Text>
        <Text style={styles.totalValue}>{fmt(total)} so'm</Text>
      </View>

      {/* Print button */}
      <TouchableOpacity style={[styles.printBtn, printing && { opacity: 0.6 }]} onPress={handlePrint} disabled={printing}>
        <Text style={styles.printBtnText}>{printing ? "Chop etilmoqda..." : "🖨️ Chop etish (A4)"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: spacing.sm, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 4, marginTop: 6 },
  input: { height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 14, color: colors.text, backgroundColor: colors.surfaceAlt },
  row2: { flexDirection: "row", gap: 10 },
  rowCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  rowNumber: { fontSize: 13, fontWeight: "800", color: colors.primary },
  fieldRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs },
  removeBtn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },
  removeBtnText: { fontSize: 14, color: "#ef4444", fontWeight: "700" },
  rowTotalLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.borderLight },
  rowTotalLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  rowTotalValue: { fontSize: 14, fontWeight: "800" },
  addRowBtn: { paddingVertical: 10, alignItems: "center", borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", marginTop: 6 },
  addRowText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  totalCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 2, borderColor: colors.primary, ...shadows.sm },
  totalLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
  totalValue: { fontSize: 22, fontWeight: "800", color: colors.primary },
  printBtn: { height: 56, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm, marginBottom: spacing.md },
  printBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
