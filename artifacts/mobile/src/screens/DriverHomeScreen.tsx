import React from "react";
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Dimensions, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { syncUserProfile } from "../lib/employee-profile";
import { useI18n } from "../i18n";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const { width } = Dimensions.get("window");

interface Props {
  navigation: any;
  onLogout: () => void;
}

const money = (n: number) => n.toLocaleString("uz-UZ");
const pad = (n: number) => String(n).padStart(2, "0");

function StatCard({ icon, value, label, sub, color, bg, money: isMoney, wide }: {
  icon: string; value: number | string; label: string; sub?: string;
  color: string; bg: string; money?: boolean; wide?: boolean;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, flex: wide ? 1 : 1 }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>
        {typeof value === "number" ? (isMoney ? money(value) : String(value)) : value}
      </Text>
      <Text style={styles.statUnit}>{isMoney ? "so'm" : "buyurtma"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function DriverHome({ navigation }: Props) {
  const { t } = useI18n();
  const [user, setUser] = React.useState<any>(null);
  const [waybills, setWaybills] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const profile = await syncUserProfile();
      if (profile) setUser(profile);
      const list: any[] = await apiFetch("/waybills").catch(() => []);
      const employeeId = profile?.employeeId;
      const mine = (Array.isArray(list) ? list : []).filter(
        (w: any) =>
          w.driverId === employeeId &&
          (w.deliveryStatus === "delivered" || w.deliveredAt)
      );
      setWaybills(mine);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
      const iv = setInterval(load, 30000);
      return () => clearInterval(iv);
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Buyurtmalarni kun / oy / yil bo'yicha guruhlash (deliveredAt bo'yicha)
  const stats = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayStr = `${y}-${pad(m + 1)}-${pad(now.getDate())}`;
    const monthStr = `${y}-${pad(m + 1)}`;
    const yearStr = `${y}`;

    const bucket = (filter: (d: Date) => boolean) => {
      const rows = waybills.filter((w: any) => {
        if (!w.deliveredAt) return false;
        const d = new Date(w.deliveredAt);
        if (Number.isNaN(d.getTime())) return false;
        return filter(d);
      });
      return {
        count: rows.length,
        income: rows.reduce((s: number, w: any) => s + (Number(w.deliveryFee) || 0), 0),
      };
    };

    return {
      day: bucket(d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === todayStr),
      month: bucket(d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}` === monthStr),
      year: bucket(d => String(d.getFullYear()) === yearStr),
      all: {
        count: waybills.length,
        income: waybills.reduce((s: number, w: any) => s + (Number(w.deliveryFee) || 0), 0),
      },
    };
  }, [waybills]);

  // Oxirgi 6 oy: oylik daromad va buyurtmalar soni (chiziqli diagramma)
  const monthly = React.useMemo(() => {
    const now = new Date();
    const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
    const labels: string[] = [];
    const incomes: number[] = [];
    const counts: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      labels.push(monthNames[d.getMonth()]);
      const rows = waybills.filter((w: any) => {
        if (!w.deliveredAt) return false;
        const dt = new Date(w.deliveredAt);
        if (Number.isNaN(dt.getTime())) return false;
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}` === key;
      });
      counts.push(rows.length);
      incomes.push(rows.reduce((s: number, w: any) => s + (Number(w.deliveryFee) || 0), 0));
    }
    return { labels, incomes, counts };
  }, [waybills]);

  const dash = loading ? "—" : "0";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerBg}>
        <View style={styles.profileRow}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{user?.name?.charAt(0) || "H"}</Text>
          </View>
          <View style={styles.profileTexts}>
            <Text style={styles.fullName}>{user?.name || user?.phone || "Haydovchi"}</Text>
            <Text style={styles.companyName}>{t("companyName")}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleEmoji}>🚗</Text>
              <Text style={styles.roleBadgeText}>Haydovchi</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Yetkazilgan buyurtmalar — kun / oy / yil */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Yetkazilgan buyurtmalar</Text>
        <View style={styles.statRow}>
          <StatCard icon="📅" value={loading ? dash : stats.day.count} label="Bugun" color="#2563eb" bg="#dbeafe" />
          <StatCard icon="📆" value={loading ? dash : stats.month.count} label="Shu oy" color="#7c3aed" bg="#f5f3ff" />
          <StatCard icon="🗕" value={loading ? dash : stats.year.count} label="Shu yil" color="#0891b2" bg="#ecfeff" />
        </View>
        <Text style={styles.sectionNote}>Aniq soni — faqat sizga biriktirilgan yetkazilgan buyurtmalar</Text>
      </View>

      {/* Daromad — kunlik / oylik / yillik (YTD) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Daromad (yetkazish haqi)</Text>
        <View style={styles.statRow}>
          <StatCard icon="💵" value={loading ? dash : stats.day.income} label="Kunlik" color="#16a34a" bg="#f0fdf4" money />
          <StatCard icon="💳" value={loading ? dash : stats.month.income} label="Oylik" color="#0f766e" bg="#f0fdfa" money />
          <StatCard icon="🏦" value={loading ? dash : stats.year.income} label="Yillik" color="#c2410c" bg="#fff7ed" money />
        </View>
        <View style={styles.ytdBox}>
          <Text style={styles.ytdLabel}>🗓️ Yil boshidan bugungacha (01.01 → {pad(new Date().getDate())}.{pad(new Date().getMonth() + 1)}.{new Date().getFullYear()})</Text>
          <Text style={styles.ytdValue}>{loading ? dash : `${money(stats.year.income)} so'm`}</Text>
        </View>
        <View style={styles.ytdBox}>
          <Text style={styles.ytdLabel}>🧾 Jami yetkazilgan (barcha vaqt)</Text>
          <Text style={styles.ytdValueSub}>{loading ? dash : `${stats.all.count} buyurtma · ${money(stats.all.income)} so'm`}</Text>
        </View>
      </View>

      {/* Oylik dinamika — vaqt bo'yicha daromad va buyurtmalar (line chart) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Oylik dinamika</Text>
        <Text style={styles.sectionNote}>Vaqt → daromad va buyurtmalar soni (oxirgi 6 oy)</Text>
        <View style={styles.chartBox}>
          {Platform.OS === "web" ? (
            <Line
              data={{
                labels: monthly.labels,
                datasets: [
                  {
                    label: "Daromad (so'm)",
                    data: monthly.incomes,
                    borderColor: "#16a34a",
                    backgroundColor: "rgba(22,163,74,0.12)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: "#16a34a",
                    yAxisID: "y",
                  },
                  {
                    label: "Buyurtmalar (dona)",
                    data: monthly.counts,
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37,99,235,0.10)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: "#2563eb",
                    yAxisID: "y1",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { labels: { font: { size: 10 }, boxWidth: 12 } },
                  tooltip: { titleFont: { size: 10 }, bodyFont: { size: 10 } },
                },
                scales: {
                  x: { ticks: { font: { size: 9 } } },
                  y: {
                    position: "left",
                    beginAtZero: true,
                    ticks: {
                      font: { size: 9 },
                      callback: v => {
                        const n = Number(v);
                        if (n >= 1_000_000) return `${n / 1_000_000} mln`;
                        if (n >= 1_000) return `${n / 1_000} ming`;
                        return String(n);
                      },
                    },
                  },
                  y1: {
                    position: "right",
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: { font: { size: 9 }, stepSize: 1 },
                  },
                },
              }}
            />
          ) : (
            <View style={styles.nativeBars}>
              {monthly.incomes.map((v, i) => {
                const max = Math.max(...monthly.incomes, 1);
                return (
                  <View key={i} style={styles.nativeBarCol}>
                    <Text style={styles.nativeBarTop}>{monthly.counts[i]}</Text>
                    <View style={[styles.nativeBar, { height: Math.max(4, (v / max) * 96) }]} />
                    <Text style={styles.nativeBarLabel}>{monthly.labels[i]}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  headerBg: {
    backgroundColor: "#f97316", paddingTop: 35, paddingBottom: 26,
    paddingHorizontal: spacing.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileTexts: { flex: 1 },
  avatarLarge: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center",
    alignItems: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarLargeText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  fullName: { fontSize: 18, fontWeight: "800", color: "#fff" },
  companyName: {
    fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 999, marginTop: 6,
  },
  roleEmoji: { fontSize: 11 },
  roleBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  section: { paddingHorizontal: spacing.lg, marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 10 },
  sectionNote: { fontSize: 10, color: colors.textMuted, marginTop: 8 },
  statRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 6,
    alignItems: "center", borderWidth: 1, borderColor: "#00000010", ...shadows.sm,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  statUnit: { fontSize: 8, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", marginTop: 1 },
  statLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginTop: 3 },
  statSub: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  ytdBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11,
    marginTop: 8, ...shadows.sm,
  },
  ytdLabel: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, flex: 1 },
  ytdValue: { fontSize: 14, fontWeight: "800", color: "#16a34a" },
  ytdValueSub: { fontSize: 12, fontWeight: "700", color: colors.text },
  chartBox: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: 10, marginTop: 8, height: 230,
    ...shadows.sm,
  },
  nativeBars: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    height: 200, paddingTop: 8,
  },
  nativeBarCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  nativeBarTop: { fontSize: 9, fontWeight: "700", color: "#2563eb", marginBottom: 3 },
  nativeBar: { width: "60%", backgroundColor: "#16a34a", borderRadius: 4 },
  nativeBarLabel: { fontSize: 9, color: colors.textMuted, marginTop: 5 },
});
