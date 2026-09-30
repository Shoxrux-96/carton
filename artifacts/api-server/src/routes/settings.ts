import { Router } from "express";
import { authMiddleware } from "../lib/auth.js";
import fs from "fs";
import path from "path";

const router = Router();
const SETTINGS_FILE = path.join(process.cwd(), "office-settings.json");

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch {}
  return { lat: 41.311081, lng: 69.240562, radius: 100, startTime: "09:00", endTime: "18:00", lateMinutes: 30 };
}

function saveSettings(data: any) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

router.get("/", authMiddleware, (_req, res) => {
  res.json(loadSettings());
});

router.put("/", authMiddleware, (req, res) => {
  const current = loadSettings();
  const updated = { ...current, ...req.body };
  saveSettings(updated);
  res.json(updated);
});

// ===== Dam olish kunlari (off days) — web va mobil uchun umumiy sinxron =====
const OFF_DAYS_FILE = path.join(process.cwd(), "off-days.json");

function loadOffDays(): { date: string; reason: string }[] {
  try {
    if (fs.existsSync(OFF_DAYS_FILE)) {
      const data = JSON.parse(fs.readFileSync(OFF_DAYS_FILE, "utf-8"));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

function saveOffDays(days: { date: string; reason: string }[]) {
  fs.writeFileSync(OFF_DAYS_FILE, JSON.stringify(days, null, 2));
}

router.get("/off-days", authMiddleware, (_req, res) => {
  res.json({ offDays: loadOffDays() });
});

router.post("/off-days", authMiddleware, (req, res) => {
  const date = String(req.body?.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Sana (yyyy-MM-dd) talab qilinadi" });
    return;
  }
  const reason = String(req.body?.reason || "").trim() || "Dam olish";
  const days = loadOffDays().filter(d => d.date !== date);
  days.push({ date, reason });
  days.sort((a, b) => a.date.localeCompare(b.date));
  saveOffDays(days);
  res.status(201).json({ offDays: days });
});

router.delete("/off-days/:date", authMiddleware, (req, res) => {
  const date = String(req.params.date);
  const days = loadOffDays().filter(d => d.date !== date);
  saveOffDays(days);
  res.json({ offDays: days });
});

export default router;
