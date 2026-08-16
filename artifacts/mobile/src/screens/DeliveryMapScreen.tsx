import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors } from "../theme";
import { buildDeliveryMap } from "../lib/mapHtml";

export default function DeliveryMapScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wh, setWh] = useState({ lat: 41.311081, lng: 69.240562 });
  const webRef = useRef<any>(null);

  const load = async () => {
    try {
      const [data, settings] = await Promise.all([apiFetch("/orders"), apiFetch("/settings").catch(() => null)]);
      setOrders((Array.isArray(data) ? data : []).filter((o: any) => o.deliveryStatus && o.deliveryStatus !== "pending"));
      if (settings?.lat) setWh({ lat: settings.lat, lng: settings.lng });
    } catch {}
    setLoading(false);
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  useEffect(() => { const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  const mData = orders.map(o => { const a = (o.deliveryAddress || "").split(",").map(Number); const ok = a.length === 2 && !isNaN(a[0]) && !isNaN(a[1]); return { id: o.id, lat: ok ? a[0] : null, lng: ok ? a[1] : null, clientName: o.clientName || "?", clientPhone: o.clientPhone || "", productName: o.productName || "", quantity: o.quantity || 0, totalSum: o.totalSum || 0, status: o.deliveryStatus || "shipped", orderCode: o.orderCode || o.id }; }).filter(m => m.lat && m.lng);
  useEffect(() => { if (webRef.current && mData.length > 0) webRef.current.postMessage(JSON.stringify({ type: "update", data: mData })); }, [orders]);
  const onLoad = () => { setTimeout(() => { if (webRef.current && mData.length > 0) webRef.current.postMessage(JSON.stringify({ type: "update", data: mData })); }, 800); };

  if (loading) return <View style={s.c}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return (
    <View style={s.f}>
      <WebView ref={webRef} source={{ html: buildDeliveryMap(wh.lat, wh.lng) }} style={s.f} onLoad={onLoad} javaScriptEnabled domStorageEnabled originWhitelist={["*"]} />
      {orders.length === 0 && <View style={s.e}><Text style={{ fontSize: 40 }}>🚚</Text><Text style={s.et}>Faol yetkazishlar yo'q</Text></View>}
    </View>
  );
}
const s = StyleSheet.create({ f: { flex: 1 }, c: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }, e: { position: "absolute", top: "40%", left: 0, right: 0, alignItems: "center" }, et: { fontSize: 15, color: colors.textMuted, fontWeight: "600", marginTop: 8 } });
