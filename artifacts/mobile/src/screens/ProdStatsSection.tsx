import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const fmt = (n: number) => Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const WD = ["Yak", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function ProdStatsSection() {
  const [summary, setSummary] = useState<any>(null);
  const [byProduct, setByProduct] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [sum, bp, tx] = await Promise.all([
        apiFetch("/production/summary").catch(() => null),
        apiFetch(`/production/by-product?period=month&date=${today}`).catch(() => []),
        apiFetch("/production/transactions").catch(() => []),
      ]);
      setSummary(sum);
      setByProduct(Array.isArray(bp) ? bp : []);
      setTransactions(Array.isArray(tx) ? tx : []);
    } catch {
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, []);

  // ===== 1) Umumiy ustunlar (Bugun / Oy / Yil / Jami) =====
  const bars = [
    { label: "Bugun", value: summary?.daily?.totalQuantity || 0, color: "#16a34a" },
    { label: "Shu oy", value: summary?.monthly?.totalQuantity || 0, color: colors.primary },
    { label: "Shu yil", value: summary?.yearly?.totalQuantity || 0, color: "#2563eb" },
    { label: "Jami", value: summary?.allTime?.totalQuantity || 0, color: "#8b5cf6" },
  ];
  const maxBar = Math.max(1, ...bars.map(b => b.value));

  // ===== 2) Top mahsulotlar (joriy oy) =====
  const topProducts = [...byProduct]
    .sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0))
    .slice(0, 5);
  const maxProd = Math.max(1, ...topProducts.map(p => p.totalQuantity || 0));

  // ===== 3) So'nggi 7 kun (kirim = ishlab chiqarish) =====
  const days7: { date: string; wd: string; qty: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days7.push({ date: iso(d), wd: WD[d.getDay()], qty: 0 });
  }
  for (const tx of transactions) {
    if (tx.type !== "kirim" || !tx.date) continue;
    const d = new Date(tx.date);
    const key = iso(d);
    const cell = days7.find(x => x.date === key);
    if (cell) cell.qty += Number(tx.quantity) || 0;
  }
  const maxDay = Math.max(1, ...days7.map(d => d.qty));
  const trendTotal = days7.reduce((s, d) => s + d.qty, 0);

  if (!loaded) {
    return (
      <View style={st.card}>
        <Text style={st.title}>📊 Ishlab chiqarish statistikasi</Text>
        <Text style={st.empty}>Yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={st.wrap}>
      <Text style={st.title}>📊 Ishlab chiqarish statistikasi</Text>

      {/* 1) Umumiy diagramma */}
          <View style={st.card}>
            <Text style={st.cardTitle}>Miqdor (ta)</Text>
            <View style={st.vChart}>
              {bars.map(b => (
                <View key={b.label} style={st.vCol}>
                  <Text style={[st.vVal, { color: b.color }]}>{fmt(b.value)}</Text>
                  <View style={st.vTrack}>
                    <View
                      style={[
                        st.vBar,
                        {
                          backgroundColor: b.color,
                          height: Math.max(6, Math.round((b.value / maxBar) * 110)),
                        },
                      ]}
                    />
                  </View>
                  <Text style={st.vLbl}>{b.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 2) Top mahsulotlar */}
          <View style={st.card}>
            <Text style={st.cardTitle}>🏆 Top mahsulotlar — shu oy</Text>
            {topProducts.length > 0 ? topProducts.map((p, i) => {
              const pct = maxProd > 0 ? Math.round(((p.totalQuantity || 0) / maxProd) * 100) : 0;
              return (
                <View key={p.productId ?? i} style={st.hRow}>
                  <Text style={st.hName} numberOfLines={1}>{p.productName || "—"}</Text>
                  <View style={st.hTrack}>
                    <View style={[st.hFill, { width: `${pct}%`, backgroundColor: i === 0 ? colors.primary : "#fdba74" }]} />
                  </View>
                  <Text style={st.hVal}>{fmt(p.totalQuantity || 0)} ta</Text>
                </View>
              );
            }) : <Text style={st.empty}>Shu oy ma'lumot yo'q</Text>}
          </View>

          {/* 3) So'nggi 7 kun */}
          <View style={st.card}>
            <Text style={st.cardTitle}>📈 So'nggi 7 kun <Text style={st.cardSub}>({fmt(trendTotal)} ta)</Text></Text>
            <View style={st.vChart}>
              {days7.map(d => (
                <View key={d.date} style={st.vCol}>
                  <Text style={st.vValSmall}>{d.qty > 0 ? fmt(d.qty) : ""}</Text>
                  <View style={st.vTrack}>
                    <View
                      style={[
                        st.vBar,
                        {
                          backgroundColor: d.qty > 0 ? colors.primary : colors.surfaceAlt,
                          height: Math.max(6, Math.round((d.qty / maxDay) * 90)),
                        },
                      ]}
                    />
                  </View>
                  <Text style={st.vLbl}>{d.wd}</Text>
                </View>
              ))}
            </View>
          </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  title: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardTitle: { fontSize: 13, fontWeight: "800", color: colors.textSecondary, marginBottom: spacing.md },
  cardSub: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  empty: { textAlign: "center", color: colors.textMuted, fontSize: 13, paddingVertical: spacing.md },

  // Vertical chart
  vChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  vCol: { flex: 1, alignItems: "center" },
  vVal: { fontSize: 11, fontWeight: "800", marginBottom: 4 },
  vValSmall: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, marginBottom: 4, height: 14 },
  vTrack: { width: "58%", height: 110, justifyContent: "flex-end", backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, overflow: "hidden" },
  vBar: { width: "100%", borderRadius: radius.sm },
  vLbl: { fontSize: 10, color: colors.textMuted, marginTop: 6, fontWeight: "600" },

  // Horizontal bars
  hRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  hName: { width: 96, fontSize: 12, fontWeight: "600", color: colors.text },
  hTrack: { flex: 1, height: 12, backgroundColor: colors.surfaceAlt, borderRadius: 6, overflow: "hidden" },
  hFill: { height: 12, borderRadius: 6 },
  hVal: { width: 54, fontSize: 11, fontWeight: "800", color: colors.textSecondary, textAlign: "right" },
});
