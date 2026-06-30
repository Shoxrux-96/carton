import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Image, Animated, Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { apiFetchFormData } from "../api";
import { colors, radius, shadows, spacing } from "../theme";

const { width } = Dimensions.get("window");
const BLINKS_REQUIRED = 3;

export default function FaceAttendanceScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [blinkCount, setBlinkCount] = useState(0);
  const [livenessOk, setLivenessOk] = useState(false);
  const cameraRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);

  const handleBlink = () => {
    if (livenessOk) return;
    // Animate eye close effect
    Animated.sequence([
      Animated.timing(blinkAnim, { toValue: 0.1, duration: 150, useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const newCount = blinkCount + 1;
    setBlinkCount(newCount);
    if (newCount >= BLINKS_REQUIRED) {
      setLivenessOk(true);
      setTimeout(() => autoCapture(), 600);
    }
  };

  const autoCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setPhoto(pic.uri);
      submitWithPhoto(pic.uri);
    } catch {}
  };

  const submitWithPhoto = async (uri: string) => {
    setLoading(true); setResult(null);
    try {
      let latitude: number | null = null, longitude: number | null = null;
      try {
        const Location = require("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: 4 });
          latitude = loc.coords.latitude; longitude = loc.coords.longitude;
        }
      } catch {}
      const formData = new FormData();
      formData.append("face", { uri, name: "face.jpg", type: "image/jpeg" } as any);
      if (latitude) formData.append("latitude", String(latitude));
      if (longitude) formData.append("longitude", String(longitude));
      const data = await apiFetchFormData("/face/attendance", formData);
      setResult(data);
    } catch (e: any) { setResult({ error: true, message: e.message }); }
    finally { setLoading(false); }
  };

  const resetAll = () => { setPhoto(null); setResult(null); setBlinkCount(0); setLivenessOk(false); };

  if (!permission) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!permission.granted) {
    return (
      <View style={s.permBox}>
        <View style={s.permIcon}><Text style={{ fontSize: 48 }}>📷</Text></View>
        <Text style={s.permTitle}>Kamera ruxsati kerak</Text>
        <Text style={s.permDesc}>Face ID davomat uchun kameraga ruxsat bering</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}><Text style={s.permBtnText}>Ruxsat berish</Text></TouchableOpacity>
      </View>
    );
  }

  // RESULT
  if (result) {
    const ok = result.success && !result.error;
    return (
      <View style={s.resultBox}>
        <View style={[s.resultCircle, { backgroundColor: ok ? "#f0fdf4" : "#fef2f2" }]}><Text style={{ fontSize: 56 }}>{ok ? "✅" : "❌"}</Text></View>
        <Text style={s.resultTitle}>{ok ? (result.alreadyMarked ? "Allaqachon o'tgan" : "Davomat belgilandi") : "Xatolik"}</Text>
        <Text style={s.resultMsg}>{result.message || ""}</Text>
        {ok && !result.alreadyMarked && (
          <View style={s.resultCard}>
            <View style={s.rRow}><Text style={s.rI}>👤</Text><Text style={s.rV}>{result.employee}</Text></View>
            <View style={s.rRow}><Text style={s.rI}>📅</Text><Text style={s.rV}>{new Date().toLocaleDateString("uz")}</Text></View>
            <View style={s.rRow}><Text style={s.rI}>⏰</Text><Text style={s.rV}>{result.time || new Date().toLocaleTimeString("uz")}</Text></View>
          </View>
        )}
        <TouchableOpacity style={s.retryBtn} onPress={resetAll}><Text style={s.retryText}>🔄 Qayta</Text></TouchableOpacity>
      </View>
    );
  }

  // LOADING
  if (loading) {
    return (
      <View style={s.loadBox}>
        {photo && <Image source={{ uri: photo }} style={s.loadImg} />}
        <View style={s.loadOv}><ActivityIndicator size="large" color="#fff" /><Text style={s.loadText}>Tekshirilmoqda...</Text></View>
      </View>
    );
  }

  // CAMERA
  return (
    <View style={s.camBox}>
      <CameraView ref={cameraRef} style={s.cam} facing="front" />

      {/* Overlay — tap anywhere to blink */}
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleBlink}>
        {/* Top instruction */}
        <View style={s.topSection}>
          <View style={s.instrCard}>
            <Text style={s.instrEmoji}>👁️</Text>
            <Text style={s.instrText}>
              {livenessOk
                ? "✅ Tasdiqlandi! Rasm olinmoqda..."
                : "Davomatdan o'tish uchun\nko'zingizni 3 marta oching-yuming"}
            </Text>
            <Text style={s.instrHint}>
              {livenessOk ? "" : "(Ekranga bosing yoki ko'z yuming)"}
            </Text>
          </View>
        </View>

        {/* Middle — face guide */}
        <View style={s.midSection}>
          <Animated.View style={[s.faceRing, { transform: [{ scale: scaleAnim }], borderColor: livenessOk ? "#22c55e" : colors.primary, opacity: blinkAnim }]} />
        </View>

        {/* Bottom — progress */}
        <View style={s.botSection}>
          <View style={s.dotsRow}>
            {Array.from({ length: BLINKS_REQUIRED }).map((_, i) => (
              <View key={i} style={[s.dot, i < blinkCount && s.dotOk]}>
                <Text style={s.dotText}>{i < blinkCount ? "✓" : ""}</Text>
              </View>
            ))}
          </View>
          <Text style={s.countText}>{blinkCount}/{BLINKS_REQUIRED}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  permBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, backgroundColor: colors.background },
  permIcon: { width: 100, height: 100, borderRadius: 30, backgroundColor: "#fff7ed", justifyContent: "center", alignItems: "center", marginBottom: 20, ...shadows.md },
  permTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8 },
  permDesc: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 28 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 14, borderRadius: radius.lg },
  permBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  camBox: { flex: 1, backgroundColor: "#000" },
  cam: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-between" },
  topSection: { paddingTop: 60, alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingBottom: 16 },
  instrCard: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  instrEmoji: { fontSize: 32, marginBottom: 6 },
  instrText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center", lineHeight: 22 },
  instrHint: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4 },
  midSection: { justifyContent: "center", alignItems: "center" },
  faceRing: { width: 240, height: 300, borderRadius: 120, borderWidth: 4, borderStyle: "dashed" },
  botSection: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingVertical: 30 },
  dotsRow: { flexDirection: "row", gap: 16, marginBottom: 10 },
  dot: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", justifyContent: "center", alignItems: "center" },
  dotOk: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  dotText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  countText: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600" },
  loadBox: { flex: 1, backgroundColor: "#000" },
  loadImg: { flex: 1, resizeMode: "cover", opacity: 0.3 },
  loadOv: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  loadText: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 14 },
  resultBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, backgroundColor: colors.background },
  resultCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: "center", alignItems: "center", marginBottom: 20, ...shadows.md },
  resultTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8 },
  resultMsg: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginBottom: 20 },
  resultCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: "100%", ...shadows.sm, marginBottom: 20 },
  rRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  rI: { fontSize: 18 }, rV: { fontSize: 15, fontWeight: "600", color: colors.text },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  retryText: { fontSize: 14, fontWeight: "600", color: colors.text },
});
