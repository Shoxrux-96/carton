import React from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { apiFetch, getUser, clearToken, getUserRole } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");
const chartWidth = width - 40;

interface Props {
  navigation: any;
  onLogout: () => void;
}

const roleLabels: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  admin: { label: "Admin", color: "#fff", bg: colors.primary, emoji: "👑" },
  owner: { label: "Egasi", color: "#fff", bg: colors.primary, emoji: "👑" },
  driver: { label: "Haydovchi", color: "#fff", bg: colors.info, emoji: "🚗" },
  employee: { label: "Xodim", color: "#fff", bg: colors.success, emoji: "👷" },
};

const ownerMenu = [
  { title: "Face ID Davomat", tab: "HR", screen: "FaceAttendance", icon: "🤳", desc: "Yuz orqali belgilash", color: "#f97316", bg: "#fff7ed" },
  { title: "Savdo", tab: "Buyurtma", screen: "Sales", icon: "📊", desc: "Sotish va kuzatish", color: "#22c55e", bg: "#f0fdf4" },
  { title: "Xarita", tab: "Buyurtma", screen: "DeliveryMap", icon: "🗺️", desc: "Real-time kuzatish", color: "#0ea5e9", bg: "#e0f2fe" },
];

const driverMenu = [
  { title: "Xarita", tab: "Buyurtma", screen: "DeliveryMap", icon: "🗺️", desc: "Real-time kuzatish", color: "#0ea5e9", bg: "#e0f2fe" },
];

const employeeMenu: any[] = [
  { title: "Face ID Davomat", tab: "HR", screen: "FaceAttendance", icon: "🤳", desc: "Yuz orqali belgilash", color: "#f97316", bg: "#fff7ed" },
];

export default function HomeScreen({ navigation, onLogout }: Props) {
  const [stats, setStats] = React.useState<any>(null);
  const [user, setUserState] = React.useState<any>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [salesChart, setSalesChart] = React.useState<any>(null);
  const [financeChart, setFinanceChart] = React.useState<any>(null);
  const [faceImg, setFaceImg] = React.useState<string | null>(null);

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

      // Get face image from employees
      try {
        const emps = await apiFetch("/employees").catch(() => []);
        if (Array.isArray(emps) && u?.phone) {
          const me = emps.find((e: any) => e.phone?.replace(/\+/g, "") === u.phone?.replace(/\+/g, ""));
          if (me?.faceImage) setFaceImg(me.faceImage);
        }
      } catch {}

      // Load chart data
      const [salesData, financeData] = await Promise.all([
        apiFetch("/production/transactions").catch(() => []),
        apiFetch("/finance").catch(() => []),
      ]);

      // Sales chart — last 7 days production
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });
      const salesByDay = last7.map(day => {
        const dayData = (Array.isArray(salesData) ? salesData : [])
          .filter((t: any) => t.date?.startsWith(day) && t.type === "kirim");
        return dayData.reduce((s: number, t: any) => s + (t.totalSum || 0), 0) / 1000;
      });
      setSalesChart({
        labels: last7.map(d => d.slice(8, 10) + "." + d.slice(5, 7)),
        datasets: [{ data: salesByDay.map(v => v || 0) }],
      });

      // Finance chart — monthly income vs expense
      const months = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn"];
      const currentMonth = new Date().getMonth();
      const finLabels: string[] = [];
      const incomeData: number[] = [];
      const expenseData: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const mIdx = currentMonth - i;
        const m = mIdx >= 0 ? mIdx : mIdx + 12;
        finLabels.push(months[m] || "?");
        const monthStr = `${new Date().getFullYear()}-${String(m + 1).padStart(2, "0")}`;
        const monthTx = (Array.isArray(financeData) ? financeData : [])
          .filter((t: any) => t.date?.startsWith(monthStr));
        incomeData.push(monthTx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + (t.amount || 0), 0) / 1000);
        expenseData.push(monthTx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + (t.amount || 0), 0) / 1000);
      }
      setFinanceChart({ labels: finLabels, income: incomeData, expense: expenseData });
    } catch {}
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      // Auto-refresh every 15s
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
  const isOwnerRole = true; // Barcha rollar uchun dashboard ko'rsatiladi
  const isDriverRole = role === "driver";
  const menuItems = isOwnerRole ? ownerMenu : isDriverRole ? driverMenu : employeeMenu;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerBg}>
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            {faceImg ? (
              <Image source={{ uri: faceImg }} style={styles.avatarImage} />
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

      {/* Quick actions — only admin */}
      {(role === "admin" || role === "owner") && menuItems.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tezkor amallar</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((m, i) => (
            <TouchableOpacity
              key={i}
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

      {/* Stats */}
      {isOwnerRole && stats && (
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, marginTop: 20 }]}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
              <Text style={styles.statValue}>{stats?.totalProducts ?? 0}</Text>
              <Text style={styles.statLabel}>Mahsulotlar</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
              <Text style={styles.statValue}>{stats?.totalProductionToday ?? 0}</Text>
              <Text style={styles.statLabel}>Bugungi ishlab chiqarish</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
              <Text style={styles.statValue}>{stats?.activeOrders ?? 0}</Text>
              <Text style={styles.statLabel}>Faol buyurtma</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.info }]}>
              <Text style={styles.statValue}>{stats?.totalEmployees ?? 0}</Text>
              <Text style={styles.statLabel}>Xodimlar</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Charts */}
      {isOwnerRole && salesChart && (
        <View style={styles.chartSection}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📈 Ishlab chiqarish trendi (ming so'm)</Text>
            <Text style={styles.chartSubtitle}>Oxirgi 7 kun</Text>
            <LineChart
              data={salesChart}
              width={chartWidth}
              height={180}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalCount: 0,
                color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                labelColor: () => colors.textMuted,
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#f97316" },
                propsForBackgroundLines: { stroke: "#f5f5f4" },
              }}
              bezier
              style={{ borderRadius: 12, marginTop: 8 }}
            />
          </View>

          {financeChart && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>💰 Moliya (ming so'm)</Text>
              <Text style={styles.chartSubtitle}>Kirim vs Chiqim (6 oy)</Text>
              <BarChart
                data={{
                  labels: financeChart.labels,
                  datasets: [
                    { data: financeChart.income.map((v: number) => v || 0) },
                  ],
                }}
                width={chartWidth}
                height={180}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalCount: 0,
                  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                  labelColor: () => colors.textMuted,
                  propsForBackgroundLines: { stroke: "#f5f5f4" },
                  barPercentage: 0.6,
                }}
                style={{ borderRadius: 12, marginTop: 8 }}
              />
            </View>
          )}
        </View>
      )}

      {/* End of content */}
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
