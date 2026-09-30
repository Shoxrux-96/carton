import { Router } from "express";
import { db, tasksTable, employeesTable, productsTable, usersTable } from "@workspace/db";
import { eq, desc, lt, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { paramInt } from "../lib/params.js";

const router = Router();

// ===== Ikkilangan status: "started" (Boshlandi) | "finished" (Yakunlandi) =====
type TaskStatus = "started" | "finished";

function normStatus(raw: unknown): TaskStatus | null {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "started" || s === "pending" || s === "in_progress" || s === "boshlandi") return "started";
  if (s === "finished" || s === "completed" || s === "done" || s === "yakunlandi") return "finished";
  return null;
}

// ===== Chaqiruvchini aniqlash (rol + hodim id) =====
type Caller = { role: string; employeeId: number | null };

async function getCaller(req: any): Promise<Caller> {
  const userId: number | undefined = req.user?.userId;
  const phone = String(req.user?.phone || "").replace(/\D/g, "");

  let role = "employee";
  if (userId) {
    const [u] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (u) role = u.role;
  }

  let employeeId: number | null = null;
  if (phone) {
    const [emp] = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(sql`(${employeesTable.loginPhone} = ${phone} OR ${employeesTable.phone} = ${phone})`)
      .limit(1);
    employeeId = emp?.id ?? null;
  }
  return { role, employeeId };
}

const isAdminRole = (role: string) => role === "admin" || role === "owner";

async function cleanupOldTasks() {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    await db.delete(tasksTable).where(lt(tasksTable.createdAt, oneMonthAgo));
  } catch {}
}

function taskQuery() {
  return db
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
}

router.get("/", authMiddleware, async (_req, res) => {
  await cleanupOldTasks();
  const tasks = await taskQuery().orderBy(desc(tasksTable.createdAt));
  res.json(tasks);
});

// Hodimning o'z topshiriqlari (phone orqali)
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const phone = (req as any).user.phone || "";
    const normalizedPhone = phone.replace(/\D/g, "");

    const [employee] = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(sql`(${employeesTable.loginPhone} = ${normalizedPhone} OR ${employeesTable.phone} = ${normalizedPhone})`)
      .limit(1);

    if (!employee) {
      res.json([]);
      return;
    }

    await cleanupOldTasks();
    const tasks = await taskQuery()
      .where(eq(tasksTable.assigneeId, employee.id))
      .orderBy(desc(tasksTable.createdAt));
    res.json(tasks);
  } catch (e) {
    console.error("[Tasks /mine] error:", e);
    res.json([]);
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const [task] = await taskQuery().where(eq(tasksTable.id, id));
  if (!task) {
    res.status(404).json({ error: "Topshiriq topilmadi" });
    return;
  }
  res.json(task);
});

// Yaratish — faqat admin
router.post("/", authMiddleware, async (req, res) => {
  const caller = await getCaller(req);
  if (!isAdminRole(caller.role)) {
    res.status(403).json({ error: "Topshiriqni faqat admin yarata oladi" });
    return;
  }

  const { title, description, assigneeId, productId, materialName, status, date } = req.body;
  if (!title) {
    res.status(400).json({ error: "Sarlavha talab qilinadi" });
    return;
  }
  const st: TaskStatus = status !== undefined ? (normStatus(status) ?? "started") : "started";
  if (status !== undefined && !normStatus(status)) {
    res.status(400).json({ error: "Noto'g'ri status (started|finished)" });
    return;
  }

  const [task] = await db.insert(tasksTable).values({
    title,
    description: description || null,
    assigneeId: assigneeId || null,
    productId: productId || null,
    materialName: materialName || null,
    status: st,
    date: date || new Date().toISOString().split("T")[0],
  }).returning();

  const [full] = await taskQuery().where(eq(tasksTable.id, task.id));
  res.status(201).json(full);
});

// Yangilash:
//  — ma'lumotlar (title/description/assignee/...): faqat admin
//  — status: admin yoki topshiriq egasi (hodim); "finished" bo'lsa — qulf, o'zgartirilmaydi
router.put("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const { title, description, assigneeId, productId, materialName, status } = req.body;

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Topshiriq topilmadi" });
    return;
  }

  const caller = await getCaller(req);
  const admin = isAdminRole(caller.role);
  const updates: Record<string, any> = {};

  const metaChanged =
    title !== undefined || description !== undefined || assigneeId !== undefined ||
    productId !== undefined || materialName !== undefined;

  if (metaChanged) {
    if (!admin) {
      res.status(403).json({ error: "Topshiriqni tahrirlashni faqat admin o'zgartira oladi" });
      return;
    }
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (assigneeId !== undefined) updates.assigneeId = assigneeId;
    if (productId !== undefined) updates.productId = productId;
    if (materialName !== undefined) updates.materialName = materialName;
  }

  if (status !== undefined) {
    const st = normStatus(status);
    if (!st) {
      res.status(400).json({ error: "Noto'g'ri status (started|finished)" });
      return;
    }
    if (existing.status === "finished" && st !== "finished") {
      res.status(400).json({ error: "Yakunlangan topshiriq holati o'zgartirilmaydi" });
      return;
    }
    if (!admin) {
      if (caller.employeeId == null || existing.assigneeId !== caller.employeeId) {
        res.status(403).json({ error: "Bu topshiriq sizga biriktirilmagan" });
        return;
      }
    }
    updates.status = st;
  }

  if (Object.keys(updates).length === 0) {
    res.json(existing);
    return;
  }

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
  if (!task) {
    res.status(404).json({ error: "Topshiriq topilmadi" });
    return;
  }

  const [full] = await taskQuery().where(eq(tasksTable.id, task.id));
  res.json(full);
});

// O'chirish — faqat admin
router.delete("/:id", authMiddleware, async (req, res) => {
  const caller = await getCaller(req);
  if (!isAdminRole(caller.role)) {
    res.status(403).json({ error: "Topshiriqni faqat admin o'chira oladi" });
    return;
  }
  const id = paramInt(req.params.id);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.json({ success: true, message: "Topshiriq o'chirildi" });
});

export default router;
