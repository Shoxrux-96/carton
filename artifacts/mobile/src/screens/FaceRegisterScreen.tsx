import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Image, ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { apiFetch, apiFetchFormData } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

export default function FaceRegisterScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [result, setResult] = useState<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await apiFetch("/employees");
      setEmployees(Array.isArray(data) ? data.filter((e: any) => e.status === "active") : []);
    } catch {}
  };

  if (!permission) return <View style={styles.container}><ActivityIndicator color={colors.primary} /></View>;

  if (showCamera && !permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permIcon}>📸</Text>
        <Text style={styles.permTitle}>Kamera ruxsati</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Ruxsat berish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const pic = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    setPhoto(pic.uri);
    setShowCamera(false);
  };

  const submitFace = async () => {
    if (!photo || !selectedEmployee) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("face", {
        uri: photo,
        name: "face.jpg",
        type: "image/jpeg",
      } as any);

      const data = await apiFetchFormData(`/face/register/${selectedEmployee.id}`, formData);
      setResult(data);
      Alert.alert("Muvaffaqiyat", `${selectedEmployee.name} uchun yuz ro'yxatdan o'tkazildi ✅`);
      setPhoto(null);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (e: any) {
      Alert.alert("Xatolik", e.message || "Yuz aniqlanmadi");
    } finally {
      setLoading(false);
    }
  };

  // Camera view
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          <View style={styles.cameraOverlay}>
            <View style={styles.faceCircle} />
            <Text style={styles.cameraText}>Xodimning yuzini to'g'ri joylang</Text>
          </View>
        </CameraView>
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
            <Text style={styles.cancelText}>❌ Bekor</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
          <View style={{ width: 60 }} />
        </View>
      </View>
    );
  }

  // Employee selection + photo
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🤳</Text>
        <Text style={styles.headerTitle}>Yuz ro'yxatdan o'tkazish</Text>
        <Text style={styles.headerDesc}>Xodimni tanlang va kamera orqali yuzini ro'yxatdan o'tkazing</Text>
      </View>

      {/* Selected employee + photo preview */}
      {selectedEmployee && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedRow}>
            <View style={styles.empAvatar}>
              <Text style={styles.empAvatarText}>{selectedEmployee.name?.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.empName}>{selectedEmployee.name}</Text>
              <Text style={styles.empPos}>{selectedEmployee.position || "Xodim"}</Text>
            </View>
            {selectedEmployee.faceDescriptor && (
              <View style={styles.registeredBadge}>
                <Text style={styles.registeredText}>✅ Ro'yxatda</Text>
              </View>
            )}
          </View>

          {photo ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photo }} style={styles.photoImage} />
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.retakeBtn} onPress={() => setShowCamera(true)}>
                  <Text style={styles.retakeText}>🔄 Qayta olish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={submitFace} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>✅ Saqlash</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.takePhotoBtn} onPress={() => setShowCamera(true)}>
              <Text style={styles.takePhotoBtnText}>📸 Rasm olish</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Employee list */}
      <Text style={styles.listTitle}>Xodimlar ({employees.length})</Text>
      {employees.map((emp) => (
        <TouchableOpacity
          key={emp.id}
          style={[styles.empCard, selectedEmployee?.id === emp.id && styles.empCardSelected]}
          onPress={() => { setSelectedEmployee(emp); setPhoto(null); }}
        >
          <View style={styles.empCardAvatar}>
            <Text style={styles.empCardAvatarText}>{emp.name?.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.empCardName}>{emp.name}</Text>
            <Text style={styles.empCardPos}>{emp.position || "—"}</Text>
          </View>
          {emp.faceDescriptor ? (
            <Text style={styles.faceStatus}>✅</Text>
          ) : (
            <Text style={styles.faceStatusNo}>⚠️</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  permContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  permIcon: { fontSize: 48, marginBottom: 12 },
  permTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.lg },
  permBtnText: { color: "#fff", fontWeight: "700" },
  header: { alignItems: "center", marginBottom: spacing.xxl },
  headerIcon: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  headerDesc: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 4 },
  selectedCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl, ...shadows.md, borderWidth: 2, borderColor: colors.primary },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.md },
  empAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryLight, justifyContent: "center", alignItems: "center" },
  empAvatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  empName: { fontSize: 16, fontWeight: "700", color: colors.text },
  empPos: { fontSize: 12, color: colors.textMuted },
  registeredBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  registeredText: { fontSize: 11, color: "#16a34a", fontWeight: "600" },
  photoPreview: { marginTop: spacing.md },
  photoImage: { width: "100%", height: 200, borderRadius: radius.lg, marginBottom: spacing.md },
  photoActions: { flexDirection: "row", gap: 12 },
  retakeBtn: { flex: 1, height: 46, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  retakeText: { fontSize: 14, fontWeight: "600", color: colors.text },
  submitBtn: { flex: 1, height: 46, backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  takePhotoBtn: { height: 52, backgroundColor: colors.primary, borderRadius: radius.lg, justifyContent: "center", alignItems: "center", marginTop: spacing.sm },
  takePhotoBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  listTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  empCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm },
  empCardSelected: { borderWidth: 2, borderColor: colors.primary },
  empCardAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#eef2ff", justifyContent: "center", alignItems: "center" },
  empCardAvatarText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  empCardName: { fontSize: 14, fontWeight: "600", color: colors.text },
  empCardPos: { fontSize: 12, color: colors.textMuted },
  faceStatus: { fontSize: 18 },
  faceStatusNo: { fontSize: 18 },
  // Camera
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  faceCircle: { width: 220, height: 280, borderRadius: 110, borderWidth: 3, borderColor: colors.primary, borderStyle: "dashed" },
  cameraText: { color: "#fff", marginTop: 16, fontSize: 14, fontWeight: "600" },
  cameraControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 30, paddingVertical: 24, backgroundColor: "#000" },
  cancelBtn: { width: 60, height: 44, justifyContent: "center", alignItems: "center" },
  cancelText: { color: "#fff", fontSize: 14 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#fff", justifyContent: "center", alignItems: "center" },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
});
