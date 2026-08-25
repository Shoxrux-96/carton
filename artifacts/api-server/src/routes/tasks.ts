import { Router } from "express";
import { db, tasksTable, employeesTable, productsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { paramInt } from "../lib/params.js";

const router = Router();

const taskWithJoins = db
  .select({
    id: tasksTable.id,
    title: tasksTable.title,
    description: tasksTable.description,
    assigneeId: tasksTable.assigneeId,
    assigneeName: employeesTable.name,
    productId: tasksTable.productId,
    productName: productsTable.name,
    materialName: tasksTable.materialName,
    status: tasksTable.status,
    date: tasksTable.date,
    createdAt: tasksTable.createdAt,
  })
  .from(tasksTable)
  .leftJoin(employeesTable, eq(tasksTable.assigneeId, employeesTable.id))
  .leftJoin(productsTable, eq(tasksTable.productId, productsTable.id));

router.get("/", authMiddleware, async (_req, res) => {
  const tasks = await taskWithJoins.orderBy(desc(tasksTable.createdAt));
  res.json(tasks);
});

router.get("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const [task] = await taskWithJoins.where(eq(tasksTable.id, id));
  if (!task) {
    res.status(404).json({ error: "Topshiriq topilmadi" });
    return;
  }
  res.json(task);
});

router.post("/", authMiddleware, async (req, res) => {
  const { title, description, assigneeId, productId, materialName, status, date } = req.body;

  if (!title) {
    res.status(400).json({ error: "Sarlavha talab qilinadi" });
    return;
  }

  const [task] = await db.insert(tasksTable).values({
    title,
    description: description || null,
    assigneeId: assigneeId || null,
    productId: productId || null,
    materialName: materialName || null,
    status: status || "pending",
    date: date || new Date().toISOString().split("T")[0],
  }).returning();

  const [full] = await taskWithJoins.where(eq(tasksTable.id, task.id));
  res.status(201).json(full);
});

router.put("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const { title, description, assigneeId, productId, materialName, status } = req.body;

  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId;
  if (productId !== undefined) updates.productId = productId;
  if (materialName !== undefined) updates.materialName = materialName;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Topshiriq topilmadi" });
      return;
    }
    res.json(existing);
    return;
  }

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
  if (!task) {
    res.status(404).json({ error: "Topshiriq topilmadi" });
    return;
  }

  const [full] = await taskWithJoins.where(eq(tasksTable.id, task.id));
  res.json(full);
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.json({ success: true, message: "Topshiriq o'chirildi" });
});

export default router;
