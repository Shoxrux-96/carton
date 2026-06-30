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

export default router;
