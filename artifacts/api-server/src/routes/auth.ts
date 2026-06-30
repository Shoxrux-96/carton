import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  let { phone, password } = req.body;

  if (!phone || !password) {
    res.status(400).json({ error: "Telefon va parol talab qilinadi" });
    return;
  }

  // Telefon raqamni tozalash
  phone = phone.replace(/[\s\+\-\(\)]/g, "");

  if (password.length < 8) {
    res.status(400).json({ error: "Parol kamida 8 belgidan iborat bo'lishi kerak" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);

  if (users.length === 0 || users[0].password !== password) {
    res.status(401).json({ error: "Noto'g'ri telefon yoki parol" });
    return;
  }

  const user = users[0];
  const token = signToken({ userId: user.id, phone: user.phone });

  res.json({
    token,
    user: { id: user.id, phone: user.phone, role: user.role },
  });
});

router.post("/register", authMiddleware, async (req, res) => {
  let { phone, password, role } = req.body;

  if (!phone || !password) {
    res.status(400).json({ error: "Telefon va parol talab qilinadi" });
    return;
  }

  // Telefon raqamni tozalash — + va bo'shliqlarni olib tashlash
  phone = phone.replace(/[\s\+\-\(\)]/g, "");

  if (password.length < 8) {
    res.status(400).json({ error: "Parol kamida 8 belgidan iborat bo'lishi kerak" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Bu telefon raqam allaqachon ro'yxatdan o'tgan" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    phone,
    password,
    role: role || "employee",
  }).returning();

  res.status(201).json({
    id: user.id,
    phone: user.phone,
    role: user.role,
  });
});

router.get("/profile", authMiddleware, async (req, res) => {
  const userId = (req as any).user.userId;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (users.length === 0) {
    res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    return;
  }

  const user = users[0];
  res.json({
    id: user.id,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  });
});

router.put("/profile", authMiddleware, async (req, res) => {
  const userId = (req as any).user.userId;
  const { phone, currentPassword, newPassword } = req.body;

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (users.length === 0) {
    res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    return;
  }

  const user = users[0];

  if (phone && phone !== user.phone) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Bu telefon raqam allaqachon ro'yxatdan o'tgan" });
      return;
    }
  }

  if (newPassword) {
    if (!currentPassword || currentPassword !== user.password) {
      res.status(400).json({ error: "Joriy parol noto'g'ri" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "Yangi parol kamida 8 belgidan iborat bo'lishi kerak" });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  if (phone) updateData.phone = phone;
  if (newPassword) updateData.password = newPassword;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "Hech qanday ma'lumot o'zgartirilmadi" });
    return;
  }

  await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId));

  const updatedUser = phone
    ? { id: userId, phone }
    : { id: userId, phone: user.phone };

  if (phone) {
    const newToken = signToken({ userId, phone });
    res.json({ token: newToken, user: updatedUser });
  } else {
    res.json({ user: updatedUser });
  }
});

export default router;
