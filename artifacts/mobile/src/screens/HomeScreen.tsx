import React from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Image, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { apiFetch, getUser, clearToken, getUserRole } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { faceImageKey, syncUserProfile } from "../lib/employee-profile";
import AppLogo from "../components/AppLogo";
import { useI18n } from "../i18n";

const { width } = Dimensions.get("window");

interface Props {
  navigation: any;
  onLogout: () => void;
}

const roleLabels: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  admin: { label: "Admin", color: "#fff", bg: colors.primary, emoji: "👑" },
  owner: { label: "Egasi", color: "#fff", bg: colors.primary, emoji: "👑" },
  manager: { label: "Boshqaruvchi", color: "#fff", bg: colors.warning, emoji: "👔" },
  driver: { label: "Haydovchi", color: "#fff", bg: colors.info, emoji: "🚗" },
  employee: { label: "Xodim", color: "#fff", bg: colors.success, emoji: "👷" },
};

const fmt = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + " mln";
  if (n >= 1000) return (n / 1000).toFixed(0) + " ming";
  return n.toLocaleString("uz-UZ");
};

function DualLineChart({ labels, data1, data2, color1, color2, label1, label2 }: {
  labels: string[]; data1: number[]; data2: number[];
  color1: string; color2: string; label1: string; label2: string;
}) {
  const chartW = width - 80;
  const chartH = 140;
  const allVals = [...data1, ...data2];
  const maxVal = Math.max(...allVals, 1);
  const range = maxVal || 1;
  const pad2 = (v: number) => {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
    if (v >= 1000) return (v / 1000).toFixed(0) + "K";
    return String(v);
  };
  const makePoints = (data: number[]) => data.map((v, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * chartW,
    y: chartH - 20 - (v / range) * (chartH - 40),
  }));
  const renderLine = (points: { x: number; y: number }[], color: string) =>
    points.map((pt, i) => {
      if (i === 0) return null;
      const prev = points[i - 1];
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return (
        <View key={`${color}-${i}`} style={{
          position: "absolute", left: prev.x, top: prev.y,
          width: length, height: 2, backgroundColor: color,
          borderRadius: 1, transformOrigin: "left center",
          transform: [{ rotate: `${angle}deg` }],
        }} />
      );
    });
  const renderDots = (data: number[], points: { x: number; y: number }[], color: string) =>
    points.map((pt, i) => (
      <View key={`d-${color}-${i}`} style={{
        position: "absolute", left: pt.x - 3, top: pt.y - 3,
        width: 6, height: 6, borderRadius: 3, backgroundColor: color,
        borderWidth: 1.5, borderColor: "#fff",
      }} />
    ));
  const p1 = makePoints(data1);
  const p2 = makePoints(data2);
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color1 }} />
          <Text style={{ fontSize: 9, color: colors.textMuted }}>{label1}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color2 }} />
          <Text style={{ fontSize: 9, color: colors.textMuted }}>{label2}</Text>
        </View>
      </View>
      <View style={{ height: chartH, position: "relative" }}>
        {[0, 0.5, 1].map((pct) => (
          <View key={pct} style={{
            position: "absolute", top: chartH - 20 - pct * (chartH - 40),
            left: 0, right: 0, height: 1, backgroundColor: "#f0f0f0",
          }} />
        ))}
        {renderLine(p1, color1)}
        {renderLine(p2, color2)}
        {renderDots(data1, p1, color1)}
        {renderDots(data2, p2, color2)}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 2 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ fontSize: 8, color: colors.textMuted, textAlign: "center" }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation, onLogout }: Props) {
  const { t } = useI18n();
  const [stats, setStats] = React.useState<any>(null);
  const [user, setUserState] = React.useState<any>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [faceImg, setFaceImg] = React.useState<string | null>(null);

  const [salesChart, setSalesChart] = React.useState<{ labels: string[]; data: number[] } | null>(null);
  const [prodChart, setProdChart] = React.useState<{ labels: string[]; data: number[] } | null>(null);
  const [financeChart, setFinanceChart] = React.useState<{ labels: string[]; income: number[]; expense: number[] } | null>(null);

  const [lowStockItems, setLowStockItems] = React.useState<any[]>([]);
  const [totalSales, setTotalSales] = React.useState(0);
  const [totalProd, setTotalProd] = React.useState(0);

  const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
  const pad = (n: number) => String(n).padStart(2, "0");
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const load = async () => {
    try {
      const [s, u, r] = await Promise.all([
        apiFetch("/dashboard").catch(() => null),
        getUser(),
        getUserRole(),
      ]);
      setStats(s);
      setUserState(u);
      setRole(r);

      const profile = await syncUserProfile();
      const admin = r === "admin" || r === "owner";
      if (profile) {
        setUserState(profile);
        setFaceImg(admin ? null : (profile.faceImage ?? null));
      }

      const [salesData, prodData, financeData, inventoryData] = await Promise.all([
        apiFetch("/sales").catch(() => []),
        apiFetch("/production/transactions").catch(() => []),
        apiFetch("/finance").catch(() => []),
        apiFetch("/inventory").catch(() => []),
      ]);

      const salesArr = Array.isArray(salesData) ? salesData : [];
      const prodArr = Array.isArray(prodData) ? prodData : [];
      const finArr = Array.isArray(financeData) ? financeData : [];
      const invArr = Array.isArray(inventoryData) ? inventoryData : [];

      const now = new Date();
      const labels: string[] = [];
      const sv: number[] = [];
      const pv: number[] = [];
      const fi: number[] = [];
      const fe: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        labels.push(monthNames[d.getMonth()]);
        sv.push(salesArr.filter((t: any) => String(t.date || t.createdAt || "").startsWith(ym))
          .reduce((s: number, t: any) => s + (t.totalSum || t.totalAmount || t.amount || 0), 0));
        pv.push(prodArr.filter((t: any) => String(t.date || t.createdAt || "").startsWith(ym))
          .reduce((s: number, t: any) => s + (t.totalSum || t.totalAmount || t.amount || 0), 0));
        fi.push(finArr.filter((t: any) => t.type === "income" && String(t.date || "").startsWith(ym))
          .reduce((s: number, t: any) => s + (t.amount || 0), 0));
        fe.push(finArr.filter((t: any) => t.type === "expense" && String(t.date || "").startsWith(ym))
          .reduce((s: number, t: any) => s + (t.amount || 0), 0));
      }
      setSalesChart({ labels, data: sv });
      setProdChart({ labels, data: pv });
      setFinanceChart({ labels, income: fi, expense: fe });
      setTotalSales(salesArr.reduce((s: number, t: any) => s + (t.totalSum || t.totalAmount || t.amount || 0), 0));
      setTotalProd(prodArr.reduce((s: number, t: any) => s + (t.totalSum || t.totalAmount || t.amount || 0), 0));

      setLowStockItems(invArr.filter((i: any) => i.quantity <= 10).sort((a: any, b: any) => a.quantity - b.quantity).slice(0, 5));
    } catch {}
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== "web" }).start();
      const interval = setInterval(load, 15000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const roleInfo = (role === "driver" || /haydovchi/i.test(String(user?.position || "")))
    ? roleLabels.driver
    : (roleLabels[role || ""] || { label: "Foydalanuvchi", color: "#fff", bg: "#888", emoji: "👤" });
  const isAdmin = role === "admin" || role === "owner";
  const isDriver = role === "driver" || /haydovchi/i.test(String(user?.position || ""));

  const canOpen = (name: string) => {
    try { return !!navigation?.getState?.()?.routeNames?.includes(name); } catch { return false; }
  };
  const openScreen = (name: string) => { if (canOpen(name)) navigation.navigate(name); };

  const statCards = stats ? [
    { icon: "📦", label: "Mahsulotlar", value: stats.totalProducts ?? 0, color: "#7c3aed", bg: "#f5f3ff" },
    { icon: "📋", label: "Inventar turlari", value: stats.totalInventoryItems ?? 0, color: "#0891b2", bg: "#ecfeff" },
    { icon: "🏭", label: "Bugungi ishlab chiq.", value: stats.totalProductionToday ?? 0, color: "#ea580c", bg: "#fff7ed" },
    { icon: "📊", label: "Bugungi sotuv", value: stats.totalSalesToday ?? 0, color: "#22c55e", bg: "#f0fdf4" },
    { icon: "🏢", label: "Mijozlar", value: stats.totalCustomers ?? 0, color: "#2563eb", bg: "#dbeafe" },
    { icon: "💰", label: "Oylik kirim", value: stats.monthlyIncome ?? 0, color: "#16a34a", bg: "#f0fdf4", money: true },
    { icon: "📉", label: "Oylik chiqim", value: stats.monthlyExpense ?? 0, color: "#dc2626", bg: "#fef2f2", money: true },
    { icon: "🏦", label: "Oylik foyda", value: stats.monthlyProfit ?? 0, color: "#2563eb", bg: "#dbeafe", money: true },
  ] : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBg}>
        <View style={styles.headerContent}>
          <View style={styles.profileRow}>
            {isAdmin ? (
              <View style={styles.logoAvatar}><AppLogo size={72} /></View>
            ) : faceImg ? (
              <Image key={faceImageKey(faceImg)} source={{ uri: faceImg }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{user?.name?.charAt(0) || user?.phone?.slice(-2) || "U"}</Text>
              </View>
            )}
            <View style={styles.profileTexts}>
              <Text style={styles.fullName}>{user?.name || user?.phone || "Foydalanuvchi"}</Text>
              <Text style={styles.companyName}>{t("companyName")}</Text>
              <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={styles.roleEmoji}>{roleInfo.emoji}</Text>
                <Text style={styles.roleBadgeText}>{roleInfo.label}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileBtn}>
            <Text style={styles.profileBtnIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mijozlar + Yuk xatlari cards */}
      {(canOpen("Clients") || canOpen("Waybills")) && (
        <View style={styles.quickRow}>
          {canOpen("Clients") && (
            <TouchableOpacity style={styles.quickCard} onPress={() => openScreen("Clients")} activeOpacity={0.85}>
              <View style={[styles.quickIcon, { backgroundColor: "#dbeafe" }]}>
                <Text style={{ fontSize: 24 }}>🏢</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickTitle}>Mijozlar</Text>
                <Text style={styles.quickSub}>Mijozlar bazasi</Text>
              </View>
              <Text style={styles.quickArrow}>›</Text>
            </TouchableOpacity>
          )}
          {canOpen("Waybills") && (
            <TouchableOpacity style={styles.quickCard} onPress={() => openScreen("Waybills")} activeOpacity={0.85}>
              <View style={[styles.quickIcon, { backgroundColor: "#dcfce7" }]}>
                <Text style={{ fontSize: 24 }}>📦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickTitle}>Yuk xatlari</Text>
                <Text style={styles.quickSub}>Nakladnoy boshqaruvi</Text>
              </View>
              <Text style={styles.quickArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Stat cards — haydovchi uchun ko'rsatilmaydi */}
      {!isDriver && (
      <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: spacing.lg, marginTop: 16 }}>
        <Text style={styles.sectionTitle}>Umumiy ko'rsatkichlar</Text>
        <View style={styles.statGrid}>
          {statCards.map((c, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: c.bg }]}>
              <Text style={styles.statIcon}>{c.icon}</Text>
              <Text style={[styles.statValue, { color: c.color }]}>
                {c.money ? fmt(c.value) : c.value}
              </Text>
              <Text style={styles.statLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
      )}

      {/* Charts — haydovchi uchun ko'rsatilmaydi */}
      {!isDriver && (
      <View style={styles.chartSection}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📈 Sotuv vs Ishlab chiqarish</Text>
          <Text style={styles.chartSub}>Oxirgi 6 oy (so'm)</Text>
          {salesChart && salesChart.data.some(v => v > 0) ? (
            <DualLineChart labels={salesChart.labels} data1={salesChart.data} data2={prodChart?.data || []}
              color1="#10b981" color2="#6366f1" label1="Sotuv" label2="Ishlab chiqarish" />
          ) : (
            <View style={{ height: 80, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Ma'lumotlar yo'q</Text>
            </View>
          )}
        </View>
        {isAdmin && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>💹 Moliyaviy ko'rsatkichlar</Text>
            <Text style={styles.chartSub}>Oxirgi 6 oy</Text>
            {financeChart && (financeChart.income.some(v => v > 0) || financeChart.expense.some(v => v > 0)) ? (
              <DualLineChart labels={financeChart.labels} data1={financeChart.income} data2={financeChart.expense}
                color1="#22c55e" color2="#ef4444" label1="Kirim" label2="Chiqim" />
            ) : (
              <View style={{ height: 80, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Ma'lumotlar yo'q</Text>
              </View>
            )}
          </View>
        )}
      </View>
      )}

      {/* Bottom widgets — haydovchi uchun ko'rsatilmaydi */}
      {!isDriver && (
      <View style={styles.widgetSection}>
        {/* General summary */}
        <View style={styles.widgetCard}>
          <Text style={styles.widgetTitle}>📊 Umumiy ma'lumotlar</Text>
          <View style={styles.widgetRow}>
            <Text style={styles.widgetLabel}>Jami sotuv</Text>
            <Text style={[styles.widgetValue, { color: "#16a34a" }]}>{fmt(totalSales)}</Text>
          </View>
          <View style={styles.widgetRow}>
            <Text style={styles.widgetLabel}>Jami ishlab chiqarish</Text>
            <Text style={[styles.widgetValue, { color: "#6366f1" }]}>{fmt(totalProd)}</Text>
          </View>
          {isAdmin && (
            <View style={styles.widgetRow}>
              <Text style={styles.widgetLabel}>Oylik foyda</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.widgetValue, { color: (stats?.monthlyProfit ?? 0) >= 0 ? "#16a34a" : "#dc2626" }]}>
                  {fmt(stats?.monthlyProfit ?? 0)}
                </Text>
                {(() => {
                  const inc = stats?.monthlyIncome ?? 0;
                  const exp = stats?.monthlyExpense ?? 0;
                  const pft = inc - exp;
                  const pct = inc ? Math.round((pft / inc) * 100) : 0;
                  const up = pct >= 0;
                  return (
                    <View style={{
                      backgroundColor: up ? "#dcfce7" : "#fef2f2",
                      paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: up ? "#16a34a" : "#dc2626" }}>
                        {up ? "↑" : "↓"} {Math.abs(pct)}%
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          )}
        </View>

        {/* Low stock */}
        <View style={styles.widgetCard}>
          <Text style={styles.widgetTitle}>⚠️ Kam qolgan mahsulotlar</Text>
          {lowStockItems.length > 0 ? lowStockItems.map((item: any, i: number) => (
            <View key={i} style={styles.widgetRow}>
              <Text style={styles.widgetLabel} numberOfLines={1}>{item.productName || "—"}</Text>
              <View style={[styles.badge, { backgroundColor: item.quantity <= 3 ? "#fef2f2" : "#fef9c3" }]}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: item.quantity <= 3 ? "#dc2626" : "#ca8a04" }}>
                  {item.quantity} ta
                </Text>
              </View>
            </View>
          )) : (
            <View style={{ padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Barcha mahsulotlar yetarli</Text>
            </View>
          )}
        </View>

      </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  headerBg: {
    backgroundColor: "#f97316", paddingTop: 35, paddingBottom: 30,
    paddingHorizontal: spacing.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  profileRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12, paddingRight: 44 },
  profileTexts: { flex: 1 },
  avatarLarge: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center",
    alignItems: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarLargeText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  logoAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#fff", justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)", overflow: "hidden",
  },
  avatarImage: { width: 72, height: 72, borderRadius: 20, borderWidth: 3, borderColor: "rgba(255,255,255,0.4)" },
  fullName: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3, textAlign: "left" },
  companyName: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: spacing.xs,
  },
  roleEmoji: { fontSize: 12 },
  roleBadgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  profileBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center",
    alignItems: "center", position: "absolute", top: 0, right: 0,
  },
  profileBtnIcon: { fontSize: 20 },
  quickRow: { paddingHorizontal: spacing.lg, marginTop: 16, gap: spacing.md },
  quickCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.sm },
  quickIcon: { width: 52, height: 52, borderRadius: radius.lg, justifyContent: "center", alignItems: "center" },
  quickTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  quickSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  quickArrow: { fontSize: 26, fontWeight: "300", color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
   statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
   statCard: {
     width: (width - spacing.lg * 2 - 8) / 2, borderRadius: radius.lg,
     padding: spacing.md, alignItems: "center", marginBottom: 8,
   },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 2, textAlign: "center" },
  chartSection: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  chartCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  chartTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  chartSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  widgetSection: { paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  widgetCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  widgetTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  widgetRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight,
  },
  widgetLabel: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  widgetValue: { fontSize: 13, fontWeight: "700" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
