import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

const mapProduct = (p: any) => ({
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
  clientLogo: p.clientLogo,
  isPublished: p.isPublished,
  createdAt: p.createdAt,
});

router.get("/", async (req, res) => {
  const published = req.query.published;
  let query = db.select().from(productsTable).orderBy(productsTable.createdAt);
  if (published === "true") {
    query = query.where(eq(productsTable.isPublished, true));
  }
  const products = await query;
  res.json(products.map(mapProduct));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) {
    res.status(404).json({ error: "Mahsulot topilmadi" });
    return;
  }
  res.json(mapProduct(product));
});

router.post("/", authMiddleware, async (req, res) => {
  const { name, description, price, image, length, width, height, material, color, clientLogo } = req.body;

  if (!name || price === undefined) {
    res.status(400).json({ error: "Nomi va narxi talab qilinadi" });
    return;
  }

  const [product] = await db.insert(productsTable).values({
    name,
    description: description || null,
    price: price.toString(),
    image: image || null,
    length: length != null ? length.toString() : null,
    width: width != null ? width.toString() : null,
    height: height != null ? height.toString() : null,
    material: material || null,
    color: color || null,
    clientLogo: clientLogo || null,
  }).returning();

  res.status(201).json(mapProduct(product));
});

router.put("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, price, image, length, width, height, material, color, clientLogo, isPublished } = req.body;

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = price.toString();
  if (image !== undefined) updates.image = image;
  if (length !== undefined) updates.length = length != null ? length.toString() : null;
  if (width !== undefined) updates.width = width != null ? width.toString() : null;
  if (height !== undefined) updates.height = height != null ? height.toString() : null;
  if (material !== undefined) updates.material = material;
  if (color !== undefined) updates.color = color;
  if (clientLogo !== undefined) updates.clientLogo = clientLogo;
  if (isPublished !== undefined) updates.isPublished = isPublished;

  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();

  res.json(mapProduct(product));
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ success: true, message: "Mahsulot o'chirildi" });
});

export default router;
