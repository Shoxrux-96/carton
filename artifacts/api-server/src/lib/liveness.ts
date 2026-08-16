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

const BLINKS_REQUIRED = 0;
const MIN_CLOSED_MS = 80;
const MAX_CLOSED_MS = 1200;
const MIN_BLINK_GAP_MS = 250;
const MIN_SESSION_MS = 800;
const MIN_MOVEMENT = 0;

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
    return { ok: false, error: "Hayotilik tasdiqlanmadi" };
  }

  if (proof.sessionDurationMs < MIN_SESSION_MS) {
    return { ok: false, error: "Hayotilik tekshiruvi juda tez o'tkazildi. Qayta urinib ko'ring" };
  }

  const samples = proof.samples ?? [];
  if (samples.length < 2) {
    return { ok: false, error: "Hayotilik ma'lumotlari yetarli emas" };
  }

  const first = samples[0];
  const allIdentical = samples.every(
    (s) =>
      Math.abs(s.boundsX - first.boundsX) < 0.1 &&
      Math.abs(s.boundsY - first.boundsY) < 0.1 &&
      Math.abs(s.leftEyeOpen - first.leftEyeOpen) < 0.005 &&
      Math.abs(s.rightEyeOpen - first.rightEyeOpen) < 0.005,
  );
  if (allIdentical) {
    return { ok: false, error: "Bir xil statik rasm aniqlandi. Kameraga jonli qarang" };
  }

  // If blink-based proof is required, validate blink timing
  if (BLINKS_REQUIRED > 0) {
    if (proof.blinkCount < BLINKS_REQUIRED || !proof.blinks || proof.blinks.length < BLINKS_REQUIRED) {
      return { ok: false, error: `Hayotilik tasdiqlanmadi: kamida ${BLINKS_REQUIRED} marta ko'z ochib-yumish kerak` };
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
  }

  return { ok: true };
}
