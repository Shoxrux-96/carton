import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, Dimensions, Animated } from "react-native";
import { WebView } from "react-native-webview";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { buildDeliveryMap } from "../lib/mapHtml";

const { height } = Dimensions.get("window");
const steps = [
  { key: "pending", label: "Kutilmoqda", emoji: "⏳" },
  { key: "shipped", label: "Yuborilgan", emoji: "📤" },
  { key: "in_transit", label: "Yo'lda", emoji: "🚚" },
  { key: "delivered", label: "Yetkazilgan", emoji: "✅" },
];
const stC: Record<string, { bg: string; text: string }> = { pending: { bg: "#f3f4f6", text: "#6b7280" }, shipped: { bg: "#dbeafe", text: "#2563eb" }, in_transit: { bg: "#fef3c7", text: "#d97706" }, delivered: { bg: "#dcfce7", text: "#16a34a" } };

export default function DeliveryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [wh, setWh] = useState({ lat: 41.311081, lng: 69.240562 });
  const [selId, setSelId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const webRef = useRef<any>(null);
  const pH = useRef(new Animated.Value(0)).current;

  const load = async () => {
    try {
      const [data, settings] = await Promise.all([apiFetch("/orders"), apiFetch("/settings").catch(() => null)]);
      setOrders((Array.isArray(data) ? data : []).filter((o: any) => o.deliveryStatus && o.deliveryStatus !== "pending"));
      if (settings?.lat) setWh({ lat: settings.lat, lng: settings.lng });
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  useEffect(() => { const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  const mData = orders.map(o => { const a = (o.deliveryAddress || "").split(",").map(Number); const ok = a.length === 2 && !isNaN(a[0]) && !isNaN(a[1]); return { id: o.id, lat: ok ? a[0] : null, lng: ok ? a[1] : null, clientName: o.clientName || "?", clientPhone: o.clientPhone || "", productName: o.productName || "", quantity: o.quantity || 0, totalSum: o.totalSum || 0, status: o.deliveryStatus || "shipped", orderCode: o.orderCode || o.id }; }).filter(m => m.lat && m.lng);

  useEffect(() => { if (webRef.current && mData.length > 0) webRef.current.postMessage(JSON.stringify({ type: "update", data: mData })); }, [orders]);
  const onLoad = () => { setTimeout(() => { if (webRef.current && mData.length > 0) webRef.current.postMessage(JSON.stringify({ type: "update", data: mData })); }, 800); };

  const toggle = () => { Animated.spring(pH, { toValue: panelOpen ? 0 : 1, useNativeDriver: false, friction: 8 }).start(); setPanelOpen(!panelOpen); };
  const select = (id: number) => { setSelId(id === selId ? null : id); if (webRef.current) webRef.current.postMessage(JSON.stringify({ type: "focus", id })); };
  const updSt = async (id: number, s: string) => {
    const order = orders.find(o => o.id === id);
    if (order?.deliveryStatus === "delivered") { Alert.alert("", "Yetkazilgan buyurtmani o'zgartirib bo'lmaydi"); return; }
    try { await apiFetch("/orders/" + id, { method: "PUT", body: JSON.stringify({ deliveryStatus: s }) }); await load(); } catch (e: any) { Alert.alert("Xatolik", e.message); }
  };
  const hav = (a: number[], b: number[]) => { const R = 6371, dL = (b[0] - a[0]) * Math.PI / 180, dG = (b[1] - a[1]) * Math.PI / 180, x = Math.sin(dL / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dG / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };

  const sc = orders.filter(o => o.deliveryStatus === "shipped").length;
  const tc = orders.filter(o => o.deliveryStatus === "in_transit").length;
  const dc = orders.filter(o => o.deliveryStatus === "delivered").length;

  return (
    <View style={s.box}>
      <WebView ref={webRef} source={{ html: buildDeliveryMap(wh.lat, wh.lng) }} style={s.map} onLoad={onLoad} javaScriptEnabled domStorageEnabled originWhitelist={["*"]} />
      <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}><Text style={s.backT}>←</Text></TouchableOpacity>
      <View style={s.pills}>
        <View style={[s.pill, { backgroundColor: "#dbeafe" }]}><Text style={[s.pillT, { color: "#2563eb" }]}>📤 {sc}</Text></View>
        <View style={[s.pill, { backgroundColor: "#fef3c7" }]}><Text style={[s.pillT, { color: "#d97706" }]}>🚚 {tc}</Text></View>
        <View style={[s.pill, { backgroundColor: "#dcfce7" }]}><Text style={[s.pillT, { color: "#16a34a" }]}>✅ {dc}</Text></View>
      </View>
      <TouchableOpacity style={s.tog} onPress={toggle} activeOpacity={0.8}>
        <View style={s.handle} /><Text style={s.togT}>📋 Yetkazishlar ({orders.length})</Text>
      </TouchableOpacity>
      <Animated.View style={[s.panel, { height: pH.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.45] }) }]}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
          {orders.length === 0 ? <Text style={s.empty}>Faol yetkazishlar yo'q</Text> : orders.map(o => {
            const a = (o.deliveryAddress || "").split(",").map(Number); const ok = a.length === 2 && !isNaN(a[0]);
            const km = ok ? hav([wh.lat, wh.lng], a).toFixed(1) : "?";
            const ci = steps.findIndex(st => st.key === o.deliveryStatus); const col = stC[o.deliveryStatus] || stC.pending;
            const sel = selId === o.id;
            return (
              <TouchableOpacity key={o.id} style={[s.card, sel && s.cardS]} onPress={() => select(o.id)} activeOpacity={0.7}>
                <View style={s.cTop}><View style={{ flex: 1 }}><Text style={s.code}>#{o.orderCode || o.id}</Text><Text style={s.cli}>{o.clientName}</Text></View><View style={[s.badge, { backgroundColor: col.bg }]}><Text style={[s.badgeT, { color: col.text }]}>{steps[ci]?.emoji} {steps[ci]?.label}</Text></View></View>
                <View style={s.info}><Text style={s.infoT}>📦 {o.productName} × {o.quantity}</Text><Text style={s.infoT}>📏 {km} km</Text></View>
                {o.clientPhone && <Text style={s.ph}>📞 {o.clientPhone}</Text>}
                <View style={s.prog}>{steps.map((st, i) => <View key={st.key} style={s.pI}><View style={[s.dot, i <= ci && s.dotOn]} />{i < 3 && <View style={[s.ln, i < ci && s.lnOn]} />}</View>)}</View>
                {sel && <View style={s.acts}>{steps.map(st => <TouchableOpacity key={st.key} style={[s.actB, o.deliveryStatus === st.key && s.actOn]} onPress={() => updSt(o.id, st.key)}><Text style={[s.actT, o.deliveryStatus === st.key && { color: "#fff" }]}>{st.emoji}</Text></TouchableOpacity>)}</View>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, backgroundColor: "#000" }, map: { flex: 1 },
  back: { position: "absolute", top: 12, left: 12, width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", ...shadows.md, zIndex: 10 }, backT: { fontSize: 20, fontWeight: "700" },
  pills: { position: "absolute", top: 12, left: 58, flexDirection: "row", gap: 5, zIndex: 10 }, pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14, ...shadows.sm }, pillT: { fontSize: 11, fontWeight: "700" },
  tog: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingBottom: 8, alignItems: "center", ...shadows.lg }, handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 6 }, togT: { fontSize: 14, fontWeight: "700", color: colors.text },
  panel: { position: "absolute", bottom: 48, left: 0, right: 0, backgroundColor: "#fff", overflow: "hidden", paddingHorizontal: 12 },
  empty: { textAlign: "center", padding: 20, color: colors.textMuted },
  card: { backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: colors.border }, cardS: { borderColor: colors.primary, backgroundColor: "#fff7ed" },
  cTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, code: { fontSize: 10, color: colors.textMuted, fontFamily: "monospace" }, cli: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }, badgeT: { fontSize: 10, fontWeight: "700" },
  info: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 }, infoT: { fontSize: 11, color: colors.textSecondary }, ph: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  prog: { flexDirection: "row", alignItems: "center", marginTop: 8 }, pI: { flex: 1, flexDirection: "row", alignItems: "center" }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#e2e8f0" }, dotOn: { backgroundColor: colors.primary }, ln: { flex: 1, height: 2, backgroundColor: "#e2e8f0", marginHorizontal: 1 }, lnOn: { backgroundColor: colors.primary },
  acts: { flexDirection: "row", gap: 5, marginTop: 8 }, actB: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", borderWidth: 1, borderColor: colors.border }, actOn: { backgroundColor: colors.primary, borderColor: colors.primary }, actT: { fontSize: 13 },
});
