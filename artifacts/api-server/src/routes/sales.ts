import { Router } from "express";
import { db, salesTable, inventoryTable, productsTable, warehousesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const records = await db
    .select({
      id: salesTable.id,
      productId: salesTable.productId,
      productName: productsTable.name,
      warehouseId: salesTable.warehouseId,
      warehouseName: warehousesTable.name,
      quantity: salesTable.quantity,
      soldAt: salesTable.soldAt,
    })
    .from(salesTable)
    .leftJoin(productsTable, eq(salesTable.productId, productsTable.id))
    .leftJoin(warehousesTable, eq(salesTable.warehouseId, warehousesTable.id))
    .orderBy(salesTable.soldAt);

  res.json(records);
});

router.post("/", authMiddleware, async (req, res) => {
  const { productId, warehouseId, quantity } = req.body;

  if (!productId || !warehouseId || !quantity) {
    res.status(400).json({ error: "Barcha maydonlar talab qilinadi" });
    return;
  }

  const inventoryItems = await db
    .select()
    .from(inventoryTable)
    .where(and(eq(inventoryTable.warehouseId, warehouseId), eq(inventoryTable.productId, productId)))
    .limit(1);

  if (inventoryItems.length === 0 || inventoryItems[0].quantity < quantity) {
    res.status(400).json({
      error: `Inventarda mahsulot yetarli emas. Mavjud: ${inventoryItems[0]?.quantity || 0} dona`,
    });
    return;
  }

  const [record] = await db.insert(salesTable).values({
    productId,
    warehouseId,
    quantity,
    soldAt: new Date(),
  }).returning();

  await db
    .update(inventoryTable)
    .set({
      quantity: inventoryItems[0].quantity - quantity,
      updatedAt: new Date(),
    })
    .where(and(eq(inventoryTable.warehouseId, warehouseId), eq(inventoryTable.productId, productId)));

  const product = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  const warehouse = await db.select().from(warehousesTable).where(eq(warehousesTable.id, warehouseId)).limit(1);

  res.status(201).json({
    id: record.id,
    productId: record.productId,
    productName: product[0]?.name || "",
    warehouseId: record.warehouseId,
    warehouseName: warehouse[0]?.name || "",
    quantity: record.quantity,
    soldAt: record.soldAt,
  });
});

export default router;
