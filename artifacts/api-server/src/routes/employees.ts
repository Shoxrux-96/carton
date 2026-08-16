import { Router } from "express";
import { db, employeesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { processEmployeePhoto } from "../lib/employee-face.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const employees = await db.select().from(employeesTable).orderBy(desc(employeesTable.createdAt));
  res.json(employees.map(e => ({ ...e, salary: parseFloat(e.salary) })));
});

router.get("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!employee) { res.status(404).json({ error: "Topilmadi" }); return; }
  res.json({ ...employee, salary: parseFloat(employee.salary) });
});

router.post("/", authMiddleware, upload.single("photo"), async (req, res) => {
  const body = req.body || {};
  let { name, phone, position, salary, hireDate, notes, photo, loginPhone, loginPassword } = body;
  // If multipart upload with file was sent as `photo`, convert to data URL
  if (req.file) {
    photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  }
  if (!name) { res.status(400).json({ error: "Ismi talab qilinadi" }); return; }

  const actualLoginPhone = loginPhone || phone;
  const actualLoginPassword = loginPassword || "12345678";

  const faceData = await processEmployeePhoto(photo);
  if (faceData.faceError && photo) {
    res.status(400).json({ error: faceData.faceError });
    return;
  }

  const [employee] = await db.insert(employeesTable).values({
    name, phone: phone || null, position: position || null,
    salary: salary?.toString() || "0", hireDate: hireDate || null, notes: notes || null,
    faceImage: faceData.faceImage ?? null,
    faceDescriptor: faceData.faceDescriptor ?? null,
    loginPhone: actualLoginPhone ? actualLoginPhone.replace(/[\s\+\-\(\)]/g, "") : null,
    loginPassword: actualLoginPassword,
  }).returning();

  // Auto-create user account if loginPhone provided
  if (actualLoginPhone) {
    const cleanPhone = actualLoginPhone.replace(/[\s\+\-\(\)]/g, "");
    try {
      const existing = await db.select().from(usersTable).where(eq(usersTable.phone, cleanPhone)).limit(1);
      if (existing.length === 0) {
        await db.insert(usersTable).values({
          phone: cleanPhone,
          password: actualLoginPassword,
          role: "employee",
        });
      }
    } catch (e) {
      // User may already exist, ignore
    }
  }

  res.status(201).json({ ...employee, salary: parseFloat(employee.salary), faceImage: employee.faceImage });
});

router.put("/:id", authMiddleware, upload.single("photo"), async (req, res) => {
  const id = parseInt(req.params.id);
  const body = req.body || {};
  let { name, phone, position, salary, hireDate, status, notes, photo, loginPhone, loginPassword } = body;
  if (req.file) {
    photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  }
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (photo !== undefined) {
    const faceData = await processEmployeePhoto(photo);
    if (faceData.faceError && photo) {
      res.status(400).json({ error: faceData.faceError });
      return;
    }
    updates.faceImage = faceData.faceImage ?? null;
    if (faceData.faceDescriptor) updates.faceDescriptor = faceData.faceDescriptor;
  }
  if (position !== undefined) updates.position = position;
  if (salary !== undefined) updates.salary = salary.toString();
  if (hireDate !== undefined) updates.hireDate = hireDate;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (loginPhone !== undefined) updates.loginPhone = loginPhone.replace(/[\s\+\-\(\)]/g, "");
  if (loginPassword !== undefined) updates.loginPassword = loginPassword;

  // If login credentials changed, update the users table too
  if (loginPhone !== undefined || loginPassword !== undefined) {
    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    const oldLoginPhone = emp?.loginPhone;
    const newLoginPhone = (loginPhone !== undefined ? loginPhone : emp?.loginPhone || "").replace(/[\s\+\-\(\)]/g, "");
    const newLoginPassword = loginPassword !== undefined ? loginPassword : emp?.loginPassword || "12345678";

    if (newLoginPhone) {
      const existingUsers = await db.select().from(usersTable).where(eq(usersTable.phone, newLoginPhone)).limit(1);
      if (existingUsers.length > 0) {
        // Update password
        await db.update(usersTable).set({ password: newLoginPassword }).where(eq(usersTable.phone, newLoginPhone));
      } else {
        // Create new user
        await db.insert(usersTable).values({ phone: newLoginPhone, password: newLoginPassword, role: "employee" });
      }
      // If phone changed, delete old user
      if (oldLoginPhone && oldLoginPhone !== newLoginPhone) {
        await db.delete(usersTable).where(eq(usersTable.phone, oldLoginPhone));
      }
    }
  }

  const [employee] = await db.update(employeesTable).set(updates).where(eq(employeesTable.id, id)).returning();
  res.json({ ...employee, salary: parseFloat(employee.salary) });
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (emp?.position === "Owner") {
    res.status(403).json({ error: "Owner o'chirib bo'lmaydi" });
    return;
  }
  // Also delete associated user account
  if (emp?.loginPhone) {
    await db.delete(usersTable).where(eq(usersTable.phone, emp.loginPhone));
  }
  await db.delete(employeesTable).where(eq(employeesTable.id, id));
  res.json({ success: true });
});

export default router;
