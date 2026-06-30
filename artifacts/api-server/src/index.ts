import app from "./app.js";

const port = Number(process.env["PORT"]) || 3003;

// Global error handlers to prevent crash on uncaught errors
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err?.message);
  console.error(err?.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled rejection:", reason);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
