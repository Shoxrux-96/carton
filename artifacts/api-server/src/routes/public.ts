import { Router } from "express";
import { db, clientsTable, ordersTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/products", async (_req, res) => {
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.isPublished, true))
    .orderBy(productsTable.createdAt);
  res.json(products.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: parseFloat(p.price),
    image: p.image,
    length: p.length ? parseFloat(p.length) : null,
    width: p.width ? parseFloat(p.width) : null,
    height: p.height ? parseFloat(p.height) : null,
    material: p.material,
    color: p.color,
  })));
});

router.post("/orders", async (req, res) => {
  const { customerName, customerPhone, productId, quantity, notes } = req.body;

  if (!customerName || !customerPhone || !productId || !quantity) {
    res.status(400).json({ error: "Ism, telefon, mahsulot va miqdor talab qilinadi" });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Mahsulot topilmadi" });
    return;
  }

  let [client] = await db.select().from(clientsTable).where(eq(clientsTable.phone, customerPhone));
  if (!client) {
    [client] = await db.insert(clientsTable).values({
      name: customerName,
      phone: customerPhone,
      type: "lead",
      source: "catalog",
    }).returning();
  }

  const totalSum = (parseFloat(product.price) * quantity).toString();

  const [order] = await db.insert(ordersTable).values({
    clientId: client.id,
    productId,
    quantity,
    totalSum,
    notes: notes || null,
    orderDate: new Date(),
  }).returning();

  res.status(201).json({
    success: true,
    order: {
      id: order.id,
      productName: product.name,
      quantity: order.quantity,
      totalSum: parseFloat(order.totalSum),
      status: order.status,
    },
  });
});

router.post("/contact", async (req, res) => {
  const { name, phone, message } = req.body;

  if (!name || !phone || !message) {
    res.status(400).json({ error: "Ism, telefon va xabar maydonlari to'ldirilishi shart" });
    return;
  }

  await db.insert(clientsTable).values({
    name,
    phone,
    type: "lead",
    source: "contact_form",
    notes: message,
  });

  res.status(201).json({ success: true });
});

router.post("/ads-lead", async (req, res) => {
  const { name, phone, message, source: customSource } = req.body;

  if (!name || !phone) {
    res.status(400).json({ error: "Ism va telefon majburiy" });
    return;
  }

  await db.insert(clientsTable).values({
    name,
    phone,
    type: "lead",
    source: customSource || "Reklama",
    notes: message || "",
  });

  res.status(201).json({ success: true });
});

export default router;
