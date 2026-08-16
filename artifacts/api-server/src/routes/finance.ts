import { Router } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, desc, sql, and, type SQL } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { paramInt } from "../lib/params.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const type = req.query.type as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const conditions: SQL[] = [];

  if (type === "income" || type === "expense") {
    conditions.push(eq(transactionsTable.type, type));
  }
  if (from) {
    conditions.push(sql`${transactionsTable.date} >= ${from}`);
  }
  if (to) {
    conditions.push(sql`${transactionsTable.date} <= ${to}`);
  }

  const rows = await db.select().from(transactionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactionsTable.date));
  res.json(rows.map(r => ({ ...r, amount: parseFloat(r.amount) })));
});

router.post("/", authMiddleware, async (req, res) => {
  const { type, category, amount, description, date } = req.body;

  if (!type || !amount || !date) {
    res.status(400).json({ error: "Type, amount va date talab qilinadi" });
    return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    type, category: category || null, amount: amount.toString(),
    description: description || null, date,
  }).returning();

  res.status(201).json({ ...tx, amount: parseFloat(tx.amount) });
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
  res.json({ success: true });
});

router.get("/summary", authMiddleware, async (req, res) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const [monthly] = await db
    .select({
      totalIncome: sql<number>`coalesce(sum(case when ${transactionsTable.type} = 'income' then ${transactionsTable.amount} else 0 end), 0)`,
      totalExpense: sql<number>`coalesce(sum(case when ${transactionsTable.type} = 'expense' then ${transactionsTable.amount} else 0 end), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactionsTable)
    .where(sql`to_char(${transactionsTable.date}, 'YYYY-MM') = ${monthStr}`);

  const [yearly] = await db
    .select({
      totalIncome: sql<number>`coalesce(sum(case when ${transactionsTable.type} = 'income' then ${transactionsTable.amount} else 0 end), 0)`,
      totalExpense: sql<number>`coalesce(sum(case when ${transactionsTable.type} = 'expense' then ${transactionsTable.amount} else 0 end), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactionsTable)
    .where(sql`to_char(${transactionsTable.date}, 'YYYY') = ${year.toString()}`);

  const [allTime] = await db
    .select({
      totalIncome: sql<number>`coalesce(sum(case when ${transactionsTable.type} = 'income' then ${transactionsTable.amount} else 0 end), 0)`,
      totalExpense: sql<number>`coalesce(sum(case when ${transactionsTable.type} = 'expense' then ${transactionsTable.amount} else 0 end), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactionsTable);

  const toNum = (v: any) => Number(v);

  res.json({
    monthly: {
      income: toNum(monthly.totalIncome),
      expense: toNum(monthly.totalExpense),
      profit: toNum(monthly.totalIncome) - toNum(monthly.totalExpense),
      count: toNum(monthly.count),
    },
    yearly: {
      income: toNum(yearly.totalIncome),
      expense: toNum(yearly.totalExpense),
      profit: toNum(yearly.totalIncome) - toNum(yearly.totalExpense),
      count: toNum(yearly.count),
    },
    allTime: {
      income: toNum(allTime.totalIncome),
      expense: toNum(allTime.totalExpense),
      profit: toNum(allTime.totalIncome) - toNum(allTime.totalExpense),
      count: toNum(allTime.count),
    },
  });
});

export default router;
