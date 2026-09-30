import { Router } from "express";
import { db, waybillsTable, waybillItemsTable, transactionsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { loadCompanies } from "./company.js";

const router = Router();

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

// Ushbu korxona bizniki mi? (Korxonamiz ro'yxati yoki "shovot carton" nomi)
function isOursCompany(name: string | null | undefined, companies: any[]): boolean {
  const a = norm(name);
  if (!a) return false;
  if (a.includes("shovot carton")) return true;
  return companies.some(c => {
    const b = norm(c?.name);
    return b && (a === b || a.includes(b) || b.includes(a));
  });
}

async function fetchProductNames(): Promise<string[]> {
  try {
    const products = await db.select().from(productsTable);
    return products.map(p => norm(p.name)).filter(Boolean);
  } catch {
    return [];
  }
}

// Avtomatik kategoriya — HECH QACHON null qaytarmaydi:
// 1) yuboruvchi bizniki → Sotuv (mahsulot chiqim / sotuv)
// 2) qabul qiluvchi bizniki → Xarid (material kirim / xarid)
// 3) ikkalasi ham bizniki emas → mahsulot nomi kirsа Sotuv, aks holda Xarid
async function getWaybillType(
  senderCompany: string,
  receiverCompany: string,
  items?: { name?: string | null }[],
  productNames?: string[],
): Promise<{ type: "income" | "expense"; category: "Sotuv" | "Xarid" }> {
  const companies = loadCompanies();
  if (isOursCompany(senderCompany, companies)) return { type: "income", category: "Sotuv" };
  if (isOursCompany(receiverCompany, companies)) return { type: "expense", category: "Xarid" };
  const names = (items || []).map(i => norm(i?.name)).filter(Boolean);
  if (names.length > 0) {
    const pnames = productNames ?? (await fetchProductNames());
    if (pnames.length > 0) {
      const hasProduct = names.some(n => pnames.some(p => n === p || n.includes(p) || p.includes(n)));
      if (hasProduct) return { type: "income", category: "Sotuv" };
    }
  }
  return { type: "expense", category: "Xarid" };
}

async function syncFinance(
  waybillId: number,
  date: string,
  totalSum: string,
  senderCompany: string,
  receiverCompany: string,
  docNumber: number,
  items?: { name?: string | null }[],
  productNames?: string[],
) {
  const info = await getWaybillType(senderCompany, receiverCompany, items, productNames);
  const [existing] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.waybillId, waybillId));
  const desc = `Yuk xati №${docNumber} — ${senderCompany} → ${receiverCompany}`;
  if (existing) {
    await db.update(transactionsTable).set({
      amount: totalSum,
      description: desc,
      date,
      category: info.category,
      type: info.type,
    }).where(eq(transactionsTable.id, existing.id));
  } else {
    await db.insert(transactionsTable).values({
      type: info.type,
      category: info.category,
      amount: totalSum,
      description: desc,
      date,
      waybillId,
    });
  }
}

// Server startida: yozilmagan yuk xatlarini moliya jadvaliga qo'shish (idempotent)
async function backfillWaybillFinance() {
  const waybills = await db.select().from(waybillsTable);
  const allItems = await db.select().from(waybillItemsTable);
  const productNames = await fetchProductNames();
  for (const w of waybills) {
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.waybillId, w.id));
    if (tx) continue;
    const items = allItems.filter(i => i.waybillId === w.id).map(i => ({ name: i.name }));
    await syncFinance(w.id, w.date, String(w.totalSum), w.senderCompany || "", w.receiverCompany || "", w.docNumber, items, productNames);
  }
}
setImmediate(() => {
  backfillWaybillFinance().catch((e: any) => console.error("waybills→finance backfill:", e?.message || e));
});

async function removeFinance(waybillId: number) {
  await db.delete(transactionsTable).where(eq(transactionsTable.waybillId, waybillId));
}

// GET — all waybills
router.get("/", authMiddleware, async (_req, res) => {
  try {
    const waybills = await db.select().from(waybillsTable).orderBy(waybillsTable.id);
    const allItems = await db.select().from(waybillItemsTable);
    const itemsByWaybill = new Map<number, any[]>();
    for (const item of allItems) {
      if (!itemsByWaybill.has(item.waybillId)) itemsByWaybill.set(item.waybillId, []);
      itemsByWaybill.get(item.waybillId)!.push(item);
    }
    const productNames = await fetchProductNames();
    const result = await Promise.all(waybills.map(async w => {
      const items = itemsByWaybill.get(w.id) || [];
      const info = await getWaybillType(w.senderCompany || "", w.receiverCompany || "", items, productNames);
      return { ...w, items, category: info.category };
    }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET — single waybill
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const [waybill] = await db.select().from(waybillsTable).where(eq(waybillsTable.id, Number(req.params.id)));
    if (!waybill) { res.status(404).json({ error: "Not found" }); return; }
    const items = await db.select().from(waybillItemsTable).where(eq(waybillItemsTable.waybillId, waybill.id));
    const info = await getWaybillType(waybill.senderCompany || "", waybill.receiverCompany || "", items);
    res.json({ ...waybill, items, category: info.category });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST — create waybill
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { docNumber, date, senderCompany, senderPhone, receiverCompany, receiverPhone, vehicle, items } = req.body;
    const totalSum = (items || []).reduce((s: number, r: any) => s + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0);
    const [waybill] = await db.insert(waybillsTable).values({
      docNumber: docNumber || 1,
      date,
      senderCompany,
      senderPhone,
      receiverCompany,
      receiverPhone,
      vehicle,
      totalSum: String(totalSum),
    }).returning();
    if (items && items.length > 0) {
      const values = items.map((r: any) => ({
        waybillId: waybill.id,
        name: r.name || "",
        format: r.format || "",
        unit: r.unit || "Kg",
        quantity: String(r.quantity || 0),
        price: String(r.price || 0),
      }));
      await db.insert(waybillItemsTable).values(values);
    }
    await syncFinance(waybill.id, date, String(totalSum), senderCompany || "", receiverCompany || "", docNumber || 1, (items || []).map((r: any) => ({ name: r.name })));
    res.json(waybill);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT — update waybill
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { docNumber, date, senderCompany, senderPhone, receiverCompany, receiverPhone, vehicle, items, deliveryStatus, driverId, deliveryAddress } = req.body;
    const id = Number(req.params.id);
    const [existing] = await db.select().from(waybillsTable).where(eq(waybillsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const totalSum = (items || []).reduce((s: number, r: any) => s + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0);
    await db.update(waybillsTable).set({
      docNumber: docNumber || existing.docNumber,
      date: date || existing.date,
      senderCompany: senderCompany ?? existing.senderCompany,
      senderPhone: senderPhone ?? existing.senderPhone,
      receiverCompany: receiverCompany ?? existing.receiverCompany,
      receiverPhone: receiverPhone ?? existing.receiverPhone,
      vehicle: vehicle ?? existing.vehicle,
      totalSum: items ? String(totalSum) : existing.totalSum,
      deliveryStatus: deliveryStatus ?? existing.deliveryStatus,
      driverId: driverId !== undefined ? driverId : existing.driverId,
      deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : existing.deliveryAddress,
    }).where(eq(waybillsTable.id, id));
    if (items) {
      await db.delete(waybillItemsTable).where(eq(waybillItemsTable.waybillId, id));
      if (items.length > 0) {
        const values = items.map((r: any) => ({
          waybillId: id,
          name: r.name || "",
          format: r.format || "",
          unit: r.unit || "Kg",
          quantity: String(r.quantity || 0),
          price: String(r.price || 0),
        }));
        await db.insert(waybillItemsTable).values(values);
      }
    }
    // Moliya jadvali har doim yangilansin (items yuborilmasa ham)
    {
      const effItems = items
        ? items.map((r: any) => ({ name: r.name }))
        : (await db.select().from(waybillItemsTable).where(eq(waybillItemsTable.waybillId, id))).map(i => ({ name: i.name }));
      await removeFinance(id);
      await syncFinance(
        id,
        date || existing.date,
        String(items ? totalSum : existing.totalSum),
        senderCompany || existing.senderCompany || "",
        receiverCompany || existing.receiverCompany || "",
        docNumber || existing.docNumber,
        effItems,
      );
    }
    const [updated] = await db.select().from(waybillsTable).where(eq(waybillsTable.id, id));
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH — update delivery status / driver / address / delivery fee
router.patch("/:id/delivery", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { deliveryStatus, driverId, deliveryAddress, deliveryFee } = req.body;
    const [existing] = await db.select().from(waybillsTable).where(eq(waybillsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    let feeStr: string | undefined;
    if (deliveryFee !== undefined) {
      const feeNum = Number(deliveryFee);
      if (!Number.isFinite(feeNum) || feeNum < 0) {
        res.status(400).json({ error: "Yetkazish haqi noto'g'ri (manfiy yoki raqam emas)" });
        return;
      }
      feeStr = String(feeNum);
    }

    // Yetkazilgan buyurtmada holat/haydovchi/manzil o'zgarishi taqiqlanadi,
    // lekin yetkazish haqini keyinroq qo'lda kiritish/tahrirlash mumkin.
    if (existing.deliveryStatus === "delivered" &&
        (deliveryStatus !== undefined || driverId !== undefined || deliveryAddress !== undefined)) {
      res.status(400).json({ error: "Yetkazilgan yuk xatini o'zgartirib bo'lmaydi" });
      return;
    }
    const nowDelivered = deliveryStatus === "delivered" && existing.deliveryStatus !== "delivered";
    await db.update(waybillsTable).set({
      deliveryStatus: deliveryStatus ?? existing.deliveryStatus,
      driverId: driverId !== undefined ? driverId : existing.driverId,
      deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : existing.deliveryAddress,
      deliveryFee: feeStr ?? existing.deliveryFee,
      deliveredAt: nowDelivered ? new Date() : existing.deliveredAt,
    }).where(eq(waybillsTable.id, id));
    const [updated] = await db.select().from(waybillsTable).where(eq(waybillsTable.id, id));
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE — waybill
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await removeFinance(id);
    await db.delete(waybillItemsTable).where(eq(waybillItemsTable.waybillId, id));
    await db.delete(waybillsTable).where(eq(waybillsTable.id, id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
