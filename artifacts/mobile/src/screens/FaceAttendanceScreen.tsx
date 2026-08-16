import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Animated, Dimensions, Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import { apiFetchFormData, apiFetch, getUser, logClientError } from "../api";
import { colors, radius, shadows, spacing } from "../theme";
import { useI18n } from "../i18n";

const { width } = Dimensions.get("window");
const OVAL_W = width * 0.62;
const OVAL_H = OVAL_W * 1.28;

const SCAN_INTERVAL_MS = 600;
const MIN_FACE_PRESENCE_MS = 900;

type FaceSetupStatus = "loading" | "ready" | "no_photo" | "no_system_faces";
type ScanPhase = "waiting_face" | "scanning" | "verified";

interface FrameAnalysis {
  faceDetected: boolean;
  boundsX?: number;
  boundsY?: number;
}

function normalizePhone(phone?: string | null) {
  return (phone || "").replace(/[\s+\-()]/g, "");
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
  const [phase, setPhase] = useState<ScanPhase>("waiting_face");
  // Location is REQUIRED — attendance only inside the office geofence
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationErr, setLocationErr] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const cameraRef = useRef<any>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const locatingRef = useRef(false);
  const mountedRef = useRef(true);
  const capturingRef = useRef(false);
  const scanningRef = useRef(false);
  const firstFaceAtRef = useRef<number | null>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectFrameRef = useRef<() => Promise<void>>(async () => {});
  const readyRef = useRef(false);
  const ringPulse = useRef(new Animated.Value(0)).current;
  const scanLine = useRef(new Animated.Value(0)).current;

  const clearScanTimer = useCallback(() => {
    if (scanTimer.current) {
      clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
  }, []);

  const resetScanState = useCallback(() => {
    clearScanTimer();
    firstFaceAtRef.current = null;
    setPhase("waiting_face");
  }, [clearScanTimer]);

  const scheduleNext = useCallback((delayMs: number) => {
    clearScanTimer();
    scanTimer.current = setTimeout(() => {
      if (readyRef.current && mountedRef.current) {
        void detectFrameRef.current();
      }
    }, delayMs);
  }, [clearScanTimer]);

  const finishVerification = useCallback(() => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    clearScanTimer();
    setPhase("verified");
    void captureAndSubmit(locationRef.current);
  }, [clearScanTimer]);

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
    } catch (e) {
      logClientError("face:check-face-setup", { error: String(e) });
      setFaceSetup("no_system_faces");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearScanTimer();
      locatingRef.current = false;
    };
  }, [clearScanTimer]);

  useEffect(() => {
    if (isFocused) void checkFaceSetup();
  }, [isFocused, checkFaceSetup]);

  const ensureLocation = useCallback(async () => {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    try {
      const Location = require("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationErr("Joylashuv ruxsati berilmagan");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocation(coords);
      locationRef.current = coords;
    } catch (e) {
      logClientError("face:get-location", { error: String(e) });
      setLocationErr("Joylashuv aniqlanmadi — GPS yoqilganini tekshiring");
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
  }, []);

  // Fetch current location once the screen is ready — required for attendance
  useEffect(() => {
    if (isFocused && faceSetup === "ready" && !location && !locationErr) {
      void ensureLocation();
    }
  }, [isFocused, faceSetup, location, locationErr, ensureLocation]);

  // Keep latest flags in refs so the scan loop never uses stale values
  useEffect(() => {
    readyRef.current = !!(
      isFocused &&
      faceSetup === "ready" &&
      !locationErr &&
      !!location &&
      cameraReady &&
      !!cameraRef.current &&
      !photo &&
      !loading &&
      !result
    );
  }, [isFocused, faceSetup, location, locationErr, cameraReady, photo, loading, result]);

  // Start / stop the auto-scan loop
  useEffect(() => {
    if (!readyRef.current) {
      clearScanTimer();
      if (!isFocused) resetScanState();
      return;
    }
    const warmup = setTimeout(() => {
      if (readyRef.current) void detectFrameRef.current();
    }, 1800);
    return () => {
      clearTimeout(warmup);
      clearScanTimer();
    };
  }, [isFocused, faceSetup, location, locationErr, cameraReady, photo, loading, result, clearScanTimer, resetScanState]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, [ringPulse]);

  useEffect(() => {
    if (phase !== "scanning" && phase !== "verified") {
      scanLine.setValue(0);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [phase, scanLine]);

  const processFrame = useCallback((frame: FrameAnalysis) => {
    if (capturingRef.current || !mountedRef.current) return;
    const now = Date.now();

    if (!frame.faceDetected) {
      firstFaceAtRef.current = null;
      setPhase("waiting_face");
      return;
    }

    if (!firstFaceAtRef.current) {
      firstFaceAtRef.current = now;
    }

    setPhase("scanning");

    // Face stays inside the oval — capture and submit (no liveness needed).
    if (now - firstFaceAtRef.current >= MIN_FACE_PRESENCE_MS) {
      finishVerification();
    }
  }, [finishVerification]);

  detectFrameRef.current = async () => {
    if (
      capturingRef.current ||
      scanningRef.current ||
      !mountedRef.current ||
      !readyRef.current ||
      !cameraRef.current
    ) {
      return;
    }
    scanningRef.current = true;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.3, shutterSound: false });
      if (!mountedRef.current || capturingRef.current) return;

      const formData = new FormData();
      formData.append("frame", { uri: pic.uri, name: "frame.jpg", type: "image/jpeg" } as any);
      const frame = await apiFetchFormData<FrameAnalysis>("/face/liveness-frame", formData, 12000);
      if (mountedRef.current && !capturingRef.current) {
        processFrame(frame);
      }
    } catch (e) {
      logClientError("face:scan-frame", { error: String(e) });
    } finally {
      scanningRef.current = false;
      if (readyRef.current && mountedRef.current) {
        scheduleNext(SCAN_INTERVAL_MS);
      }
    }
  };

  const captureAndSubmit = async (coords: { lat: number; lng: number } | null) => {
    if (!cameraRef.current) {
      capturingRef.current = false;
      return;
    }
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8, shutterSound: false });
      setPhoto(pic.uri);
      await submitWithPhoto(pic.uri, coords);
    } catch (e) {
      logClientError("face:camera-capture", { error: String(e) });
      capturingRef.current = false;
      setResult({ error: true, message: "Rasm olishda xatolik. Qayta urinib ko'ring" });
    }
  };

  const submitWithPhoto = async (uri: string, coords: { lat: number; lng: number } | null) => {
    setLoading(true);
    setResult(null);
    try {
      if (!coords) {
        throw new Error("Joylashuv aniqlanmadi");
      }

      const formData = new FormData();
      formData.append("face", { uri, name: "face.jpg", type: "image/jpeg" } as any);
      formData.append("latitude", String(coords.lat));
      formData.append("longitude", String(coords.lng));

      const data = await apiFetchFormData("/face/attendance", formData);
      setResult(data);
    } catch (e: any) {
      logClientError("face:submit-attendance", { error: String(e) });
      setResult({ error: true, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setPhoto(null);
    setResult(null);
    capturingRef.current = false;
    firstFaceAtRef.current = null;
  };

  const retryLocation = () => {
    setLocation(null);
    setLocationErr(null);
  };

  const ringColor =
    phase === "verified" ? colors.success
      : phase === "scanning" ? colors.primary
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
            <InfoRow icon="📍" value={location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "—"} />
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
          <Text style={s.loadSub}>Yuz va joylashuv tekshirilmoqda...</Text>
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

      <View style={s.overlay} pointerEvents="none">
        <View style={s.oval}>
          <Animated.View style={[s.ovalRing, { borderColor: ringColor, transform: [{ scale: ringScale }] }]}>
            {(phase === "scanning" || phase === "verified") && (
              <Animated.View style={[s.scanBeam, { transform: [{ translateY: scanY }] }]} />
            )}
          </Animated.View>
        </View>
      </View>

      {/* Location status (minimal) */}
      {!location && (
        <View style={s.gpsBar} pointerEvents="box-none">
          {locating ? (
            <Text style={s.gpsText}>{t("gpsChecking")}</Text>
          ) : locationErr ? (
            <View style={s.gpsRow}>
              <Text style={[s.gpsText, { color: "#fca5a5", flex: 1 }]}>{locationErr}</Text>
              <TouchableOpacity style={s.gpsBtn} onPress={retryLocation}>
                <Text style={s.gpsBtnText}>{t("gpsRetry")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0a09" },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 56 },
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
  oval: { alignItems: "center", justifyContent: "center", width: OVAL_W + 64, height: OVAL_H + 64 },
  ovalRing: {
    width: OVAL_W, height: OVAL_H, borderRadius: OVAL_W / 2,
    borderWidth: 3, overflow: "hidden",
    backgroundColor: "transparent",
  },
  scanBeam: {
    position: "absolute", left: 8, right: 8, height: 3,
    backgroundColor: colors.primary, opacity: 0.8, borderRadius: 2,
  },
  gpsBar: {
    position: "absolute", top: 48, left: 16, right: 16,
    alignItems: "center",
    backgroundColor: "rgba(12,10,9,0.78)", borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  gpsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  gpsText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  gpsBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 6 },
  gpsBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
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