import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, getUser, clearToken, setUser } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { useI18n } from "../i18n";
import { faceImageKey, getCachedFaceImage, syncUserProfile } from "../lib/employee-profile";

function roleLabel(role?: string | null) {
  if (role === "admin") return "👑 Admin";
  if (role === "owner") return "👑 Egasi";
  if (role === "manager" || role === "boshqaruvchi") return "👔 Boshqaruvchi";
  if (role === "driver" || role === "haydovchi") return "🚗 Haydovchi";
  return "👷 Xodim";
}

// 998901111004 → +998 90 111 10 04
function fmtPhone(p?: string | null) {
  const d = String(p || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("998")) {
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
  }
  if (d.length === 9) {
    return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }
  return p || "—";
}

interface Props {
  navigation: any;
  onLogout: () => void;
}

export default function ProfileScreen({ navigation, onLogout }: Props) {
  const { t } = useI18n();
  const [user, setUserState] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [faceImg, setFaceImg] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoOk, setPhotoOk] = useState(false);

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

  // Rasm tanlash → xodim (haydovchi) profiliga saqlash → avatar yangilanadi
  const pickPhoto = async () => {
    const employeeId = user?.employeeId;
    if (!employeeId) {
      Alert.alert("Xatolik", "Sizga bog'langan xodim topilmadi");
      return;
    }
    try {
      setPhotoOk(false);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Ruxsat etilmagan", "Rasm tanlash uchun galeriya ruxsati kerak");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;

      setUploadingPhoto(true);
      let dataUrl = asset.base64
        ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
        : null;
      if (!dataUrl && asset.uri) {
        // fallback: URI → base64
        try {
          const blob = await (await fetch(asset.uri)).blob();
          dataUrl = await new Promise<string | null>(resolve => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => resolve(null);
            fr.readAsDataURL(blob);
          });
        } catch {}
      }
      if (!dataUrl) {
        Alert.alert("Xatolik", "Rasmni o'qib bo'lmadi");
        return;
      }

      await apiFetch(`/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify({ photo: dataUrl }),
      });
      const p = await syncUserProfile();
      if (p) {
        setUserState(p);
        setFaceImg(p.faceImage ?? null);
      }
      setPhotoOk(true);
      Alert.alert("Tayyor", "Profil rasmi yangilandi");
    } catch (e: any) {
      Alert.alert("Xatolik", e.message || "Rasmni yuklab bo'lmadi");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      
      <View style={[styles.avatarSection, { marginTop: spacing.xl }]}>
        <View style={styles.avatarRing}>
          {faceImg ? (
            <Image key={faceImageKey(faceImg)} source={{ uri: faceImg }} style={styles.avatarPhoto} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || user?.phone?.slice(-2) || "U"}
              </Text>
            </View>
          )}
          {/* Rasmni o'zgartirish tugmasi */}
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} disabled={uploadingPhoto} activeOpacity={0.8}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.photoBtnTxt}>📷</Text>
            )}
          </TouchableOpacity>
        </View>
        {photoOk && (
          <Text style={styles.photoOkTxt}>✓ Profil rasmi yangilandi</Text>
        )}
        {user?.name ? (
          <Text style={styles.nameText}>{user.name}</Text>
        ) : null}
        {user?.position ? (
          <Text style={styles.positionText}>💼 {user.position}</Text>
        ) : null}
      </View>

      {/* Info cards */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shaxsiy ma'lumotlar</Text>

        {/* 👤 Ism familiya */}
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: "#dbeafe" }]}>
            <Text style={styles.infoIconTxt}>👤</Text>
          </View>
          <View style={styles.infoTexts}>
            <Text style={styles.infoLabel}>Ism familiya</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{user?.name || "—"}</Text>
          </View>
        </View>

        {/* 📱 Telefon */}
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: "#f0fdf4" }]}>
            <Text style={styles.infoIconTxt}>📱</Text>
          </View>
          <View style={styles.infoTexts}>
            <Text style={styles.infoLabel}>Telefon raqami</Text>
            {editing ? (
              <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            ) : (
              <Text style={styles.infoValue}>{fmtPhone(user?.phone)}</Text>
            )}
          </View>
        </View>

        {/* 💼 Lavozim */}
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: "#fff7ed" }]}>
            <Text style={styles.infoIconTxt}>💼</Text>
          </View>
          <View style={styles.infoTexts}>
            <Text style={styles.infoLabel}>Lavozim</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{user?.position || "—"}</Text>
          </View>
        </View>

        {/* 🚗 Rol */}
        <View style={[styles.infoRow, styles.infoRowLast]}>
          <View style={[styles.infoIcon, { backgroundColor: "#f5f3ff" }]}>
            <Text style={styles.infoIconTxt}>🚗</Text>
          </View>
          <View style={styles.infoTexts}>
            <Text style={styles.infoLabel}>Rol</Text>
            <Text style={styles.infoValue}>
              {user?.role === "driver" || /haydovchi/i.test(String(user?.position || ""))
                ? "Haydovchi"
                : roleLabel(user?.role)}
            </Text>
          </View>
        </View>

        {editing && (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>🔑 Joriy parol</Text>
              <TextInput style={styles.fieldInput} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Joriy parol" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Yangi parol</Text>
              <TextInput style={styles.fieldInput} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Yangi parol" placeholderTextColor={colors.textMuted} />
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      {editing ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Saqlash</Text>}
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

      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>🚪 {t("logout")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background },
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
  photoBtn: {
    position: "absolute", right: -2, bottom: -2,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  photoBtnTxt: { fontSize: 15 },
  photoOkTxt: { color: "#16a34a", fontSize: 13, fontWeight: "600", marginTop: spacing.sm },
  nameText: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: spacing.sm, textAlign: "center" },
  positionText: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: 4, textAlign: "center" },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, ...shadows.sm, marginBottom: spacing.lg,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  infoRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  infoIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  infoIconTxt: { fontSize: 17, lineHeight: 19 },
  infoTexts: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  infoValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  field: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  fieldValue: { fontSize: 16, fontWeight: "500", color: colors.text },
  fieldInput: {
    height: 40, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, fontSize: 14, fontWeight: "600", color: colors.text,
    backgroundColor: colors.surfaceAlt,
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
});
