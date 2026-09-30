import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  Alert, Platform, TextInput,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiFetch, isDriver } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { buildDeliveryMap } from "../lib/mapHtml";
import * as Location from "expo-location";

let WebView: any = null;
if (Platform.OS !== "web") {
  try { WebView = require("react-native-webview").WebView; } catch {}
}

const MAP_H = 300;

// Web Delivery.tsx bilan bir xil qadamlar
const steps = [
  { key: "pending", label: "Kutilmoqda" },
  { key: "in_transit", label: "Yo'lda" },
  { key: "delivered", label: "Yetkazilgan" },
];
const stC: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#f3f4f6", text: "#6b7280" },
  shipped: { bg: "#dbeafe", text: "#2563eb" },
  in_transit: { bg: "#fef3c7", text: "#d97706" },
  delivered: { bg: "#dcfce7", text: "#16a34a" },
};
const formatSum = (n: number) => (Number(n) || 0).toLocaleString("uz-UZ") + " so'm";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDT = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const parseAddr = (addr?: string): { lat: number; lng: number } | null => {
  const parts = (addr || "").split(",").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { lat: parts[0], lng: parts[1] };
  return null;
};

const hav = (a: [number, number], b: [number, number]) => {
  const R = 6371, dL = (b[0] - a[0]) * Math.PI / 180, dG = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dL / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

function WebMapContainer({ html, msg }: { html: string; msg: string | null }) {
  const containerRef = useRef<View | null>(null);
  const frameRef = useRef<any>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const node = containerRef.current as any;
    if (!node) return;
    node.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.srcdoc = html;
    iframe.style.cssText = "width:100%;height:100%;border:none;position:absolute;top:0;left:0;right:0;bottom:0;";
    frameRef.current = iframe;
    node.appendChild(iframe);
    return () => { frameRef.current = null; if (node) node.innerHTML = ""; };
  }, [html]);
  useEffect(() => {
    if (msg && frameRef.current && frameRef.current.contentWindow) {
      try { frameRef.current.contentWindow.postMessage(msg, "*"); } catch {}
    }
  }, [msg]);
  return <View ref={containerRef} style={{ flex: 1 }} />;
}

type FilterKey = number | "all" | "none";

export default function DeliveryScreen() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [wh, setWh] = useState({ lat: 41.311081, lng: 69.240562 });
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [driverLocs, setDriverLocs] = useState<Record<number, { lat: number; lng: number }>>({});
  const [driverFilter, setDriverFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [mapMsg, setMapMsg] = useState<string | null>(null);
  const [feeDraft, setFeeDraft] = useState<Record<number, string>>({});
  const [feeSavingId, setFeeSavingId] = useState<number | null>(null);
  const webRef = useRef<any>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const flewRef = useRef(false);

  const todayStr = ymd(new Date());
  const monthStr = todayStr.slice(0, 7);
  const deliveredDate = (o: any): string => (o.deliveredAt ? ymd(new Date(o.deliveredAt)) : o.date || "");

  const mapHtml = useMemo(() => buildDeliveryMap(wh.lat, wh.lng), [wh.lat, wh.lng]);

  const post = useCallback((msg: any) => {
    const str = JSON.stringify(msg);
    if (webRef.current) { try { webRef.current.postMessage(str); } catch {} }
    setMapMsg(str);
  }, []);

  // Joriy lokatsiya
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || !active) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!active) return;
        setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
          p => { if (active) setMyLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); }
        );
        if (active) watchRef.current = sub;
      } catch {}
    })();
    return () => { active = false; try { watchRef.current?.remove?.(); } catch {} watchRef.current = null; };
  }, []);

  // Barcha yuk xatlari (jadval + statistika) — web bilan bir xil
  const load = useCallback(async () => {
    try {
      const [wb, cl, emp, settings] = await Promise.all([
        apiFetch("/waybills"),
        apiFetch("/clients").catch(() => []),
        apiFetch("/employees").catch(() => []),
        apiFetch("/settings").catch(() => null),
      ]);
      const clientArr = Array.isArray(cl) ? cl : [];
      const cMap: Record<string, any> = Object.fromEntries(clientArr.map((c: any) => [(c.name || "").toLowerCase(), c]));
      const list = (Array.isArray(wb) ? wb : []);
      setDeliveries(list.map((w: any) => {
        const client = cMap[(w.receiverCompany || "").toLowerCase()];
        return {
          id: w.id,
          orderCode: `YX-${w.docNumber}`,
          clientName: w.receiverCompany || "",
          clientPhone: w.receiverPhone || client?.phone || "",
          deliveryAddress: w.deliveryAddress || client?.address || "",
          driverId: w.driverId,
          deliveryStatus: w.deliveryStatus || "pending",
          date: w.date,
          senderCompany: w.senderCompany,
          totalSum: w.totalSum || 0,
          vehicle: w.vehicle || "",
          deliveredAt: w.deliveredAt || null,
          deliveryFee: Number(w.deliveryFee) || 0,
        };
      }));
      setEmployees(Array.isArray(emp) ? emp : []);
      if (settings?.lat) setWh({ lat: settings.lat, lng: settings.lng });
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const drivers = useMemo(() => {
    return employees.filter((e: any) => {
      const r = ((e.position || "") + " " + (e.role || "")).toLowerCase();
      return r.includes("haydovchi") || r.includes("dastavkachi") || r.includes("driver");
    });
  }, [employees]);

  // Haydovchi kirsa — o'z buyurtmalari va o'z daromadi ko'rinadi
  useEffect(() => {
    (async () => {
      try {
        if (!(await isDriver())) return;
        const p = await apiFetch("/auth/profile").catch(() => null);
        if (p?.employeeId) setDriverFilter(p.employeeId);
      } catch {}
    })();
  }, []);

  // Haydovchilar harakati (xarita uchun)
  const todayOrders = useMemo(() => deliveries.filter(o => o.date === todayStr), [deliveries, todayStr]);

  useEffect(() => {
    if (drivers.length === 0) return;
    const iv = setInterval(() => {
      setDriverLocs(prev => {
        const next = { ...prev };
        for (const d of drivers) {
          const cur = next[d.id] || { lat: wh.lat + (Math.random() - 0.5) * 0.06, lng: wh.lng + (Math.random() - 0.5) * 0.06 };
          let target: { lat: number; lng: number } | null = null;
          let minD = Infinity;
          for (const o of todayOrders) {
            const p = parseAddr(o.deliveryAddress);
            if (!p) continue;
            const dist = hav([cur.lat, cur.lng], [p.lat, p.lng]);
            if (dist < minD) { minD = dist; target = p; }
          }
          if (target && minD > 0.1) {
            const dx = target.lat - cur.lat, dy = target.lng - cur.lng;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            next[d.id] = { lat: cur.lat + (dx / dist) * 0.003, lng: cur.lng + (dy / dist) * 0.003 };
          } else if (target) {
            next[d.id] = { lat: target.lat + (Math.random() - 0.5) * 0.001, lng: target.lng + (Math.random() - 0.5) * 0.001 };
          } else {
            next[d.id] = { lat: cur.lat + (Math.random() - 0.5) * 0.002, lng: cur.lng + (Math.random() - 0.5) * 0.002 };
          }
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(iv);
  }, [drivers, todayOrders, wh]);

  // Xarita uchun: bugungi yetkazishlar + eng yaqin haydovchi nuqtasi
  const mData = useMemo(() => {
    return todayOrders.map(o => {
      const p = parseAddr(o.deliveryAddress);
      if (!p) return null;
      let from: [number, number] = [wh.lat, wh.lng];
      let minD = Infinity;
      for (const d of drivers) {
        const loc = driverLocs[d.id];
        if (!loc) continue;
        const dist = hav([loc.lat, loc.lng], [p.lat, p.lng]);
        if (dist < minD) { minD = dist; from = [loc.lat, loc.lng]; }
      }
      return {
        id: o.id, lat: p.lat, lng: p.lng, from,
        clientName: o.clientName, clientPhone: o.clientPhone,
        totalSum: o.totalSum, status: o.deliveryStatus, orderCode: o.orderCode,
      };
    }).filter(Boolean);
  }, [todayOrders, driverLocs, drivers, wh]);

  const driverData = useMemo(() => {
    return drivers.map(d => {
      const loc = driverLocs[d.id];
      return loc ? { id: d.id, name: d.name, phone: d.phone, lat: loc.lat, lng: loc.lng } : null;
    }).filter(Boolean);
  }, [drivers, driverLocs]);

  useEffect(() => { post({ type: "update", data: mData }); }, [mData, post]);
  useEffect(() => { post({ type: "drivers", data: driverData }); }, [driverData, post]);
  useEffect(() => {
    if (!myLoc) return;
    post({ type: "myLoc", lat: myLoc.lat, lng: myLoc.lng });
    if (!flewRef.current) { flewRef.current = true; post({ type: "flyTo", lat: myLoc.lat, lng: myLoc.lng }); }
  }, [myLoc, post]);

  const onLoad = () => {
    setTimeout(() => {
      post({ type: "update", data: mData });
      post({ type: "drivers", data: driverData });
      if (myLoc) post({ type: "myLoc", lat: myLoc.lat, lng: myLoc.lng });
    }, 800);
  };

  // ==== Statistika (web bilan bir xil) ====
  // Har bir yetkazilgan buyurtmadan haydovchi oladigan yetkazish haqi
  // deliveryFee sifatida saqlanadi; income = yetkazilganlardan jami daromad.
  const countDelivered = (list: any[]) => {
    const dl = list.filter(o => o.deliveryStatus === "delivered");
    return {
      total: dl.length,
      today: dl.filter(o => deliveredDate(o) === todayStr).length,
      month: dl.filter(o => deliveredDate(o).slice(0, 7) === monthStr).length,
      income: dl.reduce((s, o) => s + (Number(o.deliveryFee) || 0), 0),
    };
  };

  const filteredOrders = useMemo(() => {
    if (driverFilter === "all") return deliveries;
    if (driverFilter === "none") return deliveries.filter(o => !o.driverId);
    return deliveries.filter(o => o.driverId === driverFilter);
  }, [deliveries, driverFilter]);

  const statBox = countDelivered(filteredOrders);

  const filterChips: { key: FilterKey; label: string; today: number; month: number; income: number }[] = useMemo(() => {
    const chips: { key: FilterKey; label: string; today: number; month: number; income: number }[] = [
      { key: "all", label: "Barchasi", ...countDelivered(deliveries) },
    ];
    for (const d of drivers) {
      chips.push({ key: d.id, label: d.name || `Haydovchi #${d.id}`, ...countDelivered(deliveries.filter(o => o.driverId === d.id)) });
    }
    if (deliveries.some(o => !o.driverId)) {
      chips.push({ key: "none", label: "Haydovchisiz", ...countDelivered(deliveries.filter(o => !o.driverId)) });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries, drivers, todayStr, monthStr]);

  const tableRows = useMemo(() => {
    return [...filteredOrders].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || "")) || b.id - a.id
    );
  }, [filteredOrders]);

  // Pagination
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [driverFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const pagedRows = tableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const driverName = (o: any) => drivers.find((d: any) => d.id === o.driverId)?.name || "—";
  const driverPhone = (o: any) => drivers.find((d: any) => d.id === o.driverId)?.phone || "";

  // PATCH /waybills/:id/delivery (web bilan bir xil)
  const updSt = async (id: number, status: string) => {
    try {
      await apiFetch(`/waybills/${id}/delivery`, { method: "PATCH", body: JSON.stringify({ deliveryStatus: status }) });
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
  };

  const assignDriver = async (id: number, driverId: number | null) => {
    try {
      await apiFetch(`/waybills/${id}/delivery`, { method: "PATCH", body: JSON.stringify({ driverId }) });
      await load();
    } catch (e: any) { Alert.alert("Xatolik", e.message); }
  };

  // Yetkazish haqini qo'lda kiritib saqlash (masalan 200000)
  const saveFee = async (id: number) => {
    const raw = (feeDraft[id] ?? "").replace(/[^\d]/g, "");
    const fee = Number(raw);
    if (!raw || !Number.isFinite(fee) || fee < 0) {
      Alert.alert("Xatolik", "Yetkazish haqini to'g'ri kiriting (faqat raqamlar)");
      return;
    }
    try {
      setFeeSavingId(id);
      await apiFetch(`/waybills/${id}/delivery`, { method: "PATCH", body: JSON.stringify({ deliveryFee: fee }) });
      await load();
    } catch (e: any) {
      Alert.alert("Xatolik", e.message);
    } finally {
      setFeeSavingId(null);
    }
  };

  const toggleRow = (o: any) => {
    const isSame = expandedId === o.id;
    setExpandedId(isSame ? null : o.id);
    if (!isSame) {
      setFeeDraft(prev => (prev[o.id] !== undefined ? prev : { ...prev, [o.id]: String(Number(o.deliveryFee) || 0) }));
      const p = parseAddr(o.deliveryAddress);
      if (p) post({ type: "focus", id: o.id });
      else post({ type: "clearInfo" });
    } else {
      post({ type: "clearInfo" });
    }
  };

  return (
    <View style={s.box}>
      {/* Kichik xarita (web'dagidek kichik o'lcham) */}
      <View style={s.mapWrap}>
        {Platform.OS !== "web" && WebView ? (
          <WebView ref={webRef} source={{ html: mapHtml }} style={s.map} onLoad={onLoad} javaScriptEnabled domStorageEnabled originWhitelist={["*"]} allowFileAccess allowUniversalAccessFromFileURLs allowFileAccessFromFileURLs mixedContentMode="always" cacheEnabled={false} />
        ) : (
          <WebMapContainer html={mapHtml} msg={mapMsg} />
        )}
      </View>

      {/* Keng card — statistika + filtr + buyurtmalar jadvali */}
      <View style={s.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
        >
          <Text style={s.cardTitle}>Yetkazish buyurtmalari</Text>

          {/* Statistika */}
          <View style={s.statRow}>
            <View style={[s.statBox, { backgroundColor: "#fff7ed" }]}>
              <Text style={s.statLabel}>Jami yetkazilgan</Text>
              <Text style={[s.statValue, { color: colors.primary }]}>{statBox.total}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Bugun</Text>
              <Text style={s.statValue}>{statBox.today}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Oy davomida</Text>
              <Text style={s.statValue}>{statBox.month}</Text>
            </View>
          </View>

          {/* Jami daromad — yetkazilgan buyurtmalardan haydovchi haqi yig'indisi */}
          <View style={s.incomeRow}>
            <View style={s.incomeLabelWrap}>
              <Text style={s.incomeIcon}>💰</Text>
              <View>
                <Text style={s.incomeLabel}>Jami daromad</Text>
                <Text style={s.incomeSub}>yetkazilgan {statBox.total} ta buyurtma bo'yicha</Text>
              </View>
            </View>
            <Text style={s.incomeValue}>{formatSum(statBox.income)}</Text>
          </View>

          {/* Haydovchi filtri (kun/oy bilan) */}
          <View style={s.filterRow}>
            <Text style={s.filterLabel}>Haydovchi:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: "row" }}>
              {filterChips.map(chip => (
                <TouchableOpacity
                  key={String(chip.key)}
                  style={[s.chip, driverFilter === chip.key && s.chipOn]}
                  onPress={() => setDriverFilter(chip.key)}
                >
                  <Text style={[s.chipT, driverFilter === chip.key && { color: "#fff" }]}>
                    {chip.label} · bugun {chip.today} / oy {chip.month} · 💰 {formatSum(chip.income)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Jadval sarlavhasi (web jadval bilan bir xil ustunlar) */}
          <View style={s.thead}>
            <Text style={[s.th, { flex: 1.15 }]}>№ / Mijoz</Text>
            <Text style={[s.th, { flex: 1.55 }]}>Haydovchi / Sana</Text>
            <Text style={[s.th, { flex: 1.2, textAlign: "right" }]}>Holat / Summa</Text>
          </View>

          {/* Jadval qatorlari */}
          {tableRows.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 32, opacity: 0.3 }}>🚚</Text>
              <Text style={s.empty}>Ma'lumot yo'q</Text>
            </View>
          ) : pagedRows.map(o => {
            const col = stC[o.deliveryStatus] || stC.pending;
            const isExpanded = expandedId === o.id;
            return (
              <TouchableOpacity key={o.id} style={[s.row, isExpanded && s.rowOpen]} onPress={() => toggleRow(o)} activeOpacity={0.7}>
                <View style={s.rowMain}>
                  <View style={{ flex: 1.15 }}>
                    <TouchableOpacity
                      onPress={e => { e.stopPropagation?.(); navigation.navigate("Waybills", { viewId: o.id }); }}
                      accessibilityRole="button"
                    >
                      <Text style={s.rCodeLink}>#{o.orderCode || o.id}</Text>
                    </TouchableOpacity>
                    <Text style={s.rClient} numberOfLines={1}>{o.clientName || "—"}</Text>
                  </View>
                  <View style={{ flex: 1.55 }}>
                    <Text style={s.rDriver} numberOfLines={1}>{driverName(o) !== "—" ? `🚛 ${driverName(o)}` : "—"}</Text>
                    <Text style={s.rTime} numberOfLines={1}>
                      🕐 {o.deliveryStatus === "delivered" && o.deliveredAt ? fmtDT(o.deliveredAt) : (o.date || "—")}
                    </Text>
                  </View>
                  <View style={{ flex: 1.2, alignItems: "flex-end", gap: 4 }}>
                    <View style={[s.badge, { backgroundColor: col.bg }]}>
                      <Text style={[s.badgeT, { color: col.text }]}>
                        {steps.find(st => st.key === o.deliveryStatus)?.label || o.deliveryStatus}
                      </Text>
                    </View>
                    <Text style={s.rSum}>{formatSum(Number(o.totalSum) || 0)}</Text>
                    {Number(o.deliveryFee) > 0 && (
                      <Text style={s.rFee}>🛵 {formatSum(Number(o.deliveryFee) || 0)}</Text>
                    )}
                  </View>
                </View>

                {/* Ichki boshqaruv (qator ochilganda) */}
                {isExpanded && (
                  <View style={s.rowActions}>
                    <View style={s.actRow}>
                      {o.deliveryStatus === "delivered" ? (
                        <View style={[s.stBtn, { backgroundColor: "#dcfce7", borderColor: "#16a34a" }]}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: "#16a34a" }}>✅ Yetkazilgan</Text>
                        </View>
                      ) : steps.map(st => (
                        <TouchableOpacity key={st.key} style={[s.stBtn, o.deliveryStatus === st.key && s.stBtnOn]} onPress={() => updSt(o.id, st.key)}>
                          <Text style={[s.stBtnT, o.deliveryStatus === st.key && { color: "#fff" }]}>{st.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: "row" }}>
                      <TouchableOpacity style={[s.dChip, !o.driverId && s.dChipOn]} onPress={() => assignDriver(o.id, null)}>
                        <Text style={[s.dChipT, !o.driverId && { color: "#fff" }]}>Haydovchi tanlash...</Text>
                      </TouchableOpacity>
                      {drivers.map((d: any) => (
                        <TouchableOpacity key={d.id} style={[s.dChip, o.driverId === d.id && s.dChipOn]} onPress={() => assignDriver(o.id, d.id)}>
                          <Text style={[s.dChipT, o.driverId === d.id && { color: "#fff" }]}>🚛 {d.name || `Haydovchi #${d.id}`}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {driverPhone(o) ? <Text style={s.rSub}>📞 {driverPhone(o)}</Text> : null}
                    {/* Yetkazish haqini qo'lda kiritish */}
                    <View style={s.feeRow}>
                      <Text style={s.feeLabel}>🛵 Yetkazish haqi</Text>
                      <View style={s.feeInputWrap}>
                        <TextInput
                          style={s.feeInput}
                          value={feeDraft[o.id] ?? ""}
                          onChangeText={v => setFeeDraft(prev => ({ ...prev, [o.id]: v.replace(/[^\d]/g, "") }))}
                          keyboardType="numeric"
                          placeholder="200000"
                          placeholderTextColor={colors.textMuted}
                        />
                        <Text style={s.feeCur}>so'm</Text>
                      </View>
                      <TouchableOpacity
                        style={[s.feeBtn, feeSavingId === o.id && { opacity: 0.6 }]}
                        disabled={feeSavingId === o.id}
                        onPress={() => saveFee(o.id)}
                      >
                        <Text style={s.feeBtnT}>{feeSavingId === o.id ? "..." : "Saqlash"}</Text>
                      </TouchableOpacity>
                    </View>
                    {Number(o.deliveryFee) > 0 && (
                      <Text style={s.feeSaved}>✅ Saqlangan: {formatSum(Number(o.deliveryFee) || 0)}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Pagination */}
          {tableRows.length > 0 && (
            <View style={s.pager}>
              <TouchableOpacity
                style={[s.pageBtn, page <= 1 && s.pageBtnOff]}
                disabled={page <= 1}
                onPress={() => setPage(p => Math.max(1, p - 1))}
              >
                <Text style={s.pageBtnT}>‹</Text>
              </TouchableOpacity>
              <Text style={s.pageInfo}>{tableRows.length} ta · {page}/{totalPages}</Text>
              <TouchableOpacity
                style={[s.pageBtn, page >= totalPages && s.pageBtnOff]}
                disabled={page >= totalPages}
                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <Text style={s.pageBtnT}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.background },
  mapWrap: {
    height: MAP_H, margin: spacing.md, marginBottom: 0, borderRadius: radius.xl,
    overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: "#e8e8e8",
  },
  map: { flex: 1 },
  card: {
    flex: 1, margin: spacing.md, marginTop: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, ...shadows.md,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  statRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  statBox: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: "center",
  },
  statLabel: { fontSize: 9, fontWeight: "700", color: colors.textMuted, textAlign: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 2 },
  incomeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#f0fdf4", borderRadius: radius.lg, borderWidth: 1.5, borderColor: "#16a34a",
    padding: 10, marginBottom: spacing.sm,
  },
  incomeLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  incomeIcon: { fontSize: 22 },
  incomeLabel: { fontSize: 12, fontWeight: "800", color: "#16a34a" },
  incomeSub: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  incomeValue: { fontSize: 16, fontWeight: "800", color: "#16a34a" },
  rFee: { fontSize: 10, fontWeight: "700", color: "#16a34a", marginTop: 1 },
  feeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  feeLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  feeInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8,
  },
  feeInput: { flex: 1, paddingVertical: 7, fontSize: 13, fontWeight: "700", color: colors.text },
  feeCur: { fontSize: 10, fontWeight: "700", color: colors.textMuted, marginLeft: 4 },
  feeBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primary, alignItems: "center",
  },
  feeBtnT: { fontSize: 11, fontWeight: "800", color: "#fff" },
  feeSaved: { fontSize: 10, fontWeight: "700", color: "#16a34a" },
  filterRow: { marginBottom: spacing.sm, gap: 6 },
  filterLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipT: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
  thead: {
    flexDirection: "row", gap: 8, paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: colors.surfaceAlt, borderRadius: 8, marginBottom: 6,
  },
  th: { fontSize: 9, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase" },
  row: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 10,
    marginBottom: 6, borderWidth: 1.5, borderColor: colors.border,
  },
  rowOpen: { borderColor: colors.primary, backgroundColor: "#fff7ed" },
  rowMain: { flexDirection: "row", gap: 8 },
  rCode: { fontSize: 10, fontFamily: "monospace", color: colors.textMuted },
  rCodeLink: { fontSize: 11, fontFamily: "monospace", color: colors.primary, fontWeight: "700", textDecorationLine: "underline", textDecorationStyle: "dotted" },
  pager: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  pageBtn: {
    width: 32, height: 30, borderRadius: 8, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center",
  },
  pageBtnOff: { opacity: 0.35 },
  pageBtnT: { fontSize: 18, fontWeight: "800", color: colors.text, lineHeight: 20 },
  pageInfo: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  rClient: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 1 },
  rSub: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  rDriver: { fontSize: 12, fontWeight: "700", color: "#2563eb", marginTop: 1 },
  rTime: { fontSize: 10, color: colors.textMuted },
  rSum: { fontSize: 12, fontWeight: "800", color: colors.text },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeT: { fontSize: 9, fontWeight: "700" },
  rowActions: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 6 },
  actRow: { flexDirection: "row", gap: 4 },
  stBtn: { flex: 1, paddingVertical: 7, borderRadius: 6, backgroundColor: "#fff", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  stBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  stBtnT: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
  dChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  dChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dChipT: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
  emptyBox: { alignItems: "center", padding: 30 },
  empty: { textAlign: "center", padding: 12, color: colors.textMuted, fontSize: 13 },
});
