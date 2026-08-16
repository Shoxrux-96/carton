import "./polyfills.js";
import app from "./app.js";
import { processPendingFaces } from "./lib/face-processor.js";

const port = Number(process.env["PORT"]) || 3003;

// Global error handlers to prevent crash on uncaught errors
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err?.message);
  console.error(err?.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled rejection:", reason);
});

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);

  // Start a background processor to extract face descriptors for uploaded images.
  // Runs every 60 seconds and processes up to 5 pending images per run.
  try {
    const runProcessor = async () => {
      const result = await processPendingFaces(5);
      if (result && result.processed) console.log(`[face-processor] processed ${result.processed} items`);
    };

    // Warm run on startup
    await runProcessor();
    setInterval(runProcessor, 60 * 1000);
  } catch (err) {
    console.error("[face-processor] failed to start:", err);
  }
});
