import { Router } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, desc, like, or } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const type = req.query.type as string | undefined;
  const search = req.query.search as string | undefined;

  let query = db.select().from(clientsTable);

  if (type === "lead" || type === "customer") {
    query = query.where(eq(clientsTable.type, type));
  }

  if (search) {
    query = query.where(
      or(
        like(clientsTable.name, `%${search}%`),
        like(clientsTable.phone, `%${search}%`),
      )
    );
  }

  const clients = await query.orderBy(desc(clientsTable.createdAt));
  res.json(clients);
});

router.get("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) {
    res.status(404).json({ error: "Topilmadi" });
    return;
  }
  res.json(client);
});

router.post("/", authMiddleware, async (req, res) => {
  const { name, phone, address, type, source, notes } = req.body;

  if (!name) {
    res.status(400).json({ error: "Ismi talab qilinadi" });
    return;
  }

  const [client] = await db.insert(clientsTable).values({
    name,
    phone: phone || null,
    address: address || null,
    type: type || "lead",
    source: source || null,
    notes: notes || null,
  }).returning();

  res.status(201).json(client);
});

router.put("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, address, type, source, notes } = req.body;

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (type !== undefined) updates.type = type;
  if (source !== undefined) updates.source = source;
  if (notes !== undefined) updates.notes = notes;

  const [client] = await db.update(clientsTable).set(updates).where(eq(clientsTable.id, id)).returning();
  res.json(client);
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.json({ success: true });
});

export default router;
