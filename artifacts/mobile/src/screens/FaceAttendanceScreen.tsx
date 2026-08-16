import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Animated, Dimensions, Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import { apiFetchFormData, apiFetch, getUser } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { useBlinkLiveness } from "../hooks/useBlinkLiveness";
import { useI18n } from "../i18n";

const { width, height } = Dimensions.get("window");
const OVAL_W = width * 0.62;
const OVAL_H = OVAL_W * 1.28;

type FaceSetupStatus = "loading" | "ready" | "no_photo" | "no_system_faces";

function normalizePhone(phone?: string | null) {
  return (phone || "").replace(/[\s+\-()]/g, "");
}

function EyeIcon({ closed, active }: { closed: boolean; active: boolean }) {
  return (
    <View style={[eyeStyles.eye, active && eyeStyles.eyeActive]}>
      <View style={[eyeStyles.lid, closed && eyeStyles.lidClosed]} />
      {!closed && <View style={eyeStyles.pupil} />}
    </View>
  );
}

export default function FaceAttendanceScreen() {
  const { t } = useI18n();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceSetup, setFaceSetup] = useState<FaceSetupStatus>("loading");
  const [employeeName, setEmployeeName] = useState<string>("");
  const cameraRef = useRef<any>(null);
  const capturingRef = useRef(false);
  const ringPulse = useRef(new Animated.Value(0)).current;
  const scanLine = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(1)).current;

  const active = isFocused && faceSetup === "ready" && !photo && !loading && !result;
  const {
    phase,
    blinkCount,
    blinksRequired,
    statusText,
    proof,
    reset: resetLiveness,
    isVerified,
    isScanning,
    previewUri,
    eyeState,
  } = useBlinkLiveness(cameraRef, cameraReady, active);

  const checkFaceSetup = useCallback(async () => {
    setFaceSetup("loading");
    try {
      const user = await getUser();
      const phone = normalizePhone(user?.phone);
      const employees = await apiFetch<any[]>("/employees");
      const list = Array.isArray(employees) ? employees : [];

      const withFace = list.filter((e) => e.faceDescriptor && e.status === "active");
      if (withFace.length === 0) {
        setFaceSetup("no_system_faces");
        return;
      }

      const me = list.find(
        (e) => normalizePhone(e.loginPhone) === phone || normalizePhone(e.phone) === phone,
      );

      if (!me?.faceDescriptor) {
        setEmployeeName(me?.name || user?.phone || "");
        setFaceSetup("no_photo");
        return;
      }

      setEmployeeName(me.name || "");
      setFaceSetup("ready");
    } catch {
      setFaceSetup("no_system_faces");
    }
  }, []);

  useEffect(() => {
    if (isFocused) void checkFaceSetup();
  }, [isFocused, checkFaceSetup]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, [ringPulse]);

  useEffect(() => {
    if (!isScanning) {
      scanLine.setValue(0);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [isScanning, scanLine]);

  useEffect(() => {
    if (blinkCount > 0) {
      Animated.sequence([
        Animated.spring(successScale, { toValue: 1.15, useNativeDriver: true, friction: 4 }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]).start();
    }
  }, [blinkCount, successScale]);

  useEffect(() => {
    if (!isFocused) {
      capturingRef.current = false;
    }
  }, [isFocused]);

  useEffect(() => {
    if (isVerified && proof && !capturingRef.current && isFocused) {
      capturingRef.current = true;
      void autoCapture(proof);
    }
  }, [isVerified, proof, isFocused]);

  const autoCapture = async (livenessProof: NonNullable<typeof proof>) => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8, shutterSound: false });
      setPhoto(pic.uri);
      await submitWithPhoto(pic.uri, livenessProof);
    } catch {
      setResult({ error: true, message: "Rasm olishda xatolik. Qayta urinib ko'ring" });
      capturingRef.current = false;
    }
  };

  const submitWithPhoto = async (uri: string, livenessProof: NonNullable<typeof proof>) => {
    setLoading(true);
    setResult(null);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const Location = require("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: 4 });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch {}

      const formData = new FormData();
      formData.append("face", { uri, name: "face.jpg", type: "image/jpeg" } as any);
      formData.append("livenessProof", JSON.stringify(livenessProof));
      if (latitude) formData.append("latitude", String(latitude));
      if (longitude) formData.append("longitude", String(longitude));

      const data = await apiFetchFormData("/face/attendance", formData);
      setResult(data);
    } catch (e: any) {
      setResult({ error: true, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setPhoto(null);
    setResult(null);
    capturingRef.current = false;
    resetLiveness();
  };

  const ringColor =
    phase === "verified" ? colors.success
      : phase === "blink" ? colors.primary
        : phase === "hold_still" ? colors.warning
          : "rgba(255,255,255,0.85)";

  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const scanY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, OVAL_H - 4] });

  if (faceSetup === "loading") {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.permDesc, { marginTop: 16 }]}>Tekshirilmoqda...</Text>
      </View>
    );
  }

  if (faceSetup === "no_photo" || faceSetup === "no_system_faces") {
    return (
      <View style={s.permBox}>
        <View style={s.permIcon}><Text style={s.permEmoji}>📸</Text></View>
        <Text style={s.permTitle}>{t("faceNotRegisteredTitle")}</Text>
        <Text style={s.permDesc}>
          {faceSetup === "no_system_faces"
            ? t("faceSystemEmpty")
            : t("faceNotRegisteredDesc")}
        </Text>
        {employeeName ? (
          <Text style={s.employeeName}>{employeeName}</Text>
        ) : null}
        <Text style={s.permHint}>{t("faceNotRegisteredHint")}</Text>
        <TouchableOpacity style={s.permBtn} onPress={() => void checkFaceSetup()}>
          <Text style={s.permBtnText}>🔄 {t("checkAgain")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={s.permBox}>
        <View style={s.permIcon}><Text style={s.permEmoji}>📷</Text></View>
        <Text style={s.permTitle}>{t("cameraPermission")}</Text>
        <Text style={s.permDesc}>{t("cameraPermDesc")}</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>{t("grantPermission")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={s.permBox}>
        <Text style={s.permEmoji}>📱</Text>
        <Text style={s.permTitle}>Face ID faqat telefonda</Text>
        <Text style={s.permDesc}>Expo Go yoki APK orqali telefonda oching.</Text>
      </View>
    );
  }

  if (result) {
    const ok = result.success && !result.error;
    return (
      <View style={s.resultBox}>
        <View style={[s.resultCircle, { backgroundColor: ok ? "#ecfdf5" : "#fef2f2" }]}>
          <Text style={s.resultEmoji}>{ok ? "✅" : "❌"}</Text>
        </View>
        <Text style={s.resultTitle}>
          {ok ? (result.alreadyMarked ? t("alreadyMarked") : t("attendanceMarked")) : t("error")}
        </Text>
        <Text style={s.resultMsg}>{result.message || ""}</Text>
        {ok && !result.alreadyMarked && (
          <View style={s.resultCard}>
            <InfoRow icon="👤" value={result.employee} />
            <InfoRow icon="📅" value={new Date().toLocaleDateString("uz")} />
            <InfoRow icon="⏰" value={result.time || new Date().toLocaleTimeString("uz")} />
          </View>
        )}
        <TouchableOpacity style={s.retryBtn} onPress={resetAll}>
          <Text style={s.retryText}>🔄 {t("retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.loadBox}>
        {photo && <Image source={{ uri: photo }} style={s.loadImg} />}
        <View style={s.loadOv}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadTitle}>{t("faceAnalyzing")}</Text>
          <Text style={s.loadSub}>Yuz va hayotilik tekshirilmoqda...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        animateShutter={false}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Flash oldini olish: skaner vaqtida oldingi kadr ko'rsatiladi */}
      {isScanning && previewUri ? (
        <Image source={{ uri: previewUri }} style={s.freezeFrame} />
      ) : null}

      {/* Vignette — markazda oval yuz maydoni */}
      <View style={s.vignetteTop} />
      <View style={s.vignetteBottom} />
      <View style={s.vignetteLeft} />
      <View style={s.vignetteRight} />

      <View style={s.content} pointerEvents="none">
        <View style={s.header}>
          <Text style={s.headerBadge}>Face ID</Text>
          <Text style={s.headerTitle}>Davomat</Text>
          <Text style={s.headerSub}>Jonli inson tekshiruvi</Text>
        </View>

        <View style={s.ovalWrap}>
          <Animated.View style={[s.ovalRing, { borderColor: ringColor, transform: [{ scale: ringScale }] }]}>
            {isScanning && (
              <Animated.View style={[s.scanBeam, { transform: [{ translateY: scanY }] }]} />
            )}
          </Animated.View>

          <View style={s.eyeRow}>
            <EyeIcon closed={eyeState === "closed"} active={phase === "blink" || phase === "hold_still"} />
            <EyeIcon closed={eyeState === "closed"} active={phase === "blink" || phase === "hold_still"} />
          </View>
        </View>

        <View style={s.statusCard}>
          <Text style={s.statusText}>{statusText}</Text>
          <Text style={s.statusHint}>{blinksRequired > 0 ? t("blinkHint") : t("livenessHint")}</Text>

          <Animated.View style={[s.progressRow, { transform: [{ scale: successScale }] }]}>
            {Array.from({ length: blinksRequired }).map((_, i) => {
              const done = i < blinkCount;
              const current = i === blinkCount && phase === "blink";
              return (
                <View key={i} style={s.stepItem}>
                  <View style={[
                    s.stepDot,
                    done && s.stepDotDone,
                    current && s.stepDotCurrent,
                  ]}>
                    <Text style={s.stepDotText}>{done ? "✓" : i + 1}</Text>
                  </View>
                  {i < blinksRequired - 1 && <View style={[s.stepLine, done && s.stepLineDone]} />}
                </View>
              );
            })}
          </Animated.View>

          <Text style={s.progressLabel}>
            {isVerified ? t("livenessVerified") : `${blinkCount} / ${blinksRequired} ${t("blinksDone")}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

function InfoRow({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={s.rRow}>
      <Text style={s.rI}>{icon}</Text>
      <Text style={s.rV}>{value}</Text>
    </View>
  );
}

const eyeStyles = StyleSheet.create({
  eye: {
    width: 36, height: 22, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  eyeActive: { borderColor: colors.primary, backgroundColor: "rgba(249,115,22,0.2)" },
  lid: { position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: "rgba(255,255,255,0.5)" },
  lidClosed: { height: "100%", backgroundColor: "rgba(30,30,30,0.85)" },
  pupil: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0a09" },
  freezeFrame: { ...StyleSheet.absoluteFillObject, resizeMode: "cover" },
  content: { flex: 1, justifyContent: "space-between", paddingBottom: 28 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  permBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, backgroundColor: colors.background },
  permIcon: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.primaryLight, justifyContent: "center", alignItems: "center", marginBottom: 20, ...shadows.md },
  permEmoji: { fontSize: 44 },
  permTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8, textAlign: "center" },
  permDesc: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 12, lineHeight: 20 },
  permHint: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginBottom: 24, lineHeight: 18, paddingHorizontal: 8 },
  employeeName: { fontSize: 16, fontWeight: "700", color: colors.primary, marginBottom: 12 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 14, borderRadius: radius.lg },
  permBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  header: { paddingTop: 56, alignItems: "center", paddingHorizontal: 24 },
  headerBadge: {
    color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 2,
    backgroundColor: "rgba(249,115,22,0.15)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8,
  },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 4 },
  ovalWrap: { alignItems: "center", justifyContent: "center", height: OVAL_H + 40 },
  ovalRing: {
    width: OVAL_W, height: OVAL_H, borderRadius: OVAL_W / 2,
    borderWidth: 3, overflow: "hidden",
    backgroundColor: "transparent",
  },
  scanBeam: {
    position: "absolute", left: 8, right: 8, height: 3,
    backgroundColor: colors.primary, opacity: 0.7, borderRadius: 2,
  },
  eyeRow: { position: "absolute", flexDirection: "row", gap: 28, bottom: -8 },
  vignetteTop: { position: "absolute", top: 0, left: 0, right: 0, height: height * 0.22, backgroundColor: "rgba(12,10,9,0.82)" },
  vignetteBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.34, backgroundColor: "rgba(12,10,9,0.88)" },
  vignetteLeft: { position: "absolute", top: height * 0.22, bottom: height * 0.34, left: 0, width: (width - OVAL_W) / 2 - 4, backgroundColor: "rgba(12,10,9,0.82)" },
  vignetteRight: { position: "absolute", top: height * 0.22, bottom: height * 0.34, right: 0, width: (width - OVAL_W) / 2 - 4, backgroundColor: "rgba(12,10,9,0.82)" },
  statusCard: {
    marginHorizontal: 20, backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.xxl, padding: spacing.xl,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  statusText: { color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center", lineHeight: 24 },
  statusHint: { color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 18 },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, marginBottom: 8 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 2, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepDotCurrent: { borderColor: colors.primary, backgroundColor: "rgba(249,115,22,0.25)" },
  stepDotText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  stepLine: { width: 28, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 4 },
  stepLineDone: { backgroundColor: colors.success },
  progressLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", textAlign: "center" },
  loadBox: { flex: 1, backgroundColor: "#0c0a09" },
  loadImg: { ...StyleSheet.absoluteFillObject, resizeMode: "cover", opacity: 0.25 },
  loadOv: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 16 },
  loadSub: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 },
  resultBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, backgroundColor: colors.background },
  resultCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: "center", alignItems: "center", marginBottom: 20, ...shadows.md },
  resultEmoji: { fontSize: 56 },
  resultTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8 },
  resultMsg: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginBottom: 20 },
  resultCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: "100%", ...shadows.sm, marginBottom: 20 },
  rRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  rI: { fontSize: 18 },
  rV: { fontSize: 15, fontWeight: "600", color: colors.text },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  retryText: { fontSize: 14, fontWeight: "600", color: colors.text },
});
