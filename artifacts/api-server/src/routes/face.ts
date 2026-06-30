import { Router } from "express";
import { db, employeesTable, attendanceTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { extractDescriptor, findBestMatch, initFaceApi } from "../lib/face.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Register face for an employee
router.post("/register/:id", authMiddleware, upload.single("face"), async (req, res) => {
  const id = parseInt(req.params.id);

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

// Recognize face and mark attendance
router.post("/attendance", upload.single("face"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Rasm talab qilinadi" });
    return;
  }

  try {
    // Load office settings
    const fs = await import("fs");
    const path = await import("path");
    const settingsFile = path.default.join(process.cwd(), "office-settings.json");
    let settings = { lat: 41.311081, lng: 69.240562, radius: 100, startTime: "09:00", endTime: "18:00", lateMinutes: 30 };
    try { if (fs.default.existsSync(settingsFile)) settings = JSON.parse(fs.default.readFileSync(settingsFile, "utf-8")); } catch {}

    // Check time — strict: only between startTime and endTime
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${hh}:${mm}`;

    if (currentTime < settings.startTime || currentTime > settings.endTime) {
      res.status(400).json({ error: `Davomat faqat ${settings.startTime} — ${settings.endTime} orasida qabul qilinadi. Hozir: ${currentTime}` });
      return;
    }

    // Determine status
    let attendanceStatus = "present";

    // Check location if provided
    const { latitude, longitude } = req.body || {};
    if (latitude && longitude) {
      const lat1 = Number(latitude);
      const lng1 = Number(longitude);
      const lat2 = settings.lat;
      const lng2 = settings.lng;
      // Haversine distance
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (distance > settings.radius) {
        res.status(400).json({ error: `Siz ishxonadan uzoqdasiz (${Math.round(distance)}m). Ruxsat etilgan: ${settings.radius}m` });
        return;
      }
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

    if (!match) {
      res.status(404).json({ error: "Yuz tanilmadi. Avval yuz ro'yxatdan o'tkazing" });
      return;
    }

    // Mark attendance
    const today = new Date().toISOString().split("T")[0];

    const existing = await db
      .select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.employeeId, match.employeeId),
        eq(attendanceTable.date, today),
      ))
      .limit(1);

    if (existing.length > 0) {
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
    await db.insert(attendanceTable).values({
      employeeId: match.employeeId,
      date: today,
      status: attendanceStatus,
      notes: `Face ID (${match.distance.toFixed(3)}) — ${currentTime}`,
    });

    res.json({
      success: true,
      employee: match.name,
      employeeId: match.employeeId,
      status: attendanceStatus,
      time: currentTime,
      distance: match.distance,
      message: attendanceStatus === "present"
        ? `${match.name} — davomat belgilandi ✅`
        : `${match.name} — kech qoldi ⏰ (${currentTime})`,
    });
  } catch (e: any) {
    console.error("[Face] Attendance error:", e);
    res.status(500).json({ error: e.message || "Xatolik yuz berdi" });
  }
});

export default router;
