import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, Modal, Alert, Image, Dimensions, Pressable, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PRODUCTS_MATERIALS = [
  "Kraxmal", "Koustik Soda", "Qog'oz B2", "Qog'oz B3",
  "Qog'oz K0", "Qog'oz K1", "Oq qog'oz", "Bo'yoq",
];

const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtD = (n: number, d = 2) => n.toFixed(d);
const n = (s: string) => parseFloat(s) || 0;

const defaultForm = {
  companyName: "Shovot Carton",
  boxName: "RSC quti",
  boxL: "",
  boxW: "",
  boxH: "",
  layer1Weight: "0.12",
  layer2Weight: "0.12",
  layer3Weight: "0.12",
  priceLayer1: "",
  priceLayer2: "",
  priceLayer3: "",
  quantity: "1000",
  coefficient: "1.5",
  image: "",
  color: "",
  status: "hidden" as "published" | "hidden",
};

type Form = typeof defaultForm;

function MiniInput({ label, value, onChange, placeholder, unit }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; unit: string;
}) {
  return (
    <View style={styles.miniInputRow}>
      <Text style={styles.miniInputLabel}>{label}</Text>
      <View style={styles.miniInputWrap}>
        <TextInput
          style={styles.miniInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />
        <Text style={styles.miniInputUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function BoxTemplateMobile({ L, W, H }: { L: number; W: number; H: number }) {
  if (L <= 0 || W <= 0 || H <= 0) return null;
  const blankLen = 2 * (W + L) + 6;
  const flapH = L / 2;
  const blankW = 1 + flapH + H + flapH + 1;
  const maxSvgDim = Math.max(blankLen, blankW);
  const svgW = 260;
  const svgH = 180;
  const scale = Math.min((svgW - 20) / blankLen, (svgH - 30) / blankW);
  const ox = (svgW - blankLen * scale) / 2;
  const oy = (svgH - blankW * scale) / 2;
  const sx = (v: number) => ox + v * scale;
  const sy = (v: number) => oy + v * scale;
  const f = (v: number) => +v.toFixed(1);

  const mainW = W, mainH2 = H, flap = L / 2;

  const top = [
    { x: 0, y: 0 }, { x: mainW, y: 0 }, { x: mainW, y: flap },
    { x: 0, y: flap },
  ];
  const mid = [
    { x: 0, y: flap }, { x: mainW, y: flap },
    { x: mainW, y: flap + mainH2 }, { x: 0, y: flap + mainH2 },
  ];
  const bot = [
    { x: 0, y: flap + mainH2 }, { x: mainW, y: flap + mainH2 },
    { x: mainW, y: 2 * flap + mainH2 }, { x: 0, y: 2 * flap + mainH2 },
  ];
  const left = [
    { x: -flap, y: flap }, { x: 0, y: flap }, { x: 0, y: flap + mainH2 },
    { x: -flap, y: flap + mainH2 },
  ];
  const right = [
    { x: mainW, y: flap }, { x: mainW + flap, y: flap },
    { x: mainW + flap, y: flap + mainH2 }, { x: mainW, y: flap + mainH2 },
  ];
  const poly = (pts: { x: number; y: number }[]) =>
    pts.map(p => `${sx(p.x)},${sy(p.y)}`).join(" ");

  return (
    <View style={styles.svgContainer}>
      <Text style={styles.svgTitle}>Kesma — {f(blankLen)}×{f(blankW)} sm</Text>
      <View style={styles.svgBox}>
        <View style={{ width: svgW, height: svgH }}>
          <View style={[styles.poly, { backgroundColor: "#93c5fd", opacity: 0.18 }]} />
          <View style={[styles.polyMid, { backgroundColor: "#818cf8", opacity: 0.18 }]} />
          <View style={[styles.polyBot, { backgroundColor: "#86efac", opacity: 0.18 }]} />
          <View style={[styles.polyLeft, { backgroundColor: "#93c5fd", opacity: 0.18 }]} />
          <View style={[styles.polyRight, { backgroundColor: "#93c5fd", opacity: 0.18 }]} />
          {/* Labels */}
          <View style={[styles.svgLabel, { top: sy(flap / 2) - 6, left: sx(mainW / 2) - 16 }]}>
            <Text style={styles.svgLabelText}>{mainW}</Text>
          </View>
          <View style={[styles.svgLabel, { top: sy(flap + mainH2 / 2) - 6, left: sx(mainW / 2) - 14 }]}>
            <Text style={styles.svgLabelText}>{mainH2}</Text>
          </View>
          <View style={[styles.svgLabel, { top: sy(2 * flap + mainH2) - 18, left: sx(mainW / 2) - 16 }]}>
            <Text style={styles.svgLabelText}>{mainW}</Text>
          </View>
          <View style={[styles.svgLabel, { top: sy(flap + mainH2 / 2) - 6, left: sx(-flap / 2) - 16 }]}>
            <Text style={styles.svgLabelText}>{flap}</Text>
          </View>
          <View style={[styles.svgLabel, { top: sy(flap + mainH2 / 2) - 6, left: sx(mainW + flap / 2) - 16 }]}>
            <Text style={styles.svgLabelText}>{flap}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.svgFormula}>Uzunlik: 2×({W}+{L})+6 = {f(blankLen)} sm</Text>
      <Text style={styles.svgFormula}>Eni: 1+{L}/2+{H}+{L}/2+1 = {f(blankW)} sm</Text>
    </View>
  );
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(defaultForm);

  const set = (key: keyof Form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const load = async () => {
    try {
      const [data, inventory] = await Promise.all([
        apiFetch("/products"),
        apiFetch("/inventory").catch(() => []),
      ]);
      setProducts(Array.isArray(data) ? data : []);
      const map: Record<number, number> = {};
      if (Array.isArray(inventory)) {
        inventory.forEach((row: any) => {
          map[row.productId] = (map[row.productId] || 0) + (row.quantity || 0);
        });
      }
      setStockMap(map);
    } catch (e: any) {
      Alert.alert("Xatolik", e.message || "Mahsulotlarni yuklab bo'lmadi");
    }
  };

  useFocusEffect(useCallback(() => { void load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const calc = useMemo(() => {
    const L = n(form.boxL), W = n(form.boxW), H = n(form.boxH);
    const w1 = n(form.layer1Weight), w2 = n(form.layer2Weight), w3 = n(form.layer3Weight);
    const p1 = n(form.priceLayer1), p2 = n(form.priceLayer2), p3 = n(form.priceLayer3);
    const k = n(form.coefficient);
    if (L <= 0 || W <= 0 || H <= 0) return null;
    const blankLen = 2 * (W + L) + 6;
    const flapH = L / 2;
    const blankW = 1 + flapH + H + flapH + 1;
    const netAreaM2 = (blankLen * blankW) / 10000;
    const l1Weight = netAreaM2 * w1;
    const l1Cost = l1Weight * p1;
    const l2Weight = netAreaM2 * w2 / 0.7;
    const l2Cost = l2Weight * p2;
    const l3Weight = netAreaM2 * w3;
    const l3Cost = l3Weight * p3;
    const totalPaperCost = l1Cost + l2Cost + l3Cost;
    const sellingPrice = Math.round(totalPaperCost * k);
    return {
      blankLen: +fmtD(blankLen, 1), blankW: +fmtD(blankW, 1),
      netAreaM2: +fmtD(netAreaM2, 4),
      l1: { weight: +fmtD(l1Weight, 4), price: p1, cost: Math.round(l1Cost) },
      l2: { weight: +fmtD(l2Weight, 4), price: p2, cost: Math.round(l2Cost) },
      l3: { weight: +fmtD(l3Weight, 4), price: p3, cost: Math.round(l3Cost) },
      totalPaperCost: Math.round(totalPaperCost),
      sellingPrice,
      coefficient: k,
    };
  }, [form.boxL, form.boxW, form.boxH, form.layer1Weight, form.layer2Weight, form.layer3Weight, form.priceLayer1, form.priceLayer2, form.priceLayer3, form.coefficient]);

  const hasBox = n(form.boxL) > 0 && n(form.boxW) > 0 && n(form.boxH) > 0;

  const openAdd = () => { setEditing(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    let calcData: any = null;
    try { calcData = p.material ? JSON.parse(p.material) : null; } catch (_) {}
    setForm({
      companyName: p.description?.split("—")[0]?.trim() || "Shovot Carton",
      boxName: p.name || "RSC quti",
      boxL: p.length?.toString() || "",
      boxW: p.width?.toString() || "",
      boxH: p.height?.toString() || "",
      layer1Weight: "0.12",
      layer2Weight: "0.12",
      layer3Weight: "0.12",
      priceLayer1: calcData?.l1 ? String(calcData.l1.price) : "",
      priceLayer2: calcData?.l2 ? String(calcData.l2.price) : "",
      priceLayer3: calcData?.l3 ? String(calcData.l3.price) : "",
      quantity: "1000",
      coefficient: calcData?.coefficient ? String(calcData.coefficient) : "1.5",
      image: p.image || "",
      color: p.color || "",
      status: p.status === "published" || p.isPublished ? "published" : "hidden",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.boxName.trim()) { Alert.alert("Xatolik", "Quti nomi kiritilishi shart"); return; }
    setSaving(true);
    try {
      const body = {
        name: form.boxName || "Nomsiz quti",
        description: `${form.companyName} — ${form.boxName} (${n(form.boxW)}×${n(form.boxH)}×${n(form.boxL)} sm)`,
        price: calc?.sellingPrice || 0,
        length: n(form.boxL),
        width: n(form.boxW),
        height: n(form.boxH),
        material: [
          form.layer1Weight && `1-qatlam: ${form.layer1Weight}kg/m²`,
          form.layer2Weight && `2-qatlam: ${form.layer2Weight}kg/m²`,
          form.layer3Weight && `3-qatlam: ${form.layer3Weight}kg/m²`,
        ].filter(Boolean).join(", "),
        materials: [
          form.layer1Weight && `1-qatlam: ${form.layer1Weight}kg/m² × ${fmt(n(form.priceLayer1))}`,
          form.layer2Weight && `2-qatlam: ${form.layer2Weight}kg/m² × ${fmt(n(form.priceLayer2))}`,
          form.layer3Weight && `3-qatlam: ${form.layer3Weight}kg/m² × ${fmt(n(form.priceLayer3))}`,
        ].filter(Boolean),
        color: form.color || undefined,
        image: form.image || undefined,
        category: "Quti",
        status: form.status,
      };
      if (editing) {
        await apiFetch(`/products/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/products", { method: "POST", body: JSON.stringify(body) });
      }
      Alert.alert("Muvaffaqiyat", editing ? "Yangilandi ✅" : "Saqlandi ✅");
      setShowModal(false); setEditing(null); setForm(defaultForm); await load();
    } catch (e: any) {
      Alert.alert("Xatolik", e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    const doDelete = async () => {
      try { await apiFetch(`/products/${id}`, { method: "DELETE" }); await load(); } catch (e: any) {
        Alert.alert("Xatolik", e.message);
      }
    };
    // react-native-web'da Alert no-op — web uchun window.confirm
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && !window.confirm("Mahsulotni o'chirmoqchimisiz?")) return;
      doDelete();
      return;
    }
    Alert.alert("O'chirish", "Mahsulotni o'chirmoqchimisiz?", [
      { text: "Yo'q" },
      { text: "Ha", style: "destructive", onPress: doDelete },
    ]);
  };

  const togglePublish = async (p: any) => {
    const next = p.status === "published" || p.isPublished ? "hidden" : "published";
    try {
      await apiFetch(`/products/${p.id}`, { method: "PUT", body: JSON.stringify({ status: next }) });
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
  };

  const totalStock = Object.values(stockMap).reduce((a, b) => a + b, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background,  }}>
      {/* Header */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Mahsulotlar</Text>
          <Text style={styles.topSub}>{products.length} ta mahsulot, omborda {totalStock.toLocaleString()} ta</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Yangi</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Mahsulotlar topilmadi</Text>
            <Text style={styles.emptyHint}>"Yangi" tugmasini bosib qo'shing</Text>
          </View>
        ) : products.map((p) => {
          const isPublished = p.status === "published" || p.isPublished;
          const stock = stockMap[p.id] || 0;
          const stockColor = stock === 0 ? "#dc2626" : stock < 50 ? "#ca8a04" : "#16a34a";
          let calcData: any = null;
    try { calcData = p.material ? JSON.parse(p.material) : null; } catch (e) {}
          const mats = Array.isArray(p.materials) ? p.materials : [];

          return (
            <View key={p.id} style={styles.productCard}>
              {/* Image */}
              <View style={styles.cardImageArea}>
                {p.image ? (
                  <Image source={{ uri: p.image }} style={styles.cardImage} />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Text style={{ fontSize: 32, opacity: 0.3 }}>📦</Text>
                  </View>
                )}
                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: isPublished ? "#16a34a" : "#6b7280" }]}>
                  <Text style={styles.statusBadgeText}>{isPublished ? "Jonli" : "Yashirin"}</Text>
                </View>
                {/* Action buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => togglePublish(p)} style={styles.actionBtn}>
                    <Text style={{ fontSize: 14 }}>{isPublished ? "🙈" : "👁️"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEdit(p)} style={styles.actionBtn}>
                    <Text style={{ fontSize: 14 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(p.id)} style={[styles.actionBtn, { backgroundColor: "#fee2e2" }]}>
                    <Text style={{ fontSize: 14 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{p.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{p.description || "Ma'lumot yo'q"}</Text>

                {/* calcData details */}
                {calcData && (
                  <View style={styles.calcDetails}>
                    <View style={styles.calcPillRow}>
                      <View style={[styles.calcPill, { backgroundColor: "#f5f3ff" }]}>
                        <Text style={[styles.calcPillText, { color: "#7c3aed" }]}>Kesma: {calcData.blankLen}×{calcData.blankW} sm</Text>
                      </View>
                      <View style={[styles.calcPill, { backgroundColor: "#f5f3ff" }]}>
                        <Text style={[styles.calcPillText, { color: "#7c3aed" }]}>Sof: {calcData.netAreaM2} m²</Text>
                      </View>
                    </View>
                    {calcData.l1 && (
                      <View style={styles.calcLayerRow}>
                        <View style={[styles.calcDot, { backgroundColor: "#3b82f6" }]} />
                        <Text style={styles.calcLayerLabel}>1-qatlam:</Text>
                        <Text style={styles.calcLayerVal}>{calcData.l1.weight} kg</Text>
                        <Text style={styles.calcLayerPrice}>× {fmt(calcData.l1.price)}</Text>
                        <Text style={styles.calcLayerCost}>{fmt(calcData.l1.cost)} so'm</Text>
                      </View>
                    )}
                    {calcData.l2 && (
                      <View style={styles.calcLayerRow}>
                        <View style={[styles.calcDot, { backgroundColor: "#f59e0b" }]} />
                        <Text style={styles.calcLayerLabel}>2-qatlam:</Text>
                        <Text style={styles.calcLayerVal}>{calcData.l2.weight} kg</Text>
                        <Text style={styles.calcLayerPrice}>× {fmt(calcData.l2.price)}</Text>
                        <Text style={styles.calcLayerCost}>{fmt(calcData.l2.cost)} so'm</Text>
                      </View>
                    )}
                    {calcData.l3 && (
                      <View style={styles.calcLayerRow}>
                        <View style={[styles.calcDot, { backgroundColor: "#22c55e" }]} />
                        <Text style={styles.calcLayerLabel}>3-qatlam:</Text>
                        <Text style={styles.calcLayerVal}>{calcData.l3.weight} kg</Text>
                        <Text style={styles.calcLayerPrice}>× {fmt(calcData.l3.price)}</Text>
                        <Text style={styles.calcLayerCost}>{fmt(calcData.l3.cost)} so'm</Text>
                      </View>
                    )}
                    <View style={styles.calcTotalRow}>
                      <Text style={styles.calcTotalLabel}>Ishlab chiqarish</Text>
                      <Text style={styles.calcTotalVal}>{fmt(calcData.totalPaperCost)} so'm</Text>
                    </View>
                  </View>
                )}

                {!calcData && mats.length > 0 && (
                  <View style={styles.matsRow}>
                    {mats.map((m: string, i: number) => (
                      <View key={i} style={[styles.calcPill, { backgroundColor: "#dbeafe" }]}>
                        <Text style={[styles.calcPillText, { color: "#2563eb" }]}>{m}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Dimensions */}
                {(p.length || p.width || p.height) && (
                  <View style={styles.dimRow}>
                    {p.length && <View style={styles.dimBadge}><Text style={styles.dimText}>📐 {p.length}×{p.width}×{p.height} sm</Text></View>}
                    {p.color && (
                      <View style={styles.dimBadge}>
                        <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                        <Text style={styles.dimText}>{p.color}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Price + Stock */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.footerLabel}>Sotish narxi</Text>
                    <Text style={[styles.footerValue, { color: "#16a34a" }]}>{fmt(p.price || 0)} so'm</Text>
                    {calcData?.coefficient ? <Text style={styles.footerSub}>× {calcData.coefficient} koeff.</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.footerLabel}>Omborda</Text>
                    <Text style={[styles.footerValue, { color: stockColor }]}>{stock} ta</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "✏️ Tahrirlash" : "Yangi mahsulot"}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditing(null); setForm(defaultForm); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Korxona & quti nomi */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>🏢 Korxona & quti nomi</Text>
              <MiniInput label="Korxona" value={form.companyName} onChange={v => set("companyName", v)} placeholder="Shovot Carton" unit="" />
              <MiniInput label="Quti nomi" value={form.boxName} onChange={v => set("boxName", v)} placeholder="RSC quti" unit="" />
            </View>

            {/* Quti o'lchamlari */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>📦 Quti (sm)</Text>
              <MiniInput label="Bo'yi" value={form.boxL} onChange={v => set("boxL", v)} placeholder="30" unit="sm" />
              <MiniInput label="Eni" value={form.boxW} onChange={v => set("boxW", v)} placeholder="20" unit="sm" />
              <MiniInput label="Balandligi" value={form.boxH} onChange={v => set("boxH", v)} placeholder="15" unit="sm" />
            </View>

            {/* Eskiz */}
            {hasBox && (
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>🎨 Eskiz</Text>
                <BoxTemplateMobile L={n(form.boxL)} W={n(form.boxW)} H={n(form.boxH)} />
              </View>
            )}

            {/* Qatlam og'irligi + narx */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>💰 Har bir qatlam uchun</Text>
              <Text style={styles.layerTitle}>1-qatlam (Tashqi)</Text>
              <MiniInput label="Og'irlik" value={form.layer1Weight} onChange={v => set("layer1Weight", v)} placeholder="0.12" unit="kg/m²" />
              <MiniInput label="Narx" value={form.priceLayer1} onChange={v => set("priceLayer1", v)} placeholder="0" unit="so'm/kg" />
              <Text style={[styles.layerTitle, { marginTop: 8 }]}>2-qatlam (Gofra)</Text>
              <MiniInput label="Og'irlik" value={form.layer2Weight} onChange={v => set("layer2Weight", v)} placeholder="0.12" unit="kg/m²" />
              <MiniInput label="Narx" value={form.priceLayer2} onChange={v => set("priceLayer2", v)} placeholder="0" unit="so'm/kg" />
              <Text style={[styles.layerTitle, { marginTop: 8 }]}>3-qatlam (Ichki)</Text>
              <MiniInput label="Og'irlik" value={form.layer3Weight} onChange={v => set("layer3Weight", v)} placeholder="0.12" unit="kg/m²" />
              <MiniInput label="Narx" value={form.priceLayer3} onChange={v => set("priceLayer3", v)} placeholder="0" unit="so'm/kg" />
            </View>

            {/* Miqdor + koeffitsient */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>📊 Miqdor & narx</Text>
              <MiniInput label="Miqdor" value={form.quantity} onChange={v => set("quantity", v)} placeholder="1000" unit="dona" />
              <MiniInput label="Koeffitsient" value={form.coefficient} onChange={v => set("coefficient", v)} placeholder="1.5" unit="×" />
              {calc && (
                <View style={styles.calcPreview}>
                  <View style={styles.calcPreviewCard}>
                    <Text style={styles.calcPreviewLabel}>Ishlab chiqarish</Text>
                    <Text style={[styles.calcPreviewVal, { color: "#2563eb" }]}>{fmt(calc.totalPaperCost)}</Text>
                    <Text style={styles.calcPreviewSub}>so'm / dona</Text>
                  </View>
                  <View style={[styles.calcPreviewCard, { borderColor: "#16a34a", borderWidth: 2 }]}>
                    <Text style={styles.calcPreviewLabel}>Sotish narxi</Text>
                    <Text style={[styles.calcPreviewVal, { color: "#16a34a" }]}>{fmt(calc.sellingPrice)}</Text>
                    <Text style={styles.calcPreviewSub}>so'm / dona × {calc.coefficient}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Rang */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>🎨 Rang</Text>
              <View style={styles.colorRow}>
                <TextInput style={[styles.colorInput, { flex: 1 }]} value={form.color} onChangeText={v => set("color", v)} placeholder="#000000" placeholderTextColor={colors.textMuted} />
                {form.color ? <View style={[styles.colorPreview, { backgroundColor: form.color }]} /> : null}
              </View>
            </View>

            {/* Status */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>📌 Holat</Text>
              <View style={styles.statusToggle}>
                <TouchableOpacity
                  style={[styles.statusToggleBtn, form.status === "published" && styles.statusToggleActive]}
                  onPress={() => set("status", "published")}
                >
                  <Text style={[styles.statusToggleText, form.status === "published" && styles.statusToggleTextActive]}>✅ Jonli</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusToggleBtn, form.status === "hidden" && styles.statusToggleHidden]}
                  onPress={() => set("status", "hidden")}
                >
                  <Text style={[styles.statusToggleText, form.status === "hidden" && styles.statusToggleTextHidden]}>🙈 Yashirin</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tugmalar */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setEditing(null); setForm(defaultForm); }}>
                <Text style={styles.cancelText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "Saqlanmoqda..." : "Saqlash"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  topTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  topSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    backgroundColor: "#f97316", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: radius.lg, ...shadows.sm,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  empty: { padding: 60, alignItems: "center" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.text, fontWeight: "700", fontSize: 16 },
  emptyHint: { color: colors.textMuted, marginTop: 6, textAlign: "center" },

  productCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, marginBottom: spacing.md,
    overflow: "hidden", borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
  },
  cardImageArea: { height: 180, backgroundColor: "#fef3c7", position: "relative" },
  cardImage: { width: "100%", height: "100%", resizeMode: "cover" },
  cardImagePlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  statusBadge: {
    position: "absolute", top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardActions: {
    position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 6,
  },
  actionBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center",
  },
  cardInfo: { padding: spacing.lg },
  cardName: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },

  calcDetails: { marginBottom: 8 },
  calcPillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 6 },
  calcPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  calcPillText: { fontSize: 10, fontWeight: "600" },
  calcLayerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  calcDot: { width: 6, height: 6, borderRadius: 3 },
  calcLayerLabel: { fontSize: 10, color: colors.textMuted },
  calcLayerVal: { fontSize: 10, fontWeight: "600", color: colors.text },
  calcLayerPrice: { fontSize: 10, color: colors.textMuted },
  calcLayerCost: { fontSize: 10, fontWeight: "700", color: colors.text, marginLeft: "auto" },
  calcTotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#eff6ff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginTop: 4,
  },
  calcTotalLabel: { fontSize: 10, fontWeight: "600", color: "#2563eb" },
  calcTotalVal: { fontSize: 11, fontWeight: "800", color: "#2563eb" },

  matsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  dimRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  dimBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
  },
  dimText: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: "#d1d5db" },

  cardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingTop: 8, borderTopWidth: 0.5, borderTopColor: colors.borderLight,
  },
  footerLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  footerValue: { fontSize: 15, fontWeight: "800" },
  footerSub: { fontSize: 9, color: colors.textMuted },

  fab: {
    position: "absolute", bottom: 24, right: 20, width: 60, height: 60,
    borderRadius: 30, backgroundColor: "#f97316", justifyContent: "center",
    alignItems: "center", ...shadows.lg, zIndex: 100,
  },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", marginTop: -2 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalScroll: { maxHeight: "92%", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: spacing.xxl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalClose: { fontSize: 24, color: colors.textMuted },

  formSection: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8 },
  layerTitle: { fontSize: 11, fontWeight: "700", color: "#2563eb", marginBottom: 4 },

  miniInputRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  miniInputLabel: { fontSize: 12, color: colors.textSecondary, width: 80, textAlign: "right", marginRight: 8 },
  miniInputWrap: { flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  miniInput: { flex: 1, height: 40, paddingHorizontal: 12, fontSize: 14, color: colors.text },
  miniInputUnit: { fontSize: 10, color: colors.textMuted, paddingRight: 10 },

  calcPreview: { flexDirection: "row", gap: 10, marginTop: 10 },
  calcPreviewCard: {
    flex: 1, alignItems: "center", padding: 10, borderRadius: radius.md,
    backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe",
  },
  calcPreviewLabel: { fontSize: 9, fontWeight: "700", color: "#2563eb", textTransform: "uppercase" },
  calcPreviewVal: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  calcPreviewSub: { fontSize: 9, color: colors.textMuted },

  colorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorInput: { height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 14, color: colors.text, backgroundColor: colors.surfaceAlt },
  colorPreview: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border },

  statusToggle: { flexDirection: "row", gap: 10 },
  statusToggleBtn: {
    flex: 1, height: 44, borderRadius: radius.md, justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt,
  },
  statusToggleActive: { backgroundColor: "#dcfce7", borderColor: "#16a34a" },
  statusToggleHidden: { backgroundColor: "#f3f4f6", borderColor: "#6b7280" },
  statusToggleText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  statusToggleTextActive: { color: "#16a34a" },
  statusToggleTextHidden: { color: "#6b7280" },

  modalActions: { flexDirection: "row", gap: 12, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 50, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, height: 50, backgroundColor: "#f97316", borderRadius: radius.lg, justifyContent: "center", alignItems: "center", ...shadows.sm },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  svgContainer: { marginTop: 8 },
  svgTitle: { fontSize: 11, fontWeight: "700", color: colors.text, marginBottom: 4 },
  svgBox: { backgroundColor: "#fff", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 8, alignItems: "center" },
  svgFormula: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  svgLabel: { position: "absolute", backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  svgLabelText: { fontSize: 9, fontWeight: "600", color: colors.text },
  poly: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 2 },
  polyMid: { position: "absolute", top: 40, left: 30, right: 30, height: 50, borderRadius: 2 },
  polyBot: { position: "absolute", top: 90, left: 0, right: 0, bottom: 20, borderRadius: 2 },
  polyLeft: { position: "absolute", top: 40, left: 0, width: 30, height: 50, borderRadius: 2 },
  polyRight: { position: "absolute", top: 40, right: 0, width: 30, height: 50, borderRadius: 2 },
});
