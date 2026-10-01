import { Router } from "express";
import { db, employeesTable, attendanceTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { extractDescriptor, findBestMatch, analyzeEyeState } from "../lib/face.js";
import { getLivenessSamples, evaluateLiveness, recordLivenessSample, clearLivenessSession } from "../lib/liveness.js";
import { paramInt } from "../lib/params.js";
import multer from "multer";

const router = Router();
// Kadr/rasm yuklashlar: 8 MB fayl, matn maydonlari kichik (DoS himoyasi).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, fieldSize: 2 * 1024 * 1024, fields: 20 } });

// Register face for an employee
router.post("/register/:id", authMiddleware, upload.single("face"), async (req, res) => {
  const id = paramInt(req.params.id);

  if (!req.file) {
    res.status(400).json({ error: "Rasm talab qilinadi" });
    return;
  }

  try {
    const descriptor = await extractDescriptor(req.file.buffer);
    if (!descriptor) {
      res.status(400).json({ error: "Yuz aniqlanmadi. Iltimos, faqat yuzingizni to'g'ri ko'rsating" });
      return;
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    await db
      .update(employeesTable)
      .set({
        faceDescriptor: JSON.stringify(descriptor),
        faceImage: base64Image,
      })
      .where(eq(employeesTable.id, id));

    const [employee] = await db
      .select({ id: employeesTable.id, name: employeesTable.name })
      .from(employeesTable)
      .where(eq(employeesTable.id, id))
      .limit(1);

    res.json({ success: true, employee: employee?.name, message: "Yuz ma'lumotlari saqlandi" });
  } catch (e: any) {
    console.error("[Face] Register error:", e);
    res.status(500).json({ error: e.message || "Xatolik yuz berdi" });
  }
});

// Real-time liveness frame analysis (Expo Go compatible — server-side eye detection)
router.post("/liveness-frame", authMiddleware, upload.single("frame"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Kadr talab qilinadi" });
    return;
  }

  try {
    // Ko'z ochiqligi + yuz qutisi — blink/harakat sinyallari uchun.
    const analysis = await analyzeEyeState(req.file.buffer);
    if (!analysis) {
      res.json({ faceDetected: false });
      return;
    }

    const body = (req.body && typeof req.body === "object") ? req.body as Record<string, unknown> : {};
    const sessionId = body.sessionId !== undefined ? String(body.sessionId) : "";
    recordLivenessSample(sessionId, {
      t: Date.now(),
      leftEyeOpen: analysis.leftEyeOpen,
      rightEyeOpen: analysis.rightEyeOpen,
      boundsX: analysis.boundsX,
      boundsY: analysis.boundsY,
      boundsW: analysis.boundsW,
      boundsH: analysis.boundsH,
    });

    res.json(analysis);
  } catch (e: any) {
    console.error("[Face] Liveness frame error:", e);
    res.status(500).json({ error: e.message || "Kadr tahlil qilinmadi" });
  }
});

// Recognize face and mark attendance
router.post("/attendance", upload.single("face"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Rasm talab qilinadi" });
    return;
  }

  try {
    // Liveness check removed — only face appearance matching is required.

    // Load office settings
    const fs = await import("fs");
    const path = await import("path");
    const settingsFile = path.default.join(process.cwd(), "office-settings.json");
    let settings = { lat: 41.311081, lng: 69.240562, radius: 100, startTime: "09:00", endTime: "18:00", lateMinutes: 30, livenessMode: "warn" };
    try { if (fs.default.existsSync(settingsFile)) settings = JSON.parse(fs.default.readFileSync(settingsFile, "utf-8")); } catch {}

    // Check time — O'zbekiston vaqti (Asia/Tashkent, UTC+5, DST yo'q)
    const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const hh = String(now.getUTCHours()).padStart(2, "0");
    const mm = String(now.getUTCMinutes()).padStart(2, "0");
    const currentTime = `${hh}:${mm}`;

    if (currentTime < settings.startTime || currentTime > settings.endTime) {
      res.status(400).json({ error: `Davomat faqat ${settings.startTime} — ${settings.endTime} orasida qabul qilinadi. Hozir: ${currentTime}` });
      return;
    }

    // Determine status
    let attendanceStatus = "present";

    // Location is REQUIRED — attendance only accepted inside the office geofence
    const { latitude, longitude } = req.body || {};
    if (!latitude || !longitude) {
      res.status(400).json({ error: "Joylashuv aniqlanmadi. GPS va joylashuv ruxsatini yoqing, so'ng ishxona hududida davomatdan o'ting" });
      return;
    }
    const lat1 = Number(latitude);
    const lng1 = Number(longitude);
    if (!Number.isFinite(lat1) || !Number.isFinite(lng1)) {
      res.status(400).json({ error: "Joylashuv koordinatalari noto'g'ri" });
      return;
    }
    const lat2 = settings.lat;
    const lng2 = settings.lng;
    // Haversine distance
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    if (distance > settings.radius) {
      res.status(400).json({ error: `Siz ishxonadan uzoqdasiz (${Math.round(distance)}m). Davomat faqat ishxona atrofida ${settings.radius}m radius ichida qabul qilinadi` });
      return;
    }

    // Jonlilik tekshiruvi — skaner kadrlari sessionId bo'yicha yig'iladi.
    // mode: "warn" (default — yozadi, xabar bermaydi) | "enforce" (rad etadi).
    const bodyText = (req.body && typeof req.body === "object") ? req.body as Record<string, unknown> : {};
    const sessionId = bodyText.sessionId !== undefined ? String(bodyText.sessionId) : "";
    const samples = getLivenessSamples(sessionId);
    const liveness = evaluateLiveness(samples);
    const livenessMode = settings.livenessMode === "enforce" ? "enforce" : "warn";

    if (livenessMode === "enforce" && !liveness.ok) {
      clearLivenessSession(sessionId);
      res.status(400).json({
        error: liveness.signal === "insufficient"
          ? "Hayotilik tekshiruvi o'tmadi. Kameraga qarab 2-3 soniya turing va qayta urinib ko'ring"
          : "Statik rasm aniqlandi. Telefoningizni joyida ushlab, boshni engil silkiting yoki ko'zingizni bir marta quring",
      });
      return;
    }

    // Get all employees with face descriptors
    const employees = await db
      .select({
        id: employeesTable.id,
        name: employeesTable.name,
        faceDescriptor: employeesTable.faceDescriptor,
      })
      .from(employeesTable)
      .where(eq(employeesTable.status, "active"));

    const knownDescriptors = employees
      .filter((e) => e.faceDescriptor)
      .map((e) => ({
        employeeId: e.id,
        name: e.name,
        descriptor: JSON.parse(e.faceDescriptor!),
      }));

    if (knownDescriptors.length === 0) {
      res.status(400).json({ error: "Tizimda yuz ma'lumotlari ro'yxatdan o'tmagan" });
      return;
    }

    const match = await findBestMatch(req.file.buffer, knownDescriptors);

    const matchSimilarity = match ? Math.round((1 - (match.distance * match.distance) / 2) * 100) : 0;

    // Liveness natijasini logga va davomat iziga yozamiz (audit uchun).
    if (samples.length > 0) {
      console.log(
        `[face] attendance liveness signal=${liveness.signal} samples=${liveness.sampleCount} blink=${liveness.blinkCount} move=${liveness.movementPx}px mode=${livenessMode}`,
      );
    }

    if (!match) {
      clearLivenessSession(sessionId);
      res.status(404).json({ error: "Yuz tanilmadi. Avval yuz ro'yxatdan o'tkazing" });
      return;
    }

    // Mark attendance — sana ham O'zbekiston bo'yicha (UTC+5)
    const today = now.toISOString().split("T")[0];

    const existing = await db
      .select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.employeeId, match.employeeId),
        eq(attendanceTable.date, today),
      ))
      .limit(1);

    if (existing.length > 0) {
      clearLivenessSession(sessionId);
      res.json({
        success: true,
        employee: match.name,
        employeeId: match.employeeId,
        status: existing[0].status,
        message: `${match.name} — bugun allaqachon davomatdan o'tgan`,
        alreadyMarked: true,
      });
      return;
    }

    // Create attendance record
    const livenessTag = samples.length > 0 ? ` | jonli:${liveness.signal}` : "";
    await db.insert(attendanceTable).values({
      employeeId: match.employeeId,
      date: today,
      status: attendanceStatus,
      notes: `Face ID (${matchSimilarity}% o'xshashlik) — ${currentTime} | 📍 ${lat1.toFixed(6)}, ${lng1.toFixed(6)}${livenessTag}`,
    });
    clearLivenessSession(sessionId);

    res.json({
      success: true,
      employee: match.name,
      employeeId: match.employeeId,
      status: attendanceStatus,
      time: currentTime,
      distance: match.distance,
      similarity: matchSimilarity,
      liveness: samples.length > 0 ? liveness : undefined,
      message: attendanceStatus === "present"
        ? `${match.name} — davomat belgilandi ✅ (${matchSimilarity}% o'xshashlik)`
        : `${match.name} — kech qoldi ⏰ (${currentTime})`,
    });
  } catch (e: any) {
    console.error("[Face] Attendance error:", e);
    res.status(500).json({ error: e.message || "Xatolik yuz berdi" });
  }
});

export default router;
