import { Router } from "express";
import { db, ordersTable, productsTable, clientsTable, salesTable, inventoryTable, transactionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

const orderWithJoins = db
  .select({
    id: ordersTable.id,
    clientId: ordersTable.clientId,
    clientName: clientsTable.name,
    clientPhone: clientsTable.phone,
    productId: ordersTable.productId,
    productName: productsTable.name,
    quantity: ordersTable.quantity,
    totalSum: ordersTable.totalSum,
    status: ordersTable.status,
    deliveryStatus: ordersTable.deliveryStatus,
    notes: ordersTable.notes,
    orderDate: ordersTable.orderDate,
    deliveryDate: ordersTable.deliveryDate,
    createdAt: ordersTable.createdAt,
  })
  .from(ordersTable)
  .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
  .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id));

router.get("/", authMiddleware, async (_req, res) => {
  const orders = await orderWithJoins.orderBy(desc(ordersTable.createdAt));
  res.json(orders.map(o => ({ ...o, totalSum: parseFloat(o.totalSum) })));
});

router.get("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const [order] = await orderWithJoins.where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Topilmadi" });
    return;
  }
  res.json({ ...order, totalSum: parseFloat(order.totalSum) });
});

router.post("/", authMiddleware, async (req, res) => {
  const { clientId, productId, quantity, totalSum, notes, orderDate, deliveryDate } = req.body;

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
  }).returning();

  const [full] = await orderWithJoins.where(eq(ordersTable.id, order.id));
  res.status(201).json({ ...full, totalSum: parseFloat(full.totalSum) });
});

router.put("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const { productId, quantity, totalSum, status, deliveryStatus, notes, orderDate, deliveryDate } = req.body;

  // Yetkazilgan buyurtmani o'zgartirib bo'lmaydi
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (existing?.deliveryStatus === "delivered" && deliveryStatus && deliveryStatus !== "delivered") {
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

  await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id));

  // Auto-create sale when delivery is completed
  if (deliveryStatus === "delivered") {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (order && order.productId) {
      try {
        await db.insert(salesTable).values({
          productId: order.productId,
          warehouseId: 1,
          quantity: order.quantity,
          soldAt: new Date(),
        });
        const invItems = await db.select().from(inventoryTable)
          .where(and(eq(inventoryTable.warehouseId, 1), eq(inventoryTable.productId, order.productId)))
          .limit(1);
        if (invItems.length > 0 && invItems[0].quantity >= order.quantity) {
          await db.update(inventoryTable)
            .set({ quantity: invItems[0].quantity - order.quantity, updatedAt: new Date() })
            .where(and(eq(inventoryTable.warehouseId, 1), eq(inventoryTable.productId, order.productId)));
        }
      } catch (e) {
        console.error("[Orders] Auto-sale error:", e);
      }
    }

    // Auto-create finance income record
    const [deliveredOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (deliveredOrder) {
      try {
        const product = await db.select().from(productsTable).where(eq(productsTable.id, deliveredOrder.productId)).limit(1);
        const amount = parseFloat(deliveredOrder.totalSum) || (deliveredOrder.quantity * (product[0] ? parseFloat(product[0].price) : 0));
        if (amount > 0) {
          await db.insert(transactionsTable).values({
            type: "income",
            category: "Sotuv",
            amount: amount.toString(),
            description: `Buyurtma #${id} yetkazildi — ${product[0]?.name || ""} x ${deliveredOrder.quantity}`,
            date: new Date().toISOString().split("T")[0],
          });
        }
      } catch (e) {
        console.error("[Orders] Auto-finance error:", e);
      }
    }
  }

  const [full] = await orderWithJoins.where(eq(ordersTable.id, id));
  res.json({ ...full, totalSum: parseFloat(full.totalSum) });
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(ordersTable).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

export default router;
