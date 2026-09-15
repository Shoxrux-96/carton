import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import { db, warehousesTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

export default app;
