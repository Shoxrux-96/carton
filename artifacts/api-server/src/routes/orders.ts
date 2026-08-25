import { Router } from "express";
import { db, ordersTable, productsTable, clientsTable, salesTable, inventoryTable, transactionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { paramInt } from "../lib/params.js";

const router = Router();

const mapOrder = (o: any) => ({
  ...o,
  totalSum: parseFloat(o.totalSum),
  items: o.items ? JSON.parse(o.items) : [],
});

router.get("/", authMiddleware, async (_req, res) => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  res.json(orders.map(mapOrder));
});

router.get("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Topilmadi" });
    return;
  }
  res.json(mapOrder(order));
});

router.post("/", authMiddleware, async (req, res) => {
  const {
    clientId, productId, quantity, totalSum, notes, orderDate, deliveryDate,
    orderType, orderCode, supplier, materialName, items, status,
    price,
  } = req.body;

  const isPurchase = orderType === "purchase";

  if (isPurchase) {
    if (!supplier) {
      res.status(400).json({ error: "Yetkazib beruvchi nomi talab qilinadi" });
      return;
    }
    const computedQty = quantity || (Array.isArray(items) ? items.reduce((s: number, i: any) => s + (i.quantity || 0), 0) : 0);
    const computedSum = totalSum || (Array.isArray(items) ? items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.price || 0), 0) : 0);

    const [order] = await db.insert(ordersTable).values({
      clientId: clientId || null,
      productId: productId || null,
      quantity: computedQty,
      totalSum: computedSum.toString(),
      notes: notes || null,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      orderType: "purchase",
      orderCode: orderCode || null,
      supplier: supplier,
      materialName: materialName || null,
      items: items ? JSON.stringify(items) : null,
      status: status || "pending",
    }).returning();

    res.status(201).json(mapOrder(order));
  } else {
    if (!clientId || !productId || !quantity) {
      res.status(400).json({ error: "Client, product va quantity talab qilinadi" });
      return;
    }

    const [order] = await db.insert(ordersTable).values({
      clientId,
      productId,
      quantity,
      totalSum: totalSum?.toString() || "0",
      notes: notes || null,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      orderType: "delivery",
    }).returning();

    const [full] = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id));
    res.status(201).json(mapOrder(full));
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const { productId, quantity, totalSum, status, deliveryStatus, notes, orderDate, deliveryDate, supplier, materialName, items } = req.body;

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Topilmadi" });
    return;
  }
  if (existing.deliveryStatus === "delivered" && deliveryStatus && deliveryStatus !== "delivered") {
    res.status(400).json({ error: "Yetkazilgan buyurtmani o'zgartirib bo'lmaydi" });
    return;
  }

  const updates: Record<string, any> = {};
  if (productId !== undefined) updates.productId = productId;
  if (quantity !== undefined) updates.quantity = quantity;
  if (totalSum !== undefined) updates.totalSum = totalSum.toString();
  if (status !== undefined) updates.status = status;
  if (deliveryStatus !== undefined) updates.deliveryStatus = deliveryStatus;
  if (notes !== undefined) updates.notes = notes;
  if (orderDate !== undefined) updates.orderDate = new Date(orderDate);
  if (deliveryDate !== undefined) updates.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
  if (supplier !== undefined) updates.supplier = supplier;
  if (materialName !== undefined) updates.materialName = materialName;
  if (items !== undefined) updates.items = Array.isArray(items) ? JSON.stringify(items) : items;

  await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id));

  // Auto-create sale when delivery is completed
  if (deliveryStatus === "delivered" && existing.productId) {
    try {
      await db.insert(salesTable).values({
        productId: existing.productId,
        warehouseId: 1,
        quantity: existing.quantity,
        soldAt: new Date(),
      });
      const invItems = await db.select().from(inventoryTable)
        .where(and(eq(inventoryTable.warehouseId, 1), eq(inventoryTable.productId, existing.productId)))
        .limit(1);
      if (invItems.length > 0 && invItems[0].quantity >= existing.quantity) {
        await db.update(inventoryTable)
          .set({ quantity: invItems[0].quantity - existing.quantity, updatedAt: new Date() })
          .where(and(eq(inventoryTable.warehouseId, 1), eq(inventoryTable.productId, existing.productId)));
      }
    } catch (e) {
      console.error("[Orders] Auto-sale error:", e);
    }

    try {
      const product = await db.select().from(productsTable).where(eq(productsTable.id, existing.productId)).limit(1);
      const amount = parseFloat(existing.totalSum) || (existing.quantity * (product[0] ? parseFloat(product[0].price) : 0));
      if (amount > 0) {
        await db.insert(transactionsTable).values({
          type: "income",
          category: "Sotuv",
          amount: amount.toString(),
          description: `Buyurtma #${id} yetkazildi — ${product[0]?.name || ""} x ${existing.quantity}`,
          date: new Date().toISOString().split("T")[0],
        });
      }
    } catch (e) {
      console.error("[Orders] Auto-finance error:", e);
    }
  }

  // Xarid buyurtmasi qabul qilinganda avtomatik chiqim yozish
  if (status === "received" && existing.orderType === "purchase") {
    try {
      const amount = parseFloat(existing.totalSum) || 0;
      if (amount > 0) {
        await db.insert(transactionsTable).values({
          type: "expense",
          category: "Xarid",
          amount: amount.toString(),
          description: `Xarid #${id} — ${existing.supplier || ""} — ${existing.materialName || ""}`,
          date: new Date().toISOString().split("T")[0],
        });
      }
    } catch (e) {
      console.error("[Orders] Auto-finance purchase error:", e);
    }
  }

  const [full] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  res.json(mapOrder(full));
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

export default router;
