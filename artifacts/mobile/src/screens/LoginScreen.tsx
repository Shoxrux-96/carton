import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Animated, Dimensions,
} from "react-native";
import { apiFetch, setToken, setUser } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const handleLogin = async () => {
    const cleanPhone = phone.replace(/[\s\+\-\(\)]/g, "");
    if (!cleanPhone || cleanPhone.length < 9 || password.length < 4) {
      Alert.alert("Xatolik", "Telefon va parolni to'g'ri kiriting");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: cleanPhone, password }),
      });
      await setToken(data.token);
      await setUser(data.user);
      onLogin();
    } catch (e: any) {
      Alert.alert("Xatolik", e.message || "Server bilan bog'lanishda muammo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Background decorations */}
      <View style={styles.bgGradientTop} />
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Company branding - top */}
        <View style={styles.brandingTop}>
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>📦</Text>
          </View>
          <Text style={styles.companyName}>SHOVOT CARTON PAPER</Text>
          <Text style={styles.companySlogan}>Karton ishlab chiqarish korxonasi</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        <Text style={styles.loginTitle}>Tizimga kirish</Text>

        {/* Phone input */}
        <View style={[styles.inputWrapper, focusedInput === "phone" && styles.inputFocused]}>
          <Text style={styles.inputIcon}>📱</Text>
          <TextInput
            style={styles.input}
            placeholder="Telefon raqam"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            onFocus={() => setFocusedInput("phone")}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        {/* Password input */}
        <View style={[styles.inputWrapper, focusedInput === "password" && styles.inputFocused]}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Parol"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onFocus={() => setFocusedInput("password")}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        {/* Login button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Tizimga kirish</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.footer}>
          Shovot Carton Paper © 2024
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: colors.background, padding: spacing.xl,
  },
  bgGradientTop: {
    position: "absolute", top: 0, left: 0, right: 0, height: "45%",
    backgroundColor: "#f97316", borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40, opacity: 0.95,
  },
  bgCircle1: {
    position: "absolute", top: -50, right: -30, width: 200, height: 200,
    borderRadius: 100, backgroundColor: colors.primaryLight, opacity: 0.4,
  },
  bgCircle2: {
    position: "absolute", top: 80, left: -60, width: 160, height: 160,
    borderRadius: 80, backgroundColor: "#fb923c", opacity: 0.25,
  },
  bgCircle3: {
    position: "absolute", bottom: 60, right: -40, width: 120, height: 120,
    borderRadius: 60, backgroundColor: colors.primaryLight, opacity: 0.15,
  },
  card: {
    width: "100%", maxWidth: 380,
    backgroundColor: colors.surface, borderRadius: radius.xxl,
    padding: spacing.xxl, paddingTop: spacing.xl, ...shadows.lg,
  },
  brandingTop: { alignItems: "center", marginBottom: spacing.lg },
  logoWrap: {
    width: 72, height: 72, borderRadius: radius.xl,
    backgroundColor: colors.primary, justifyContent: "center",
    alignItems: "center", ...shadows.md, marginBottom: spacing.md,
  },
  logo: { fontSize: 36 },
  companyName: {
    fontSize: 18, fontWeight: "900", textAlign: "center",
    color: colors.text, letterSpacing: 1, textTransform: "uppercase",
  },
  companySlogan: {
    fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 4,
  },
  divider: {
    height: 1, backgroundColor: colors.border, marginVertical: spacing.lg,
  },
  loginTitle: {
    fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: spacing.lg,
  },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", height: 56,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceAlt, marginBottom: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary, backgroundColor: "#eef2ff",
  },
  inputIcon: { fontSize: 18, marginRight: spacing.sm },
  input: {
    flex: 1, fontSize: 16, color: colors.text, height: "100%",
  },
  button: {
    height: 56, backgroundColor: colors.primary, borderRadius: radius.lg,
    justifyContent: "center", alignItems: "center", marginTop: spacing.md,
    ...shadows.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  footer: {
    textAlign: "center", marginTop: spacing.xxl,
    fontSize: 12, color: colors.textMuted,
  },
});
