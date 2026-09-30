import React from "react";
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { syncUserProfile } from "../lib/employee-profile";
import AppLogo from "../components/AppLogo";
import { useI18n } from "../i18n";

interface Props {
  navigation: any;
  onLogout: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const fmtMoney = (n: number) => n.toLocaleString("uz-UZ");

const STATUS: Record<string, { label: string; icon: string; color: string }> = {
  present: { label: "Keldi", icon: "✅", color: "#16a34a" },
  late: { label: "Kech keldi", icon: "⏰", color: "#d97706" },
  absent: { label: "Kelmadi", icon: "❌", color: "#dc2626" },
  leave: { label: "Ta'til", icon: "🏖️", color: "#2563eb" },
};

function StatCard({ icon, value, label, sub, color, bg }: {
  icon: string; value: number | string; label: string;
  sub?: string; color: string; bg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function EmployeeHome({ navigation }: Props) {
  const { t } = useI18n();
  const [user, setUser] = React.useState<any>(null);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [todayAtt, setTodayAtt] = React.useState<any>(null);
  const [monthAtt, setMonthAtt] = React.useState<any>(null);
  const [salary, setSalary] = React.useState(0);
  const [monthIncome, setMonthIncome] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const profile = await syncUserProfile();
      if (profile) setUser(profile);

      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const [taskList, attList, report, emps, offs] = await Promise.all([
        apiFetch("/tasks/mine").catch(() => []),
        apiFetch(`/attendance?date=${now.toISOString().split("T")[0]}`).catch(() => []),
        apiFetch(`/attendance/report?year=${y}&month=${m}`).catch(() => []),
        apiFetch("/employees").catch(() => []),
        apiFetch("/settings/off-days").catch(() => null),
      ]);

      setTasks(Array.isArray(taskList) ? taskList : []);
      const empId = profile?.employeeId;
      const mine = (Array.isArray(attList) ? attList : []).filter(
        (r: any) => r.employeeId === empId
      );
      setTodayAtt(mine[0] ?? null);
      const rep = (Array.isArray(report) ? report : []).find(
        (r: any) => r.employeeId === empId
      );
      setMonthAtt(rep ?? null);

      // ===== Daromad (joriy oy): ish kuni × (oylik maosh ÷ oy ish kunlari) =====
      const emp = (Array.isArray(emps) ? emps : []).find((e: any) => e.id === empId);
      const mySalary = Number(emp?.salary) || 0;
      const offList: any[] = Array.isArray(offs?.offDays) ? offs.offDays : [];
      const dim = new Date(y, m, 0).getDate();
      const offCnt = offList.filter((d: any) => String(d.date || "").startsWith(`${y}-${pad(m)}`)).length;
      const workDays = Math.max(1, dim - offCnt);
      const rate = Math.round(mySalary / workDays);
      const worked = (rep?.presentDays || 0) + (rep?.lateDays || 0);
      setSalary(mySalary);
      setMonthIncome(worked * rate);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
      const iv = setInterval(load, 60000);
      return () => clearInterval(iv);
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = React.useMemo(
    () => tasks.filter(t => String(t.date || "").slice(0, 10) === todayStr),
    [tasks, todayStr]
  );
  const taskStats = React.useMemo(() => ({
    today: todayTasks.length,
    started: todayTasks.filter(t => t.status === "started").length,
    finished: todayTasks.filter(t => t.status === "finished").length,
    allFinished: tasks.filter(t => t.status === "finished").length,
    all: tasks.length,
  }), [tasks, todayTasks]);

  const attStatus = todayAtt ? (STATUS[todayAtt.status] || STATUS.present) : null;
  const attTime = todayAtt?.createdAt
    ? (() => { const d = new Date(todayAtt.createdAt); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; })()
    : null;

  const dash = loading ? "—" : "0";
  const position = user?.position || "Hodim";
  const positionEmoji = /haydovchi|dastavkachi/i.test(position)
    ? "🚗"
    : /boshqaruv/i.test(position)
      ? "👔"
      : /buxgalter/i.test(position)
        ? "🧮"
        : /oshpaz/i.test(position)
          ? "👨‍🍳"
          : /qorovul/i.test(position)
            ? "🛡️"
            : "👷";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header — korxona logosi */}
      <View style={styles.headerBg}>
        <View style={styles.profileRow}>
          <View style={styles.logoBox}>
            <AppLogo size={58} />
          </View>
          <View style={styles.profileTexts}>
            <Text style={styles.fullName}>{user?.name || user?.phone || "Xodim"}</Text>
            <Text style={styles.companyName}>{t("companyName")}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleEmoji}>{positionEmoji}</Text>
              <Text style={styles.roleBadgeText}>{position}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Daromad — faqat joriy oy */}
      <View style={styles.section}>
        <View style={styles.incomeCard}>
          <View style={styles.incomeHead}>
            <Text style={styles.incomeTitle}>💵 Daromad</Text>
            <Text style={styles.salaryVal}>Oylik maosh: {fmtMoney(salary)} so'm</Text>
          </View>
          <View style={styles.incomeRow}>
            <View style={styles.incomeItem}>
              <Text style={styles.incomeVal}>
                {loading ? "—" : fmtMoney(monthIncome)}
                <Text style={styles.incomeUnit}> so'm</Text>
              </Text>
              <Text style={styles.incomeLbl}>
                {months[new Date().getMonth()]} {new Date().getFullYear()}
              </Text>
            </View>
          </View>
          <Text style={styles.incomeNote}>
            Daromad = ish kuni × (oylik maosh ÷ oy ish kunlari). Batafsil — "Hisobot" bo'limida
          </Text>
        </View>
      </View>

      {/* Topshiriqlar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Topshiriqlar (bugun)</Text>
        <View style={styles.statRow}>
          <StatCard icon="📌" value={loading ? dash : taskStats.today} label="Jami (bugun)" color="#2563eb" bg="#dbeafe" />
          <StatCard icon="🔄" value={loading ? dash : taskStats.started} label="Boshlandi" color="#2563eb" bg="#dbeafe" />
          <StatCard icon="✅" value={loading ? dash : taskStats.finished} label="Yakunlandi" color="#16a34a" bg="#dcfce7" />
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxLabel}>✅ Yakunlangan (bugun)</Text>
          <Text style={[styles.infoBoxValue, { color: "#16a34a" }]}>
            {loading ? dash : `${taskStats.finished} / ${taskStats.today}`}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxLabel}>🗂️ Jami yakunlangan topshiriqlar</Text>
          <Text style={styles.infoBoxValue}>
            {loading ? dash : `${taskStats.allFinished} / ${taskStats.all}`}
          </Text>
        </View>
        <Text style={styles.sectionNote}>Batafsil — pastdagi "Topshiriqlar" bo'limida</Text>
      </View>

      {/* Davomat */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Davomat (bugun)</Text>
        <View style={[styles.attBox, attStatus ? { borderColor: attStatus.color + "44" } : null]}>
          <Text style={styles.attIcon}>{attStatus ? attStatus.icon : "⏳"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.attStatus}>
              {loading ? "Tekshirilmoqda..." : attStatus ? attStatus.label : "Belgilanmagan"}
            </Text>
            {attTime ? <Text style={styles.attTime}>Kirish vaqti: {attTime}</Text> : null}
          </View>
        </View>
        <View style={styles.statRow}>
          <StatCard
            icon="✅"
            value={loading ? dash : (monthAtt?.presentDays ?? 0)}
            label="Keldi"
            color="#16a34a"
            bg="#f0fdf4"
          />
          <StatCard
            icon="⏰"
            value={loading ? dash : (monthAtt?.lateDays ?? 0)}
            label="Kech"
            color="#d97706"
            bg="#fef3c7"
          />
          <StatCard
            icon="❌"
            value={loading ? dash : (monthAtt?.absentDays ?? 0)}
            label="Kelmadi"
            color="#dc2626"
            bg="#fef2f2"
          />
        </View>
        <Text style={styles.sectionNote}>
          Shu oylik davomat — {"Davomat"}/"Hisobot" bo'limida Face ID bilan belgilanadi
        </Text>
      </View>

      {/* Tezkor yo'riqnoma */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Yo'riqnoma</Text>
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            📋 <Text style={styles.hintBold}>Topshiriqlar</Text> — vazifalaringizni ko'rish va holatini o'zgartirish
          </Text>
          <Text style={styles.hintText}>
            🤳 <Text style={styles.hintBold}>Davomat</Text> — Face ID orqali kirish/tashrish belgilash
          </Text>
          <Text style={styles.hintText}>
            📊 <Text style={styles.hintBold}>Hisobot</Text> — davomat tarixi va oylik statistika
          </Text>
          <Text style={styles.hintText}>
            👤 <Text style={styles.hintBold}>Profil</Text> — ma'lumotlaringiz va profil rasmi
          </Text>
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
  logoBox: {
    width: 66, height: 66, borderRadius: 20, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.45)", overflow: "hidden",
  },
  // ===== Daromad (joriy oy) =====
  incomeCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: "#16a34a33", ...shadows.sm,
  },
  incomeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  incomeTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  salaryVal: { fontSize: 12, fontWeight: "800", color: colors.text, flexShrink: 1, textAlign: "right" },
  incomeRow: { flexDirection: "row", gap: 8 },
  incomeItem: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: 6, alignItems: "center",
  },
  incomeVal: { fontSize: 17, fontWeight: "800", color: "#2563eb", textAlign: "center" },
  incomeUnit: { fontSize: 10, fontWeight: "700", color: "#2563eb" },
  incomeLbl: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginTop: 3 },
  incomeNote: { fontSize: 9, color: colors.textMuted, marginTop: 8, lineHeight: 13 },
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
  statLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginTop: 3 },
  statSub: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  infoBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 11,
    marginTop: 8, ...shadows.sm,
  },
  infoBoxLabel: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, flex: 1 },
  infoBoxValue: { fontSize: 14, fontWeight: "800", color: colors.text },
  attBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 8, ...shadows.sm,
  },
  attIcon: { fontSize: 26 },
  attStatus: { fontSize: 15, fontWeight: "800", color: colors.text },
  attTime: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
  hintBox: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: 14, gap: 9, ...shadows.sm,
  },
  hintText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  hintBold: { fontWeight: "800", color: colors.text },
});
