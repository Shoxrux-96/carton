import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, StatusBar, Text } from "react-native";
import { getToken, getUserRole } from "./src/api";
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const hdrOpts = { headerStyle: { backgroundColor: colors.primary }, headerTintColor: "#fff", headerTitleStyle: { fontWeight: "700" as const }, animation: "slide_from_right" as const };

function TI({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (<View style={{ alignItems: "center", paddingTop: 4 }}><View style={{ width: focused ? 42 : 34, height: focused ? 42 : 34, borderRadius: focused ? 13 : 11, backgroundColor: focused ? colors.primary + "15" : "transparent", justifyContent: "center", alignItems: "center" }}><Text style={{ fontSize: focused ? 21 : 18 }}>{emoji}</Text></View></View>);
}

const tabStyle = { height: 90, paddingBottom: 30, paddingTop: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f5f5f4", elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16 };

// ===================== ADMIN TABS =====================
function AdminHome({ onLogout }: { onLogout: () => void }) {
  return (<Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="H" options={{ headerShown: false }}>{({ navigation }) => <HomeScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen><Stack.Screen name="Profile" options={{ title: "Profil" }}>{({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen></Stack.Navigator>);
}
function AdminOrders() {
  return (<Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="OrdersList" component={OrdersScreen} options={{ title: "📋 Buyurtmalar" }} /><Stack.Screen name="Sales" component={SalesScreen} options={{ title: "📊 Savdo" }} /><Stack.Screen name="Delivery" component={DeliveryScreen} options={{ title: "🚚 Yetkazish", headerShown: false }} /><Stack.Screen name="DeliveryMap" component={DeliveryMapScreen} options={{ title: "🗺️ Xarita" }} /><Stack.Screen name="Clients" component={ClientsScreen} options={{ title: "🏢 Mijozlar" }} /></Stack.Navigator>);
}
function AdminProduction() {
  return (<Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="ProdMain" component={ProductionScreen} options={{ title: "🏭 Ishlab chiqarish" }} /><Stack.Screen name="Products" component={ProductsScreen} options={{ title: "📦 Mahsulotlar" }} /><Stack.Screen name="Stock" component={StockViewScreen} options={{ title: "📦 Ombor" }} /></Stack.Navigator>);
}
function AdminHR() {
  return (<Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="Employees" component={EmployeesScreen} options={{ title: "👥 Hodimlar" }} /><Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: "✅ Davomat" }} /><Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} /><Stack.Screen name="FaceAttendance" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID" }} /><Stack.Screen name="FaceRegister" component={FaceRegisterScreen} options={{ title: "📸 Yuz ro'yxati" }} /></Stack.Navigator>);
}
function AdminFinance() {
  return (<Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="Fin" component={FinanceScreen} options={{ title: "💰 Moliya" }} /></Stack.Navigator>);
}
function AdminTabs({ onLogout }: { onLogout: () => void }) {
  return (<Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: tabStyle, tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: -2 }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: "#94a3b8" }}>
    <Tab.Screen name="Bosh sahifa" options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }}>{() => <AdminHome onLogout={onLogout} />}</Tab.Screen>
    <Tab.Screen name="Buyurtma" component={AdminOrders} options={{ tabBarIcon: ({ focused }) => <TI emoji="📋" focused={focused} /> }} />
    <Tab.Screen name="Ishlab chiq." component={AdminProduction} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏭" focused={focused} /> }} />
    <Tab.Screen name="HR" component={AdminHR} options={{ tabBarIcon: ({ focused }) => <TI emoji="👥" focused={focused} /> }} />
    <Tab.Screen name="Moliya" component={AdminFinance} options={{ tabBarIcon: ({ focused }) => <TI emoji="💰" focused={focused} /> }} />
  </Tab.Navigator>);
}

// ===================== BOSHQARUVCHI (Manager) TABS =====================
function ManagerHome({ onLogout }: { onLogout: () => void }) {
  return (<Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="H" options={{ headerShown: false }}>{({ navigation }) => <HomeScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen><Stack.Screen name="Profile" options={{ title: "Profil" }}>{({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen><Stack.Screen name="FaceAttendance" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID" }} /></Stack.Navigator>);
}
function ManagerProduction() {
  return (<Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="ProdMain" component={ProductionScreen} options={{ title: "🏭 Ishlab chiqarish" }} /><Stack.Screen name="Products" component={ProductsScreen} options={{ title: "📦 Mahsulotlar" }} /><Stack.Screen name="Stock" component={StockViewScreen} options={{ title: "📦 Ombor" }} /></Stack.Navigator>);
}
function ManagerAttendance() {
  return (<Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="FaceAtt" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID Davomat" }} /><Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: "✅ Davomat" }} /><Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} /></Stack.Navigator>);
}
function ManagerTabs({ onLogout }: { onLogout: () => void }) {
  return (<Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: tabStyle, tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: -2 }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: "#94a3b8" }}>
    <Tab.Screen name="Bosh sahifa" options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }}>{() => <ManagerHome onLogout={onLogout} />}</Tab.Screen>
    <Tab.Screen name="Davomat" component={ManagerAttendance} options={{ tabBarIcon: ({ focused }) => <TI emoji="✅" focused={focused} /> }} />
    <Tab.Screen name="Ishlab chiq." component={ManagerProduction} options={{ tabBarIcon: ({ focused }) => <TI emoji="🏭" focused={focused} /> }} />
    <Tab.Screen name="Profil" options={{ tabBarIcon: ({ focused }) => <TI emoji="👤" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="Prof" options={{ title: "Profil" }}>{({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen></Stack.Navigator>}</Tab.Screen>
  </Tab.Navigator>);
}

// ===================== ODDIY HODIM (Employee) TABS =====================
function EmployeeTabs({ onLogout }: { onLogout: () => void }) {
  return (<Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: tabStyle, tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: -2 }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: "#94a3b8" }}>
    <Tab.Screen name="Bosh sahifa" options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="H" options={{ headerShown: false }}>{({ navigation }) => <HomeScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen><Stack.Screen name="Profile" options={{ title: "Profil" }}>{({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen></Stack.Navigator>}</Tab.Screen>
    <Tab.Screen name="Davomat" options={{ tabBarIcon: ({ focused }) => <TI emoji="🤳" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="FaceAtt" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID Davomat" }} /><Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} /></Stack.Navigator>}</Tab.Screen>
    <Tab.Screen name="Hisobot" options={{ tabBarIcon: ({ focused }) => <TI emoji="📊" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="Report" component={AttendanceReportScreen} options={{ title: "📊 Davomat hisoboti" }} /></Stack.Navigator>}</Tab.Screen>
    <Tab.Screen name="Profil" options={{ tabBarIcon: ({ focused }) => <TI emoji="👤" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="Prof" options={{ title: "Profil" }}>{({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen></Stack.Navigator>}</Tab.Screen>
  </Tab.Navigator>);
}

// ===================== HAYDOVCHI (Driver) TABS =====================
function DriverTabs({ onLogout }: { onLogout: () => void }) {
  return (<Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: tabStyle, tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: -2 }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: "#94a3b8" }}>
    <Tab.Screen name="Bosh sahifa" options={{ tabBarIcon: ({ focused }) => <TI emoji="🏠" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="H" options={{ headerShown: false }}>{({ navigation }) => <HomeScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen><Stack.Screen name="Profile" options={{ title: "Profil" }}>{({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen></Stack.Navigator>}</Tab.Screen>
    <Tab.Screen name="Yetkazish" options={{ tabBarIcon: ({ focused }) => <TI emoji="🚚" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="Delivery" component={DeliveryScreen} options={{ title: "🚚 Yetkazish", headerShown: false }} /><Stack.Screen name="DeliveryMap" component={DeliveryMapScreen} options={{ title: "🗺️ Xarita" }} /></Stack.Navigator>}</Tab.Screen>
    <Tab.Screen name="Davomat" options={{ tabBarIcon: ({ focused }) => <TI emoji="🤳" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="FaceAtt" component={FaceAttendanceScreen} options={{ title: "🤳 Face ID" }} /><Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ title: "📊 Hisobot" }} /></Stack.Navigator>}</Tab.Screen>
    <Tab.Screen name="Buyurtma" options={{ tabBarIcon: ({ focused }) => <TI emoji="📋" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="Orders" component={OrdersScreen} options={{ title: "📋 Buyurtmalar" }} /></Stack.Navigator>}</Tab.Screen>
    <Tab.Screen name="Profil" options={{ tabBarIcon: ({ focused }) => <TI emoji="👤" focused={focused} /> }}>{() => <Stack.Navigator screenOptions={hdrOpts}><Stack.Screen name="Prof" options={{ title: "Profil" }}>{({ navigation }) => <ProfileScreen navigation={navigation} onLogout={onLogout} />}</Stack.Screen></Stack.Navigator>}</Tab.Screen>
  </Tab.Navigator>);
}

// ===================== ROOT APP =====================
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        const r = await getUserRole();
        setRole(r);
      }
      setIsLoggedIn(!!token);
    })();
  }, []);

  const handleLogin = async () => {
    const r = await getUserRole();
    setRole(r);
    setIsLoggedIn(true);
  };

  const handleLogout = () => { setIsLoggedIn(false); setRole(null); };

  if (isLoggedIn === null) {
    return (<View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>);
  }

  const renderMain = () => {
    if (role === "admin" || role === "owner") return <AdminTabs onLogout={handleLogout} />;
    if (role === "manager" || role === "boshqaruvchi") return <ManagerTabs onLogout={handleLogout} />;
    if (role === "driver" || role === "haydovchi") return <DriverTabs onLogout={handleLogout} />;
    return <EmployeeTabs onLogout={handleLogout} />;
  };

  return (
    <I18nProvider>
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#ea580c" />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main">{renderMain}</Stack.Screen>
        ) : (
          <Stack.Screen name="Login">{() => <LoginScreen onLogin={handleLogin} />}</Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </I18nProvider>
  );
}
