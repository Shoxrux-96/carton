import React, { useState, useEffect, useCallback, useRef, createContext, useContext, Component } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, StatusBar, Text, Image, TouchableOpacity } from "react-native";

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
import { getToken, getUserRole, logClientError } from "./src/api";
import { colors } from "./src/theme";
import { I18nProvider } from "./src/i18n";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AttendanceScreen from "./src/screens/AttendanceScreen";
import AttendanceReportScreen from "./src/screens/AttendanceReportScreen";
import ProductsScreen from "./src/screens/ProductsScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import DeliveryScreen from "./src/screens/DeliveryScreen";
import DeliveryMapScreen from "./src/screens/DeliveryMapScreen";
import ProductionScreen from "./src/screens/ProductionScreen";
import StockViewScreen from "./src/screens/StockViewScreen";
import FinanceScreen from "./src/screens/FinanceScreen";
import ClientsScreen from "./src/screens/ClientsScreen";
import EmployeesScreen from "./src/screens/EmployeesScreen";
import FaceAttendanceScreen from "./src/screens/FaceAttendanceScreen";
import FaceRegisterScreen from "./src/screens/FaceRegisterScreen";
import SalesScreen from "./src/screens/SalesScreen";
import AdminTasksScreen from "./src/screens/AdminTasksScreen";
import EmployeeTasksScreen from "./src/screens/EmployeeTasksScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const LOGO_IMG = require("./assets/logo.png");

const AuthContext = createContext<{ onLogout: () => void }>({ onLogout: () => {} });
const RoleContext = createContext<string | null>(null);

const HeaderLogo = React.memo(() => (
  <View style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", marginRight: 8, backgroundColor: "#fff" }}>
    <Image source={LOGO_IMG} style={{ width: 32, height: 32 }} resizeMode="contain" />
  </View>
));

const BackIcon = React.memo(({ navigation }: { navigation: any }) => {
  if (!navigation || typeof navigation.getState !== "function") return null;
  const state = navigation.getState();
  const isRoot = state && state.index === 0;
  if (isRoot) return null;
  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8, padding: 4 }}>
      <Text style={{ color: "#fff", fontSize: 22 }}>←</Text>
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

const tabStyle = { height: 90, paddingBottom: 30, paddingTop: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f5f5f4", elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16 };
const tabOpts = { headerShown: false, tabBarStyle: tabStyle, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" as const, marginTop: -2 }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: "#94a3b8" };

// Stable profile stack — reused across all roles
const ProfileStackNavigator = React.memo(function ProfileStackNavigator() {
  const { onLogout } = useContext(AuthContext);
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="Prof" options={{ title: "Profil", headerLeft: () => <HeaderLogo /> }}>
        {({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
    </S.Navigator>
  );
});

// Stable home stack — reused across all roles
const HomeStackNavigator = React.memo(function HomeStackNavigator() {
  const { onLogout } = useContext(AuthContext);
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={hdrOpts}>
      <S.Screen name="H" options={{ headerShown: false }}>
        {({ navigation }) => <HomeScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
      <S.Screen name="Profile" options={{ title: "Profil", headerLeft: () => <HeaderLogo /> }}>
        {({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
      <S.Screen name="OrdersList" component={OrdersScreen} options={{ title: "📋 Buyurtmalar" }} />
      <S.Screen name="Sales" component={SalesScreen} options={{ title: "📊 Savdo" }} />
      <S.Screen name="Delivery" component={DeliveryScreen} options={{ title: "🚚 Yetkazish", headerShown: false }} />
      <S.Screen name="DeliveryMap" component={DeliveryMapScreen} options={{ title: "🗺️ Xarita" }} />
      <S.Screen name="Clients" component={ClientsScreen} options={{ title: "🏢 Mijozlar" }} />
    </S.Navigator>
  );
});

const AdminProductionScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="ProdMain" component={ProductionScreen} options={{ title: "🏭 Ishlab chiqarish" }} /><S.Screen name="Products" component={ProductsScreen} options={{ title: "📦 Mahsulotlar" }} /><S.Screen name="Stock" component={StockViewScreen} options={{ title: "📦 Ombor" }} /></S.Navigator>);
});

const AdminHRScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="Employees" component={EmployeesScreen} options={{ title: "👥 Hodimlar" }} /><S.Screen name="Attendance" component={AttendanceScreen} options={{ title: "✅ Davomat" }} /><S.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} /><S.Screen name="Tasks" component={AdminTasksScreen} options={{ title: "📋 Topshiriqlar" }} /><S.Screen name="FaceAttendance" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID" }} /><S.Screen name="FaceRegister" component={FaceRegisterScreen} options={{ title: "📸 Yuz ro'yxati" }} /></S.Navigator>);
});

const AdminFinanceScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="Fin" component={FinanceScreen} options={{ title: "💰 Moliya" }} /></S.Navigator>);
});

const AdminTabs = React.memo(function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Bosh sahifa" component={HomeStackNavigator} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Ishlab chiq." component={AdminProductionScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏭" focused={focused} /> }} />
      <Tab.Screen name="HR" component={AdminHRScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="👥" focused={focused} /> }} />
      <Tab.Screen name="Moliya" component={AdminFinanceScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="💰" focused={focused} /> }} />
      <Tab.Screen name="Profil" component={ProfileStackNavigator} options={{ tabBarIcon: ({ focused }) => <TI emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
});

// Manager
const ManagerHomeScreen = React.memo(function ManagerHomeScreen() {
  const { onLogout } = useContext(AuthContext);
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="H" options={{ headerShown: false }}>{({ navigation }) => <HomeScreen navigation={navigation} onLogout={onLogout} />}</S.Screen><S.Screen name="Profile" options={{ title: "Profil", headerLeft: () => <HeaderLogo /> }}>{({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}</S.Screen><S.Screen name="FaceAttendance" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID" }} /></S.Navigator>);
});
const ManagerProductionScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="ProdMain" component={ProductionScreen} options={{ title: "🏭 Ishlab chiqarish" }} /><S.Screen name="Products" component={ProductsScreen} options={{ title: "📦 Mahsulotlar" }} /><S.Screen name="Stock" component={StockViewScreen} options={{ title: "📦 Ombor" }} /></S.Navigator>);
});
const ManagerAttendanceScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="FaceAtt" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID Davomat" }} /><S.Screen name="Attendance" component={AttendanceScreen} options={{ title: "✅ Davomat" }} /><S.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} /></S.Navigator>);
});
const ManagerTasksScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="MyTasks" component={EmployeeTasksScreen} options={{ title: "📋 Topshiriqlarim" }} /></S.Navigator>);
});

const ManagerTabs = React.memo(function ManagerTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Bosh sahifa" component={ManagerHomeScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Topshiriqlar" component={ManagerTasksScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="📋" focused={focused} /> }} />
      <Tab.Screen name="Davomat" component={ManagerAttendanceScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="✅" focused={focused} /> }} />
      <Tab.Screen name="Ishlab chiq." component={ManagerProductionScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏭" focused={focused} /> }} />
      <Tab.Screen name="Profil" component={ProfileStackNavigator} options={{ tabBarIcon: ({ focused }) => <TI emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
});

// Employee
const EmployeeDavomatScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="FaceAtt" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID Davomat" }} /><S.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} /></S.Navigator>);
});
const EmployeeTasksScreenNav = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="MyTasks" component={EmployeeTasksScreen} options={{ title: "📋 Topshiriqlarim" }} /></S.Navigator>);
});
const EmployeeReportScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="Report" component={AttendanceReportScreen} options={{ title: "📊 Davomat hisoboti" }} /></S.Navigator>);
});

const EmployeeTabs = React.memo(function EmployeeTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Bosh sahifa" component={HomeStackNavigator} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }} />
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
        {({ navigation }) => <HomeScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
      <S.Screen name="Profile" options={{ title: "Profil", headerLeft: () => <HeaderLogo /> }}>
        {({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}
      </S.Screen>
    </S.Navigator>
  );
});
const DriverDeliveryScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="Delivery" component={DeliveryScreen} options={{ title: "🚚 Yetkazish", headerShown: false }} /><S.Screen name="DeliveryMap" component={DeliveryMapScreen} options={{ title: "🗺️ Xarita" }} /></S.Navigator>);
});
const DriverDavomatScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="FaceAtt" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID" }} /><S.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} /></S.Navigator>);
});
const DriverOrdersScreen = React.memo(() => {
  const S = createNativeStackNavigator();
  return (<S.Navigator screenOptions={hdrOpts}><S.Screen name="Orders" component={OrdersScreen} options={{ title: "📋 Buyurtmalar" }} /></S.Navigator>);
});

const DriverTabs = React.memo(function DriverTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Bosh sahifa" component={DriverHomeScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Yetkazish" component={DriverDeliveryScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🚚" focused={focused} /> }} />
      <Tab.Screen name="Davomat" component={DriverDavomatScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="🤳" focused={focused} /> }} />
      <Tab.Screen name="Buyurtma" component={DriverOrdersScreen} options={{ tabBarIcon: ({ focused }) => <TI emoji="📋" focused={focused} /> }} />
      <Tab.Screen name="Profil" component={ProfileStackNavigator} options={{ tabBarIcon: ({ focused }) => <TI emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
});

// ===================== ROOT APP =====================
const MainScreen = React.memo(function MainScreen() {
  const role = useContext(RoleContext);
  if (role === "admin" || role === "owner") return <AdminTabs />;
  if (role === "manager" || role === "boshqaruvchi") return <ManagerTabs />;
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
          const r = await getUserRole();
          setRole(r);
        }
        setIsLoggedIn(!!token);
      } catch {
        setIsLoggedIn(false);
      }
    })();
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
