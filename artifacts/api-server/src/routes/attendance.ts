import { Router } from "express";
import { db, attendanceTable, employeesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { paramInt } from "../lib/params.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  // Sana default — O'zbekiston vaqti (UTC+5), aks holda 00:00-04:59 orasida noto'g'ri kun chiqadi
  const date = (req.query.date as string) || new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().split("T")[0];

  const records = await db
    .select({
      id: attendanceTable.id,
      employeeId: attendanceTable.employeeId,
      employeeName: employeesTable.name,
      employeePosition: employeesTable.position,
      date: attendanceTable.date,
      status: attendanceTable.status,
      notes: attendanceTable.notes,
      createdAt: attendanceTable.createdAt,
    })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(eq(attendanceTable.date, date));

  res.json(records);
});

router.post("/", authMiddleware, async (req, res) => {
  const { employeeId, date, status, notes } = req.body;

  if (!employeeId || !date) {
    res.status(400).json({ error: "Hodim va sana talab qilinadi" });
    return;
  }

  const existing = await db
    .select()
    .from(attendanceTable)
    .where(and(
      eq(attendanceTable.employeeId, employeeId),
      eq(attendanceTable.date, date),
    ))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(attendanceTable)
      .set({ status: status || "present", notes: notes || null })
      .where(eq(attendanceTable.id, existing[0].id))
      .returning();
    res.json(updated);
  } else {
    const [record] = await db.insert(attendanceTable).values({
      employeeId, date, status: status || "present", notes: notes || null,
    }).returning();
    res.status(201).json(record);
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const { status, notes } = req.body;
  const updates: Record<string, any> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  const [record] = await db.update(attendanceTable).set(updates).where(eq(attendanceTable.id, id)).returning();
  res.json(record);
});

// Oylik xom yozuvlar (web report/salary uchun — lokal kesh bilan sinxron)
router.get("/monthly", authMiddleware, async (req, res) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const records = await db
    .select({
      employeeId: attendanceTable.employeeId,
      employeeName: employeesTable.name,
      employeePosition: employeesTable.position,
      date: sql<string>`to_char(${attendanceTable.date}, 'YYYY-MM-DD')`,
      status: attendanceTable.status,
      createdAt: attendanceTable.createdAt,
    })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(sql`to_char(${attendanceTable.date}, 'YYYY-MM') = ${monthStr}`)
    .orderBy(attendanceTable.date);

  res.json(records);
});

router.get("/report", authMiddleware, async (req, res) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const monthRaw = parseInt(req.query.month as string, 10);
  const month = Number.isNaN(monthRaw) ? new Date().getMonth() + 1 : monthRaw;

  // month=0 → yillik hisobot, oylik guruhlash bilan (har oy alohida qator)
  if (!month) {
    const records = await db
      .select({
        employeeId: attendanceTable.employeeId,
        employeeName: employeesTable.name,
        employeePosition: employeesTable.position,
        month: sql<string>`to_char(${attendanceTable.date}, 'MM')`,
        totalDays: sql<number>`count(*)`,
        presentDays: sql<number>`sum(case when ${attendanceTable.status} = 'present' then 1 else 0 end)`,
        absentDays: sql<number>`sum(case when ${attendanceTable.status} = 'absent' then 1 else 0 end)`,
        lateDays: sql<number>`sum(case when ${attendanceTable.status} = 'late' then 1 else 0 end)`,
      })
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .where(sql`to_char(${attendanceTable.date}, 'YYYY') = ${String(year)}`)
      .groupBy(attendanceTable.employeeId, employeesTable.name, employeesTable.position, sql`to_char(${attendanceTable.date}, 'MM')`);

    return res.json(records.map(r => ({
      ...r,
      totalDays: Number(r.totalDays),
      presentDays: Number(r.presentDays),
      absentDays: Number(r.absentDays),
      lateDays: Number(r.lateDays),
    })));
  }

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const records = await db
    .select({
      employeeId: attendanceTable.employeeId,
      employeeName: employeesTable.name,
      employeePosition: employeesTable.position,
      totalDays: sql<number>`count(*)`,
      presentDays: sql<number>`sum(case when ${attendanceTable.status} = 'present' then 1 else 0 end)`,
      absentDays: sql<number>`sum(case when ${attendanceTable.status} = 'absent' then 1 else 0 end)`,
      lateDays: sql<number>`sum(case when ${attendanceTable.status} = 'late' then 1 else 0 end)`,
    })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(sql`to_char(${attendanceTable.date}, 'YYYY-MM') = ${monthStr}`)
    .groupBy(attendanceTable.employeeId, employeesTable.name, employeesTable.position);

  return res.json(records.map(r => ({
    ...r,
    totalDays: Number(r.totalDays),
    presentDays: Number(r.presentDays),
    absentDays: Number(r.absentDays),
    lateDays: Number(r.lateDays),
  })));
});

export default router;
