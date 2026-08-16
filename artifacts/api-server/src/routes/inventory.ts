import { Router } from "express";
import { db, inventoryTable, productsTable, warehousesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const items = await db
    .select({
      warehouseId: inventoryTable.warehouseId,
      warehouseName: warehousesTable.name,
      productId: inventoryTable.productId,
      productName: productsTable.name,
      price: productsTable.price,
      quantity: inventoryTable.quantity,
      updatedAt: inventoryTable.updatedAt,
    })
    .from(inventoryTable)
    .leftJoin(warehousesTable, eq(inventoryTable.warehouseId, warehousesTable.id))
    .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
    .orderBy(warehousesTable.name, productsTable.name);

  res.json(items.map(i => ({ ...i, price: parseFloat(i.price as unknown as string) })));
});

export default router;
