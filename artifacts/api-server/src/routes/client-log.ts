import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Collect client-side (mobile/web) errors into a server log file.
router.post("/", async (req, res) => {
  try {
    const { message, stack, context, app } = req.body || {};
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level: "client-error",
      app: app || "unknown",
      message: message ? String(message) : "(no message)",
      stack: stack ? String(stack) : null,
      context: context ?? null,
    });
    const file = path.join(process.cwd(), "client-error.log");
    fs.appendFileSync(file, line + "\n");
    console.error("[ClientError] " + (message || "(no message)"));
    if (stack) console.error((stack as string).slice(0, 2000));
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[client-log] failed to write:", e);
    res.status(500).json({ ok: false, error: e.message || "Xatolik" });
  }
});

export default router;