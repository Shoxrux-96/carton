export interface LivenessSample {
  timestamp: number;
  leftEyeOpen: number;
  rightEyeOpen: number;
  yaw?: number;
  roll?: number;
  boundsX: number;
  boundsY: number;
}

export interface BlinkEvent {
  timestamp: number;
  closedDurationMs: number;
}

export interface LivenessProof {
  blinkCount: number;
  blinks: BlinkEvent[];
  sessionDurationMs: number;
  movementVariance: number;
  samples: LivenessSample[];
}

const BLINKS_REQUIRED = 3;
const MIN_CLOSED_MS = 80;
const MAX_CLOSED_MS = 1200;
const MIN_BLINK_GAP_MS = 250;
const MIN_SESSION_MS = 1500;
const MIN_MOVEMENT = 5;

export function parseLivenessProof(raw: unknown): LivenessProof | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as LivenessProof;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as LivenessProof;
  return null;
}

export function validateLivenessProof(proof: LivenessProof | null): { ok: true } | { ok: false; error: string } {
  if (!proof) {
    return { ok: false, error: "Hayotilik tasdiqlanmadi. Ko'zingizni 3 marta ochib-yuming" };
  }

  if (proof.blinkCount < BLINKS_REQUIRED || !proof.blinks || proof.blinks.length < BLINKS_REQUIRED) {
    return { ok: false, error: `Hayotilik tasdiqlanmadi: kamida ${BLINKS_REQUIRED} marta ko'z ochib-yumish kerak` };
  }

  if (proof.sessionDurationMs < MIN_SESSION_MS) {
    return { ok: false, error: "Hayotilik tekshiruvi juda tez o'tkazildi. Qayta urinib ko'ring" };
  }

  if (proof.movementVariance < MIN_MOVEMENT) {
    return { ok: false, error: "Statik rasm aniqlandi. Jonli inson kameraga qarang, rasm emas" };
  }

  for (const blink of proof.blinks) {
    if (blink.closedDurationMs < MIN_CLOSED_MS || blink.closedDurationMs > MAX_CLOSED_MS) {
      return { ok: false, error: "Ko'z ochib-yumish tabiiy emas. Qayta urinib ko'ring" };
    }
  }

  const sorted = [...proof.blinks].sort((a, b) => a.timestamp - b.timestamp);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timestamp - sorted[i - 1].timestamp < MIN_BLINK_GAP_MS) {
      return { ok: false, error: "Ko'z ochib-yumish juda tez. Sekinroq yuming" };
    }
  }

  const samples = proof.samples ?? [];
  if (samples.length < 4) {
    return { ok: false, error: "Hayotilik ma'lumotlari yetarli emas" };
  }

  const hasOpen = samples.some((s) => s.leftEyeOpen > 0.55 && s.rightEyeOpen > 0.55);
  const hasClosed = samples.some((s) => s.leftEyeOpen < 0.42 && s.rightEyeOpen < 0.42);
  if (!hasOpen || !hasClosed) {
    return { ok: false, error: "Ko'z ochiq/yopiq holati tasdiqlanmadi — rasm emas, jonli inson kerak" };
  }

  const first = samples[0];
  const allIdentical = samples.every(
    (s) =>
      Math.abs(s.boundsX - first.boundsX) < 0.5 &&
      Math.abs(s.boundsY - first.boundsY) < 0.5 &&
      Math.abs(s.leftEyeOpen - first.leftEyeOpen) < 0.02 &&
      Math.abs(s.rightEyeOpen - first.rightEyeOpen) < 0.02,
  );
  if (allIdentical) {
    return { ok: false, error: "Bir xil statik rasm aniqlandi. Kameraga jonli qarang" };
  }

  return { ok: true };
}
