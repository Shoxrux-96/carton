import { Router } from "express";
import { db, warehousesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const warehouses = await db.select().from(warehousesTable).orderBy(warehousesTable.createdAt);
  res.json(warehouses.map(w => ({
    id: w.id,
    name: w.name,
    createdAt: w.createdAt,
  })));
});

router.post("/", authMiddleware, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: "Ombor nomi talab qilinadi" });
    return;
  }

  const [warehouse] = await db.insert(warehousesTable).values({ name }).returning();

  res.status(201).json({
    id: warehouse.id,
    name: warehouse.name,
    createdAt: warehouse.createdAt,
  });
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(warehousesTable).where(eq(warehousesTable.id, id));
  res.json({ success: true, message: "Ombor o'chirildi" });
});

export default router;
