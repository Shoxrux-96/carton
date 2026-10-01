import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router from "./routes/index.js";
import { db, warehousesTable } from "@workspace/db";

const app: Express = express();

// nginx orqali kelganda haqiqiy client IP (X-Forwarded-For) ishlatiladi.
// Faqat bitta (nginx) proxy ishonchli — soxta X-Forwarded-For himoyasi.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Xavfsizlik sarlavhalari (CSP, Referrer-Policy, HSTS — nginx nazorat qiladi;
// dublikat bo'lmasligi uchun ularni helmet'da o'chiramiz)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: false,
    strictTransportSecurity: false,
  })
);

// CORS: faqat ruxsat etilgan originlar (brauzer uchun). Mobil ilova/ curl
// Origin header'siz keladi — ular uchun cheklov yo'q (token auth baribir kerak).
const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  "https://shovotcarton.uz,https://www.shovotcarton.uz,http://localhost:5173,http://localhost:8090,http://127.0.0.1:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Client"],
    maxAge: 600,
  })
);

// Joriy so'rov hajmi chegarasi (DoS himoyasi). Asosiy katta yuk — foto/base64
// qiymatlari; 15 MB amaliyot uchun bemalol, hujum uchun juda katta.
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Umumiy limit: IP boshiga 15 daqiqada 600 ta API so'rovi.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "So'rovlar juda ko'p. Birozdan keyin qayta urinib ko'ring" },
});
app.use("/api", globalLimiter);

// Server start'da default ombor va mahsulotlarni yaratish
async function ensureDefaults() {
  try {
    const [existingWh] = await db.select().from(warehousesTable).limit(1);
    if (!existingWh) {
      await db.insert(warehousesTable).values({ name: "Asosiy ombor" });
      console.log("[init] Default ombor yaratildi");
    }
  } catch (err) {
    console.error("[init] Default ombor yaratishda xatolik:", err);
  }
}
ensureDefaults();

app.get("/", (_req, res) => {
  res.json({ name: "Shovot Carton API", status: "ok", health: "/api/healthz" });
});

app.use("/api", router);

// API'da mavjud bo'lmagan yo'l → 404 (stack/yo'l oshkor qilinmaydi)
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Topilmadi" });
});

// Markazlashtirilgan xatolik handleri — stack trace mijozga chiqmaydi.
// (express@5 async xatolarni avtomatik shu yerga uzatadi)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number(err?.status || err?.statusCode) || 500;
  if (status >= 500) {
    console.error("[api] 500:", err?.message, err?.stack?.slice?.(0, 500));
  }
  res.status(status).json({ error: status >= 500 ? "Server xatosi" : String(err?.message || "Xatolik") });
});

export default app;
