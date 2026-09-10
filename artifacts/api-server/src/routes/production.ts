import { Router } from "express";
import { db, productionTable, inventoryTable, productsTable, warehousesTable, salesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const records = await db
    .select({
      id: productionTable.id,
      productId: productionTable.productId,
      productName: productsTable.name,
      warehouseId: productionTable.warehouseId,
      warehouseName: warehousesTable.name,
      quantity: productionTable.quantity,
      totalSum: productionTable.totalSum,
      productionDate: productionTable.productionDate,
    })
    .from(productionTable)
    .leftJoin(productsTable, eq(productionTable.productId, productsTable.id))
    .leftJoin(warehousesTable, eq(productionTable.warehouseId, warehousesTable.id))
    .orderBy(productionTable.productionDate);

  res.json(records.map(r => ({
    ...r,
    totalSum: parseFloat(r.totalSum),
  })));
});

router.post("/", authMiddleware, async (req, res) => {
  let { productId, warehouseId, quantity, productionDate } = req.body;

  if (!productId || !quantity || !productionDate) {
    res.status(400).json({ error: "Mahsulot, miqdor va sana talab qilinadi" });
    return;
  }

  if (!warehouseId) {
    const [defaultWh] = await db.select().from(warehousesTable).limit(1);
    if (!defaultWh) {
      res.status(400).json({ error: "Oldin ombor yarating" });
      return;
    }
    warehouseId = defaultWh.id;
  }

  const product = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!product[0]) {
    res.status(404).json({ error: "Mahsulot topilmadi" });
    return;
  }

  const price = parseFloat(product[0].price);
  const totalSum = (price * quantity).toFixed(2);

  const [record] = await db.insert(productionTable).values({
    productId,
    warehouseId,
    quantity,
    totalSum,
    productionDate: new Date(productionDate),
  }).returning();

  const existing = await db
    .select()
    .from(inventoryTable)
    .where(and(eq(inventoryTable.warehouseId, warehouseId), eq(inventoryTable.productId, productId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(inventoryTable)
      .set({
        quantity: existing[0].quantity + quantity,
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryTable.warehouseId, warehouseId), eq(inventoryTable.productId, productId)));
  } else {
    await db.insert(inventoryTable).values({
      warehouseId,
      productId,
      quantity,
      updatedAt: new Date(),
    });
  }

  const warehouse = await db.select().from(warehousesTable).where(eq(warehousesTable.id, warehouseId)).limit(1);

  res.status(201).json({
    id: record.id,
    productId: record.productId,
    productName: product[0].name,
    warehouseId: record.warehouseId,
    warehouseName: warehouse[0]?.name || "",
    quantity: record.quantity,
    totalSum: parseFloat(record.totalSum),
    productionDate: record.productionDate,
  });
});

router.get("/summary", authMiddleware, async (_req, res) => {
  const now = new Date();

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [daily] = await db
    .select({
      totalQuantity: sql<number>`coalesce(sum(${productionTable.quantity}), 0)`,
      totalSum: sql<number>`coalesce(sum(${productionTable.totalSum}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(productionTable)
    .where(sql`${productionTable.productionDate} >= ${startOfDay}`);

  const [monthly] = await db
    .select({
      totalQuantity: sql<number>`coalesce(sum(${productionTable.quantity}), 0)`,
      totalSum: sql<number>`coalesce(sum(${productionTable.totalSum}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(productionTable)
    .where(sql`${productionTable.productionDate} >= ${startOfMonth}`);

  const [yearly] = await db
    .select({
      totalQuantity: sql<number>`coalesce(sum(${productionTable.quantity}), 0)`,
      totalSum: sql<number>`coalesce(sum(${productionTable.totalSum}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(productionTable)
    .where(sql`${productionTable.productionDate} >= ${startOfYear}`);

  const [allTime] = await db
    .select({
      totalQuantity: sql<number>`coalesce(sum(${productionTable.quantity}), 0)`,
      totalSum: sql<number>`coalesce(sum(${productionTable.totalSum}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(productionTable);

  res.json({
    daily: { totalQuantity: Number(daily.totalQuantity), totalSum: Number(daily.totalSum), count: Number(daily.count) },
    monthly: { totalQuantity: Number(monthly.totalQuantity), totalSum: Number(monthly.totalSum), count: Number(monthly.count) },
    yearly: { totalQuantity: Number(yearly.totalQuantity), totalSum: Number(yearly.totalSum), count: Number(yearly.count) },
    allTime: { totalQuantity: Number(allTime.totalQuantity), totalSum: Number(allTime.totalSum), count: Number(allTime.count) },
  });
});

router.get("/by-product", authMiddleware, async (req, res) => {
  const { period, date, productName } = req.query;
  const now = new Date();
  let startDate: Date;

  if (period === "day" && date) {
    startDate = new Date(date as string);
  } else if (period === "month" && date) {
    const d = new Date(date as string);
    startDate = new Date(d.getFullYear(), d.getMonth(), 1);
  } else if (period === "year" && date) {
    const d = new Date(date as string);
    startDate = new Date(d.getFullYear(), 0, 1);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  let endDate: Date;
  if (period === "day") {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else if (period === "month") {
    endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
  } else if (period === "year") {
    endDate = new Date(startDate.getFullYear() + 1, 0, 1);
  } else {
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }

  const records = await db
    .select({
      productId: productionTable.productId,
      productName: productsTable.name,
      totalQuantity: sql<number>`coalesce(sum(${productionTable.quantity}), 0)`,
      totalSum: sql<number>`coalesce(sum(${productionTable.totalSum}), 0)`,
    })
    .from(productionTable)
    .leftJoin(productsTable, eq(productionTable.productId, productsTable.id))
    .where(
      and(
        sql`${productionTable.productionDate} >= ${startDate}`,
        sql`${productionTable.productionDate} < ${endDate}`,
        productName
          ? sql`LOWER(${productsTable.name}) LIKE ${'%' + (productName as string).toLowerCase() + '%'}`
          : sql`1=1`,
      ),
    )
    .groupBy(productionTable.productId, productsTable.name)
    .orderBy(productsTable.name);

  res.json(records.map(r => ({
    productId: r.productId,
    productName: r.productName,
    totalQuantity: Number(r.totalQuantity),
    totalSum: Number(r.totalSum),
  })));
});

router.get("/transactions", authMiddleware, async (_req, res) => {
  const production = await db
    .select({
      id: productionTable.id,
      productId: productionTable.productId,
      productName: productsTable.name,
      quantity: productionTable.quantity,
      totalSum: productionTable.totalSum,
      date: productionTable.productionDate,
      type: sql<string>`'kirim'`,
    })
    .from(productionTable)
    .leftJoin(productsTable, eq(productionTable.productId, productsTable.id));

  const sales = await db
    .select({
      id: salesTable.id,
      productId: salesTable.productId,
      productName: productsTable.name,
      quantity: salesTable.quantity,
      totalSum: sql<string>`(cast(${productsTable.price} as numeric) * ${salesTable.quantity})`,
      date: salesTable.soldAt,
      type: sql<string>`'chiqim'`,
    })
    .from(salesTable)
    .leftJoin(productsTable, eq(salesTable.productId, productsTable.id));

  const all = [...production, ...sales].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  res.json(all.map(r => ({
    ...r,
    totalSum: parseFloat(r.totalSum as unknown as string),
  })));
});

// Ishlab chiqarish kalkulyatsiya
router.post("/calculate", authMiddleware, async (req, res) => {
  const {
    boxLength, boxWidth, boxHeight,
    paperWeight, paperPriceKg,
    printingType, printColors, printPriceM2,
    gluePricePerBox, cuttingPricePerBox,
    wastePercent, quantity,
  } = req.body;

  const L = parseFloat(boxLength) || 0;
  const W = parseFloat(boxWidth) || 0;
  const H = parseFloat(boxHeight) || 0;
  const pw = parseFloat(paperWeight) || 0;
  const paperPrice = parseFloat(paperPriceKg) || 0;
  const printColorsN = parseInt(printColors) || 0;
  const printPrice = parseFloat(printPriceM2) || 0;
  const gluePrice = parseFloat(gluePricePerBox) || 0;
  const cuttingPrice = parseFloat(cuttingPricePerBox) || 0;
  const waste = parseFloat(wastePercent) || 10;
  const qty = parseInt(quantity) || 1;

  // Kesma (blank) o'lchamlari — RSC quti uchun
  const scoringFlap = 0.030; // 30mm yelim chok
  const topFlap = W * 0.75;   // tepa qanot
  const bottomFlap = W * 0.75; // past qanot

  const blankLength = 2 * (L + W) + scoringFlap; // m
  const blankWidth = H + topFlap + bottomFlap;    // m

  // Maydon (m²)
  const netArea = blankLength * blankWidth;
  const grossArea = netArea * (1 + waste / 100); // chiqindi bilan

  // Qog'oz og'irligi
  const paperWeightGram = grossArea * pw;          // gram (1 dona)
  const paperWeightKg = paperWeightGram / 1000;    // kg (1 dona)

  // Qog'oz narxi (1 dona)
  const paperCost = paperWeightKg * paperPrice;

  // Bosma narxi (1 dona)
  const printArea = grossArea; // m²
  const printCost = printArea * printPrice * printColorsN;

  // Yelim (1 dona)
  const glueCost = gluePrice;

  // Kesish (1 dona)
  const cuttingCost = cuttingPrice;

  // Jami (1 dona)
  const totalPerBox = paperCost + printCost + glueCost + cuttingCost;

  // Jami (miqdor bo'yicha)
  const totalPaperCost = paperCost * qty;
  const totalPrintCost = printCost * qty;
  const totalGlueCost = glueCost * qty;
  const totalCuttingCost = cuttingCost * qty;
  const totalCost = totalPerBox * qty;

  res.json({
    blank: {
      length: Math.round(blankLength * 1000),   // mm
      width: Math.round(blankWidth * 1000),     // mm
      area: +netArea.toFixed(4),                // m²
      grossArea: +grossArea.toFixed(4),         // m² (chiqindi bilan)
    },
    paper: {
      weightPerBox: Math.round(paperWeightGram), // gram
      weightPerBoxKg: +paperWeightKg.toFixed(4), // kg
      costPerBox: Math.round(paperCost),         // so'm
    },
    printing: {
      area: +printArea.toFixed(4),               // m²
      colors: printColorsN,
      costPerBox: Math.round(printCost),         // so'm
    },
    glue: { costPerBox: Math.round(glueCost) },
    cutting: { costPerBox: Math.round(cuttingCost) },
    perBox: {
      paper: Math.round(paperCost),
      printing: Math.round(printCost),
      glue: Math.round(glueCost),
      cutting: Math.round(cuttingCost),
      total: Math.round(totalPerBox),
    },
    total: {
      quantity: qty,
      paper: Math.round(totalPaperCost),
      printing: Math.round(totalPrintCost),
      glue: Math.round(totalGlueCost),
      cutting: Math.round(totalCuttingCost),
      grandTotal: Math.round(totalCost),
    },
  });
});

export default router;
