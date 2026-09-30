import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert, Dimensions, Linking, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import CompanyAutocomplete from "../components/CompanyAutocomplete";

const { width } = Dimensions.get("window");
const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const monthsRU = ["Января","Февраля","Марта","Апреля","Мая","Июня","Июля","Августа","Сентября","Октября","Ноября","Декабря"];

const norm = (s?: string) => (s || "").trim().toLowerCase();

// Korxonamiz ro'yxati bo'yicha avtomatik kategoriya:
// yuboruvchi (1-input) bizniki → "Sotuv", qabul qiluvchi (2-input) bizniki → "Xarid"
function isOursCompany(name: string, companies: any[]) {
  const a = norm(name);
  if (!a) return false;
  if (a.includes("shovot carton")) return true;
  return companies.some(c => {
    const b = norm(c?.name);
    return b && (a === b || a.includes(b) || b.includes(a));
  });
}

// API bilan bir xil qoida (hech qachon bo'sh qaytmaydi):
// yuboruvchi bizniki → Sotuv, qabul qiluvchi bizniki → Xarid,
// ikkalasi emas → mahsulot nomi kirsа Sotuv, aks holda Xarid
function getCategory(sender: string, receiver: string, companies: any[] = [], itemNames?: string[], productNames?: string[]) {
  if (isOursCompany(sender, companies)) return "Sotuv";
  if (isOursCompany(receiver, companies)) return "Xarid";
  const names = (itemNames || []).map(norm).filter(Boolean);
  const pnames = (productNames || []).map(norm).filter(Boolean);
  if (names.length > 0 && pnames.length > 0) {
    const hasProduct = names.some(n => pnames.some(p => n === p || n.includes(p) || p.includes(n)));
    if (hasProduct) return "Sotuv";
  }
  return "Xarid";
}

interface WaybillData {
  id: number;
  docNumber: number;
  date: string;
  senderCompany: string;
  senderPhone: string;
  receiverCompany: string;
  receiverPhone: string;
  vehicle: string;
  totalSum: string;
  items: any[];
  createdAt: string;
}

interface WaybillRow { id: number; name: string; format: string; unit: string; quantity: string; price: string; }

const emptyRow = (): WaybillRow => ({ id: Date.now(), name: "", format: "", unit: "Kg", quantity: "", price: "" });

const defaultForm = () => ({
  docNumber: 1, date: new Date().toISOString().split("T")[0],
  senderCompany: "Shovot Carton", senderPhone: "+998 99 505 40 04",
  receiverCompany: "", receiverPhone: "", items: [emptyRow()] as WaybillRow[],
});

export default function WaybillsScreen({ route, navigation }: any) {
  const [waybills, setWaybills] = useState<WaybillData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "Sotuv" | "Xarid">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const loadCompanies = async () => {
    try {
      const [companyData, productData, clientData] = await Promise.all([
        apiFetch("/company").catch(() => null),
        apiFetch("/products").catch(() => null),
        apiFetch("/clients").catch(() => null),
      ]);
      setCompanies(Array.isArray(companyData?.companies) ? companyData.companies : []);
      setProducts(Array.isArray(productData) ? productData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
    } catch {}
  };

  // Serverdan kelgan category ustuvor, aks holda lokal hisob (API bilan bir xil)
  const catOf = (w: any) =>
    w.category ||
    getCategory(w.senderCompany, w.receiverCompany, companies, (w.items || []).map((i: any) => i.name), products.map((p: any) => p.name));

  const load = async () => {
    try {
      const data = await apiFetch("/waybills");
      setWaybills(Array.isArray(data) ? data : []);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    load(); loadCompanies();
    // Webdan saqlangan yangi yuk xatlari bir ozdan keyin shu ro'yxatda ko'rinsin
    const timer = setInterval(() => { load(); }, 15000);
    return () => clearInterval(timer);
  }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); await loadCompanies(); setRefreshing(false); };

  useEffect(() => {
    if (showModal && !editingId && !viewingId) {
      (async () => {
        try {
          const list = await apiFetch("/waybills");
          const maxDoc = (Array.isArray(list) ? list : []).reduce((m: number, w: any) => Math.max(m, w.docNumber || 0), 0);
          setForm(prev => ({ ...prev, docNumber: maxDoc + 1 }));
        } catch {}
      })();
    }
  }, [showModal, editingId]);

  const filtered = useMemo(() => {
    let list = waybills;
    if (filterText) {
      const ft = filterText.toLowerCase();
      list = list.filter((w: any) => String(w.docNumber).includes(ft) || (w.senderCompany || "").toLowerCase().includes(ft) || (w.receiverCompany || "").toLowerCase().includes(ft));
    }
    if (filterCategory !== "all") list = list.filter((w: any) => catOf(w) === filterCategory);
    const monthStr = `${filterYear}-${String(filterMonth + 1).padStart(2, "0")}`;
    list = list.filter((w: any) => w.date && w.date.startsWith(monthStr));
    return list;
  }, [waybills, filterMonth, filterYear, filterText, filterCategory, companies]);

  const totalSum = useMemo(() => filtered.reduce((s: number, w: any) => s + (parseFloat(w.totalSum) || 0), 0), [filtered]);
  const sotuvCount = filtered.filter((w: any) => catOf(w) === "Sotuv").length;
  const xaridCount = filtered.filter((w: any) => catOf(w) === "Xarid").length;

  const openNew = () => { setEditingId(null); setForm(defaultForm()); setShowModal(true); };
  const openEdit = (w: WaybillData) => {
    setEditingId(w.id);
    setForm({
      docNumber: w.docNumber, date: w.date,
      senderCompany: w.senderCompany || "", senderPhone: w.senderPhone || "",
      receiverCompany: w.receiverCompany || "", receiverPhone: w.receiverPhone || "",
      items: (w.items && w.items.length > 0 ? w.items : [emptyRow()]).map((r: any) => ({
        id: r.id || Date.now() + Math.random(), name: r.name || "", format: r.format || "", unit: r.unit || "Kg",
        quantity: String(r.quantity || ""), price: String(r.price || ""),
      })),
    });
    setShowModal(true);
  };
  const openView = (w: WaybillData) => {
    setViewingId(w.id);
    setEditingId(null);
    setForm(prev => ({ ...prev, docNumber: w.docNumber, date: w.date }));
    setShowModal(true);
  };

  // Yetkazish jadvalidan yuk xati hujjatini ochish (route.params.viewId)
  const viewParamId = route?.params?.viewId;
  useEffect(() => {
    if (!viewParamId) return;
    const w = waybills.find((x: any) => x.id === viewParamId);
    if (!w) return;
    if (w.date) {
      const d = new Date(w.date);
      setFilterMonth(d.getMonth());
      setFilterYear(d.getFullYear());
    }
    setFilterText("");
    setFilterCategory("all");
    openView(w);
    navigation?.setParams?.({ viewId: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParamId, waybills]);

  // Korxonamiz ro'yxatidan "Yuk xati" — yuboruvchi oldindan to'ldirilgan holda ochish
  const newSender = route?.params?.newSender;
  useEffect(() => {
    if (!newSender) return;
    setEditingId(null); setViewingId(null);
    setForm({ ...defaultForm(), senderCompany: newSender, senderPhone: route?.params?.newSenderPhone || "" });
    setShowModal(true);
    navigation?.setParams?.({ newSender: undefined, newSenderPhone: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSender]);

  const handleSave = async () => {
    if (!form.senderCompany && !form.receiverCompany) { Alert.alert("Xatolik", "Yuboruvchi yoki qabul qiluvchini kiriting"); return; }
    setSaving(true);
    try {
      const payload = { docNumber: form.docNumber, date: form.date, senderCompany: form.senderCompany, senderPhone: form.senderPhone, receiverCompany: form.receiverCompany, receiverPhone: form.receiverPhone, items: form.items.filter(r => r.name || r.quantity).map(r => ({ name: r.name, format: r.format, unit: r.unit, quantity: r.quantity, price: r.price })) };
      if (editingId) await apiFetch(`/waybills/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiFetch("/waybills", { method: "POST", body: JSON.stringify(payload) });
      setShowModal(false); setEditingId(null); await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number, docNumber: number) => {
    const doDelete = async () => { try { await apiFetch(`/waybills/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { Alert.alert("Xatolik", e.message); } };
    // react-native-web'da Alert no-op — web uchun window.confirm
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && !window.confirm(`Yuk xati №${docNumber} ni o'chirmoqchimisiz?`)) return;
      doDelete();
      return;
    }
    Alert.alert("O'chirish", `Yuk xati №${docNumber} ni o'chirmoqchimisiz?`, [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: doDelete },
    ]);
  };

  const handlePrint = async (w: WaybillData) => {
    setPrinting(true);
    try {
      const d = new Date(w.date);
      const dateStr = `${d.getDate()} ${monthsRU[d.getMonth()]} ${d.getFullYear()} г.`;
      const filled = (w.items || []).filter((r: any) => r.name || r.quantity);
      const rowsHTML = filled.map((r: any, i: number) => `<tr><td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${i+1}</td><td style="border:1px solid #000;padding:8px 6px;font-size:12px">${r.name||"—"}</td><td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${r.format||"—"}</td><td style="border:1px solid #000;padding:8px 6px;text-align:center;font-size:12px">${r.unit||"—"}</td><td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px;font-weight:bold">${(Number(r.quantity)||0).toLocaleString("uz-UZ")}</td><td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px">${(Number(r.price)||0).toLocaleString("uz-UZ")}</td><td style="border:1px solid #000;padding:8px 6px;text-align:right;font-size:12px;font-weight:bold">${((Number(r.quantity)||0)*(Number(r.price)||0)).toLocaleString("uz-UZ")}</td></tr>`).join("");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Times New Roman',Times,serif;font-size:13px;color:#000;line-height:1.4}.page{width:100%;max-width:210mm;margin:0 auto}.header{text-align:center;margin-bottom:8px}.header h1{font-size:20px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}.header .doc-num{font-size:16px;margin-top:4px}.date-line{text-align:right;font-size:12px;margin-bottom:12px;border-bottom:1px solid #000;padding-bottom:6px}.parties{display:flex;justify-content:space-between;margin-bottom:12px;gap:20px}.party{flex:1;font-size:12px}.party-label{font-weight:bold;font-size:13px;margin-bottom:4px}.party-row{margin-bottom:2px}table{width:100%;border-collapse:collapse;margin-bottom:10px}th{background:#e8e8e8;border:1px solid #000;padding:8px 6px;font-size:11px;font-weight:bold;text-align:center;text-transform:uppercase}td{border:1px solid #000;padding:8px 6px}.total-line{text-align:right;font-size:15px;font-weight:bold;margin:10px 0;padding:8px 12px;border-top:2px solid #000;border-bottom:2px solid #000}.signatures{display:flex;justify-content:space-between;margin-top:30px;gap:20px}.sig-block{flex:1;text-align:center}.sig-label{font-size:12px;font-weight:bold;margin-bottom:4px}.sig-line{border-top:1px solid #000;width:90%;margin:25px auto 4px}.sig-sub{font-size:10px;color:#666}.footer{text-align:center;font-size:10px;color:#999;margin-top:20px;border-top:1px solid #eee;padding-top:6px}</style></head><body><div class="page"><div class="header"><h1>НАКЛАДНАЯ</h1><div class="doc-num">№ ${w.docNumber}</div></div><div class="date-line">Дата составления: <strong>${dateStr}</strong></div><div class="parties"><div class="party"><div class="party-label">Отправитель:</div><div class="party-row">Организация: <strong>${w.senderCompany||"—"}</strong></div><div class="party-row">Телефон: ${w.senderPhone||"—"}</div></div><div class="party"><div class="party-label">Получатель:</div><div class="party-row">Организация: <strong>${w.receiverCompany||"—"}</strong></div><div class="party-row">Телефон: ${w.receiverPhone||"—"}</div></div></div><table><thead><tr><th style="width:5%">№</th><th style="width:30%">Наименование товара</th><th style="width:12%">Формат</th><th style="width:8%">Ед.</th><th style="width:12%">Кол-во</th><th style="width:15%">Цена за ед.</th><th style="width:18%">Сумма</th></tr></thead><tbody>${rowsHTML}${filled.length===0?'<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Товар не указан</td></tr>':""}</tbody></table><div class="total-line">ИТОГО К ОПЛАТЕ: ${(parseFloat(w.totalSum)||0).toLocaleString("uz-UZ")} сум</div><div class="signatures"><div class="sig-block"><div class="sig-label">Отправитель</div><div class="sig-line"></div><div class="sig-sub">Подпись / ФИО</div></div><div class="sig-block"><div class="sig-label">Получатель</div><div class="sig-line"></div><div class="sig-sub">Подпись / ФИО</div></div><div class="sig-block"><div class="sig-label">Водитель</div><div class="sig-line"></div><div class="sig-sub">Подпись / ФИО</div></div></div><div class="footer">Документ сформирован автоматически • Shovot Carton Paper</div></div></body></html>`;
      await Print.printAsync({ html });
    } catch (e: any) { if (e?.message !== "User did not cancel") Alert.alert("Xatolik", e.message); }
    finally { setPrinting(false); }
  };

  const handleExportExcel = () => {
    const cols = [
      { header: "ID", key: "id", accessor: (r: any) => r.id },
      { header: "№", key: "docNumber", accessor: (r: any) => r.docNumber },
      { header: "Sana", key: "date", accessor: (r: any) => r.date || "" },
      { header: "Yuboruvchi", key: "senderCompany", accessor: (r: any) => r.senderCompany || "" },
      { header: "Tel", key: "senderPhone", accessor: (r: any) => r.senderPhone || "" },
      { header: "Qabul qiluvchi", key: "receiverCompany", accessor: (r: any) => r.receiverCompany || "" },
      { header: "Tel", key: "receiverPhone", accessor: (r: any) => r.receiverPhone || "" },
      { header: "Tur", key: "category", accessor: (r: any) => catOf(r) },
      { header: "Summa (so'm)", key: "totalSum", accessor: (r: any) => parseFloat(r.totalSum) || 0 },
    ];
    const csv = "ID,№,Sana,Yuboruvchi,Tel,Qabul qiluvchi,Tel,Tur,Summa (so'm)\n" + filtered.map((r: any) =>
      `${r.id},${r.docNumber},${r.date||""},"${(r.senderCompany||"").replace(/"/g,'""')}","${(r.senderPhone||"").replace(/"/g,'""')}","${(r.receiverCompany||"").replace(/"/g,'""')}","${(r.receiverPhone||"").replace(/"/g,'""')}",${catOf(r)},${parseFloat(r.totalSum)||0}`
    ).join("\n");
    const uri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    Linking.openURL(uri);
  };

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const updateRow = (id: number, key: keyof WaybillRow, value: string) => setForm(prev => ({ ...prev, items: prev.items.map(r => r.id === id ? { ...r, [key]: value } : r) }));
  const addRow = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyRow()] }));
  const removeRow = (id: number) => setForm(prev => ({ ...prev, items: prev.items.length <= 1 ? prev.items : prev.items.filter(r => r.id !== id) }));
  const resetForm = () => { setForm(defaultForm()); };

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>📦 Yuk xatlari</Text>
            <Text style={s.headerSub}>Barcha yuk xatlarini boshqarish</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.headerBtn} onPress={handleExportExcel}>
              <Text style={s.headerBtnText}>📥 Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.headerBtn, s.headerBtnPrimary]} onPress={openNew}>
              <Text style={s.headerBtnTextPrimary}>＋ Yuk xati</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: "#eff6ff" }]}>
            <Text style={[s.statValue, { color: "#2563eb" }]}>{filtered.length}</Text>
            <Text style={s.statLabel}>Jami</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: "#f0fdf4" }]}>
            <Text style={[s.statValue, { color: "#16a34a" }]}>{sotuvCount}</Text>
            <Text style={s.statLabel}>Sotuv</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: "#fef2f2" }]}>
            <Text style={[s.statValue, { color: "#dc2626" }]}>{xaridCount}</Text>
            <Text style={s.statLabel}>Xarid</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: "#fff7ed" }]}>
            <Text style={[s.statValue, { color: "#ea580c", fontSize: 12 }]}>{totalSum.toLocaleString("uz-UZ")}</Text>
            <Text style={s.statLabel}>Summa</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={s.filterCard}>
          <TouchableOpacity style={s.filterToggleBtn} onPress={() => setShowFilters(!showFilters)}>
            <Text style={s.filterToggleText}>{showFilters ? "▼" : "▶"} {showFilters ? "Yashirish" : "Filtr"}</Text>
          </TouchableOpacity>
          {showFilters && (
            <View style={{ marginTop: spacing.md }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {(["all","Sotuv","Xarid"] as const).map(cat => (
                  <TouchableOpacity key={cat} style={[s.catChip, filterCategory===cat && s.catChipActive]} onPress={() => setFilterCategory(cat)}>
                    <Text style={[s.catChipText, filterCategory===cat && { color: "#fff" }]}>{cat==="all"?"Barchasi":cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={s.monthRow}>
                {months.map((m, i) => (
                  <TouchableOpacity key={i} style={[s.monthBtn, filterMonth===i && s.monthBtnActive]} onPress={() => setFilterMonth(i)}>
                    <Text style={[s.monthBtnText, filterMonth===i && { color: "#fff" }]}>{m.slice(0,3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.yearRow}>
                <TouchableOpacity onPress={() => setFilterYear(y => y-1)} style={s.yearArrow}><Text style={s.yearArrowText}>◀</Text></TouchableOpacity>
                <Text style={s.yearText}>{filterYear}</Text>
                <TouchableOpacity onPress={() => setFilterYear(y => y+1)} style={s.yearArrow}><Text style={s.yearArrowText}>▶</Text></TouchableOpacity>
              </View>
              <TextInput style={s.searchInput} value={filterText} onChangeText={setFilterText} placeholder="🔍 Qidirish..." placeholderTextColor={colors.textMuted} />
              {(filterMonth !== null || filterText || filterCategory !== "all") && (
                <TouchableOpacity style={s.clearBtn} onPress={() => { setFilterMonth(new Date().getMonth()); setFilterText(""); setFilterCategory("all"); }}>
                  <Text style={s.clearBtnText}>Tozalash</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Table */}
        <View style={s.tableCard}>
          {/* Table header */}
          <View style={s.tableHeader}>
            <Text style={s.th}>№</Text>
            <Text style={s.th}>Sana</Text>
            <Text style={s.th}>Yuboruvchi</Text>
            <Text style={s.th}>Qabul qiluvchi</Text>
            <Text style={s.th}>Tur</Text>
            <Text style={s.th}>Summa</Text>
            <Text style={s.th}>Ma'lumot</Text>
            <Text style={s.th}></Text>
          </View>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>📋</Text>
              <Text style={s.emptyText}>Yuk xatlari topilmadi</Text>
              <Text style={s.emptyHint}>Yangi yuk xati qo'shing yoki filterni o'zgartiring</Text>
            </View>
          ) : filtered.map((w: WaybillData) => {
            const cat = catOf(w);
            const isSotuv = cat === "Sotuv";
            return (
              <View key={w.id} style={s.tableRow}>
                <Text style={s.td}>{w.docNumber}</Text>
                <Text style={[s.td, s.tdMuted]}>{w.date ? new Date(w.date).toLocaleDateString("uz") : "—"}</Text>
                <Text style={s.td} numberOfLines={1}>{w.senderCompany || "—"}</Text>
                <Text style={s.td} numberOfLines={1}>{w.receiverCompany || "—"}</Text>
                <Text style={s.td}><View style={[s.badge, { backgroundColor: isSotuv ? "#dcfce7" : "#fee2e2" }]}><Text style={[s.badgeText, { color: isSotuv ? "#16a34a" : "#dc2626" }]}>{cat}</Text></View></Text>
                <Text style={[s.td, { fontWeight: "800" }]}>{(parseFloat(w.totalSum)||0).toLocaleString("uz-UZ")}</Text>
                <Text style={[s.td, s.tdMuted]}>{(w.items||[]).length} / {(w.items||[]).reduce((sum: number, item: any) => sum+(Number(item.quantity)||0),0).toLocaleString("uz-UZ")}</Text>
                <View style={s.tdActions}>
                  <TouchableOpacity onPress={() => openView(w)} style={s.actionBtn}><Text style={{ fontSize: 14 }}>👁️</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => openEdit(w)} style={s.actionBtn}><Text style={{ fontSize: 14 }}>✏️</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePrint(w)} style={s.actionBtn} disabled={printing}><Text style={{ fontSize: 14 }}>🖨️</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(w.id, w.docNumber)} style={[s.actionBtn, { backgroundColor: "#fef2f2" }]}><Text style={{ fontSize: 14 }}>🗑️</Text></TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={s.hint}>* Kartochkani bosib tahrirlang, uzoq bosib o'chiring</Text>
       </ScrollView>

      {/* Create/Edit/View Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{viewingId ? "👁️ Ko'rish" : editingId ? "✏️ Tahrirlash" : "📋 Yangi yuk xati"} №{form.docNumber}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditingId(null); setViewingId(null); }}>
                <Text style={s.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {viewingId ? (
                <View style={s.viewContent}>
                  {(() => {
                    const w = filtered.find(w => w.id === viewingId);
                    if (!w) return <Text>Topilmadi</Text>;
                    return (
                      <>
                        <View style={s.viewRow}><Text style={s.viewLabel}>📄 №</Text><Text style={s.viewValue}>#{w.docNumber}</Text></View>
                        <View style={s.viewRow}><Text style={s.viewLabel}>📅 Sana</Text><Text style={s.viewValue}>{w.date ? new Date(w.date).toLocaleDateString("uz") : "—"}</Text></View>
                        <View style={s.viewRow}><Text style={s.viewLabel}>📤 Yuboruvchi</Text><Text style={s.viewValue}>{w.senderCompany || "—"} ({w.senderPhone || ""})</Text></View>
                        <View style={s.viewRow}><Text style={s.viewLabel}>📥 Qabul qiluvchi</Text><Text style={s.viewValue}>{w.receiverCompany || "—"} ({w.receiverPhone || ""})</Text></View>
                        <View style={s.viewRow}><Text style={s.viewLabel}>🏷 Kategoriya</Text><Text style={[s.viewValue, { color: catOf(w) === "Sotuv" ? "#16a34a" : catOf(w) === "Xarid" ? "#dc2626" : colors.textMuted, fontWeight: "800" }]}>{catOf(w)} (avtomatik)</Text></View>
                        <View style={s.viewRow}><Text style={s.viewLabel}>🧾 Ma'lumotlar</Text><Text style={s.viewValue}>{(w.items||[]).length} ta mahsulot</Text></View>
                        <View style={[s.viewRow, { marginTop: spacing.md }]}>
                          <Text style={s.viewLabel}>Jami</Text>
                          <Text style={[s.viewValue, { color: colors.primary, fontWeight: "800", fontSize: 16 }]}>{(parseFloat(w.totalSum)||0).toLocaleString("uz-UZ")} so'm</Text>
                        </View>
                        <Text style={{ marginTop: spacing.md, fontWeight: "700", color: colors.text }}>Mahsulotlar ro'yxati:</Text>
                        {(w.items||[]).filter((r: any) => r.name || r.quantity).map((r: any, i: number) => (
                          <View key={i} style={s.viewItem}>
                            <Text style={s.viewItemNum}>{i+1}.</Text>
                            <Text style={s.viewItemName}>{r.name}</Text>
                            <Text style={s.viewItemDetail}>{r.format} | {r.unit} | {r.quantity} | {(Number(r.price)||0).toLocaleString("uz-UZ")} so'm</Text>
                            <Text style={[s.viewItemDetail, { fontWeight: "800" }]}>{((Number(r.quantity)||0)*(Number(r.price)||0)).toLocaleString("uz-UZ")} so'm</Text>
                          </View>
                        ))}
                      </>
                    );
                  })()}
                </View>
              ) : (
                <>
                  <Text style={s.fieldLabel}>Sana</Text>
                  <TextInput style={s.input} value={form.date} onChangeText={v => setField("date", v)} placeholder="2026-09-20" placeholderTextColor={colors.textMuted} />
                  <Text style={s.sectionTitle}>📤 Yuboruvchi</Text>
                  <Text style={s.fieldLabel}>Kompaniya</Text>
                  <CompanyAutocomplete
                    value={form.senderCompany}
                    phone={form.senderPhone}
                    clients={clients}
                    onChange={(name, phone) => { setField("senderCompany", name); setField("senderPhone", phone); }}
                    placeholder="Kompaniya nomi"
                    inputStyle={s.input}
                  />
                  <Text style={s.fieldLabel}>Telefon</Text>
                  <TextInput style={s.input} value={form.senderPhone} onChangeText={v => setField("senderPhone", v)} placeholder="+998 XX XXX XX XX" placeholderTextColor={colors.textMuted} />
                  <Text style={s.sectionTitle}>📥 Qabul qiluvchi</Text>
                  <Text style={s.fieldLabel}>Kompaniya</Text>
                  <CompanyAutocomplete
                    value={form.receiverCompany}
                    phone={form.receiverPhone}
                    clients={clients}
                    onChange={(name, phone) => { setField("receiverCompany", name); setField("receiverPhone", phone); }}
                    placeholder="Qabul qiluvchi nomi"
                    inputStyle={s.input}
                  />
                  <Text style={s.fieldLabel}>Telefon</Text>
                  <TextInput style={s.input} value={form.receiverPhone} onChangeText={v => setField("receiverPhone", v)} placeholder="+998 XX XXX XX XX" placeholderTextColor={colors.textMuted} />
                  <Text style={s.fieldLabel}>Kategoriya (avtomatik)</Text>
                  <View style={[s.badge, { alignSelf: "flex-start" }, { backgroundColor: getCategory(form.senderCompany, form.receiverCompany, companies, form.items.map(r => r.name), products.map(p => p.name)) === "Sotuv" ? "#dcfce7" : getCategory(form.senderCompany, form.receiverCompany, companies, form.items.map(r => r.name), products.map(p => p.name)) === "Xarid" ? "#fee2e2" : "#f1f5f9" }]}>
                    <Text style={[s.badgeText, { color: getCategory(form.senderCompany, form.receiverCompany, companies, form.items.map(r => r.name), products.map(p => p.name)) === "Sotuv" ? "#16a34a" : getCategory(form.senderCompany, form.receiverCompany, companies, form.items.map(r => r.name), products.map(p => p.name)) === "Xarid" ? "#dc2626" : colors.textMuted }]}>
                      {getCategory(form.senderCompany, form.receiverCompany, companies, form.items.map(r => r.name), products.map(p => p.name))} — yuboruvchi bizniki bo'lsa Sotuv, qabul qiluvchi bizniki bo'lsa Xarid
                    </Text>
                  </View>
                  <Text style={s.sectionTitle}>📋 Mahsulotlar</Text>
                  {form.items.map((r, idx) => {
                    const rowTotal = (Number(r.quantity)||0)*(Number(r.price)||0);
                    return (
                      <View key={r.id} style={s.rowCard}>
                        <View style={s.rowHeader}>
                          <Text style={s.rowNum}>#{idx+1}</Text>
                          <TouchableOpacity onPress={() => removeRow(r.id)} style={s.removeBtn}><Text style={s.removeBtnText}>✕</Text></TouchableOpacity>
                        </View>
                        <View style={s.row2}>
                          <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Nomi</Text><TextInput style={s.input} value={r.name} onChangeText={v => updateRow(r.id,"name",v)} placeholder="Mahsulot" placeholderTextColor={colors.textMuted} /></View>
                          <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Format</Text><TextInput style={s.input} value={r.format} onChangeText={v => updateRow(r.id,"format",v)} placeholder="30x20x15" placeholderTextColor={colors.textMuted} /></View>
                        </View>
                        <View style={s.row3}>
                          <View style={{ flex: 0.6 }}><Text style={s.fieldLabel}>Birlik</Text><TextInput style={s.input} value={r.unit} onChangeText={v => updateRow(r.id,"unit",v)} placeholder="Kg" placeholderTextColor={colors.textMuted} /></View>
                          <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Miqdori</Text><TextInput style={s.input} value={r.quantity} onChangeText={v => updateRow(r.id,"quantity",v)} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} /></View>
                          <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Narx</Text><TextInput style={s.input} value={r.price} onChangeText={v => updateRow(r.id,"price",v)} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} /></View>
                        </View>
                        {rowTotal > 0 && <Text style={s.rowTotal}>Summa: {rowTotal.toLocaleString("uz-UZ")} so'm</Text>}
                      </View>
                    );
                  })}
                  <TouchableOpacity style={s.addRowBtn} onPress={addRow}><Text style={s.addRowText}>+ Yangi qator</Text></TouchableOpacity>
                  <View style={s.totalCard}>
                    <Text style={s.totalLabel}>JAMI SUMMA</Text>
                    <Text style={s.totalValue}>{form.items.reduce((s,r)=>s+(Number(r.quantity)||0)*(Number(r.price)||0),0).toLocaleString("uz-UZ")} so'm</Text>
                  </View>
                </>
              )}
            </ScrollView>
            {!viewingId && (
              <View style={s.sheetActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowModal(false); setEditingId(null); }}><Text style={s.cancelText}>Bekor</Text></TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}><Text style={s.saveText}>{saving ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Saqlash"}</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 2, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 6 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  headerBtnText: { fontSize: 12, fontWeight: "700", color: colors.text },
  headerBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  headerBtnTextPrimary: { fontSize: 12, fontWeight: "700", color: "#fff" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  statCard: { flex: 1, borderRadius: radius.lg, padding: spacing.sm, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },

  filterCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, ...shadows.sm, marginBottom: spacing.md },
  filterToggleBtn: { paddingVertical: 6 },
  filterToggleText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  searchInput: { height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, color: colors.text, backgroundColor: colors.surfaceAlt, marginTop: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, marginRight: 6, borderWidth: 1.5, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  monthRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  monthBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  monthBtnActive: { backgroundColor: colors.primary },
  monthBtnText: { fontSize: 11, fontWeight: "600", color: colors.text },
  yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 8 },
  yearArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  yearArrowText: { fontSize: 14, color: colors.text },
  yearText: { fontSize: 18, fontWeight: "800", color: colors.text },
  clearBtn: { marginTop: 8, paddingVertical: 8, alignItems: "center" },
  clearBtnText: { fontSize: 12, fontWeight: "700", color: colors.primary },

  tableCard: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden", ...shadows.sm },
  tableHeader: { flexDirection: "row", paddingVertical: 10, backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 4 },
  th: { fontSize: 10, fontWeight: "800", color: colors.textSecondary, textAlign: "center", flex: 1 },
  tableRow: { flexDirection: "row", flexWrap: "wrap", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingHorizontal: 4, alignItems: "center" },
  td: { fontSize: 11, fontWeight: "600", color: colors.text, flex: 1, textAlign: "center" },
  tdMuted: { fontSize: 10, color: colors.textMuted },
  tdActions: { flexDirection: "row", gap: 4, justifyContent: "center", flex: 1 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "700" },

  empty: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: "600", marginTop: 8 },
  emptyHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  hint: { fontSize: 10, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40, maxHeight: "95%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  sheetClose: { fontSize: 24, color: colors.textMuted },

  viewContent: { paddingVertical: 8 },
  viewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  viewLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  viewValue: { fontSize: 13, color: colors.text, fontWeight: "600", flex: 1, textAlign: "right" },
  viewItem: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm, marginBottom: 6 },
  viewItemNum: { fontSize: 12, fontWeight: "800", color: colors.primary },
  viewItemName: { fontSize: 13, fontWeight: "700", color: colors.text },
  viewItemDetail: { fontSize: 11, color: colors.textMuted },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 4, marginTop: spacing.xs },
  input: { height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 14, color: colors.text, backgroundColor: colors.surfaceAlt, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: spacing.md, marginBottom: spacing.sm, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  rowNum: { fontSize: 13, fontWeight: "800", color: colors.primary },
  row2: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs },
  row3: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs },
  removeBtn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },
  removeBtnText: { fontSize: 14, color: "#ef4444", fontWeight: "700" },
  rowTotal: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.borderLight },
  addRowBtn: { paddingVertical: 10, alignItems: "center", borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", marginTop: 6 },
  addRowText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  totalCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, borderWidth: 2, borderColor: colors.primary, ...shadows.sm },
  totalLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
  totalValue: { fontSize: 20, fontWeight: "800", color: colors.primary },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: spacing.md },
  cancelBtn: { flex: 1, height: 52, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
