// Jonlilik (liveness) — Face ID davomatida skanerlash davomida serverga
// tushgan kadrlar asosida "jonli yuz" yoki "statik rasm (foto/ekran)"ni
// farqlash. Kadrlar sessionId bo'yicha vaqtinchalik xotirada yig'iladi.
//
// Sinyallar:
//  - blink   : ko'z bir marta yumilib-ochilgan (foto qila olmaydi)
//  - movement : yuz qutisi markazi sezilarli siljigan (jonli harakat)
//  - static  : kadrlar deyarli bir xil — shubhali
//  - insufficient : yetarli kadr yig'ilmadi (eski ilova yoki Juda qisqa skan)

export interface LivenessSample {
  t: number;
  leftEyeOpen: number;
  rightEyeOpen: number;
  boundsX: number;
  boundsY: number;
  boundsW: number;
  boundsH: number;
}

export type LivenessSignal = "blink" | "movement" | "static" | "insufficient";

export interface LivenessResult {
  ok: boolean;
  signal: LivenessSignal;
  sampleCount: number;
  blinkCount: number;
  movementPx: number;
}

const BLINK_CLOSED = 0.25;
const BLINK_OPEN = 0.55;
const MOVEMENT_PX = 4;
const SAMPLES_MIN = 2;
const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_SESSIONS = 500;
const MAX_SAMPLES = 60;
const MAX_ID_LEN = 64;

const sessions = new Map<string, { samples: LivenessSample[]; lastAt: number }>();

function sweep(): void {
  const now = Date.now();
  for (const [key, entry] of sessions) {
    if (now - entry.lastAt > SESSION_TTL_MS) sessions.delete(key);
  }
  if (sessions.size > MAX_SESSIONS) {
    let oldestKey: string | null = null;
    let oldestAt = now;
    for (const [key, entry] of sessions) {
      if (entry.lastAt < oldestAt) {
        oldestAt = entry.lastAt;
        oldestKey = key;
      }
    }
    if (oldestKey) sessions.delete(oldestKey);
  }
}

export function recordLivenessSample(sessionId: string | null | undefined, sample: LivenessSample): void {
  if (!sessionId || typeof sessionId !== "string" || sessionId.length > MAX_ID_LEN) return;
  sweep();
  let entry = sessions.get(sessionId);
  if (!entry) {
    entry = { samples: [], lastAt: Date.now() };
    sessions.set(sessionId, entry);
  }
  entry.samples.push(sample);
  if (entry.samples.length > MAX_SAMPLES) entry.samples.shift();
  entry.lastAt = Date.now();
}

export function getLivenessSamples(sessionId: string | null | undefined): LivenessSample[] {
  if (!sessionId) return [];
  return sessions.get(sessionId)?.samples ?? [];
}

export function clearLivenessSession(sessionId: string | null | undefined): void {
  if (sessionId) sessions.delete(sessionId);
}

export function evaluateLiveness(samples: LivenessSample[]): LivenessResult {
  if (samples.length < SAMPLES_MIN) {
    return { ok: false, signal: "insufficient", sampleCount: samples.length, blinkCount: 0, movementPx: 0 };
  }

  // Ko'z ochib-yumish (blink): kamida bitta yumilgan kadrdan keyin ochilgan holat
  const eyes = samples.map((s) => (s.leftEyeOpen + s.rightEyeOpen) / 2);
  const maxEye = Math.max(...eyes);
  let blinkCount = 0;
  let prevClosed = eyes[0] < BLINK_CLOSED;
  if (prevClosed) blinkCount++;
  for (let i = 1; i < eyes.length; i++) {
    const closed = eyes[i] < BLINK_CLOSED;
    if (closed && !prevClosed) blinkCount++;
    prevClosed = closed;
  }
  const blinked = blinkCount > 0 && maxEye > BLINK_OPEN;

  // Harakat: yuz qutisi markazlarining maksimal siljishi (px)
  let movementPx = 0;
  const centers = samples.map((s) => ({
    x: s.boundsX + s.boundsW / 2,
    y: s.boundsY + s.boundsH / 2,
  }));
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const d = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
      if (d > movementPx) movementPx = d;
    }
  }
  const moved = movementPx >= MOVEMENT_PX;

  const signal: LivenessSignal = blinked ? "blink" : moved ? "movement" : "static";
  return {
    ok: blinked || moved,
    signal,
    sampleCount: samples.length,
    blinkCount,
    movementPx: Math.round(movementPx * 10) / 10,
  };
}
