import { Router } from "express";
import { db, usersTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware } from "../lib/auth.js";

const router = Router();

function normalizePhone(phone?: string | null) {
  let digits = (phone || "").replace(/\D/g, "");
  while (digits.startsWith("998998") && digits.length > 12) {
    digits = digits.slice(3);
  }
  if (digits.length === 9) {
    digits = `998${digits}`;
  }
  return digits;
}

async function findEmployeeForUser(userPhone: string) {
  const clean = normalizePhone(userPhone);
  const [byLogin] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.loginPhone, clean))
    .limit(1);
  if (byLogin) return byLogin;

  const employees = await db.select().from(employeesTable);
  return employees.find((e) => normalizePhone(e.phone) === clean) ?? null;
}

router.post("/login", async (req, res) => {
  let { phone, password } = req.body;

  if (!phone || !password) {
    res.status(400).json({ error: "Telefon va parol talab qilinadi" });
    return;
  }

  // Telefon raqamni tozalash
  phone = normalizePhone(phone);

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
  const employee = await findEmployeeForUser(user.phone);

  res.json({
    id: user.id,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    name: employee?.name ?? (user.role === "admin" ? "Administrator" : user.role === "owner" ? "Egasi" : null),
    position: employee?.position ?? (user.role === "admin" || user.role === "owner" ? "Administrator" : null),
    faceImage: employee?.faceImage ?? null,
    employeeId: employee?.id ?? null,
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
