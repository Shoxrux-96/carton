import { Router } from "express";
import { db, socialLinksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const links = await db.select().from(socialLinksTable).orderBy(socialLinksTable.platform);
  res.json(links);
});

router.put("/:platform", authMiddleware, async (req, res) => {
  const { platform } = req.params;
  const { url } = req.body;

  const existing = await db.select().from(socialLinksTable).where(eq(socialLinksTable.platform, platform)).limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(socialLinksTable)
      .set({ url: url || "", updatedAt: new Date() })
      .where(eq(socialLinksTable.platform, platform))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(socialLinksTable).values({ platform, url: url || "" }).returning();
    res.json(created);
  }
});

export default router;
