import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { apiFetchFormData } from "../api";

export const BLINKS_REQUIRED = 0;

const EYE_OPEN = 0.62;
const EYE_CLOSED = 0.38;
const MIN_CLOSED_MS = 100;
const MAX_CLOSED_MS = 1000;
const MIN_BLINK_GAP_MS = 280;
const SCAN_INTERVAL_OPEN_MS = 600;
const SCAN_INTERVAL_CLOSED_MS = 300;
const MIN_FACE_PRESENCE_MS = 1200;
const MIN_MOVEMENT_VARIANCE = 6;

export type LivenessPhase =
  | "waiting_face"
  | "hold_still"
  | "blink"
  | "verified"
  | "unsupported";

export type EyeState = "unknown" | "open" | "closed";

export interface BlinkEvent {
  timestamp: number;
  closedDurationMs: number;
}

export interface LivenessSample {
  timestamp: number;
  leftEyeOpen: number;
  rightEyeOpen: number;
  boundsX: number;
  boundsY: number;
}

export interface LivenessProof {
  blinkCount: number;
  blinks: BlinkEvent[];
  sessionDurationMs: number;
  movementVariance: number;
  samples: LivenessSample[];
}

interface FrameAnalysis {
  faceDetected: boolean;
  leftEyeOpen?: number;
  rightEyeOpen?: number;
  boundsX?: number;
  boundsY?: number;
}

type EyePhase = "open" | "closed";

function computeMovementVariance(samples: LivenessSample[]): number {
  if (samples.length < 2) return 0;
  const xs = samples.map((s) => s.boundsX);
  const ys = samples.map((s) => s.boundsY);
  return Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
}

async function analyzeFrame(uri: string): Promise<FrameAnalysis> {
  const formData = new FormData();
  formData.append("frame", { uri, name: "frame.jpg", type: "image/jpeg" } as any);
  return apiFetchFormData<FrameAnalysis>("/face/liveness-frame", formData, 12000);
}

export function useBlinkLiveness(
  cameraRef: React.RefObject<{ takePictureAsync: (opts: object) => Promise<{ uri: string }> } | null>,
  cameraReady: boolean,
  active: boolean,
) {
  const [phase, setPhase] = useState<LivenessPhase>(
    Platform.OS === "web" ? "unsupported" : "waiting_face",
  );
  const [blinkCount, setBlinkCount] = useState(0);
  const [statusText, setStatusText] = useState("Yuzingizni doira ichiga joylashtiring");
  const [proof, setProof] = useState<LivenessProof | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [eyeState, setEyeState] = useState<EyeState>("unknown");

  const sessionStart = useRef(Date.now());
  const firstFaceAt = useRef<number | null>(null);
  const eyePhase = useRef<EyePhase>("open");
  const closedAt = useRef<number | null>(null);
  const lastBlinkAt = useRef(0);
  const blinks = useRef<BlinkEvent[]>([]);
  const samples = useRef<LivenessSample[]>([]);
  const detecting = useRef(false);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkCountRef = useRef(0);
  const verifiedRef = useRef(false);
  const mountedRef = useRef(true);

  const clearScanTimer = useCallback(() => {
    if (scanTimer.current) {
      clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearScanTimer();
    };
  }, [clearScanTimer]);

  const reset = useCallback(() => {
    clearScanTimer();
    sessionStart.current = Date.now();
    firstFaceAt.current = null;
    eyePhase.current = "open";
    closedAt.current = null;
    lastBlinkAt.current = 0;
    blinks.current = [];
    samples.current = [];
    blinkCountRef.current = 0;
    verifiedRef.current = false;
    setBlinkCount(0);
    setProof(null);
    setIsScanning(false);
    setPreviewUri(null);
    setEyeState("unknown");
    setPhase(Platform.OS === "web" ? "unsupported" : "waiting_face");
    setStatusText("Yuzingizni doira ichiga joylashtiring");
  }, [clearScanTimer]);

  const finishVerification = useCallback(() => {
    verifiedRef.current = true;
    clearScanTimer();
    setProof({
      blinkCount: blinks.current.length,
      blinks: [...blinks.current],
      sessionDurationMs: Date.now() - sessionStart.current,
      movementVariance: computeMovementVariance(samples.current),
      samples: [...samples.current],
    });
    setPhase("verified");
    setEyeState("open");
    setStatusText("Ajoyib! Davomat tasdiqlanmoqda...");
  }, [clearScanTimer]);

  const scheduleNextScan = useCallback(
    (delayMs: number) => {
      clearScanTimer();
      scanTimer.current = setTimeout(() => {
        void detectFrameRef.current();
      }, delayMs);
    },
    [clearScanTimer],
  );

  const processFrame = useCallback(
    (frame: FrameAnalysis) => {
      const left = frame.leftEyeOpen ?? 0;
      const right = frame.rightEyeOpen ?? 0;
      const avg = (left + right) / 2;
      const now = Date.now();

      if (avg < EYE_CLOSED) setEyeState("closed");
      else if (avg > EYE_OPEN) setEyeState("open");
      else setEyeState("unknown");

      if (!firstFaceAt.current) {
        firstFaceAt.current = now;
        setPhase("hold_still");
        setStatusText("Yuz aniqlanmoqda — ozgina qimirlang yoki boshni aylantiring");
        scheduleNextScan(SCAN_INTERVAL_OPEN_MS);
        return;
      }

      if (now - firstFaceAt.current < MIN_FACE_PRESENCE_MS) {
        setPhase("hold_still");
        setStatusText("Yuz aniqlanmoqda, bir oz qimirlamang...");
        scheduleNextScan(SCAN_INTERVAL_OPEN_MS);
        return;
      }

      samples.current.push({
        timestamp: now,
        leftEyeOpen: left,
        rightEyeOpen: right,
        boundsX: frame.boundsX ?? 0,
        boundsY: frame.boundsY ?? 0,
      });
      if (samples.current.length > 40) samples.current.shift();

      setPhase("blink");

      // If no blink requirement, accept small head movement + presence as liveness
      if (BLINKS_REQUIRED <= 0) {
        const mv = computeMovementVariance(samples.current);
        // require some movement to avoid static photos
        if (Date.now() - firstFaceAt.current! >= MIN_FACE_PRESENCE_MS && mv >= MIN_MOVEMENT_VARIANCE) {
          finishVerification();
          return;
        }
        setStatusText("Iltimos, boshni ozgina qimirlatib ko'rsating (bir necha soniya)");
        scheduleNextScan(SCAN_INTERVAL_OPEN_MS);
        return;
      }

      if (eyePhase.current === "open" && avg < EYE_CLOSED) {
        eyePhase.current = "closed";
        closedAt.current = now;
        setStatusText("Ko'z yopildi — endi oching");
        scheduleNextScan(SCAN_INTERVAL_CLOSED_MS);
        return;
      }

      if (eyePhase.current === "closed" && avg > EYE_OPEN) {
        const closedDurationMs = closedAt.current ? now - closedAt.current : 0;
        eyePhase.current = "open";
        closedAt.current = null;

        if (closedDurationMs < MIN_CLOSED_MS || closedDurationMs > MAX_CLOSED_MS) {
          setStatusText("Ko'zni tabiiy oching-yuming");
          scheduleNextScan(SCAN_INTERVAL_OPEN_MS);
          return;
        }
        if (lastBlinkAt.current && now - lastBlinkAt.current < MIN_BLINK_GAP_MS) {
          setStatusText("Sekinroq — har safar alohida yuming");
          scheduleNextScan(SCAN_INTERVAL_OPEN_MS);
          return;
        }

        lastBlinkAt.current = now;
        blinks.current.push({ timestamp: now, closedDurationMs });
        const count = blinks.current.length;
        blinkCountRef.current = count;
        setBlinkCount(count);

        if (count >= BLINKS_REQUIRED) {
          if (computeMovementVariance(samples.current) < MIN_MOVEMENT_VARIANCE) {
            setStatusText("Boshni ozgina qimirlating — jonli inson kerak");
            blinks.current.pop();
            blinkCountRef.current = count - 1;
            setBlinkCount(count - 1);
            scheduleNextScan(SCAN_INTERVAL_OPEN_MS);
            return;
          }
          finishVerification();
          return;
        }

        setStatusText(`Yana ${BLINKS_REQUIRED - count} marta ko'z yuming`);
        scheduleNextScan(SCAN_INTERVAL_OPEN_MS);
        return;
      }

      setStatusText(`${blinkCountRef.current}/${BLINKS_REQUIRED} — ko'zingizni oching-yuming`);
      scheduleNextScan(eyePhase.current === "closed" ? SCAN_INTERVAL_CLOSED_MS : SCAN_INTERVAL_OPEN_MS);
    },
    [finishVerification, scheduleNextScan],
  );

  const detectFrameRef = useRef<() => Promise<void>>(async () => {});

  detectFrameRef.current = async () => {
    if (detecting.current || !cameraRef.current || verifiedRef.current || !mountedRef.current) return;
    detecting.current = true;
    if (mountedRef.current) setIsScanning(true);

    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.12,
        skipProcessing: true,
        shutterSound: false,
        fastMode: true,
      } as object);

      if (!mountedRef.current || verifiedRef.current) return;

      const frame = await analyzeFrame(pic.uri);
      if (!mountedRef.current || verifiedRef.current) return;

      if (mountedRef.current) setPreviewUri(pic.uri);

      if (!frame.faceDetected) {
        firstFaceAt.current = null;
        eyePhase.current = "open";
        closedAt.current = null;
        setEyeState("unknown");
        setPhase("waiting_face");
        setStatusText("Yuz topilmadi — doira ichiga qarang");
        scheduleNextScan(SCAN_INTERVAL_OPEN_MS);
        return;
      }

      processFrame(frame);
    } catch {
      if (mountedRef.current) setStatusText("Server bilan bog'lanib bo'lmadi");
      scheduleNextScan(1200);
    } finally {
      detecting.current = false;
      if (mountedRef.current) setIsScanning(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!active || !cameraReady) {
      clearScanTimer();
      return;
    }

    const warmup = setTimeout(() => {
      if (!verifiedRef.current) scheduleNextScan(400);
    }, 1500);

    return () => {
      clearTimeout(warmup);
      clearScanTimer();
    };
  }, [active, cameraReady, scheduleNextScan, clearScanTimer]);

  return {
    phase,
    blinkCount,
    blinksRequired: BLINKS_REQUIRED,
    statusText,
    proof,
    reset,
    isVerified: phase === "verified",
    isScanning,
    previewUri,
    eyeState,
  };
}
