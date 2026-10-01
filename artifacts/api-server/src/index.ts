import "./polyfills.js";
import app from "./app.js";
import { processPendingFaces } from "./lib/face-processor.js";

const port = Number(process.env["API_PORT"]) || Number(process.env["PORT"]) || 3003;
// HOST=127.0.0.1 (VPS .env) — API faqat nginx orqali ochiladi, tashqi tomondan emas.
// Dev'da default: barcha interfeyslar (mobil qurilmalar LAN orqali ulansin).
const host = process.env["HOST"] || undefined;

// Global error handlers to prevent crash on uncaught errors
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err?.message);
  console.error(err?.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled rejection:", reason);
});

async function startFaceProcessor() {
  // Face descriptor'larini fonda chiqarish: har 60 soniyada, boshida 5 ta.
  try {
    const runProcessor = async () => {
      const result = await processPendingFaces(5);
      if (result && result.processed) console.log(`[face-processor] processed ${result.processed} items`);
    };
    await runProcessor();
    setInterval(runProcessor, 60 * 1000);
  } catch (err) {
    console.error("[face-processor] failed to start:", err);
  }
}

const onListening = () => {
  console.log(`Server listening on ${host || "0.0.0.0"}:${port}`);
  void startFaceProcessor();
};

if (host) {
  app.listen(port, host, onListening);
} else {
  app.listen(port, onListening);
}
