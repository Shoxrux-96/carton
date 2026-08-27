import React from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { apiFetch, getUser, clearToken, getUserRole } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { faceImageKey, syncUserProfile } from "../lib/employee-profile";
import AppLogo from "../components/AppLogo";

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

const adminMenu = [
  { title: "Buyurtmalar", screen: "OrdersList", icon: "📋", desc: "Barcha buyurtmalar", color: "#2563eb", bg: "#dbeafe" },
  { title: "Savdo", screen: "Sales", icon: "📊", desc: "Sotish va kuzatish", color: "#22c55e", bg: "#f0fdf4" },
  { title: "Mahsulotlar", tab: "Ishlab chiq.", screen: "Products", icon: "📦", desc: "Mahsulotlar ro'yxati", color: "#0891b2", bg: "#ecfeff" },
  { title: "Ombor", tab: "Ishlab chiq.", screen: "Stock", icon: "📦", desc: "Ombor qoldiqlari", color: "#64748b", bg: "#f1f5f9" },
  { title: "Topshiriqlar", tab: "HR", screen: "Tasks", icon: "📋", desc: "Topshiriqlar boshqaruvi", color: "#ea580c", bg: "#fff7ed" },
  { title: "Moliya", tab: "Moliya", screen: "Fin", icon: "💰", desc: "Kirim va chiqimlar", color: "#ca8a04", bg: "#fef9c3" },
];

const driverMenu = [
  { title: "Xarita", tab: "Buyurtma", screen: "DeliveryMap", icon: "🗺️", desc: "Real-time kuzatish", color: "#0ea5e9", bg: "#e0f2fe" },
];

const employeeMenu: any[] = [
  { title: "Face ID Davomat", tab: "Davomat", screen: "FaceAtt", icon: "🤳", desc: "Yuz orqali belgilash", color: "#f97316", bg: "#fff7ed" },
];

function LineChart({ labels, data, unit }: { labels: string[]; data: number[]; unit?: string }) {
  const chartW = width - 80;
  const chartH = 160;
  const maxVal = Math.max(...data);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * chartW,
    y: chartH - 30 - ((v - minVal) / range) * (chartH - 50),
  }));

  const formatVal = (v: number) => {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
    if (v >= 1000) return (v / 1000).toFixed(0) + "K";
    return String(v);
  };

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ height: chartH, position: "relative" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <View key={pct} style={{ position: "absolute", top: chartH - 30 - pct * (chartH - 50), left: 0, right: 0, height: 1, backgroundColor: "#e5e7eb" }} />
        ))}
        {points.map((pt, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = pt.x - prev.x;
          const dy = pt.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={`line-${i}`}
              style={{
                position: "absolute",
                left: prev.x,
                top: prev.y,
                width: length,
                height: 2.5,
                backgroundColor: "#f97316",
                borderRadius: 1.25,
                transformOrigin: "left center",
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
        {points.map((pt, i) => (
          <View key={`dot-group-${i}`} style={{ position: "absolute" }}>
            <View
              style={{
                position: "absolute",
                left: pt.x - 5,
                top: pt.y - 5,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: "#f97316",
                borderWidth: 2,
                borderColor: "#fff",
              }}
            />
            {data[i] > 0 && (
              <Text style={{
                position: "absolute",
                left: pt.x - 20,
                top: pt.y - 20,
                width: 40,
                textAlign: "center",
                fontSize: 8,
                fontWeight: "700",
                color: "#f97316",
              }}>
                {formatVal(data[i])}
              </Text>
            )}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingHorizontal: 2 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ fontSize: 9, color: colors.textMuted, textAlign: "center", width: chartW / labels.length }}>{l}</Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 2 }}>
        <Text style={{ fontSize: 8, color: colors.textMuted }}>{formatVal(maxVal)}</Text>
        <Text style={{ fontSize: 8, color: colors.textMuted }}>0</Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation, onLogout }: Props) {
  const [stats, setStats] = React.useState<any>(null);
  const [user, setUserState] = React.useState<any>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [salesChart, setSalesChart] = React.useState<{ labels: string[]; data: number[] } | null>(null);
  const [productionChart, setProductionChart] = React.useState<{ labels: string[]; data: number[] } | null>(null);
  const [faceImg, setFaceImg] = React.useState<string | null>(null);

  const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
  const money = (v: number) => Math.round(v / 1000);
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

      const salesData = await apiFetch("/sales").catch(() => []);
      const salesArr = Array.isArray(salesData) ? salesData : [];

      const prodData = await apiFetch("/production/transactions").catch(() => []);
      const prodArr = Array.isArray(prodData) ? prodData : [];

      const now = new Date();
      const salesLabels: string[] = [];
      const salesValues: number[] = [];
      const prodValues: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        salesLabels.push(`${monthNames[d.getMonth()]}`);
        const sSum = salesArr.filter((t: any) => {
          const dateStr = t.date || t.createdAt || "";
          return String(dateStr).startsWith(ym);
        }).reduce((s: number, t: any) => s + (t.totalAmount || t.totalSum || t.amount || 0), 0);
        salesValues.push(money(sSum));
        const pSum = prodArr.filter((t: any) => {
          const dateStr = t.date || t.createdAt || "";
          return String(dateStr).startsWith(ym);
        }).reduce((s: number, t: any) => s + (t.totalSum || t.totalAmount || t.amount || 0), 0);
        prodValues.push(money(pSum));
      }
      setSalesChart({ labels: salesLabels, data: salesValues });
      setProductionChart({ labels: salesLabels, data: prodValues });
    } catch {}
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      const interval = setInterval(load, 15000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await clearToken();
    onLogout();
  };

  const roleInfo = roleLabels[role || ""] || { label: "Foydalanuvchi", color: "#fff", bg: "#888", emoji: "👤" };
  const isAdminRole = role === "admin" || role === "owner";
  const isDriverRole = role === "driver";
  const menuItems = isAdminRole ? adminMenu : isDriverRole ? driverMenu : employeeMenu;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBg}>
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            {isAdminRole ? (
              <View style={styles.logoAvatar}>
                <AppLogo size={72} />
              </View>
            ) : faceImg ? (
              <Image key={faceImageKey(faceImg)} source={{ uri: faceImg }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>
                  {user?.name?.charAt(0) || user?.phone?.slice(-2) || "U"}
                </Text>
              </View>
            )}
            <Text style={styles.fullName}>{user?.name || user?.phone || "Foydalanuvchi"}</Text>
            <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={styles.roleEmoji}>{roleInfo.emoji}</Text>
              <Text style={styles.roleBadgeText}>{roleInfo.label}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileBtn}>
            <Text style={styles.profileBtnIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isAdminRole && menuItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tezkor amallar</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((m, i) => (
              <TouchableOpacity
                key={`${m.title ?? "menu-item"}-${m.screen ?? i}`}
                style={styles.menuItem}
                onPress={() => {
                  if (m.tab) {
                    navigation.navigate(m.tab, { screen: m.screen });
                  } else {
                    navigation.navigate(m.screen);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: m.bg }]}>
                  <Text style={styles.menuIcon}>{m.icon}</Text>
                </View>
                <Text style={styles.menuTitle}>{m.title}</Text>
                <Text style={styles.menuDesc}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.xl }]}>Ko'rsatkichlar</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
            <Text style={styles.statValue}>{stats?.totalProducts ?? "—"}</Text>
            <Text style={styles.statLabel}>Mahsulotlar</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
            <Text style={styles.statValue}>{stats?.totalProductionToday ?? "—"}</Text>
            <Text style={styles.statLabel}>Bugungi ishlab chiqarish</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
            <Text style={styles.statValue}>{stats?.activeOrders ?? "—"}</Text>
            <Text style={styles.statLabel}>Faol buyurtma</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: colors.info }]}>
            <Text style={styles.statValue}>{stats?.totalEmployees ?? "—"}</Text>
            <Text style={styles.statLabel}>Xodimlar</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.chartSection}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📈 Sotuv trendi (ming so'm)</Text>
          <Text style={styles.chartSubtitle}>Oxirgi 6 oy</Text>
          {salesChart && salesChart.data.some((v) => v > 0) ? (
            <LineChart labels={salesChart.labels} data={salesChart.data} />
          ) : (
            <View style={{ height: 100, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 28, marginBottom: 4 }}>📊</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Sotuv ma'lumotlari yo'q</Text>
            </View>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📈 Ishlab chiqarish trendi (ming so'm)</Text>
          <Text style={styles.chartSubtitle}>Oxirgi 6 oy</Text>
          {productionChart && productionChart.data.some((v) => v > 0) ? (
            <LineChart labels={productionChart.labels} data={productionChart.data} />
          ) : (
            <View style={{ height: 100, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 28, marginBottom: 4 }}>🏭</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Ishlab chiqarish ma'lumotlari yo'q</Text>
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
    backgroundColor: "#f97316", paddingTop: 60, paddingBottom: 30,
    paddingHorizontal: spacing.xl, borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  profileSection: { alignItems: "center", flex: 1 },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center",
    alignItems: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
    marginBottom: spacing.md,
  },
  avatarLargeText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  logoAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#fff", justifyContent: "center",
    alignItems: "center", marginBottom: spacing.md,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
  },
  avatarImage: { width: 80, height: 80, borderRadius: 24, borderWidth: 3, borderColor: "rgba(255,255,255,0.4)", marginBottom: spacing.md },
  fullName: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.3, textAlign: "center" },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    marginTop: spacing.sm,
  },
  roleEmoji: { fontSize: 12 },
  roleBadgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  profileBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center",
    alignItems: "center", position: "absolute", top: 0, right: 0,
  },
  profileBtnIcon: { fontSize: 20 },
  statsContainer: { paddingHorizontal: spacing.xl, marginTop: -12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderLeftWidth: 3, ...shadows.sm,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl },
  chartSection: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  chartCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  chartTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  chartSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  menuItem: {
    width: (width - 64) / 2, backgroundColor: colors.surface,
    borderRadius: radius.xl, padding: spacing.lg, ...shadows.sm,
  },
  menuIconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    justifyContent: "center", alignItems: "center", marginBottom: spacing.sm,
  },
  menuIcon: { fontSize: 22 },
  menuTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  menuDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
