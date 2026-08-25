import { Router } from "express";
import { db, employeesTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { paramInt } from "../lib/params.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const employees = await db.select().from(employeesTable).orderBy(desc(employeesTable.createdAt));
  res.json(employees.map(e => ({ ...e, salary: parseFloat(e.salary ?? "0") })));
});

router.get("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!employee) { res.status(404).json({ error: "Topilmadi" }); return; }
  res.json({ ...employee, salary: parseFloat(employee.salary ?? "0") });
});

const readBodyValue = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (value === null || value === undefined) return "";
  return String(value);
};

router.post("/", authMiddleware, upload.single("photo"), async (req, res) => {
  const body = (req.body && typeof req.body === "object") ? req.body as Record<string, unknown> : {};
  let name = readBodyValue(body.name);
  let phone = readBodyValue(body.phone);
  let position = readBodyValue(body.position);
  let salary = readBodyValue(body.salary);
  let hireDate = readBodyValue(body.hireDate);
  let notes = readBodyValue(body.notes);
  let photo = readBodyValue(body.photo);
  let loginPhone = readBodyValue(body.loginPhone);
  let loginPassword = readBodyValue(body.loginPassword);
  // If multipart upload with file was sent as `photo`, convert to data URL
  if (req.file) {
    photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  }
  if (!name) { res.status(400).json({ error: "Ismi talab qilinadi" }); return; }

  const actualLoginPhone = loginPhone || phone;
  const actualLoginPassword = loginPassword || "12345678";

  // Don't block on face-descriptor extraction here; the background
  // face-processor computes it and backfills faceDescriptor shortly after.
  const [employee] = await db.insert(employeesTable).values({
    name, phone: phone || null, position: position || null,
    salary: salary?.toString() || "0", hireDate: hireDate || null, notes: notes || null,
    faceImage: photo || null,
    faceDescriptor: null,
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

  res.status(201).json({ ...employee, salary: parseFloat(employee.salary ?? "0"), faceImage: employee.faceImage });
});

const updateEmployeeRecord = async (req: any, res: any, id: number) => {
  console.log("[employees.update] hasBody=", !!req.body, "bodyType=", typeof req.body, "hasFile=", !!req.file);
  const body = (req.body && typeof req.body === "object") ? req.body as Record<string, unknown> : {};
  let name = body.name !== undefined ? readBodyValue(body.name) : undefined;
  let phone = body.phone !== undefined ? readBodyValue(body.phone) : undefined;
  let position = body.position !== undefined ? readBodyValue(body.position) : undefined;
  let salary = body.salary !== undefined ? readBodyValue(body.salary) : undefined;
  let hireDate = body.hireDate !== undefined ? readBodyValue(body.hireDate) : undefined;
  let status = body.status !== undefined ? readBodyValue(body.status) : undefined;
  let notes = body.notes !== undefined ? readBodyValue(body.notes) : undefined;
  let photo = body.photo !== undefined ? readBodyValue(body.photo) : undefined;
  let loginPhone = body.loginPhone !== undefined ? readBodyValue(body.loginPhone) : undefined;
  let loginPassword = body.loginPassword !== undefined ? readBodyValue(body.loginPassword) : undefined;

  if (req.file) {
    photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  }

  const updates: Record<string, any> = {};
  if (name !== undefined && name !== "") updates.name = name;
  if (phone !== undefined && phone !== "") updates.phone = phone;
  if ((req.file || (photo !== undefined && photo !== "")) && photo) {
    // Save the image immediately; face descriptor is backfilled by the
    // background face-processor so uploads never hang on face-api.
    updates.faceImage = photo;
  }
  if (position !== undefined && position !== "") updates.position = position;
  if (salary !== undefined && salary !== "") updates.salary = salary.toString();
  if (hireDate !== undefined && hireDate !== "") updates.hireDate = hireDate;
  if (status !== undefined && status !== "") updates.status = status;
  if (notes !== undefined && notes !== "") updates.notes = notes;
  if (loginPhone !== undefined && loginPhone !== "") updates.loginPhone = loginPhone.replace(/[\s\+\-\(\)]/g, "");
  if (loginPassword !== undefined && loginPassword !== "") updates.loginPassword = loginPassword;

  if (loginPhone !== undefined || loginPassword !== undefined) {
    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    const oldLoginPhone = emp?.loginPhone;
    const newLoginPhone = (loginPhone !== undefined ? loginPhone : emp?.loginPhone || "").replace(/[\s\+\-\(\)]/g, "");
    const newLoginPassword = loginPassword !== undefined ? loginPassword : emp?.loginPassword || "12345678";

    if (newLoginPhone) {
      const existingUsers = await db.select().from(usersTable).where(eq(usersTable.phone, newLoginPhone)).limit(1);
      if (existingUsers.length > 0) {
        await db.update(usersTable).set({ password: newLoginPassword }).where(eq(usersTable.phone, newLoginPhone));
      } else {
        await db.insert(usersTable).values({ phone: newLoginPhone, password: newLoginPassword, role: "employee" });
      }
      if (oldLoginPhone && oldLoginPhone !== newLoginPhone) {
        await db.delete(usersTable).where(eq(usersTable.phone, oldLoginPhone));
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    res.json({ ...employee, salary: parseFloat(employee.salary ?? "0") });
    return;
  }

  const [employee] = await db.update(employeesTable).set(updates).where(eq(employeesTable.id, id)).returning();
  res.json({ ...employee, salary: parseFloat(employee.salary ?? "0") });
};

router.put("/:id", authMiddleware, upload.single("photo"), async (req, res) => {
  const id = paramInt(req.params.id);
  await updateEmployeeRecord(req, res, id);
});

router.patch("/:id", authMiddleware, upload.single("photo"), async (req, res) => {
  const id = paramInt(req.params.id);
  await updateEmployeeRecord(req, res, id);
});

// Maosh to'lov — avtomatik moliyaga chiqim yozish
router.post("/:id/pay-salary", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
  const { amount, month, description } = req.body;

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!emp) { res.status(404).json({ error: "Hodim topilmadi" }); return; }

  const payAmount = amount || parseFloat(emp.salary || "0");
  if (payAmount <= 0) { res.status(400).json({ error: "To'lov summasi 0 dan katta bo'lishi kerak" }); return; }

  const payDate = new Date().toISOString().split("T")[0];
  const payDesc = description || `Maosh — ${emp.name}${month ? ` (${month})` : ""}`;

  try {
    const [tx] = await db.insert(transactionsTable).values({
      type: "expense",
      category: "Maosh",
      amount: payAmount.toString(),
      description: payDesc,
      date: payDate,
    }).returning();
    res.status(201).json({ ...tx, amount: parseFloat(tx.amount), employeeName: emp.name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const id = paramInt(req.params.id);
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
