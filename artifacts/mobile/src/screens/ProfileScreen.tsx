import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch, getUser, clearToken, setUser } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { useI18n } from "../i18n";
import AppLogo from "../components/AppLogo";
import { faceImageKey, getCachedFaceImage, syncUserProfile } from "../lib/employee-profile";

function roleLabel(role?: string | null) {
  if (role === "admin") return "👑 Admin";
  if (role === "owner") return "👑 Egasi";
  if (role === "manager" || role === "boshqaruvchi") return "👔 Boshqaruvchi";
  if (role === "driver" || role === "haydovchi") return "🚗 Haydovchi";
  return "👷 Xodim";
}

interface Props {
  navigation: any;
  onLogout: () => void;
}

export default function ProfileScreen({ navigation, onLogout }: Props) {
  const { t, lang, setLang } = useI18n();
  const [user, setUserState] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [faceImg, setFaceImg] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const profile = await syncUserProfile();
    if (profile) {
      setUserState(profile);
      setPhone(profile.phone || "");
      setFaceImg(profile.faceImage ?? null);
      return;
    }
    const u = await getUser();
    setUserState(u);
    setPhone(u?.phone || "");
    const cached = await getCachedFaceImage();
    setFaceImg(cached);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const body: any = {};
      if (phone !== user?.phone) body.phone = phone;
      if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }
      const res = await apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify(body) });
      if (res.user) await setUser(res.user);
      Alert.alert("Muvaffaqiyat", "Ma'lumotlar yangilandi");
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Xatolik", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearToken();
    onLogout();
  };

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.avatarSection, { marginTop: spacing.xl }]}>
        <View style={styles.avatarRing}>
          {isAdmin ? (
            <View style={styles.avatarLogoWrap}>
              <AppLogo size={108} />
            </View>
          ) : faceImg ? (
            <Image key={faceImageKey(faceImg)} source={{ uri: faceImg }} style={styles.avatarPhoto} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || user?.phone?.slice(-2) || "U"}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{user?.name || user?.phone || "Foydalanuvchi"}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{roleLabel(user?.role)}</Text>
        </View>
        {user?.position ? (
          <Text style={styles.positionText}>{user.position}</Text>
        ) : null}
      </View>

      {/* Info cards */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shaxsiy ma'lumotlar</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>📱 Telefon</Text>
          {editing ? (
            <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          ) : (
            <Text style={styles.fieldValue}>{user?.phone || "—"}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>🏷️ Rol</Text>
          <Text style={styles.fieldValue}>{roleLabel(user?.role)}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>💼 Lavozim</Text>
          <Text style={styles.fieldValue}>{user?.position || "—"}</Text>
        </View>

        {editing && (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>🔑 Joriy parol</Text>
              <TextInput style={styles.fieldInput} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Joriy parol" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>🔐 Yangi parol</Text>
              <TextInput style={styles.fieldInput} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Yangi parol" placeholderTextColor={colors.textMuted} />
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      {editing ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Saqlash</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
            <Text style={styles.cancelBtnText}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
          <Text style={styles.editBtnText}>✏️ Tahrirlash</Text>
        </TouchableOpacity>
      )}

      {/* Language */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌐 {t("language")}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity style={[styles.langBtn, lang === "uz" && styles.langBtnActive]} onPress={() => setLang("uz")}>
            <Text style={[styles.langBtnText, lang === "uz" && { color: "#fff" }]}>🇺🇿 {t("uzbek")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, lang === "ru" && styles.langBtnActive]} onPress={() => setLang("ru")}>
            <Text style={[styles.langBtnText, lang === "ru" && { color: "#fff" }]}>🇷🇺 {t("russian")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>🚪 {t("logout")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 60 },
  topHeader: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xxl,
  },
  avatarSection: { alignItems: "center", marginBottom: spacing.xxl },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    ...shadows.md,
    marginBottom: spacing.lg,
  },
  avatarLarge: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 44, fontWeight: "800", color: "#fff" },
  avatarPhoto: { width: 120, height: 120, borderRadius: 60 },
  avatarLogoWrap: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "#fff", justifyContent: "center", alignItems: "center",
    overflow: "hidden",
  },
  name: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center" },
  rolePill: {
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: radius.full, marginTop: spacing.sm,
  },
  roleText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  positionText: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 6 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, ...shadows.sm, marginBottom: spacing.lg,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  fieldValue: { fontSize: 16, fontWeight: "500", color: colors.text },
  fieldInput: {
    height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, fontSize: 16, color: colors.text, backgroundColor: colors.surfaceAlt,
  },
  actions: { flexDirection: "row", gap: 12, marginBottom: spacing.lg },
  saveBtn: {
    flex: 1, height: 50, backgroundColor: colors.primary, borderRadius: radius.lg,
    justifyContent: "center", alignItems: "center", ...shadows.sm,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelBtn: {
    flex: 1, height: 50, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
    justifyContent: "center", alignItems: "center",
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  editBtn: {
    height: 50, backgroundColor: colors.surface, borderRadius: radius.lg,
    justifyContent: "center", alignItems: "center", borderWidth: 1.5,
    borderColor: colors.primary, marginBottom: spacing.lg,
  },
  editBtnText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  logoutBtn: {
    height: 50, backgroundColor: "#fef2f2", borderRadius: radius.lg,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#fecaca",
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: "600" },
  langBtn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: colors.border },
  langBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langBtnText: { fontSize: 14, fontWeight: "600", color: colors.text },
});
