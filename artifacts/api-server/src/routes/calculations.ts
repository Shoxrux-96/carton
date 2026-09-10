import { Router } from "express";
import { db, calculationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { paramInt } from "../lib/params.js";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  try {
    const items = await db.select().from(calculationsTable).orderBy(desc(calculationsTable.createdAt));
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const id = paramInt(req.params.id);
    const [item] = await db.select().from(calculationsTable).where(eq(calculationsTable.id, id));
    if (!item) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      companyName, boxName, boxWidth, boxHeight, boxLength,
      l1Weight, l1Price, l2Weight, l2Price, l3Weight, l3Price,
      blankLen, blankW, netAreaM2, totalWeight, totalPaperCost,
      salePrice, coefficient,
    } = req.body;

    const [item] = await db.insert(calculationsTable).values({
      companyName: companyName || "",
      boxName: boxName || "",
      boxWidth: String(boxWidth || "0"),
      boxHeight: String(boxHeight || "0"),
      boxLength: String(boxLength || "0"),
      l1Weight: String(l1Weight || "0"),
      l1Price: String(l1Price || "0"),
      l2Weight: String(l2Weight || "0"),
      l2Price: String(l2Price || "0"),
      l3Weight: String(l3Weight || "0"),
      l3Price: String(l3Price || "0"),
      blankLen: String(blankLen || "0"),
      blankW: String(blankW || "0"),
      netAreaM2: String(netAreaM2 || "0"),
      totalWeight: String(totalWeight || "0"),
      totalPaperCost: String(totalPaperCost || "0"),
      salePrice: String(salePrice || "0"),
      coefficient: String(coefficient || "1.50"),
    }).returning();

    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const id = paramInt(req.params.id);
    const {
      companyName, boxName, boxWidth, boxHeight, boxLength,
      l1Weight, l1Price, l2Weight, l2Price, l3Weight, l3Price,
      blankLen, blankW, netAreaM2, totalWeight, totalPaperCost,
      salePrice, coefficient,
    } = req.body;

    const updates: Record<string, any> = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (boxName !== undefined) updates.boxName = boxName;
    if (boxWidth !== undefined) updates.boxWidth = String(boxWidth);
    if (boxHeight !== undefined) updates.boxHeight = String(boxHeight);
    if (boxLength !== undefined) updates.boxLength = String(boxLength);
    if (l1Weight !== undefined) updates.l1Weight = String(l1Weight);
    if (l1Price !== undefined) updates.l1Price = String(l1Price);
    if (l2Weight !== undefined) updates.l2Weight = String(l2Weight);
    if (l2Price !== undefined) updates.l2Price = String(l2Price);
    if (l3Weight !== undefined) updates.l3Weight = String(l3Weight);
    if (l3Price !== undefined) updates.l3Price = String(l3Price);
    if (blankLen !== undefined) updates.blankLen = String(blankLen);
    if (blankW !== undefined) updates.blankW = String(blankW);
    if (netAreaM2 !== undefined) updates.netAreaM2 = String(netAreaM2);
    if (totalWeight !== undefined) updates.totalWeight = String(totalWeight);
    if (totalPaperCost !== undefined) updates.totalPaperCost = String(totalPaperCost);
    if (salePrice !== undefined) updates.salePrice = String(salePrice);
    if (coefficient !== undefined) updates.coefficient = String(coefficient);

    const [item] = await db.update(calculationsTable).set(updates).where(eq(calculationsTable.id, id)).returning();
    if (!item) { res.status(404).json({ error: "Topilmadi" }); return; }
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const id = paramInt(req.params.id);
    await db.delete(calculationsTable).where(eq(calculationsTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
