import React, { useState, useEffect, useCallback, useRef, createContext, useContext, Component } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, StatusBar, Text, TouchableOpacity, ScrollView, Platform } from "react-native";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: any }> {
  state = { error: null as any };
  static getDerivedStateFromError(error: any) { return { error }; }
  componentDidCatch(error: any) {
    try { logClientError("mobile:crash", {}, error?.stack || String(error)); } catch {}
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Xatolik yuz berdi</Text>
          <Text style={{ color: "#666", textAlign: "center", marginBottom: 20 }}>{String(this.state.error?.message || this.state.error)}</Text>
          <TouchableOpacity onPress={() => { this.setState({ error: null }); }} style={{ backgroundColor: "#f97316", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
import { getToken, getUserRole, logClientError, setSessionExpiredHandler } from "./src/api";
import { syncUserProfile } from "./src/lib/employee-profile";
import { colors, spacing, radius, shadows } from "./src/theme";

// React Navigation sahnalarni `aria-hidden` qilganda, fokus ichida qolib
// ketgan bo'lsa, brauzer "Blocked aria-hidden..." ogohlantirishini chiqaradi.
// Har bir bosish/Enter'da faol elementni blur qilamiz (matn maydonlari
// o'z ichida bosilganda e'tiborsiz qoldiriladi).
if (Platform.OS === "web" && typeof document !== "undefined" && !(globalThis as any).__cartonBlurFix) {
  (globalThis as any).__cartonBlurFix = true;

  // RNW 0.21 `props.pointerEvents` prop'ini eskirgan deb hisoblaydi, lekin
  // @react-navigation/elements (Header/Screen) va @react-navigation/bottom-tabs
  // (BottomTabView/BottomTabBar) hali ham prop sifatida uzatadi — 2.9.43'ün
  // oxirgi versiyasida ham tuzatilmagan. Kutubxona tuzatilguncha faqat shu
  // aniq xabarni filtrlaymiz — o'z kodimizda bu prop ishlatilmaydi
  // (style.pointerEvents ishlatiladi).
  const origWarn = console.warn;
  console.warn = function (...args: unknown[]) {
    if (String(args[0] ?? "") === "props.pointerEvents is deprecated. Use style.pointerEvents") return;
    origWarn.apply(console, args);
  };

  const blurActive = (e?: Event) => {
    try {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return;
      const tag = el.tagName;
      const isTextEntry = tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
      if (isTextEntry && e?.target instanceof Node && el.contains(e.target)) return;
      el.blur();
    } catch {}
  };
  document.addEventListener("click", blurActive, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") blurActive();
  }, true);
}
import { I18nProvider } from "./src/i18n";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import DriverHome from "./src/screens/DriverHomeScreen";
import DriverMapScreen from "./src/screens/DriverMapScreen";
import EmployeeHome from "./src/screens/EmployeeHomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AttendanceScreen from "./src/screens/AttendanceScreen";
import AttendanceReportScreen from "./src/screens/AttendanceReportScreen";
import ProductsScreen from "./src/screens/ProductsScreen";
import DeliveryScreen from "./src/screens/DeliveryScreen";
import DeliveryMapScreen from "./src/screens/DeliveryMapScreen";
import ProductionScreen from "./src/screens/ProductionScreen";
import StockViewScreen from "./src/screens/StockViewScreen";
import ProductionCalcScreen from "./src/screens/ProductionCalcScreen";
import GlueRecipeScreen from "./src/screens/GlueRecipeScreen";
import CalculationsScreen from "./src/screens/CalculationsScreen";
import FinanceScreen from "./src/screens/FinanceScreen";
import ClientsScreen from "./src/screens/ClientsScreen";
import EmployeesScreen from "./src/screens/EmployeesScreen";
import FaceAttendanceScreen from "./src/screens/FaceAttendanceScreen";
import FaceRegisterScreen from "./src/screens/FaceRegisterScreen";
import AdminTasksScreen from "./src/screens/AdminTasksScreen";
import HRHubScreen from "./src/screens/HRHubScreen";
import WorkDaysScreen from "./src/screens/WorkDaysScreen";
import SalaryScreen from "./src/screens/SalaryScreen";
import ProdStatsSection from "./src/screens/ProdStatsSection";
import EmployeeTasksScreen from "./src/screens/EmployeeTasksScreen";
import WaybillsScreen from "./src/screens/WaybillsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthContext = createContext<{ onLogout: () => void }>({ onLogout: () => {} });
const RoleContext = createContext<string | null>(null);

const BackIcon = React.memo(({ navigation }: { navigation?: any }) => {
  // headerLeft prop'ni ham, useNavigation hook'ni ham qo'llab-quvvatlaymiz
  const hookNav = useNavigation();
  const nav = navigation || hookNav;
  if (!nav) return null;
  return (
    <TouchableOpacity
      onPress={() => {
        try { nav.goBack(); } catch {}
      }}
      style={{
        marginLeft: 10,
        marginRight: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
        ...(Platform.OS === "web"
          ? { boxShadow: "0 2px 3px rgba(0,0,0,0.18)" }
          : {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 3,
              elevation: 4,
            }),
        zIndex: 10,
      }}
      testID="back-button"
      accessibilityLabel="Orqaga"
    >
      <Text
        style={{
          color: colors.primary,
          fontSize: 30,
          fontWeight: "900",
          lineHeight: 34,
          width: "100%",
          textAlign: "center",
          textAlignVertical: "center",
          includeFontPadding: false,
          transform: [{ translateY: -3 }],
        }}
      >←</Text>
    </TouchableOpacity>
  );
});

const hdrOpts = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700" as const },
  animation: "slide_from_right" as const,
  headerLeft: ({ navigation }: any) => <BackIcon navigation={navigation} />,
};

function TI({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 4 }}>
      <View style={{ width: focused ? 42 : 34, height: focused ? 42 : 34, borderRadius: focused ? 13 : 11, backgroundColor: focused ? colors.primary + "15" : "transparent", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: focused ? 21 : 18 }}>{emoji}</Text>
      </View>
    </View>
  );
}

const tabStyle = {
  height: 90, paddingBottom: 30, paddingTop: 8, backgroundColor: "#fff",
  borderTopWidth: 1, borderTopColor: "#f5f5f4", elevation: 20,
  ...(Platform.OS === "web"
    ? { boxShadow: "0 -4px 16px rgba(0,0,0,0.06)" }
    : { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16 }),
};

// unmountOnBlur: true — har bir tab o'tganda stack tozalanadi
const tabOpts = { headerShown: false, tabBarStyle: tabStyle, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" as const, marginTop: -2 }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: "#94a3b8", unmountOnBlur: true };

const ProfileStackNavigator = React.memo(function ProfileStackNavigator() {
  const { onLogout } = useContext(AuthContext);
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="Prof" options={{ title: "Profil" }}>
        {({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
    </S.Navigator>
  );
});

const HomeStackNavigator = React.memo(function HomeStackNavigator() {
  const { onLogout } = useContext(AuthContext);
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="H" options={{ headerShown: false }}>
        {({ navigation }) => <HomeScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
      <S.Screen name="Profile" options={{ title: "Profil" }}>
        {({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
      <S.Screen name="ProdCalc" component={ProductionCalcScreen} options={{ title: "🧮 Kalkulyatsiya" }} />
      <S.Screen name="GlueRecipe" component={GlueRecipeScreen} options={{ title: "🧪 Kley retsepi" }} />
      <S.Screen name="Delivery" component={DeliveryScreen} options={{ title: "🚚 Yetkazish" }} />
      <S.Screen name="DeliveryMap" component={DeliveryMapScreen} options={{ title: "🗺️ Xarita" }} />
      <S.Screen name="Clients" component={ClientsScreen} options={{ title: "🏢 Mijozlar" }} />
      <S.Screen name="Products" component={ProductsScreen} options={{ title: "📦 Mahsulotlar" }} />
      <S.Screen name="Employees" component={EmployeesScreen} options={{ title: "👥 Hodimlar" }} />
      <S.Screen name="Attendance" component={AttendanceScreen} options={{ title: "✅ Davomat" }} />
      <S.Screen name="Tasks" component={AdminTasksScreen} options={{ title: "📋 Topshiriqlar" }} />
      <S.Screen name="Waybills" component={WaybillsScreen} options={{ title: "📋 Yuk xatlari" }} />
    </S.Navigator>
  );
});

const AdminFinanceScreen = React.memo(function AdminFinanceScreen() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="Fin" component={FinanceScreen} options={{ title: "💰 Moliya" }} />
      <S.Screen name="Waybills" component={WaybillsScreen} options={{ title: "📋 Yuk xatlari" }} />
    </S.Navigator>
  );
});

function ProdMenu({ navigation }: any) {
  const cards = [
    { emoji: "🧮", label: "Kalkulyatsiya", target: "ProdCalc", color: "#6366f1", bg: "#eef2ff" },
    { emoji: "🧪", label: "Kley retsepi", target: "GlueRecipe", color: "#0d9488", bg: "#f0fdfa" },
    { emoji: "📦", label: "Mahsulotlar", target: "Products", color: "#0891b2", bg: "#ecfeff" },
    { emoji: "🏭", label: "Ishlab chiqarish", target: "ProdMain", color: "#ea580c", bg: "#fff7ed" },
    { emoji: "📋", label: "Ombor", target: "Stock", color: "#16a34a", bg: "#f0fdf4" },
  ];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: spacing.lg }}>Ishlab chiqarish bo'limi</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {cards.map((c, i) => (
          <TouchableOpacity key={i} onPress={() => navigation.navigate(c.target)}
            style={{
              width: "47%", backgroundColor: c.bg, borderRadius: radius.xl,
              padding: spacing.xl, alignItems: "center", borderWidth: 1.5, borderColor: c.color + "22",
              ...shadows.sm,
            }}>
            <Text style={{ fontSize: 36, marginBottom: spacing.sm }}>{c.emoji}</Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.color, textAlign: "center" }}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Kartalar pastida — ishlab chiqarish statistikasi (diagramma) */}
      <ProdStatsSection />
    </ScrollView>
  );
}

const AdminProductionScreen = React.memo(function AdminProductionScreen() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="ProdMenu" component={ProdMenu} options={{ title: "🏭 Ishlab chiqarish" }} />
      <S.Screen name="ProdCalc" component={ProductionCalcScreen} options={{ title: "🧮 Kalkulyatsiya" }} />
      <S.Screen name="GlueRecipe" component={GlueRecipeScreen} options={{ title: "🧪 Kley retsepi" }} />
      <S.Screen name="Products" component={ProductsScreen} options={{ title: "📦 Mahsulotlar" }} />
      <S.Screen name="ProdMain" component={ProductionScreen} options={{ title: "🏭 Ishlab chiqarish" }} />
      <S.Screen name="Stock" component={StockViewScreen} options={{ title: "📋 Ombor" }} />
      <S.Screen name="Calculations" component={CalculationsScreen} options={{ title: "📋 Saqlangan hisoblashlar" }} />
    </S.Navigator>
  );
});

const AdminDeliveryScreen = React.memo(function AdminDeliveryScreen() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="Delivery" component={DeliveryScreen} options={{ title: "🚚 Yetkazish" }} />
      <S.Screen name="DeliveryMap" component={DeliveryMapScreen} options={{ title: "🗺️ Xarita" }} />
      <S.Screen name="Waybills" component={WaybillsScreen} options={{ title: "📋 Yuk xatlari" }} />
    </S.Navigator>
  );
});

const AdminHRScreen = React.memo(function AdminHRScreen() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts} initialRouteName="HRHome">
      <S.Screen name="HRHome" component={HRHubScreen} options={{ title: "👥 HR" }} />
      <S.Screen name="Employees" component={EmployeesScreen} options={{ title: "👥 Hodimlar" }} />
      <S.Screen name="Attendance" component={AttendanceScreen} options={{ title: "✅ Davomat" }} />
      <S.Screen name="Tasks" component={AdminTasksScreen} options={{ title: "📋 Topshiriqlar" }} />
      <S.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} />
      <S.Screen name="WorkDays" component={WorkDaysScreen} options={{ title: "📅 Ish kunlari" }} />
      <S.Screen name="Salary" component={SalaryScreen} options={{ title: "💰 Oylik maosh" }} />
      <S.Screen name="FaceAttendance" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID" }} />
      <S.Screen name="FaceRegister" component={FaceRegisterScreen} options={{ title: "📸 Yuz ro'yxati" }} />
    </S.Navigator>
  );
});

const AdminTabs = React.memo(function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Bosh sahifa" component={HomeStackNavigator} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Moliya" component={AdminFinanceScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="💰" focused={focused} /> }} />
      <Tab.Screen name="Ishlab chiq." component={AdminProductionScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏭" focused={focused} /> }} />
      <Tab.Screen name="Yetkazib berish" component={AdminDeliveryScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🚚" focused={focused} />, tabBarLabelStyle: { fontSize: 9, fontWeight: "700" as const, marginTop: -2 } }} />
      <Tab.Screen name="HR" component={AdminHRScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="👥" focused={focused} /> }} />
    </Tab.Navigator>
  );
});

// Employee
const EmployeeHomeStack = React.memo(function EmployeeHomeStack() {
  const { onLogout } = useContext(AuthContext);
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="H" options={{ headerShown: false }}>
        {({ navigation }) => <EmployeeHome navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
      <S.Screen name="Profile" options={{ title: "Profil" }}>
        {({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
    </S.Navigator>
  );
});

const EmployeeDavomatScreen = React.memo(function EmployeeDavomatScreen() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="FaceAtt" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID Davomat" }} />
      <S.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} />
    </S.Navigator>
  );
});

const EmployeeTasksScreenNav = React.memo(function EmployeeTasksScreenNav() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="MyTasks" component={EmployeeTasksScreen} options={{ title: "📋 Topshiriqlarim" }} />
    </S.Navigator>
  );
});

const EmployeeReportScreen = React.memo(function EmployeeReportScreen() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="Report" component={AttendanceReportScreen} options={{ title: "📊 Davomat hisoboti" }} />
    </S.Navigator>
  );
});

const EmployeeTabs = React.memo(function EmployeeTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Bosh sahifa" component={EmployeeHomeStack} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Topshiriqlar" component={EmployeeTasksScreenNav} options={{ tabBarIcon: ({ focused }) => <TI emoji="📋" focused={focused} /> }} />
      <Tab.Screen name="Davomat" component={EmployeeDavomatScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🤳" focused={focused} /> }} />
      <Tab.Screen name="Hisobot" component={EmployeeReportScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="📊" focused={focused} /> }} />
      <Tab.Screen name="Profil" component={ProfileStackNavigator} options={{ tabBarIcon: ({ focused }) => <TI emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
});

// Driver
const DriverHomeScreen = React.memo(function DriverHomeScreen() {
  const { onLogout } = useContext(AuthContext);
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="H" options={{ headerShown: false }}>
        {({ navigation }) => <DriverHome navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
      <S.Screen name="Profile" options={{ title: "Profil" }}>
        {({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
    </S.Navigator>
  );
});

const DriverDeliveryScreen = React.memo(function DriverDeliveryScreen() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="Delivery" component={DeliveryScreen} options={{ title: "🚚 Yetkazish" }} />
      <S.Screen name="DeliveryMap" component={DeliveryMapScreen} options={{ title: "🗺️ Xarita" }} />
    </S.Navigator>
  );
});

const DriverTabs = React.memo(function DriverTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Bosh sahifa" component={DriverHomeScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Yetkazish" component={DriverDeliveryScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🚚" focused={focused} /> }} />
      <Tab.Screen name="Xarita" component={DriverMapScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🗺️" focused={focused} /> }} />
      <Tab.Screen name="Profil" component={ProfileStackNavigator} options={{ tabBarIcon: ({ focused }) => <TI emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
});

// ===================== ROOT APP =====================
const MainScreen = React.memo(function MainScreen() {
  const role = useContext(RoleContext);
  // 3 xil interfeys: admin / haydovchi / boshqa hodimlar (employee)
  if (role === "admin" || role === "owner") return <AdminTabs />;
  if (role === "driver" || role === "haydovchi") return <DriverTabs />;
  return <EmployeeTabs />;
});

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const loginRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          // Profil (position) ni yangilab, hodim turini (haydovchi/ishchi) aniqlaymiz
          await syncUserProfile().catch(() => null);
          const r = await getUserRole();
          setRole(r);
        }
        setIsLoggedIn(!!token);
      } catch {
        setIsLoggedIn(false);
      }
    })();
  }, []);

  // 401 (eski/yaroqsiz token) — tokenni api.ts tozalaydi, biz login
  // ekraniga qaytaramiz.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setRole(null);
      setIsLoggedIn(false);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    try {
      const gu = (globalThis as any).ErrorUtils;
      const base = gu && typeof gu.getGlobalHandler === "function"
        ? gu.getGlobalHandler()
        : null;
      let handling = false;
      gu?.setGlobalHandler?.((error: any, isFatal?: boolean) => {
        if (handling) return;
        handling = true;
        try {
          logClientError(
            isFatal ? "mobile:uncaught-fatal" : "mobile:uncaught",
            {},
            error?.stack || (error instanceof Error ? error.message : String(error)),
          );
        } catch {}
        try { if (base) base(error, isFatal); } catch {}
        setTimeout(() => { handling = false; }, 1000);
      });
    } catch {}
  }, []);

  const handleLogout = useCallback(() => {
    loginRef.current = false;
    setRole(null);
    setIsLoggedIn(false);
  }, []);

  const handleLogin = useCallback((loginRole?: string) => {
    if (loginRef.current) return;
    loginRef.current = true;
    if (loginRole) {
      setRole(loginRole);
      setIsLoggedIn(true);
    } else {
      getUserRole()
        .then(r => { setRole(r); setIsLoggedIn(true); })
        .catch(() => { setRole("employee"); setIsLoggedIn(true); });
    }
  }, []);

  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
    <AuthContext.Provider value={{ onLogout: handleLogout }}>
    <RoleContext.Provider value={role}>
    <I18nProvider>
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#ea580c" />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={MainScreen} />
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen onLogin={handleLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </I18nProvider>
    </RoleContext.Provider>
    </AuthContext.Provider>
    </ErrorBoundary>
  );
}
