import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5 MB dan keyin arxivlaymiz
const MAX_MESSAGE_LEN = 2000;
const MAX_STACK_LEN = 4000;
const MAX_CONTEXT_LEN = 4000;

function clip(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > max ? text.slice(0, max) + "…[truncated]" : text;
}

// Collect client-side (mobile/web) errors into a server log file.
router.post("/", async (req, res) => {
  try {
    const { message, stack, context, app } = req.body || {};
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level: "client-error",
      app: clip(app, 40) || "unknown",
      message: clip(message, MAX_MESSAGE_LEN) || "(no message)",
      stack: clip(stack, MAX_STACK_LEN),
      context: clip(context, MAX_CONTEXT_LEN),
    });
    const file = path.join(process.cwd(), "client-error.log");

    // Diskni to'ldirishdan himoya: hajm oshsa — yangi faylga arxivlaymiz.
    try {
      const stat = fs.statSync(file);
      if (stat.size > MAX_LOG_BYTES) {
        fs.renameSync(file, `${file}.${Date.now()}.old`);
      }
    } catch {
      // fayl yo'q — muhim emas
    }

    fs.appendFileSync(file, line + "\n");
    console.error("[ClientError] " + (message || "(no message)"));
    if (stack) console.error(String(stack).slice(0, 2000));
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[client-log] failed to write:", e);
    res.status(500).json({ ok: false, error: e.message || "Xatolik" });
  }
});

export default router;
