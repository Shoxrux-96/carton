import { Router } from "express";
import { db, productsTable, warehousesTable, inventoryTable, productionTable, salesTable, clientsTable, ordersTable, transactionsTable, employeesTable } from "@workspace/db";
import { count, sql, eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [productsCount] = await db.select({ count: count() }).from(productsTable);
  const [warehousesCount] = await db.select({ count: count() }).from(warehousesTable);
  const [inventoryCount] = await db.select({ count: count() }).from(inventoryTable);

  const todayProduction = await db
    .select({ total: sql<number>`coalesce(sum(${productionTable.quantity}), 0)` })
    .from(productionTable)
    .where(sql`${productionTable.productionDate} >= ${today}`);

  const todaySales = await db
    .select({ total: sql<number>`coalesce(sum(${salesTable.quantity}), 0)` })
    .from(salesTable)
    .where(sql`${salesTable.soldAt} >= ${today}`);

  const lowStock = await db
    .select({ count: count() })
    .from(inventoryTable)
    .where(sql`${inventoryTable.quantity} < 10`);

  const [leadsCount] = await db
    .select({ count: count() })
    .from(clientsTable)
    .where(eq(clientsTable.type, "lead"));

  const [customersCount] = await db
    .select({ count: count() })
    .from(clientsTable)
    .where(eq(clientsTable.type, "customer"));

  const [pendingOrders] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(sql`${ordersTable.status} != 'completed' AND ${ordersTable.status} != 'cancelled'`);

  const [totalOrders] = await db
    .select({ count: count() })
    .from(ordersTable);

  const [financeMonth] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${transactionsTable.type} = 'income' then ${transactionsTable.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${transactionsTable.type} = 'expense' then ${transactionsTable.amount} else 0 end), 0)`,
    })
    .from(transactionsTable)
    .where(sql`to_char(${transactionsTable.date}, 'YYYY-MM') = to_char(now(), 'YYYY-MM')`);

  const [employeesCount] = await db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.status, "active"));

  res.json({
    totalProducts: productsCount.count,
    totalWarehouses: warehousesCount.count,
    totalInventoryItems: inventoryCount.count,
    totalProductionToday: Number(todayProduction[0].total),
    totalSalesToday: Number(todaySales[0].total),
    lowStockItems: lowStock[0].count,
    totalLeads: leadsCount.count,
    totalCustomers: customersCount.count,
    activeOrders: pendingOrders.count,
    totalOrders: totalOrders.count,
    totalEmployees: employeesCount.count,
    monthlyIncome: Number(financeMonth.income),
    monthlyExpense: Number(financeMonth.expense),
    monthlyProfit: Number(financeMonth.income) - Number(financeMonth.expense),
  });
});

export default router;
